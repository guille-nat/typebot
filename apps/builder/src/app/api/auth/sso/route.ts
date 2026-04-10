import { createId } from "@paralleldrive/cuid2";
import { env } from "@typebot.io/env";
import prisma from "@typebot.io/prisma";
import { Plan } from "@typebot.io/prisma/enum";
import * as jwt from "jsonwebtoken";
import { type NextRequest, NextResponse } from "next/server";

// Force this route to always be dynamic.
// Without this, Next.js attempts to statically analyze the module during
// `next build`, which triggers Prisma client instantiation and fails because
// DATABASE_URL is not available at compile time.
export const dynamic = "force-dynamic";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type SsoJwtPayload = {
  email: string;
  workspaceId: string;
  workspaceName: string;
};

export const GET = async (req: NextRequest) => {
  if (!env.EMOZION_SHARED_SECRET || !env.EMOZION_CRM_URL) {
    return NextResponse.json({ error: "SSO not configured" }, { status: 501 });
  }

  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  let payload: SsoJwtPayload;
  try {
    payload = jwt.verify(token, env.EMOZION_SHARED_SECRET) as SsoJwtPayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 },
    );
  }

  const { email, workspaceId, workspaceName } = payload;

  if (!email || !workspaceId || !workspaceName) {
    return NextResponse.json(
      { error: "Invalid token payload" },
      { status: 400 },
    );
  }

  // Upsert user by email
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      id: createId(),
      email,
      name: email.split("@")[0],
      onboardingCategories: [],
    },
  });

  // Upsert workspace with Plan.UNLIMITED
  const existingWorkspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true },
  });

  if (!existingWorkspace) {
    await prisma.workspace.create({
      data: {
        id: workspaceId,
        name: workspaceName,
        plan: Plan.UNLIMITED,
        members: {
          create: { role: "ADMIN", userId: user.id },
        },
      },
    });
  } else {
    // Ensure the user is ADMIN in the existing workspace
    await prisma.memberInWorkspace.upsert({
      where: {
        userId_workspaceId: { userId: user.id, workspaceId },
      },
      update: { role: "ADMIN" },
      create: { role: "ADMIN", userId: user.id, workspaceId },
    });
  }

  // Create a NextAuth database session directly
  const sessionToken = createId();
  const expires = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: { sessionToken, userId: user.id, expires },
  });

  // Determine cookie name: NextAuth v5 uses __Secure- prefix on HTTPS
  const isHttps =
    env.NEXTAUTH_URL.startsWith("https://") &&
    !new URL(env.NEXTAUTH_URL).hostname.includes("localhost");
  const sharedCookieDomain = isHttps ? ".olesistemas.com.ar" : undefined;
  const cookieName = `${isHttps ? "__Secure-" : ""}authjs.session-token`;

  // SameSite=None requires Secure; fallback to Lax for HTTP (dev)
  const sameSite = isHttps ? "None" : "Lax";

  const cookieValue = [
    `${cookieName}=${sessionToken}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${sameSite}`,
    `Expires=${expires.toUTCString()}`,
    ...(sharedCookieDomain ? [`Domain=${sharedCookieDomain}`] : []),
    ...(isHttps ? ["Secure"] : []),
  ].join("; ");

  const baseUrl = process.env.NEXTAUTH_URL;
  const response = NextResponse.redirect(
    new URL(`/w/${encodeURIComponent(workspaceId)}/typebots`, baseUrl),
    { status: 302 },
  );
  response.headers.set("Set-Cookie", cookieValue);
  return response;
};

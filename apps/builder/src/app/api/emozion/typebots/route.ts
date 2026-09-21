import { env } from "@typebot.io/env";
import prisma from "@typebot.io/prisma";
import * as jwt from "jsonwebtoken";
import { type NextRequest, NextResponse } from "next/server";

// Force this route to always be dynamic (same reason as the SSO route): without
// it, Next.js tries to statically evaluate the module during `next build`, which
// instantiates Prisma and fails because DATABASE_URL is not available then.
export const dynamic = "force-dynamic";

type FlowsJwtPayload = {
  workspaceId: string;
};

// Server-to-server endpoint that lists the published flows of an Emozion
// workspace for the EmozionBot backend (Typebot::FlowsService). See README.md in
// this folder for the full rationale.
//
// Auth: a short-lived JWT signed with EMOZION_SHARED_SECRET (the same secret the
// SSO route uses). Trust comes from holding the secret, NOT from workspace
// membership — the standard membership-gated listing can't be used because the
// emz_* workspaces are created per-account by SSO and no single user belongs to
// all of them.
export const GET = async (req: NextRequest) => {
  if (!env.EMOZION_SHARED_SECRET) {
    return NextResponse.json(
      { error: "Emozion integration not configured" },
      { status: 501 },
    );
  }

  const token = (req.headers.get("authorization") ?? "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  let payload: FlowsJwtPayload;
  try {
    payload = jwt.verify(token, env.EMOZION_SHARED_SECRET) as FlowsJwtPayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 },
    );
  }

  // The token is scoped to a single workspace, so emz_8 can never list emz_9.
  const workspaceId = req.nextUrl.searchParams.get("workspaceId");
  if (!workspaceId || payload.workspaceId !== workspaceId) {
    return NextResponse.json({ error: "Workspace mismatch" }, { status: 403 });
  }

  // Only published flows are startable through the Viewer API (startChat resolves
  // by publicId), so that's all the dropdown needs.
  const typebots = await prisma.typebot.findMany({
    where: {
      workspaceId,
      isArchived: { not: true },
      publishedTypebot: { isNot: null },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      publicId: true,
      publishedTypebot: { select: { id: true } },
    },
  });

  return NextResponse.json({
    typebots: typebots.map((typebot) => ({
      id: typebot.id,
      name: typebot.name,
      publicId: typebot.publicId,
      publishedTypebotId: typebot.publishedTypebot?.id,
    })),
  });
};

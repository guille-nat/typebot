import { env } from "@typebot.io/env";
import { NextResponse } from "next/server";

// These headers depend on deployment configuration, not on page rendering.
// Keep them at request time so a standalone image can use a runtime builder URL.
//
// Emozion: the builder can itself be embedded inside the CRM (EMOZION_CRM_URL),
// so the preview iframe chain is CRM -> builder -> viewer. `frame-ancestors`
// validates every ancestor, so the CRM origin must be allowed as well.
const toOrigin = (url: string | undefined): string | null => {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

const frameAncestors = [
  toOrigin(env.NEXTAUTH_URL),
  toOrigin(env.EMOZION_CRM_URL),
]
  .filter((origin): origin is string => origin !== null)
  .join(" ");

export function proxy() {
  const response = NextResponse.next();
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set(
    "Content-Security-Policy",
    `frame-ancestors ${frameAncestors}; worker-src 'none'; object-src 'none'; base-uri 'none'`,
  );
  return response;
}

export const config = { matcher: ["/__preview"] };

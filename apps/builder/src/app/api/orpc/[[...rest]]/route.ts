import { RPCHandler } from "@orpc/server/fetch";
import { auth } from "@typebot.io/auth/lib/nextAuth";
import { createContext } from "@typebot.io/config/orpc/builder/context";
import { UserId } from "@typebot.io/shared-core/domain";
import { logServerRequest } from "@typebot.io/telemetry/logServerRequest";
import { after, type NextRequest } from "next/server";
import { appRouter } from "../../router";

const handler = new RPCHandler(appRouter);

type RouteContext<_T> = {
  params: Promise<{ rest?: string[] }>;
};

async function handleRequest(
  request: NextRequest,
  routeContext: RouteContext<"/api/orpc/[[...rest]]">,
) {
  const startedAt = Date.now();

  // Reconstruct request to make it work with Next.js rewrites / reverse proxies.
  // Without this, request.nextUrl.pathname can collapse to "/api/orpc" and ORPC
  // won't match procedure paths like "/typebot/getTypebot" => 404.
  const resolvedPathname =
    `/api/orpc/${(await routeContext.params)?.rest?.join("/") ?? ""}`.replace(
      /\/$/,
      "",
    );
  const resolvedRequest =
    resolvedPathname === request.nextUrl.pathname
      ? request
      : new Request(
          request.url.replace(request.nextUrl.pathname, resolvedPathname),
          request,
        );

  try {
    const { response } = await handler.handle(resolvedRequest, {
      prefix: "/api/orpc",
      context: createContext({
        authenticate: async () => {
          const session = await auth();
          if (!session?.user) return null;
          return {
            id: UserId.makeUnsafe(session.user.id),
            email: session.user.email,
            groupTitlesAutoGeneration: session.user.groupTitlesAutoGeneration,
          };
        },
      }),
    });

    const resolvedResponse =
      response ?? new Response("Not found", { status: 404 });
    after(() =>
      logServerRequest({
        request: resolvedRequest,
        response: resolvedResponse,
        startedAt,
      }),
    );

    return resolvedResponse;
  } catch (error) {
    console.error("🔥 ORPC unhandled error:", error);
    after(() =>
      logServerRequest({
        error,
        request: resolvedRequest,
        startedAt,
      }),
    );
    throw error;
  }
}

export const HEAD = handleRequest;
export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
export const OPTIONS = handleRequest;

import type { Instrumentation } from "next";

// One JSON line per server error, so Railway's log search can find and count
// them (search "server_error"). No query strings and no link tokens: check-in,
// claim and sign-in links carry them, and logs are kept by a third party.
const TOKEN_PATH = /^\/(checkin|h)\/[^/]+/;

export const onRequestError: Instrumentation.onRequestError = (err, request, context) => {
  const path = request.path.split("?")[0].replace(TOKEN_PATH, "/$1/[token]");
  console.error(
    JSON.stringify({
      level: "error",
      event: "server_error",
      at: new Date().toISOString(),
      method: request.method,
      path,
      route: context.routePath,
      routeType: context.routeType,
      message: err instanceof Error ? err.message : String(err),
      digest: typeof err === "object" && err !== null && "digest" in err ? String(err.digest) : undefined,
      stack: err instanceof Error ? err.stack?.split("\n").slice(0, 6).join("\n") : undefined,
    }),
  );
};

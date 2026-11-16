import { indexNowKey } from "@/lib/indexnow";

// The IndexNow key file (lib/indexnow.ts). Search engines fetch it to check
// that our submissions really come from this site. 404 while INDEXNOW_KEY is unset.
export const dynamic = "force-dynamic";

export function GET() {
  const key = indexNowKey();
  if (!key) return new Response("Not found", { status: 404 });
  return new Response(key, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}

import fs from "node:fs/promises";
import path from "node:path";

// The barcode scanner's decoder (components/barcode-scanner.tsx), served
// from our own origin instead of zxing-wasm's default CDN, so a scan never
// tells a third party who is scanning. Only phones without a built-in
// barcode reader (iPhones, today) ever fetch it. The URL carries the
// package version (?v=), so a cached copy never outlives an upgrade.
const WASM = path.join(process.cwd(), "node_modules/zxing-wasm/dist/reader/zxing_reader.wasm");

export async function GET() {
  try {
    const body = await fs.readFile(WASM);
    return new Response(new Uint8Array(body), {
      headers: { "Content-Type": "application/wasm", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
}

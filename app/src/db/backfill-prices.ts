// One-off live-price backfill: looks up the top N due products now instead
// of waiting for the daily sweep. Same order and rules as the job
// (lib/prices/refresh.ts): users' products, recently viewed, then the
// catalog with barcoded / brand-page products first. Rx is never touched.
//   npm run prices:backfill -- --top 500 [--max-requests 2000]
// Runs every configured source (Sovrn keys, Kroger client id + secret);
// exits without a request when neither is set. --max-requests is per source.
import { refreshPrices } from "@/lib/prices/refresh";
import { livePricesEnabled } from "@/lib/prices/config";

function arg(name: string): number | undefined {
  const i = process.argv.indexOf(`--${name}`);
  const n = i >= 0 ? Number(process.argv[i + 1]) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

async function main() {
  if (!livePricesEnabled()) {
    console.log("No price source is configured (Sovrn or Kroger keys); nothing to do.");
    return;
  }
  const top = arg("top") ?? 200;
  const maxRequests = arg("max-requests") ?? top * 4;
  console.log(`Backfilling live prices for up to ${top} products (max ${maxRequests} requests per source)...`);
  const report = await refreshPrices(new Date(), { maxProducts: top, maxRequests, log: (s) => console.log(`  ${s}`) });
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

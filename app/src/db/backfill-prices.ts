// One-off live-price backfill: looks up the top N due products now instead
// of waiting for the hourly sweep. Same order and rules as the job
// (lib/prices/refresh.ts): users' products, recently viewed, then the
// catalog with barcoded / brand-page products first. Rx is never touched.
//   npm run prices:backfill -- --top 500 [--max-requests 2000]
// Needs SOVRN_SITE_API_KEY and SOVRN_SECRET_KEY; exits without a request
// otherwise.
import { refreshPrices } from "@/lib/prices/refresh";
import { sovrnConfig } from "@/lib/prices/config";

function arg(name: string): number | undefined {
  const i = process.argv.indexOf(`--${name}`);
  const n = i >= 0 ? Number(process.argv[i + 1]) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

async function main() {
  if (!sovrnConfig()) {
    console.log("SOVRN_SITE_API_KEY and SOVRN_SECRET_KEY are not both set; nothing to do.");
    return;
  }
  const top = arg("top") ?? 200;
  const maxRequests = arg("max-requests") ?? top * 4;
  console.log(`Backfilling live prices for up to ${top} products (max ${maxRequests} requests, <= 10/s)...`);
  const report = await refreshPrices(new Date(), { maxProducts: top, maxRequests, log: (s) => console.log(`  ${s}`) });
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

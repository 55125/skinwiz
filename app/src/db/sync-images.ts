// One-off backfill of DailyMed package photos onto IMAGE_DIR (see
// lib/product-images/sync.ts). Safe to stop and re-run: finished set ids are
// skipped. The hourly job does the same thing in capped batches.
//   npm run images:sync                 everything still missing (~15k labels, a few hours)
//   npm run images:sync -- --limit 100  a sample
import { syncDailymedImages } from "@/lib/product-images/sync";
import { imageDir } from "@/lib/product-images/storage";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const limit = Number(arg("limit") ?? 0) || undefined;
  console.log(`Syncing DailyMed package photos into ${imageDir()}${limit ? ` (limit ${limit})` : ""}...`);
  const started = Date.now();
  const report = await syncDailymedImages({ limit, log: (m) => console.log(m) });
  console.log(JSON.stringify(report, null, 2));
  console.log(`Done in ${Math.round((Date.now() - started) / 1000)}s.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

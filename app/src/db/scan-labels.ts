// One-off run of the label barcode scan (lib/label-barcodes.ts). Safe to stop
// and re-run: scanned images are skipped. The hourly job does the same in
// capped batches.
//   npm run labels:scan                 everything still missing
//   npm run labels:scan -- --limit 50   a sample
import { scanLabelBarcodes } from "@/lib/label-barcodes";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const limit = Number(arg("limit") ?? 0) || undefined;
  const started = Date.now();
  const report = await scanLabelBarcodes({ limit, log: (m) => console.log(m) });
  console.log(JSON.stringify(report, null, 2));
  console.log(`Done in ${Math.round((Date.now() - started) / 1000)}s.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

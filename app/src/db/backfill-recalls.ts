// One-off: load the last ~3 years of FDA drug recalls from openFDA, match
// them to the catalog, and print what matched. `npm run recalls:backfill`
// (add `-- --years=5` for a longer window). Safe to re-run: recalls are
// upserted and matches rebuilt. Sends no email -- the cron job does that,
// and only for recent, still-open recalls.
import { sql } from "drizzle-orm";
import { db } from "./client";
import { rematchAll, syncRecalls } from "@/lib/recalls";

async function main() {
  const years = Number(process.argv.find((a) => a.startsWith("--years="))?.split("=")[1] ?? 3);
  const now = new Date();
  if (process.argv.includes("--rematch-only")) {
    // After changing the matching rules: re-match stored recalls, no network.
    console.log(`Re-matched: ${rematchAll()} matches`);
  } else {
    console.log(`Fetching drug recalls reported in the last ${years} years from openFDA...`);
    const res = await syncRecalls(now, { force: true, fullWindow: true, initialYears: years });
    console.log(`  report_date ${res.from}..${res.to}: ${res.fetched} recalls fetched, ${res.refreshed} statuses refreshed`);
  }

  const total = db.get<{ n: number }>(sql`SELECT count(*) AS n FROM recalls`)!.n;
  const byType = db.all<{ match_type: string; n: number; products: number; recalls: number }>(sql`
    SELECT match_type, count(*) AS n, count(DISTINCT product_id) AS products, count(DISTINCT recall_number) AS recalls
    FROM recall_matches GROUP BY match_type ORDER BY n DESC`);
  const distinct = db.get<{ products: number; recalls: number }>(sql`
    SELECT count(DISTINCT product_id) AS products, count(DISTINCT recall_number) AS recalls FROM recall_matches`)!;
  const confident = db.get<{ products: number; recalls: number }>(sql`
    SELECT count(DISTINCT product_id) AS products, count(DISTINCT recall_number) AS recalls FROM recall_matches WHERE confidence >= 0.9`)!;
  console.log(`\n${total} recalls stored. Catalog matches: ${distinct.products} products across ${distinct.recalls} recalls`);
  console.log(`  identifier matches (confidence >= 0.9, emailed): ${confident.products} products / ${confident.recalls} recalls`);
  for (const t of byType) console.log(`  ${t.match_type.padEnd(9)} ${t.n} matches, ${t.products} products, ${t.recalls} recalls`);

  const classes = db.all<{ classification: string; n: number }>(sql`
    SELECT r.classification, count(DISTINCT r.recall_number) AS n FROM recalls r
    JOIN recall_matches m ON m.recall_number = r.recall_number GROUP BY 1 ORDER BY 1`);
  console.log(`  matched recalls by class: ${classes.map((c) => `${c.classification}: ${c.n}`).join(", ")}`);

  const bpo = db.all<{ recall_number: string; report_date: string; recalling_firm: string; desc: string; matched: string | null }>(sql`
    SELECT r.recall_number, r.report_date, r.recalling_firm, substr(r.product_description, 1, 90) AS desc,
      (SELECT group_concat(m.product_id || ' (' || m.match_type || ' ' || m.confidence || ')', '; ')
         FROM recall_matches m WHERE m.recall_number = r.recall_number) AS matched
    FROM recalls r
    WHERE r.reason_for_recall LIKE '%benzene%' AND (r.product_description LIKE '%benzoyl%' OR r.product_description LIKE '%BPO%')
    ORDER BY r.report_date`);
  console.log(`\nBenzoyl peroxide / benzene recalls: ${bpo.length}`);
  for (const r of bpo) console.log(`  ${r.recall_number} ${r.report_date} ${r.recalling_firm}: ${r.desc}${r.matched ? `\n      -> matched ${r.matched}` : ""}`);

  const sample = db.all<{ product_id: string; brand_name: string; recall_number: string; match_type: string; confidence: number }>(sql`
    SELECT m.product_id, p.brand_name, m.recall_number, m.match_type, m.confidence
    FROM recall_matches m JOIN products p ON p.id = m.product_id ORDER BY m.confidence DESC, m.recall_number DESC LIMIT 25`);
  console.log(`\nSample matches:`);
  for (const s of sample) console.log(`  ${s.recall_number}  ${s.match_type}/${s.confidence}  ${s.product_id}  ${s.brand_name}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

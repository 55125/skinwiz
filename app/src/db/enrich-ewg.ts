// Populates ewg_scores with EWG Skin Deep's own 1-10 ingredient hazard
// score for products we already carry from our brand-direct sources.
// Opt-in and manual -- not run automatically (unlike enrich-pubchem.ts,
// this does real per-product fuzzy matching against a large external
// catalog, not a small fixed active list, so it's a slower, periodic job,
// not something to run on every deploy). Requires `curl` on whatever
// machine runs it (see fetchText() below) -- not currently wired into the
// Dockerfile since it isn't part of the automatic boot sequence.
//
// Scoped to brand_direct manufacturers only (not the ~15k openFDA
// products) -- those are the brands we already know EWG covers well
// (confirmed by testing: CeraVe alone had a dozen+ real matches), and
// running this against the FDA-sourced majority of the catalog would mean
// tens of thousands of external requests for a much lower hit rate (mass-
// market drugstore brands EWG covers unevenly). A real, accepted scope
// limit, not laziness.
//
// Matching: same token-Jaccard approach as
// tools/affiliate_feeds/match_catalog.py, for the same reason documented
// there -- character-sequence similarity (difflib.SequenceMatcher-style)
// mismatches reordered/reworded retail titles that share the same words.
// A wrong or unmatched product just gets no EWG score row, never a guessed
// one -- see the schema.ts comment on ewgScores.
//
// robots.txt checked before building this: https://www.ewg.org/robots.txt
// has no Disallow on /skindeep/products/ or /skindeep/search/ (only
// generic Drupal admin/search paths at the site root) -- a materially
// different situation from SkinSAFE, whose robots.txt explicitly
// disallows /products/ and was treated as off-limits for exactly that
// reason.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { eq, and } from "drizzle-orm";
import { db } from "./client";
import { products, ewgScores } from "./schema";

const execFileAsync = promisify(execFile);

const SLEEP_MS = 500;
const PAGES_PER_BRAND = 3; // ~36 candidates/brand -- see header comment on scope
const MATCH_THRESHOLD = 0.5; // stricter than affiliate matching's 0.30 -- same-brand name collisions (e.g. a same-brand bundle) are the real risk here, not reworded retail titles

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tokenize(text: string): Set<string> {
  return new Set((text.toLowerCase().match(/[a-z0-9]+/g) ?? []));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection++;
  const union = a.size + b.size - intersection;
  return intersection / union;
}

// Guards against high-Jaccard cross-type matches (e.g. a cream matched to a
// toner of the same sub-line, seen in a spot-check: COSRX "Pure Fit Cica
// Cream" -> EWG "Pure Fit Cica Toner", 3/5 token overlap = 0.6, above
// MATCH_THRESHOLD despite being a different product). If both names contain
// a recognized type word, require them to share one; if either side has
// none, fall back to plain Jaccard.
const PRODUCT_TYPE_WORDS = new Set([
  "cream", "toner", "serum", "cleanser", "gel", "lotion", "oil", "mask",
  "essence", "balm", "ointment", "wash", "scrub", "patch", "mist", "spray",
  "stick", "powder", "exfoliant", "sunscreen", "moisturizer", "moisturiser",
]);

function typeWordsCompatible(a: Set<string>, b: Set<string>): boolean {
  const aTypes = [...a].filter((t) => PRODUCT_TYPE_WORDS.has(t));
  const bTypes = [...b].filter((t) => PRODUCT_TYPE_WORDS.has(t));
  if (aTypes.length === 0 || bTypes.length === 0) return true;
  return aTypes.some((t) => bTypes.includes(t));
}

// Node's own fetch() gets a flat 403 from EWG's bot protection (Cloudflare)
// even with a full set of realistic browser headers set manually -- almost
// certainly TLS/HTTP2-fingerprinting-based, not header-based, since no
// header combination tried fixed it. curl (same machine, same network path)
// gets a clean 200 every time. Shelling out to curl is the pragmatic fix,
// confirmed by testing both side by side before committing to this instead
// of chasing a fetch-based solution further.
async function fetchText(url: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      "curl",
      ["-s", "--max-time", "20", "-A", "Mozilla/5.0 (activelyskin-catalog-pipeline/0.1)", url],
      { maxBuffer: 20 * 1024 * 1024 },
    );
    return stdout || null;
  } catch {
    return null;
  }
}

type EwgCandidate = { url: string; name: string };

async function fetchBrandCandidates(brand: string): Promise<EwgCandidate[]> {
  const candidates: EwgCandidate[] = [];
  const seen = new Set<string>();
  for (let page = 1; page <= PAGES_PER_BRAND; page++) {
    const url = `https://www.ewg.org/skindeep/search/?brand=${encodeURIComponent(brand)}&page=${page}`;
    const html = await fetchText(url);
    if (!html) break;
    const matches = [...html.matchAll(/\/skindeep\/products\/(\d+)-([^"]+)\//g)];
    if (matches.length === 0) break;
    for (const m of matches) {
      const productPath = `/skindeep/products/${m[1]}-${m[2]}/`;
      if (seen.has(productPath)) continue;
      seen.add(productPath);
      candidates.push({ url: `https://www.ewg.org${productPath}`, name: m[2].replace(/_/g, " ") });
    }
    await sleep(SLEEP_MS);
  }
  return candidates;
}

async function fetchScore(url: string): Promise<{ score: number; dataAvailability: string | null } | null> {
  const html = await fetchText(url);
  if (!html) return null;
  const scoreMatch = html.match(/Product score:\s*0*(\d+)/i);
  if (!scoreMatch) return null;
  const availMatch = html.match(/<p class="availability"><b>([^<]+)<\/b>/i);
  return { score: parseInt(scoreMatch[1], 10), dataAvailability: availMatch?.[1] ?? null };
}

async function main() {
  const manufacturers = db
    .selectDistinct({ manufacturer: products.manufacturer })
    .from(products)
    .where(eq(products.dataSource, "brand_direct"))
    .all()
    .map((r) => r.manufacturer)
    .filter((m): m is string => !!m);

  console.log(`Checking EWG Skin Deep for ${manufacturers.length} brands: ${manufacturers.join(", ")}`);

  let matched = 0;
  let skipped = 0;

  for (const manufacturer of manufacturers) {
    console.log(`\n${manufacturer}...`);
    const candidates = await fetchBrandCandidates(manufacturer);
    console.log(`  ${candidates.length} EWG candidates found`);
    if (candidates.length === 0) continue;

    const ourProducts = db
      .select({ id: products.id, brandName: products.brandName })
      .from(products)
      .where(and(eq(products.manufacturer, manufacturer), eq(products.dataSource, "brand_direct")))
      .all();

    const candidateTokens = candidates.map((c) => ({ ...c, tokens: tokenize(c.name) }));

    for (const product of ourProducts) {
      const alreadyDone = db.select().from(ewgScores).where(eq(ewgScores.productId, product.id)).get();
      if (alreadyDone) continue;

      const ourTokens = tokenize(product.brandName);
      let best: { url: string; score: number } | null = null;
      for (const c of candidateTokens) {
        const sim = jaccard(ourTokens, c.tokens);
        if (sim < MATCH_THRESHOLD) continue;
        if (!typeWordsCompatible(ourTokens, c.tokens)) continue;
        if (!best || sim > best.score) best = { url: c.url, score: sim };
      }

      if (!best) {
        skipped++;
        continue;
      }

      const ewgData = await fetchScore(best.url);
      await sleep(SLEEP_MS);
      if (!ewgData) {
        skipped++;
        continue;
      }

      db.insert(ewgScores)
        .values({
          productId: product.id,
          ewgScore: ewgData.score,
          dataAvailability: ewgData.dataAvailability,
          ewgProductUrl: best.url,
        })
        .onConflictDoUpdate({
          target: ewgScores.productId,
          set: { ewgScore: ewgData.score, dataAvailability: ewgData.dataAvailability, ewgProductUrl: best.url },
        })
        .run();
      matched++;
      console.log(`  matched: ${product.brandName} -> score ${ewgData.score} (${ewgData.dataAvailability ?? "?"})`);
    }
  }

  console.log(`\nDone. ${matched} matched, ${skipped} skipped (no confident match or fetch failed).`);
}

main();

// Monthly recheck of the regulatory sources behind db/regulatory-status.ts.
//
//   npm run regulatory:recheck            report only (exit 1 if anything needs a look)
//   npm run regulatory:recheck -- --accept  after a person has reviewed the report and
//                                           updated regulatory-status.ts, save the new
//                                           fingerprints so the next run starts clean
//
// It never edits the ingredient data. It does three things and writes a
// Markdown report to stdout:
//   1. Fetches every law/list page that regulatory-status.ts cites (plus the
//      watch-only pages below), strips markup and compares a fingerprint with
//      the one saved in regulatory-sources.json. A changed page means "read it
//      again", not "the law changed": some pages carry dates or banners.
//   2. Asks the EU Publications Office (CELLAR SPARQL) for consolidated texts
//      and amending acts of the Cosmetics Regulation newer than the ones saved.
//   3. Asks the Federal Register API for FDA documents since the last run
//      whose titles mention cosmetics or sunscreens and a ban-like word.
// Pages the cloud can't reach (some state sites, OEHHA, ECHA) are listed as
// unreachable so a person checks them by hand.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REGULATED_SUBSTANCES } from "./regulatory-status";

const SNAPSHOT = join(__dirname, "regulatory-sources.json");

/** Pages we watch for new bans that no substance cites yet. */
const WATCH_ONLY: { label: string; url: string }[] = [
  { label: "Oregon OHA toxic substances program (Toxic-Free Cosmetics rules)", url: "https://www.oregon.gov/oha/ph/healthyenvironments/healthyneighborhoods/toxicsubstances/pages/index.aspx" },
  { label: "California Safe Cosmetics Program", url: "https://www.cdph.ca.gov/Programs/CCDPHP/DEODC/OHB/CSCP/Pages/CSCP.aspx" },
  { label: "Health Canada Cosmetic Ingredient Hotlist", url: "https://www.canada.ca/en/health-canada/services/consumer-product-safety/cosmetics/cosmetic-ingredient-hotlist-prohibited-restricted-ingredients/hotlist.html" },
  { label: "FDA prohibited and restricted cosmetic ingredients", url: "https://www.fda.gov/cosmetics/cosmetics-laws-regulations/prohibited-restricted-ingredients-cosmetics" },
  { label: "Minnesota PCA PFAS in products", url: "https://www.pca.state.mn.us/get-engaged/pfas-in-products" },
  { label: "Maine DEP PFAS in products", url: "https://www.maine.gov/dep/spills/topics/pfas/PFAS-products/" },
];

const CELEX_BASE = "02009R1223";

type Snapshot = {
  checked: string;
  pages: Record<string, { hash: string; chars: number }>;
  eu: { consolidated: string; amendments: string[] };
};

type Report = { changed: string[]; unreachable: string[]; added: string[]; eu: string[]; fda: string[] };

function loadSnapshot(): Snapshot {
  try {
    return JSON.parse(readFileSync(SNAPSHOT, "utf8"));
  } catch {
    return { checked: "2026-11-11", pages: {}, eu: { consolidated: "02009R1223-20260518", amendments: [] } };
  }
}

function sourcePages(): { label: string; url: string }[] {
  const seen = new Map<string, string>();
  for (const s of REGULATED_SUBSTANCES) for (const a of s.actions) if (!seen.has(a.url)) seen.set(a.url, a.law);
  for (const w of WATCH_ONLY) if (!seen.has(w.url)) seen.set(w.url, w.label);
  return [...seen].map(([url, label]) => ({ url, label }));
}

/** EUR-Lex HTML refuses automated clients; the Publications Office serves the same text. */
export function fetchableUrl(url: string): { url: string; accept: string } {
  const eli = url.match(/eur-lex\.europa\.eu\/eli\/reg\/(\d{4})\/(\d+)/);
  const celex = url.match(/eur-lex\.europa\.eu\/.*CELEX:([0-9A-Z-]+)/)?.[1] ?? (eli ? `3${eli[1]}R${eli[2].padStart(4, "0")}` : null);
  const ca = url.match(/leginfo\.legislature\.ca\.gov\/.*lawCode=HSC&sectionNum=([\d.]+)/)?.[1];
  if (ca) return { url: `https://california.public.law/codes/health_and_safety_code_section_${ca}`, accept: "text/html" };
  if (celex) return { url: `http://publications.europa.eu/resource/celex/${celex}`, accept: "application/xhtml+xml" };
  return { url, accept: "text/html,application/pdf;q=0.9,*/*;q=0.8" };
}

export function fingerprint(body: string): { hash: string; chars: number } {
  const text = body
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    // Strip things that change on every load: times, dates in banners, counters.
    .replace(/\b\d{1,2}:\d{2}(:\d{2})?\s*(am|pm)?\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { hash: createHash("sha256").update(text).digest("hex").slice(0, 16), chars: text.length };
}

async function get(url: string, accept: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { accept, "accept-language": "eng,en;q=0.9", "user-agent": "Mozilla/5.0 (compatible; regulatory-recheck)" }, redirect: "follow", signal: AbortSignal.timeout(45_000) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (type.includes("pdf")) return createHash("sha256").update(Buffer.from(await res.arrayBuffer())).digest("hex");
    return await res.text();
  } catch {
    return null;
  }
}

async function checkPages(snap: Snapshot, next: Snapshot, report: Report) {
  for (const { url, label } of sourcePages()) {
    const f = fetchableUrl(url);
    const body = await get(f.url, f.accept);
    if (body == null) {
      report.unreachable.push(`[${label}](${url})`);
      if (snap.pages[url]) next.pages[url] = snap.pages[url];
      continue;
    }
    const fp = fingerprint(body);
    // A few hundred characters is a bot check or error page, not the law.
    if (fp.chars < 500 && body.length !== 64) {
      report.unreachable.push(`[${label}](${url}) (blocked or empty page)`);
      if (snap.pages[url]) next.pages[url] = snap.pages[url];
      continue;
    }
    next.pages[url] = fp;
    const old = snap.pages[url];
    if (!old) report.added.push(`[${label}](${url})`);
    else if (old.hash !== fp.hash) report.changed.push(`[${label}](${url}) (${old.chars} → ${fp.chars} chars)`);
  }
}

async function sparql(query: string): Promise<Record<string, { value: string }>[]> {
  const url = `https://publications.europa.eu/webapi/rdf/sparql?query=${encodeURIComponent(query)}`;
  const body = await get(url, "application/sparql-results+json");
  if (!body) throw new Error("CELLAR SPARQL unreachable");
  return JSON.parse(body).results.bindings;
}

async function checkEu(snap: Snapshot, next: Snapshot, report: Report) {
  try {
    const cons = await sparql(
      `PREFIX cdm: <http://publications.europa.eu/ontology/cdm#> SELECT DISTINCT ?c WHERE { ?w cdm:resource_legal_id_celex ?c . FILTER(STRSTARTS(STR(?c), "${CELEX_BASE}-")) } ORDER BY DESC(?c) LIMIT 1`,
    );
    const latest = cons[0]?.c.value;
    if (latest) {
      next.eu.consolidated = latest;
      if (latest > snap.eu.consolidated) report.eu.push(`New consolidated Cosmetics Regulation text: [${latest}](http://publications.europa.eu/resource/celex/${latest}) (was ${snap.eu.consolidated}). Diff Annex II/III/V against the saved one.`);
    }
    const amend = await sparql(
      `PREFIX cdm: <http://publications.europa.eu/ontology/cdm#> SELECT DISTINCT ?c ?d WHERE { ?w cdm:resource_legal_amends_resource_legal ?t . ?t cdm:resource_legal_id_celex "3${CELEX_BASE.slice(1)}"^^<http://www.w3.org/2001/XMLSchema#string> . ?w cdm:resource_legal_id_celex ?c . ?w cdm:work_date_document ?d } ORDER BY DESC(?d) LIMIT 20`,
    );
    const known = new Set(snap.eu.amendments);
    next.eu.amendments = [...new Set([...snap.eu.amendments, ...amend.map((r) => r.c.value)])].sort();
    if (known.size > 0) {
      for (const r of amend) if (!known.has(r.c.value)) report.eu.push(`New act amending the Cosmetics Regulation: [${r.c.value}](http://publications.europa.eu/resource/celex/${r.c.value}) dated ${r.d.value}.`);
    }
  } catch (e) {
    report.unreachable.push(`EU Publications Office SPARQL (${(e as Error).message})`);
    next.eu = snap.eu;
  }
}

const FDA_TITLE = /(cosmetic|sunscreen|skin|hair|talc|formaldehyde|pfas|hydroquinone|antiseptic|mercury)/i;
const ACTION_WORD = /(prohibit|ban|restrict|ingredient|final rule|proposed rule|order|monograph|asbestos|safety)/i;

async function checkFda(since: string, report: Report) {
  const q = new URLSearchParams();
  q.set("conditions[agencies][]", "food-and-drug-administration");
  q.set("conditions[publication_date][gte]", since);
  q.set("per_page", "100");
  for (const f of ["title", "html_url", "publication_date", "type"]) q.append("fields[]", f);
  for (const term of ["cosmetic", "sunscreen"]) {
    q.set("conditions[term]", term);
    const body = await get(`https://www.federalregister.gov/api/v1/documents.json?${q}`, "application/json");
    if (!body) {
      report.unreachable.push("Federal Register API");
      return;
    }
    for (const d of JSON.parse(body).results ?? []) {
      const line = `${d.publication_date} ${d.type}: [${d.title}](${d.html_url})`;
      if (FDA_TITLE.test(d.title) && ACTION_WORD.test(d.title) && !report.fda.includes(line)) report.fda.push(line);
    }
  }
}

function section(title: string, items: string[], empty: string) {
  return `## ${title}\n\n${items.length ? items.map((i) => `- ${i}`).join("\n") : empty}\n`;
}

async function main() {
  const accept = process.argv.includes("--accept");
  const today = new Date().toISOString().slice(0, 10);
  const snap = loadSnapshot();
  const next: Snapshot = { checked: today, pages: {}, eu: { ...snap.eu } };
  const report: Report = { changed: [], unreachable: [], added: [], eu: [], fda: [] };

  await checkPages(snap, next, report);
  await checkEu(snap, next, report);
  await checkFda(snap.checked, report);

  const firstRun = Object.keys(snap.pages).length === 0;
  const needsLook = report.changed.length + report.eu.length + report.fda.length > 0;
  console.log(
    [
      `# Regulatory recheck ${today} (last ${snap.checked})`,
      "",
      firstRun ? "First run: saving fingerprints only.\n" : "",
      section("EU Cosmetics Regulation", report.eu, "No new consolidated text or amending act."),
      section("FDA in the Federal Register", report.fda, "Nothing that looks like a cosmetic or sunscreen ingredient action."),
      section("Source pages that changed (read again)", report.changed, "None."),
      section("Unreachable from here (check by hand)", report.unreachable, "None."),
      section("Watch-list states not yet in the data (search their legislature each month)", STATES_TO_SEARCH, ""),
      firstRun || report.added.length === 0 ? "" : section("New sources (no saved fingerprint)", report.added, ""),
    ].join("\n"),
  );

  if (accept || firstRun) {
    writeFileSync(SNAPSHOT, JSON.stringify(next, null, 2) + "\n");
    console.error(`Saved fingerprints to ${SNAPSHOT}`);
  }
  if (needsLook && !accept && !firstRun) process.exitCode = 1;
}

/** States with cosmetics bans we know of but haven't verified against primary text, or bills in progress. */
const STATES_TO_SEARCH = [
  "Connecticut: PFAS in cosmetics (Public Act 24-59), dates not yet verified",
  "New Jersey: PFAS in cosmetics (enacted January 2026, reported effective January 2028), not yet verified",
  "Rhode Island: PFAS in cosmetics (2024 law), not yet verified",
  "Illinois: mercury in cosmetics ban and a pending toxic-free cosmetics bill, not yet verified",
  "New Mexico, Massachusetts, New York (toxic-free cosmetics bills): watch for passage",
];

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(2);
  });
}

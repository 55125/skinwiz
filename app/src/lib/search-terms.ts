// Turns what someone types into search terms (pure; lib/queries.ts builds the
// SQL). Matching the whole query as one substring made "cerave resurfacing
// retinol" miss because brand and product name live in different columns,
// and "glycolic toner" miss a product called "Exfoliating Toner". Now each
// word must match somewhere (name, brand or ingredients), in any order, and
// a few everyday words also match what labels actually say.

export type SearchTerm = {
  /** Any one of these, as a substring, satisfies the term. */
  alts: string[];
  /** Short words like "aha" only match at the start of a word, so "hsa" can't hit "thighsacne". */
  wordStart: boolean;
};

// Things people search for that are a topic rather than a product name. The
// search page shows a pointer for these.
export type SearchHint = "hsa" | "rx-retinoid" | "kids";

const STOPWORDS = new Set(["a", "an", "and", "the", "for", "with", "of", "to", "in", "on", "my", "best", "good", "product", "products", "&", "+"]);

// Multi-word phrases first, so "vitamin c" stays one term.
const PHRASES: [string, string[]][] = [
  ["vitamin c", ["vitamin c", "ascorbic", "ascorbyl"]],
  ["vit c", ["vitamin c", "ascorbic", "ascorbyl"]],
  ["benzoyl peroxide", ["benzoyl peroxide"]],
  ["salicylic acid", ["salicylic"]],
  ["glycolic acid", ["glycolic"]],
  ["lactic acid", ["lactic"]],
  ["azelaic acid", ["azelaic"]],
  ["hyaluronic acid", ["hyaluronic", "hyaluronate"]],
  ["zinc oxide", ["zinc oxide"]],
  ["face wash", ["wash", "cleanser", "cleansing"]],
];

const SYNONYMS: Record<string, string[]> = {
  aha: ["glycolic", "lactic", "mandelic", "aha"],
  bha: ["salicylic", "bha"],
  bpo: ["benzoyl peroxide"],
  toner: ["toner", "toning", "tonic"],
  toning: ["toner", "toning", "tonic"],
  tonic: ["toner", "toning", "tonic"],
  cleanser: ["cleanser", "cleansing", "wash"],
  moisturizer: ["moisturiz", "moisturis", "cream", "lotion"],
  moisturiser: ["moisturiz", "moisturis", "cream", "lotion"],
  moisturizing: ["moisturiz", "moisturis"],
  sunscreen: ["sunscreen", "spf", "sun protect", "sunblock"],
  sunblock: ["sunscreen", "spf", "sun protect", "sunblock"],
  retinoid: ["retinol", "retinal", "retinoate", "retinyl", "adapalene"],
  retinoids: ["retinol", "retinal", "retinoate", "retinyl", "adapalene"],
  kid: ["kid", "child", "baby", "infant", "toddler", "pediatric"],
  kids: ["kid", "child", "baby", "infant", "toddler", "pediatric"],
  child: ["kid", "child", "baby", "infant", "toddler", "pediatric"],
  children: ["kid", "child", "baby", "infant", "toddler", "pediatric"],
  childrens: ["kid", "child", "baby", "infant", "toddler", "pediatric"],
  toddler: ["kid", "child", "baby", "infant", "toddler", "pediatric"],
  pediatric: ["kid", "child", "baby", "infant", "toddler", "pediatric"],
  baby: ["baby", "infant"],
  fragrance: ["fragrance"],
  unscented: ["unscented", "fragrance free", "fragrance-free"],
};

// Topic words: they set a hint and are not matched against products.
const TOPIC_ONLY: Record<string, SearchHint> = { hsa: "hsa", fsa: "hsa", "hsa/fsa": "hsa", "fsa/hsa": "hsa", eligible: "hsa" };
const HINT_WORDS: Record<string, SearchHint> = {
  tretinoin: "rx-retinoid",
  "retin-a": "rx-retinoid",
  tazarotene: "rx-retinoid",
  trifarotene: "rx-retinoid",
  tazorac: "rx-retinoid",
  altreno: "rx-retinoid",
  kid: "kids",
  kids: "kids",
  child: "kids",
  children: "kids",
  childrens: "kids",
  toddler: "kids",
  pediatric: "kids",
};

export function parseSearch(raw: string): { terms: SearchTerm[]; hints: SearchHint[] } {
  let q = raw.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
  const terms: SearchTerm[] = [];
  const hints = new Set<SearchHint>();
  for (const [phrase, alts] of PHRASES) {
    const re = new RegExp(`(^| )${phrase.replace(/ /g, " ")}( |$)`);
    if (re.test(q)) {
      terms.push({ alts, wordStart: false });
      q = q.replace(re, " ").trim();
    }
  }
  for (const word of q.split(/[\s,;:()]+/)) {
    const w = word.replace(/^[.\-]+|[.\-]+$/g, "");
    if (!w || STOPWORDS.has(w)) continue;
    if (HINT_WORDS[w]) hints.add(HINT_WORDS[w]);
    if (TOPIC_ONLY[w]) {
      hints.add(TOPIC_ONLY[w]);
      continue;
    }
    const base = SYNONYMS[w] ?? [w];
    // "paula's" also finds "Paulas"
    const alts = [...new Set(base.flatMap((a) => (a.includes("'") ? [a, a.replace(/'/g, "")] : [a])))];
    terms.push({ alts, wordStart: w.length <= 3 && !SYNONYMS[w] });
  }
  return { terms, hints: [...hints] };
}

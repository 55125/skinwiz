// FDA label Directions arrive as one run-on line more often than not: the
// SPL text drops the package's bullets and line breaks, so "use twice daily
// shake well, wet face, ..." reads as one sentence. Break it back into short
// steps without changing a word: split on the label's own bullets, line
// breaks and sentence ends, then before a step verb that starts a new clause
// with no punctuation in front of it ("...into a lather massage onto face"),
// and capitalize the first letter of each step.

const BULLET = /\s*[•■▪●◦]\s*/g;

// Verbs that open a label step. "use" is left out on purpose: "for best
// results use at least twice a week" is one step, not two.
const STEP_VERBS = new Set([
  "apply",
  "reapply",
  "re-apply",
  "shake",
  "wet",
  "massage",
  "rinse",
  "wash",
  "cleanse",
  "clean",
  "pat",
  "wait",
  "remove",
  "supervise",
  "discontinue",
]);

// Capitalized mid-line, these open a new step too ("...before sun exposure
// Use a water resistant sunscreen"); lowercase they're usually mid-clause.
const CAPITALIZED_STARTS = new Set(["use", "children", "sun", "cover", "do", "stop", "ask", "keep", "for", "limit", "wear"]);

// A step verb right after one of these is mid-clause ("allow to dry", "and
// rinse", "apply to clean skin"), so no split there.
const JOINERS = new Set([
  "and", "or", "then", "to", "on", "onto", "into", "the", "a", "an", "of", "with", "before", "after",
  "gently", "not", "when", "if", "while", "until", "is", "are", "be", "do", "may", "can", "you", "please", "&",
]);

function splitSentences(line: string): string[] {
  // A period, ! or ? then a space ends a sentence, unless the word before it
  // is a short abbreviation ("Dr.", "e.g.").
  return line.split(/(?<=(?:^|\s|\()[^\s.]{3,}[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
}

function splitRunOn(sentence: string): string[] {
  const words = sentence.split(/\s+/);
  const steps: string[][] = [[]];
  words.forEach((word, i) => {
    const prev = words[i - 1];
    const bare = word.toLowerCase().replace(/[:,;]$/, "");
    const opensStep =
      STEP_VERBS.has(bare) || (CAPITALIZED_STARTS.has(bare) && /^\p{Lu}/u.test(word) && /^[\p{Ll}\d]/u.test(prev ?? ""));
    // A one-word step is never right: "change wet and soiled diapers".
    if (prev !== undefined && opensStep && steps[steps.length - 1].length > 1 &&!/[,;:(/-]$/.test(prev) && !JOINERS.has(prev.toLowerCase())) {
      steps.push([]);
    }
    steps[steps.length - 1].push(word);
  });
  return steps.map((s) => s.join(" "));
}

const capitalize = (s: string) => s.replace(/^[^\p{L}]*\p{Ll}/u, (m) => m.toUpperCase());

/** A label's Directions as short steps, each worded exactly as printed. */
export function directionSteps(text: string): string[] {
  return text
    .replace(BULLET, "\n")
    .split(/\n+/)
    .flatMap(splitSentences)
    .flatMap(splitRunOn)
    .map((s) => capitalize(s.replace(/^[.,;:]\s*/, "").trim()))
    .filter((s) => /[\p{L}\p{N}]/u.test(s));
}

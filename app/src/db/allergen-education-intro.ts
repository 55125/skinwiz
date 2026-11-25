// The handout's opening lines, apart from the records so a client component
// can print them without bundling every record.

/** The two-sentence opening every allergen's handout section shares. */
export function allergyIntro(name: string): string {
  return `Your patch test shows a contact allergy to ${name}. Touching it can cause an itchy rash, redness, swelling or small blisters, usually 1 to 3 days after contact, so the cause is easy to miss.`;
}

/** The same opening for a handout that lists several allergens. */
export function allergyIntroMany(): string {
  return "Your patch test shows a contact allergy to the ingredients on this sheet. Touching one can cause an itchy rash, redness, swelling or small blisters, usually 1 to 3 days after contact, so the cause is easy to miss.";
}

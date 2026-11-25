import Link from "next/link";
import { Lightbulb } from "lucide-react";
import type { AllergenEducation } from "@/db/allergen-education";
import { getAllergen, getAllergenGroup } from "@/db/contact-allergens";
import { importItemName } from "@/db/patch-test-series";

// The patient-education part of an allergen page, from the shared record
// (db/allergen-education.ts) that the patch-test handout prints too.

/** "Tested as" and CAS lines for the label-names card. */
export function AllergenIdentifiers({ e }: { e: AllergenEducation }) {
  return (
    <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
      <dt className="text-muted-foreground">Patch-tested as</dt>
      <dd className="[overflow-wrap:anywhere]">{e.testedAs.join(", ")}</dd>
      {e.cas.length > 0 && (
        <>
          <dt className="text-muted-foreground">CAS number</dt>
          <dd>
            {e.cas.map((c, i) => (
              <span key={c.number}>
                {i > 0 && "; "}
                <span className="font-mono">{c.number}</span> <span className="text-muted-foreground">({c.of})</span>
              </span>
            ))}
          </dd>
        </>
      )}
    </dl>
  );
}

function relatedHref(id: string): string | null {
  return getAllergen(id) || getAllergenGroup(id) ? `/allergens/${id}` : null;
}

// `identifiers`: a family page has no label-names card to carry the
// patch-test name and CAS lines, so they get their own.
export function AllergenEducationSections({ e, identifiers = false }: { e: AllergenEducation; identifiers?: boolean }) {
  return (
    <>
      {identifiers && (
        <section className="rounded-2xl border bg-card p-5">
          <AllergenIdentifiers e={e} />
        </section>
      )}
      <section className="space-y-3" id="where-youll-meet-it" aria-labelledby="meet-h">
        <h2 id="meet-h" className="text-xl font-semibold">
          Where you&apos;ll meet it
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {e.foundIn.map((g) => (
            <div key={g.where} className="rounded-2xl border bg-card p-4">
              <h3 className="text-sm font-semibold">{g.where}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed">
                {g.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {e.related.length > 0 && (
        <section className="space-y-2" aria-labelledby="related-h">
          <h2 id="related-h" className="text-sm font-semibold">
            Often goes with
          </h2>
          <ul className="space-y-1.5 text-sm">
            {e.related.map((r) => {
              const href = relatedHref(r.id);
              const name = importItemName(r.id) ?? r.id;
              return (
                <li key={r.id}>
                  {href ? (
                    <Link href={href} className="font-medium text-brand hover:underline">
                      {name}
                    </Link>
                  ) : (
                    <span className="font-medium">{name}</span>
                  )}
                  <span className="text-muted-foreground">: {r.why}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {e.tips.length > 0 && (
        <section className="space-y-2 rounded-2xl border bg-card p-4" aria-labelledby="tips-h">
          <h2 id="tips-h" className="flex items-center gap-1.5 text-sm font-semibold">
            <Lightbulb className="h-4 w-4" aria-hidden /> Tips
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
            {e.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      )}

    </>
  );
}

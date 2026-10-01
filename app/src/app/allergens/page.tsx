import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { AllergenDirectory } from "@/components/allergen-directory";
import { AvoidToggleButton } from "@/components/avoid-toggle-button";
import { ALLERGEN_GROUPS, CONTACT_ALLERGENS } from "@/db/contact-allergens";
import { getAllergenProductCounts, getAssessedProductCount } from "@/lib/queries";
import { readAvoidIds } from "@/lib/avoid";
import { SITE_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Contact allergen guide",
  description: `${CONTACT_ALLERGENS.length} clinically relevant contact allergens in skincare and OTC products, every name they go by on an ingredient label, and the products free of each.`,
  alternates: { canonical: "/allergens" },
};

export const dynamic = "force-dynamic";

const LABEL_NOTES: { title: string; body: React.ReactNode }[] = [
  {
    title: "Label names rarely match patch-test names",
    body: (
      <>
        The biggest pitfall. HICC appears as &ldquo;Lyral,&rdquo; MCI/MI as &ldquo;Kathon CG,&rdquo; oakmoss as
        &ldquo;Evernia prunastri,&rdquo; lanolin as &ldquo;wool alcohols.&rdquo; {SITE_NAME} matches every synonym
        listed below, so search by whatever name is on your results sheet.
      </>
    ),
  },
  {
    title: "“Fragrance” can hide any fragrance allergen",
    body: (
      <>
        &ldquo;Fragrance,&rdquo; &ldquo;parfum,&rdquo; &ldquo;aroma&rdquo; and &ldquo;flavor&rdquo; are catch-alls.
        A product listing one is marked &ldquo;may contain&rdquo; for each fragrance allergen you avoid, and never
        passes a fragrance-allergen filter.
      </>
    ),
  },
  {
    title: "“Fragrance-free” and “hypoallergenic” aren’t guarantees",
    body: (
      <>
        Neither term is regulated. Fragrance chemicals used for other purposes (balsam of Peru, benzyl alcohol,
        benzaldehyde, bisabolol) turn up in products sold as unscented.
      </>
    ),
  },
  {
    title: "Limonene and linalool matter once they age",
    body: (
      <>
        They sensitize mainly as hydroperoxides that form as a product oxidizes. The fresh compounds are weak
        allergens but are on a huge share of labels.
      </>
    ),
  },
  {
    title: "Formaldehyde releasers travel together",
    body: (
      <>
        If you react to formaldehyde, avoid every releaser. Release strength runs quaternium-15 &gt; diazolidinyl urea
        &gt; DMDM hydantoin &gt; imidazolidinyl urea &gt; bronopol.
      </>
    ),
  },
  {
    title: "No list is complete",
    body: (
      <>
        This list covers allergens from the standard patch-test series and the literature cited on each section, not
        every possible one: the CAMP database alone tracks about 191. Standard screening series also miss roughly 10%
        of fragrance allergy and many emerging sunscreen and preservative allergies.
      </>
    ),
  },
];

export default async function AllergensPage() {
  const avoidIds = await readAvoidIds();
  const counts = Object.fromEntries(getAllergenProductCounts());
  const assessed = getAssessedProductCount();

  return (
    <div className="mx-auto max-w-5xl space-y-12 px-4 py-10">
      <PageHeader
        eyebrow="Contact dermatitis"
        title="Contact allergen guide"
        description={`${CONTACT_ALLERGENS.length} clinically relevant contact allergens found in skincare, sunscreen, hair and OTC products, with every name they go by on an ingredient label. Add yours to your avoid list and every product page will flag them, including under names you wouldn't recognize.`}
      >
        <p className="pt-1 text-sm text-muted-foreground">
          Checked against the full ingredient lists of {assessed.toLocaleString()} products.{" "}
          <Link href="/avoid" className="font-medium text-brand hover:underline">
            Edit my avoid list →
          </Link>
        </p>
      </PageHeader>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Reading labels for contact allergens</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {LABEL_NOTES.map((n) => (
            <div key={n.title} className="rounded-2xl border bg-card p-4 text-sm leading-relaxed">
              <h3 className="mb-1 font-medium">{n.title}</h3>
              <p className="text-muted-foreground">{n.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Families and patch-test mixes</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Allergens that cross-react or are tested together, so you can avoid them as one.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {ALLERGEN_GROUPS.map((g) => (
            <li key={g.id} className="flex items-start justify-between gap-3 rounded-2xl border bg-card p-4">
              <div className="min-w-0 space-y-1">
                <Link href={`/allergens/${g.id}`} className="font-medium hover:underline">
                  {g.name}
                </Link>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {g.note} {g.members.length} allergens.
                </p>
              </div>
              <AvoidToggleButton id={g.id} avoidIds={avoidIds} />
            </li>
          ))}
        </ul>
      </section>

      <AllergenDirectory counts={counts} avoidIds={avoidIds} />

      <p className="rounded-2xl border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
        A screening aid built from the clinical literature, not an allergy test and not medical advice. Matches are on
        label names, so an allergen present under a name we don&apos;t know, or as an impurity, won&apos;t be caught.
        If you have a diagnosed contact allergy, read the full label yourself and use your dermatologist&apos;s list,
        or a tool like CAMP or SkinSAFE built for a patch-tested patient&apos;s exact results.
      </p>
    </div>
  );
}

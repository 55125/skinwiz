import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { JsonLd } from "@/components/json-ld";
import { getEquivalenceGroups } from "@/lib/otc-index";
import { activeName } from "@/lib/strength-display";
import { breadcrumbLd } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Same active, same strength: OTC store-brand equivalents",
  description:
    "OTC skin medicines grouped by identical active ingredient, strength and form — name brands next to their store-brand equivalents, from FDA drug label data.",
  alternates: { canonical: "/same" },
};

export default function SameIndexPage() {
  const groups = getEquivalenceGroups();
  // Grouped under the first active's name, alphabetically.
  const byActive = new Map<string, typeof groups>();
  for (const g of groups) {
    const name = activeName(g.activeIds[0]);
    (byActive.get(name) ?? byActive.set(name, []).get(name)!).push(g);
  }
  const sections = [...byActive.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-10">
      <JsonLd data={breadcrumbLd(siteUrl(), [["Home", "/"], ["Same active, same strength", "/same"]])} />
      <PageHeader
        eyebrow="Store brands & equivalents"
        title="Same active, same strength"
        description={`${groups.length} groups of OTC skin medicines whose FDA labels list the same active ingredient at the same strength, in the same form. Inactive ingredients can differ — each product page lets you compare them.`}
      />
      <p className="max-w-3xl text-sm text-muted-foreground">
        Sunscreens and antiperspirants aren&apos;t grouped: their SPF or sweat-reduction claim is tested on each finished
        product, so matching active percentages don&apos;t mean matching performance.
      </p>
      {sections.map(([name, gs]) => (
        <section key={name} className="space-y-2">
          <h2 className="text-lg font-semibold">{name}</h2>
          <ul className="flex flex-wrap gap-1.5 text-sm">
            {gs.map((g) => (
              <li key={g.slug}>
                <Link href={`/same/${g.slug}`} className="inline-block rounded-full border px-3 py-1 hover:bg-muted">
                  {g.title} <span className="text-muted-foreground">({g.members.length})</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

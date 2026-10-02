import type { Metadata } from "next";
import Link from "next/link";
import { sql } from "drizzle-orm";
import { PageHeader } from "@/components/page-header";
import { FilterChip } from "@/components/filter-chip";
import { HsaBadge } from "@/components/hsa-badge";
import { JsonLd } from "@/components/json-ld";
import { db } from "@/db/client";
import { hsaEligibleCount, hsaEligibleIdsJson } from "@/lib/otc-index";
import { HSA_STORE_AFFILIATE } from "@/lib/hsa";
import { breadcrumbLd } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";
import { SITE_NAME } from "@/lib/brand";

// A static segment, so it wins over /guide/[slug] (the ingredient filters).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "HSA/FSA-eligible skincare: OTC medicines and sunscreen",
  description:
    "Which skincare products you can usually buy with HSA or FSA funds: OTC medicines since the 2020 CARES Act, broad-spectrum SPF 15+ sunscreen, and why cosmetics generally aren't.",
  alternates: { canonical: "/guide/hsa-fsa-eligible" },
};

const SOURCES: { label: string; href: string; note: string }[] = [
  {
    label: "CARES Act, Pub. L. 116-136, §3702",
    href: "https://www.congress.gov/bill/116th-congress/house-bill/748/text",
    note: "Over-the-counter medicines (and menstrual care products) became qualified medical expenses for HSAs, health FSAs, HRAs and Archer MSAs without a prescription, for amounts paid after December 31, 2019.",
  },
  {
    label: "IRS Publication 502, Medical and Dental Expenses",
    href: "https://www.irs.gov/publications/p502",
    note: "Defines medical care — diagnosis, cure, mitigation, treatment or prevention of disease — and lists what doesn't count, including cosmetic procedures, toiletries and items merely beneficial to general health.",
  },
  {
    label: "IRS Publication 969, Health Savings Accounts and Other Tax-Favored Health Plans",
    href: "https://www.irs.gov/publications/p969",
    note: "How HSA, FSA and HRA distributions work, including that qualified medical expenses follow the Pub. 502 definition.",
  },
  {
    label: "FDA sunscreen labeling rule, 21 CFR 201.327",
    href: "https://www.ecfr.gov/current/title-21/chapter-I/subchapter-C/part-201/subpart-G/section-201.327",
    note: "Why the label tells us whether a sunscreen is broad spectrum SPF 15+: only those carry the “Sun Protection Measures” directions; the rest must carry a “Skin Cancer/Skin Aging Alert.”",
  },
];

export default function HsaGuidePage() {
  const total = hsaEligibleCount();
  const byConcern = db.all<{ id: string; name: string; n: number }>(sql`
    SELECT c.id AS id, c.name AS name, COUNT(*) AS n
    FROM products p JOIN concerns c ON c.id = p.concern_id
    WHERE p.id IN (SELECT value FROM json_each(${hsaEligibleIdsJson()}))
    GROUP BY c.id ORDER BY n DESC
  `);

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-10">
      <JsonLd data={breadcrumbLd(siteUrl(), [["Home", "/"], ["Browse", "/browse"], ["HSA/FSA eligible", "/guide/hsa-fsa-eligible"]])} />
      <PageHeader
        eyebrow="Spending accounts"
        title="HSA/FSA-eligible skincare"
        description={`${total.toLocaleString()} products in the ${SITE_NAME} catalog carry the “Usually HSA/FSA eligible” tag. Here's what it means and where it comes from.`}
      >
        <div className="pt-1">
          <HsaBadge />
        </div>
      </PageHeader>

      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-relaxed dark:border-amber-900 dark:bg-amber-950/40">
        <strong>Check with your plan administrator.</strong> Your HSA, FSA or HRA administrator decides what it reimburses,
        and plans can be narrower than the tax rules. Some ask for a receipt that names the product, and some cards
        decline items the store hasn&apos;t coded as eligible. This tag is general information, not tax advice.
      </div>

      <section className="space-y-3 text-sm leading-relaxed">
        <h2 className="text-xl font-semibold">What gets the tag</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>OTC medicines.</strong> Since the 2020 CARES Act, over-the-counter drugs no longer need a
            prescription to be paid from an HSA or FSA. Every product here that comes from FDA drug listing data — acne
            treatments with benzoyl peroxide, salicylic acid or adapalene, antifungals, 1% hydrocortisone and other
            anti-itch creams, skin protectants like petrolatum and colloidal oatmeal, dandruff treatments — is an OTC drug,
            so it gets the tag.
          </li>
          <li>
            <strong>Sunscreen, if it&apos;s broad spectrum SPF 15 or higher.</strong> Plan administrators generally accept
            these and not lower-SPF or non-broad-spectrum products. We read it from the FDA label: only broad spectrum SPF
            15+ sunscreens carry the &ldquo;Sun Protection Measures&rdquo; directions, and every other sunscreen has to carry a
            &ldquo;Skin Cancer/Skin Aging Alert.&rdquo; When the label doesn&apos;t settle it either way, we leave the tag off.
          </li>
        </ul>
      </section>

      <section className="space-y-3 text-sm leading-relaxed">
        <h2 className="text-xl font-semibold">What doesn&apos;t</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Cosmetics</strong> — serums, moisturizers, cleansers and other products that aren&apos;t FDA-listed drugs.
            Products for appearance or general health generally aren&apos;t medical care under IRS rules, even when they&apos;re
            good for your skin.
          </li>
          <li>
            <strong>Antiperspirants.</strong> They&apos;re OTC drugs, but plans usually treat them as toiletries unless you have
            a Letter of Medical Necessity, for example for hyperhidrosis.
          </li>
          <li>
            <strong>Makeup with SPF</strong> — foundation, lipstick, BB cream. The SPF makes it an FDA-listed drug, but plans
            generally treat it as a cosmetic.
          </li>
          <li>
            <strong>Sunscreens below SPF 15 or not broad spectrum</strong>, and sunscreens whose label we couldn&apos;t confirm.
          </li>
        </ul>
        <p className="text-muted-foreground">
          Brand-sourced listings of drug products (a brand&apos;s own sunscreen page, say) don&apos;t get the tag yet, because
          we only read eligibility from FDA label data. Check the Drug Facts panel on the package: if it has one, it&apos;s an
          OTC drug.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Browse eligible products</h2>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip selected={false} href="/browse?hsa=1">
            All ({total.toLocaleString()})
          </FilterChip>
          {byConcern.map((c) => (
            <FilterChip selected={false} key={c.id} href={`/browse?hsa=1&concern=${c.id}`}>
              {c.name} ({c.n.toLocaleString()})
            </FilterChip>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Paying with HSA/FSA funds anyway? A store brand with the{" "}
          <Link href="/same" className="font-medium text-brand hover:underline">
            same active at the same strength
          </Link>{" "}
          stretches the balance further.
        </p>
        {/* HSA/FSA store affiliate hook: set HSA_STORE_AFFILIATE in lib/hsa.ts
            once an account is approved. Disclosure stays next to the link. */}
        {HSA_STORE_AFFILIATE && (
          <p className="text-sm">
            <a href={HSA_STORE_AFFILIATE.url} target="_blank" rel="sponsored noopener noreferrer" className="font-medium text-brand underline">
              Shop eligible items at {HSA_STORE_AFFILIATE.name}
            </a>{" "}
            <span className="text-muted-foreground">(affiliate link — we may earn a commission)</span>
          </p>
        )}
      </section>

      <section className="space-y-3 text-sm leading-relaxed">
        <h2 className="text-xl font-semibold">Sources</h2>
        <ul className="space-y-3">
          {SOURCES.map((s) => (
            <li key={s.href}>
              <a href={s.href} target="_blank" rel="noopener noreferrer" className="font-medium text-brand hover:underline">
                {s.label}
                <span className="sr-only"> (opens in new tab)</span>
              </a>
              <p className="text-muted-foreground">{s.note}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

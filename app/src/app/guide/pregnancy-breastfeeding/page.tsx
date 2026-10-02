import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { JsonLd } from "@/components/json-ld";
import { PREGNANCY_ENTRIES, type PregnancyEntry, type SafetyLevel } from "@/db/pregnancy-lactation";
import { FEATURES } from "@/lib/feature-flags";
import { breadcrumbLd } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";
import { SITE_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

// Explainer for pregnancy & breastfeeding mode. Gated with the rest of the
// feature (FEATURES.PREGNANCY_MODE): a 404 until the dermatologist signs off.
export const dynamic = "force-dynamic";

const TITLE = "Skincare ingredients in pregnancy and breastfeeding";

export async function generateMetadata(): Promise<Metadata> {
  if (!FEATURES.PREGNANCY_MODE) return {};
  return {
    title: TITLE,
    description:
      "Which skincare ingredients are usually avoided, worth asking about, or generally considered OK during pregnancy and breastfeeding, with the published guidance behind each.",
    alternates: { canonical: "/guide/pregnancy-breastfeeding" },
  };
}

const LEVEL_LABEL: Record<SafetyLevel, string> = {
  avoid: "Usually avoided",
  caution: "Ask first / use with limits",
  ok: "Generally considered OK",
};
const LEVEL_CLASS: Record<SafetyLevel, string> = {
  avoid: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  caution: "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200",
  ok: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
};

function Level({ level }: { level: SafetyLevel }) {
  return <span className={cn("inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium", LEVEL_CLASS[level])}>{LEVEL_LABEL[level]}</span>;
}

function EntryCard({ e }: { e: PregnancyEntry }) {
  return (
    <li className="space-y-2 rounded-2xl border bg-card p-4">
      <h3 className="font-semibold">{e.name}</h3>
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="space-y-1">
          <p className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Pregnancy <Level level={e.pregnancy.level} />
          </p>
          <p className="text-foreground/85">{e.pregnancy.note}</p>
          {e.washOff?.pregnancy && (
            <p className="text-foreground/85">
              <span className="font-medium">Rinse-off products:</span> {e.washOff.pregnancy.note}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <p className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Breastfeeding <Level level={e.lactation.level} />
          </p>
          <p className="text-foreground/85">{e.lactation.note}</p>
        </div>
      </div>
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">Sources</summary>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          {e.sources.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </details>
    </li>
  );
}

const GROUPS: { level: SafetyLevel; title: string; blurb: string }[] = [
  {
    level: "avoid",
    title: "Usually avoided during pregnancy",
    blurb: "Mainstream guidance says to skip these until after pregnancy. Often that's a precaution rather than proven harm, but there are good alternatives.",
  },
  {
    level: "caution",
    title: "Worth asking about, or fine with limits",
    blurb: "Acceptable in limited use, or there simply isn't enough data to say. A quick question at your next visit settles it.",
  },
  {
    level: "ok",
    title: "Generally considered OK",
    blurb: "Ingredients mainstream guidance considers acceptable in normal use. Still check with your OB or dermatologist about your own situation.",
  },
];

export default function PregnancyGuidePage() {
  if (!FEATURES.PREGNANCY_MODE) notFound();
  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-10">
      <JsonLd data={breadcrumbLd(siteUrl(), [["Home", "/"], ["Pregnancy & breastfeeding", "/guide/pregnancy-breastfeeding"]])} />
      <PageHeader
        eyebrow="Guide"
        title={TITLE}
        description="Most skincare is fine to keep using. A few ingredients are usually set aside during pregnancy, and a few more are worth a question. Here's how mainstream guidance sorts the common ones."
      />

      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm leading-relaxed dark:border-amber-900/60 dark:bg-amber-950/20">
        <p className="font-semibold">This is general information, not medical clearance.</p>
        <p className="mt-1 text-foreground/80">
          Your situation may differ. Talk to your OB or dermatologist before starting or stopping any product, and
          don&apos;t stop a prescribed medicine on your own. {SITE_NAME} doesn&apos;t provide medical advice.
        </p>
      </div>

      <section className="space-y-3 text-sm leading-relaxed">
        <h2 className="text-xl font-semibold">How {SITE_NAME} uses this</h2>
        <p>
          If you mark <span className="font-medium">Pregnant or trying</span> or{" "}
          <span className="font-medium">Breastfeeding</span> in your{" "}
          <Link href="/profile" className="font-medium text-brand hover:underline">
            skin profile
          </Link>
          , product pages check the published ingredient list against the classifications below and note anything
          usually avoided or worth asking about. Product listings also get a{" "}
          <span className="font-medium">Hide products to avoid in pregnancy</span> filter. Your profile stays in your
          browser&apos;s cookie; it isn&apos;t saved to an account.
        </p>
        <p className="text-muted-foreground">
          It&apos;s a screen of the label, so it can&apos;t account for concentration, how much skin you cover, or your
          health history. Rinse-off products (cleansers, shampoos) are treated more leniently where guidance does. Products
          without a full ingredient list can&apos;t be fully checked. Plant extracts and essential oils aren&apos;t
          classified here.
        </p>
      </section>

      {GROUPS.map((g) => {
        const entries = PREGNANCY_ENTRIES.filter((e) => e.pregnancy.level === g.level);
        if (entries.length === 0) return null;
        return (
          <section key={g.level} className="space-y-3">
            <h2 className="text-xl font-semibold">{g.title}</h2>
            <p className="text-sm text-muted-foreground">{g.blurb}</p>
            <ul className="space-y-3">
              {entries.map((e) => (
                <EntryCard key={e.id} e={e} />
              ))}
            </ul>
          </section>
        );
      })}

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-xl font-semibold">Sun protection still matters</h2>
        <p>
          Melasma (the &ldquo;mask of pregnancy&rdquo;) often appears or darkens during pregnancy, and sun exposure
          drives it. A broad-spectrum sunscreen every day, plus shade and a hat, is one of the most useful things you
          can keep doing. Mineral (zinc oxide, titanium dioxide) sunscreens are a common choice if you&apos;d rather
          skip chemical filters.
        </p>
        <p>
          <Link href="/concern/sun-protection" className="font-medium text-brand hover:underline">
            Browse sunscreens →
          </Link>
        </p>
      </section>
    </div>
  );
}

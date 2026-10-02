import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { PatchTestIssuer } from "@/components/patch-test-issuer";
import { FEATURES } from "@/lib/feature-flags";
import { currentClinician } from "@/lib/clinicians";
import { listsForClinician } from "@/lib/clinician-lists";
import { SITE_NAME } from "@/lib/brand";

// A tool, not content: kept out of search results but free to link to (and
// crawlable, so the noindex is seen).
export const metadata: Metadata = {
  title: "Patch-test results sheet with QR code",
  description: `Tick a patient's positive patch-test allergens and print a one-page sheet with a QR code that loads them into a free ${SITE_NAME} avoid list. No account, nothing stored.`,
  alternates: { canonical: "/for-clinicians/patch-test" },
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

export default async function PatchTestIssuePage({ searchParams }: { searchParams: Promise<{ list?: string }> }) {
  const { list } = await searchParams;
  // A signed-in clinician's starter lists; anyone else gets the plain sheet.
  const { clinician } = FEATURES.HANDOUTS ? await currentClinician() : { clinician: null };
  const lists = clinician ? listsForClinician(clinician.id).map((l) => ({ id: l.id, name: l.name, ids: l.ids })) : [];
  const initialIds = lists.find((l) => l.id === list)?.ids ?? [];
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 print:hidden">
      <PageHeader
        eyebrow="For dermatologists"
        title="Patch-test results sheet"
        description="At the reading, tick your patient's positives and hand over a printed sheet. They scan the QR code and their avoid list is filled in: every product they look up is then checked against it, by every label name we know."
      />

      <ul className="grid gap-3 text-sm sm:grid-cols-3">
        <li className="rounded-2xl border bg-muted/40 p-4">
          <span className="font-medium">No typing for the patient.</span>{" "}
          <span className="text-muted-foreground">One tap adds the list. No account, no app.</span>
        </li>
        <li className="rounded-2xl border bg-muted/40 p-4">
          <span className="font-medium">Nothing stored by us.</span>{" "}
          <span className="text-muted-foreground">
            The link itself carries the allergen list and any date and note you add. The patient&apos;s
            name is printed from this tab only and never leaves it.
          </span>
        </li>
        <li className="rounded-2xl border bg-muted/40 p-4">
          <span className="font-medium">Label names, not series names.</span>{" "}
          <span className="text-muted-foreground">
            The sheet lists what each allergen is called on labels (wool alcohols → lanolin, Kathon CG → MCI/MI).
          </span>
        </li>
      </ul>

      <PatchTestIssuer lists={lists} initialIds={initialIds} key={list ?? "none"} />

      <div className="space-y-2 rounded-2xl border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
        <p>
          Allergens that never appear on cosmetic labels (rubber accelerators, epoxy, textile dyes) are printed as
          information with where they&apos;re usually found, but can&apos;t be checked against products. Matching uses
          the label synonyms in our{" "}
          <Link href="/allergens" className="font-medium text-brand hover:underline">
            contact allergen guide
          </Link>
          ; products without a full ingredient list show as &ldquo;couldn&apos;t check,&rdquo; never as clear.
        </p>
        <p>
          No sign-in is needed for now, so a link can&apos;t prove who made it, and the patient page says so.
          Verified clinician accounts (NPI-checked) are planned.{" "}
          <Link href="/for-clinicians" className="font-medium text-brand hover:underline">
            More for dermatologists →
          </Link>
        </p>
      </div>
    </div>
  );
}

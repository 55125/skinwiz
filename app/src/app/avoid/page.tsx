import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { MySkinTabs } from "@/components/my-skin-tabs";
import { AvoidListEditor } from "@/components/avoid-list-editor";
import { ShareAvoidList } from "@/components/share-avoid-list";
import { readAvoidIds } from "@/lib/avoid";
import { SITE_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Ingredients I avoid",
  description: `Pick the ingredients you avoid and ${SITE_NAME} will flag every product that contains them.`,
};

export default async function AvoidPage({ searchParams }: { searchParams: Promise<{ paste?: string; series?: string }> }) {
  const { paste, series } = await searchParams;
  const ids = await readAvoidIds();
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <MySkinTabs />
      <PageHeader
        title="Ingredients I avoid"
        description="Pick what you steer clear of. Every product card and page will then flag anything on your list, and listing pages get a one-click filter. Saved in this browser only — no account, nothing sent anywhere."
      />

      <ShareAvoidList ids={ids} />

      <AvoidListEditor initialIds={ids} pasteOpen={paste === "1"} seriesOpen={series === "1"} />

      <div className="space-y-2 rounded-2xl border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
        <p>
          Flags are computed from each product&apos;s published ingredient list, not a brand&apos;s marketing claim or
          a certification, and the check list is not exhaustive. Products we don&apos;t have a full ingredient list
          for (most FDA-only listings) show as &ldquo;couldn&apos;t check,&rdquo; never as clear.
        </p>
        <p>
          This is not an allergy test and not medical advice. If you have a diagnosed contact allergy, read the full
          label yourself and talk to a board-certified dermatologist.{" "}
          <Link href="/browse" className="font-medium text-brand hover:underline">
            Browse products →
          </Link>
        </p>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert, CircleCheck, QrCode as QrIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PrintButton } from "@/components/print-button";
import { CopyTextButton } from "@/components/copy-text-button";
import { QrCode } from "@/components/qr-code";
import { Badge } from "@/components/ui/badge";
import { allergenLabel } from "@/db/contact-allergens";
import { ACTIVE_DEFINITIONS } from "@/db/actives";
import { analyzeReactions } from "@/lib/reaction-detective";
import { catalogSize, loadDetectiveProducts, parseIdList, type LoadedProduct } from "@/lib/reaction-detective-data";
import { findRoutineConflicts } from "@/lib/routine-conflicts";
import { siteUrl } from "@/lib/site-url";
import { dataSourceBadge } from "@/lib/data-source";

export const metadata: Metadata = {
  title: "Product review before a visit",
  description: "Patients list every product they use before a dermatology visit; you get one page with actives, listed allergens, doubled-up actives and suspects. Nothing is stored.",
  alternates: { canonical: "/clinic-tools/product-review" },
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

type Search = { r?: string; f?: string };

const activeName = new Map(ACTIVE_DEFINITIONS.map((a) => [a.id, a.canonicalName]));

export default async function ProductReviewPage({ searchParams }: { searchParams: Promise<Search> }) {
  const s = await searchParams;
  const reacted = loadDetectiveProducts(parseIdList(s.r));
  const fine = loadDetectiveProducts(parseIdList(s.f), new Set(reacted.map((p) => p.id)));
  if (reacted.length === 0 && fine.length === 0) return <Invite />;

  const all = [...reacted.map((p) => ({ p, reacted: true })), ...fine.map((p) => ({ p, reacted: false }))];
  const result = analyzeReactions(reacted, fine, catalogSize());
  const leads = result.suspects.filter((x) => x.strength !== "weaker");
  const conflicts = findRoutineConflicts(all.map(({ p }) => ({ productId: p.id, productBrandName: p.name })));

  // Actives the patient gets from more than one product.
  const byActive = new Map<string, string[]>();
  for (const { p } of all) for (const a of p.product.activeIds ?? []) byActive.set(a, [...(byActive.get(a) ?? []), p.name]);
  const doubled = [...byActive.entries()].filter(([, names]) => names.length > 1);

  const today = new Date().toISOString().slice(0, 10);
  const note = [
    `Patient-listed skin products (Actively product review, ${today}).`,
    `Reacted to: ${reacted.map((p) => p.name).join("; ") || "none listed"}.`,
    `Tolerated: ${fine.map((p) => p.name).join("; ") || "none listed"}.`,
    leads.length > 0
      ? `Contact allergens/ingredients in reacted but not tolerated products: ${leads.map((l) => `${l.name} (${l.reactedIn.length}/${result.reactedChecked})`).join("; ")}.`
      : "No shared contact allergen found in the reacted products.",
    ...(result.irritants.filter((n) => n.all).map((n) => `All reacted products contain ${n.label.replace(/^an? /, "")}.`)),
    ...(result.unchecked.length ? [`No ingredient list on file: ${result.unchecked.join("; ")}.`] : []),
  ].join(" ");

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 print:py-0">
      <PageHeader
        eyebrow="Clinic tools"
        title="Product review"
        description={`${all.length} product${all.length === 1 ? "" : "s"} the patient listed, from their ingredient labels. Patient-reported; no name or other details travel with this page.`}
      />
      <div className="flex flex-wrap gap-2 print:hidden">
        <CopyTextButton text={note} label="Copy chart note" />
        <PrintButton />
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Products</h2>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Patient says</th>
                <th className="px-3 py-2 font-semibold">Product</th>
                <th className="px-3 py-2 font-semibold">Actives</th>
                <th className="px-3 py-2 font-semibold">Contact allergens listed</th>
              </tr>
            </thead>
            <tbody>
              {all.map(({ p, reacted: r }) => (
                <ProductRow key={p.id} p={p} reacted={r} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 rounded-2xl border bg-card p-4">
          <h2 className="font-semibold">Suspects</h2>
          {leads.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {result.reactedChecked < 2 ? "Fewer than two reacted products with a list, so nothing stands out yet." : "No ingredient is shared by the reacted products and absent from the tolerated ones."}
            </p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {leads.map((l) => (
                <li key={`${l.kind}:${l.id}`}>
                  <span className="font-medium">{l.name}</span>{" "}
                  <span className="text-muted-foreground">
                    in {l.reactedIn.length} of {result.reactedChecked} reacted{l.members ? ` (${l.members.join(", ")})` : ""}
                    {l.series.length > 0 ? ` · ${l.series.join(", ")}` : l.kind !== "ingredient" ? " · not on a standard series" : ""}
                  </span>
                  {l.strength === "strong" && <Badge variant="outline" className="ml-1">in all</Badge>}
                </li>
              ))}
            </ul>
          )}
          {result.irritants.filter((n) => n.all).map((n) => (
            <p key={n.cls} className="text-sm">Every reacted product contains {n.label}: consider irritant dermatitis.</p>
          ))}
        </div>
        <div className="space-y-2 rounded-2xl border bg-card p-4">
          <h2 className="font-semibold">Overlaps and cautions</h2>
          {doubled.length === 0 && conflicts.length === 0 && <p className="text-sm text-muted-foreground">No doubled-up actives or common irritation pairings.</p>}
          <ul className="space-y-1.5 text-sm">
            {doubled.map(([id, names]) => (
              <li key={id}>
                <span className="font-medium">{activeName.get(id) ?? id}</span> <span className="text-muted-foreground">in {names.join(", ")}</span>
              </li>
            ))}
            {conflicts.map((c) => (
              <li key={`${c.a.productId}-${c.b.productId}-${c.note}`}>
                <span className="font-medium">{c.a.brand}</span> ({c.a.cls}) with <span className="font-medium">{c.b.brand}</span> ({c.b.cls}):{" "}
                <span className="text-muted-foreground">{c.note}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Ingredient lists come from FDA labels, brand sites and community databases (badge per product). Brands reformulate, so the box in the patient&apos;s hand
        wins.
      </p>
    </div>
  );
}

function ProductRow({ p, reacted }: { p: LoadedProduct; reacted: boolean }) {
  const src = dataSourceBadge(p.product.dataSource);
  const actives = (p.product.activeIds ?? []).map((a) => activeName.get(a) ?? a);
  return (
    <tr className="border-t align-top">
      <td className="px-3 py-2">
        {reacted ? (
          <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400"><CircleAlert className="h-4 w-4" aria-hidden /> Reacted</span>
        ) : (
          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400"><CircleCheck className="h-4 w-4" aria-hidden /> No trouble</span>
        )}
      </td>
      <td className="px-3 py-2">
        <Link href={`/product/${encodeURIComponent(p.id)}`} className="font-medium hover:underline">{p.product.brandName}</Link>
        {p.product.manufacturer && <div className="text-xs text-muted-foreground">{p.product.manufacturer}</div>}
        {src && <Badge variant="outline" className={`mt-1 ${src.className}`}>{src.label}</Badge>}
      </td>
      <td className="px-3 py-2 text-xs">{p.product.activeIngredientText && p.product.dataSource !== "open_beauty_facts" && p.product.dataSource !== "brand_direct" && p.product.dataSource !== "third_party" ? p.product.activeIngredientText : actives.join(", ") || "None labeled"}</td>
      <td className="px-3 py-2 text-xs">
        {p.allergenHits === null
          ? <span className="text-muted-foreground">No full ingredient list on file</span>
          : p.allergenHits.length === 0
            ? "None"
            : p.allergenHits.map((h) => (h === "fragrance" ? "Fragrance (undisclosed)" : (allergenLabel(h) ?? h))).join(", ")}
      </td>
    </tr>
  );
}

function Invite() {
  const url = `${siteUrl()}/reactions?bag=1`;
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <PageHeader
        eyebrow="Clinic tools"
        title="Product review before a visit"
        description="Ask patients to list every product they use before their appointment. They add them on their phone in a few minutes, marking any they reacted to, and show you a QR code at the visit. You get one page: actives, listed contact allergens, doubled-up actives, and the ingredients worth suspecting."
      />
      <div className="grid gap-6 rounded-3xl border bg-card p-6 sm:grid-cols-[1fr_auto] print:border-0">
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><QrIcon className="h-5 w-5 text-brand print:hidden" aria-hidden /> Before your visit: list your skin products</h2>
          <p className="text-sm">
            Scan the code and add everything you use on your skin, hair and lips, including anything you stopped using. Mark any product you reacted to. At your
            visit, show us the code on your phone.
          </p>
          <p className="break-all text-sm font-medium">{url}</p>
          <p className="text-xs text-muted-foreground">Free. No account, and your name is never asked for.</p>
          <div className="flex flex-wrap gap-2 print:hidden">
            <PrintButton label="Print for the waiting room" />
            <CopyTextButton text={url} label="Copy link for a reminder message" copiedLabel="Link copied" />
          </div>
        </div>
        <QrCode value={url} className="h-40 w-40 rounded-lg border bg-white p-1" title="QR code to list your products" />
      </div>
      <p className="text-sm text-muted-foreground print:hidden">
        Patients can also use it on their own: <Link href="/reactions" className="font-medium text-brand hover:underline">Reaction Detective →</Link>
      </p>
    </div>
  );
}

import Link from "next/link";
import { SITE_NAME } from "@/lib/brand";
import { AlertTriangle, ExternalLink, Moon, Phone, Pill, ShoppingBag, Sun, SunMoon } from "lucide-react";
import { MdBadge } from "@/components/md-badge";
import { PlanStepControls } from "@/components/plan-step-controls";
import { badgeCredential } from "@/lib/clinicians";
import { getAffiliateLinksForProducts } from "@/lib/queries";
import { buildOrderPlan, cartEnvFromProcess, findItAt, RETAILER_NAME, type OrderPlan } from "@/lib/retailer-carts";
import { getDisplayQuotesFor } from "@/lib/prices/store";
import { outboundLink } from "@/lib/prices/redirect";
import { sovrnSiteKey } from "@/lib/prices/config";
import { rxFulfillmentLink } from "@/lib/rx-fulfillment";
import { rxPriceCheckUrl } from "@/db/rx";
import { sectionsOf, type HandoutStep } from "@/lib/handout-types";
import type { HandoutVersion } from "@/lib/handouts";
import type { StepState } from "@/lib/regimens";
import type { products } from "@/db/schema";
import { HandoutSections } from "@/components/handout-sections";

type Product = typeof products.$inferSelect;

// The patient's view of a clinician-issued plan (and the clinician's preview
// of it). Steps and wording come straight from the immutable handout
// version: nothing here lets the patient change them. OTC steps may carry a
// LIVE affiliate buy link (labeled); prescription steps never do.
export function ClinicianPlan({
  version,
  products,
  states,
  regimenId,
  preview = false,
  rxLinks = false,
  gpc = false,
}: {
  version: HandoutVersion;
  products: Map<string, Product>;
  states: Map<string, StepState>;
  regimenId: number | null;
  preview?: boolean;
  /** Link Rx steps to their /rx reference page: verified clinicians only. */
  rxLinks?: boolean;
  /** The visitor sent a Global Privacy Control signal: don't wrap shopping links. */
  gpc?: boolean;
}) {
  const steps = version.content.steps;
  const visible = steps.filter((s) => !states.get(s.key)?.hidden);
  const hidden = steps.filter((s) => states.get(s.key)?.hidden);
  const otcProducts = steps.filter((s) => s.kind === "otc" && s.productId && products.has(s.productId));
  const links = getAffiliateLinksForProducts(otcProducts.map((s) => s.productId!));
  // Fresh live-price quotes (OTC only; none while prices are off). Affiliate
  // ones only: the buy links here are labeled as affiliate links.
  const quotes = getDisplayQuotesFor(otcProducts.map((s) => s.productId!)).filter((q) => q.affiliatable);
  const order = buildOrderPlan(
    otcProducts.map((s) => ({ productId: s.productId!, name: s.productName ?? s.label })),
    [
      ...links.map((l) => ({ productId: l.productId, network: l.network, buyUrl: l.buyUrl, isDemo: l.isDemo, price: l.price })),
      ...quotes.map((q) => ({ productId: q.productId, network: q.source, buyUrl: q.url, isDemo: false, price: q.price, retailer: q.merchantName })),
    ],
    cartEnvFromProcess(),
  );
  const liveByProduct = new Map(order.singles.map((s) => [s.item.productId, s]));
  const rxSteps = steps.filter((s) => s.kind === "rx");
  const groups: { title: string; icon: typeof Sun; items: HandoutStep[] }[] = [
    { title: "Morning", icon: Sun, items: visible.filter((s) => s.slot === "am" || s.slot === "both") },
    { title: "Night", icon: Moon, items: visible.filter((s) => s.slot === "pm" || s.slot === "both") },
    { title: "As directed", icon: SunMoon, items: visible.filter((s) => s.slot === "as-directed") },
  ];

  const stepCard = (s: HandoutStep, i: number) => {
    const p = s.productId ? products.get(s.productId) : undefined;
    const st = states.get(s.key);
    const live = s.productId ? liveByProduct.get(s.productId) : undefined;
    const productHref = p ? (p.isRx ? (rxLinks ? `/rx/${encodeURIComponent(p.id)}` : null) : `/product/${encodeURIComponent(p.id)}`) : null;
    return (
      <li key={`${s.key}-${i}`} className={`space-y-2 rounded-2xl border bg-card p-4 ${st?.doneAt ? "opacity-70" : ""}`}>
        <div className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-foreground tabular-nums">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {s.label}
              {s.kind === "rx" && " · prescription"}
            </p>
            {s.productName &&
              (productHref ? (
                <Link href={productHref} className="block font-semibold leading-snug hover:text-brand">
                  {s.productName}
                </Link>
              ) : (
                <p className="font-semibold leading-snug">{s.productName}</p>
              ))}
            {s.directions && <p className="text-sm leading-relaxed">{s.directions}</p>}
          </div>
        </div>
        {s.kind === "rx" ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-muted/50 px-3 py-2 text-xs">
            <Pill className="h-3.5 w-3.5 text-brand" /> Your clinician sends this prescription to your pharmacy.
            <a href={rxPriceCheckUrl(p?.genericName ?? s.productName ?? s.label)} target="_blank" rel="nofollow noopener noreferrer" className="font-medium text-brand hover:underline">
              Check prices
            </a>
          </p>
        ) : live ? (
          <p className="text-xs">
            <a href={live.url} target="_blank" rel="sponsored nofollow noopener noreferrer" className="font-medium text-brand hover:underline">
              Buy at {RETAILER_NAME[live.retailer] ?? live.retailer}
              {live.price ? ` · $${live.price.toFixed(2)}` : ""}
            </a>{" "}
            <span className="text-muted-foreground">
              (affiliate link: {SITE_NAME}, the site, may earn a commission
              {live.retailer === "amazon" ? ". As an Amazon Associate we earn from qualifying purchases" : ""})
            </span>
          </p>
        ) : null}
        {!preview && regimenId !== null && (
          <PlanStepControls regimenId={regimenId} stepKey={s.key} hidden={!!st?.hidden} done={!!st?.doneAt} have={!!st?.haveAt} rx={s.kind === "rx"} />
        )}
      </li>
    );
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-semibold">{version.title}</h2>
          <MdBadge credential={badgeCredential(version.clinicianCredential)} />
        </div>
        <p className="text-sm text-muted-foreground">
          From <span className="font-medium text-foreground">{version.clinicianName}</span>, {version.clinicName}
          {version.clinicPhone && (
            <>
              {" "}
              ·{" "}
              <a href={`tel:${version.clinicPhone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1 hover:underline">
                <Phone className="h-3 w-3" /> {version.clinicPhone}
              </a>
            </>
          )}
          {version.clinicWebsite && (
            <>
              {" "}
              ·{" "}
              <a href={version.clinicWebsite} target="_blank" rel="noopener noreferrer nofollow" className="hover:underline">
                Website
              </a>
            </>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          Read-only: this is exactly what your clinician wrote (plan {version.ref}). To change anything, make a personal copy, or ask your
          clinician.
        </p>
      </div>

      {version.content.stopRules.length > 0 && (
        <section className="space-y-2 rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30" aria-labelledby="stop-call">
          <h3 id="stop-call" className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-700" /> Stop and call {version.clinicName} if:
          </h3>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {version.content.stopRules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
      )}

      {sectionsOf(version.content).length > 0 && (
        <div className="rounded-2xl border bg-card p-5">
          <HandoutSections sections={sectionsOf(version.content)} />
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        {groups
          .filter((g) => g.items.length > 0)
          .map((g) => (
            <section key={g.title} className="space-y-3">
              <h3 className="flex items-center gap-2 text-xl font-semibold">
                <g.icon className="h-5 w-5 text-brand" /> {g.title}
              </h3>
              <ol className="space-y-3">{g.items.map(stepCard)}</ol>
            </section>
          ))}
      </div>

      {hidden.length > 0 && (
        <details className="rounded-2xl border bg-muted/30 p-4 text-sm">
          <summary className="cursor-pointer font-medium">Hidden steps ({hidden.length})</summary>
          <ol className="mt-3 space-y-3">{hidden.map(stepCard)}</ol>
        </details>
      )}

      {version.content.notes && (
        <section className="space-y-1 rounded-2xl border bg-card p-4">
          <h3 className="font-semibold">Notes from your clinician</h3>
          <p className="whitespace-pre-line text-sm leading-relaxed">{version.content.notes}</p>
        </section>
      )}

      {version.content.avoidCode && (
        <section className="space-y-1 rounded-2xl border bg-card p-4 text-sm">
          <h3 className="font-semibold">Your patch-test results</h3>
          <p className="text-muted-foreground">Your clinician included the ingredients to avoid. Add them to your avoid list so every product is checked.</p>
          <Link
            href={`/avoid/import?a=${encodeURIComponent(version.content.avoidCode)}`}
            className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
          >
            Review and add to my avoid list
          </Link>
        </section>
      )}

      <OrderAll order={order} otcSteps={otcProducts} rxSteps={rxSteps} products={products} gpc={gpc} />
    </div>
  );
}

function OrderAll({
  order,
  otcSteps,
  rxSteps,
  products,
  gpc,
}: {
  order: OrderPlan;
  otcSteps: HandoutStep[];
  rxSteps: HandoutStep[];
  products: Map<string, Product>;
  gpc: boolean;
}) {
  const hasLive = order.carts.length > 0 || order.singles.length > 0;
  const hasAmazon = order.carts.some((c) => c.retailer === "amazon") || order.singles.some((s) => s.retailer === "amazon");
  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5" aria-labelledby="order-all">
      <h3 id="order-all" className="flex items-center gap-2 text-lg font-semibold">
        <ShoppingBag className="h-5 w-5 text-brand" /> Get everything
      </h3>
      {otcSteps.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Over-the-counter products</p>
          {hasLive && (
            <p className="text-xs text-muted-foreground">
              Buy links are affiliate links: {SITE_NAME}, the site, may earn a commission at no cost to you. It never
              changes what your clinician chose.
              {hasAmazon && " As an Amazon Associate we earn from qualifying purchases."}
            </p>
          )}
          {order.carts.map((c) => (
            <a
              key={c.retailer}
              href={c.url}
              target="_blank"
              rel="sponsored nofollow noopener noreferrer"
              className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium hover:border-brand"
            >
              <span>
                Order all {c.items.length} at {RETAILER_NAME[c.retailer] ?? c.retailer}
              </span>
              <ExternalLink className="h-4 w-4" />
            </a>
          ))}
          {order.singles.length > 0 && (
            <ul className="space-y-1 text-sm">
              {order.singles.map((s) => (
                <li key={s.item.productId}>
                  <a href={s.url} target="_blank" rel="sponsored nofollow noopener noreferrer" className="text-brand hover:underline">
                    {s.item.name} at {RETAILER_NAME[s.retailer] ?? s.retailer}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {order.unmatched.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {hasLive ? "Not available through our partners yet; find these at:" : "Find these at any store, or search:"}
              </p>
              <ul className="space-y-2 text-sm">
                {order.unmatched.map((it) => {
                  const p = products.get(it.productId);
                  // Wrapped through Sovrn when SOVRN_SITE_API_KEY is set; never for an Rx row.
                  const brand = p?.sourceUrl ? outboundLink(p.sourceUrl, { placement: "plan", rel: "nofollow noopener noreferrer", isRx: p.isRx, gpc }) : null;
                  return (
                    <li key={it.productId} className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-medium">{it.name}</span>
                      {brand && (
                        <a href={brand.href} target="_blank" rel={brand.rel} className="text-xs text-brand hover:underline">
                          brand site
                        </a>
                      )}
                      {findItAt(it.name).map((f) => {
                        const link = outboundLink(f.url, { placement: "plan", rel: "nofollow noopener noreferrer", isRx: p?.isRx, gpc });
                        return (
                          <a key={f.retailer} href={link.href} target="_blank" rel={link.rel} className="text-xs text-brand hover:underline">
                            {f.retailer}
                          </a>
                        );
                      })}
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-muted-foreground">
                {sovrnSiteKey()
                  ? `Store searches and brand pages; these may be affiliate links, so ${SITE_NAME}, the site, may earn a commission. Any equivalent product your clinician named works.`
                  : "Plain store searches, not affiliate links. Any equivalent product your clinician named works."}
              </p>
            </div>
          )}
        </div>
      )}
      {rxSteps.length > 0 && (
        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">Prescriptions</p>
          <p className="text-sm text-muted-foreground">
            Your clinician sends these to your pharmacy; they can&apos;t be ordered here. Prices vary a lot by pharmacy, so it&apos;s worth
            comparing before you fill them.
          </p>
          <ul className="space-y-1 text-sm">
            {rxSteps.map((s) => {
              const p = s.productId ? products.get(s.productId) : undefined;
              const generic = p?.genericName ?? s.productName ?? s.label;
              const partner = rxFulfillmentLink(generic);
              return (
                <li key={s.key} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium">{s.productName ?? s.label}</span>
                  <a href={rxPriceCheckUrl(generic)} target="_blank" rel="nofollow noopener noreferrer" className="text-xs text-brand hover:underline">
                    Check prices
                  </a>
                  {partner && (
                    <a href={partner.url} target="_blank" rel="sponsored noopener noreferrer" className="text-xs text-brand hover:underline">
                      {partner.name} ({partner.disclosure})
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted-foreground">Price checks are plain GoodRx searches, not affiliate links.</p>
        </div>
      )}
    </section>
  );
}

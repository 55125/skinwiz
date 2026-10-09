import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ADMIN_COOKIE, adminPassword, isAdminCookie, passwordWarning } from "@/lib/admin-auth";
import {
  RANGES,
  catalogReport,
  clinicianReport,
  communityReport,
  errorReport,
  healthReport,
  parseRange,
  trafficReport,
  type Count,
  type DayPoint,
  type Kpi,
} from "@/lib/analytics/report";
import { FEATURES } from "@/lib/feature-flags";
import { openForReview } from "@/lib/review-mode";
import { livePricesEnabled, sovrnSiteKey } from "@/lib/prices/config";

// The owner's dashboard. Not linked from anywhere on the site, kept out of
// search engines (noindex here and an X-Robots-Tag header in next.config),
// and behind ADMIN_PASSWORD (lib/admin-auth.ts). Deliberately not listed in
// robots.txt, which anyone can read. Read-only: nothing here changes data.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

const nf = new Intl.NumberFormat("en-US");
const fmt = (n: number) => nf.format(n);

function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

function ago(iso: string | null, now: Date): string {
  if (!iso) return "never";
  const mins = Math.round((now.getTime() - Date.parse(iso)) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 48 * 60) return `${Math.round(mins / 60)} h ago`;
  return `${Math.round(mins / 1440)} days ago`;
}

function duration(s: number): string {
  if (s < 3600) return `${Math.round(s / 60)} min`;
  if (s < 86_400) return `${(s / 3600).toFixed(1)} h`;
  return `${(s / 86_400).toFixed(1)} days`;
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ days?: string; e?: string; locked?: string }> }) {
  if (!adminPassword()) notFound();
  const params = await searchParams;
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isAdminCookie(token)) return <SignIn wrong={params.e === "1"} lockedMinutes={Number(params.locked) || 0} />;

  const now = new Date();
  const days = parseRange(params.days);
  const traffic = trafficReport(now, days);
  const clinic = clinicianReport(now, days);
  const community = communityReport(now, days);
  const catalog = catalogReport(now);
  const errors = errorReport(now, days);
  const health = healthReport();
  const warning = passwordWarning(adminPassword()!);

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin</p>
          <h1 className="text-3xl font-semibold">Site dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {traffic.from} to {traffic.to} (UTC), compared with the {days} days before.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label="Date range" className="flex rounded-full border p-0.5 text-sm">
            {RANGES.map((r) => (
              <Link
                key={r}
                href={`/admin?days=${r}`}
                aria-current={r === days ? "page" : undefined}
                className={`rounded-full px-3 py-1 ${r === days ? "bg-foreground text-background" : "hover:bg-muted"}`}
              >
                {r === 365 ? "1 year" : `${r} days`}
              </Link>
            ))}
          </nav>
          <a href={`/api/admin/export?days=${days}`} className="rounded-full border px-3 py-1 text-sm hover:bg-muted">
            Download CSV
          </a>
          <form action="/api/admin/logout" method="post">
            <button type="submit" className="rounded-full border px-3 py-1 text-sm hover:bg-muted">
              Sign out
            </button>
          </form>
        </div>
      </header>

      {warning && <Notice tone="warn">{warning}</Notice>}
      {openForReview() && (
        <Notice tone="warn">OPEN_FOR_REVIEW is on: bot limits are off and SEO crawlers are allowed. Turn it off once affiliate reviews are decided.</Notice>
      )}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {traffic.kpis.map((k) => (
          <KpiTile key={k.label} kpi={k} />
        ))}
      </section>

      <Section title="Visitors per day" note="A visitor is counted once per day: the anonymous id changes every day by design, so the same person on two days counts twice.">
        <DailyChart series={traffic.series} />
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Top pages" note="Pageviews, with unique daily visitors in grey.">
          <Bars rows={traffic.topPages} extraLabel="visitors" />
        </Section>
        <div className="space-y-6">
          <Section title="Where visitors come from" note={`${fmt(traffic.direct)} pageviews had no referrer (typed, bookmarked, apps, or browsers that hide it).`}>
            <Bars rows={traffic.referrers} empty="No referring sites yet." />
          </Section>
          <Section title="Campaigns" note="From utm_source / utm_medium / utm_campaign (or ?ref=) on landing links.">
            <Bars rows={traffic.campaigns} empty="No tagged links used yet." />
          </Section>
          <Section title="Devices" note="Unique daily visitors.">
            <Bars rows={traffic.devices} />
          </Section>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Retailer clicks" note="Outbound clicks by destination. Sovrn-wrapped links are counted under the merchant.">
          <Bars rows={traffic.outboundByRetailer} empty="No outbound clicks yet." />
        </Section>
        <Section title="Most-clicked products" note="Outbound clicks from product pages.">
          <Bars rows={traffic.outboundByProduct} empty="No product-page clicks yet." />
          {traffic.outboundByPage.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Clicks from other pages</p>
              <Bars rows={traffic.outboundByPage} />
            </div>
          )}
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Searches" note="Most frequent terms, with the latest result count in grey. Terms that look like an email or phone number are never stored.">
          <Bars rows={traffic.searchTerms} extraLabel="results" empty="No searches yet." />
        </Section>
        <Section title="Searches with no results" note="Catalog gaps and spellings worth adding as aliases.">
          <Bars rows={traffic.zeroResultSearches} empty="None. Every search found something." />
        </Section>
      </div>

      <Section title="Clinician tools" note="Counts only. No patient information exists in these tables.">
        <div className="grid gap-6 lg:grid-cols-2">
          <StatGrid
            items={[
              ["Clinician accounts", clinic.clinicians],
              ["NPI verified", clinic.verified],
              ["Dermatology", clinic.dermatology],
              ["Handouts", clinic.handouts, `${fmt(clinic.handoutsNew)} new in range`],
              ["Handout versions", clinic.versions],
              ["Printouts / QR codes", clinic.printed, `${fmt(clinic.printedNew)} new in range`],
              ["QR / link opens", clinic.qrOpens, `${fmt(clinic.qrOpened)} printouts opened`],
              ["Plans saved by patients", clinic.claimed],
              ["Practice starter lists", clinic.savedLists],
            ]}
          />
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Tool actions in range (prints, copies, emails)</p>
              <Bars rows={traffic.toolEvents} empty="No tool actions yet." />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Clinician page views in range (unique daily visitors in grey)</p>
              <Bars rows={traffic.clinicianPages} extraLabel="visitors" empty="No clinician page views yet." />
            </div>
          </div>
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={`Clinician applications (${fmt(clinic.applicationsTotal)})`} note="From the For clinicians page, newest first.">
          {clinic.applications.length === 0 ? (
            <Empty>No applications yet.</Empty>
          ) : (
            <ul className="divide-y text-sm">
              {clinic.applications.map((a) => (
                <li key={a.id} className="py-2">
                  <p className="font-medium">
                    {a.name} {a.credential && <span className="font-normal text-muted-foreground">· {a.credential}</span>}
                  </p>
                  <p className="text-muted-foreground">
                    <a className="underline" href={`mailto:${a.email}`}>{a.email}</a> · {a.created.slice(0, 10)}
                  </p>
                  {a.message && <p className="mt-1 line-clamp-3 text-muted-foreground">{a.message}</p>}
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Clinicians awaiting NPI verification" note="NPPES was unavailable or the record didn't match when they signed up.">
          {clinic.pending.length === 0 ? (
            <Empty>Nobody waiting.</Empty>
          ) : (
            <ul className="divide-y text-sm">
              {clinic.pending.map((c) => (
                <li key={c.npi} className="py-2">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-muted-foreground">
                    NPI {c.npi} · {c.clinic} · {c.created.slice(0, 10)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section title="People and community">
        <div className="grid gap-6 lg:grid-cols-2">
          <StatGrid
            items={[
              ["Email accounts", community.people],
              ["Browsers with a shelf", community.shelves],
              ["Shelf items", community.shelfItems],
              ["Outcome reports", community.outcomes],
              ["Check-in answers", community.checkinAnswers, `${fmt(community.checkinAnswersNew)} in range`],
              ["Check-ins sent", community.checkinsSent, `${fmt(community.checkinsDue)} scheduled`],
              ["Check-ins failed", community.checkinsFailed],
              ["Regimens", community.regimens],
              ["Routines", community.routines, `${fmt(community.votes)} votes`],
              ["Recall alerts sent", community.recallAlertsSent],
            ]}
          />
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Reported routines (moderation queue)</p>
            {community.reported.length === 0 ? (
              <Empty>No reports.</Empty>
            ) : (
              <ul className="divide-y text-sm">
                {community.reported.map((r) => (
                  <li key={r.id} className="py-2">
                    <Link href={`/routines/${r.id}`} className="font-medium underline">
                      {r.title}
                    </Link>{" "}
                    <span className="text-muted-foreground">
                      · {r.reports} report{r.reports === 1 ? "" : "s"} · last {r.last.slice(0, 10)}
                    </span>
                    {r.reasons && <p className="line-clamp-2 text-muted-foreground">{r.reasons}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Section>

      <Section title="Catalog and prices">
        <div className="grid gap-6 lg:grid-cols-2">
          <StatGrid
            items={[
              ["Products", catalog.products, `${fmt(catalog.otc)} OTC · ${fmt(catalog.rx)} Rx`],
              ["OTC with a photo", catalog.withImage, catalog.otc ? `${Math.round((catalog.withImage / catalog.otc) * 100)}% of OTC` : undefined],
              ["Active ingredients", catalog.actives],
              ["Ingredients", catalog.ingredients],
              ["Manual affiliate links", catalog.manualLinks, `${fmt(catalog.manualLinkProducts)} products`],
              ["Products with a fresh price", catalog.pricedProducts, "checked in the last 72 h"],
              ["Price quotes fresh / stale", catalog.quotesFresh, `${fmt(catalog.quotesStale)} stale`],
              ["FDA recalls stored", catalog.recalls, `${fmt(catalog.recallMatches)} catalog matches`],
            ]}
          />
          <div className="space-y-4 text-sm">
            <p>
              Live prices: <strong>{livePricesEnabled() ? "on" : "off"}</strong>
              {sovrnSiteKey() ? " · Sovrn link wrapping on" : " · Sovrn link wrapping off"} · last price fetched{" "}
              {ago(catalog.lastPriceFetch, now)}
            </p>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Products by data source</p>
              <Bars rows={catalog.bySource} />
            </div>
            {catalog.priceChecks.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Price lookups by result</p>
                <Bars rows={catalog.priceChecks} />
              </div>
            )}
            {catalog.images.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">DailyMed photo sync</p>
                <Bars rows={catalog.images} />
              </div>
            )}
          </div>
        </div>
      </Section>

      <Section title="Errors" note={`Server errors are kept 90 days. Browser-side crashes in range: ${fmt(traffic.clientErrors)}.`}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <StatGrid
              items={[
                ["Server errors in range", errors.total],
                ["Last 24 hours", errors.last24h],
              ]}
            />
            <Bars rows={errors.byRoute} empty="No server errors in range." />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Most recent</p>
            {errors.recent.length === 0 ? (
              <Empty>None recorded.</Empty>
            ) : (
              <ul className="divide-y text-xs">
                {errors.recent.map((e, i) => (
                  <li key={i} className="py-2">
                    <p className="font-mono">
                      {e.method} {e.path}
                    </p>
                    <p className="text-muted-foreground">
                      {ago(e.at, now)} · {e.message}
                      {e.digest ? ` · ${e.digest}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Section>

      <Section title="Site health">
        <div className="grid gap-6 lg:grid-cols-2">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <HealthRow label="Database" ok={health.dbOk} value={`${health.dbOk ? "answering" : "NOT answering"} · ${bytes(health.dbSize)}`} />
            <HealthRow
              label="Persistent volume"
              ok={health.onVolume}
              value={health.onVolume ? "DATABASE_PATH set" : "DATABASE_PATH unset: data is lost on redeploy"}
            />
            <HealthRow
              label="Latest backup"
              ok={health.backups.length > 0}
              value={health.backups[0] ? `${ago(health.backups[0].at, now)} · ${health.backups.length} kept (same volume, not off-site)` : "none"}
            />
            <HealthRow label="Uptime" value={`${duration(health.uptimeSeconds)} since last restart`} />
            <HealthRow label="Memory" value={`${bytes(health.rssBytes)} resident · ${bytes(health.heapBytes)} heap`} />
            <HealthRow label="Runtime" value={`Node ${health.node}${health.commit ? ` · commit ${health.commit}` : ""}`} />
            <HealthRow label="Stats rows" value={`${fmt(health.analyticsRows)} (kept ${health.retentionDays} days)`} />
          </dl>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <HealthRow label="APP_SECRET" ok={(process.env.APP_SECRET?.length ?? 0) >= 32} value={(process.env.APP_SECRET?.length ?? 0) >= 32 ? "set" : "missing"} />
            <HealthRow label="CRON_SECRET" ok={(process.env.CRON_SECRET?.length ?? 0) >= 24} value={(process.env.CRON_SECRET?.length ?? 0) >= 24 ? "set" : "missing: the hourly job can't run"} />
            <HealthRow label="Email (Resend)" ok={Boolean(process.env.RESEND_API_KEY)} value={process.env.RESEND_API_KEY ? "configured" : "not configured: emails go to the log"} />
            <HealthRow label="Anti-scrape" ok={process.env.ANTI_SCRAPE !== "off" && !openForReview()} value={process.env.ANTI_SCRAPE === "off" ? "off" : openForReview() ? "paused (OPEN_FOR_REVIEW)" : "on"} />
            <HealthRow
              label="Feature flags"
              value={Object.entries({
                pregnancy: FEATURES.PREGNANCY_MODE,
                escalation: FEATURES.ESCALATION_GUIDANCE,
                rx: FEATURES.RX_CATALOG,
                handouts: FEATURES.HANDOUTS,
              })
                .map(([k, v]) => `${k} ${v ? "on" : "off"}`)
                .join(" · ")}
            />
            {health.jobs.map((j) => (
              <HealthRow key={j.key} label={j.key} value={`${j.value.slice(0, 60)} · ${ago(j.updatedAt, now)}`} />
            ))}
          </dl>
        </div>
      </Section>

      <p className="text-xs text-muted-foreground">
        Statistics are first-party and cookieless: no raw IP addresses are stored, and browsers sending Global Privacy Control or Do Not
        Track, bots, and your own admin visits are not counted, so these numbers run a little under the true totals.
      </p>
    </div>
  );
}

function SignIn({ wrong, lockedMinutes }: { wrong: boolean; lockedMinutes: number }) {
  return (
    <div className="mx-auto max-w-sm space-y-4 px-4 py-20">
      <h1 className="text-2xl font-semibold">Admin sign-in</h1>
      {lockedMinutes > 0 ? (
        <Notice tone="warn">Too many wrong attempts. Try again in about {lockedMinutes} minute{lockedMinutes === 1 ? "" : "s"}.</Notice>
      ) : wrong ? (
        <Notice tone="warn">That password is not right.</Notice>
      ) : null}
      <form action="/api/admin/login" method="post" className="space-y-3">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Password</span>
          <input
            type="password"
            name="password"
            required
            autoFocus
            autoComplete="current-password"
            maxLength={200}
            className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </label>
        <button type="submit" className="h-10 w-full rounded-full bg-foreground text-sm font-medium text-background hover:opacity-90">
          Sign in
        </button>
      </form>
    </div>
  );
}

function Notice({ tone, children }: { tone: "warn"; children: React.ReactNode }) {
  return (
    <p
      role={tone === "warn" ? "alert" : undefined}
      className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
    >
      {children}
    </p>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border bg-card p-5">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function KpiTile({ kpi }: { kpi: Kpi }) {
  const c = kpi.change;
  return (
    <div className="rounded-2xl border bg-card p-4" title={kpi.hint}>
      <p className="text-xs text-muted-foreground">{kpi.label}</p>
      <p className="text-2xl font-semibold tabular-nums">{fmt(kpi.value)}</p>
      <p className="text-xs tabular-nums text-muted-foreground">
        {c === null ? "no earlier data" : `${c > 0 ? "▲ +" : c < 0 ? "▼ " : ""}${c}% vs previous`}
      </p>
    </div>
  );
}

function StatGrid({ items }: { items: [string, number, string?][] }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map(([label, n, sub]) => (
        <div key={label} className="rounded-xl bg-muted/50 p-3">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="text-xl font-semibold tabular-nums">{fmt(n)}</dd>
          {sub && <dd className="text-xs text-muted-foreground">{sub}</dd>}
        </div>
      ))}
    </dl>
  );
}

function HealthRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <>
      <dt className="font-medium">
        {ok === undefined ? "" : ok ? "✓ " : "✗ "}
        {label}
      </dt>
      <dd className={ok === false ? "text-red-700 dark:text-red-400" : "text-muted-foreground"}>{value}</dd>
    </>
  );
}

// Horizontal bars: one hue (the brand teal), length = count, label and
// number in text colors. A table in all but name, so it reads without color.
function Bars({ rows, extraLabel, empty = "No data in this range." }: { rows: Count[]; extraLabel?: string; empty?: string }) {
  if (rows.length === 0) return <Empty>{empty}</Empty>;
  const max = Math.max(...rows.map((r) => r.n), 1);
  return (
    <ol className="space-y-1 text-sm">
      {rows.map((r) => (
        <li key={r.label} className="relative grid grid-cols-[1fr_auto] items-center gap-3 rounded px-2 py-1" title={`${r.label}: ${fmt(r.n)}`}>
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 rounded bg-brand-soft"
            style={{ width: `${Math.max(2, (r.n / max) * 100)}%` }}
          />
          <span className="relative truncate">{r.label}</span>
          <span className="relative tabular-nums">
            {fmt(r.n)}
            {extraLabel && r.extra !== undefined && (
              <span className="ml-2 text-xs text-muted-foreground">
                {fmt(r.extra)} {extraLabel}
              </span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}

// Daily visitors as columns, one series, so no legend; each column's
// tooltip gives the day, visitors and pageviews. Y axis: 0 and the max.
function DailyChart({ series }: { series: DayPoint[] }) {
  const max = Math.max(...series.map((p) => p.visitors), 1);
  const W = 720;
  const H = 180;
  const gap = series.length > 120 ? 0.5 : 2;
  const bw = W / series.length;
  const total = series.reduce((a, p) => a + p.visitors, 0);
  if (total === 0) return <Empty>No visits recorded in this range yet. Counting starts when this version is deployed.</Empty>;
  const labelEvery = Math.ceil(series.length / 8);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H + 22}`} className="h-auto w-full" role="img" aria-label={`Daily visitors, peak ${max}`}>
        <line x1={0} x2={W} y1={H} y2={H} className="stroke-border" strokeWidth={1} />
        <text x={2} y={11} className="fill-muted-foreground text-[11px]">
          {fmt(max)}
        </text>
        {series.map((p, i) => {
          const h = (p.visitors / max) * (H - 18);
          return (
            <g key={p.day}>
              <title>{`${p.day}: ${fmt(p.visitors)} visitors, ${fmt(p.pageviews)} pageviews`}</title>
              {/* full-height hit target, larger than the mark */}
              <rect x={i * bw} y={0} width={bw} height={H} fill="transparent" />
              {p.visitors > 0 && (
                <rect
                  x={i * bw + gap / 2}
                  y={H - h}
                  width={Math.max(bw - gap, 0.5)}
                  height={h}
                  rx={Math.min(4, bw / 3)}
                  className="fill-brand"
                />
              )}
              {i % labelEvery === 0 && (
                <text x={i * bw + bw / 2} y={H + 15} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                  {p.day.slice(5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-muted-foreground">Show as a table</summary>
        <table className="mt-2 w-full max-w-sm tabular-nums">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="font-medium">Day</th>
              <th className="text-right font-medium">Visitors</th>
              <th className="text-right font-medium">Pageviews</th>
            </tr>
          </thead>
          <tbody>
            {[...series].reverse().map((p) => (
              <tr key={p.day}>
                <td>{p.day}</td>
                <td className="text-right">{fmt(p.visitors)}</td>
                <td className="text-right">{fmt(p.pageviews)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

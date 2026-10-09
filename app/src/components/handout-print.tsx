"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Mail, Printer, QrCode as QrCodeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrCode } from "@/components/qr-code";
import { sectionsOf, type HandoutContent, type HandoutStep } from "@/lib/handout-types";
import { SITE_NAME } from "@/lib/brand";
import { decodeImportCode } from "@/lib/avoid-import";
import { importItemName } from "@/db/patch-test-series";
import { HandoutSections } from "@/components/handout-sections";

export type PrintableVersion = {
  handoutId: string;
  version: number;
  ref: string;
  title: string;
  clinicName: string;
  clinicianName: string;
  clinicPhone: string | null;
  clinicWebsite: string | null;
  content: HandoutContent;
};

type Link = { url: string; shortUrl: string };
type Mode = "print" | "qr" | "email" | "copy";

/** The message the clinic's own email app opens with. No patient details: the clinic adds the address. */
export function handoutEmail(v: Pick<PrintableVersion, "title" | "clinicName" | "clinicianName" | "clinicPhone">, url: string) {
  const subject = `${v.title} from ${v.clinicName}`;
  const body = [
    "Hello,",
    "",
    `${v.clinicianName} at ${v.clinicName} shared a handout with you: "${v.title}".`,
    "",
    `Open it here to read it and save it privately on your phone (no account needed):`,
    url,
    "",
    "The first device to save this link keeps it, so please don't forward it.",
    v.clinicPhone ? `Questions? Call us at ${v.clinicPhone}.` : "Questions? Contact our office.",
  ].join("\n");
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// Give a handout to one patient: print it, show its QR in the room, open the
// clinic's own email app with the link, or copy the link. Each action asks
// the server for a NEW instance (its own one-time claim token), so two
// patients never share a link. The patient's name is typed here for the
// paper only, and their email address is typed into the clinic's own email
// app: neither is ever sent to us or put in the link.
// The allergen names behind a handout's patch-test code, so whoever prints it
// can see whose list it is (a handout version can be printed many times).
function avoidNames(code: string | null): string[] {
  const d = decodeImportCode(code);
  return d.ok ? [...d.avoidIds, ...d.notOnLabel].map((id) => importItemName(id) ?? id) : [];
}

export function HandoutPrint({ v }: { v: PrintableVersion }) {
  const [patient, setPatient] = useState("");
  const [link, setLink] = useState<Link | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [printNow, setPrintNow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [today] = useState(() => new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));

  useEffect(() => {
    if (!printNow || !link) return;
    // Let the portal paint the new QR before the print dialog snapshots the page.
    const t = setTimeout(() => {
      window.print();
      setPrintNow(false);
    }, 150);
    return () => clearTimeout(t);
  }, [printNow, link]);

  async function give(next: Mode) {
    setBusy(true);
    setError(null);
    setCopied(false);
    const res = await fetch("/api/clinicians/instances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handoutId: v.handoutId, version: v.version }),
    }).catch(() => null);
    const body = ((await res?.json().catch(() => null)) ?? {}) as { url?: string; shortUrl?: string; error?: string };
    setBusy(false);
    if (!res?.ok || !body.url || !body.shortUrl) {
      setError(body.error ?? "Couldn't create the link. Please try again.");
      return;
    }
    const fresh = { url: body.url, shortUrl: body.shortUrl };
    setLink(fresh);
    setMode(next);
    if (next === "print") setPrintNow(true);
    if (next === "email") window.location.href = handoutEmail(v, fresh.url);
    if (next === "copy") {
      await navigator.clipboard?.writeText(fresh.url).catch(() => {});
      setCopied(true);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-4">
      <h2 className="text-base font-semibold">Give to a patient</h2>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Patient name (printed only)</span>
        <Input value={patient} onChange={(e) => setPatient(e.target.value)} autoComplete="off" data-1p-ignore data-lpignore="true" />
        <span className="block text-xs text-muted-foreground">
          Stays in this browser tab. It is never sent to us and is not part of the link or QR code.
        </span>
      </label>
      {v.content.avoidCode && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          Includes a patch-test avoid list: {avoidNames(v.content.avoidCode).join(", ")}. Only give it to the patient these results belong to.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" onClick={() => give("print")} disabled={busy} className="rounded-full">
          <Printer className="h-4 w-4" /> Print
        </Button>
        <Button type="button" variant="outline" onClick={() => give("qr")} disabled={busy} className="rounded-full">
          <QrCodeIcon className="h-4 w-4" /> Show QR
        </Button>
        <Button type="button" variant="outline" onClick={() => give("email")} disabled={busy} className="rounded-full">
          <Mail className="h-4 w-4" /> Email
        </Button>
        <Button type="button" variant="outline" onClick={() => give("copy")} disabled={busy} className="rounded-full">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Email opens your own email app with the link filled in; you add the patient&apos;s address there, so it never reaches us. Each
        button makes a new single-patient link.
      </p>
      {link && mode && mode !== "print" && (
        <div className="space-y-2 text-center">
          <QrCode value={link.url} className="mx-auto h-40 w-40" title="QR code for this patient's link" />
          <p className="break-all font-mono text-[11px] text-muted-foreground">{link.shortUrl}</p>
          <p className="text-xs text-muted-foreground">
            {mode === "qr" ? "Have the patient scan this with their phone camera. " : ""}The first phone to save it owns it.
          </p>
        </div>
      )}
      {link && mode === "print" && <p className="text-xs text-muted-foreground">Printed with its own QR code. Print again for another patient.</p>}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {link && createPortal(<PrintSheet v={v} patient={patient.trim()} link={link} date={today} />, document.body)}
    </div>
  );
}

const ORDER: [string, (s: HandoutStep) => boolean][] = [
  ["Morning", (s) => s.slot === "am" || s.slot === "both"],
  ["Night", (s) => s.slot === "pm" || s.slot === "both"],
  ["As directed", (s) => s.slot === "as-directed"],
];

// Same print approach as the patch-test sheet: rendered into <body> and
// shown only when printing.
function PrintSheet({ v, patient, link, date }: { v: PrintableVersion; patient: string; link: Link; date: string }) {
  return (
    <div className="pt-print-sheet" aria-hidden>
      <style>{`
        .pt-print-sheet { display: none; }
        @media print {
          @page { size: letter; margin: 11mm; }
          body > *:not(.pt-print-sheet) { display: none !important; }
          body { background: #fff !important; }
          .pt-print-sheet { display: block; color: #000; background: #fff; font-size: 9.5pt; line-height: 1.3; }
          .pt-print-sheet section, .pt-print-sheet li { break-inside: avoid; }
          .pt-print-sheet .pt-qr { width: 38mm; height: 38mm; }
        }
      `}</style>
      <div style={{ display: "flex", gap: "6mm", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "9pt", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>{v.clinicName}</p>
          <h1 style={{ fontSize: "17pt", fontWeight: 600, margin: "1mm 0 2mm" }}>{v.title}</h1>
          <table style={{ fontSize: "9.5pt", borderCollapse: "collapse" }}>
            <tbody>
              {patient && <Row label="For" value={patient} />}
              <Row label="From" value={v.clinicianName} />
              <Row label="Date" value={date} />
              {v.clinicPhone && <Row label="Questions" value={v.clinicPhone} />}
            </tbody>
          </table>
        </div>
        <div style={{ width: "40mm", textAlign: "center" }}>
          <QrCode value={link.url} className="pt-qr" title="QR code" />
          <p style={{ fontSize: "7.5pt", margin: "1mm 0 0" }}>
            Scan to save this {v.content.steps.length > 0 ? "plan" : "handout"} privately on your phone. No account needed.
          </p>
        </div>
      </div>

      {sectionsOf(v.content).length > 0 && (
        <div style={{ marginTop: "4mm" }}>
          <HandoutSections sections={sectionsOf(v.content)} tone="print" />
        </div>
      )}

      {ORDER.map(([title, test]) => {
        const steps = v.content.steps.filter(test);
        if (steps.length === 0) return null;
        return (
          <section key={title} style={{ marginTop: "4mm" }}>
            <h2 style={{ fontSize: "11.5pt", fontWeight: 600, margin: "0 0 1.5mm", borderBottom: "1.2px solid #000" }}>{title}</h2>
            <ol style={{ margin: 0, paddingLeft: "5mm", listStyle: "decimal" }}>
              {steps.map((s) => (
                <li key={`${title}-${s.key}`} style={{ marginBottom: "1.5mm" }}>
                  <strong>{s.label}</strong>
                  {s.productName && <>: {s.productName}</>}
                  {s.kind === "rx" && <em> (prescription)</em>}
                  {s.slot === "both" && title === "Morning" ? <span> (also at night)</span> : null}
                  {s.directions && <div>{s.directions}</div>}
                </li>
              ))}
            </ol>
          </section>
        );
      })}

      {v.content.stopRules.length > 0 && (
        <section style={{ marginTop: "4mm", border: "1.5px solid #000", borderRadius: "2mm", padding: "2mm 3mm" }}>
          <h2 style={{ fontSize: "11pt", fontWeight: 600, margin: "0 0 1mm" }}>
            Stop and call {v.clinicName}
            {v.clinicPhone ? ` (${v.clinicPhone})` : ""} if:
          </h2>
          <ul style={{ margin: 0, paddingLeft: "5mm", listStyle: "disc" }}>
            {v.content.stopRules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
      )}
      {v.content.notes && <p style={{ marginTop: "3mm", whiteSpace: "pre-line" }}>{v.content.notes}</p>}
      {v.content.avoidCode && (
        <p style={{ marginTop: "2mm" }}>
          Your patch-test avoid list is included ({avoidNames(v.content.avoidCode).join(", ")}): scan the QR code to add it.
        </p>
      )}

      <div style={{ marginTop: "5mm", paddingTop: "2mm", borderTop: "0.5px solid #999", fontSize: "7.5pt" }}>
        <p style={{ margin: 0, wordBreak: "break-all", fontFamily: "ui-monospace, monospace" }}>{link.shortUrl}</p>
        <p style={{ margin: "1mm 0 0" }}>
          Plan {v.ref} · Saved plans are private to you on {SITE_NAME}; the link and QR don&apos;t contain your
          name. Follow your clinician&apos;s directions and each product&apos;s label. Prescriptions are sent to your pharmacy by your clinician.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ padding: "0.3mm 4mm 0.3mm 0", color: "#333" }}>{label}</td>
      <td style={{ padding: "0.3mm 0", fontWeight: 600 }}>{value}</td>
    </tr>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrCode } from "@/components/qr-code";
import type { HandoutContent, HandoutStep } from "@/lib/handout-types";
import { SITE_NAME } from "@/lib/brand";

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

// Print a handout for one patient. Each print asks the server for a NEW
// printout instance (its own one-time claim token for the QR), so two
// patients never share a link. The patient's name is typed here for the
// paper only: it is never sent to the server and isn't in the link or QR.
export function HandoutPrint({ v }: { v: PrintableVersion }) {
  const [patient, setPatient] = useState("");
  const [link, setLink] = useState<{ url: string; shortUrl: string } | null>(null);
  const [printNow, setPrintNow] = useState(false);
  const [busy, setBusy] = useState(false);
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

  async function newPrintout() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/clinicians/instances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handoutId: v.handoutId, version: v.version }),
    }).catch(() => null);
    const body = ((await res?.json().catch(() => null)) ?? {}) as { url?: string; shortUrl?: string; error?: string };
    setBusy(false);
    if (!res?.ok || !body.url || !body.shortUrl) {
      setError(body.error ?? "Couldn't create the printout. Please try again.");
      return;
    }
    setLink({ url: body.url, shortUrl: body.shortUrl });
    setPrintNow(true);
  }

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-4">
      <h2 className="text-base font-semibold">Print for a patient</h2>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Patient name (printed only)</span>
        <Input value={patient} onChange={(e) => setPatient(e.target.value)} autoComplete="off" data-1p-ignore data-lpignore="true" />
        <span className="block text-xs text-muted-foreground">
          Stays in this browser tab. It is never sent to us and is not part of the link or QR code.
        </span>
      </label>
      <Button type="button" onClick={newPrintout} disabled={busy} className="w-full rounded-full">
        <Printer className="h-4 w-4" /> {busy ? "Preparing…" : link ? "Print another copy (new QR)" : "Print handout"}
      </Button>
      {link && (
        <div className="space-y-2 text-center">
          <QrCode value={link.url} className="mx-auto h-36 w-36" title="QR code for this printout" />
          <p className="text-xs text-muted-foreground">
            This QR belongs to the copy just printed: the first phone to save it owns the plan. Print again for another patient.
          </p>
        </div>
      )}
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
function PrintSheet({ v, patient, link, date }: { v: PrintableVersion; patient: string; link: { url: string; shortUrl: string }; date: string }) {
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
          <p style={{ fontSize: "7.5pt", margin: "1mm 0 0" }}>Scan to save this plan privately on your phone. No account needed.</p>
        </div>
      </div>

      {ORDER.map(([title, test]) => {
        const steps = v.content.steps.filter(test);
        if (steps.length === 0) return null;
        return (
          <section key={title} style={{ marginTop: "4mm" }}>
            <h2 style={{ fontSize: "11.5pt", fontWeight: 600, margin: "0 0 1.5mm", borderBottom: "1.2px solid #000" }}>{title}</h2>
            <ol style={{ margin: 0, paddingLeft: "5mm" }}>
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
          <ul style={{ margin: 0, paddingLeft: "5mm" }}>
            {v.content.stopRules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
      )}
      {v.content.notes && <p style={{ marginTop: "3mm", whiteSpace: "pre-line" }}>{v.content.notes}</p>}
      {v.content.avoidCode && <p style={{ marginTop: "2mm" }}>Your patch-test avoid list is included: scan the QR code to add it.</p>}

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

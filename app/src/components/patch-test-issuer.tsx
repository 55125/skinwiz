"use client";

import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, ExternalLink, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PatchTestChecklist } from "@/components/patch-test-checklist";
import { QrCode } from "@/components/qr-code";
import { resolveAllergenId } from "@/db/contact-allergens";
import { getNotOnLabel, importItemName, watchForNames } from "@/db/patch-test-series";
import { MAX_NOTE_LENGTH, buildImportPath, cleanDetails } from "@/lib/avoid-import";
import { SITE_NAME } from "@/lib/brand";

const noop = () => () => {};
export const useOrigin = () =>
  useSyncExternalStore(
    noop,
    () => window.location.origin,
    () => "",
  );

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// The clinician's side: tick the positives, add optional details, print a
// one-page sheet with a QR code that loads the list into the patient's
// avoid list. Everything stays in this tab; the patient's name is never
// part of the link.
export function PatchTestIssuer({ lists = [], initialIds = [] }: { lists?: { id: string; name: string; ids: string[] }[]; initialIds?: string[] }) {
  const origin = useOrigin();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialIds));
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [patient, setPatient] = useState("");
  const [copied, setCopied] = useState(false);

  const avoidIds = [...selected].filter((id) => resolveAllergenId(id));
  const offLabel = [...selected].filter((id) => getNotOnLabel(id));
  const details = cleanDetails({ date, note });
  const path = buildImportPath(selected, details);
  const url = `${origin}${path}`;
  const ready = selected.size > 0 && origin !== "";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="space-y-3" aria-labelledby="pt-positives">
        <h2 id="pt-positives" className="text-base font-semibold">
          1. Tick the positive allergens
        </h2>
        {lists.length > 0 && (
          <label className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Add a starter list:</span>
            <select
              className="h-9 rounded-md border bg-background px-2"
              value=""
              onChange={(e) => {
                const list = lists.find((l) => l.id === e.target.value);
                if (list) setSelected((prev) => new Set([...prev, ...list.ids]));
                setCopied(false);
              }}
            >
              <option value="">Choose…</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.ids.length})
                </option>
              ))}
            </select>
          </label>
        )}
        <PatchTestChecklist
          selected={selected}
          onChange={(next) => {
            setSelected(next);
            setCopied(false);
          }}
        />
      </section>

      <aside className="space-y-5 lg:sticky lg:top-4 lg:self-start">
        <section className="space-y-3 rounded-2xl border bg-card p-4" aria-labelledby="pt-details">
          <h2 id="pt-details" className="text-base font-semibold">
            2. Optional details
          </h2>
          <Field label="Reading date">
            <div className="flex gap-2">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <Button type="button" variant="outline" onClick={() => setDate(todayLocal())}>
                Today
              </Button>
            </div>
          </Field>
          <Field label="Note to the patient" hint={`Shown on the sheet and in the link. ${note.length}/${MAX_NOTE_LENGTH}`}>
            <Textarea value={note} maxLength={MAX_NOTE_LENGTH} rows={2} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Avoid fragrance entirely for 3 months." />
          </Field>
          <Field
            label="Patient name (printed only)"
            hint="Stays in this browser tab. It is never sent to us and is not part of the link or QR code."
          >
            <Input value={patient} onChange={(e) => setPatient(e.target.value)} autoComplete="off" data-1p-ignore data-lpignore="true" />
          </Field>
        </section>

        <section className="space-y-3 rounded-2xl border bg-card p-4" aria-labelledby="pt-share">
          <h2 id="pt-share" className="text-base font-semibold">
            3. Print or share
          </h2>
          {ready ? (
            <>
              <QrCode value={url} className="mx-auto h-44 w-44" title="QR code for the patient's import link" />
              <p className="text-center text-xs text-muted-foreground">
                {avoidIds.length} to avoid{offLabel.length > 0 ? ` · ${offLabel.length} not on labels` : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => window.print()} className="flex-1 rounded-full">
                  <Printer className="h-4 w-4" /> Print sheet
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={async () => {
                    await navigator.clipboard?.writeText(url).catch(() => {});
                    setCopied(true);
                  }}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy link"}
                </Button>
                <a
                  href={path}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1 self-center text-xs font-medium text-brand hover:underline"
                >
                  Preview <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Tick at least one allergen to make the QR code and sheet.</p>
          )}
        </section>
      </aside>

      {ready &&
        createPortal(
          <PrintSheet url={url} ids={avoidIds} offLabel={offLabel} patient={patient.trim()} {...details} />,
          document.body,
        )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs leading-snug text-muted-foreground">{hint}</span>}
    </label>
  );
}

// Rendered straight into <body> and shown only when printing; the print CSS
// hides every other child of <body>.
export function PrintSheet({
  url,
  ids,
  offLabel,
  patient,
  eyebrow = "Patch-test results",
  date,
  note,
}: {
  url: string;
  ids: string[];
  offLabel: string[];
  patient: string;
  eyebrow?: string;
  date?: string;
  note?: string;
}) {
  const shortUrl = url.replace(/^https?:\/\//, "");
  return (
    <div className="pt-print-sheet" aria-hidden>
      <style>{`
        .pt-print-sheet { display: none; }
        @media print {
          @page { size: letter; margin: 12mm; }
          body > *:not(.pt-print-sheet) { display: none !important; }
          body { background: #fff !important; }
          .pt-print-sheet { display: block; color: #000; background: #fff; font-size: 10pt; line-height: 1.35; }
          .pt-print-sheet table { break-inside: auto; }
          .pt-print-sheet tr { break-inside: avoid; }
        }
      `}</style>
      <div style={{ display: "flex", gap: "8mm", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "9pt", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>{eyebrow}</p>
          <h1 style={{ fontSize: "18pt", fontWeight: 600, margin: "1mm 0 3mm" }}>Ingredients to avoid</h1>
          <table style={{ fontSize: "10pt", borderCollapse: "collapse" }}>
            <tbody>
              {patient && <InfoRow label="Patient" value={patient} />}
              {date && <InfoRow label="Read on" value={formatDate(date)} />}
            </tbody>
          </table>
          {note && <p style={{ margin: "3mm 0 0", padding: "2mm 3mm", border: "1px solid #000", borderRadius: "2mm" }}>{note}</p>}
        </div>
        <div style={{ width: "44mm", textAlign: "center" }}>
          <QrCode value={url} className="pt-qr" title="QR code" />
          <p style={{ fontSize: "8pt", margin: "1mm 0 0" }}>
            Scan with your phone camera to add these to a free avoid list on {SITE_NAME}. No account needed.
          </p>
        </div>
      </div>
      <style>{`.pt-print-sheet .pt-qr { width: 44mm; height: 44mm; }`}</style>

      {ids.length > 0 && (
        <>
          <h2 style={{ fontSize: "12pt", fontWeight: 600, margin: "6mm 0 2mm" }}>Avoid these, and check every label for the names listed</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9.5pt" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1.5px solid #000" }}>
                <th style={{ padding: "1mm 2mm 1mm 0", width: "38%" }}>Allergen</th>
                <th style={{ padding: "1mm 0" }}>Also appears on labels as</th>
              </tr>
            </thead>
            <tbody>
              {ids.map((id) => (
                <tr key={id} style={{ borderBottom: "0.5px solid #999", verticalAlign: "top" }}>
                  <td style={{ padding: "1.2mm 2mm 1.2mm 0", fontWeight: 600 }}>{importItemName(id)}</td>
                  <td style={{ padding: "1.2mm 0" }}>{watchForNames(id).join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {offLabel.length > 0 && (
        <>
          <h2 style={{ fontSize: "12pt", fontWeight: 600, margin: "5mm 0 2mm" }}>Also positive, but not listed on cosmetic labels</h2>
          <ul style={{ margin: 0, paddingLeft: "5mm", fontSize: "9.5pt" }}>
            {offLabel.map((id) => (
              <li key={id} style={{ marginBottom: "0.8mm" }}>
                <strong>{getNotOnLabel(id)!.name}:</strong> {getNotOnLabel(id)!.foundIn}
              </li>
            ))}
          </ul>
        </>
      )}

      <div style={{ marginTop: "6mm", paddingTop: "2mm", borderTop: "0.5px solid #999", fontSize: "8pt" }}>
        <p style={{ margin: 0, wordBreak: "break-all", fontFamily: "ui-monospace, monospace" }}>{shortUrl}</p>
        <p style={{ margin: "1.5mm 0 0" }}>
          Labels can use names not listed here, and “fragrance” or “parfum” can hide fragrance allergens. When in doubt, ask
          your dermatologist. The link carries only the allergen list{date || note ? ", date and note" : ""}, never your name.
        </p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ padding: "0.5mm 4mm 0.5mm 0", color: "#333" }}>{label}</td>
      <td style={{ padding: "0.5mm 0", fontWeight: 600 }}>{value}</td>
    </tr>
  );
}

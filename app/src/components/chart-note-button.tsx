"use client";

import { useState } from "react";
import { Check, ClipboardCopy } from "lucide-react";
import { buildChartNote, type ChartNoteVersion } from "@/lib/chart-note";

// "Copy chart note": plain ASCII text for the EHR, built from the handout
// VERSION only (lib/chart-note.ts) -- never the printout's claim token or
// the patient's name, which this component never receives.
export function ChartNoteButton({ version, compact = false }: { version: ChartNoteVersion; compact?: boolean }) {
  const [abbr, setAbbr] = useState(false);
  const [short, setShort] = useState(false);
  const [copied, setCopied] = useState(false);
  const [show, setShow] = useState(!compact);
  const text = buildChartNote(version, { abbreviations: abbr, short });

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard blocked (http, permissions): the text is shown to select by hand.
      setShow(true);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          {copied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />} {copied ? "Copied" : "Copy chart note"}
        </button>
        <label className="inline-flex items-center gap-1.5 text-xs">
          <input type="checkbox" checked={short} onChange={(e) => setShort(e.target.checked)} /> One line
        </label>
        <label className="inline-flex items-center gap-1.5 text-xs">
          <input type="checkbox" checked={abbr} onChange={(e) => setAbbr(e.target.checked)} /> Sig abbreviations (qAM/qHS/BID)
        </label>
        {compact && (
          <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setShow((s) => !s)}>
            {show ? "Hide" : "Show"} text
          </button>
        )}
      </div>
      {show && (
        <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-xl border bg-muted/40 p-3 font-mono text-xs leading-relaxed">{text}</pre>
      )}
      <p className="text-[11px] text-muted-foreground">
        Plain text for the chart. It names the plan by its reference ({version.ref}), never the patient or the QR link.
      </p>
    </div>
  );
}

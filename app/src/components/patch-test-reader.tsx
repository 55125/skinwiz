"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Check, ClipboardCopy, Copy, Mail, Printer, RotateCcw, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrCode } from "@/components/qr-code";
import { PrintSheet, useOrigin } from "@/components/patch-test-issuer";
import { PATCH_TEST_SERIES, getNotOnLabel } from "@/db/patch-test-series";
import { resolveAllergenId } from "@/db/contact-allergens";
import { buildImportPath } from "@/lib/avoid-import";
import {
  GRADE_LABEL,
  READING_DAYS,
  avoidIdsFrom,
  chambersFor,
  getSeries,
  nextGrade,
  readingWriteUp,
  type Chamber,
  type Grade,
  type ReadingDay,
} from "@/lib/patch-test-reading";
import { cn } from "@/lib/utils";

const GRADE_STYLE: Record<Grade, string> = {
  neg: "border-border bg-card text-foreground",
  "?+": "border-yellow-400 bg-yellow-100 text-yellow-950 dark:bg-yellow-900/50 dark:text-yellow-100",
  "+": "border-orange-400 bg-orange-200 text-orange-950 dark:bg-orange-900/60 dark:text-orange-50",
  "++": "border-red-500 bg-red-400 text-white dark:bg-red-700",
  "+++": "border-red-800 bg-red-700 text-white dark:bg-red-900",
  IR: "border-sky-400 bg-sky-100 text-sky-950 dark:bg-sky-900/50 dark:text-sky-100",
};

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Tap-to-grade patch-test reading for medical assistants. Everything stays
// in this browser tab: grades, the chart write-up, the patient's name. The
// only thing that can leave is the avoid-list link (allergen code + date),
// and only when the MA prints it, shows its QR or opens their own email app.
export function PatchTestReader() {
  const origin = useOrigin();
  const [seriesId, setSeriesId] = useState(PATCH_TEST_SERIES[0].id);
  const [day, setDay] = useState<ReadingDay>("d2");
  const [readDate, setReadDate] = useState(todayIso);
  const [grades, setGrades] = useState<Record<string, Grade>>({});
  const [view, setView] = useState<"grid" | "results">("grid");
  const [includeDoubtful, setIncludeDoubtful] = useState(false);
  const [patient, setPatient] = useState("");
  const [copied, setCopied] = useState<"note" | "link" | null>(null);

  const series = getSeries(seriesId);
  const chambers = useMemo(() => chambersFor(series), [series]);
  const groups = useMemo(() => [...new Set(chambers.map((c) => c.group))], [chambers]);
  const graded = Object.values(grades).filter((g) => g !== "neg").length;

  const writeUp = readingWriteUp({ series, chambers, grades, day, readDate: readDate || undefined });
  const avoidAll = avoidIdsFrom(chambers, grades, includeDoubtful);
  const avoidIds = avoidAll.filter((id) => resolveAllergenId(id));
  const offLabel = avoidAll.filter((id) => getNotOnLabel(id));
  const url = `${origin}${buildImportPath(avoidAll, { date: readDate || undefined })}`;
  const hasPositives = avoidAll.length > 0;

  function reset() {
    if (graded > 0 && !confirm("Clear all grades and start a new reading?")) return;
    setGrades({});
    setPatient("");
    setView("grid");
  }

  if (view === "results") {
    const mail = `mailto:?subject=${encodeURIComponent("Your patch-test results")}&body=${encodeURIComponent(
      [
        "Hello,",
        "",
        "Here are the ingredients to avoid from your patch test. Open the link to see every name they go by on product labels, add them to a free avoid list, and find products that are safe for you:",
        url,
        "",
        "No account is needed. You can save the list to your email so it follows you to any device.",
      ].join("\n"),
    )}`;
    return (
      <div className="space-y-8">
        <Button type="button" variant="outline" onClick={() => setView("grid")}>
          <ArrowLeft className="h-4 w-4" /> Back to the grid
        </Button>

        <section className="space-y-2" aria-labelledby="note-h">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="note-h" className="text-lg font-semibold">
              Chart note
            </h2>
            <Button
              type="button"
              onClick={async () => {
                await navigator.clipboard?.writeText(writeUp).catch(() => {});
                setCopied("note");
              }}
            >
              {copied === "note" ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />} {copied === "note" ? "Copied" : "Copy to chart"}
            </Button>
          </div>
          <pre className="whitespace-pre-wrap rounded-2xl border bg-card p-4 font-mono text-[13px] leading-relaxed">{writeUp}</pre>
          <p className="text-xs text-muted-foreground">For the clinician to review and sign. No patient details are included; paste it into the patient&apos;s own chart.</p>
        </section>

        <section className="space-y-3 rounded-2xl border bg-card p-4" aria-labelledby="patient-h">
          <h2 id="patient-h" className="text-lg font-semibold">
            Give the patient their avoid list
          </h2>
          {!hasPositives ? (
            <p className="text-sm text-muted-foreground">No positive reactions graded, so there&apos;s nothing to avoid yet.</p>
          ) : (
            <>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={includeDoubtful} onChange={(e) => setIncludeDoubtful(e.target.checked)} />
                Include doubtful (?+) reactions
              </label>
              <label className="block max-w-sm space-y-1 text-sm">
                <span className="font-medium">Patient name (printed only)</span>
                <Input value={patient} onChange={(e) => setPatient(e.target.value)} autoComplete="off" data-1p-ignore data-lpignore="true" />
                <span className="block text-xs text-muted-foreground">Stays on this device; never sent to us and not in the link.</span>
              </label>
              <div className="grid gap-4 sm:grid-cols-[176px_minmax(0,1fr)] sm:items-start">
                {origin && <QrCode value={url} className="mx-auto h-44 w-44" title="QR code for the patient's avoid list" />}
                <div className="space-y-3 text-sm">
                  <p>
                    {avoidIds.length} to avoid{offLabel.length ? `, ${offLabel.length} not found on cosmetic labels` : ""}. The patient scans the code
                    (or opens the link), sees every label name to watch for, and is invited to save the list and browse products that are safe
                    for it.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={() => window.print()} className="rounded-full">
                      <Printer className="h-4 w-4" /> Print sheet
                    </Button>
                    <a href={mail} className="inline-flex h-9 items-center gap-1.5 rounded-full border bg-background px-4 text-sm font-medium hover:bg-muted">
                      <Mail className="h-4 w-4" /> Email
                    </a>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      onClick={async () => {
                        await navigator.clipboard?.writeText(url).catch(() => {});
                        setCopied("link");
                      }}
                    >
                      {copied === "link" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied === "link" ? "Copied" : "Copy link"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Email opens your own email app; you add the patient&apos;s address there, so it never reaches us. The link holds only the
                    allergen code and reading date.
                  </p>
                </div>
              </div>
            </>
          )}
        </section>

        <Button type="button" variant="outline" onClick={reset}>
          <RotateCcw className="h-4 w-4" /> New reading
        </Button>

        {hasPositives &&
          origin &&
          createPortal(<PrintSheet url={url} ids={avoidIds} offLabel={offLabel} patient={patient.trim()} date={readDate || undefined} />, document.body)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          <span className="block font-medium">Series</span>
          <select
            className="h-9 rounded-md border bg-background px-2"
            value={seriesId}
            onChange={(e) => {
              if (graded > 0 && !confirm("Switching series clears the grades. Continue?")) return;
              setGrades({});
              setSeriesId(e.target.value);
            }}
          >
            {PATCH_TEST_SERIES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.short}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="block font-medium">Reading</span>
          <select className="h-9 rounded-md border bg-background px-2" value={day} onChange={(e) => setDay(e.target.value as ReadingDay)}>
            {READING_DAYS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="block font-medium">Read on</span>
          <Input type="date" value={readDate} onChange={(e) => setReadDate(e.target.value)} className="h-9" />
        </label>
        <Button type="button" onClick={() => setView("results")} className="ml-auto rounded-full">
          Done: write it up ({graded} graded)
        </Button>
      </div>

      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>Tap a chamber to step through the grades:</span>
        {(["neg", "?+", "+", "++", "+++", "IR"] as Grade[]).map((g) => (
          <span key={g} className={cn("rounded border px-1.5 py-0.5 font-semibold", GRADE_STYLE[g])}>
            {g === "neg" ? "−" : g}
          </span>
        ))}
        <span className="inline-flex items-center gap-1 sm:hidden">
          <Smartphone className="h-3.5 w-3.5 rotate-90" /> Turn your phone sideways for bigger boxes.
        </span>
      </p>
      {series.id !== "true-test" && (
        <p className="text-xs text-muted-foreground">Chambers are numbered in this list&apos;s order. Confirm the numbers against your tray before reading.</p>
      )}

      {groups.map((group) => (
        <section key={group} className="space-y-2" aria-label={group}>
          <h2 className="text-sm font-semibold">{group}</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2 sm:grid-cols-[repeat(auto-fill,minmax(104px,1fr))]">
            {chambers
              .filter((c) => c.group === group)
              .map((c) => (
                <ChamberBox key={c.key} chamber={c} grade={grades[c.key] ?? "neg"} onTap={() => setGrades((all) => ({ ...all, [c.key]: nextGrade(all[c.key] ?? "neg") }))} />
              ))}
          </div>
        </section>
      ))}

      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button type="button" onClick={() => setView("results")} className="rounded-full">
          Done: write it up
        </Button>
        <Button type="button" variant="outline" onClick={reset}>
          <RotateCcw className="h-4 w-4" /> Clear
        </Button>
      </div>
    </div>
  );
}

function ChamberBox({ chamber, grade, onTap }: { chamber: Chamber; grade: Grade; onTap: () => void }) {
  const name = chamber.item ? chamber.item.name : "Negative control";
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={`${chamber.number}. ${name}: ${GRADE_LABEL[grade]}. Tap to change.`}
      className={cn(
        "flex aspect-square min-h-[88px] select-none flex-col justify-between rounded-xl border-2 p-2 text-left transition-colors active:scale-[0.97]",
        GRADE_STYLE[grade],
        !chamber.item && grade === "neg" && "border-dashed",
      )}
    >
      <span className="flex items-start justify-between gap-1">
        <span className="text-lg font-bold tabular-nums leading-none">{chamber.number}</span>
        <span className="text-base font-bold leading-none">{grade === "neg" ? "−" : grade}</span>
      </span>
      <span className="line-clamp-3 text-[11px] font-medium leading-tight">{name}</span>
    </button>
  );
}

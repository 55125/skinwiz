"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowDown, ArrowUp, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { findPrivacyHits, PRIVACY_HIT_TEXT } from "@/lib/note-privacy";
import {
  HANDOUT_SLOTS,
  MAX_DIRECTIONS,
  MAX_HEADING,
  MAX_LABEL,
  MAX_NOTES,
  MAX_RULE,
  MAX_SECTION_BODY,
  MAX_SECTIONS,
  MAX_STEPS,
  MAX_STOP_RULES,
  MAX_TITLE,
  SLOT_LABEL,
  type HandoutSlot,
} from "@/lib/handout-types";
import { encodeImportCode } from "@/lib/avoid-import";
import { cn } from "@/lib/utils";

export type BuilderStep = {
  uid: string;
  slot: HandoutSlot;
  label: string;
  productId: string | null;
  kind: "otc" | "rx" | "generic";
  productName: string | null;
  directions: string;
  search: string; // the template's picker hint
};

export type BuilderInitial = {
  handoutId: string | null; // set when editing (saves a new version)
  title: string;
  templateId: string | null;
  templateDraft: boolean;
  sections: { heading: string; body: string }[];
  steps: BuilderStep[];
  stopRules: string[];
  notes: string;
  avoidCode: string;
};

type Result = { id: string; name: string; maker: string | null; kind: "otc" | "rx"; directions: string };

let uidCounter = 0;
const uid = () => `u${Date.now().toString(36)}${(uidCounter++).toString(36)}`;

/** Accepts either a full patch-test link (…/avoid/import?a=1xyz&c=…) or the bare code. */
function extractAvoidCode(input: string): string {
  const t = input.trim();
  if (!t) return "";
  const m = /[?&]a=([^&\s]+)/.exec(t);
  return decodeURIComponent(m ? m[1] : t);
}

export function HandoutBuilder({
  initial,
  rxAllowed,
  lists = [],
}: {
  initial: BuilderInitial;
  rxAllowed: boolean;
  lists?: { id: string; name: string; ids: string[] }[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [sections, setSections] = useState(() => initial.sections.map((x) => ({ ...x, uid: uid() })));
  const [steps, setSteps] = useState<BuilderStep[]>(initial.steps);
  const [rules, setRules] = useState<string[]>(initial.stopRules);
  const [notes, setNotes] = useState(initial.notes);
  const [avoid, setAvoid] = useState(initial.avoidCode);
  const [picker, setPicker] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const freeText = [
    title,
    notes,
    ...rules,
    ...sections.map((x) => `${x.heading}\n${x.body}`),
    ...steps.map((s) => `${s.label} ${s.directions}`),
  ].join("\n");
  const updateSection = (u: string, patch: Partial<{ heading: string; body: string }>) =>
    setSections((all) => all.map((x) => (x.uid === u ? { ...x, ...patch } : x)));
  const moveSection = (i: number, d: -1 | 1) =>
    setSections((all) => {
      const j = i + d;
      if (j < 0 || j >= all.length) return all;
      const next = [...all];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const privacyHits = useMemo(() => findPrivacyHits(freeText), [freeText]);

  const update = (u: string, patch: Partial<BuilderStep>) => setSteps((all) => all.map((s) => (s.uid === u ? { ...s, ...patch } : s)));
  const move = (i: number, d: -1 | 1) =>
    setSteps((all) => {
      const j = i + d;
      if (j < 0 || j >= all.length) return all;
      const next = [...all];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  function save() {
    start(async () => {
      setError(null);
      const res = await fetch("/api/clinicians/handouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handoutId: initial.handoutId,
          templateId: initial.templateId,
          title,
          sections: sections.map(({ heading, body }) => ({ heading, body })),
          steps: steps.map(({ slot, label, productId, directions }) => ({ slot, label, productId, directions })),
          stopRules: rules,
          notes,
          avoidCode: extractAvoidCode(avoid) || null,
        }),
      }).catch(() => null);
      const body = ((await res?.json().catch(() => null)) ?? {}) as { error?: string; handoutId?: string; version?: number };
      if (!res?.ok || !body.handoutId) {
        setError(body.error ?? "Couldn't save. Please try again.");
        return;
      }
      router.push(`/clinicians/handouts/${body.handoutId}?v=${body.version}`);
    });
  }

  return (
    <div className="space-y-8">
      {initial.templateDraft && (
        <p className="text-xs text-muted-foreground">
          This template was drafted with AI assistance; physician review in progress. Read it before handing it out; every word is
          yours to edit.
        </p>
      )}

      <label className="block space-y-1 text-sm">
        <span className="font-medium">Handout title (the patient sees this)</span>
        <Input value={title} maxLength={MAX_TITLE} onChange={(e) => setTitle(e.target.value)} />
      </label>

      <section className="space-y-3" aria-labelledby="sections-h">
        <div className="flex items-center justify-between">
          <h2 id="sections-h" className="text-lg font-semibold">
            Patient information
          </h2>
          <span className="text-xs text-muted-foreground">
            {sections.length}/{MAX_SECTIONS}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          What it is, what to expect, how to care for it. A blank line starts a new paragraph; start a line with &ldquo;- &rdquo; for a bullet.
        </p>
        <ol className="space-y-3">
          {sections.map((x, i) => (
            <li key={x.uid} className="space-y-2 rounded-2xl border bg-card p-4">
              <div className="flex items-center gap-2">
                <Input
                  aria-label="Section heading"
                  value={x.heading}
                  maxLength={MAX_HEADING}
                  placeholder="Heading, e.g. Caring for your wound"
                  onChange={(e) => updateSection(x.uid, { heading: e.target.value })}
                  className="font-medium"
                />
                <IconBtn label="Move section up" onClick={() => moveSection(i, -1)}>
                  <ArrowUp className="h-4 w-4" />
                </IconBtn>
                <IconBtn label="Move section down" onClick={() => moveSection(i, 1)}>
                  <ArrowDown className="h-4 w-4" />
                </IconBtn>
                <IconBtn label="Remove section" onClick={() => setSections((all) => all.filter((y) => y.uid !== x.uid))}>
                  <Trash2 className="h-4 w-4" />
                </IconBtn>
              </div>
              <Textarea
                aria-label="Section text"
                value={x.body}
                maxLength={MAX_SECTION_BODY}
                rows={Math.min(12, Math.max(4, x.body.split("\n").length + 1))}
                onChange={(e) => updateSection(x.uid, { body: e.target.value })}
              />
            </li>
          ))}
        </ol>
        <Button
          type="button"
          variant="outline"
          disabled={sections.length >= MAX_SECTIONS}
          onClick={() => setSections((all) => [...all, { uid: uid(), heading: "", body: "" }])}
        >
          <Plus className="h-4 w-4" /> Add a section
        </Button>
      </section>

      <section className="space-y-3" aria-labelledby="steps-h">
        <div className="flex items-center justify-between">
          <h2 id="steps-h" className="text-lg font-semibold">
            Products and steps{sections.length > 0 ? " (optional)" : ""}
          </h2>
          <span className="text-xs text-muted-foreground">
            {steps.length}/{MAX_STEPS}
          </span>
        </div>
        {!rxAllowed && (
          <p className="text-xs text-muted-foreground">Prescription products unlock once your NPI is verified. OTC products and named steps work now.</p>
        )}
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li key={s.uid} className="space-y-3 rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold">{i + 1}</span>
                <select
                  aria-label="When"
                  value={s.slot}
                  onChange={(e) => update(s.uid, { slot: e.target.value as HandoutSlot })}
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                >
                  {HANDOUT_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {SLOT_LABEL[slot]}
                    </option>
                  ))}
                </select>
                <Input
                  aria-label="Step name"
                  value={s.label}
                  maxLength={MAX_LABEL}
                  placeholder="Step, e.g. Gentle cleanser"
                  onChange={(e) => update(s.uid, { label: e.target.value })}
                  className="h-9 min-w-40 flex-1"
                />
                <div className="ml-auto flex gap-1">
                  <IconBtn label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                    <ArrowUp className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn label="Move down" onClick={() => move(i, 1)} disabled={i === steps.length - 1}>
                    <ArrowDown className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn label="Remove step" onClick={() => setSteps((all) => all.filter((x) => x.uid !== s.uid))}>
                    <Trash2 className="h-4 w-4" />
                  </IconBtn>
                </div>
              </div>

              {s.productId ? (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase", s.kind === "rx" ? "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200" : "bg-muted")}>
                    {s.kind === "rx" ? "Rx" : "OTC"}
                  </span>
                  <span className="font-medium">{s.productName}</span>
                  <button type="button" className="text-xs text-brand hover:underline" onClick={() => setPicker(s.uid)}>
                    Change
                  </button>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:underline"
                    onClick={() => update(s.uid, { productId: null, productName: null, kind: "generic" })}
                  >
                    Remove product (keep as a named step)
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setPicker(s.uid)} className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
                  <Search className="h-3.5 w-3.5" /> Pick a product{s.search ? ` (${s.search})` : ""}
                </button>
              )}
              {picker === s.uid && (
                <ProductPicker
                  initialQuery={s.search || s.label}
                  rxAllowed={rxAllowed}
                  onClose={() => setPicker(null)}
                  onPick={(r) => {
                    update(s.uid, {
                      productId: r.id,
                      productName: r.name,
                      kind: r.kind,
                      directions: s.directions.trim() ? s.directions : r.directions.slice(0, MAX_DIRECTIONS),
                    });
                    setPicker(null);
                  }}
                />
              )}

              <label className="block space-y-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">Directions (your sig, shown to the patient)</span>
                <Textarea
                  value={s.directions}
                  maxLength={MAX_DIRECTIONS}
                  rows={2}
                  onChange={(e) => update(s.uid, { directions: e.target.value })}
                />
              </label>
            </li>
          ))}
        </ol>
        <Button
          type="button"
          variant="outline"
          disabled={steps.length >= MAX_STEPS}
          onClick={() => {
            const s: BuilderStep = { uid: uid(), slot: "pm", label: "", productId: null, kind: "generic", productName: null, directions: "", search: "" };
            setSteps((all) => [...all, s]);
            setPicker(s.uid);
          }}
        >
          <Plus className="h-4 w-4" /> Add a step
        </Button>
      </section>

      <section className="space-y-3" aria-labelledby="rules-h">
        <h2 id="rules-h" className="text-lg font-semibold">
          Stop and call us if…
        </h2>
        <ul className="space-y-2">
          {rules.map((r, i) => (
            <li key={i} className="flex gap-2">
              <Input value={r} maxLength={MAX_RULE} onChange={(e) => setRules((all) => all.map((x, j) => (j === i ? e.target.value : x)))} />
              <IconBtn label="Remove rule" onClick={() => setRules((all) => all.filter((_, j) => j !== i))}>
                <X className="h-4 w-4" />
              </IconBtn>
            </li>
          ))}
        </ul>
        <Button type="button" variant="outline" size="sm" disabled={rules.length >= MAX_STOP_RULES} onClick={() => setRules((all) => [...all, ""])}>
          <Plus className="h-4 w-4" /> Add a rule
        </Button>
      </section>

      <section className="space-y-2" aria-labelledby="notes-h">
        <h2 id="notes-h" className="text-lg font-semibold">
          Notes to the patient
        </h2>
        <p className="text-xs text-muted-foreground">
          Don&apos;t include patient names or health details. This text is stored with the handout and shown to whoever saves it.
        </p>
        <Textarea value={notes} maxLength={MAX_NOTES} rows={3} onChange={(e) => setNotes(e.target.value)} />
        <p className="text-right text-[11px] text-muted-foreground">
          {notes.length}/{MAX_NOTES}
        </p>
      </section>

      <section className="space-y-2" aria-labelledby="avoid-h">
        <h2 id="avoid-h" className="text-lg font-semibold">
          Patch-test results (optional)
        </h2>
        <p className="text-xs text-muted-foreground">
          Paste the link from a{" "}
          <a href="/for-clinicians/patch-test" target="_blank" className="text-brand underline">
            patch-test sheet
          </a>{" "}
          to include the patient&apos;s avoid list with this plan. Only the allergen code is kept.
        </p>
        <Input value={avoid} onChange={(e) => setAvoid(e.target.value)} placeholder="https://…/avoid/import?a=…" />
        {lists.length > 0 && (
          <label className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Or use a starter list:</span>
            <select
              className="h-9 rounded-md border bg-background px-2"
              value=""
              onChange={(e) => {
                const list = lists.find((l) => l.id === e.target.value);
                if (list) setAvoid(encodeImportCode(list.ids));
              }}
            >
              <option value="">Choose…</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </section>

      {privacyHits.length > 0 && (
        <div role="alert" className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            This looks like it may include {privacyHits.map((h) => PRIVACY_HIT_TEXT[h.kind]).join(" and ")} (&ldquo;{privacyHits[0].match}&rdquo;). Handouts
            are stored without patient details; please remove it. The patient&apos;s name goes in the print box only, which never leaves your browser.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t pt-4">
        <Button type="button" onClick={save} disabled={pending || (steps.length === 0 && sections.length === 0)}>
          {pending ? "Saving…" : initial.handoutId ? "Save as a new version" : "Save handout"}
        </Button>
        {initial.handoutId && (
          <p className="text-xs text-muted-foreground">Earlier versions stay exactly as printed; their QR codes keep showing what was on that paper.</p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className="rounded-md border p-1.5 hover:bg-muted disabled:opacity-40">
      {children}
    </button>
  );
}

function ProductPicker({
  initialQuery,
  rxAllowed,
  onPick,
  onClose,
}: {
  initialQuery: string;
  rxAllowed: boolean;
  onPick: (r: Result) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState<{ otc: Result[]; rx: Result[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const query = q.trim();
    const id = ++seq.current;
    const t = setTimeout(async () => {
      if (query.length < 2) {
        if (id === seq.current) setResults(null);
        return;
      }
      setLoading(true);
      const res = await fetch(`/api/clinicians/products?q=${encodeURIComponent(query)}`).catch(() => null);
      const body = ((await res?.json().catch(() => null)) ?? { otc: [], rx: [] }) as { otc: Result[]; rx: Result[] };
      if (id === seq.current) {
        setResults({ otc: body.otc ?? [], rx: body.rx ?? [] });
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const list = (title: string, items: Result[]) =>
    items.length > 0 && (
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        <ul className="divide-y rounded-lg border">
          {items.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => onPick(r)} className="w-full px-3 py-2 text-left text-sm hover:bg-muted">
                <span className="font-medium">{r.name}</span>
                {r.maker && <span className="text-muted-foreground"> · {r.maker}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <div className="space-y-3 rounded-xl border bg-background p-3">
      <div className="flex gap-2">
        <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={rxAllowed ? "Search OTC or prescription, e.g. tretinoin" : "Search OTC products"} />
        <Button type="button" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
      {loading && <p className="text-xs text-muted-foreground">Searching…</p>}
      {results && (
        <div className="max-h-80 space-y-3 overflow-auto">
          {list("Prescription", results.rx)}
          {list("Over the counter", results.otc)}
          {results.rx.length === 0 && results.otc.length === 0 && !loading && <p className="text-sm text-muted-foreground">No matches.</p>}
        </div>
      )}
    </div>
  );
}

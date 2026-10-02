"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PROFILE_CONCERNS, SKIN_TYPES, type Profile } from "@/lib/profile-shared";
import { cn } from "@/lib/utils";

type Suggestion = { id: string; name: string };

function IngredientPicker({
  title,
  hint,
  ids,
  names,
  tone,
  onAdd,
  onRemove,
}: {
  title: string;
  hint: string;
  ids: string[];
  names: Record<string, string>;
  tone: "good" | "bad";
  onAdd: (s: Suggestion) => void;
  onRemove: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const seq = useRef(0);
  // Derived rather than cleared in the effect: a short query just hides
  // whatever the last fetch returned.
  const shown = q.trim().length < 2 ? [] : results;

  useEffect(() => {
    if (q.trim().length < 2) return;
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q.trim())}`, { headers: { Accept: "application/json" } });
        if (!res.ok) return;
        const data = (await res.json()) as { ingredients: Suggestion[] };
        if (mine === seq.current) setResults(data.ingredients.filter((i) => !ids.includes(i.id)));
      } catch {
        /* ignore */
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q, ids]);

  const chip = tone === "good" ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300" : "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300";

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="relative">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search an ingredient…"
          aria-label={`${title}: search ingredients`}
          className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {shown.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border bg-popover shadow-lg">
            {shown.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    onAdd(r);
                    setQ("");
                    setResults([]);
                  }}
                >
                  <span>{r.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {ids.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {ids.map((id) => (
            <li key={id} className={cn("inline-flex items-center gap-1 rounded-full border py-1 pl-3 pr-1.5 text-xs font-medium", chip)}>
              {names[id] ?? id}
              <button type="button" onClick={() => onRemove(id)} aria-label={`Remove ${names[id] ?? id}`} className="rounded-full p-0.5 hover:bg-black/10">
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const LIFE_STAGE: { key: "pregnant" | "breastfeeding"; label: string }[] = [
  { key: "pregnant", label: "Pregnant or trying" },
  { key: "breastfeeding", label: "Breastfeeding" },
];

export function ProfileEditor({
  initial,
  names: initialNames,
  pregnancyMode = false,
}: {
  initial: Profile;
  names: Record<string, string>;
  /** FEATURES.PREGNANCY_MODE, from the server. */
  pregnancyMode?: boolean;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>(initial);
  const [names, setNames] = useState(initialNames);
  const [saved, setSaved] = useState(true);
  const [isPending, startTransition] = useTransition();

  function update(patch: Partial<Profile>) {
    setProfile((p) => ({ ...p, ...patch }));
    setSaved(false);
  }

  function add(list: "likes" | "dislikes", s: Suggestion) {
    const other = list === "likes" ? "dislikes" : "likes";
    setNames((n) => ({ ...n, [s.id]: s.name }));
    update({ [list]: [...profile[list], s.id], [other]: profile[other].filter((x) => x !== s.id) } as Partial<Profile>);
  }

  function save() {
    startTransition(async () => {
      const res = await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-8">
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Skin type</legend>
        <div className="flex flex-wrap gap-2">
          {SKIN_TYPES.map((s) => {
            const on = profile.skin === s.id;
            return (
              <label key={s.id} className={cn("cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors", on ? "border-brand/50 bg-brand-soft" : "bg-card hover:bg-muted")}>
                <input type="radio" name="skin" className="sr-only" checked={on} onChange={() => update({ skin: s.id })} />
                {s.label}
              </label>
            );
          })}
          {profile.skin && (
            <button type="button" className="px-2 text-xs text-muted-foreground underline" onClick={() => update({ skin: null })}>
              clear
            </button>
          )}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Concerns</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {PROFILE_CONCERNS.map((c) => {
            const on = profile.concerns.includes(c.id);
            return (
              <label key={c.id} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-sm transition-colors", on ? "border-brand/50 bg-brand-soft" : "bg-card hover:bg-muted")}>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  onChange={() => update({ concerns: on ? profile.concerns.filter((x) => x !== c.id) : [...profile.concerns, c.id] })}
                />
                <span aria-hidden className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-md border", on ? "border-primary bg-primary text-primary-foreground" : "bg-background")}>
                  {on && <Check className="h-3.5 w-3.5" />}
                </span>
                <span className="font-medium">{c.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {pregnancyMode && (
        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pregnancy &amp; breastfeeding</legend>
          <p className="text-xs text-muted-foreground">
            Optional. Product pages will note ingredients that published guidance suggests avoiding or asking about at
            this time. It doesn&apos;t change match scores, and it isn&apos;t medical clearance — talk to your OB or
            dermatologist.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {LIFE_STAGE.map((o) => {
              const on = profile[o.key];
              return (
                <label key={o.key} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-sm transition-colors", on ? "border-brand/50 bg-brand-soft" : "bg-card hover:bg-muted")}>
                  <input type="checkbox" className="sr-only" checked={on} onChange={() => update({ [o.key]: !on })} />
                  <span aria-hidden className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-md border", on ? "border-primary bg-primary text-primary-foreground" : "bg-background")}>
                    {on && <Check className="h-3.5 w-3.5" />}
                  </span>
                  <span className="font-medium">{o.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <IngredientPicker
          title="Ingredients I like"
          hint="Things that have worked for you. Products containing them score higher."
          ids={profile.likes}
          names={names}
          tone="good"
          onAdd={(s) => add("likes", s)}
          onRemove={(id) => update({ likes: profile.likes.filter((x) => x !== id) })}
        />
        <IngredientPicker
          title="Ingredients I dislike"
          hint="Things that broke you out or didn't agree with you. Products containing them score lower."
          ids={profile.dislikes}
          names={names}
          tone="bad"
          onAdd={(s) => add("dislikes", s)}
          onRemove={(id) => update({ dislikes: profile.dislikes.filter((x) => x !== id) })}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" onClick={save} disabled={saved || isPending} className="rounded-full px-5">
          {saved ? (
            <>
              <Check className="h-4 w-4" /> Saved
            </>
          ) : (
            "Save profile"
          )}
        </Button>
        {!saved && <p className="text-sm text-muted-foreground">Saving with nothing selected clears your profile.</p>}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { AllergenEducation } from "@/db/allergen-education";
import { allergyIntro, allergyIntroMany } from "@/db/allergen-education-intro";
import { getNotOnLabel, importItemName } from "@/db/patch-test-series";
import type { HandoutProduct } from "@/lib/queries";

// The patient-education half of the printed patch-test sheet: one section
// per allergen from the shared records (db/allergen-education.ts, the same
// text as the allergen pages) and a few named products that are clear of the
// whole list (lib/queries.ts getHandoutSafeProducts). Both come from
// /api/handout/patch-test, which takes only the allergen ids the QR link
// already carries.

export type HandoutExtras = {
  education: AllergenEducation[];
  products: { concernId: string; label: string; products: HandoutProduct[] }[];
};

export type ClinicHeader = { name: string; clinician: string; phone: string | null; website: string | null };

/** Fetches the handout's education and product sections for these ids. `null` while loading; failures print without them. */
export function useHandoutExtras(ids: string[]): { extras: HandoutExtras | null; loading: boolean } {
  const key = [...new Set(ids)].sort().join(",");
  const [state, setState] = useState<{ key: string; extras: HandoutExtras | null; done: boolean }>({ key: "", extras: null, done: false });
  useEffect(() => {
    if (!key) return;
    let live = true;
    fetch(`/api/handout/patch-test?ids=${encodeURIComponent(key)}`)
      .then((r) => (r.ok ? (r.json() as Promise<HandoutExtras>) : null))
      .catch(() => null)
      .then((extras) => {
        if (live) setState({ key, extras, done: true });
      });
    return () => {
      live = false;
    };
  }, [key]);
  if (!key) return { extras: null, loading: false };
  const current = state.key === key;
  return { extras: current ? state.extras : null, loading: !current || !state.done };
}

const nameOf = (id: string) => importItemName(id) ?? getNotOnLabel(id)?.name ?? id;

const H2: React.CSSProperties = { fontSize: "12pt", fontWeight: 600, margin: "5mm 0 2mm" };

/** The "what this means" paragraph under the sheet's title. */
export function HandoutIntro({ ids }: { ids: string[] }) {
  const text = ids.length === 1 ? allergyIntro(nameOf(ids[0])) : allergyIntroMany();
  return (
    <p style={{ margin: "3mm 0 0", fontSize: "9.5pt" }}>
      {text} Staying away from {ids.length === 1 ? "it" : "them"} lets your skin settle; the allergy itself usually lasts, so keep checking labels.
    </p>
  );
}

export function HandoutProducts({ extras, date }: { extras: HandoutExtras; date?: string }) {
  const kinds = extras.products.filter((k) => k.products.length > 0);
  if (kinds.length === 0) return null;
  const asOf = new Date(`${date ?? new Date().toISOString().slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return (
    <div style={{ breakInside: "avoid", marginTop: "5mm", padding: "2.5mm 3mm", border: "1px solid #000", borderRadius: "2mm" }}>
      <h2 style={{ ...H2, margin: "0 0 1.5mm" }}>Examples of products clear of your whole list</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9.5pt" }}>
        <tbody>
          {kinds.map((k) => (
            <tr key={k.concernId} style={{ verticalAlign: "top" }}>
              <td style={{ padding: "0.6mm 3mm 0.6mm 0", width: "34%", color: "#333" }}>{k.label}</td>
              <td style={{ padding: "0.6mm 0", fontWeight: 600 }}>{k.products.map((p) => p.title).join("; ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ margin: "1.5mm 0 0", fontSize: "8pt" }}>
        Picked from products sold widely in US stores whose full ingredient list had none of the allergens on this sheet as of {asOf}. Formulas
        change, so read the label each time you buy. Scan the QR code to find more. Not a paid placement.
      </p>
    </div>
  );
}

export function HandoutAllergenSections({ ids, extras, positives = {} }: { ids: string[]; extras: HandoutExtras; positives?: Record<string, string[]> }) {
  const byId = new Map(extras.education.map((e) => [e.id, e]));
  const records = ids.map((id) => byId.get(id)).filter((e) => e !== undefined);
  if (records.length === 0) return null;
  return (
    <div style={{ breakBefore: "page" }}>
      <h2 style={{ ...H2, margin: "0 0 2mm", fontSize: "14pt" }}>About each allergen</h2>
      {records.map((e) => (
        <AllergenBlock key={e.id} e={e} tested={positives[e.id]} />
      ))}
    </div>
  );
}

function AllergenBlock({ e, tested }: { e: AllergenEducation; tested?: string[] }) {
  const name = nameOf(e.id);
  const testedAs = [...new Set([...(tested ?? []), ...e.testedAs])];
  return (
    <section style={{ breakInside: "avoid", borderTop: "1.5px solid #000", padding: "2mm 0 3mm", fontSize: "9.5pt" }}>
      <h3 style={{ fontSize: "11.5pt", fontWeight: 600, margin: 0 }}>{name}</h3>
      <p style={{ margin: "0.5mm 0 1.5mm", fontSize: "8.5pt", color: "#333" }}>
        Patch-tested as {testedAs.join(", ")}
        {e.cas.length > 0 && (
          <>
            {" · CAS "}
            {e.cas.map((c, i) => (
              <span key={c.number}>
                {i > 0 && "; "}
                {c.number}
                {e.cas.length > 1 || c.of.toLowerCase() !== name.toLowerCase() ? ` (${c.of})` : ""}
              </span>
            ))}
          </>
        )}
      </p>
      <p style={{ margin: "0 0 0.5mm", fontWeight: 600 }}>Where you&apos;ll meet it</p>
      <div style={{ columns: 2, columnGap: "6mm" }}>
        {e.foundIn.map((g) => (
          <p key={g.where} style={{ margin: "0 0 1mm", breakInside: "avoid" }}>
            <span style={{ fontWeight: 600 }}>{g.where}: </span>
            {g.items.map((it) => it.replace(/[.;]$/, "")).join(" • ")}
          </p>
        ))}
      </div>
      {e.related.length > 0 && (
        <p style={{ margin: "1mm 0 0" }}>
          <span style={{ fontWeight: 600 }}>Often goes with: </span>
          {e.related.map((r, i) => (
            <span key={r.id}>
              {i > 0 && " "}
              {nameOf(r.id)} ({r.why.replace(/\.$/, "")}).
            </span>
          ))}
        </p>
      )}
      {e.tips.length > 0 && (
        <>
          <p style={{ margin: "1mm 0 0", fontWeight: 600 }}>Tips</p>
          <ul style={{ margin: 0, paddingLeft: "5mm", listStyle: "disc" }}>
            {e.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

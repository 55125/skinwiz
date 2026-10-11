import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { catCaution, regulatoryStatus, speciesLabel, type PetSpeciesFilter } from "@/db/pet";
import type { PetProduct } from "@/lib/pet-catalog";
import { displayManufacturer } from "@/lib/format";

// Shared pieces of the /pets pages: the species filter and one product row.
// (The People / Pets switch is in the site header: site-nav.tsx ModeSwitch.)

export function parseSpecies(s: string | undefined): PetSpeciesFilter | undefined {
  return s === "dog" || s === "cat" ? s : undefined;
}

/** All / Dogs / Cats pills; keeps the other query params. */
export function SpeciesFilter({ base, species, params = {} }: { base: string; species?: PetSpeciesFilter; params?: Record<string, string | undefined> }) {
  const href = (sp?: PetSpeciesFilter) => {
    const entries: [string, string | undefined][] = Object.entries({ ...params, species: sp });
    const qs = new URLSearchParams(entries.filter((e): e is [string, string] => !!e[1]));
    return qs.size ? `${base}?${qs}` : base;
  };
  const pill = (sp: PetSpeciesFilter | undefined, label: string) => (
    <Link
      key={label}
      href={href(sp)}
      aria-current={species === sp ? "true" : undefined}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        species === sp ? "border-brand bg-brand-soft font-medium text-brand-foreground" : "hover:border-brand",
      )}
    >
      {label}
    </Link>
  );
  return (
    <div className="flex flex-wrap gap-2" aria-label="Species">
      {pill(undefined, "All pets")}
      {pill("dog", "Dogs")}
      {pill("cat", "Cats")}
    </div>
  );
}

export function PetStatusBadge({ p }: { p: Pick<PetProduct, "regulatoryStatus" | "isRx"> }) {
  return (
    <>
      <Badge variant="outline">{regulatoryStatus(p.regulatoryStatus).label}</Badge>
      {p.isRx && <Badge variant="secondary">Veterinary prescription</Badge>}
    </>
  );
}

export function CatCautionBadge({ p }: { p: PetProduct }) {
  const c = catCaution({ ...p, actives: p.activesJson });
  if (!c) return null;
  return c === "danger" ? (
    <Badge className="border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
      <AlertTriangle className="mr-1 h-3 w-3" /> Not for cats
    </Badge>
  ) : (
    <Badge variant="outline">Dogs only</Badge>
  );
}

export function PetProductList({ products, species }: { products: PetProduct[]; species?: PetSpeciesFilter }) {
  if (products.length === 0) return <p className="text-sm text-muted-foreground">No products match.</p>;
  return (
    <ul className="divide-y rounded-2xl border bg-card">
      {products.map((p) => (
        <li key={p.id}>
          <Link href={`/pets/product/${encodeURIComponent(p.id)}${species ? `?species=${species}` : ""}`} className="flex gap-4 p-4 transition-colors hover:bg-muted/50">
            {p.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- small self-hosted brand photo
              <img src={p.imageUrl} alt="" width={64} height={64} className="h-16 w-16 shrink-0 rounded-xl border bg-white object-contain p-1" loading="lazy" />
            )}
            <div className="min-w-0 space-y-1">
              <p className="font-medium">{p.brandName}</p>
              <p className="text-sm text-muted-foreground">
                {[p.manufacturer && displayManufacturer(p.manufacturer), p.dosageForm?.toLowerCase(), speciesLabel(p.species)].filter(Boolean).join(" · ")}
              </p>
              {p.activeIngredientText && <p className="line-clamp-1 text-xs text-muted-foreground">{p.activesJson.length ? p.activesJson.map((a) => `${a.name.toLowerCase()} ${a.display}`.trim()).join(", ") : p.activeIngredientText}</p>}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <PetStatusBadge p={p} />
                <CatCautionBadge p={p} />
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

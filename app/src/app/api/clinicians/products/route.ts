import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api-guard";
import { FEATURES } from "@/lib/feature-flags";
import { currentClinician, isVerified } from "@/lib/clinicians";
import { searchProducts } from "@/lib/queries";
import { searchRxForHandout } from "@/lib/rx-catalog";
import { defaultDirectionsFor, productSnapshotName } from "@/lib/handouts";
import { displayManufacturer } from "@/lib/format";

// Product picker for the handout builder. OTC/cosmetic results come from the
// normal consumer search; prescription results only for a clinician whose
// NPI verified, and never informational-only rows (isotretinoin).
export async function GET(request: Request) {
  if (!FEATURES.HANDOUTS) return new NextResponse(null, { status: 404 });
  const limited = rateLimit(request, "clinician-products", 120, 60_000);
  if (limited) return limited;
  const { clinician } = await currentClinician();
  if (!clinician) return NextResponse.json({ error: "Clinicians only." }, { status: 401 });
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ otc: [], rx: [], rxAllowed: isVerified(clinician) });

  const otc = searchProducts(q).slice(0, 12).map((p) => ({
    id: p.id,
    name: productSnapshotName(p),
    maker: p.manufacturer ? displayManufacturer(p.manufacturer) : null,
    kind: "otc" as const,
    directions: defaultDirectionsFor(p),
  }));
  const rx = isVerified(clinician)
    ? searchRxForHandout(q, 12).map((p) => ({
        id: p.id,
        name: productSnapshotName(p),
        maker: p.manufacturer ? displayManufacturer(p.manufacturer) : null,
        kind: "rx" as const,
        directions: defaultDirectionsFor(p),
      }))
    : [];
  return NextResponse.json({ otc, rx, rxAllowed: isVerified(clinician) });
}

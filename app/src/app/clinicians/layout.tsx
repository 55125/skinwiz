import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/lib/feature-flags";

// The clinician area: sign-in + NPI, handout builder, dashboard. Behind
// FEATURE_HANDOUTS (404 when off), never indexed, read per request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Clinician handouts", template: "%s · Clinician handouts" },
  robots: { index: false, follow: false },
};

export default function CliniciansLayout({ children }: { children: React.ReactNode }) {
  if (!FEATURES.HANDOUTS) notFound();
  return children;
}

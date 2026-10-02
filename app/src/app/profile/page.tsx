import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ProfileEditor } from "@/components/profile-editor";
import { getIngredientNames, readProfile } from "@/lib/profile";
import { SITE_NAME } from "@/lib/brand";
import { FEATURES } from "@/lib/feature-flags";

export const metadata: Metadata = {
  title: "My skin profile",
  description: `Set your skin type, concerns and the ingredients you like or dislike, and ${SITE_NAME} scores every product against them.`,
  robots: { index: false },
};

export default async function ProfilePage() {
  const profile = await readProfile();
  const names = getIngredientNames([...profile.likes, ...profile.dislikes]);
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <PageHeader
        eyebrow="Your skin"
        title="My skin profile"
        description="Tell us about your skin and every product gets a match score with the reasons spelled out. Saved in this browser only — no account, nothing sent anywhere."
      />

      <ProfileEditor initial={profile} names={names} pregnancyMode={FEATURES.PREGNANCY_MODE} />

      <div className="space-y-2 rounded-2xl border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
        <p>
          The match score is a transparent, rule-based estimate from each product&apos;s published ingredient list
          (for example, sensitive skin is marked down for fragrance, drying alcohol and essential oils; your
          concerns reward well-known ingredients for them). It is not a clinical assessment and cannot predict how
          your skin will react. Products without a full ingredient list get no score rather than a guess.
        </p>
        <p>
          Ingredients you must avoid entirely belong on your{" "}
          <Link href="/avoid" className="font-medium text-brand hover:underline">
            avoid list
          </Link>
          , which also caps a product&apos;s match. Not medical advice — talk to a board-certified dermatologist about
          persistent skin problems.{" "}
          <Link href="/browse" className="font-medium text-brand hover:underline">
            Browse products →
          </Link>
        </p>
      </div>
    </div>
  );
}

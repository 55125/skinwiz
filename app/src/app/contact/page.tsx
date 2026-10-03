import Link from "next/link";
import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/brand";
import { LEGAL_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  alternates: { canonical: "/contact" },
  title: "Contact",
  description: `How to reach ${SITE_NAME}: questions, corrections, privacy requests, clinicians and partnerships.`,
};

const mail = (subject: string) => `mailto:${LEGAL_EMAIL}?subject=${encodeURIComponent(subject)}`;

const TOPICS: { title: string; body: string; subject: string }[] = [
  {
    title: "Questions and feedback",
    body: "Something unclear, a feature you'd like, or a page that didn't work.",
    subject: "Question",
  },
  {
    title: "Corrections",
    body: "A product, ingredient or label detail that looks wrong. Include the page link and what you see on the package.",
    subject: "Correction",
  },
  {
    title: "Privacy requests",
    body: "Access, correction or deletion of your information. See the Privacy Policy for what we hold and how to appeal a decision.",
    subject: "Privacy request",
  },
  {
    title: "Clinicians",
    body: "Patient handouts, the patch-test tool, or joining the dermatologist rating panel.",
    subject: "Clinician",
  },
  {
    title: "Brands, retailers and partnerships",
    body: "Affiliate programs, data questions and press. Commercial relationships never change our scores.",
    subject: "Partnership",
  },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-10">
      <div>
        <h1 className="text-3xl font-semibold sm:text-4xl">Contact {SITE_NAME}</h1>
        <p className="mt-2 text-muted-foreground">
          Email us at{" "}
          <a href={`mailto:${LEGAL_EMAIL}`} className="font-medium text-foreground underline underline-offset-2">
            {LEGAL_EMAIL}
          </a>
          . We read every message and usually reply within two business days.
        </p>
      </div>

      <ul className="space-y-3">
        {TOPICS.map((t) => (
          <li key={t.title} className="rounded-2xl border bg-card p-4">
            <h2 className="font-medium">{t.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.body}</p>
            <a href={mail(t.subject)} className="mt-2 inline-block text-sm font-medium text-brand hover:underline">
              Email about this
            </a>
          </li>
        ))}
      </ul>

      <p className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
        <strong className="text-foreground">We can&apos;t give personal medical advice by email.</strong> For a skin
        problem, see a board-certified dermatologist. If you think you have a medical emergency, call 911 or your local
        emergency number. See also our <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>{" "}
        and <Link href="/terms" className="underline underline-offset-2">Terms of Service</Link>.
      </p>
    </div>
  );
}

import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { LEGAL_EMAIL } from "@/lib/legal";
import { SITE_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  alternates: { canonical: "/accessibility" },
  title: "Accessibility",
  description: `How ${SITE_NAME} works to be usable by everyone, and how to report a barrier.`,
};

const mail = (
  <a href={`mailto:${LEGAL_EMAIL}?subject=${encodeURIComponent("Accessibility")}`}>{LEGAL_EMAIL}</a>
);

export default function AccessibilityPage() {
  return (
    <LegalPage
      title="Accessibility"
      updated="October 7, 2026"
      intro={
        <p>
          We want {SITE_NAME} to work for everyone, including people who use screen readers, keyboard navigation,
          magnification or other assistive technology. We aim to meet the Web Content Accessibility Guidelines
          (WCAG) 2.2 at level AA.
        </p>
      }
    >
      <h2>What we do</h2>
      <ul>
        <li>Pages use semantic headings, landmarks and labelled form controls, with a skip-to-content link.</li>
        <li>Product photos carry text alternatives; decorative images are hidden from screen readers.</li>
        <li>Everything can be reached and used with a keyboard, with a visible focus indicator.</li>
        <li>Text and controls are designed for sufficient color contrast and reflow on small screens and when zoomed.</li>
      </ul>

      <h2>Known limitations</h2>
      <p>
        Some product photos come from manufacturers&apos; package labels and may contain text that isn&apos;t
        repeated on the page; the ingredient list and label details on each product page carry that information as
        text.
      </p>

      <h2>Report a barrier</h2>
      <p>
        If something on the site is hard or impossible for you to use, email {mail} with the page address and what
        happened. We aim to reply within five business days and, where we can&apos;t fix something quickly, to give
        you the information another way.
      </p>
    </LegalPage>
  );
}

import Link from "next/link";
import { SiteLogo } from "@/components/site-header";

const FOOTER_LINKS = [
  {
    heading: "Explore",
    links: [
      { href: "/", label: "Concerns" },
      { href: "/browse", label: "All products" },
      { href: "/routines", label: "Routines" },
    ],
  },
  {
    heading: "SkinWiz",
    links: [
      { href: "/about", label: "About & methodology" },
      { href: "/for-clinicians", label: "For clinicians" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="space-y-3">
            <SiteLogo />
            <p className="max-w-sm text-sm text-muted-foreground">
              OTC skincare, matched ingredient by ingredient — scored by dermatologists and by real
              reported outcomes.
            </p>
          </div>
          {FOOTER_LINKS.map((group) => (
            <div key={group.heading} className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.heading}
              </h2>
              <ul className="space-y-2 text-sm">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-foreground/80 hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-4 border-t pt-8 text-xs leading-relaxed text-muted-foreground md:grid-cols-2">
          <p>
            <strong className="text-foreground">Not medical advice.</strong> SkinWiz provides educational
            information about OTC skincare ingredients and products. It does not diagnose any condition and
            does not create a doctor-patient relationship. Always talk to a board-certified dermatologist
            about your specific skin.
          </p>
          <p>
            <strong className="text-foreground">Affiliate disclosure.</strong> Some product links on this site
            are affiliate links — we may earn a commission if you buy through them, at no extra cost to you.
            This never affects Derm Score or Audience Score, which are independent of any commercial
            relationship.
          </p>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { SiteLogo } from "@/components/site-header";
import { FREE_FROM_CHECKS } from "@/db/ingredient-flags";
import { ALLERGEN_GROUPS } from "@/db/contact-allergens";
import { SITE_NAME } from "@/lib/brand";

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
    heading: "Tools",
    links: [
      { href: "/check", label: "Ingredient checker" },
      { href: "/allergens", label: "Contact allergen guide" },
      { href: "/ingredients", label: "Ingredient library" },
      { href: "/compare", label: "Compare products" },
    ],
  },
  {
    heading: "You",
    links: [
      { href: "/profile", label: "My skin" },
      { href: "/regimen", label: "My regimen" },
      { href: "/shelf", label: "My shelf" },
      { href: "/avoid", label: "My avoid list" },
    ],
  },
  {
    heading: SITE_NAME,
    links: [
      { href: "/about", label: "About & methodology" },
      { href: "/for-clinicians", label: "For clinicians" },
      { href: "/clinic-tools", label: "Clinic tools" },
      { href: "/contact", label: "Contact" },
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms of service" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 grid-cols-2 md:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
          <div className="col-span-2 space-y-3 md:col-span-1">
            <SiteLogo />
            <p className="max-w-sm text-sm text-muted-foreground">
              OTC skincare, matched ingredient by ingredient — scored by real reported outcomes, with a
              verified dermatologist panel in the works.
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

        <div className="mt-10 border-t pt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ingredient guides</h2>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
            {FREE_FROM_CHECKS.map((c) => (
              <li key={c.id}>
                <Link href={`/guide/${c.id}`} className="text-foreground/70 hover:text-foreground">
                  {c.label}
                </Link>
              </li>
            ))}
            {ALLERGEN_GROUPS.map((g) => (
              <li key={g.id}>
                <Link href={`/allergens/${g.id}`} className="text-foreground/70 hover:text-foreground">
                  {g.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 grid gap-4 border-t pt-8 text-xs leading-relaxed text-muted-foreground md:grid-cols-2">
          <p>
            <strong className="text-foreground">Not medical advice.</strong> {SITE_NAME} provides educational
            information about OTC skincare ingredients and products. It does not diagnose any condition and
            does not create a doctor-patient relationship. Always talk to a board-certified dermatologist
            about your specific skin.
          </p>
          <p>
            <strong className="text-foreground">Affiliate disclosure.</strong> Some product links on this site
            are affiliate links — we may earn a commission if you buy through them, at no extra cost to you.
            This never affects Derm Score or User Score, which are independent of any commercial
            relationship.
          </p>
        </div>
      </div>
    </footer>
  );
}

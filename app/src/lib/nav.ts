// Shared navigation map: the header, mobile menu, footer and My skin tabs all
// read from here so the site follows one structure everywhere.

export type NavItem = { href: string; label: string; hint?: string; divider?: boolean };

export const INGREDIENT_ITEMS: NavItem[] = [
  { href: "/ingredients", label: "Ingredient library", hint: "Every ingredient, with the products that use it" },
  { href: "/check", label: "Check an ingredient list", hint: "Paste any label and see what it contains" },
  { href: "/allergens", label: "Allergen guide", hint: "Contact allergens under all their label names" },
  { href: "/compare", label: "Compare products", hint: "Two products side by side" },
];

// The four personal pages, shown as tabs on each of them.
export const MY_SKIN_ITEMS: NavItem[] = [
  { href: "/profile", label: "Skin profile", hint: "Skin type, concerns, likes" },
  { href: "/regimen", label: "Regimen", hint: "Your morning and night steps" },
  { href: "/shelf", label: "Shelf", hint: "What you own, want, finished" },
  { href: "/avoid", label: "Avoid list", hint: "Ingredients to screen out" },
];

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

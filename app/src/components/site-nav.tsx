"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, UserRound, X } from "lucide-react";
import { SearchBar } from "@/components/search-bar";
import { cn } from "@/lib/utils";
import { INGREDIENT_ITEMS, MY_SKIN_ITEMS, isActive, type NavItem } from "@/lib/nav";

// The whole site is four places: what you're treating (Concerns), what's in
// a product (Ingredients), what others use (Routines), and your own stuff
// (My skin). Clinician pages sit apart as one small link.

type Concern = { id: string; name: string };

const HSA_GUIDE = "/guide/hsa-fsa-eligible";

function concernItems(concerns: Concern[]): NavItem[] {
  return [
    ...concerns.map((c) => ({ href: `/concern/${c.id}`, label: c.name })),
    { href: "/browse", label: "All products", hint: "Filter the full catalog", divider: true },
    { href: "/same", label: "Store-brand equivalents", hint: "Same active, same strength, lower price" },
    { href: HSA_GUIDE, label: "HSA/FSA-eligible skincare", hint: "What your spending account usually covers" },
  ];
}

const CONCERN_PREFIXES = ["/concern", "/browse", "/product", "/same", HSA_GUIDE];

function useDismiss(open: boolean, close: () => void, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, ref]);
}

function NavMenu({
  label,
  items,
  active,
  pathname,
  columns,
  icon,
  align = "left",
}: {
  label: string;
  items: NavItem[];
  active: boolean;
  pathname: string;
  columns?: number;
  icon?: React.ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), ref);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors",
          active || open
            ? "bg-brand-soft font-medium text-brand-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        {icon}
        {label}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute top-full z-30 mt-2 rounded-2xl border bg-popover p-1.5 shadow-xl shadow-foreground/5",
            align === "right" ? "right-0" : "left-0",
            columns === 2 ? "grid w-[30rem] grid-cols-2 gap-x-1" : "w-72",
          )}
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className={cn(
                "block rounded-xl px-3 py-2 transition-colors hover:bg-muted aria-[current=page]:bg-brand-soft",
                // Rows with a hint (All products...) span the full width under the grid.
                columns === 2 && item.hint && "col-span-2",
                item.divider && "mt-1 rounded-t-none border-t pt-2.5",
              )}
            >
              <span className="block text-sm font-medium">{item.label}</span>
              {item.hint && <span className="block text-xs text-muted-foreground">{item.hint}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function MobileMenu({ pathname, concerns, showSearch }: { pathname: string; concerns: Concern[]; showSearch: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), ref);
  // Close on navigation (a search submit or suggestion doesn't pass through our links).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }
  const link = (item: NavItem) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={() => setOpen(false)}
      aria-current={isActive(pathname, item.href) ? "page" : undefined}
      className="rounded-xl px-3 py-2 text-[15px] transition-colors hover:bg-muted aria-[current=page]:bg-brand-soft aria-[current=page]:font-medium aria-[current=page]:text-brand-foreground"
    >
      {item.label}
    </Link>
  );
  const heading = (text: string) => (
    <p className="mt-4 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{text}</p>
  );
  return (
    <div ref={ref} className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-full border transition-colors hover:bg-muted"
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-30 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b bg-background px-4 pb-6 pt-3 shadow-xl shadow-foreground/5">
          {showSearch && (
            <div className="pb-1 md:hidden">
              <SearchBar compact />
            </div>
          )}
          <nav className="flex flex-col">
            {heading("My skin")}
            <div className="grid grid-cols-2">{MY_SKIN_ITEMS.map(link)}</div>
            {heading("Concerns")}
            <div className="grid grid-cols-2">{concernItems(concerns).map(link)}</div>
            {heading("Ingredients")}
            <div className="grid grid-cols-2">{INGREDIENT_ITEMS.map(link)}</div>
            <div className="mt-4 border-t pt-3" />
            {link({ href: "/routines", label: "Community routines" })}
            {link({ href: "/for-clinicians", label: "For clinicians" })}
            {link({ href: "/about", label: "About" })}
          </nav>
        </div>
      )}
    </div>
  );
}

export function SiteNav({ concerns }: { concerns: Concern[] }) {
  const pathname = usePathname();
  // Home and Search already have a big search box of their own.
  const showSearch = pathname !== "/" && pathname !== "/search";
  const pill = (href: string, label: string, active: boolean, extra?: string) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "shrink-0 rounded-full px-3 py-1.5 transition-colors",
        active ? "bg-brand-soft font-medium text-brand-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        extra,
      )}
    >
      {label}
    </Link>
  );
  return (
    <>
      {showSearch && (
        <div className="hidden min-w-0 max-w-xs flex-1 md:block">
          <SearchBar compact />
        </div>
      )}
      <nav className="hidden shrink-0 items-center gap-1 text-sm lg:flex">
        <NavMenu
          label="Concerns"
          items={concernItems(concerns)}
          columns={2}
          pathname={pathname}
          active={CONCERN_PREFIXES.some((p) => isActive(pathname, p))}
        />
        <NavMenu
          label="Ingredients"
          items={INGREDIENT_ITEMS}
          pathname={pathname}
          active={
            !isActive(pathname, HSA_GUIDE) &&
            [...INGREDIENT_ITEMS.map((i) => i.href), "/ingredient", "/guide"].some((h) => isActive(pathname, h))
          }
        />
        {pill("/routines", "Routines", isActive(pathname, "/routines"))}
        {pill(
          "/for-clinicians",
          "For clinicians",
          ["/for-clinicians", "/clinic-tools", "/clinicians"].some((h) => isActive(pathname, h)),
          "text-xs",
        )}
        <div className="ml-1">
          <NavMenu
            label="My skin"
            icon={<UserRound className="h-4 w-4" />}
            items={MY_SKIN_ITEMS}
            pathname={pathname}
            align="right"
            active={[...MY_SKIN_ITEMS.map((i) => i.href), "/account"].some((h) => isActive(pathname, h))}
          />
        </div>
      </nav>
      <MobileMenu pathname={pathname} concerns={concerns} showSearch={showSearch} />
    </>
  );
}

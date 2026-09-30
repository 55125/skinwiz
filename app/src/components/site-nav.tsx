"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, UserRound, X } from "lucide-react";
import { cn } from "@/lib/utils";

const PRIMARY_ITEMS = [
  { href: "/browse", label: "Browse" },
  { href: "/ingredients", label: "Ingredients" },
  { href: "/check", label: "Checker" },
  { href: "/routines", label: "Routines" },
];

// Personal pages live under one menu so the bar stays short; "For
// clinicians" and "About" are in the footer (and in the mobile menu).
const YOU_ITEMS = [
  { href: "/profile", label: "My skin", hint: "Skin type, concerns, likes" },
  { href: "/shelf", label: "My shelf", hint: "What you own, want, finished" },
  { href: "/avoid", label: "My avoid list", hint: "Ingredients to screen out" },
];

const SECONDARY_ITEMS = [
  { href: "/for-clinicians", label: "For clinicians" },
  { href: "/about", label: "About" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

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

function YouMenu({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), ref);
  const active = YOU_ITEMS.some((i) => isActive(pathname, i.href));
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors",
          active || open ? "border-brand/30 bg-brand-soft text-brand-foreground" : "hover:bg-muted",
        )}
      >
        <UserRound className="h-4 w-4" />
        You
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-64 rounded-2xl border bg-popover p-1.5 shadow-xl shadow-foreground/5"
        >
          {YOU_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className="block rounded-xl px-3 py-2 transition-colors hover:bg-muted aria-[current=page]:bg-brand-soft"
            >
              <span className="block text-sm font-medium">{item.label}</span>
              <span className="block text-xs text-muted-foreground">{item.hint}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function MobileMenu({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), ref);
  const link = (item: { href: string; label: string }) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={() => setOpen(false)}
      aria-current={isActive(pathname, item.href) ? "page" : undefined}
      className="rounded-xl px-3 py-2.5 text-[15px] transition-colors hover:bg-muted aria-[current=page]:bg-brand-soft aria-[current=page]:font-medium aria-[current=page]:text-brand-foreground"
    >
      {item.label}
    </Link>
  );
  return (
    <div ref={ref} className="md:hidden">
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
        <div className="absolute inset-x-0 top-full z-30 border-b bg-background px-4 pb-5 pt-2 shadow-xl shadow-foreground/5">
          <nav className="flex flex-col">
            {PRIMARY_ITEMS.map(link)}
            <p className="mt-3 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">You</p>
            {YOU_ITEMS.map(link)}
            <div className="mt-3 border-t pt-3" />
            {SECONDARY_ITEMS.map(link)}
          </nav>
        </div>
      )}
    </div>
  );
}

export function SiteNav() {
  const pathname = usePathname();
  return (
    <>
      <nav className="hidden items-center gap-1 text-sm md:flex">
        {PRIMARY_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 transition-colors",
                active
                  ? "bg-brand-soft font-medium text-brand-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
        <div className="ml-2">
          <YouMenu pathname={pathname} />
        </div>
      </nav>
      <MobileMenu pathname={pathname} />
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/browse", label: "Browse" },
  { href: "/ingredients", label: "Ingredients" },
  { href: "/check", label: "Checker" },
  { href: "/routines", label: "Routines" },
  { href: "/profile", label: "My skin" },
  { href: "/shelf", label: "My shelf" },
  { href: "/avoid", label: "My avoid list" },
  { href: "/for-clinicians", label: "For clinicians" },
  { href: "/about", label: "About" },
];

export function SiteNav() {
  const pathname = usePathname();
  return (
    <nav className="-mx-2 flex items-center gap-1 overflow-x-auto text-sm">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
    </nav>
  );
}

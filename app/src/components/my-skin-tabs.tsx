"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MY_SKIN_ITEMS, isActive } from "@/lib/nav";
import { cn } from "@/lib/utils";

// One row of tabs across the four personal pages so they read as one place.
export function MySkinTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="My skin" className="-mx-4 overflow-x-auto px-4">
      <div className="flex w-max gap-1 rounded-full border bg-card p-1 text-sm">
        {MY_SKIN_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 transition-colors",
                active ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

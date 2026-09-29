import Link from "next/link";
import { Sparkles } from "lucide-react";
import { SiteNav } from "@/components/site-nav";

export function SiteLogo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <Sparkles className="h-4 w-4" />
      </span>
      <span className="text-[17px]">SkinWiz</span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:py-0">
        <SiteLogo />
        <SiteNav />
      </div>
    </header>
  );
}

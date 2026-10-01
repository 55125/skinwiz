import Link from "next/link";
import { SiteLogoMark } from "@/components/site-logo-mark";
import { SiteNav } from "@/components/site-nav";
import { SITE_NAME } from "@/lib/brand";

export function SiteLogo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
      <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary text-primary-foreground shadow-sm">
        <SiteLogoMark className="h-6 w-6" />
      </span>
      <span className="font-display text-[19px] font-medium tracking-[-0.02em]">{SITE_NAME}</span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <SiteLogo />
        <SiteNav />
      </div>
    </header>
  );
}

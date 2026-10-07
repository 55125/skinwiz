import Link from "next/link";
import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";
import { SearchBar } from "@/components/search-bar";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center space-y-6">
      <h1 className="text-3xl font-semibold">We couldn&apos;t find that page</h1>
      <p className="text-muted-foreground">
        The product or page may have moved, or the link may be mistyped. Try a search, or start from a skin concern.
      </p>
      <SearchBar />
      <div className="flex justify-center gap-3">
        <Link href="/" className={buttonVariants()}>
          Home
        </Link>
        <Link href="/browse" className={buttonVariants({ variant: "outline" })}>
          All products
        </Link>
      </div>
    </div>
  );
}

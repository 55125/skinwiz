import Link from "next/link";
import { Sparkles } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-5 w-5 text-sky-600" />
          SkinWiz
        </Link>
        <nav className="flex items-center gap-5 text-sm text-muted-foreground">
          <Link href="/concern/acne" className="hover:text-foreground">
            Acne
          </Link>
          <Link href="/concern/sun-protection" className="hover:text-foreground">
            Sun Protection
          </Link>
          <Link href="/for-clinicians" className="hover:text-foreground">
            For Clinicians
          </Link>
          <Link href="/about" className="hover:text-foreground">
            About
          </Link>
        </nav>
      </div>
    </header>
  );
}

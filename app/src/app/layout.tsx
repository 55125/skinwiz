import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SkinWiz — Derm-verified skincare, ingredient by ingredient",
  description:
    "Find OTC skincare products by active ingredient, with a board-certified dermatologist score and a real-outcome audience score — not guesses from an ingredient list.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Impact affiliate network domain verification -- literal tag as
            given (note: Impact's snippet uses value=, not the standard
            content= attribute; Next's metadata API would normalize that
            away, so this is added as raw JSX instead to preserve it
            exactly). React's meta-tag typing has no `value` attribute
            (it's non-standard), hence the cast. Site-wide via the root
            layout rather than homepage-only since that's a superset of
            what Impact asked for. */}
        {/* eslint-disable-next-line react/no-unknown-property */}
        <meta name="impact-site-verification" {...({ value: "564231ad-1299-4483-8468-d82b52da5637" } as Record<string, string>)} />
      </head>
      <body className="min-h-full flex flex-col">
        <TooltipProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </TooltipProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Display serif for h1/h2 only (see globals.css); body and card titles stay
// in Geist so dense UI text keeps its compact sans look.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SkinWiz — OTC skincare, ingredient by ingredient",
  description:
    "Find OTC skincare products by active ingredient, scored separately by dermatologists and by real reported outcomes — not guesses from an ingredient list.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
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
        <meta name="impact-site-verification" {...({ value: "564231ad-1299-4483-8468-d82b52da5637" } as Record<string, string>)} />
      </head>
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

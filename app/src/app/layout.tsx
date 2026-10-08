import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { siteUrl } from "@/lib/site-url";
import { SITE_NAME } from "@/lib/brand";
import { AnalyticsBeacon } from "@/components/analytics-beacon";

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

const SITE_DESCRIPTION =
  "Find OTC skincare products by active ingredient, scored by real reported outcomes, not guesses from an ingredient list. A verified dermatologist panel is in the works.";

// metadataBase lets every page give relative canonical/OpenGraph URLs; the
// title template appends the brand so pages set only their own title.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SITE_NAME} — OTC skincare, ingredient by ingredient`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  // No og:title/description here: child pages don't merge openGraph, so a
  // root value would be inherited verbatim by every page. Without one,
  // share previews fall back to each page's own <title> and description.
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_US" },
  twitter: { card: "summary" },
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
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:shadow"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">{children}</main>
        <SiteFooter />
        <AnalyticsBeacon />
      </body>
    </html>
  );
}

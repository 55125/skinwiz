import type { Metadata } from "next";
import { RetryButton } from "./retry-button";

export const metadata: Metadata = {
  title: "You're offline",
  robots: { index: false },
};

// Served by the service worker (public/sw.js) when a page can't load.
export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-20 text-center">
      <h1 className="text-3xl font-semibold">You&apos;re offline</h1>
      <p className="text-muted-foreground">
        This page needs a connection. Your shelf and regimen are saved on our side, so they&apos;ll be here when you&apos;re back online.
      </p>
      <RetryButton />
    </div>
  );
}

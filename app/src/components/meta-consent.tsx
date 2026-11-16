"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CONSENT_EVENT,
  adClickFbc,
  captureAdClick,
  getConsent,
  loadPixel,
  metaEligible,
  pendingLanding,
  pixelEvent,
  pixelLoaded,
  pixelPageView,
  setConsent,
} from "@/lib/meta-client";
import { META_EVENTS, validPixelId, type MetaConsent } from "@/lib/meta-shared";

// Meta ad measurement for visitors who arrived from one of our ads (rules in
// lib/meta-shared.ts). Renders nothing for everyone else. For an ad visitor
// who hasn't chosen yet, a small notice asks whether Meta's pixel may load;
// it loads only after "Allow". "Don't share anything" also stops the
// server-side events. The choice can be changed on /privacy#choices.

const DISMISSED = "sw_meta_notice_dismissed"; // sessionStorage: "Not now" for this tab

export function MetaConsent() {
  const pathname = usePathname();
  const [eligible, setEligible] = useState(false);
  const [consent, setConsentState] = useState<MetaConsent>(null);
  const [pixelId, setPixelId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    function refresh() {
      captureAdClick();
      setEligible(metaEligible());
      setConsentState(getConsent());
      try {
        setDismissed(window.sessionStorage.getItem(DISMISSED) === "1");
      } catch {
        // ignore
      }
    }
    refresh();
    window.addEventListener(CONSENT_EVENT, refresh);
    return () => window.removeEventListener(CONSENT_EVENT, refresh);
  }, []);

  // Only ad visitors ask the server whether Meta is set up.
  useEffect(() => {
    if (!eligible || pixelId) return;
    let cancelled = false;
    fetch("/api/meta/config", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { pixelId?: unknown } | null) => {
        if (!cancelled && validPixelId(d?.pixelId)) setPixelId(d.pixelId);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [eligible, pixelId]);

  const pixelAllowed = Boolean(pixelId && eligible && consent === "granted");

  useEffect(() => {
    if (!pixelAllowed || !pixelId) return;
    const fbc = adClickFbc();
    if (!fbc) return;
    const firstLoad = !pixelLoaded();
    loadPixel(pixelId, fbc);
    // The landing was sent server-side before the visitor chose; the pixel
    // sends its copy with the same event id, which Meta deduplicates.
    if (firstLoad) {
      const landing = pendingLanding();
      if (landing) pixelEvent(META_EVENTS.landing, landing.eventId);
    }
  }, [pixelAllowed, pixelId]);

  useEffect(() => {
    if (pixelAllowed) pixelPageView();
  }, [pathname, pixelAllowed]);

  if (!eligible || !pixelId || consent !== null || dismissed || pathname.startsWith("/privacy")) return null;

  function notNow() {
    try {
      window.sessionStorage.setItem(DISMISSED, "1");
    } catch {
      // ignore
    }
    setDismissed(true);
  }

  return (
    <div
      role="region"
      aria-label="Ad measurement choice"
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4 sm:left-auto sm:right-4 sm:max-w-md sm:px-0"
    >
      <div className="relative rounded-xl border bg-background p-4 pr-10 text-sm shadow-lg">
        <button
          type="button"
          onClick={notNow}
          aria-label="Not now"
          className="absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
        <p className="font-medium text-foreground">You came here from one of our ads</p>
        <p className="mt-1 text-muted-foreground">
          We tell Meta (Facebook and Instagram) only that you arrived and whether you clicked through to a store,
          never what you looked at. May we also load Meta&apos;s pixel? It lets Meta see which pages you visit here,
          which can show a product or skin concern.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setConsent("granted")}>
            Allow pixel
          </Button>
          <Button size="sm" variant="outline" onClick={() => setConsent("denied")}>
            Don&apos;t share anything
          </Button>
          <Link href="/privacy#meta" className="text-xs text-muted-foreground underline">
            Details
          </Link>
        </div>
      </div>
    </div>
  );
}

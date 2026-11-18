"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  CONSENT_EVENT,
  adClickFbc,
  captureAdClick,
  fetchMetaConfig,
  getConsent,
  loadPixel,
  metaEligible,
  pendingLanding,
  pixelEvent,
  pixelLoaded,
  pixelPageView,
  setConsent,
} from "@/lib/meta-client";
import { META_EVENTS, type MetaConsent } from "@/lib/meta-shared";

// Meta ad measurement for visitors who arrived from one of our ads (rules in
// lib/meta-shared.ts). Renders nothing for everyone else. Where the
// visitor's location needs consent (consentRequiredFor), a slim bar asks
// whether Meta's pixel may load, and it loads only after "Allow"; "Decline"
// also stops the server-side events. Elsewhere the pixel loads without a
// notice. Either way the choice can be changed on /privacy#choices.

export function MetaConsent() {
  const pathname = usePathname();
  const [eligible, setEligible] = useState(false);
  const [consent, setConsentState] = useState<MetaConsent>(null);
  const [pixelId, setPixelId] = useState<string | null>(null);
  const [consentRequired, setConsentRequired] = useState(true);

  useEffect(() => {
    function refresh() {
      captureAdClick();
      setEligible(metaEligible());
      setConsentState(getConsent());
    }
    refresh();
    window.addEventListener(CONSENT_EVENT, refresh);
    return () => window.removeEventListener(CONSENT_EVENT, refresh);
  }, []);

  // Only ad visitors ask the server whether Meta is set up, and whether
  // their location needs the notice.
  useEffect(() => {
    if (!eligible || pixelId) return;
    let cancelled = false;
    fetchMetaConfig().then((c) => {
      if (cancelled || !c.pixelId) return;
      setConsentRequired(c.consentRequired);
      setPixelId(c.pixelId);
    });
    return () => {
      cancelled = true;
    };
  }, [eligible, pixelId]);

  const pixelAllowed = Boolean(pixelId && eligible && (consent === "granted" || (consent === null && !consentRequired)));

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

  if (!eligible || !pixelId || !consentRequired || consent !== null || pathname.startsWith("/privacy")) return null;

  return (
    <div
      role="region"
      aria-label="Ad measurement choice"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] backdrop-blur supports-[backdrop-filter]:bg-background/85"
    >
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-xs sm:text-sm">
        <p className="min-w-0 flex-1 leading-snug text-muted-foreground">
          Allow Meta&apos;s ad pixel? It can see the pages you visit here.{" "}
          <Link href="/privacy#meta" className="whitespace-nowrap underline hover:text-foreground">
            Details
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="outline" onClick={() => setConsent("denied")}>
            Decline
          </Button>
          <Button size="sm" variant="outline" onClick={() => setConsent("granted")}>
            Allow
          </Button>
        </div>
      </div>
    </div>
  );
}

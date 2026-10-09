"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// First-party, cookieless site statistics (lib/analytics/, POST /api/e).
// Sends a pageview on each navigation, outbound link clicks (retailer
// host only), and clicks on elements marked data-track="tool-name". Under
// Global Privacy Control or Do Not Track it sends only the bare kind of a
// page view or outbound click, which the server adds to a daily count; the
// server checks the same signals again.

function optedOut(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.globalPrivacyControl === true || nav.doNotTrack === "1";
}

export function sendEvent(body: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const counted = optedOut();
  if (counted && body.kind !== "pageview" && body.kind !== "outbound") return;
  try {
    const payload = JSON.stringify(counted ? { kind: body.kind } : { path: window.location.pathname, ...body });
    if (navigator.sendBeacon?.("/api/e", new Blob([payload], { type: "application/json" }))) return;
    void fetch("/api/e", { method: "POST", body: payload, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
  } catch {
    // statistics must never break a page
  }
}

let firstView = true;

export function AnalyticsBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const params = new URLSearchParams(window.location.search);
    sendEvent({
      kind: "pageview",
      // Only the landing page has a meaningful external referrer.
      referrer: firstView ? document.referrer : "",
      utm_source: params.get("utm_source") ?? params.get("ref"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
    });
    firstView = false;
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!(e.target instanceof Element)) return;
      const tracked = e.target.closest<HTMLElement>("[data-track]");
      if (tracked?.dataset.track) {
        sendEvent({ kind: "tool", tool: tracked.dataset.track });
        return;
      }
      const a = e.target.closest<HTMLAnchorElement>("a[href]");
      if (!a) return;
      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if ((url.protocol === "http:" || url.protocol === "https:") && url.host !== window.location.host) {
        sendEvent({ kind: "outbound", href: url.href });
      }
    }
    // auxclick catches middle-click "open in new tab".
    document.addEventListener("click", onClick, { capture: true });
    document.addEventListener("auxclick", onClick, { capture: true });
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("auxclick", onClick, { capture: true });
    };
  }, []);

  return null;
}

/** Rendered by the search page: records the term and how many results it found. */
export function SearchBeacon({ term, results }: { term: string; results: number }) {
  useEffect(() => {
    if (term) sendEvent({ kind: "search", term, results });
  }, [term, results]);
  return null;
}

/** Rendered by the error boundaries: counts client-side crashes (digest only). */
export function ErrorBeacon({ digest }: { digest?: string }) {
  useEffect(() => {
    sendEvent({ kind: "client_error", digest: digest ?? "" });
  }, [digest]);
  return null;
}

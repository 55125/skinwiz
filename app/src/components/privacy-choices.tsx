"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CONSENT_EVENT, adClickFbc, browserOptedOut, fetchMetaConfig, getConsent, pixelLoaded, setConsent } from "@/lib/meta-client";
import type { MetaConsent } from "@/lib/meta-shared";

// "Your privacy choices" on /privacy#choices: the Meta ad-measurement
// setting for this browser (components/meta-consent.tsx asks ad visitors
// the same question where the law needs consent; elsewhere the pixel is on by
// default for ad visitors and this is where to turn it off). Opting out also
// deletes Meta's cookies here.

type State = { optedOut: boolean; consent: MetaConsent; fromAd: boolean } | null;

function current(): State {
  return { optedOut: browserOptedOut(), consent: getConsent(), fromAd: adClickFbc() !== null };
}

export function PrivacyChoices() {
  const [state, setState] = useState<State>(null);
  // Whether the pixel waits for "Allow" here; true until the server says otherwise.
  const [consentRequired, setConsentRequired] = useState(true);

  useEffect(() => {
    const refresh = () => setState(current());
    refresh();
    window.addEventListener(CONSENT_EVENT, refresh);
    return () => window.removeEventListener(CONSENT_EVENT, refresh);
  }, []);

  useEffect(() => {
    if (!state?.fromAd) return;
    let cancelled = false;
    fetchMetaConfig().then((c) => {
      if (!cancelled) setConsentRequired(c.pixelId === null || c.consentRequired);
    });
    return () => {
      cancelled = true;
    };
  }, [state?.fromAd]);

  if (!state) return null;

  if (state.optedOut) {
    return (
      <p className="rounded-lg border bg-muted/40 p-4 text-sm">
        Your browser sends a Global Privacy Control or Do Not Track signal, so nothing from this browser is shared
        with Meta and no shopping link goes through Sovrn.
      </p>
    );
  }

  let status: string;
  if (state.consent === "denied") status = "Nothing from this browser is shared with Meta.";
  else if (state.fromAd && (state.consent === "granted" || !consentRequired))
    status = "Meta's pixel is on in this browser while you're within 7 days of clicking one of our ads.";
  else if (state.fromAd)
    status = "You came from one of our ads, so we tell Meta that you arrived and whether you clicked through to a store. Meta's pixel is off.";
  else status = "You haven't come from one of our ads in the last 7 days, so nothing from this browser is being shared with Meta.";

  function optOut() {
    const reload = pixelLoaded();
    setConsent("denied");
    // The pixel can't be unloaded from a running page.
    if (reload) window.location.reload();
  }

  return (
    <div className="rounded-lg border bg-muted/40 p-4 text-sm">
      <p>
        <strong className="text-foreground">This browser:</strong> {status}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {state.consent !== "denied" && (
          <Button size="sm" variant="outline" onClick={optOut}>
            Don&apos;t share anything with Meta
          </Button>
        )}
        {state.consent === "denied" && (
          <Button size="sm" variant="outline" onClick={() => setConsent(null)}>
            {consentRequired ? "Undo: ask me next time I come from an ad" : "Undo"}
          </Button>
        )}
        {state.consent === null && state.fromAd && consentRequired && (
          <Button size="sm" variant="outline" onClick={() => setConsent("granted")}>
            Allow Meta&apos;s pixel
          </Button>
        )}
      </div>
    </div>
  );
}

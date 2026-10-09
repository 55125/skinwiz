"use client";

import { useState, useSyncExternalStore } from "react";
import { Share, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE_NAME } from "@/lib/brand";
import { getInstallPrompt, isIOS, isStandalone, onInstallPromptChange } from "@/lib/install-prompt";

const DISMISS_KEY = "install-card-dismissed";

type Mode = "hidden" | "prompt" | "ios";

// "Add to your home screen" on the My skin pages. Chrome/Edge/Android get a
// one-tap Install button; iPhone and iPad get Share-menu steps, since Safari
// has no install API. Hidden when already installed, on browsers that can't
// install, and for good once dismissed.
export function InstallAppCard() {
  const current = useSyncExternalStore(onInstallPromptChange, currentMode, (): Mode => "hidden");
  const [closed, setClosed] = useState(false);
  const mode: Mode = closed ? "hidden" : current;

  if (mode === "hidden") return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setClosed(true);
  }

  async function install() {
    const e = getInstallPrompt();
    if (!e) return;
    await e.prompt();
    const { outcome } = await e.userChoice;
    if (outcome === "accepted") setClosed(true);
  }

  return (
    <section aria-labelledby="install-card-title" className="relative space-y-2 rounded-2xl border bg-card p-5 pr-12">
      <Button variant="ghost" size="icon-sm" onClick={dismiss} aria-label="Not now" className="absolute right-3 top-3">
        <X />
      </Button>
      <h2 id="install-card-title" className="flex items-center gap-2 text-lg">
        <Smartphone className="h-5 w-5 text-brand" aria-hidden /> Add {SITE_NAME} to your home screen
      </h2>
      {mode === "prompt" ? (
        <>
          <p className="text-sm text-muted-foreground">
            Opens full screen, one tap from your home screen. No app store and nothing big to download.
          </p>
          <Button data-track="install-app" onClick={install}>
            Install
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Tap <Share className="inline h-4 w-4 align-text-bottom" aria-label="Share" /> in your browser, then{" "}
            <span className="font-medium text-foreground">Add to Home Screen</span>. It opens full screen, like an app.
          </p>
          <p className="text-xs text-muted-foreground">
            On iPhone and iPad the home-screen version keeps its own storage, separate from Safari, so it starts empty. To bring your shelf over, save it to your email here first, then enter the same email in the home-screen version and type the 6-digit code we send.
          </p>
        </>
      )}
    </section>
  );
}

function currentMode(): Mode {
  if (isStandalone() || dismissed()) return "hidden";
  if (isIOS()) return "ios";
  return getInstallPrompt() ? "prompt" : "hidden";
}

function dismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

"use client";

import { useEffect } from "react";
import { setInstallPrompt, type InstallPromptEvent } from "@/lib/install-prompt";

// Registers public/sw.js (installable app + offline page) in production
// builds only, so `next dev` never serves stale files from a worker. Also
// holds on to Chrome's install prompt for <InstallAppCard />.
export function ServiceWorker() {
  useEffect(() => {
    function onPrompt(e: Event) {
      e.preventDefault();
      setInstallPrompt(e as InstallPromptEvent);
    }
    function onInstalled() {
      setInstallPrompt(null);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return null;
}

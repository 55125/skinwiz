// Chrome and Edge fire `beforeinstallprompt` once, early, on whatever page
// loads first. <ServiceWorker /> (always mounted) keeps it here so the
// install card on My skin pages can use it after a client-side navigation.

export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

export function setInstallPrompt(e: InstallPromptEvent | null): void {
  deferred = e;
  listeners.forEach((fn) => fn());
}

export function getInstallPrompt(): InstallPromptEvent | null {
  return deferred;
}

export function onInstallPromptChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Running as the installed home-screen app rather than in a browser tab. */
export function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

/** iPhone or iPad, where installing is only possible from the Share menu. */
export function isIOS(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

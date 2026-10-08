"use client";

import { useCallback, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ORIGIN_COOKIE, parseOrigin, type OriginId } from "@/lib/origin-shared";

// The header's region pick lives in a plain (not httpOnly) cookie: it is a
// display preference, not identity, and setting it from the browser keeps
// the header free of server work so pages without data still prerender.
// Listing pages read it on the server (lib/origin.ts readOrigin).
const ONE_YEAR = 60 * 60 * 24 * 365;
const listeners = new Set<() => void>();

function read(): OriginId | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${ORIGIN_COOKIE}=([^;]*)`));
  return parseOrigin(match?.[1]);
}

function write(origin: OriginId | undefined) {
  const secure = location.protocol === "https:" ? "; secure" : "";
  document.cookie = origin
    ? `${ORIGIN_COOKIE}=${origin}; path=/; max-age=${ONE_YEAR}; samesite=lax${secure}`
    : `${ORIGIN_COOKIE}=; path=/; max-age=0; samesite=lax${secure}`;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Pages whose product lists follow the pick; picking a region anywhere else
// goes to the full catalog so the choice shows.
const LISTING = /^\/(browse|search|concern\/[^/]+)$/;

export function useOrigin(): [OriginId | undefined, (next: OriginId | undefined) => void] {
  const origin = useSyncExternalStore(subscribe, read, () => undefined);
  const router = useRouter();
  const pathname = usePathname();
  const set = useCallback(
    (next: OriginId | undefined) => {
      write(next);
      if (next && !LISTING.test(pathname)) router.push("/browse");
      else router.refresh();
    },
    [pathname, router],
  );
  return [origin, set];
}

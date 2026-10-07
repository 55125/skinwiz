// Small in-process cache for catalog-only reads (no per-visitor data) that
// are expensive enough to matter under load. The catalog only changes when
// db:seed runs at boot, so a few minutes of staleness is invisible; per
// process, like the rate limiters, which suits the single-container deploy.
export function ttlCache<A extends unknown[], R>(
  fn: (...args: A) => R,
  { ttlMs = 10 * 60_000, max = 2_000 }: { ttlMs?: number; max?: number } = {},
): (...args: A) => R {
  const entries = new Map<string, { at: number; value: R }>();
  return (...args: A): R => {
    const key = JSON.stringify(args);
    const now = Date.now();
    const hit = entries.get(key);
    if (hit && now - hit.at < ttlMs) return hit.value;
    const value = fn(...args);
    if (entries.size >= max) entries.clear();
    entries.set(key, { at: now, value });
    return value;
  };
}

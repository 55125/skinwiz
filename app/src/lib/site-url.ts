// Read at request time (not a NEXT_PUBLIC_ var, which Next inlines at build
// time). SITE_URL wins once a custom domain exists; otherwise Railway's own
// public domain, which it injects into every deployment.
export function siteUrl(): string {
  const explicit = process.env.SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const railway = process.env.RAILWAY_PUBLIC_DOMAIN;
  if (railway) return `https://${railway}`;
  return "http://localhost:3000";
}

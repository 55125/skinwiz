// Read at request time (not a NEXT_PUBLIC_ var, which Next inlines at build
// time). SITE_URL wins once a custom domain exists; otherwise Railway's own
// public domain, which it injects into every deployment.
export function siteUrl(): string {
  const explicit = process.env.SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const railway = process.env.RAILWAY_PUBLIC_DOMAIN;
  if (railway) return `https://${railway}`;
  // The Docker build has no public domain in its env, but statically
  // prerendered pages (about, terms...) bake canonical/OpenGraph URLs in at
  // build time -- so a production build falls back to the live domain
  // rather than localhost. Set SITE_URL at build time too once a custom
  // domain exists.
  return process.env.NODE_ENV === "production" ? PRODUCTION_URL : "http://localhost:3000";
}

const PRODUCTION_URL = "https://skinwiz-production.up.railway.app";

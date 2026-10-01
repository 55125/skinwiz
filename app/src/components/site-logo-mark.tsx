// A droplet carrying a "+": skincare with an active ingredient in it. The drop
// is currentColor so it follows the tile; the plus is cut out in --primary.
export function SiteLogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path d="M12 1.6C8 6.8 4.8 10.5 4.8 14.6a7.2 7.2 0 0 0 14.4 0c0-4.1-3.2-7.8-7.2-13Z" fill="currentColor" />
      <rect x="11" y="11.4" width="2" height="7.2" rx="1" fill="var(--primary)" />
      <rect x="8.4" y="14" width="7.2" height="2" rx="1" fill="var(--primary)" />
    </svg>
  );
}

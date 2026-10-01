// A droplet with a small four-point spark (from the SkinWiz era) without the
// stock Sparkles icon. Drawn with currentColor so it follows the tile.
export function SiteLogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M11 3.5c-3.2 4-5.5 7.1-5.5 10.1a5.5 5.5 0 0 0 11 0c0-3-2.3-6.1-5.5-10.1Z"
        fill="currentColor"
        fillOpacity="0.95"
      />
      <path
        d="M18.5 3l.75 1.75L21 5.5l-1.75.75L18.5 8l-.75-1.75L16 5.5l1.75-.75Z"
        fill="currentColor"
      />
      <path d="M8.6 14.2a2.6 2.6 0 0 0 2.2 2.4" stroke="var(--primary)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

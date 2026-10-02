// Where "Find a board-certified dermatologist" links go. Today it's the
// AAD's free public directory, with no relationship to us. If a referral
// partner is added later, change it here only: set `paid: true` and the
// component shows an FTC-style disclosure next to the link (project.md §2 --
// clear, conspicuous, not footer-buried).
export type DermFinder = {
  href: string;
  label: string;
  /** Who runs it, shown under the link. */
  provider: string;
  /** A paid or referral relationship that must be disclosed next to the link. */
  paid: boolean;
  disclosure?: string;
};

export const DERM_FINDER: DermFinder = {
  href: "https://find-a-derm.aad.org/",
  label: "Find a board-certified dermatologist",
  provider: "American Academy of Dermatology's free public directory. We have no relationship with any listed practice.",
  paid: false,
};

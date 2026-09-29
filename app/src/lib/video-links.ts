// Deep-links to a review search for a product, not curated/vetted results
// — see product/[id]/page.tsx for why these render as plainly-labeled
// "search" buttons rather than embedded videos: nothing here has been
// screened, and framing it as a real result set would misrepresent it.
//
// YouTube also has a real fetch path (scripts/fetch-youtube-videos.ts +
// the video_links table) for when YOUTUBE_API_KEY is set — this file's
// searchUrl is the fallback for every product until that's been run, and
// remains the only option for TikTok/Instagram, neither of which has an
// accessible free search API for a small/solo site (TikTok's official API
// requires business approval; Instagram's Graph API requires Business
// verification and doesn't expose public keyword search at all).

function reviewQuery(brandName: string): string {
  // Long marketing-tagline brand names (see tools/catalog_pipeline/README.md's
  // known-issues section) make for a bad search query — keep the first few words.
  const words = brandName.split(/\s+/).slice(0, 6).join(" ");
  return `${words} review`;
}

export function getVideoSearchLinks(brandName: string) {
  const query = encodeURIComponent(reviewQuery(brandName));
  return {
    youtube: `https://www.youtube.com/results?search_query=${query}`,
    tiktok: `https://www.tiktok.com/search?q=${query}`,
    // Instagram has no general keyword-search URL for logged-out users;
    // a hashtag page is the closest honest equivalent.
    instagram: `https://www.instagram.com/explore/tags/${instagramTag(brandName)}/`,
  };
}

// First real word of the name: skips numbers and fragments like "100%" or
// "5", which produced meaningless tags such as #100.
function instagramTag(brandName: string): string {
  const word = brandName
    .toLowerCase()
    .split(/[^a-z]+/)
    .find((w) => w.length >= 3);
  return word ?? "skincare";
}

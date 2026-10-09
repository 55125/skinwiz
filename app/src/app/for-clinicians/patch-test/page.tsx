import { permanentRedirect } from "next/navigation";

// The tick-the-positives results sheet is now a mode of the patch-test
// reader. Old links and printed bookmarks (including starter lists' ?list=)
// land there.
export default async function PatchTestIssuePage({ searchParams }: { searchParams: Promise<{ list?: string }> }) {
  const { list } = await searchParams;
  permanentRedirect(`/clinic-tools/patch-test-reader?mode=tick${list ? `&list=${encodeURIComponent(list)}` : ""}`);
}

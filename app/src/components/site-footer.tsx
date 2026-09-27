import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-muted/30">
      <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-muted-foreground space-y-3">
        <p>
          <strong className="text-foreground">Not medical advice.</strong> SkinWiz provides educational
          information about OTC skincare ingredients and products. It does not diagnose any condition and
          does not create a doctor-patient relationship. Always talk to a board-certified dermatologist
          about your specific skin.
        </p>
        <p>
          <strong className="text-foreground">Affiliate disclosure.</strong> Some product links on this site
          are affiliate links — we may earn a commission if you buy through them, at no extra cost to you.
          This never affects Derm Score or Audience Score, which are independent of any commercial
          relationship.
        </p>
        <div className="flex gap-4 pt-2">
          <Link href="/about" className="underline hover:text-foreground">
            About &amp; methodology
          </Link>
          <Link href="/for-clinicians" className="underline hover:text-foreground">
            For clinicians
          </Link>
        </div>
      </div>
    </footer>
  );
}

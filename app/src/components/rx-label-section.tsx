// One prescribing-information section, quoted from the FDA label. Long
// sections start collapsed; the pipeline already capped each at ~6,000
// characters, and the DailyMed link has the rest.
export function RxLabelSection({
  title,
  text,
  open = false,
}: {
  title: string;
  text: string | null | undefined;
  open?: boolean;
}) {
  if (!text) return null;
  const paragraphs = text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  return (
    <details className="group rounded-2xl border bg-card p-4" open={open}>
      <summary className="cursor-pointer list-none font-semibold">
        <span className="mr-1 inline-block transition-transform group-open:rotate-90">›</span> {title}
        <span className="ml-2 text-xs font-normal text-muted-foreground">From the FDA label</span>
      </summary>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-foreground/85">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </details>
  );
}

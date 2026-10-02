import type { HandoutSection } from "@/lib/handout-types";
import { cn } from "@/lib/utils";

type Block = { kind: "p"; text: string } | { kind: "ul"; items: string[] };

/** A section body as paragraphs and bullet lists: blank line = new paragraph, "- " = bullet. */
export function bodyBlocks(body: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of body.split(/\n\s*\n/)) {
    let para: string[] = [];
    const flush = () => {
      if (para.length) blocks.push({ kind: "p", text: para.join(" ") });
      para = [];
    };
    for (const line of chunk.split("\n").map((l) => l.trim()).filter(Boolean)) {
      const bullet = /^[-•*]\s+(.*)$/.exec(line);
      if (!bullet) {
        para.push(line);
        continue;
      }
      flush();
      const last = blocks[blocks.length - 1];
      if (last?.kind === "ul") last.items.push(bullet[1]);
      else blocks.push({ kind: "ul", items: [bullet[1]] });
    }
    flush();
  }
  return blocks;
}

/** Education sections of a handout, for screen (tone "screen") or the printed sheet ("print"). */
export function HandoutSections({ sections, tone = "screen" }: { sections: HandoutSection[]; tone?: "screen" | "print" }) {
  if (sections.length === 0) return null;
  const print = tone === "print";
  return (
    <div className={cn(print ? "space-y-[3mm]" : "space-y-5")}>
      {sections.map((s, i) => (
        <section key={i} className={cn(print ? "break-inside-avoid" : "space-y-2")}>
          {s.heading && (
            <h3 className={cn(print ? "m-0 mb-[1mm] text-[11pt] font-semibold" : "text-base font-semibold")}>{s.heading}</h3>
          )}
          <div className={cn(print ? "space-y-[1.5mm] text-[9.5pt] leading-snug" : "space-y-2 text-sm leading-relaxed")}>
            {bodyBlocks(s.body).map((b, j) =>
              b.kind === "p" ? (
                <p key={j} className="m-0">
                  {b.text}
                </p>
              ) : (
                <ul key={j} className={cn("m-0 list-disc", print ? "pl-[5mm]" : "space-y-1 pl-5")}>
                  {b.items.map((it, k) => (
                    <li key={k}>{it}</li>
                  ))}
                </ul>
              ),
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

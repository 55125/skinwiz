"use client";

import { useState } from "react";
import { Check, ClipboardCopy } from "lucide-react";
import { Button } from "@/components/ui/button";

// Copies a line of text (a chart note, a link). When the clipboard is
// blocked the text is shown to select by hand.
export function CopyTextButton({ text, label = "Copy", copiedLabel = "Copied" }: { text: string; label?: string; copiedLabel?: string }) {
  const [copied, setCopied] = useState(false);
  const [show, setShow] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setShow(true);
    }
  }
  return (
    <span className="inline-flex flex-col gap-1">
      <Button type="button" size="sm" variant="outline" className="rounded-full print:hidden" onClick={copy}>
        {copied ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
        {copied ? copiedLabel : label}
      </Button>
      {show && <code className="block max-w-full select-all rounded bg-muted p-2 text-xs [overflow-wrap:anywhere]">{text}</code>}
    </span>
  );
}

"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QrCode } from "@/components/qr-code";
import { PrintSheet, useOrigin } from "@/components/patch-test-issuer";
import { avoidedIngredientName } from "@/lib/avoid-shared";
import { getFreeFromCheck } from "@/db/ingredient-flags";
import { IMPORT_CODES, buildImportPath } from "@/lib/avoid-import";

const SHAREABLE = new Set(IMPORT_CODES);

// The visitor's own saved list as an import link and QR code: to show a
// dermatologist, move to another phone, or hand to someone who shops for
// them. Same link format as the clinician sheet (/for-clinicians/patch-test),
// without clinic, date or note. Only allergens travel; free-from preferences
// (fragrance-free, alcohol-free...) aren't part of the format.
export function ShareAvoidList({ ids }: { ids: string[] }) {
  const origin = useOrigin();
  const [copied, setCopied] = useState(false);
  const shareable = ids.filter((id) => SHAREABLE.has(id));
  const left = ids.filter((id) => !SHAREABLE.has(id));
  if (shareable.length === 0) return null;

  const url = `${origin}${buildImportPath(shareable)}`;
  const ready = origin !== "";
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <details className="group/share rounded-2xl border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Share2 className="h-4.5 w-4.5" />
        </span>
        <span>
          <span className="block text-sm font-semibold">Share my allergen list</span>
          <span className="block text-xs text-muted-foreground">
            A link and QR code for your other phone, your dermatologist, or whoever shops for you.
          </span>
        </span>
      </summary>
      {ready && (
        <div className="grid gap-4 border-t p-4 sm:grid-cols-[176px_minmax(0,1fr)] sm:items-start">
          <QrCode value={url} className="mx-auto h-44 w-44" title="QR code for your allergen list" />
          <div className="space-y-3 text-sm">
            <p>
              Opening it shows {shareable.length === 1 ? "this allergen" : `these ${shareable.length} allergens`} with every
              name to look for on a label, and adds them to an avoid list in one tap:{" "}
              <span className="text-muted-foreground">{shareable.map(avoidedIngredientName).join(", ")}.</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {canShare && (
                <Button
                  type="button"
                  className="rounded-full"
                  onClick={() => navigator.share({ title: "My allergen list", url }).catch(() => {})}
                >
                  <Share2 className="h-4 w-4" /> Share
                </Button>
              )}
              <Button
                type="button"
                variant={canShare ? "outline" : "default"}
                className="rounded-full"
                onClick={async () => {
                  await navigator.clipboard?.writeText(url).catch(() => {});
                  setCopied(true);
                }}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy link"}
              </Button>
              <Button type="button" variant="outline" className="rounded-full" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Print
              </Button>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              The link itself is the list: nothing is stored on our side, and your name is never in it. Anyone with the
              link can see the allergens.
              {left.length > 0 && ` Your other settings (${left.map((id) => getFreeFromCheck(id)?.label ?? id).join(", ")}) aren't included.`}
            </p>
          </div>
        </div>
      )}
      {ready && createPortal(<PrintSheet url={url} ids={shareable} offLabel={[]} patient="" />, document.body)}
    </details>
  );
}

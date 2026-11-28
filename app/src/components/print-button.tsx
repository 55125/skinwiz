"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton({ label = "Print", track }: { label?: string; track?: string }) {
  return (
    <Button type="button" variant="outline" className="rounded-full print:hidden" data-track={track} onClick={() => window.print()}>
      <Printer className="h-4 w-4" /> {label}
    </Button>
  );
}

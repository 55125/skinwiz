"use client";

import { Button } from "@/components/ui/button";

// Reloads the page they were trying to open: the offline page is served in
// its place, at that page's own address.
export function RetryButton() {
  return <Button onClick={() => window.location.reload()}>Try again</Button>;
}

"use client"; // Error boundaries must be Client Components

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorBeacon } from "@/components/analytics-beacon";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center space-y-6">
      <ErrorBeacon digest={error.digest} />
      <h1 className="text-3xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground">
        This page hit a problem on our side. Trying again usually works; if it keeps happening, let us know.
      </p>
      <div className="flex justify-center gap-3">
        <Button onClick={() => retry()}>Try again</Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Home
        </Link>
      </div>
      {error.digest ? <p className="text-xs text-muted-foreground">Reference: {error.digest}</p> : null}
    </div>
  );
}

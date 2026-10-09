"use client"; // Replaces the root layout when it fails, so it brings its own <html>/<body>.

import Link from "next/link";
import { ErrorBeacon } from "@/components/analytics-beacon";

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", maxWidth: 560, margin: "80px auto", padding: "0 16px", textAlign: "center" }}>
        <ErrorBeacon digest={error.digest} />
        <h1>Something went wrong</h1>
        <p>The site hit a problem on our side. Please try again in a moment.</p>
        <p>
          <button onClick={() => retry()}>Try again</button> <Link href="/">Home</Link>
        </p>
        {error.digest ? <p style={{ fontSize: 12, color: "#666" }}>Reference: {error.digest}</p> : null}
      </body>
    </html>
  );
}

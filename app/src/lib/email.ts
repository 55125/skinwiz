// Outgoing email. One function, two providers:
// - Resend (https://resend.com) over its HTTP API when RESEND_API_KEY is set;
// - otherwise a development fallback that prints the message to the server
//   console, so the whole flow can be exercised locally without an account.
// Callers never talk to a provider directly.
import { SITE_NAME } from "@/lib/brand";

export type EmailCategory = "transactional" | "checkins" | "safety";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  category: EmailCategory;
  /** Required for every non-transactional email (RFC 8058 one-click). */
  unsubscribeUrl?: string;
  /** Lets the provider drop a duplicate send if a job retries (Resend keeps keys 24h). */
  idempotencyKey?: string;
};

export type SendResult = { ok: true; id: string | null } | { ok: false; error: string; retryable: boolean };

export function emailFrom(): string {
  return process.env.EMAIL_FROM ?? `${SITE_NAME} <hello@activelyskin.com>`;
}

export function emailProvider(): "resend" | "console" {
  return process.env.RESEND_API_KEY ? "resend" : "console";
}

function headersFor(msg: EmailMessage): Record<string, string> {
  if (msg.category === "transactional") return {};
  if (!msg.unsubscribeUrl) throw new Error(`A ${msg.category} email must carry an unsubscribe link.`);
  return {
    "List-Unsubscribe": `<${msg.unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

export async function sendEmail(msg: EmailMessage): Promise<SendResult> {
  const headers = headersFor(msg);
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(
      [
        "",
        "=== [email:console] ===============================================",
        `To: ${msg.to}`,
        `From: ${emailFrom()}`,
        `Subject: ${msg.subject}`,
        `Category: ${msg.category}`,
        ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`),
        "",
        msg.text,
        "===================================================================",
        "",
      ].join("\n"),
    );
    return { ok: true, id: null };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(msg.idempotencyKey ? { "Idempotency-Key": msg.idempotencyKey.slice(0, 256) } : {}),
      },
      body: JSON.stringify({
        from: emailFrom(),
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        headers,
        ...(process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) {
      const body = (await res.json().catch(() => null)) as { id?: string } | null;
      return { ok: true, id: body?.id ?? null };
    }
    const detail = await res.text().catch(() => "");
    // 429 and 5xx are worth retrying on the next run; 4xx (bad address,
    // unverified domain) are not.
    return { ok: false, error: `Resend ${res.status}: ${detail.slice(0, 300)}`, retryable: res.status === 429 || res.status >= 500 };
  } catch (err) {
    return { ok: false, error: `Resend request failed: ${(err as Error).message}`, retryable: true };
  }
}

// Resend's default limit is 2 requests/second per team; jobs space sends out.
export const SEND_SPACING_MS = 600;

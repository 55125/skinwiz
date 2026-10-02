// Plain, accessible email bodies: one column, real text (no images), high
// contrast, links that say where they go, and a text/plain twin for every
// HTML body. Each template returns { subject, html, text }.
import { SITE_NAME } from "@/lib/brand";

type Rendered = { subject: string; html: string; text: string };

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function layout(title: string, bodyHtml: string, footerHtml: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f6f6f4;color:#1c1c1a;font-family:${FONT};font-size:16px;line-height:1.5;">
<div role="article" aria-label="${escapeHtml(title)}" style="max-width:560px;margin:0 auto;padding:24px 16px;">
<p style="margin:0 0 16px;font-weight:600;font-size:18px;">${escapeHtml(SITE_NAME)}</p>
<div style="background:#ffffff;border:1px solid #e2e2dc;border-radius:12px;padding:24px;">
${bodyHtml}
</div>
<div style="padding:16px 4px;font-size:13px;color:#55554f;">
${footerHtml}
</div>
</div>
</body>
</html>`;
}

function button(href: string, label: string, color = "#1f5f4a"): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;margin:4px 6px 4px 0;padding:10px 18px;border-radius:999px;background:${color};color:#ffffff;text-decoration:none;font-weight:600;">${escapeHtml(label)}</a>`;
}

function p(html: string): string {
  return `<p style="margin:0 0 14px;">${html}</p>`;
}

const NOT_ADVICE = "Not medical advice. If your skin gets much worse, blisters, swells, or you have pain or fever, stop the product and see a board-certified dermatologist.";

// --- sign-in --------------------------------------------------------------

export function signInEmail(link: string): Rendered {
  const subject = `Your ${SITE_NAME} sign-in link`;
  const html = layout(
    subject,
    [
      p(`Use this link to save your shelf to this email address. It works once and expires in 15 minutes.`),
      p(button(link, "Confirm my email")),
      p(`Or paste this address into your browser:<br><a href="${escapeHtml(link)}" style="color:#1f5f4a;word-break:break-all;">${escapeHtml(link)}</a>`),
      p(`If you didn't ask for this, you can ignore this email. Nothing happens unless the link is used.`),
    ].join("\n"),
    `You're getting this one-time email because someone entered this address on ${escapeHtml(SITE_NAME)}.`,
  );
  const text = [
    `Use this link to save your shelf to this email address. It works once and expires in 15 minutes:`,
    "",
    link,
    "",
    `If you didn't ask for this, you can ignore this email. Nothing happens unless the link is used.`,
  ].join("\n");
  return { subject, html, text };
}

// --- check-ins ------------------------------------------------------------

export type CheckinEmailItem = {
  brandName: string;
  concernName: string;
  weeks: number;
  startedOn: string; // human date
  answerUrl: (answer: "better" | "same" | "worse" | "stopped") => string;
};

export function checkinEmail(items: CheckinEmailItem[], unsubscribeUrl: string, settingsUrl: string): Rendered {
  const first = items[0];
  const subject =
    items.length === 1
      ? `${first.weeks} weeks with ${first.brandName}: how's it going?`
      : `Quick check-in on ${items.length} products`;
  const blocks = items.map((it) => {
    const heading = `<h2 style="margin:0 0 6px;font-size:17px;">${escapeHtml(it.brandName)}</h2>`;
    const lead = p(
      `You started this on ${escapeHtml(it.startedOn)} (about ${it.weeks} weeks ago). Compared with then, how is your ${escapeHtml(it.concernName.toLowerCase())}?`,
    );
    const buttons = p(
      [
        button(it.answerUrl("better"), "Better"),
        button(it.answerUrl("same"), "About the same", "#4a4a44"),
        button(it.answerUrl("worse"), "Worse", "#8a3b2a"),
        button(it.answerUrl("stopped"), "I stopped using it", "#4a4a44"),
      ].join(" "),
    );
    return `<div style="margin:0 0 20px;">${heading}${lead}${buttons}</div>`;
  });
  const html = layout(
    subject,
    [
      p(`One tap per product. No sign-in needed. Your answer is anonymous on the site and only counts toward the aggregate User Score.`),
      ...blocks,
      `<p style="margin:0;font-size:14px;color:#55554f;">${escapeHtml(NOT_ADVICE)}</p>`,
    ].join("\n"),
    [
      `You're getting this because you turned on check-ins for products you opened on ${escapeHtml(SITE_NAME)}.`,
      `<a href="${escapeHtml(unsubscribeUrl)}" style="color:#55554f;">Unsubscribe from check-ins</a> · <a href="${escapeHtml(settingsUrl)}" style="color:#55554f;">Email settings</a>`,
    ].join("<br>"),
  );
  const text = [
    `One tap per product. No sign-in needed.`,
    "",
    ...items.flatMap((it) => [
      `${it.brandName}`,
      `You started this on ${it.startedOn} (about ${it.weeks} weeks ago). Compared with then, how is your ${it.concernName.toLowerCase()}?`,
      `  Better: ${it.answerUrl("better")}`,
      `  About the same: ${it.answerUrl("same")}`,
      `  Worse: ${it.answerUrl("worse")}`,
      `  I stopped using it: ${it.answerUrl("stopped")}`,
      "",
    ]),
    NOT_ADVICE,
    "",
    `Unsubscribe from check-ins: ${unsubscribeUrl}`,
    `Email settings: ${settingsUrl}`,
  ].join("\n");
  return { subject, html, text };
}

// --- recalls --------------------------------------------------------------

export type RecallEmailInput = {
  brandName: string;
  productUrl: string;
  classification: string | null;
  classMeaning: string | null;
  reason: string | null;
  initiated: string | null; // human date
  description: string;
  codeInfo: string | null;
  fdaUrl: string;
};

export function recallEmail(r: RecallEmailInput, unsubscribeUrl: string, settingsUrl: string): Rendered {
  const subject = `Recall notice: ${r.brandName}`;
  const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
  const facts = [
    r.classification && `<li><strong>${escapeHtml(r.classification)}</strong>${r.classMeaning ? ` — ${escapeHtml(r.classMeaning)}` : ""}</li>`,
    r.initiated && `<li>Recall started ${escapeHtml(r.initiated)}</li>`,
    r.reason && `<li>Reason: ${escapeHtml(truncate(r.reason, 400))}</li>`,
  ].filter(Boolean);
  const html = layout(
    subject,
    [
      p(`A product on your ${escapeHtml(SITE_NAME)} shelf matches an FDA drug recall: <strong>${escapeHtml(r.brandName)}</strong>.`),
      `<ul style="margin:0 0 14px;padding-left:20px;">${facts.join("")}</ul>`,
      p(`Recalls usually cover specific lots. Compare the lot number on your package with the FDA notice:`),
      `<p style="margin:0 0 14px;font-size:14px;color:#55554f;">${escapeHtml(truncate(r.codeInfo ?? r.description, 500))}</p>`,
      p(button(r.fdaUrl, "Read the FDA notice") + " " + button(r.productUrl, "See it on " + SITE_NAME, "#4a4a44")),
      p(`If yours is affected, stop using it and follow the instructions in the notice or from the store. If you've had a reaction, talk to a doctor or pharmacist.`),
    ].join("\n"),
    [
      `You're getting this because this product is on your shelf and safety alerts are on. We send each recall once.`,
      `<a href="${escapeHtml(unsubscribeUrl)}" style="color:#55554f;">Unsubscribe from safety alerts</a> · <a href="${escapeHtml(settingsUrl)}" style="color:#55554f;">Email settings</a>`,
    ].join("<br>"),
  );
  const text = [
    `A product on your ${SITE_NAME} shelf matches an FDA drug recall: ${r.brandName}.`,
    "",
    r.classification ? `${r.classification}${r.classMeaning ? ` — ${r.classMeaning}` : ""}` : null,
    r.initiated ? `Recall started ${r.initiated}` : null,
    r.reason ? `Reason: ${truncate(r.reason, 400)}` : null,
    "",
    `Recalls usually cover specific lots. Compare the lot number on your package with the FDA notice:`,
    truncate(r.codeInfo ?? r.description, 500),
    "",
    `FDA notice: ${r.fdaUrl}`,
    `On ${SITE_NAME}: ${r.productUrl}`,
    "",
    `If yours is affected, stop using it and follow the instructions in the notice or from the store. If you've had a reaction, talk to a doctor or pharmacist.`,
    "",
    `Unsubscribe from safety alerts: ${unsubscribeUrl}`,
    `Email settings: ${settingsUrl}`,
  ]
    .filter((l) => l !== null)
    .join("\n");
  return { subject, html, text };
}

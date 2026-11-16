// Meta Conversions API: the server copy of the two ad-measurement events
// (lib/meta-shared.ts says what is sent and when). POST /api/e calls
// metaEventFromBeacon() for each beacon and, when it returns an event,
// sends it after the response with sendMetaEvent().
//
// Railway variables (production service):
//   META_DATASET_ID       the dataset (pixel) id from Events Manager
//   META_CAPI_TOKEN       its Conversions API access token
//   META_TEST_EVENT_CODE  optional; while set, events show only under Test events
//   META_GRAPH_VERSION    optional; default below
// Without the first two, nothing is sent and the pixel never loads.
import { META_EVENTS, validEventId, validFbc, validFbp, validPixelId, type MetaEventName } from "./meta-shared";

const DEFAULT_GRAPH_VERSION = "v23.0";

export type MetaConfig = { datasetId: string; token: string; testCode: string | null; graphVersion: string };

export function metaConfig(env: NodeJS.ProcessEnv = process.env): MetaConfig | null {
  const datasetId = env.META_DATASET_ID?.trim();
  const token = env.META_CAPI_TOKEN?.trim();
  if (!validPixelId(datasetId) || !token) return null;
  const version = env.META_GRAPH_VERSION?.trim();
  return {
    datasetId,
    token,
    testCode: env.META_TEST_EVENT_CODE?.trim() || null,
    graphVersion: version && /^v\d{2,3}\.\d$/.test(version) ? version : DEFAULT_GRAPH_VERSION,
  };
}

/** The pixel id the browser may load, or null while Meta isn't configured. */
export function publicPixelId(env: NodeJS.ProcessEnv = process.env): string | null {
  return metaConfig(env)?.datasetId ?? null;
}

export type MetaBeaconEvent = { name: MetaEventName; eventId: string; fbc: string };

/**
 * The Meta event a beacon body asks for, or null. Only a landing page view
 * or a retailer click, and only with a well-formed event id and click id.
 */
export function metaEventFromBeacon(kind: string, body: unknown): MetaBeaconEvent | null {
  const meta = (body as { meta?: unknown } | null)?.meta as { event_id?: unknown; fbc?: unknown; landing?: unknown } | undefined;
  if (!meta || typeof meta !== "object") return null;
  if (!validEventId(meta.event_id) || !validFbc(meta.fbc)) return null;
  let name: MetaEventName | null = null;
  if (kind === "pageview" && meta.landing === true) name = META_EVENTS.landing;
  else if (kind === "outbound") name = META_EVENTS.retailerClick;
  return name ? { name, eventId: meta.event_id, fbc: meta.fbc } : null;
}

export type MetaServerEvent = {
  event_name: MetaEventName;
  event_time: number;
  event_id: string;
  action_source: "website";
  event_source_url: string;
  user_data: { client_ip_address?: string; client_user_agent: string; fbc: string; fbp?: string };
};

/**
 * The Conversions API payload. The page address is deliberately the site's
 * home page, never the page the visitor was on: product and concern pages can
 * reveal a health condition. No custom_data at all.
 */
export function buildServerEvent(
  e: MetaBeaconEvent,
  client: { ip: string | null; ua: string; fbp?: string | null },
  siteOrigin: string,
  now = new Date(),
): MetaServerEvent {
  const user: MetaServerEvent["user_data"] = { client_user_agent: client.ua.slice(0, 500), fbc: e.fbc };
  if (client.ip && client.ip !== "unknown") user.client_ip_address = client.ip;
  if (validFbp(client.fbp)) user.fbp = client.fbp;
  return {
    event_name: e.name,
    event_time: Math.floor(now.getTime() / 1000),
    event_id: e.eventId,
    action_source: "website",
    event_source_url: `${siteOrigin.replace(/\/+$/, "")}/`,
    user_data: user,
  };
}

export function graphRequest(config: MetaConfig, event: MetaServerEvent): { url: string; body: string } {
  const body: Record<string, unknown> = { data: [event] };
  if (config.testCode) body.test_event_code = config.testCode;
  return {
    url: `https://graph.facebook.com/${config.graphVersion}/${config.datasetId}/events?access_token=${encodeURIComponent(config.token)}`,
    body: JSON.stringify(body),
  };
}

/** Sends one event. Never throws; failures are logged without the token. */
export async function sendMetaEvent(config: MetaConfig, event: MetaServerEvent): Promise<void> {
  const { url, body } = graphRequest(config, event);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      const text = (await res.text().catch(() => "")).slice(0, 300);
      console.error(`[meta] ${event.event_name} rejected: HTTP ${res.status} ${text}`);
    }
  } catch (err) {
    console.error(`[meta] ${event.event_name} send failed:`, (err as Error).message);
  }
}

// What the server sends Meta's Conversions API, and when. `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildServerEvent, graphRequest, metaConfig, metaEventFromBeacon, publicPixelId } from "./meta-capi";

const FBC = "fb.1.1763251200123.IwAR2abcDEF_123-xyz";
const ID = "3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90";
const ENV = { META_DATASET_ID: "123456789012345", META_CAPI_TOKEN: "secret-token" } as unknown as NodeJS.ProcessEnv;

test("nothing is configured without both the dataset id and the token", () => {
  assert.equal(metaConfig({} as NodeJS.ProcessEnv), null);
  assert.equal(metaConfig({ META_DATASET_ID: "123456789012345" } as unknown as NodeJS.ProcessEnv), null);
  assert.equal(metaConfig({ META_DATASET_ID: "abc", META_CAPI_TOKEN: "t" } as unknown as NodeJS.ProcessEnv), null);
  assert.equal(publicPixelId({} as NodeJS.ProcessEnv), null);
  assert.equal(publicPixelId(ENV), "123456789012345");
  assert.deepEqual(metaConfig(ENV), { datasetId: "123456789012345", token: "secret-token", testCode: null, graphVersion: "v23.0" });
});

test("only a landing page view and a retailer click become Meta events", () => {
  const meta = { event_id: ID, fbc: FBC };
  assert.deepEqual(metaEventFromBeacon("pageview", { meta: { ...meta, landing: true } }), { name: "ActivelyLanding", eventId: ID, fbc: FBC });
  assert.deepEqual(metaEventFromBeacon("outbound", { meta }), { name: "RetailerClick", eventId: ID, fbc: FBC });
  assert.equal(metaEventFromBeacon("pageview", { meta }), null);
  assert.equal(metaEventFromBeacon("search", { meta }), null);
  assert.equal(metaEventFromBeacon("outbound", {}), null);
  assert.equal(metaEventFromBeacon("outbound", { meta: { event_id: "x", fbc: FBC } }), null);
  assert.equal(metaEventFromBeacon("outbound", { meta: { event_id: ID, fbc: "fb.1.nope" } }), null);
  assert.equal(metaEventFromBeacon("outbound", null), null);
});

test("the server event carries no page, product or custom data", () => {
  const e = buildServerEvent(
    { name: "RetailerClick", eventId: ID, fbc: FBC },
    { ip: "203.0.113.9", ua: "Mozilla/5.0", fbp: "fb.1.1763251200123.1234567890" },
    "https://activelyskin.com/",
    new Date("2026-11-16T00:00:00Z"),
  );
  assert.deepEqual(e, {
    event_name: "RetailerClick",
    event_time: 1794787200,
    event_id: ID,
    action_source: "website",
    event_source_url: "https://activelyskin.com/",
    user_data: { client_ip_address: "203.0.113.9", client_user_agent: "Mozilla/5.0", fbc: FBC, fbp: "fb.1.1763251200123.1234567890" },
  });
  assert.equal("custom_data" in e, false);
});

test("missing IP and malformed fbp are left out", () => {
  const e = buildServerEvent({ name: "ActivelyLanding", eventId: ID, fbc: FBC }, { ip: null, ua: "UA", fbp: "junk" }, "https://activelyskin.com");
  assert.deepEqual(e.user_data, { client_user_agent: "UA", fbc: FBC });
  assert.equal(e.event_source_url, "https://activelyskin.com/");
});

test("the Graph request targets the dataset and adds the test code only when set", () => {
  const e = buildServerEvent({ name: "ActivelyLanding", eventId: ID, fbc: FBC }, { ip: null, ua: "UA" }, "https://activelyskin.com");
  const plain = graphRequest(metaConfig(ENV)!, e);
  assert.equal(plain.url, "https://graph.facebook.com/v23.0/123456789012345/events?access_token=secret-token");
  assert.equal(JSON.parse(plain.body).test_event_code, undefined);
  const testing = graphRequest(metaConfig({ ...ENV, META_TEST_EVENT_CODE: "TEST123" })!, e);
  assert.equal(JSON.parse(testing.body).test_event_code, "TEST123");
  assert.equal(JSON.parse(testing.body).data[0].event_id, ID);
});

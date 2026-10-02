// Clinician handouts against a throwaway SQLite database: `npm test`.
// Privacy (no patient field persisted), version immutability, printout
// claims (binding, non-owners see nothing, linked devices, expiry), the MD
// badge, and the Rx rules for handouts.
import { before, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type Mods = {
  db: typeof import("@/db/client").db;
  sql: typeof import("drizzle-orm").sql;
  h: typeof import("./handouts");
  r: typeof import("./regimens");
  c: typeof import("./clinicians");
  identity: typeof import("./identity");
};
let m: Mods;
let clinician: import("./clinicians").Clinician;

const T0 = new Date("2026-10-02T15:00:00Z");
const DAY = 24 * 60 * 60_000;
const at = (days: number) => new Date(T0.getTime() + days * DAY);

before(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "actively-handouts-"));
  process.env.DATABASE_PATH = path.join(dir, "test.db");
  const log = console.log;
  console.log = () => {};
  await import("@/db/migrate");
  console.log = log;
  const { db } = await import("@/db/client");
  const { sql } = await import("drizzle-orm");
  m = { db, sql, h: await import("./handouts"), r: await import("./regimens"), c: await import("./clinicians"), identity: await import("./identity") };
  db.run(sql`INSERT INTO concerns (id, name, description) VALUES ('acne', 'Acne', ''), ('rx', 'Rx', '')`);
  db.run(sql`INSERT INTO products (id, concern_id, brand_name, data_source) VALUES ('otc-wash', 'acne', 'Acne Wash 4%', 'openfda'), ('otc-spf', 'acne', 'Daily SPF 30', 'openfda')`);
  db.run(sql`INSERT INTO products (id, concern_id, brand_name, is_rx, generic_name, strength_text, dosage_form) VALUES
    ('rx-tret', 'rx', 'Retin-A', 1, 'tretinoin', 'tretinoin 0.025%', 'CREAM')`);
  db.run(sql`INSERT INTO products (id, concern_id, brand_name, is_rx, generic_name, informational_only) VALUES ('rx-iso', 'rx', 'Isotretinoin', 1, 'isotretinoin', 1)`);
  db.run(sql`INSERT INTO people (id, email, home_session_id, email_verified_at, created_at) VALUES ('doc', 'doc@example.com', 'doc-home', ${T0.toISOString()}, ${T0.toISOString()})`);
  const rec = {
    npi: "1234567893", enumerationType: "NPI-1", active: true, firstName: "Jane", lastName: "Adams", credential: "M.D.",
    taxonomyCode: "207N00000X", taxonomyDesc: "Dermatology", state: "CA", isDermatology: true,
  };
  const saved = m.c.saveClinicianProfile("doc", { npi: "1234567893", lastName: "adams", clinicName: "Skin Clinic", clinicPhone: "555-0100", clinicWebsite: null }, rec, T0);
  assert.ok(saved.outcome.ok);
  clinician = saved.clinician!;
});

const input = (extra: Record<string, unknown> = {}) => ({
  title: "Your acne plan",
  steps: [
    { slot: "am", label: "Wash", productId: "otc-wash", directions: "Wash, rinse.", productName: "SPOOFED NAME" },
    { slot: "pm", label: "Retinoid", productId: "rx-tret", directions: "Pea-sized amount nightly." },
    { slot: "both", label: "Moisturizer", productId: null, directions: "" },
  ],
  stopRules: ["Severe peeling."],
  notes: "Expect dryness.",
  avoidCode: null,
  ...extra,
});

function newHandout() {
  const v = m.h.validateHandoutInput(input(), { allowRx: true });
  assert.ok(v.ok);
  return m.h.createHandout(clinician, { title: v.title, templateId: "acne-starter", content: v.content }, T0);
}

test("clinician profile: verified, credential badge, display name", () => {
  assert.ok(clinician.verifiedAt);
  assert.equal(clinician.lastName, "Adams", "registry spelling stored");
  assert.equal(m.c.clinicianDisplayName(clinician), "Dr. Adams, MD");
  assert.equal(m.c.badgeCredential("M.D."), "MD");
  assert.equal(m.c.badgeCredential("PA-C"), "PA-C");
  assert.equal(m.c.badgeCredential("RN, BSN"), "Clinician");
});

test("handout validation: Rx needs a verified clinician, isotretinoin never; names come from the catalog", () => {
  assert.deepEqual(m.h.validateHandoutInput(input(), { allowRx: false }), { ok: false, error: "Step 2: prescription products need a verified NPI." });
  const iso = m.h.validateHandoutInput(input({ steps: [{ slot: "pm", label: "Iso", productId: "rx-iso", directions: "" }] }), { allowRx: true });
  assert.equal(iso.ok, false);
  const ok = m.h.validateHandoutInput(input(), { allowRx: true });
  assert.ok(ok.ok);
  assert.equal(ok.content.steps[0].productName, "Acne Wash 4%", "client-sent product name ignored");
  assert.equal(ok.content.steps[1].kind, "rx");
  assert.equal(ok.content.steps[1].productName, "Tretinoin 0.025% cream (Retin-A)");
  assert.equal(ok.content.steps[2].kind, "generic");
});

test("privacy: no patient field is accepted or persisted", () => {
  const sneaky = input({ patientName: "Maria Lopez", dob: "1990-01-02", mrn: "00482913", patient: { name: "x" } });
  const v = m.h.validateHandoutInput(sneaky, { allowRx: true });
  assert.ok(v.ok);
  assert.deepEqual(Object.keys(v.content).sort(), ["avoidCode", "notes", "sections", "steps", "stopRules"]);
  for (const s of v.content.steps) assert.deepEqual(Object.keys(s).sort(), ["directions", "key", "kind", "label", "productId", "productName", "slot"]);
  const { version } = m.h.createHandout(clinician, { title: v.title, templateId: null, content: v.content }, T0);
  const raw = JSON.stringify(m.db.all(m.sql`SELECT * FROM handout_versions WHERE id = ${version.id}`));
  assert.ok(!/Maria|1990-01-02|00482913|patient/i.test(raw), raw);
  // Schema-level: none of the handout tables has a patient-ish column.
  for (const table of ["handouts", "handout_versions", "handout_instances", "clinicians", "regimens", "regimen_step_states"]) {
    const cols = m.db.all<{ name: string }>(m.sql`SELECT name FROM pragma_table_info(${table})`).map((c) => c.name);
    assert.ok(cols.length > 0, table);
    for (const c of cols) assert.ok(!/patient|dob|birth|mrn|ssn|diagnos/i.test(c), `${table}.${c}`);
  }
});

test("education sections: text-only handouts are valid, sections are trimmed and capped, empty is refused", () => {
  const edu = m.h.validateHandoutInput(
    {
      title: "Caring for your wound",
      steps: [],
      sections: [
        { heading: "  Day one  ", body: "Keep the bandage on.\r\n- Keep it dry\n- Rest", extra: "dropped" },
        { heading: "", body: "" },
      ],
    },
    { allowRx: false },
  );
  assert.ok(edu.ok);
  assert.deepEqual(edu.content.sections, [{ heading: "Day one", body: "Keep the bandage on.\n- Keep it dry\n- Rest" }]);
  assert.equal(edu.content.steps.length, 0);
  const tooMany = m.h.validateHandoutInput({ steps: [], sections: Array.from({ length: 11 }, () => ({ heading: "h", body: "b" })) }, { allowRx: false });
  assert.equal(tooMany.ok, false);
  const empty = m.h.validateHandoutInput({ steps: [], sections: [] }, { allowRx: false });
  assert.equal(empty.ok, false);
});

test("versions are immutable; an edit is a new version and old printouts keep theirs", () => {
  const { handoutId, version: v1 } = newHandout();
  const { token } = m.h.createInstance(v1.id, T0);
  const immutable = (e: unknown) => /immutable/.test(String((e as { cause?: unknown }).cause ?? e));
  assert.throws(() => m.db.run(m.sql`UPDATE handout_versions SET title = 'changed' WHERE id = ${v1.id}`), immutable);
  assert.throws(() => m.db.run(m.sql`DELETE FROM handout_versions WHERE id = ${v1.id}`), immutable);

  const edited = m.h.validateHandoutInput(input({ title: "Revised plan", stopRules: ["New rule."] }), { allowRx: true });
  assert.ok(edited.ok);
  const v2 = m.h.addVersion(clinician, handoutId, { title: edited.title, templateId: null, content: edited.content }, at(1))!;
  assert.equal(v2.version.version, 2);
  assert.notEqual(v2.version.ref, v1.ref);
  assert.match(v2.version.ref, m.h.REF_RE);
  assert.equal(m.h.getVersion(handoutId, 1)!.title, "Your acne plan");
  assert.deepEqual(m.h.getVersion(handoutId, 1)!.content.stopRules, ["Severe peeling."]);
  assert.equal(m.h.findInstance(token)!.version.version, 1, "the v1 QR still opens v1");
  // Someone else's handout can't be versioned.
  assert.equal(m.h.addVersion({ ...clinician, id: "someone-else" }, handoutId, { title: "x", templateId: null, content: edited.content }, at(1)), null);
});

test("claim: first device binds it; anyone else gets nothing; same session is the owner", () => {
  const { version } = newHandout();
  const { token, instance } = m.h.createInstance(version.id, T0);
  assert.ok(m.h.CLAIM_TOKEN_RE.test(token));
  const stored = m.db.get<{ token_hash: string }>(m.sql`SELECT token_hash FROM handout_instances WHERE id = ${instance.id}`)!;
  assert.notEqual(stored.token_hash, token, "only the hash is stored");

  const first = m.h.claimInstance(token, "patient-a", at(1));
  assert.equal(first.status, "claimed");
  assert.equal(m.h.claimInstance(token, "stranger", at(1)).status, "taken");
  assert.equal(m.h.claimInstance(token, "patient-a", at(2)).status, "owner");
  const found = m.h.findInstance(token)!;
  assert.equal(m.h.ownsInstance(found.instance, "patient-a"), true);
  assert.equal(m.h.ownsInstance(found.instance, "stranger"), false);
  assert.equal(m.h.ownsInstance(found.instance, null), false);
  assert.equal(m.h.claimInstance("not-a-real-token-xx", "x", T0).status, "invalid");

  // The regimen exists only for the owner.
  const reg = m.r.createClinicianRegimen("patient-a", found.instance.id, found.version.title, at(1));
  assert.equal(m.r.getClinicianPlan("patient-a", reg.id)?.version.id, version.id);
  assert.equal(m.r.getClinicianPlan("stranger", reg.id), null, "non-owner can't read the plan");
  assert.deepEqual(m.r.listRegimens("stranger"), []);
  assert.equal(m.r.setStepState("stranger", reg.id, "s1", { done: true }, at(1)), null);
});

test("owner sees it on every linked device after signing in; deleting the email releases it", () => {
  const { version } = newHandout();
  const { token } = m.h.createInstance(version.id, T0);
  // Claimed anonymously on the phone...
  assert.equal(m.h.claimInstance(token, "phone", at(1)).status, "claimed");
  const inst = m.h.findInstance(token)!.instance;
  m.r.createClinicianRegimen("phone", inst.id, version.title, at(1));
  // ...then the patient signs in on the phone and on a laptop.
  const { person } = m.identity.completeSignIn({ email: "pat@example.com", requestSessionId: "phone", deviceSessionId: "phone", now: at(2) });
  m.identity.completeSignIn({ email: "pat@example.com", requestSessionId: "laptop", deviceSessionId: "laptop", now: at(3) });
  const home = person.homeSessionId;
  for (const device of ["phone", "laptop"]) {
    const sid = m.identity.resolveSessionId(device);
    assert.equal(sid, home);
    assert.equal(m.h.ownsInstance(m.h.findInstance(token)!.instance, sid), true, device);
    assert.equal(m.r.listRegimens(sid).filter((x) => x.kind === "clinician").length, 1, device);
  }
  assert.equal(m.h.ownsInstance(m.h.findInstance(token)!.instance, "phone"), false, "the raw device id is no longer the owner key");

  m.identity.deletePersonAndData(person.id);
  const after = m.h.findInstance(token)!.instance;
  assert.ok(after.claimedAt, "still counted as saved");
  assert.equal(after.claimedSessionId, null);
  assert.equal(m.h.claimInstance(token, "phone", at(4)).status, "taken", "nobody can re-claim it");
  assert.deepEqual(m.r.listRegimens(home), []);
});

test("unclaimed printouts expire after 90 days; claimed ones never do", () => {
  const { version } = newHandout();
  const a = m.h.createInstance(version.id, T0);
  const b = m.h.createInstance(version.id, T0);
  assert.equal(m.h.claimInstance(a.token, "late", at(91)).status, "expired");
  assert.equal(m.h.claimInstance(b.token, "early", at(89)).status, "claimed");
  assert.equal(m.h.claimInstance(b.token, "early", at(400)).status, "owner");
  assert.ok(m.h.isExpiredUnclaimed(m.h.findInstance(a.token)!.instance, at(91)));
});

test("MD badge only on clinician-issued regimens; a personal copy loses it", () => {
  const { version } = newHandout();
  const { token } = m.h.createInstance(version.id, T0);
  m.h.claimInstance(token, "badge-s", at(1));
  const inst = m.h.findInstance(token)!.instance;
  const plan = m.r.createClinicianRegimen("badge-s", inst.id, version.title, at(1));
  const own = m.r.primaryOwnRegimenId("badge-s", true, at(1))!;
  let list = m.r.listRegimens("badge-s");
  assert.deepEqual(list.find((x) => x.id === plan.id)?.badge, { credential: "MD", clinicianName: "Dr. Adams, MD", clinicName: "Skin Clinic" });
  assert.equal(list.find((x) => x.id === own)?.badge, null);

  const copy = m.r.copyClinicianPlan("badge-s", plan.id, at(2))!;
  assert.equal(copy.skipped, 1, "the product-less step can't be copied");
  list = m.r.listRegimens("badge-s");
  const c = list.find((x) => x.id === copy.regimen.id)!;
  assert.equal(c.kind, "own");
  assert.equal(c.badge, null);
  assert.equal(c.active, true);
  const items = m.db.all<{ product_id: string; directions: string | null }>(m.sql`SELECT product_id, directions FROM regimen_items WHERE regimen_id = ${copy.regimen.id} ORDER BY product_id`);
  assert.deepEqual(items.map((i) => i.product_id), ["otc-wash", "rx-tret"], "Rx carried into the copy only via the clinician's plan");
  // The clinician plan itself has no editable items and keeps its badge.
  assert.equal(m.db.all(m.sql`SELECT 1 FROM regimen_items WHERE regimen_id = ${plan.id}`).length, 0);
  assert.equal(m.r.renameRegimen("badge-s", plan.id, "Mine now"), false, "a clinician plan keeps the clinician's title");
});

test("dashboard counts: printed, opened, saved -- aggregates only", () => {
  const { version } = newHandout();
  const a = m.h.createInstance(version.id, T0);
  m.h.createInstance(version.id, T0);
  m.h.recordOpen(a.instance.id);
  m.h.recordOpen(a.instance.id);
  m.h.claimInstance(a.token, "count-s", at(1));
  assert.deepEqual(m.h.countsForVersions([version.id]).get(version.id), { printed: 2, opened: 1, saved: 1 });
});

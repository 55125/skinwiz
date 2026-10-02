// Starter lists and the account-saved avoid list, against a throwaway SQLite
// database: `npm test`.
import { before, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type Mods = {
  db: typeof import("@/db/client").db;
  sql: typeof import("drizzle-orm").sql;
  lists: typeof import("./clinician-lists");
  c: typeof import("./clinicians");
  identity: typeof import("./identity");
};
let m: Mods;
let docId: string;
let otherId: string;
const T0 = new Date("2026-10-02T15:00:00Z");

before(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "actively-lists-"));
  process.env.DATABASE_PATH = path.join(dir, "test.db");
  const log = console.log;
  console.log = () => {};
  await import("@/db/migrate");
  console.log = log;
  const { db } = await import("@/db/client");
  const { sql } = await import("drizzle-orm");
  m = { db, sql, lists: await import("./clinician-lists"), c: await import("./clinicians"), identity: await import("./identity") };
  const now = T0.toISOString();
  db.run(sql`INSERT INTO people (id, email, home_session_id, email_verified_at, created_at) VALUES
    ('p1', 'a@example.com', 'h1', ${now}, ${now}), ('p2', 'b@example.com', 'h2', ${now}, ${now})`);
  const rec = (npi: string, last: string) => ({
    npi, enumerationType: "NPI-1", active: true, firstName: "Jo", lastName: last, credential: "M.D.",
    taxonomyCode: "207N00000X", taxonomyDesc: "Dermatology", state: "CA", isDermatology: true,
  });
  docId = m.c.saveClinicianProfile("p1", { npi: "1234567893", lastName: "adams", clinicName: "A Clinic", clinicPhone: null, clinicWebsite: null }, rec("1234567893", "Adams"), T0).clinician!.id;
  otherId = m.c.saveClinicianProfile("p2", { npi: "1245319599", lastName: "baker", clinicName: "B Clinic", clinicPhone: null, clinicWebsite: null }, rec("1245319599", "Baker"), T0).clinician!.id;
});

test("starter lists: names and ids are cleaned, unknown ids dropped, empty refused", () => {
  const saved = m.lists.saveList(docId, { name: "  Fragrance\nstarter  ", ids: ["fragrance-mix-1", "balsam-of-peru", "not-a-real-id", "fragrance-mix-1", 7] });
  assert.ok(saved.ok);
  assert.equal(saved.list.name, "Fragrance starter");
  assert.deepEqual(saved.list.ids, ["fragrance-mix-1", "balsam-of-peru"]);
  assert.equal(m.lists.saveList(docId, { name: "x", ids: ["nope"] }).ok, false);
  assert.equal(m.lists.saveList(docId, { name: "   ", ids: ["lanolin"] }).ok, false);
});

test("starter lists belong to their clinician: others can't read, edit or delete them", () => {
  const saved = m.lists.saveList(docId, { name: "Hair dye", ids: ["ppd-type-dyes"] });
  assert.ok(saved.ok);
  const id = saved.list.id;
  assert.equal(m.lists.getOwnedList(id, otherId), undefined);
  assert.equal(m.lists.saveList(otherId, { id, name: "Hijacked", ids: ["lanolin"] }).ok, false);
  assert.equal(m.lists.deleteList(id, otherId), false);
  assert.ok(!m.lists.listsForClinician(otherId).some((l) => l.id === id));
  const edited = m.lists.saveList(docId, { id, name: "Hair dye (PPD)", ids: ["ppd", "ptd"] });
  assert.ok(edited.ok && edited.list.id === id && edited.list.name === "Hair dye (PPD)");
  assert.equal(m.lists.deleteList(id, docId), true);
});

test("deleting an account deletes its saved avoid list", () => {
  m.db.run(m.sql`INSERT INTO person_avoid_lists (person_id, ids, updated_at) VALUES ('p2', '["lanolin"]', ${T0.toISOString()})`);
  m.identity.deletePersonAndData("p2");
  const left = m.db.all(m.sql`SELECT * FROM person_avoid_lists WHERE person_id = 'p2'`);
  assert.equal(left.length, 0);
});

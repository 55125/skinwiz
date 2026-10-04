// Runs the catalog pipeline's Python unit tests (image-choice heuristic, SPL
// inactive-ingredient parsing: tools/catalog_pipeline/tests/) as part of
// `npm test`. Skipped where python3 isn't installed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

const PIPELINE = path.resolve(process.cwd(), "..", "tools", "catalog_pipeline");
const hasPython = spawnSync("python3", ["--version"]).status === 0;

test("catalog pipeline Python tests", { skip: !hasPython && "python3 not installed" }, () => {
  const run = spawnSync("python3", ["-m", "unittest", "discover", "-s", "tests"], { cwd: PIPELINE, encoding: "utf-8" });
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
});

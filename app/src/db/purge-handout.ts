// `npm run handouts:purge -- <ref> "<reason>"`: deletes one handout version
// that holds patient details (lib/handout-purge.ts). Back up first
// (npm run db:backup); a purge can't be undone.
import { purgeHandoutVersion } from "@/lib/handout-purge";

const [ref, ...rest] = process.argv.slice(2);
if (!ref) {
  console.error('Usage: npm run handouts:purge -- <ref> "<reason>"');
  process.exit(1);
}
const result = purgeHandoutVersion(ref, rest.join(" "), new Date());
if (!result.ok) {
  console.error(result.error);
  process.exit(1);
}
console.log(
  `Purged ${result.ref}: ${result.printouts} printout(s) and ${result.plans} saved patient plan(s) removed` +
    (result.handoutDeleted ? "; it was the only version, so the handout is gone too." : "."),
);

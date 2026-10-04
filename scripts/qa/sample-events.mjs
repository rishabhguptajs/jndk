/**
 * Draws the Phase 6 re-verification sample: 50 events, fixed seed 20261004.
 * The sample in docs/qa/verification-sample.md was drawn from data/events.json as of
 * commit ce336c3, before the corrections; to reproduce it:
 *   git show ce336c3:data/events.json > /tmp/events-pre-qa.json
 *   node scripts/qa/sample-events.mjs /tmp/events-pre-qa.json
 */
import fs from "node:fs";
const ev = JSON.parse(fs.readFileSync(process.argv[2] ?? "data/events.json", "utf8"));
let s = 20261004;
const r = () => {
  s = (s * 1103515245 + 12345) % 2147483648;
  return s / 2147483648;
};
const pool = [...ev];
const out = [];
while (out.length < 50 && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
out.sort((a, b) => a.date.localeCompare(b.date));
for (const e of out) console.log(`${e.id} | ${e.killed.total.min}-${e.killed.total.max}`);

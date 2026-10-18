import { readFileSync } from "node:fs";
import { createClient, generateMarket } from "../src/generate.js";

// Live check of the golden set against the real model. Needs ANTHROPIC_API_KEY.
const cases: { headline: string; expect: "market" | "unresolvable" }[] = JSON.parse(
  readFileSync(new URL("../golden/cases.json", import.meta.url), "utf8"),
);
const client = createClient();
let pass = 0;
for (const c of cases) {
  const r = await generateMarket(c.headline, client);
  const got = r.status === "draft" ? "market" : r.status;
  const ok = got === c.expect;
  if (ok) pass++;
  console.log(`${ok ? "PASS" : "FAIL"}  expected=${c.expect} got=${got}  ${c.headline}`);
}
console.log(`${pass}/${cases.length} passed`);
process.exit(pass === cases.length ? 0 : 1);

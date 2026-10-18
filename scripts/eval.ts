import { readFileSync } from "node:fs";
import { createClient, generateMarket } from "../src/generate.js";

// Live check of the golden set against the real model. Needs ANTHROPIC_API_KEY.
// Passing a market case means the draft also cleared the meaning checks in validateDraft.
const cases: { headline: string; snippet?: string; expect: "market" | "unresolvable"; note?: string }[] = JSON.parse(
  readFileSync(new URL("../golden/cases.json", import.meta.url), "utf8"),
);
const client = createClient();
let pass = 0;
for (const c of cases) {
  const r = await generateMarket(c.headline, client, new Date(), c.snippet);
  const got = r.status === "draft" ? "market" : r.status;
  const ok = got === c.expect;
  if (ok) pass++;
  const detail = r.status === "draft" ? `source="${r.market.resolutionSource}"` : r.status === "unresolvable" ? r.reason : r.reason;
  console.log(`${ok ? "PASS" : "FAIL"}  expected=${c.expect} got=${got}  ${c.headline}\n      ${detail}`);
}
console.log(`${pass}/${cases.length} passed`);
process.exit(pass === cases.length ? 0 : 1);

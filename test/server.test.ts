import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { createApp } from "../src/server.js";
import { listMarkets, openDb } from "../src/db.js";
import type { ModelClient } from "../src/generate.js";
import { good } from "./helpers.js";

const client: ModelClient = {
  messages: { create: async () => ({ content: [{ type: "tool_use", name: "submit_market", input: good }] }) },
};

async function setup(clock: { now: Date }) {
  const db = openDb(":memory:");
  const server = createApp(db, client, () => clock.now).listen(0);
  await new Promise((r) => server.once("listening", r));
  const base = `http://localhost:${(server.address() as AddressInfo).port}`;
  const call = (path: string, method = "POST", body?: unknown) =>
    fetch(base + path, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return { db, server, call };
}

const edit = {
  question: good.question,
  closeTime: good.closeTime,
  resolutionSource: good.resolutionSource,
  yesCriteria: good.yesCriteria,
  edgeCaseRule: good.edgeCaseRule,
};

test("generate saves a draft; the editor can edit it and approve it", async () => {
  const clock = { now: new Date("2026-10-18T00:00:00Z") };
  const { db, server, call } = await setup(clock);
  try {
    const gen = await (await call("/api/generate", "POST", { headline: "RBI decision on 5 December", snippet: "MPC meets next month." })).json();
    assert.equal(gen.status, "draft");
    assert.equal(listMarkets(db)[0].status, "draft");

    const edited = await call(`/api/markets/${gen.id}`, "PATCH", { ...edit, resolutionSource: "RBI MPC resolution statement" });
    assert.equal(edited.status, 200);
    assert.equal(listMarkets(db)[0].resolution_source, "RBI MPC resolution statement");

    assert.equal((await call(`/api/markets/${gen.id}/approve`)).status, 200);
    assert.equal(listMarkets(db)[0].status, "published");
  } finally {
    server.close();
  }
});

test("edits are checked: a vague source is refused", async () => {
  const { server, call } = await setup({ now: new Date("2026-10-18T00:00:00Z") });
  try {
    const gen = await (await call("/api/generate", "POST", { headline: "RBI decision on 5 December" })).json();
    const bad = await call(`/api/markets/${gen.id}`, "PATCH", { ...edit, resolutionSource: "official sources" });
    assert.equal(bad.status, 422);
  } finally {
    server.close();
  }
});

test("a discarded draft can't be approved", async () => {
  const { db, server, call } = await setup({ now: new Date("2026-10-18T00:00:00Z") });
  try {
    const gen = await (await call("/api/generate", "POST", { headline: "RBI decision on 5 December" })).json();
    assert.equal((await call(`/api/markets/${gen.id}/discard`)).status, 200);
    assert.equal(listMarkets(db)[0].status, "discarded");
    assert.equal((await call(`/api/markets/${gen.id}/approve`)).status, 404);
  } finally {
    server.close();
  }
});

test("approval re-checks the close time: a draft that has gone stale is not published", async () => {
  const clock = { now: new Date("2026-10-18T00:00:00Z") };
  const { db, server, call } = await setup(clock);
  try {
    const gen = await (await call("/api/generate", "POST", { headline: "RBI decision on 5 December" })).json();
    clock.now = new Date("2026-12-06T00:00:00Z");
    const res = await call(`/api/markets/${gen.id}/approve`);
    assert.equal(res.status, 409);
    assert.equal(listMarkets(db)[0].status, "draft");
  } finally {
    server.close();
  }
});

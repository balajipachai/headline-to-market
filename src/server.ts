import express from "express";
import { z } from "zod";
import { createClient, generateMarket, type ModelClient } from "./generate.js";
import { discardDraft, getMarket, listMarkets, openDb, publishDraft, saveDraft, toEditable, updateDraft, type Db } from "./db.js";
import { validateDraft } from "./validate.js";

const editSchema = z.object({
  question: z.string().min(10).max(300),
  closeTime: z.string().min(10).max(40),
  resolutionSource: z.string().min(3).max(200),
  yesCriteria: z.string().min(10).max(500),
  edgeCaseRule: z.string().min(10).max(500),
});

export function createApp(db: Db, client: ModelClient, clock: () => Date = () => new Date()) {
  const app = express();
  app.use(express.json({ limit: "20kb" }));
  app.use(express.static("public"));

  app.post("/api/generate", async (req, res) => {
    const headline = typeof req.body?.headline === "string" ? req.body.headline.trim() : "";
    const snippet = typeof req.body?.snippet === "string" ? req.body.snippet.trim().slice(0, 2000) : undefined;
    if (headline.length < 5 || headline.length > 500) {
      res.status(400).json({ status: "failed", reason: "Enter a headline between 5 and 500 characters.", canRetry: false });
      return;
    }
    const result = await generateMarket(headline, client, clock(), snippet);
    if (result.status === "draft") {
      const id = saveDraft(db, headline, snippet, result.market);
      res.json({ ...result, id });
      return;
    }
    res.json(result);
  });

  // The editor changes a draft; the same meaning checks apply as to a generated one.
  app.patch("/api/markets/:id", (req, res) => {
    const parsed = editSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ problems: ["Every field is required and must be a sensible length."], warnings: [] });
      return;
    }
    const { problems, warnings } = validateDraft(parsed.data, clock());
    if (problems.length) {
      res.status(422).json({ problems, warnings });
      return;
    }
    const ok = updateDraft(db, Number(req.params.id), parsed.data);
    res.status(ok ? 200 : 404).json({ saved: ok, problems: [], warnings });
  });

  app.post("/api/markets/:id/discard", (req, res) => {
    const ok = discardDraft(db, Number(req.params.id));
    res.status(ok ? 200 : 404).json({ discarded: ok });
  });

  // Explicit editor approval: the only route that publishes. The draft is re-checked first,
  // because a close time that was fine when drafted may have passed since.
  app.post("/api/markets/:id/approve", (req, res) => {
    const row = getMarket(db, Number(req.params.id));
    if (!row || row.status !== "draft") {
      res.status(404).json({ published: false, problems: ["Draft not found."] });
      return;
    }
    const { problems } = validateDraft(toEditable(row), clock());
    if (problems.length) {
      res.status(409).json({ published: false, problems });
      return;
    }
    const ok = publishDraft(db, row.id);
    res.status(ok ? 200 : 404).json({ published: ok });
  });

  app.get("/api/markets", (_req, res) => {
    res.json(listMarkets(db));
  });

  return app;
}

if (process.argv[1]?.endsWith("server.ts")) {
  const port = Number(process.env.PORT ?? 3000);
  createApp(openDb(), createClient()).listen(port, () => console.log(`http://localhost:${port}`));
}

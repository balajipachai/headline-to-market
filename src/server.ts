import express from "express";
import { createClient, generateMarket, type ModelClient } from "./generate.js";
import { listMarkets, openDb, publishDraft, saveDraft, type Db } from "./db.js";

export function createApp(db: Db, client: ModelClient) {
  const app = express();
  app.use(express.json({ limit: "10kb" }));
  app.use(express.static("public"));

  app.post("/api/generate", async (req, res) => {
    const headline = typeof req.body?.headline === "string" ? req.body.headline.trim() : "";
    if (headline.length < 5 || headline.length > 500) {
      res.status(400).json({ status: "failed", reason: "Enter a headline between 5 and 500 characters.", canRetry: false });
      return;
    }
    const result = await generateMarket(headline, client);
    if (result.status === "draft") {
      const id = saveDraft(db, headline, result.market);
      res.json({ ...result, id });
      return;
    }
    res.json(result);
  });

  // Explicit editor approval: the only route that publishes.
  app.post("/api/markets/:id/approve", (req, res) => {
    const ok = publishDraft(db, Number(req.params.id));
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

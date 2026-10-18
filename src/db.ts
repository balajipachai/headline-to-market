import { DatabaseSync } from "node:sqlite";
import type { MarketDraft } from "./schema.js";

export type Row = {
  id: number;
  headline: string;
  question: string;
  close_time: string;
  resolution_source: string;
  edge_case_rule: string;
  status: "draft" | "published";
  created_at: string;
  published_at: string | null;
};

export function openDb(path = process.env.DB_PATH ?? "markets.db") {
  const db = new DatabaseSync(path);
  db.exec(`CREATE TABLE IF NOT EXISTS markets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    headline TEXT NOT NULL,
    question TEXT NOT NULL,
    close_time TEXT NOT NULL,
    resolution_source TEXT NOT NULL,
    edge_case_rule TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL,
    published_at TEXT
  )`);
  return db;
}

export type Db = ReturnType<typeof openDb>;

// Generation only ever writes drafts.
export function saveDraft(db: Db, headline: string, m: MarketDraft): number {
  const r = db
    .prepare(
      `INSERT INTO markets (headline, question, close_time, resolution_source, edge_case_rule, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'draft', ?)`,
    )
    .run(headline, m.question, m.closeTime, m.resolutionSource, m.edgeCaseRule, new Date().toISOString());
  return Number(r.lastInsertRowid);
}

// The only place a market becomes live. Called from the editor's approve action.
export function publishDraft(db: Db, id: number): boolean {
  const r = db
    .prepare(`UPDATE markets SET status = 'published', published_at = ? WHERE id = ? AND status = 'draft'`)
    .run(new Date().toISOString(), id);
  return Number(r.changes) === 1;
}

export function listMarkets(db: Db): Row[] {
  return db.prepare(`SELECT * FROM markets ORDER BY id DESC`).all() as Row[];
}

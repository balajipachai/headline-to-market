import { DatabaseSync } from "node:sqlite";
import type { MarketDraft } from "./schema.js";

export type Row = {
  id: number;
  headline: string;
  snippet: string | null;
  question: string;
  close_time: string;
  resolution_source: string;
  yes_criteria: string;
  edge_case_rule: string;
  rationale: string;
  status: "draft" | "published" | "discarded";
  created_at: string;
  published_at: string | null;
};

export type Editable = Pick<MarketDraft, "question" | "closeTime" | "resolutionSource" | "yesCriteria" | "edgeCaseRule">;

export function openDb(path = process.env.DB_PATH ?? "markets.db") {
  const db = new DatabaseSync(path);
  db.exec(`CREATE TABLE IF NOT EXISTS markets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    headline TEXT NOT NULL,
    snippet TEXT,
    question TEXT NOT NULL,
    close_time TEXT NOT NULL,
    resolution_source TEXT NOT NULL,
    yes_criteria TEXT NOT NULL,
    edge_case_rule TEXT NOT NULL,
    rationale TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL,
    published_at TEXT
  )`);
  return db;
}

export type Db = ReturnType<typeof openDb>;

// Generation only ever writes drafts.
export function saveDraft(db: Db, headline: string, snippet: string | undefined, m: MarketDraft): number {
  const r = db
    .prepare(
      `INSERT INTO markets (headline, snippet, question, close_time, resolution_source, yes_criteria, edge_case_rule, rationale, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
    )
    .run(headline, snippet ?? null, m.question, m.closeTime, m.resolutionSource, m.yesCriteria, m.edgeCaseRule, m.rationale, new Date().toISOString());
  return Number(r.lastInsertRowid);
}

export function getMarket(db: Db, id: number): Row | undefined {
  return db.prepare(`SELECT * FROM markets WHERE id = ?`).get(id) as Row | undefined;
}

export const toEditable = (r: Row): Editable => ({
  question: r.question,
  closeTime: r.close_time,
  resolutionSource: r.resolution_source,
  yesCriteria: r.yes_criteria,
  edgeCaseRule: r.edge_case_rule,
});

// Editors can change a draft; a published or discarded market is frozen.
export function updateDraft(db: Db, id: number, e: Editable): boolean {
  const r = db
    .prepare(
      `UPDATE markets SET question = ?, close_time = ?, resolution_source = ?, yes_criteria = ?, edge_case_rule = ?
       WHERE id = ? AND status = 'draft'`,
    )
    .run(e.question, e.closeTime, e.resolutionSource, e.yesCriteria, e.edgeCaseRule, id);
  return Number(r.changes) === 1;
}

export function discardDraft(db: Db, id: number): boolean {
  return Number(db.prepare(`UPDATE markets SET status = 'discarded' WHERE id = ? AND status = 'draft'`).run(id).changes) === 1;
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

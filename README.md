# Headline to Market

Paste a headline, get back either a market an editor would be comfortable settling (precise question, close time, named source, edge-case rule) or a clear reason the headline can't be one. Nothing goes live until an editor approves it.

## Run

```sh
npm install
export ANTHROPIC_API_KEY=...   # see .env.example; never commit it
npm start                      # http://localhost:3000
npm test                       # offline, uses a fake model client
npm run eval                   # golden set against the real model
```

Requires Node 22+ (uses built-in `node:sqlite`).

## How it works

- `src/schema.ts`: Zod schema with two outcomes, `market` and `unresolvable` (with a reason). Model output is validated before any field is used.
- `src/prompt.ts`: instructions are in the system prompt; the headline goes in the user message inside `<headline>` tags, with any tag-closing text stripped.
- `src/generate.ts`: forces a tool call, validates with Zod, and checks in code that the close time is in the future. The call has a 20s timeout and at most 2 retries. Any failure returns a `failed` state with a retry option instead of throwing.
- `src/db.ts`: drafts are saved as `draft`. Only `publishDraft` sets `published`, and only the editor's approve route calls it.
- `golden/cases.json`: labelled headlines, including ones expected to be rejected.

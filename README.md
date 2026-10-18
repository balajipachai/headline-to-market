# Headline to Market

Paste a headline (and optionally a short article snippet), get back either a market an editor would be comfortable settling or a clear reason, with a suggested rewording, why the headline can't be one. The editor can edit, approve or discard every draft. Nothing goes live until they approve it.

## Run

```sh
npm install
export ANTHROPIC_API_KEY=...   # see .env.example; never commit it
npm start                      # http://localhost:3000
npm test                       # offline, uses a fake model client
npm run eval                   # golden set against the real model
```

Requires Node 22+ (uses built-in `node:sqlite`).

## What a draft contains

Question, close time, a specific named source, what counts as YES, how edge cases resolve, and a short rationale for the editor ("why the tool chose this"). All of it is editable before approval.

## How it works

- `src/schema.ts`: Zod schema with two outcomes, `market` and `unresolvable` (with a reason and a suggestion). Model output is validated before any field is used.
- `src/prompt.ts`: instructions, with concrete criteria for when to refuse, live in the system prompt. The headline and snippet go in the user message inside `<headline>` / `<snippet>` tags, with tag-closing text stripped.
- `src/validate.ts`: checks on meaning, in code, applied to generated drafts, to editor edits, and again at approval: the close time must be in the future, the question must end in `?`, and the source must be specific ("official sources", "news reports", "the government" are rejected). Subjective words ("improve", "significant") raise a warning for the editor.
- `src/generate.ts`: forces a tool call, validates with Zod, runs the meaning checks. 20s timeout, at most 2 retries. Any failure returns a `failed` state with a retry option instead of throwing.
- `src/db.ts` / `src/server.ts`: drafts are saved as `draft`. Editors can edit (`PATCH`), discard, or approve. Only the approve route publishes, and it re-validates first, so a draft whose close time has passed since it was written is refused (409).
- `golden/cases.json`: 11 labelled headlines: three expected markets and eight expected rejections covering vague verbs, no threshold, opinions, already-settled events, outcomes no public source reports, a private individual, and a prompt-injection headline. `npm run eval` runs them against the real model; the offline tests check the set's structure.

## Limits

`npm run eval` needs an API key and hasn't been run against the live model in this repo's history, so the golden set shows what the tool is *meant* to refuse, and the offline tests cover everything that happens after the model answers. The source check catches generic sources but can't tell whether a named source really publishes the number.

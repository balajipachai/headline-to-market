import Anthropic from "@anthropic-ai/sdk";
import { modelOutput, toolInputSchema, type MarketDraft } from "./schema.js";
import { systemPrompt, userMessage } from "./prompt.js";
import { validateDraft } from "./validate.js";

export const MODEL = process.env.MODEL ?? "claude-sonnet-5-5";
export const TIMEOUT_MS = 20_000;
export const MAX_RETRIES = 2;

export type GenerateResult =
  | { status: "draft"; market: MarketDraft; warnings: string[] }
  | { status: "unresolvable"; reason: string; suggestion?: string }
  | { status: "failed"; reason: string; canRetry: boolean };

// Narrow shape of the client we use, so tests can pass a fake.
export type ModelClient = {
  messages: { create: (body: any, opts?: any) => Promise<{ content: any[] }> };
};

export function createClient(): ModelClient {
  return new Anthropic({ timeout: TIMEOUT_MS, maxRetries: MAX_RETRIES });
}

export async function generateMarket(
  headline: string,
  client: ModelClient,
  now: Date = new Date(),
  snippet?: string,
): Promise<GenerateResult> {
  let response;
  try {
    response = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 1500,
        system: systemPrompt(now),
        messages: [{ role: "user", content: userMessage(headline, snippet) }],
        tools: [
          {
            name: "submit_market",
            description: "Submit the market draft, or explain why none is possible.",
            input_schema: toolInputSchema,
          },
        ],
        tool_choice: { type: "tool", name: "submit_market" },
      },
      { timeout: TIMEOUT_MS, maxRetries: MAX_RETRIES },
    );
  } catch {
    return { status: "failed", reason: "The model could not be reached. Try again.", canRetry: true };
  }

  const block = response.content.find((b) => b.type === "tool_use" && b.name === "submit_market");
  const parsed = modelOutput.safeParse(block?.input);
  if (!parsed.success) {
    return {
      status: "failed",
      reason: "The model's answer didn't match the expected format. Retry, or draft this one manually.",
      canRetry: true,
    };
  }

  const out = parsed.data;
  if (out.outcome === "unresolvable") return { status: "unresolvable", reason: out.reason, suggestion: out.suggestion };

  // Meaning checks run in code, not only in the prompt.
  const { problems, warnings } = validateDraft(out, now);
  if (problems.length) {
    return { status: "failed", reason: `${problems.join(" ")} Retry, or draft this one manually.`, canRetry: true };
  }
  return { status: "draft", market: out, warnings };
}

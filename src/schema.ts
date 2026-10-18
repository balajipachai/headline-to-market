import { z } from "zod";

// The model must return one of two shapes: a settleable market, or a
// refusal with a reason. "unresolvable" is a first-class outcome.
const market = z.object({
  outcome: z.literal("market"),
  question: z.string().min(10).max(300),
  closeTime: z.iso.datetime({ offset: true }),
  resolutionSource: z.string().min(3).max(200),
  edgeCaseRule: z.string().min(10).max(500),
});

const unresolvable = z.object({
  outcome: z.literal("unresolvable"),
  reason: z.string().min(5).max(500),
});

export const modelOutput = z.discriminatedUnion("outcome", [market, unresolvable]);

export type ModelOutput = z.infer<typeof modelOutput>;
export type MarketDraft = z.infer<typeof market>;

// Flat JSON Schema handed to the model as the tool's input schema.
export const toolInputSchema = {
  type: "object" as const,
  properties: {
    outcome: { type: "string", enum: ["market", "unresolvable"] },
    question: { type: "string", description: "Precise yes/no question. Only when outcome is market." },
    closeTime: { type: "string", description: "ISO 8601 timestamp with offset, in the future. Only when outcome is market." },
    resolutionSource: { type: "string", description: "A named, checkable source that decides the market. Only when outcome is market." },
    edgeCaseRule: { type: "string", description: "Rule for awkward cases (postponed, ambiguous, source unavailable). Only when outcome is market." },
    reason: { type: "string", description: "Why no fair market can be made. Only when outcome is unresolvable." },
  },
  required: ["outcome"],
};

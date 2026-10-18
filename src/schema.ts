import { z } from "zod";

// The model must return one of two shapes: a settleable market, or a refusal
// with a reason. "unresolvable" is a first-class outcome.
const market = z.object({
  outcome: z.literal("market"),
  question: z.string().min(10).max(300),
  closeTime: z.iso.datetime({ offset: true }),
  resolutionSource: z.string().min(3).max(200),
  yesCriteria: z.string().min(10).max(500),
  edgeCaseRule: z.string().min(10).max(500),
  rationale: z.string().min(10).max(600),
});

const unresolvable = z.object({
  outcome: z.literal("unresolvable"),
  reason: z.string().min(5).max(500),
  suggestion: z.string().max(500).optional(),
});

export const modelOutput = z.discriminatedUnion("outcome", [market, unresolvable]);

export type ModelOutput = z.infer<typeof modelOutput>;
export type MarketDraft = z.infer<typeof market>;
export type Unresolvable = z.infer<typeof unresolvable>;

// Flat JSON Schema handed to the model as the tool's input schema.
export const toolInputSchema = {
  type: "object" as const,
  properties: {
    outcome: { type: "string", enum: ["market", "unresolvable"] },
    question: { type: "string", description: "Precise yes/no question ending in '?'. Only when outcome is market." },
    closeTime: { type: "string", description: "ISO 8601 timestamp with offset, in the future. Only when outcome is market." },
    resolutionSource: { type: "string", description: "One specific, named, publicly checkable source (an organisation plus the document, page or dataset). Never 'official sources' or 'news reports'. Only when outcome is market." },
    yesCriteria: { type: "string", description: "Exactly what must be observed in the source for the market to resolve YES. Only when outcome is market." },
    edgeCaseRule: { type: "string", description: "How postponement, ambiguity, revision, or an unavailable source resolve. Only when outcome is market." },
    rationale: { type: "string", description: "Two sentences for the editor: why this source and close time were chosen. Only when outcome is market." },
    reason: { type: "string", description: "Why no fair market can be made. Only when outcome is unresolvable." },
    suggestion: { type: "string", description: "How the editor could reword or narrow the headline so it could become a market. Only when outcome is unresolvable." },
  },
  required: ["outcome"],
};

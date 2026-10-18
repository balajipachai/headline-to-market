// Checks on meaning, not just shape. Used on generated drafts, on editor edits, and again at approval.
export type DraftFields = {
  question: string;
  closeTime: string;
  resolutionSource: string;
  yesCriteria: string;
  edgeCaseRule: string;
};

const GENERIC_SOURCES: RegExp[] = [
  /^(the )?(official|reliable|credible|trusted|public|various|multiple|several|relevant|authoritative)( [a-z]+)? (sources?|websites?|statements?|channels?|authorities)$/i,
  /^(the )?(news|media|press|online|internet|social media)( [a-z]+)?$/i,
  /^(the )?(government|authorities|officials?|experts?|analysts?|google|wikipedia|twitter|x)$/i,
  /^(public|general) (knowledge|consensus|opinion)$/i,
];

// Subjective words that usually mean the question still leaves room for argument.
const VAGUE = /\b(improve[sd]?|better|worse|successful(ly)?|good|bad|significant(ly)?|major|substantial(ly)?|soon|popular|effective(ly)?)\b/i;

export type Validation = { problems: string[]; warnings: string[] };

export function validateDraft(d: DraftFields, now: Date): Validation {
  const problems: string[] = [];
  const warnings: string[] = [];

  const close = Date.parse(d.closeTime);
  if (Number.isNaN(close)) problems.push("The close time is not a valid date and time.");
  else if (close <= now.getTime()) problems.push("The close time is not in the future.");

  if (!d.question.trim().endsWith("?")) problems.push("The question must be a yes/no question ending in '?'.");

  const source = d.resolutionSource.trim();
  if (GENERIC_SOURCES.some((re) => re.test(source)) || source.split(/\s+/).length < 2) {
    problems.push(`"${source}" is not a specific source. Name the organisation and the document, page or dataset that decides it.`);
  }

  if (d.yesCriteria.trim().toLowerCase() === d.edgeCaseRule.trim().toLowerCase()) {
    problems.push("The YES criteria and the edge-case rule are identical; they should say different things.");
  }

  const vague = d.question.match(VAGUE);
  if (vague) warnings.push(`The question uses "${vague[0]}", which can be argued either way. Consider a measurable threshold.`);

  return { problems, warnings };
}

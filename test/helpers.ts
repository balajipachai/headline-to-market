// Shared test fixture: a model answer that passes every check.
export const good = {
  outcome: "market",
  question: "Will the RBI announce a repo rate cut on 5 December 2026?",
  closeTime: "2026-12-05T12:00:00+05:30",
  resolutionSource: "RBI Monetary Policy Committee press release",
  yesCriteria: "The RBI press release for the December 2026 meeting states a reduction in the repo rate.",
  edgeCaseRule: "If the meeting is postponed beyond 5 December 2026 or the rate is unchanged, the market resolves No.",
  rationale: "The RBI publishes a press release after every meeting; the meeting date is the natural close.",
};

// Reports token usage as a named score. Does not pass/fail — use for comparison only.
// Scores: lower completion tokens = better (more direct answer).
module.exports = (output, context) => {
  const tu = context.response?.tokenUsage ?? {};
  const completion = tu.completion ?? 0;
  const prompt = tu.prompt ?? 0;
  const total = tu.total ?? 0;

  return {
    pass: true,
    score: completion > 0 ? 1 / completion : 0, // higher score = fewer completion tokens
    reason: `prompt=${prompt} completion=${completion} total=${total}`,
    namedScores: {
      prompt_tokens: prompt,
      completion_tokens: completion,
      total_tokens: total,
    },
  };
};

# 2026-10-12 — Live re-run with tools off (supersedes 2026-10-01)

[#37](https://github.com/JayPokale/Chisle/issues/37) found that the
2026-10-01 re-run did not turn tools off for Claude Code. Pi got `--no-tools`.
Claude Code got nothing. In 14 of 26 prompts at least one arm took several
turns: the model tried `Write` (38 denials) or `Bash` (11), was refused, then
wrote the code again in the reply. Billed and visible tokens counted that code
twice, by chance, and the published headline came from those cells.

## Method

Same as [2026-10-01](./2026-10-01-live-rerun.md): the same 13 prompts, 2 seeds,
26 cells per arm, `claude-haiku-4-5-20251001`, Claude Code 2.1.285, the same
rival versions (caveman `ef6050c5e184`, ponytail 4.8.3) and the same Chisle
ruleset. The only change is in `run-live.sh`: `--tools "" --strict-mcp-config`.
Every one of the 104 cells is single-turn. Cells:
`raw-oct-notools/{default,large}-s{1,2}/`. The 2026-10-01 cells stay in
`raw-oct/` as the record of the flawed run.

`billed` is `usage.output_tokens` and includes reasoning. `visible` is billed
minus `modelUsage.thinkingTokens`. Intervals are a 95% bootstrap over cells.

## Results

| % of bare (n=26) | caveman | ponytail | chisle |
|---|--:|--:|--:|
| billed output | 81% | 127% | 82% |
| 95% CI | 63–105% | 102–155% | 67–104% |
| visible answer | 65% | 58% | 56% |
| 95% CI | 47–85% | 48–72% | 48–67% |
| reasoning | 164% | 483% | 218% |
| answer lines | 66% | 54% | 52% |
| coding, billed (n=14) | 69% | 154% | 79% |
| coding, visible (n=14) | 57% | 47% | 52% |
| explanation, billed (n=12) | 101% | 86% | 88% |
| short answers, billed (n=13) | 147% | 157% | 111% |
| long answers, billed (n=13) | 68% | 121% | 76% |
| backfires (cell above bare) | 13/26 | 18/26 | 12/26 |
| worst cell | 339% | 493% | 194% |

## Reading it

- **All three rulesets shorten the visible answer by about the same amount.**
  56–65%, with overlapping intervals. With tools off, ponytail's coding answers
  are the shortest (47%). The old claim that caveman and ponytail make answers
  longer came from the tool-contaminated cells and does not hold.
- **On billed tokens Chisle and caveman tie** (82% and 81%), and both intervals
  reach 100%. Only ponytail's billed total is clearly different from a bare
  model, and it is higher: its reasoning grows almost 5×, which more than
  cancels its shorter answers.
- **Every ruleset raises reasoning** on Haiku 4.5 (164–483%). Chisle's
  "Thinking Is Billed Too" rule does not prevent it.
- **Short answers still cost more under every ruleset.** A short reply has
  little to cut, and the extra reasoning shows.
- The old headline, "coding answers 33% shorter and 24% cheaper", came from the
  flawed run. The tools-off numbers are 48% shorter and 21% cheaper (n=14);
  the billed interval reaches 100%, so the cost claim is not significant.

This suite measures single-turn writing only. Whole-session cost on real repos
is in [the agentic benchmark](../agentic/README.md), where Chisle and a bare
model tie on correctness and cost.

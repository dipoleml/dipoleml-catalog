# Agentic Benchmark — Obsidian+MCP vs mega-brain

**Real Claude Code sessions** · n=1 per question per run

## Summary (latest run)

| metric | Obsidian+MCP | **mega-brain** |
|---|--:|--:|
| accuracy | 83% | **100%** |
| tool calls avg | 0.7 | **0** |
| turns avg | 1.8 | **1** |
| tokens avg | 42,509 | **16,025 (−62%)** |
| latency avg ms | 8,212 | **3,983 (−51%)** |

## Previous run

| metric | Obsidian+MCP | **mega-brain** |
|---|--:|--:|
| accuracy | 17% | **100%** |
| tool calls avg | 4.0 | **0** |
| tokens avg | 175,461 | **16,025 (−91%)** |
| latency avg ms | 17,298 | **3,543 (−80%)** |

## Why Obsidian results vary

Obsidian+MCP accuracy fluctuates between runs because the vault contains generic prose notes — when the model guesses from training data (0 tool calls), it sometimes gets lucky on common knowledge (join keys, status values). When it reads the vault and fails to find exact values, accuracy drops.

mega-brain is stable across runs because it injects exact schema values directly — no guessing, no exploration.

## Method

- **Obsidian+MCP**: Claude with filesystem MCP pointing to a vault of plain Markdown notes (no YAML schema). Uses tools to explore before answering.
- **mega-brain**: OKF concepts injected at `SessionStart`. Claude answers from context — no tool calls.

6 questions with project-specific values unknowable from training data (fictional column names, exclusion filters, exact formulas).

## Reproduce

```bash
python3 benchmarks/run-agentic-bench.py
```

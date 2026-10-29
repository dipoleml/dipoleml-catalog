# Refine — doc and strategy flags (gated reference)

> Read from SKILL.md only when the arguments carry any of `--docs`, `--no-docs`, `--strategy`,
> `--no-strategy`.

## Flag parsing

Strip the four flags from the arguments before detecting the input so they are not mistaken for an id or path. Carry the resulting force values into the SKILL.md gate block:

```bash
RAW_ARGS="$ARGUMENTS"
DOC_AWARE_FORCE=""        # "" = autodetect, "on" = forced on, "off" = forced off (controls glossary + decisions)
STRATEGY_AWARE_FORCE=""   # "" = autodetect, "on" = forced on, "off" = forced off (controls strategy independently)

# Glossary + decisions: --docs / --no-docs (mutually exclusive; --no-docs wins)
if [[ "$RAW_ARGS" == *"--no-docs"* ]]; then
  DOC_AWARE_FORCE="off"
  RAW_ARGS="${RAW_ARGS//--no-docs/}"
elif [[ "$RAW_ARGS" == *"--docs"* ]]; then
  DOC_AWARE_FORCE="on"
  RAW_ARGS="${RAW_ARGS//--docs/}"
fi

# Strategy: explicit --strategy / --no-strategy always wins. Otherwise --docs / --no-docs cascades.
# Order: explicit pair first (mutually exclusive; --no-strategy wins on conflict), then docs cascade.
if [[ "$RAW_ARGS" == *"--no-strategy"* ]]; then
  STRATEGY_AWARE_FORCE="off"
  RAW_ARGS="${RAW_ARGS//--no-strategy/}"
elif [[ "$RAW_ARGS" == *"--strategy"* ]]; then
  STRATEGY_AWARE_FORCE="on"
  RAW_ARGS="${RAW_ARGS//--strategy/}"
elif [[ "$DOC_AWARE_FORCE" == "off" ]]; then
  # --no-docs alone cascades to strategy: matrix row 3 says all three off.
  STRATEGY_AWARE_FORCE="off"
elif [[ "$DOC_AWARE_FORCE" == "on" ]]; then
  # --docs alone cascades to strategy: matrix row 2 says all three on.
  STRATEGY_AWARE_FORCE="on"
fi

RAW_ARGS=$(printf "%s" "$RAW_ARGS" | tr -s ' ' | sed 's/^ //;s/ $//')
# RAW_ARGS now contains the Flow ID / file path / empty.
```

Each pair is mutually exclusive (the `if/elif` checks the negation first so it wins on conflict). The `--docs` / `--strategy` tokens get left in the residual `RAW_ARGS` after stripping, which surfaces downstream as an unrecognized argument — loud failure beats silent acceptance of conflicting state.

## Flag matrix

Doc-aware flags (rows describe glossary / decisions / strategy gates):

| Flags | Glossary | Decisions | Strategy |
|-------|----------|-----------|----------|
| (default) | autodetect | autodetect | autodetect |
| `--docs` | on | on | on |
| `--no-docs` | off | off | off |
| `--no-docs --strategy` | off | off | on |
| `--docs --no-strategy` | on | on | off |

`--docs` / `--no-docs` cascade to strategy when no explicit `--strategy` / `--no-strategy` is passed (matrix rows 2 + 3). Explicit `--strategy` / `--no-strategy` always wins (matrix rows 4 + 5) and is the only way to drive a different value into strategy than into glossary + decisions. The matrix is the contract.

The `--scope` lens is orthogonal to this matrix: any lens combines with any doc/strategy flag.

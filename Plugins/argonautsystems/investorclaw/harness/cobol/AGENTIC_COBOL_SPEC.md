# Agentic COBOL — Specification

**Status:** Draft v0.2 (2026-04-27 — adds Class A/B routing distinction and Class B safety-critical reference architecture)
**Editors:** Jason Perlow (perlowja), mac-dev-host personal-claude session
**Scope:** Fleet routing-acceptance methodology for agent-skill products.
Targets InvestorClaw and any future fleet adapter that
exposes natural-language tool routing.

---

## 1. Abstract

Agentic COBOL is a testing methodology for products whose value
proposition is *"the agent picks the right tool from natural language."*
It treats the system under test as the **LLM-plus-tools combo** rather
than the tools alone, and evaluates whether the agent routes a corpus
of natural-language utterances to the expected backend operations.

The pattern revives COBOL's 1959 design ethos — domain expert speaks
business English, machine routes to the right operation — but accepts
that 2026's stochastic LLM substrate replaces COBOL's deterministic
parser. Compile-time guarantees become empirical sampling.

---

## 2. Problem statement

Modern testing pyramids assume the system under test is the code.
For agent-skill products, the system is the LLM-plus-tools combo.
Three failure modes that traditional testing misses:

1. **Silent misrouting.** The agent picks the wrong tool. Unit tests
   on each tool pass; the user-visible product is broken because the
   right tool is never invoked. Examples: a `news` command that
   doesn't get triggered for "any M&A news today?", a `lookup` command
   that doesn't fire for "what's NVDA worth?", a `setup` command that
   greedily preempts portfolio queries.

2. **Global attention shift.** Changing the description text of one
   command alters routing for *unrelated* commands, because LLM
   routing depends on the entire skill catalog at once. Per-component
   tests cannot detect this. Empirical example: tightening InvestorClaude's
   `ic-setup` description in v2.3.5→v2.3.6 caused regressions in
   `ic-bonds`, `ic-news`, `ic-lookup` — none of whose descriptions were
   touched.

3. **Cross-runtime variance.** The same prompt routes differently on
   Claude Code vs OpenClaw vs ZeroClaw vs Hermes. A test that passes
   on the dev machine can fail on the production runtime. Component
   tests run in process; routing tests must run in the deployed
   runtime + LLM combo.

Agentic COBOL addresses all three by making routing the unit of test.

---

## 3. Methodology

### 3.1 Acceptance pattern

The acceptance pattern depends on the product's routing class.

**Class A (best-effort routing) — routing acceptance:**

1. **Given** a runtime is loaded with the system under test.
2. **When** the user submits a natural-language utterance.
3. **Then** the agent should invoke a backend operation matching
   one of the scenario's `expected_routes`.

A scenario PASSES if any expected route is invoked. Deflection
scenarios PASS if no portfolio command is invoked (tracked via the
`DEFLECT_OK` sentinel in `expected_routes`).

**Class B (safety-critical routing) — verbatim-narrative acceptance:**

The Class B pattern is fundamentally different because routing
decisions are absent (every command always runs). The acceptance
test instead validates that the narrator quotes the envelope verbatim:

1. **Given** a runtime is loaded with the system under test, and a
   pre-computed envelope with known section data.
2. **When** the user submits a natural-language utterance.
3. **Then** the narrator's response should:
   a. Quote ONLY numbers that appear verbatim in the envelope, AND
   b. Reference data appropriate to the question's intent
      (`expected_focus_section` matches a section the narrator drew
      from), AND
   c. Refuse appropriately when data is out-of-envelope (instead of
      fabricating).

A scenario PASSES if (a) AND (b) AND (c) all hold. Each scenario in
`nlq-prompts.json` for a Class B product carries `expected_focus_section`
in addition to (or instead of) `expected_routes`. Programmatic
fabrication detection: every numeric claim in the response is
verified against the envelope by exact-substring match.

### 3.2 Empirical sampling

Because the LLM substrate is stochastic, single-trial scoring is
unreliable. Recommended:

- **Per-trial:** record the routing decision for one prompt invocation.
- **Per-prompt:** average over 3 trials, take majority routing.
- **Per-release:** report per-runtime score and 95% CI.

For dev iteration (turnaround speed > certainty), single-trial scoring
is acceptable but should be flagged as such in reports.

### 3.3 Per-runtime gates — by routing class

Acceptance gates depend on the **routing class** of the product, which
determines how reliable routing must be:

#### Class A: Best-effort routing

For products where misrouting is annoying but recoverable
(developer tools, content generation, casual chat plugins). LLM noise
floors are accepted; gates are sub-100% and per-runtime.

| Runtime | Substrate | Strict floor | Publish bar |
|---|---|---:|---:|
| OpenClaw | GRAEAE consensus orchestration | 25/30 (83%) | 27/30 (90%) |
| ZeroClaw | LLM-driven (configurable provider) | 21/30 (70%) | 24/30 (80%) |
| Hermes | Smaller-model LLM | 17/30 (57%) | 20/30 (67%) |
| Claude Code | LLM-driven (Anthropic) | 21/30 (70%) | 24/30 (80%) |

Empirical evidence backing these gates comes from the v2.3.x → v2.4.0
cycle: description tuning plateaued at 12/15 (80%) on Claude Code; the
v2.4.0 architectural consolidation (27 commands → 13) measured 19/30
(63%) — all in the LLM-routing-noise band. Class A gates are *what
description tuning can achieve*.

#### Class B: Safety-critical routing

For products where misrouting can cause real-world harm — financial
data, medical information, legal advice, infrastructure operations,
anything where a fabricated answer or wrong tool selection has user
cost. **Class B gates are 100% across all runtimes, achieved
architecturally, NOT through description tuning.**

| Runtime | Substrate | Strict floor | Publish bar |
|---|---|---:|---:|
| OpenClaw | Deterministic-engine + verbatim-narrator | 30/30 (100%) | 30/30 (100%) |
| ZeroClaw | Deterministic-engine + verbatim-narrator | 30/30 (100%) | 30/30 (100%) |
| Hermes | Deterministic-engine + verbatim-narrator | 30/30 (100%) | 30/30 (100%) |
| Claude Code | Deterministic-engine + verbatim-narrator | 30/30 (100%) | 30/30 (100%) |

The architectural pattern that achieves Class B (see §3.4):

1. **Eager precomputation.** Every relevant backend command runs
   *before* the LLM sees the user's prompt. Output is a single
   HMAC-signed JSON envelope.
2. **Verbatim-narrator constraint.** The LLM only narrates from the
   envelope. It is strictly prompted to quote numbers verbatim and
   refuse to supplement from training data.
3. **Programmatic verification.** Every numeric value in the
   narrator's output must be findable in the envelope; mismatches
   raise a fabrication error and the response is rejected.

The routing decision evaporates because the router class becomes
"every command always runs." The LLM's role narrows from "router +
narrator" to just "narrator over verified data" — a much easier
problem with much higher reliability.

#### Choosing a class

```
Could a misrouted answer cause measurable user harm
(financial loss, health risk, legal exposure, lost work)?
  ├─ Yes → Class B (safety-critical, 100% gates, deterministic + verbatim)
  └─ No → Class A (best-effort, per-runtime gates, LLM-routed)
```

For the InvestorClaw fleet, Class B is the correct
class (personal financial data; misrouting could lead the user to
make decisions on fabricated numbers). The v2.5 cycle migrates the
fleet from Class A to Class B.

### 3.4 Class B reference architecture: deterministic-engine + verbatim-narrator

```
User prompt arrives
    ↓
Plugin checks envelope cache (per-portfolio, per-section TTLs)
    ↓
If cache miss → emit user-facing wait message
                ("Running your portfolio analysis through ic-engine.
                  The deterministic pipeline is computing holdings,
                  performance, bonds, analyst data, news, and risk
                  synthesis from authoritative sources — this takes
                  30-60 seconds the first time you ask. Subsequent
                  questions in this session will use the cached data
                  and respond instantly. Please wait.")
              → fire `investorclaw run --all` (parallel pipeline:
                holdings + performance + bonds + analyst + news +
                synthesize + optimize + cashflow + peer)
              → wait for envelope OR partial envelope on per-section
                failure
    ↓
Pass envelope + user prompt to verbatim-narrator
    ↓
Narrator system prompt enforces:
  1. Use ONLY data from this JSON envelope. Quote numbers VERBATIM.
  2. If user asks about something not in envelope → refuse + tell
     them which command would fetch it.
  3. NEVER infer, estimate, supplement, or substitute from training data.
  4. Include the envelope's ic_result.hmac in the response footer.
    ↓
Narrator output passes through fabrication validator:
  - Every dollar amount, percentage, ratio, or numeric claim in the
    output must be findable verbatim in the envelope.
  - Failures raise FabricationError; canned refusal message shown
    to user.
    ↓
Reply (with HMAC provenance footer)
```

Key properties of this architecture:

- **Routing is structurally absent.** Every command runs eagerly. The
  LLM never picks between commands; it picks how to *narrate* over a
  fixed dataset. The 80% noise floor that bounded Class A doesn't
  apply.
- **Fabrication is structurally impossible.** The narrator's only data
  source is the envelope. Validation catches any numeric claim that
  doesn't appear verbatim in the envelope.
- **Provenance is auditable.** Every response carries an HMAC hash
  pointing to the envelope it was narrated from; the envelope itself
  is signed and timestamped.
- **Refusal beats fabrication.** When data is missing, the narrator
  refuses + recommends a command. Users get "I don't know" instead of
  "here's a made-up number."
- **Cache amortizes the cost.** First prompt of a session: 30-60s
  wait while the pipeline runs. Subsequent prompts: instant
  cache-hit, narrator only.

This is the v2.5 fleet target architecture.

---

## 4. Prompt format

### 4.0 Visual COBOL view — what the spec actually looks like

The methodology is named after COBOL because the *visual structure* of the
spec maps onto COBOL's two-division program layout. COBOL programs were
deliberately written so a non-programmer (an accountant, a payroll clerk)
could read them aloud and verify behavior:

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. PAYROLL-BONUS.

       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  EMPLOYEE-RECORD.
           05  EMP-NAME              PIC X(30).
           05  MONTHLY-PAY           PIC 9(7)V99.
           05  YEAR-TO-DATE-EARNINGS PIC 9(9)V99.
       01  CONSTANTS.
           05  BONUS-THRESHOLD       PIC 9(7)V99 VALUE 100000.00.

       PROCEDURE DIVISION.
       MAIN-PROCESS.
           READ EMPLOYEE-FILE INTO EMPLOYEE-RECORD
               AT END GO TO END-PROGRAM.
           ADD MONTHLY-PAY TO YEAR-TO-DATE-EARNINGS
               GIVING NEW-TOTAL.
           IF NEW-TOTAL > BONUS-THRESHOLD THEN
               PERFORM CALCULATE-BONUS.
           GO TO MAIN-PROCESS.
       END-PROGRAM.
           CLOSE EMPLOYEE-FILE.
           STOP RUN.
```

A 1959 accountant could read that aloud — *"READ employee record. ADD
monthly pay to year-to-date earnings. IF new total greater than bonus
threshold, PERFORM calculate bonus."* — and verify the program represented
what payroll actually wanted. The English-prose surface *was* the
acceptance test.

Agentic COBOL's spec format is the same shape: a **DATA DIVISION** of
natural-language prompts users actually say, paired with a **PROCEDURE
DIVISION** of expected tool routes the agent must invoke. Read aloud, it
should be possible for a domain expert (a portfolio manager, a finance
analyst) to verify both.

Here's an actual slice of `nlq-prompts.json` rendered the same way COBOL
renders DATA + PROCEDURE divisions:

```cobol
      *  ───────────────  AGENTIC COBOL DIVISION  ───────────────
      *  Spec: harness/cobol/nlq-prompts.json
      *  Domain: portfolio analysis (InvestorClaw)
      *  Acceptance: read aloud; verify the routes match the prompts.

       DATA DIVISION.
       NLQ-CORPUS SECTION.

       01  P01-HOLDINGS-1.
           05  PROMPT-TEXT     "What is in my portfolio right now?".
           05  INTENT          "portfolio-snapshot".
           05  CATEGORY        "holdings".

       01  P03-PERFORMANCE-1.
           05  PROMPT-TEXT     "How has my portfolio performed this year?".
           05  INTENT          "performance-check".
           05  CATEGORY        "performance".

       01  P04-PERFORMANCE-2.
           05  PROMPT-TEXT     "What is my Sharpe ratio and max drawdown?".
           05  INTENT          "performance-check".
           05  CATEGORY        "performance".

       01  P16-NEWS-MERGER.
           05  PROMPT-TEXT     "Any big mergers or acquisitions in the
                                news today?".
           05  INTENT          "news-merger".
           05  CATEGORY        "news".

       01  P22-BONDS-DURATION.
           05  PROMPT-TEXT     "Show my bond duration.".
           05  INTENT          "bonds-duration".
           05  CATEGORY        "bonds".


       PROCEDURE DIVISION.
       AGENT-ROUTING SECTION.

       WHEN PROMPT MATCHES P01-HOLDINGS-1
           PERFORM PORTFOLIO-VIEW SECTION="holdings".
           ON CLAUDE-CODE INVOKE "/investorclaw:ask".
           ON OPENCLAW    INVOKE "portfolio_view section=holdings".
           ON ZEROCLAW    INVOKE "portfolio_view section=holdings".
           ON HERMES      INVOKE "portfolio_view section=holdings".

       WHEN PROMPT MATCHES P03-PERFORMANCE-1
           PERFORM PORTFOLIO-VIEW SECTION="performance".

       WHEN PROMPT MATCHES P04-PERFORMANCE-2
           PERFORM PORTFOLIO-VIEW SECTION="performance".

       WHEN PROMPT MATCHES P16-NEWS-MERGER
           PERFORM PORTFOLIO-MARKET SECTION="news" TOPIC="merger".

       WHEN PROMPT MATCHES P22-BONDS-DURATION
           PERFORM PORTFOLIO-VIEW SECTION="bonds" TOPIC="duration".

       VERDICT SECTION.
       ACCEPT WHEN
           IC-RESULT-PRESENT IS TRUE
           AND HMAC-PRESENT IS TRUE
           AND NARRATIVE-CHARS NOT LESS THAN 200
           AND BODY-CHARS NOT LESS THAN 100
           AND REJECTION-MARKERS COUNT EQUALS 0.
       REJECT WHEN
           NARRATIVE CONTAINS "I don't have data on that"
           OR NARRATIVE CONTAINS "Section did not run"
           OR NARRATIVE STARTS-WITH "ic-engine completed your portfolio
                                     analysis with [".

       END PROGRAM.
```

That's not actually executable COBOL — it's a **visualization** of the
acceptance spec in the form a 1959 COBOL programmer would recognize. The
real on-disk format is JSON (machine-friendly, see §4.1) but the
conceptual shape is the same: prompts are data records; expected routes
are procedure clauses; verdict is the acceptance gate.

The visualization can be machine-generated from `nlq-prompts.json` via
`tools/emit-cobol.py` (planned alongside the Gherkin emitter in §4.2).
The JSON stays authoritative; the COBOL view is a reading lens for
domain experts who want to walk the spec in the original 1959 form.

#### 4.0a How close is the visualization to actual 1959 COBOL?

Honest answer: the DATA DIVISION above is mostly faithful 1959-style
COBOL; the PROCEDURE DIVISION above is COBOL-*flavored pseudocode* with
several invented constructs.

**What's authentic** (would parse on a 1959 compiler):

- `IDENTIFICATION DIVISION` / `DATA DIVISION` / `PROCEDURE DIVISION` —
  the three top-level divisions, in correct order.
- `WORKING-STORAGE SECTION` — real DATA DIVISION sub-section.
- `01` group items with `05` subordinate items, level numbers correct.
- Hyphenated UPPERCASE identifiers, period terminators, free-form
  area-A/area-B layout (modern compilers relax the strict 7-72 columns).
- Comment lines starting with `*`.

**What's invented** (would NOT parse on any COBOL compiler):

- `WHEN PROMPT MATCHES P01-HOLDINGS-1` — there's no `WHEN ... MATCHES`
  construct. COBOL-85 has `EVALUATE` / `WHEN` / `END-EVALUATE` for case
  branching, and 1959 COBOL uses `IF` / `ELSE`. Both require explicit
  wrapping.
- `ON CLAUDE-CODE INVOKE "..."` — `ON` clauses exist (`ON SIZE ERROR`,
  `ON OVERFLOW`) but not as a generic dispatch construct.
- `ACCEPT WHEN` / `REJECT WHEN` — `ACCEPT` is a real verb (it reads
  console input) but not used this way.
- `STARTS-WITH`, `COUNT EQUALS 0` — string functions like that landed
  much later (`INSPECT`, `STRING`/`UNSTRING`); 1959 had only `MOVE` and
  comparison.

So §4.0 is best read as a *visual rendering* — the silhouette of a COBOL
program — not as something a 1959 IBM 705 would actually compile.

A **strict-1959-style** version of the same spec, using only verbs
that existed in COBOL-60 (Read / Move / If / Perform / Stop Run / Add /
Subtract):

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. INVESTORCLAW-AGENT-ROUTING.
       AUTHOR. JASON-PERLOW.
       INSTALLATION. ARGONAUTSYSTEMS.
       DATE-WRITTEN. 2026-05-04.

       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT NLQ-CORPUS-FILE
               ASSIGN TO "harness/cobol/nlq-prompts.json"
               ORGANIZATION IS LINE SEQUENTIAL.

       DATA DIVISION.
       FILE SECTION.
       FD  NLQ-CORPUS-FILE.
       01  CORPUS-RECORD              PIC X(512).

       WORKING-STORAGE SECTION.
       01  CURRENT-PROMPT.
           05  PROMPT-ID              PIC X(20).
           05  PROMPT-TEXT            PIC X(200).
           05  PROMPT-INTENT          PIC X(40).
           05  PROMPT-CATEGORY        PIC X(20).

       01  EXPECTED-ROUTE.
           05  RT-RUNTIME             PIC X(20).
           05  RT-COMMAND             PIC X(80).

       01  AGENT-RESPONSE.
           05  IC-RESULT-FLAG         PIC X    VALUE "N".
               88  IC-RESULT-OK              VALUE "Y".
           05  HMAC-FLAG              PIC X    VALUE "N".
               88  HMAC-OK                   VALUE "Y".
           05  NARRATIVE-CHARS        PIC 9(7) VALUE 0.
           05  BODY-CHARS             PIC 9(7) VALUE 0.
           05  REJECTION-COUNT        PIC 9(3) VALUE 0.

       01  VERDICT                    PIC X(4) VALUE "FAIL".
           88  VERDICT-PASS                  VALUE "PASS".

       01  EOF-FLAG                   PIC X    VALUE "N".
           88  END-OF-CORPUS                  VALUE "Y".

       PROCEDURE DIVISION.

       MAIN-LINE SECTION.
           OPEN INPUT NLQ-CORPUS-FILE.
           PERFORM LOAD-PROMPT
               UNTIL END-OF-CORPUS.
           CLOSE NLQ-CORPUS-FILE.
           STOP RUN.

       LOAD-PROMPT.
           READ NLQ-CORPUS-FILE INTO CURRENT-PROMPT
               AT END MOVE "Y" TO EOF-FLAG
               NOT AT END
                   PERFORM ROUTE-AGENT
                   PERFORM SCORE-RESPONSE.

       ROUTE-AGENT.
           IF PROMPT-ID = "P01-HOLDINGS-1"
               MOVE "portfolio_view section=holdings" TO RT-COMMAND.
           IF PROMPT-ID = "P03-PERFORMANCE-1"
               MOVE "portfolio_view section=performance" TO RT-COMMAND.
           IF PROMPT-ID = "P04-PERFORMANCE-2"
               MOVE "portfolio_view section=performance" TO RT-COMMAND.
           IF PROMPT-ID = "P16-NEWS-MERGER"
               MOVE "portfolio_market section=news topic=merger"
                   TO RT-COMMAND.
           IF PROMPT-ID = "P22-BONDS-DURATION"
               MOVE "portfolio_view section=bonds topic=duration"
                   TO RT-COMMAND.
           PERFORM INVOKE-AGENT-WITH-ROUTE.

       SCORE-RESPONSE.
           MOVE "FAIL" TO VERDICT.
           IF IC-RESULT-OK
              AND HMAC-OK
              AND NARRATIVE-CHARS NOT LESS THAN 200
              AND BODY-CHARS NOT LESS THAN 100
              AND REJECTION-COUNT = 0
               MOVE "PASS" TO VERDICT.

       INVOKE-AGENT-WITH-ROUTE.
           DISPLAY "Invoking agent on " RT-RUNTIME " with " RT-COMMAND.
      *    Real implementation: shells out to the runtime CLI.
      *    Captures IC-RESULT-FLAG, HMAC-FLAG, *-CHARS, REJECTION-COUNT.
```

That version uses only verbs that shipped in COBOL-60 (the first
standard, ratified December 1959): `OPEN` / `CLOSE` / `READ` / `WRITE`
/ `MOVE` / `IF` / `ELSE` / `PERFORM` / `PERFORM ... UNTIL` / `STOP RUN`
/ `DISPLAY` / `ADD` / `SUBTRACT`. Level-88 condition names existed.
`AT END` / `NOT AT END` clauses on `READ` existed. Period terminators
end statements. `*` indicator in column 7 marks comments.

A 1959 COBOL programmer would recognize this as a small file-processing
program that reads a corpus, dispatches per record ID, and scores a
boolean response. The only thing a 1959 programmer would have to imagine
is the `INVOKE-AGENT-WITH-ROUTE` paragraph — there were no agents to
dispatch to in 1959.

**Fidelity rating** (relative to COBOL-60 standard):

| Element | §4.0 visualization | §4.0a strict version |
|---|---|---|
| Division layout | ✅ correct | ✅ correct |
| Section structure | ✅ correct | ✅ correct |
| Level numbers (01/05/88) | ✅ correct | ✅ correct |
| Period terminators | ✅ correct | ✅ correct |
| Verbs used | ❌ invents `WHEN MATCHES`, `ACCEPT WHEN`, `STARTS-WITH` | ✅ all from COBOL-60 (OPEN/READ/MOVE/IF/PERFORM/STOP) |
| File-control + FD | ❌ omitted | ✅ correct |
| Condition flags | partial | ✅ proper level-88 names |
| Compilable in 1959? | No | Yes (modulo the `INVOKE` paragraph stub) |

§4.0 is the *poster*; §4.0a is the *program*. Both are useful — the
poster reads aloud well to a finance audience, the program reads aloud
well to a COBOL audience.

### 4.1 Canonical JSON

`nlq-prompts.json` is the canonical exchange format. Each prompt:

```json
{
  "id": "p01-holdings-1",
  "intent": "portfolio-snapshot",
  "prompt": "What is in my portfolio right now?",
  "expected_routes": {
    "investorclaw": ["portfolio_view section=holdings", "holdings"],
    "investorclaude": ["portfolio-view holdings", "portfolio-run"]
  }
}
```

- `id` — stable scenario identifier across releases.
- `intent` — taxonomic group (used for aggregate reporting).
- `prompt` — the natural-language utterance verbatim.
- `expected_routes` — Class A only. Runtime-keyed list of acceptable
  invocations. Multiple routes per runtime represent OR; any match is
  a pass.
- `DEFLECT_OK` (string) — Class A deflection sentinel; pass if no
  portfolio command is invoked.
- `expected_focus_section` — Class B only. The envelope section the
  narrator should draw data from when answering this prompt. Used by
  the Class B verbatim-narrative validator to confirm the response
  references the right section (e.g., a "what's my Sharpe?" prompt
  should produce a narrative that cites `envelope.sections.performance`,
  not `envelope.sections.bonds`).
- `expected_refusal` (boolean) — Class B only. If true, the prompt
  should trigger the narrator's out-of-envelope refusal pattern. The
  validator passes the scenario when the response matches the canned
  `NARRATOR_OUT_OF_SCOPE` or `NARRATOR_FABRICATION_REFUSAL` text from
  `ic_engine.config.user_messages`.

### 4.2 Optional Gherkin emission

The same scenarios can be emitted as Gherkin `.feature` files for
teams using `pytest-bdd` / `behave` / `cucumber`. The mapping is
mechanical:

```gherkin
Feature: Portfolio holdings — natural-language routing
  Scenario: User asks what's in their portfolio (p01-holdings-1)
    Given the InvestorClaw plugin is loaded on Claude Code
    When the user asks "What is in my portfolio right now?"
    Then the agent should invoke "portfolio-view holdings"
    Or invoke "portfolio-run"

  Scenario: User asks what's in their portfolio (p01-holdings-1) [investorclaw]
    Given the InvestorClaw skill is loaded on OpenClaw
    When the user asks "What is in my portfolio right now?"
    Then the agent should invoke "portfolio_view section=holdings"
    Or invoke "holdings"
```

A reference emitter (`tools/emit-gherkin.py`) is planned for v2.5;
runners that prefer Gherkin can adopt it without changes to the
canonical JSON. The JSON stays authoritative.

### 4.3 Naming conventions

- `pNN-<intent>-<variant>` for scenario IDs (e.g., `p01-holdings-1`,
  `p02-holdings-2`).
- `intent` slugs use kebab-case (e.g., `portfolio-snapshot`,
  `bond-strategy`, `deflect-concept`).
- Prompts use ASCII English only (no smart quotes, no unicode
  punctuation) for cross-runtime compatibility.

---

## 5. Runner contract

A conforming Agentic COBOL runner MUST:

1. **Read prompts** from a path supplied by the caller (default:
   `harness/cobol/nlq-prompts.json` relative to the fleet root).
2. **Filter by runtime key** — emit only scenarios where
   `expected_routes[runtime]` is non-empty.
3. **Invoke the agent** with the prompt verbatim. No reformatting,
   no system-prompt injection, no role-play scaffolding.
4. **Capture the routing decision** — slash command invocation,
   bash tool invocation, or explicit textual reference to the
   expected route.
5. **Score per scenario** — emit JSONL with `{id, prompt, expected,
   detected, passed, runtime, latency_ms}`.
6. **Emit aggregate** — total scenarios, passed count, gate pass/fail.

Runners SHOULD:

- Support `--trials N` for empirical sampling.
- Support `--runtime <name>` for filtering.
- Emit a stable JSONL schema versioned alongside the prompt set.

Runners MAY:

- Cache responses for development workflows.
- Add per-prompt timeouts.
- Emit Gherkin feature files for downstream tooling.

### 5.1 Reference runners

| Path | Runtime(s) | Status |
|---|---|---|
| `InvestorClaw/harness/run_cross_runtime_pilot.py` | OpenClaw / ZeroClaw / Hermes | v0.x — needs nlq-prompts.json refactor (v2.4 work) |
| `InvestorClaw/harness/cobol/cobol-barrage.sh` | Claude Code / Claude Desktop | v0.x — `claude -p --plugin-dir` non-interactive |

Both will share a JSONL output schema and feed the v2.4 aggregate
report generator.

---

## 6. Versioning

`nlq-prompts.json` carries a top-level `version` field following
semver:

- **Major** — breaking change to scenario IDs or `expected_routes`
  schema. All runners must update.
- **Minor** — added scenarios. Runners that ignore unknown IDs
  continue working.
- **Patch** — clarification, typo fix, gate adjustment. No runner
  changes needed.

Per-release fleet evidence references the prompt-set version at
test time, e.g. `v2.4.0 release ran NLQ v2.4.0-alpha against fleet`.

---

## 7. Migration from existing tools

### 7.1 From bare unit tests

Add Agentic COBOL alongside, not as a replacement. Unit tests stay
authoritative for component correctness; Agentic COBOL adds the
routing acceptance layer.

### 7.2 From pytest-bdd / behave

Both can consume `.feature` files emitted from `nlq-prompts.json`.
The fleet's canonical exchange format is JSON; teams using BDD
runners convert at runtime via the planned `tools/emit-gherkin.py`.

### 7.3 From custom routing tests

Most pre-existing routing tests are some form of Agentic COBOL
without the formalism (e.g., InvestorClaw's pre-v2.4
`run_cross_runtime_pilot.py` had 10 hardcoded prompts with expected
tool sets). Migration is mechanical: extract prompts to the canonical
JSON, refactor the runner to consume it.

---

## 8. Why Agentic COBOL (vs. modern alternatives)

The COBOL framing is deliberate:

1. **Same problem.** COBOL's design goal — domain expert speaks
   English, machine routes to operation — is exactly the problem
   agent-skill products face today.
2. **Same acceptance pattern.** "Read the prompt aloud, check the
   system did the right thing" is the test methodology in both eras.
3. **Different substrate.** COBOL's parser was deterministic; LLMs
   are stochastic. The methodology survives; the guarantees become
   empirical.

Compared to alternatives:

- **Pure BDD/Gherkin** is the right *structural* pattern (we adopt
  Given/When/Then internally) but doesn't articulate the
  natural-language-routing acceptance focus.
- **LLM-eval frameworks (RAGAS, DeepEval)** focus on output quality.
  Agentic COBOL focuses on tool selection — orthogonal layer.
- **Component tests** prove tools work in isolation; can't catch
  silent misrouting.
- **End-to-end tests** without natural-language coverage miss the
  routing-decision class of bug entirely.

The "60-year-old language solving a 2026 problem" framing is correct
*in spirit*: a 1959 design pattern (English-as-interface, machine-as-
router) is the right pattern for 2026 agentic systems. The substrate
got fuzzier; the test methodology survives.

---

## 9. Open questions

- **Multi-trial reporting:** Class A spec defaults to single-trial for
  dev speed but recommends 3-trial averaging for releases. Class B
  doesn't need multi-trial because the routing is deterministic (cache
  hits + verbatim narration produce identical responses across trials).
- **Prompt corpus governance:** as the corpus grows past 30 prompts,
  who owns review of new additions? Likely fleet-maintainer + per-skill
  contributor approval.
- **Cross-runtime parity scoring:** for Class B, parity is structural
  (same envelope, same narrator → same answer regardless of host
  runtime). For Class A, cross-runtime parity remains an open metric.
- **Non-English prompts:** spec is English-only at v0.1. i18n is a
  v1.x consideration.
- **Adversarial prompts:** out-of-domain queries, prompt-injection
  attempts. Could be a separate `adversarial-prompts.json` corpus.
- **Class B narrator-LLM choice:** the verbatim constraint is provider-
  agnostic, but smaller models are easier to keep on-rails than larger
  ones (less likely to "creatively interpret" the strict prompt).
  Whether to mandate a model class for Class B narrators is open.
- **Envelope-section-level Class B/Class A mix:** could a single
  product have Class B sections (financial numbers) AND Class A
  sections (general market commentary)? Probably yes; the spec doesn't
  preclude it. Per-section classification deferred to v0.2.

---

## 10. References

- COBOL specification (1959, ANSI X3.23-1968)
- Gherkin / Cucumber BDD docs — github.com/cucumber/cucumber
- pytest-bdd — pytest-bdd.readthedocs.io
- InvestorClaw fleet harness — `harness/cobol/`
- Companion blog draft — `BLOG_DRAFT_techbroiler.md`

---

*This spec is draft v0.1. Comments and revisions welcome via the
fleet harness PR flow. v1.0 target: end of v2.4 cycle, with
empirical fleet-wide evidence backing the per-runtime gates.*

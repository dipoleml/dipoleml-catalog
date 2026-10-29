# The fit rule for a Jev task

TypeSafe Jev is a System 1 decision model. It recognises and selects among options the caller enumerates and returns an
index plus a probability per option. It emits no free text. Three heads: `choice` (one option key, a distribution,
a confidence), `noul` (the probability that a statement holds), `score` (a position in an ordered rubric). Input is
capped at 32K tokens; a decision takes 350 to 500 ms.

## Fits

- The environment enumerates the actions at each step: legal moves, visible controls, admissible commands.
- The right pick is readable from a text state: recognition, goal matching, world knowledge.
- The chain of steps is long enough that per-step speed and cost matter.
- A scored baseline exists to compare against: a rule, an expert plan, a published number.
- No step needs deduction, arithmetic, search or generated text.

Built and measured: Blackjack (identical to basic strategy over 100 hands, five times faster than a chat model),
2048, Millionaire, ALFWorld text (0.75 versus 0.917 for the chat model over twelve games at a sixteenth of the
cost), Google Flights.

## Does not fit

- Arithmetic and constraint deduction: Minesweeper and Wordle were two of the three probe misses out of 48.
- Search over a tree of moves: chess beyond one-move tactics, Sokoban levels, Sudoku.
- Free-text generation as part of the score: E-CommerceBench, whose score depends on generated prices and
  negotiation text. A decision model produces neither.
- Adversarial instructions inside the state belong to a rail such as the injection guard.

## The rule in one line

A task fits when the environment enumerates the options, the right one is readable from a text state, the chain is
long, a baseline exists, and no step needs deduction or arithmetic. The probe in step 2 of the skill is the test.

# Common Coding Style

These rules apply across all languages in this project. Language-specific rules are in the corresponding `rules/<language>/` directories.

---

## Immutability (CRITICAL)

ALWAYS create new objects, NEVER mutate existing ones:

```
// Pseudocode
WRONG:  modify(original, field, value) → changes original in-place
CORRECT: update(original, field, value) → returns new copy with change
```

Rationale: Immutable data prevents hidden side effects, makes debugging easier, and enables safe concurrency.

---

## Core Principles

### KISS (Keep It Simple)

- Prefer the simplest solution that actually works
- Avoid premature optimization
- Optimize for clarity over cleverness

### DRY (Don't Repeat Yourself)

- Extract repeated logic into shared functions or utilities
- Avoid copy-paste implementation drift
- Introduce abstractions when repetition is real, not speculative

### YAGNI (You Aren't Gonna Need It)

- Do not build features or abstractions before they are needed
- Avoid speculative generality
- Start simple, then refactor when the pressure is real

---

## File Organization

MANY SMALL FILES > FEW LARGE FILES:

- High cohesion, low coupling
- 200–400 lines typical, 800 max
- Extract utilities from large modules
- Organize by feature/domain, not by type

---

## Error Handling

ALWAYS handle errors comprehensively:

- Handle errors explicitly at every level — no bare `except:` or bare `catch`
- Provide user-friendly error messages in UI-facing code
- Log detailed error context on the server side
- Never silently swallow errors — at minimum, log them

---

## Input Validation

ALWAYS validate at system boundaries:

- Validate all user input before processing
- Use schema-based validation where available (Pydantic, Zod)
- Fail fast with clear error messages
- Never trust external data (API responses, user input, file content)

---

## Naming Conventions

- Variables and functions: `camelCase` with descriptive names
- Booleans: prefer `is`, `has`, `should`, or `can` prefixes
- Classes, types, and components: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Custom hooks: `camelCase` with a `use` prefix

---

## Code Smells to Avoid

### Deep Nesting

Prefer early returns over nested conditionals once the logic starts stacking:

```python
# WRONG
def process(data):
    if data:
        if data.get("items"):
            for item in data["items"]:
                if item.is_valid:
                    handle(item)

# CORRECT
def process(data):
    if not data:
        return
    for item in data.get("items", []):
        if not item.is_valid:
            continue
        handle(item)
```

### Magic Numbers

Use named constants for meaningful thresholds, delays, and limits:

```python
# WRONG
time.sleep(300)

# CORRECT
RETRY_DELAY_SECONDS = 300
time.sleep(RETRY_DELAY_SECONDS)
```

### Long Functions

Split large functions into focused pieces with clear responsibilities. Functions over 50 lines are candidates for extraction.

---

## Code Quality Checklist

Before marking work complete:

- [ ] Code is readable and well-named
- [ ] Functions are small (<50 lines)
- [ ] Files are focused (<800 lines)
- [ ] No deep nesting (>4 levels)
- [ ] Proper error handling
- [ ] No hardcoded values (use constants or config)
- [ ] No mutation (immutable patterns used)
- [ ] No secrets or API keys committed

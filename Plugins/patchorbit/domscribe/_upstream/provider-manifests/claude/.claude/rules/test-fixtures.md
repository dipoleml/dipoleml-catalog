---
description: Integration and e2e test patterns for the domscribe-test-fixtures package
paths: ['packages/domscribe-test-fixtures/**']
---

# Test Fixtures — Integration & E2E Patterns

## Core Constraint

**Test-fixtures is a black-box test layer.** It treats Domscribe as an opaque bundler plugin. Zero `@domscribe/*` imports (except types for TypeScript). Build real apps, validate real outputs.

## Integration Tests (Vitest)

- Located in `tests/integration/`
- File suffix: `.test.ts` (integration) or `.bench.ts` (benchmarks)
- Build real fixtures with `buildFixture()`, validate with `readManifest()` and `scanBundleForDataDs()`
- `FIXTURE_ID` env var selects which fixture to test
- `describe.skipIf(!fixture)` when no fixture is selected
- Long `beforeAll` timeouts (120s) for builds — fixture builds are slow

### Key test files

- `manifest-validation.test.ts` — builds fixture, deeply validates every manifest entry
- `manifest-mutation.test.ts` — verifies append-only behavior when source files change
- `production-strip.test.ts` — verifies `data-ds` attributes are absent in production builds

## E2E Tests (Playwright)

- Located in `e2e/`
- Global setup (`e2e/global-setup.ts`) orchestrates: start Verdaccio → build packages → publish → install into fixtures
- Skip env vars: `SKIP_SETUP=1`, `SKIP_PUBLISH=1`, `SKIP_INSTALL=1`

### Page Object Model

Use `FixturePage` from `helpers/page-model.ts` for page interactions. Don't write raw locator chains in tests — extend the page model if new interactions are needed.

### Shadow DOM (Critical)

Playwright locators do **NOT** pierce shadow DOM. All overlay interactions must use `page.evaluate()` to traverse the shadow DOM tree manually:

```typescript
await page.waitForFunction(
  () => {
    const overlay = document.querySelector('ds-overlay');
    if (!overlay?.shadowRoot) return false;
    const sidebar = overlay.shadowRoot.querySelector('ds-sidebar');
    if (!sidebar?.shadowRoot) return false;
    const input = sidebar.shadowRoot.querySelector('ds-annotation-input');
    return input?.shadowRoot?.querySelector('textarea') !== null;
  },
  { timeout: 10_000 },
);
```

### Pointer Capture

`ds-tab` uses `setPointerCapture()` — synthetic `.click()` calls fail silently. Always use `page.mouse.click(x, y)` with real coordinates obtained from `boundingBox()`.

### Serial Mode

Annotation lifecycle tests share a relay instance and must run sequentially:

```typescript
test.describe.configure({ mode: 'serial' });
```

### Dynamic Ports

All fixture dev servers use `port: 0` (dynamic assignment). Never hardcode port numbers. Dev server readiness is detected via HTTP polling, not stdout parsing.

## Fixtures Structure

- Located in `fixtures/{bundler}/{version}/{framework-ver-lang}/`
- Each is a standalone app with its own `package.json` (uses npm, not pnpm)
- `_registry/` — reference components copied into fixtures by the generator
- `_templates/` — generator templates (files use `__tmpl__` suffix, stripped during generation)
- Regenerate with `npx nx g @domscribe/test-fixtures:test-fixture` (delete dir first)

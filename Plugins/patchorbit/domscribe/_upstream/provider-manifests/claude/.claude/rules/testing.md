---
description: Testing philosophy, mocking strategy, and patterns for unit, integration, and e2e tests
---

# Testing Guide

## Philosophy

- **Unit tests mock dependencies by default.** Use `vi.mock()` for module-level mocking and `vi.fn()` for manual mock objects. Constructor DI exists to make clean mocking easy — use it.
- **Arrange-Act-Assert (AAA).** Every unit test follows this structure: set up the preconditions (Arrange), execute the behavior under test (Act), verify the outcome (Assert). Separate each phase with a blank line. This keeps tests readable, predictable, and easy to maintain — a developer should be able to glance at any test and immediately understand what's being set up, what's being exercised, and what's being verified.
- **Test behavior, not side effects.** Do not spy on global objects like `console`. Testing log messages is fragile, adds verbosity (setup + teardown per test or suite-wide pollution), and doesn't validate meaningful behavior. Test what a unit _does_, not what it _logs_.
- **Test-fixtures is the black-box layer.** Integration and e2e tests in `domscribe-test-fixtures` treat Domscribe as an opaque bundler plugin — no `@domscribe/*` imports (except types). They build real fixtures and validate real outputs.
- **Test at the right level.** Don't duplicate coverage across unit/integration/e2e. If the build pipeline catches it, don't unit-test it.

## Unit Tests (Vitest)

### Default: Mock Dependencies

When a class has dependencies (injected via constructor or imported), mock them. The unit under test should be isolated.

**Module-level mocking (`vi.mock()`)** — for imported modules:

```typescript
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock('../batch-writer/batch-writer.js', () => ({
  BatchWriter: class {
    append = vi.fn();
    flush = vi.fn();
  },
}));
```

**Manual mock objects (`vi.fn()`)** — for interface-based dependencies:

```typescript
const mockIdGenerator: IDGenerator = {
  initialize: vi.fn().mockResolvedValue(undefined),
  getStableId: vi.fn().mockReturnValue('stable_id'),
};

const mockParser: ParserInterface = {
  parse: vi.fn(),
  findJSXOpeningElements: vi.fn(),
  getTagName: vi.fn(),
};
```

**Framework adapter stubs:**

```typescript
function createMockAdapter(
  overrides?: Partial<FrameworkAdapter>,
): FrameworkAdapter {
  return {
    name: 'mock-adapter',
    version: '1.0.0',
    getComponentInstance: vi.fn().mockReturnValue(null),
    captureProps: vi.fn().mockReturnValue(null),
    captureState: vi.fn().mockReturnValue(null),
    ...overrides,
  };
}
```

### Exception: Pure Utilities (core)

`@domscribe/core` contains pure functions (ID generation, redaction, error constructors) with no external dependencies. Test these directly — there's nothing to mock.

### Exception: Relay (Integration-Style)

`@domscribe/relay` tests use real Fastify servers, real services, and temp directories. This is intentional — relay is a coordinator, and its value is in the integration of services.

```typescript
// relay uses createTestServer() which builds real services
const server = await createTestServer({
  manifestEntries: [knownEntry],
});
const response = await server.app.inject({ method: 'GET', url: '...' });
```

### Singleton Cleanup

Packages with singletons (`ManifestWriter`, `IDStabilizer`, `RuntimeManager`) must clear instances between tests:

```typescript
afterEach(() => {
  ManifestWriter.resetInstance(); // or .instances.clear()
});
```

### Structure

- Co-located with source: `src/lib/feature/feature.spec.ts`
- Nesting: `describe('ClassName')` → `describe('methodName')` → `it('should ...')`

**AAA example:**

```typescript
it('should create an error with all properties', () => {
  // Arrange
  const problemDetails: ProblemDetails = {
    code: DomscribeErrorCode.DS_INTERNAL_ERROR,
    title: 'Internal server error',
    detail: 'Something went wrong',
    status: 500,
  };

  // Act
  const error = new DomscribeError(problemDetails);

  // Assert
  expect(error).toBeInstanceOf(Error);
  expect(error.message).toBe('Internal server error');
  expect(error.code).toBe(DomscribeErrorCode.DS_INTERNAL_ERROR);
});
```

### Assertions

- vitest `expect` only — no chai or other assertion libraries
- Custom messages in loops: `expect(entry.file, \`Entry ${id} invalid\`).toMatch(pattern)`
- `.toBe()` for primitives, `.toEqual()` for objects, `.toBeInstanceOf()` for errors

### Coverage

Thresholds per-package in `vite.config.ts`: 80% lines, 80% functions, 70% branches, 80% statements.

## Integration & E2E Tests

Detailed patterns for integration and e2e tests are in the path-scoped rule `test-fixtures.md`, which loads automatically when working in `packages/domscribe-test-fixtures/`.

## What NOT to Test

- Setup validation (redundant with typechecker + real tests)
- Smoke test module functionality (manual testing only)
- Things already enforced by lint rules or module boundaries
- Individual file existence — the build fails if something's missing

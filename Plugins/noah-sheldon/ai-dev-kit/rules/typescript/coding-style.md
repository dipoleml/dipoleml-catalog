---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
---

# TypeScript/JavaScript Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with TypeScript/JavaScript-specific content.

---

## Types and Interfaces

Use types to make public APIs, shared models, and component props explicit, readable, and reusable.

### Public APIs

- Add parameter and return types to exported functions, shared utilities, and public class methods
- Let TypeScript infer obvious local variable types
- Extract repeated inline object shapes into named types or interfaces

```typescript
// WRONG: Exported function without explicit types
export function formatUser(user) {
  return `${user.firstName} ${user.lastName}`
}

// CORRECT: Explicit types on public APIs
interface User {
  firstName: string
  lastName: string
}

export function formatUser(user: User): string {
  return `${user.firstName} ${user.lastName}`
}
```

### Interfaces vs. Type Aliases

- Use `interface` for object shapes that may be extended or implemented
- Use `type` for unions, intersections, tuples, mapped types, and utility types
- Prefer string literal unions over `enum` unless an `enum` is required for interoperability

```typescript
interface User {
  id: string
  email: string
}

type UserRole = 'admin' | 'member'
type UserWithRole = User & {
  role: UserRole
}
```

### Avoid `any`

- Avoid `any` in application code
- Use `unknown` for external or untrusted input, then narrow it safely
- Use generics when a value's type depends on the caller

```typescript
// WRONG: any removes type safety
function getErrorMessage(error: any) {
  return error.message
}

// CORRECT: unknown forces safe narrowing
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'Unexpected error'
}
```

### React Props

- Define component props with a named `interface` or `type`
- Type callback props explicitly
- Do not use `React.FC` unless there is a specific reason

```typescript
interface User {
  id: string
  email: string
}

interface UserCardProps {
  user: User
  onSelect: (id: string) => void
}

function UserCard({ user, onSelect }: UserCardProps) {
  return <button onClick={() => onSelect(user.id)}>{user.email}</button>
}
```

### JavaScript Files

- In `.js` and `.jsx` files, use JSDoc when types improve clarity and a TypeScript migration is not practical
- Keep JSDoc aligned with runtime behavior

```javascript
/**
 * @param {{ firstName: string, lastName: string }} user
 * @returns {string}
 */
export function formatUser(user) {
  return `${user.firstName} ${user.lastName}`
}
```

---

## Immutability

Use spread operator for immutable updates:

```typescript
interface User {
  id: string
  name: string
}

// WRONG: Mutation
function updateUser(user: User, name: string): User {
  user.name = name // MUTATION!
  return user
}

// CORRECT: Immutability
function updateUser(user: Readonly<User>, name: string): User {
  return {
    ...user,
    name
  }
}
```

### Arrays

```typescript
// WRONG: push mutates
items.push(newItem)

// CORRECT: spread creates new array
const updated = [...items, newItem]

// WRONG: splice mutates
items.splice(index, 1)

// CORRECT: filter creates new array
const updated = items.filter((_, i) => i !== index)
```

---

## Error Handling

Use async/await with try-catch and narrow unknown errors safely:

```typescript
interface User {
  id: string
  email: string
}

declare function riskyOperation(userId: string): Promise<User>

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'Unexpected error'
}

const logger = {
  error: (message: string, error: unknown) => {
    // Replace with your production logger (for example, pino or winston).
  }
}

async function loadUser(userId: string): Promise<User> {
  try {
    const result = await riskyOperation(userId)
    return result
  } catch (error: unknown) {
    logger.error('Operation failed', error)
    throw new Error(getErrorMessage(error))
  }
}
```

### Never Swallow Errors

```typescript
// WRONG: silent failure
try {
  await save(data)
} catch {
  // nothing
}

// CORRECT: log and rethrow or return meaningful error
try {
  await save(data)
} catch (error: unknown) {
  logger.error('Save failed', error)
  throw error
}
```

---

## Input Validation

Use Zod for schema-based validation and infer types from the schema:

```typescript
import { z } from 'zod'

const userSchema = z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(150)
})

type UserInput = z.infer<typeof userSchema>

const validated: UserInput = userSchema.parse(input)
```

### API Route Validation

```typescript
import { z } from 'zod'
import { FastifyRequest, FastifyReply } from 'fastify'

const createMarketSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(1000),
    endDate: z.string().datetime()
  })
})

async function createMarket(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const parsed = createMarketSchema.safeParse(request)

  if (!parsed.success) {
    return reply.status(400).send({
      error: 'Validation failed',
      details: parsed.error.flatten()
    })
  }

  const { name, description, endDate } = parsed.data.body
  // Proceed with validated input...
}
```

---

## Async Patterns

### Prefer async/await over Promises

```typescript
// WRONG: Promise chains
fetchUser(id)
  .then(user => fetchOrders(user.id))
  .then(orders => process(orders))
  .catch(err => handleError(err))

// CORRECT: async/await
try {
  const user = await fetchUser(id)
  const orders = await fetchOrders(user.id)
  process(orders)
} catch (error: unknown) {
  handleError(error)
}
```

### Parallel Execution

```typescript
// Sequential (slow)
const user = await fetchUser(id)
const orders = await fetchOrders(id)

// Parallel (fast)
const [user, orders] = await Promise.all([
  fetchUser(id),
  fetchOrders(id)
])
```

---

## Console.log

- No `console.log` statements in production code
- Use proper logging libraries instead (pino, winston)
- See hooks for automatic detection of `console.log` usage

---

## Naming Conventions

- Variables and functions: `camelCase`
- Classes, interfaces, types: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Boolean variables: `isX`, `hasX`, `shouldX`, `canX`
- Custom React hooks: `useX` (must start with `use`)
- Test files: `*.test.ts` or `*.spec.ts`
- Private class members: prefix with `_` (convention, since TS has no private)

---

## File Organization

```
src/
├── components/          # React/UI components
│   ├── UserCard/
│   │   ├── UserCard.tsx
│   │   ├── UserCard.test.tsx
│   │   └── index.ts
│   └── index.ts
├── services/            # Business logic, API clients
│   ├── user-service.ts
│   └── user-service.test.ts
├── models/              # Type definitions, interfaces
│   └── user.ts
├── utils/               # Shared utilities
│   └── format.ts
├── hooks/               # Custom React hooks
│   └── useUser.ts
├── config/              # Configuration
│   └── env.ts
└── index.ts             # Entry point
```

---

## tsconfig Recommendations

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  }
}
```

---

## Common Anti-Patterns to Avoid

| Anti-Pattern | Why It's Wrong | Correct Approach |
|---|---|---|
| `any` types | Loses all type safety | Use `unknown` + narrowing, or generics |
| `as` type assertions | Bypasses type checking | Fix the underlying type instead |
| `React.FC` | Implicit `children`, no generic support | Use plain function components |
| `useEffect` for derived state | Causes extra renders | Use `useMemo` for derived values |
| Prop drilling >3 levels | Unmaintainable component tree | Use context or state management |
| Inline event handlers | Hard to test and reuse | Extract to named handler functions |
| Direct DOM manipulation | Breaks React reconciliation | Use refs or state-driven rendering |
| Missing `key` in lists | Causes rendering bugs | Provide stable unique keys |

See skill: `typescript-patterns` for comprehensive TypeScript idioms and best practices.
See skill: `frontend-patterns` for React and Next.js patterns.

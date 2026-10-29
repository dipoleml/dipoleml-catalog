---
paths:
  - "**/*.py"
  - "**/*.pyi"
---

# Python Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with Python-specific content.

---

## Standards

- Follow **PEP 8** conventions
- Use **type annotations** on all function signatures
- Max line length: 88 characters (black default)

---

## Type Annotations

Type every function signature — both parameters and return type:

```python
# WRONG: No types
def get_user(id):
    ...

# CORRECT: Full type annotations
def get_user(user_id: str) -> dict[str, Any]:
    ...

# BETTER: TypedDict or dataclass for complex returns
from typing import TypedDict

class User(TypedDict):
    id: str
    name: str
    email: str

def get_user(user_id: str) -> User:
    ...
```

### Complex Types

```python
from typing import Optional, Sequence, Callable, TypeVar

T = TypeVar("T")

def first(items: Sequence[T], default: Optional[T] = None) -> T | None:
    """Return the first item, or default if empty."""
    return items[0] if items else default
```

---

## Immutability

Prefer immutable data structures:

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class User:
    name: str
    email: str

from typing import NamedTuple

class Point(NamedTuple):
    x: float
    y: float
```

Use `frozen=True` dataclasses and `NamedTuple` instead of mutable classes when the data is read-only.

---

## Formatting and Linting

- **black** for code formatting
- **isort** for import sorting
- **ruff** for linting (replaces flake8, pylint, pyflakes)
- **mypy** for static type checking

Run before commit:

```bash
black .
isort .
ruff check .
mypy .
```

---

## Error Handling

```python
# WRONG: Bare except swallows everything
try:
    do_something()
except:
    pass

# WRONG: Catching too broadly
try:
    do_something()
except Exception:
    pass

# CORRECT: Specific exceptions with meaningful handling
try:
    result = db.query(user_id)
except sqlalchemy.exc.NoResultFound:
    raise HTTPException(status_code=404, detail="User not found")
except sqlalchemy.exc.IntegrityError as e:
    raise HTTPException(status_code=409, detail=f"Duplicate: {e}")
```

### Never Use Mutable Default Arguments

```python
# WRONG: Mutable default is shared across calls
def process_items(items: list[str] = []) -> list[str]:
    items.append("processed")
    return items

# CORRECT: Use None sentinel
def process_items(items: list[str] | None = None) -> list[str]:
    if items is None:
        items = []
    items.append("processed")
    return items
```

---

## Imports

- Standard library imports first
- Third-party imports second
- Local application imports third
- Alphabetical within each group
- One import per line

```python
# Standard library
import os
from pathlib import Path
from typing import Any

# Third-party
import requests
from pydantic import BaseModel

# Local
from app.models.user import User
from app.services.auth import authenticate
```

Use `isort` to enforce this automatically.

---

## Function Design

- Keep functions under 50 lines
- One responsibility per function
- Return early instead of nesting
- Use keyword-only arguments for clarity when there are many parameters:

```python
def create_user(
    name: str,
    email: str,
    *,
    role: str = "user",
    active: bool = True,
) -> User:
    ...
```

---

## FastAPI Patterns

- Use Pydantic models for request/response schemas
- Use `Depends()` for dependency injection — never hardcode services
- Always specify `response_model` on endpoints
- Use `HTTPException` with appropriate status codes

```python
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/users", tags=["users"])

class UserCreate(BaseModel):
    name: str
    email: EmailStr

class UserResponse(BaseModel):
    id: str
    name: str
    email: str

@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=UserResponse,
)
async def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
) -> UserResponse:
    ...
```

---

## Testing

- Use `pytest` with `pytest-asyncio` for async tests
- Use `unittest.mock.patch` for external dependencies
- Structure tests with `Arrange-Act-Assert`
- Test edge cases: null, empty, boundary, concurrent

```python
import pytest

def test_calculate_discount():
    assert calculate_discount(100.0, 0) == 100.0
    assert calculate_discount(100.0, 100) == 0.0
    assert calculate_discount(100.0, 25) == 75.0

def test_rejects_invalid_discount():
    with pytest.raises(ValueError, match="between 0 and 100"):
        calculate_discount(100.0, -10)
```

See skill: `tdd-workflow` for the full TDD workflow.
See skill: `python-testing` for pytest patterns and coverage.

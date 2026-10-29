# Contributing to Adversarial Spec

## Development Setup

```bash
# Clone the repository
git clone <repo-url>
cd adversarial-spec

# Install dev dependencies
pip install -r requirements-dev.txt

# Install pre-commit hooks
pre-commit install
```

## Code Quality

All code must pass:

```bash
# Lint
ruff check skills/adversarial-spec/scripts/

# Format
ruff format skills/adversarial-spec/scripts/

# Type check
mypy skills/adversarial-spec/scripts/ --ignore-missing-imports

# Tests with coverage
cd skills/adversarial-spec/scripts
python -m pytest tests/ -v --cov=. --cov-report=term-missing --cov-fail-under=90
```

Pre-commit hooks run these automatically on staged files.

## Code Standards

- Type hints on all functions
- Google-style docstrings with Args, Returns, Raises sections
- No silent exception handling (log or re-raise)
- Input validation for security-sensitive operations
- Test coverage minimum: 90%

## Testing

Tests live in `skills/adversarial-spec/scripts/tests/`. Structure mirrors the source.

```bash
# Run all tests
python -m pytest tests/ -v

# Run specific test file
python -m pytest tests/test_models.py -v

# Run with coverage report
python -m pytest tests/ --cov=. --cov-report=html
```

## Pull Request Process

1. Create feature branch from main
2. Write tests for new functionality
3. Ensure all checks pass locally
4. Submit PR with clear description
5. Address review feedback

## Commit Messages

Format: `<type>: <description>`

Types:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring
- `test`: Adding or updating tests
- `docs`: Documentation changes
- `chore`: Build, CI, dependency updates

Example: `feat: add bedrock integration for enterprise deployments`

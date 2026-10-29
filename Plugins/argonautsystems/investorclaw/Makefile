# InvestorClaw — local CI mirror.
#
# Mirrors .gitlab-ci.yml so contributors can run the same gates the
# pipeline runs, without depending on shared-runner minutes (this
# project's shared runners are intentionally off — codex review +
# local validation is the canonical path).
#
# Usage:
#   make ci          # lint + smoke (default Python) + plugin-build (use before push)
#   make ci-matrix   # full multi-Python smoke matrix (~2 min)
#   make lint        # ruff check + format check
#   make lint-fix    # apply ruff fixes
#   make smoke       # single-Python import + version + help
#   make plugin      # tsc compile + dist/ staleness check
#   make smoke-py311 / smoke-py312 / smoke-py313

PYTHON_VERSIONS := 3.11 3.12 3.13

.PHONY: ci ci-matrix lint lint-fix smoke plugin clean smoke-py311 smoke-py312 smoke-py313

ci: lint smoke plugin
	@echo "ci: all gates passed"

ci-matrix: lint smoke-py311 smoke-py312 smoke-py313 plugin
	@echo "ci-matrix: all gates passed across $(PYTHON_VERSIONS)"

lint:
	uv sync --frozen --group dev
	uv run ruff check .
	uv run ruff format --check .

lint-fix:
	uv sync --frozen --group dev
	uv run ruff check --fix .
	uv run ruff format .

smoke:
	uv sync --frozen --group dev
	uv run python -c "from investorclaw import get_version, main; print(f'shim get_version() = {get_version()}')"
	uv run investorclaw --version
	uv run python3 investorclaw.py help

smoke-py311:
	uv sync --frozen --group dev --python 3.11
	uv run --python 3.11 python -c "from investorclaw import get_version; print(f'py311: {get_version()}')"
	uv run --python 3.11 investorclaw --version

smoke-py312:
	uv sync --frozen --group dev --python 3.12
	uv run --python 3.12 python -c "from investorclaw import get_version; print(f'py312: {get_version()}')"
	uv run --python 3.12 investorclaw --version

smoke-py313:
	uv sync --frozen --group dev --python 3.13
	uv run --python 3.13 python -c "from investorclaw import get_version; print(f'py313: {get_version()}')"
	uv run --python 3.13 investorclaw --version

plugin:
	npm ci
	node_modules/.bin/tsc --noEmit
	node_modules/.bin/tsc
	@git diff --exit-code dist/ || (echo "dist/ is stale — run 'npm run build' and commit" && exit 1)
	@echo "plugin: dist/ in sync with sources"

clean:
	rm -rf .pytest_cache .ruff_cache __pycache__ node_modules

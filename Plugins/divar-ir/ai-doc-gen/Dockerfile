FROM python:3.13

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH="/app/src"

# Install uv
RUN pip install --no-cache-dir uv

WORKDIR /app

# Copy dependency files first for better caching
COPY pyproject.toml uv.lock ./

# Install dependencies using uv sync
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

# Copy shared library and source code
COPY src ./src

WORKDIR /app

CMD ["uv", "run", "ai-doc-gen"]

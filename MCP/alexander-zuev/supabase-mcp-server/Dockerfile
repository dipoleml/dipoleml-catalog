FROM python:3.12-slim-bookworm

WORKDIR /app

# Prepare the basic dependencies
RUN apt-get update && apt-get install -y \
    && rm -rf /var/lib/apt/lists/*

# Install pipx
RUN pip install --no-cache-dir pipx && \
    pipx ensurepath && \
    pipx install supabase-mcp-server

# Add pipx bin directory to PATH
ENV PATH="/root/.local/bin:$PATH"

CMD ["supabase-mcp-server"]

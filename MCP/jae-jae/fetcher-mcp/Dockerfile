# Build stage
FROM --platform=$BUILDPLATFORM node:22-slim AS builder

WORKDIR /app

# Copy dependency files first to leverage caching
COPY package*.json ./

RUN npm ci

# Copy source code and configuration files
COPY tsconfig.json ./
COPY src/ ./src/

# Build the project
RUN npm run build

# Runtime stage
FROM --platform=$TARGETPLATFORM node:22-slim AS runner

# Install system dependencies required for runtime
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only production dependencies
COPY --from=builder /app/build ./build
COPY package*.json ./
RUN npm ci --only=production

# Install Playwright browsers (ensure headless shell is installed)
RUN npx playwright install --with-deps chromium

# Expose port
EXPOSE 3000

# Startup command
CMD ["node", "build/index.js", "--log", "--transport=http", "--host=0.0.0.0", "--port=3000"] 
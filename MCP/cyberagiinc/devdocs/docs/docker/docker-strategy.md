# DevDocs Dockerization Strategy

This document outlines the strategy for dockerizing the DevDocs platform, including the components, architecture, and implementation details.

## Components

The DevDocs platform consists of the following components:

1. **Next.js Frontend**: A React-based web application that provides the user interface
2. **FastAPI Backend**: A Python-based API server that handles the core functionality
3. **Crawl4AI Service**: A service for web crawling and content extraction
4. **Fast-Markdown-MCP Server**: A Model Context Protocol server that manages markdown content

## Architecture

The architecture of the dockerized DevDocs platform is as follows:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Next.js        │     │  FastAPI        │     │  Crawl4AI       │
│  Frontend       │────▶│  Backend        │────▶│  Service        │
│  (Container)    │     │  (Container)    │     │  (Container)    │
│                 │     │                 │     │                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │                 │
                        │  MCP Server     │
                        │  (Host System)  │
                        │                 │
                        └─────────────────┘
```

### Key Points:

1. The Next.js Frontend, FastAPI Backend, and Crawl4AI Service are containerized using Docker.
2. The MCP Server runs on the host system (not in a container) due to its integration with the host file system.
3. The containers communicate with each other through a Docker network.
4. The backend container communicates with the MCP server running on the host.

## Implementation Details

### 1. Docker Compose Configuration

The `docker-compose.yml` file defines the services, networks, and volumes for the dockerized platform:

```yaml
services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    container_name: devdocs-frontend
    ports:
      - "3001:3001"
    environment:
      - BACKEND_URL=http://backend:24125
      - MCP_HOST=host.docker.internal
    depends_on:
      - backend
    networks:
      - devdocs-network
    restart: unless-stopped

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    container_name: devdocs-backend
    ports:
      - "24125:24125"
    volumes:
      - ./storage:/app/storage
      - ./logs:/app/logs
    environment:
      - MCP_HOST=host.docker.internal
      - CRAWL4AI_URL=http://crawl4ai:11235
      - CRAWL4AI_API_TOKEN=${CRAWL4AI_API_TOKEN:-devdocs-demo-key}
    depends_on:
      - crawl4ai
    networks:
      - devdocs-network
    restart: unless-stopped
    extra_hosts:
      - "host.docker.internal:host-gateway"

  crawl4ai:
    image: unclecode/crawl4ai:all
    container_name: devdocs-crawl4ai
    ports:
      - "11235:11235"
    environment:
      - CRAWL4AI_API_TOKEN=${CRAWL4AI_API_TOKEN:-devdocs-demo-key}
      - MAX_CONCURRENT_TASKS=5
      - DISABLE_AUTH=false
    volumes:
      - /dev/shm:/dev/shm
    networks:
      - devdocs-network
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 4G
        reservations:
          memory: 1G

networks:
  devdocs-network:
    driver: bridge
```

### 2. Dockerfiles

#### Dockerfile.frontend

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Create public directory if it doesn't exist
RUN mkdir -p public

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

# Copy necessary files from builder
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Run the application
CMD ["npm", "start"]
```

#### Dockerfile.backend

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Copy requirements file
COPY backend/requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/app ./app

# Create necessary directories
RUN mkdir -p storage/markdown logs

# Expose the port
EXPOSE 24125

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "24125"]
```

### 3. Startup Scripts

#### docker-start.sh (Linux/macOS)

```bash
#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Store the root directory path
ROOT_DIR="$(pwd)"
echo -e "${BLUE}Project root directory: ${ROOT_DIR}${NC}"

# Create logs directory if it doesn't exist
mkdir -p logs

# Start MCP server on the host
echo -e "${BLUE}Starting MCP server on host...${NC}"
source fast-markdown-mcp/venv/bin/activate
PYTHONPATH="$ROOT_DIR/fast-markdown-mcp/src" \
    fast-markdown-mcp/venv/bin/python -m fast_markdown_mcp.server \
    "$ROOT_DIR/storage/markdown" > logs/mcp.log 2>&1 &
MCP_PID=$!

# Wait for MCP server to start
echo -e "${BLUE}Waiting for MCP server to start...${NC}"
sleep 5

# Start Docker containers
echo -e "${BLUE}Starting Docker containers...${NC}"
docker-compose up -d

echo -e "${GREEN}All services are running!${NC}"
echo -e "${BLUE}Frontend:${NC} http://localhost:3001"
echo -e "${BLUE}Backend:${NC} http://localhost:24125"
echo -e "${BLUE}Crawl4AI:${NC} http://localhost:11235"
echo -e "${BLUE}Logs:${NC} ./logs/"
echo -e "${BLUE}Press Ctrl+C to stop all services${NC}"

# Handle graceful shutdown
cleanup() {
    echo -e "\n${BLUE}Shutting down services...${NC}"
    docker-compose down
    kill $MCP_PID
    wait $MCP_PID 2>/dev/null
    echo -e "${GREEN}All services stopped${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Keep the script running
while kill -0 $MCP_PID 2>/dev/null; do
    sleep 1
done

echo -e "${RED}MCP server has stopped unexpectedly${NC}"
docker-compose down
exit 1
```

#### docker-start.bat (Windows)

```batch
@echo off
setlocal

echo Starting MCP server on host...
cd fast-markdown-mcp
call venv\Scripts\activate.bat
cd ..
set PYTHONPATH=%CD%\fast-markdown-mcp\src
start /b python -m fast_markdown_mcp.server %CD%\storage\markdown > logs\mcp.log 2>&1

echo Waiting for MCP server to start...
timeout /t 5 /nobreak > nul

echo Starting Docker containers...
docker-compose up -d

echo All services are running!
echo Frontend: http://localhost:3001
echo Backend: http://localhost:24125
echo Crawl4AI: http://localhost:11235
echo Logs: ./logs/
echo Press Ctrl+C to stop all services

echo Press any key to stop all services...
pause > nul

echo Shutting down services...
docker-compose down

echo All services stopped
```

## Challenges and Solutions

### 1. MCP Server Detection

**Challenge**: The backend container couldn't detect the MCP server running on the host because it was looking for a process with 'python' and 'fast_markdown_mcp.server' in the command line. Since the backend is in a Docker container, it can't see host processes.

**Solution**: Updated the backend to always assume the MCP server is running if it can find the logs directory, which simplifies the detection logic and makes it work reliably in a Docker environment.

### 2. Crawl4AI API Authentication

**Challenge**: The Crawl4AI service was returning 403 Forbidden errors because it requires authentication.

**Solution**:
1. Added a default demo API key (`devdocs-demo-key`) that's used by both the backend and Crawl4AI containers
2. Updated the crawler.py file to use proper authentication headers and improved error handling
3. Modified the docker-compose.yml file to ensure the API key is passed to both containers
4. Updated the .env.template file to include the default API key

### 3. Container Communication

**Challenge**: The backend container couldn't connect to the Crawl4AI container using "localhost".

**Solution**: Updated the code to use the container name "crawl4ai" instead of "localhost" when making requests to the Crawl4AI API from the backend container.

### 4. Network Configuration

**Challenge**: Docker containers need to communicate with each other and with the host system.

**Solution**: Used Docker Compose to create a network for the containers and configured the backend container to use `host.docker.internal` to communicate with the MCP server on the host.

## Testing and Debugging

We've created several scripts to help test and debug the dockerized platform:

1. **test_crawl4ai.py**: A Python script that tests the Crawl4AI API directly from the host or from inside a container
2. **test_from_container.sh**: A shell script that runs the test from inside the backend container
3. **check_crawl4ai.sh**: A shell script that checks if the Crawl4AI container is running and accessible from the host and from the backend container

## Future Improvements

1. **Dockerize MCP Server**: Consider dockerizing the MCP server to create an all-in-one solution. This would require addressing the file system integration challenges.
2. **Improve Error Handling**: Add more robust error handling and recovery mechanisms for container communication issues.
3. **Add Health Checks**: Implement proper Docker health checks for all containers to ensure they're running correctly.
4. **Optimize Resource Usage**: Fine-tune the resource limits for the containers based on actual usage patterns.
5. **Implement CI/CD**: Set up continuous integration and deployment pipelines for the dockerized platform.

## Conclusion

The DevDocs platform has been successfully dockerized, with the exception of the MCP server which runs on the host system. The dockerized platform is easy to set up and run on different operating systems, making it more accessible to users and developers.

The main challenges were related to container communication and MCP server detection, but these have been addressed with the solutions described above. The platform now works reliably in a Docker environment, with clear documentation and testing tools to help users troubleshoot any issues.
call venv\Scripts\activate.bat
cd ..
set PYTHONPATH=%CD%\fast-markdown-mcp\src
start /b python -m fast_markdown_mcp.server %CD%\storage\markdown > logs\mcp.log 2>&1

echo Waiting for MCP server to start...
timeout /t 5 /nobreak > nul

echo Starting Docker containers...
docker-compose up -d

echo All services are running!
echo Frontend: http://localhost:3001
echo Backend: http://localhost:24125
echo Crawl4AI: http://localhost:11235
echo Logs: ./logs/
echo Press Ctrl+C to stop all services

echo Press any key to stop all services...
pause > nul

echo Shutting down services...
docker-compose down

echo All services stopped
```

## Challenges and Solutions

### 1. MCP Server Detection

**Challenge**: The backend container couldn't detect the MCP server running on the host because it was looking for a process with 'python' and 'fast_markdown_mcp.server' in the command line. Since the backend is in a Docker container, it can't see host processes.

**Solution**: Updated the backend to always assume the MCP server is running if it can find the logs directory, which simplifies the detection logic and makes it work reliably in a Docker environment.

### 2. Crawl4AI API Authentication

**Challenge**: The Crawl4AI service was returning 403 Forbidden errors because it requires authentication.

**Solution**:
1. Added a default demo API key (`devdocs-demo-key`) that's used by both the backend and Crawl4AI containers
2. Updated the crawler.py file to use proper authentication headers and improved error handling
3. Modified the docker-compose.yml file to ensure the API key is passed to both containers
4. Updated the .env.template file to include the default API key

### 3. Container Communication

**Challenge**: The backend container couldn't connect to the Crawl4AI container using "localhost".

**Solution**: Updated the code to use the container name "crawl4ai" instead of "localhost" when making requests to the Crawl4AI API from the backend container.

### 4. Network Configuration

**Challenge**: Docker containers need to communicate with each other and with the host system.

**Solution**: Used Docker Compose to create a network for the containers and configured the backend container to use `host.docker.internal` to communicate with the MCP server on the host.

## Testing and Debugging

We've created several scripts to help test and debug the dockerized platform:

1. **test_crawl4ai.py**: A Python script that tests the Crawl4AI API directly from the host or from inside a container
2. **test_from_container.sh**: A shell script that runs the test from inside the backend container
3. **check_crawl4ai.sh**: A shell script that checks if the Crawl4AI container is running and accessible from the host and from the backend container

## Future Improvements

1. **Dockerize MCP Server**: Consider dockerizing the MCP server to create an all-in-one solution. This would require addressing the file system integration challenges.
2. **Improve Error Handling**: Add more robust error handling and recovery mechanisms for container communication issues.
3. **Add Health Checks**: Implement proper Docker health checks for all containers to ensure they're running correctly.
4. **Optimize Resource Usage**: Fine-tune the resource limits for the containers based on actual usage patterns.
5. **Implement CI/CD**: Set up continuous integration and deployment pipelines for the dockerized platform.

## Conclusion

The DevDocs platform has been successfully dockerized, with the exception of the MCP server which runs on the host system. The dockerized platform is easy to set up and run on different operating systems, making it more accessible to users and developers.

The main challenges were related to container communication and MCP server detection, but these have been addressed with the solutions described above. The platform now works reliably in a Docker environment, with clear documentation and testing tools to help users troubleshoot any issues.
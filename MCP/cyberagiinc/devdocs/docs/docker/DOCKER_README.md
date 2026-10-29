# DevDocs Dockerized Platform

This document provides instructions for running the DevDocs platform using Docker containers.

## Overview

The DevDocs platform consists of the following components:

1. **Next.js Frontend**: A React-based web application that provides the user interface
2. **FastAPI Backend**: A Python-based API server that handles the core functionality
3. **Crawl4AI Service**: A service for web crawling and content extraction
4. **Fast-Markdown-MCP Server**: A Model Context Protocol server that manages markdown content

All components are containerized using Docker, making it easy to run the platform on any system with Docker installed.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/DevDocs.git
cd DevDocs
```

### 2. Configure Environment Variables

```bash
# Copy the template environment file
cp .env.template .env
```

You can edit the `.env` file to customize the configuration, but the default values should work for most cases.

### 3. Start the Application

```bash
# Make the startup script executable
chmod +x docker-start.sh

# Run the startup script
./docker-start.sh
```

This will:
1. Create necessary directories
2. Build and start all Docker containers
3. Set up the network between containers

### 4. Access the Application

Once all services are running, you can access the application at:

- Frontend: http://localhost:3001
- Backend API: http://localhost:24125
- Crawl4AI API: http://localhost:11235

## Testing the Crawl4AI Service

The Crawl4AI service can be tested directly through the backend API:

```bash
# Using curl
curl -X POST http://localhost:24125/api/crawl4ai/test \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.nbcnews.com/business", "save_results": true}'
```

Or you can use the frontend interface to test the service.

The test results will be saved to the following locations:
- `crawl_results` directory: Contains the raw JSON and markdown files for debugging
- `storage/markdown` directory: Contains the markdown files and metadata for the MCP server

### Handling Timeouts

For complex URLs, the crawling process may take longer than expected. The system has been configured with the following timeout settings:

- Maximum polling attempts: 120 (2 minutes at 1-second intervals)
- Request timeout: 30 seconds for initial requests, 10 seconds for status checks

If you encounter timeout errors, you can try the following:
1. Use a simpler URL with less content
2. Increase the `max_attempts` value in `backend/app/crawler.py` if needed
3. Check the logs for any specific errors

### Debugging Connection Issues

If you're experiencing connection issues between the backend and Crawl4AI containers, you can use the provided debug script:

```bash
# Make the debug script executable
chmod +x debug_crawl4ai.sh

# Run the debug script
./debug_crawl4ai.sh
```

This script will:
1. Check if the required containers are running
2. Get the container IPs
3. Test if the backend can ping the Crawl4AI container
4. Test if the backend can reach the Crawl4AI API
5. Test a simple crawl request
6. Check the logs for relevant messages

The script will provide detailed output to help identify any connection issues.

## Container Architecture

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
                        │  (Container)    │
                        │                 │
                        └─────────────────┘
```

## Stopping the Application

To stop the application, press `Ctrl+C` in the terminal where you ran the `docker-start.sh` script. This will:
1. Stop all Docker containers
2. Clean up resources

## Troubleshooting

### Checking Container Status

```bash
# Check if all containers are running
docker ps

# Check logs for a specific container
docker logs devdocs-frontend
docker logs devdocs-backend
docker logs devdocs-mcp
docker logs devdocs-crawl4ai
```

### Testing Container Connectivity

```bash
# Make the check script executable
chmod +x check_crawl4ai.sh

# Run the check script
./check_crawl4ai.sh
```

This script will check if the Crawl4AI container is running and accessible from both the host and the backend container.

### Testing the Crawl4AI Service

```bash
# Make the test script executable
chmod +x test_from_container.sh

# Run the test script
./test_from_container.sh
```

This script will run a test of the Crawl4AI service from inside the backend container.

## Volumes and Persistence

The following directories are mounted as volumes in the Docker containers:

- `./storage`: Contains the markdown files managed by the MCP server
- `./logs`: Contains log files from all services
- `./crawl_results`: Contains the results of Crawl4AI tests

These directories will persist data even if the containers are stopped or removed.

## Customization

### Changing Ports

If you need to change the ports used by the services, edit the `docker-compose.yml` file and update the port mappings.

### Changing API Keys

To change the API key used for the Crawl4AI service, edit the `.env` file and update the `CRAWL4AI_API_TOKEN` variable.

## Advanced Usage

### Running Individual Containers

If you need to run only specific containers, you can use Docker Compose:

```bash
# Start only the backend and MCP containers
docker-compose up -d backend mcp
```

### Rebuilding Containers

If you make changes to the code, you'll need to rebuild the containers:

```bash
# Rebuild all containers
docker-compose build

# Rebuild a specific container
docker-compose build backend
```

### Accessing Container Shells

If you need to access a shell inside a container:

```bash
docker exec -it devdocs-backend bash
docker exec -it devdocs-frontend sh
docker exec -it devdocs-mcp bash
docker exec -it devdocs-crawl4ai sh
```

## License

This project is licensed under the terms of the license included in the repository.
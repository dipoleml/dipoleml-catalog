# MCP Docker Integration Setup

This document provides instructions for setting up and testing the MCP server in Docker, making it accessible to Claude and VSCode on the host machine.

## Understanding MCP Communication

The MCP server uses **stdin/stdout** for communication, not a network socket. This means:

- We don't need to expose any ports in the Docker container
- Claude communicates with the MCP server using `docker exec -i`
- The `stdin_open: true` and `tty: true` settings are crucial for proper I/O handling

## Setup Steps

1. **Update Docker Configuration**
   - The `docker-compose.yml` file has been updated to fix I/O issues
   - The MCP server container now has `stdin_open: true` and `tty: true` settings

2. **Restart Docker Containers**
   ```bash
   # Make the script executable
   chmod +x restart_and_test_mcp.sh
   
   # Run the restart script
   ./restart_and_test_mcp.sh
   ```

3. **Verify MCP Server Health**
   ```bash
   # Make the script executable
   chmod +x check_mcp_health.sh
   
   # Run the health check script
   ./check_mcp_health.sh
   ```

## Claude Configuration

The Claude MCP settings file is already correctly configured to use Docker:

```json
{
  "mcpServers": {
    "fast-markdown": {
      "command": "docker",
      "args": [
        "exec",
        "-i",
        "devdocs-mcp",
        "python",
        "-m",
        "fast_markdown_mcp.server",
        "/app/storage/markdown"
      ],
      "env": {},
      "disabled": false,
      "alwaysAllow": [
        "sync_file",
        "get_status",
        "list_files",
        "read_file",
        "search_files",
        "search_by_tag",
        "get_stats",
        "get_section",
        "get_table_of_contents"
      ]
    }
  }
}
```

## Testing

1. **Restart Claude or VSCode**
   - After making changes to the MCP settings, restart Claude or VSCode to apply the changes

2. **Test MCP Connection in Claude**
   - Ask Claude to list markdown files using the MCP server
   - Example prompt: "List all markdown files available in the MCP server"

## Troubleshooting

If you encounter issues with the MCP server connection:

1. **Check Docker Container Status**
   ```bash
   docker ps | grep devdocs-mcp
   ```

2. **View Docker Container Logs**
   ```bash
   docker logs devdocs-mcp
   ```

3. **Check if the MCP Process is Running**
   ```bash
   docker exec devdocs-mcp ps aux | grep python
   ```

4. **Test stdin Communication**
   ```bash
   docker exec -i devdocs-mcp echo "Test" > /dev/null
   ```

5. **Restart the Docker Containers**
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

6. **Check MCP Server Health**
   ```bash
   ./check_mcp_health.sh
   ```

## Common Issues and Solutions

1. **"I/O operation on closed file" Error**
   - This is fixed by adding `stdin_open: true` and `tty: true` to the Docker configuration
   - If the error persists, try restarting the Docker containers

2. **MCP Server Not Found by Claude**
   - Verify the MCP settings file has the correct configuration
   - Restart Claude or VSCode to apply the changes
   - Check if the Docker container is running and accessible

3. **Docker Exec Permission Issues**
   - Ensure you have permission to run Docker commands
   - Try running Docker commands with sudo if needed
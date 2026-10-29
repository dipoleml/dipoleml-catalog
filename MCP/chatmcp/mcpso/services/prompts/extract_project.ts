export const extractProjectPrompt = `Please extract project from the given content and return a project with JSON format. 
project object should contain:
- name: project name, should be unique, for example, mcp-server-chatsum
- title: a human readable title of the project
- description: a brief description of the project
- author_name: author name of the project if available

Example response format:
{
    "name": "mcp-server-example",
    "title": "MCP Server Example",
    "description": "A sample MCP server implementation",
    "author_name": "mcpso"
}

given content:
{content}
`;

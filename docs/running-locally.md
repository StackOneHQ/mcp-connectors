# Running MCP Connectors Locally

This guide covers how to run MCP connectors locally for development and testing.

## Overview

The MCP connectors use HTTP streaming transport over the `/mcp` endpoint. This allows for real-time communication between MCP clients and the connector servers.

## Quick Start

1. **Start a connector server:**

   ```bash
   bun start --connector test
   ```

2. **Server will be available at:**

   ```
   http://localhost:3000/mcp
   ```

3. **Configure your MCP client** (like Cursor) to connect to the local endpoint.

## CLI Usage

### Basic Command Structure

```bash
bun start --connector <connector-key> [options]
```

### Available Options

| Option          | Short | Description                                    | Required |
| --------------- | ----- | ---------------------------------------------- | -------- |
| `--connector`   | `-c`  | Connector key to run                           | ✅       |
| `--credentials` |       | JSON string with connector credentials         |          |
| `--setup`       |       | JSON string with connector setup configuration |          |
| `--port`        |       | Port to run server on (default: 3000)          |          |
| `--help`        | `-h`  | Show help message                              |          |

### Examples

**Test connector (no credentials needed):**

```bash
bun start --connector test
```

**Asana connector with API key:**

```bash
bun start --connector asana --credentials '{"apiKey":"your-api-key"}'
```

**GitHub connector with token and setup:**

```bash
bun start --connector github \
  --credentials '{"token":"ghp_your-token"}' \
  --setup '{"org":"your-org"}'
```

**Custom port:**

```bash
bun start --connector slack --port 4000 --credentials '{"botToken":"xoxb-your-token"}'
```

## Available Connectors

Run `bun start --help` to see all available connectors. Some popular ones include:

- `test` - Simple test connector for development
- `asana` - Asana project management
- `github` - GitHub repository management
- `slack` - Slack workspace integration
- `notion` - Notion workspace
- `jira` - Jira issue tracking
- `linear` - Linear project management
- `todoist` - Todoist task management

## HTTP Streaming Transport

### Endpoint Details

- **URL:** `http://localhost:3000/mcp`
- **Protocol:** HTTP/1.1 with streaming
- **Content-Type:** `application/json`
- **Method:** POST (for MCP requests)

### Transport Features

- **Real-time streaming** - Supports long-lived connections
- **Bidirectional communication** - Client and server can both initiate requests
- **Error handling** - Proper error responses with details
- **Auto-reconnection** - Client can reconnect on connection loss

## MCP Client Configuration

### Cursor IDE Configuration

Add to your `mcp.json` file:

```json
{
  "mcpServers": {
    "localhost": {
      "url": "http://localhost:3000/mcp",
      "headers": {}
    }
  }
}
```

### Custom Headers (if needed)

```json
{
  "mcpServers": {
    "localhost": {
      "url": "http://localhost:3000/mcp",
      "headers": {
        "Authorization": "Bearer your-token",
        "X-Custom-Header": "value"
      }
    }
  }
}
```

## Development Features

### Auto-Reloading

The server automatically reloads when you make changes to the code:

```bash
# This command includes --watch for auto-reloading
bun start --connector test
```

### Debug Output

The server provides detailed startup information:

```
🚀 Starting MCP Connector Server...
📦 Connector: Test (test)
🔧 Version: 1.0.0
⚡ Tools: 5
📄 Resources: 0
🌐 Port: 3000
🔐 Credentials: 1 keys provided
⚙️  Setup: 2 config keys provided
💡 Example: Test the connector by running basic tools...

🔗 MCP endpoint: http://localhost:3000/mcp
✅ Server ready!
```

### Error Handling

The server provides helpful error messages:

- **Missing connector:** Lists all available connectors
- **Invalid JSON:** Shows JSON parsing errors for credentials/setup
- **Runtime errors:** Tool execution errors are caught and returned safely

## Troubleshooting

### Common Issues

**Server won't start:**

```bash
# Check if port is already in use
lsof -i :3000

# Use a different port
bun start --connector test --port 3001
```

**Connector not found:**

```bash
# List all available connectors
bun start --help
```

**Credentials issues:**

```bash
# Validate JSON syntax
echo '{"apiKey":"test"}' | jq .

# Check connector-specific credential requirements
# (refer to individual connector documentation)
```

**MCP client connection issues:**

- Ensure the server is running and accessible
- Check firewall settings
- Verify the endpoint URL in client configuration
- Look for CORS issues if connecting from a web client

### Logs and Debugging

Monitor server logs for detailed information about:

- Incoming MCP requests
- Tool execution results
- Connection status
- Error details

The server logs all activity to stdout with clear formatting and status indicators.

## Production Deployment

For production deployments:

1. **Use environment variables** instead of CLI arguments:

   ```bash
   CONNECTOR_KEY=github \
   CREDENTIALS='{"token":"ghp_xxx"}' \
   SETUP='{"org":"myorg"}' \
   bun start
   ```

2. **Configure proper security:**

   - Use HTTPS in production
   - Implement authentication headers
   - Set up proper CORS policies
   - Use secure credential storage

3. **Monitor and logging:**

   - Set up structured logging
   - Monitor server health
   - Track MCP request metrics
   - Alert on errors

4. **Scale considerations:**
   - Load balance multiple instances
   - Use persistent connections
   - Implement connection pooling
   - Cache frequently accessed data

## Next Steps

- Explore [individual connector documentation](./connectors/) for specific setup requirements
- Learn about [writing custom connectors](./custom-connectors.md)
- See [MCP protocol documentation](https://spec.modelcontextprotocol.io/) for advanced usage

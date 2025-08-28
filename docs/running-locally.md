# Running MCP Connectors Locally

This guide covers how to run MCP connectors locally for development and testing.

## Overview

The MCP connectors use HTTP streaming transport over the `/mcp` endpoint. The server application is located in `apps/server` and provides development-friendly features like file logging, watch mode, and non-blocking execution.

## Quick Start

### For Agents (Non-blocking Background Process)

The `spawn` command starts the server as a detached background process:

```bash
# Start a test server in the background
bun run server -- -- --connector test

# Start with credentials
bun run server -- -- --connector github --credentials '{"token":"ghp_xxx"}'

# The command returns immediately with the server URL:
# http://localhost:3000/mcp
```

### For Development (Auto-reload)

The `dev` command runs the server with file watching for auto-reload:

```bash
# Start with auto-reload on file changes
bun run dev -- -- --connector test
```

### For Production/Testing (Foreground)

The `start` command runs the server in the foreground without file watching:

```bash
# Start server directly (blocks terminal, no auto-reload)
bun start -- -- --connector test
```

## CLI Usage

### Available Commands

| Command         | Description                                          | Use Case                    |
| --------------- | ---------------------------------------------------- | --------------------------- |
| `bun run server`| Spawns server in background (detached process), returns URL immediately | Agents, automated testing   |
| `bun run dev`   | Runs server with watch mode (auto-reload on file changes) | Active development         |
| `bun start`     | Runs server in foreground (blocking, no watch mode) | Production, stable testing  |

### Command Options

> **Note on argument passing:** When using `bun run server`, `bun run dev`, or `bun start`, you need to use double `--` to pass arguments:
> - First `--` tells bun to pass arguments to turbo
> - Second `--` tells turbo to pass arguments to the actual script
> - Example: `bun run server -- -- --connector test`

All commands support these options:

| Option          | Short | Description                                    | Required |
| --------------- | ----- | ---------------------------------------------- | -------- |
| `--connector`   | `-c`  | Connector key to run                           | ✅       |
| `--credentials` |       | JSON string with connector credentials         |          |
| `--setup`       |       | JSON string with connector setup configuration |          |
| `--port`        |       | Port to run server on (default: 3000, see note below) |          |
| `--help`        | `-h`  | Show help message                              |          |

> **Important:** Always use port 3000 (the default) unless you have a specific reason to use another port. The user must explicitly request a different port if needed.

### Examples

**Test connector (no credentials needed):**

```bash
bun run server -- -- --connector test
```

**Asana connector with API key:**

```bash
bun run server -- -- --connector asana --credentials '{"apiKey":"your-api-key"}'
```

**GitHub connector with token and setup:**

```bash
bun run server -- -- --connector github \
  --credentials '{"token":"ghp_your-token"}' \
  --setup '{"org":"your-org"}'
```

**Custom port (only when explicitly needed):**

```bash
# Only use a different port if specifically required
bun run server -- -- --connector slack --port 4000 --credentials '{"botToken":"xoxb-your-token"}'
```

## Log Management

### Log Files

All server output is written to log files for easy monitoring:

- **Location:** `apps/server/logs/server.log`
- **Format:** JSON with timestamps
- **PID file:** `apps/server/logs/server.pid`

### Viewing Logs

```bash
# Real-time monitoring
tail -f apps/server/logs/server.log

# View recent logs
tail -n 100 apps/server/logs/server.log

# Search logs
grep "Tool invoked" apps/server/logs/server.log
```

### Log Format

```json
{
  "level": "info",
  "message": "Tool invoked: test_tool",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "tool": "test_tool",
  "args": {...},
  "duration": 125
}
```

## Process Management

### Stop a Running Server

```bash
# Using PID file
kill $(cat apps/server/logs/server.pid)

# Or find and kill by port
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill
```

### Check Server Status

```bash
# Check if server is running
ps aux | grep $(cat apps/server/logs/server.pid)

# Check port usage
lsof -i :3000
```

## Agent Workflow

The server is designed to be agent-friendly with these features:

1. **Non-blocking execution** - Returns immediately with server URL
2. **File-based logging** - Agents can read logs from files
3. **Process isolation** - Server runs independently
4. **Watch mode** - Auto-restarts on connector code changes

### Agent Development Flow

A complete workflow for developing and testing MCP connectors with agents like Claude:

#### 1. Spawn the Server

From the repository root, use turbo to spawn a connector server:

```bash
# Spawn test connector (no credentials needed)
bun run server -- -- --connector test

# Output:
# ✅ Server spawned with PID: 71652
# 🔗 Server URL: http://localhost:3000/mcp
```

#### 2. Configure Your MCP Client

Add the server URL to your MCP configuration. The local server is typically configured as `localhost` in your `.mcp.json` file:

```json
{
  "mcpServers": {
    "localhost": {
      "type": "http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

This configuration will be automatically loaded by your MCP client (e.g., Claude Code) when you reload.

#### 3. Test the Tools

After reloading your MCP client, the connector's tools become available with the prefix `mcp__localhost__` (matching your config key):

For example, with the test connector:
- `mcp__localhost__test-tool` - Basic test tool
- `mcp__localhost__test-tool-with-args` - Test tool with parameters
- `mcp__localhost__persist_value` - Store key-value pairs
- `mcp__localhost__get_value` - Retrieve stored values
- `mcp__localhost__increment_counter` - Increment a persistent counter

The tools can now be called directly by the agent and it can see the results.

#### 4. Monitor and Debug

```bash
# View real-time logs
tail -f apps/server/logs/server.log

# Check server status
ps aux | grep $(cat apps/server/logs/server.pid)
```

#### 5. Stop the Server

```bash
# Using the PID from spawn output
kill 71652

# Or using the PID file
kill $(cat apps/server/logs/server.pid)
```

## Available Connectors

Run `bun run server -- -- --help` to see all available connectors. Popular ones include:

- `test` - Simple test connector for development
- `asana` - Asana project management
- `github` - GitHub repository management
- `slack` - Slack workspace integration
- `notion` - Notion workspace
- `jira` - Jira issue tracking
- `linear` - Linear project management
- `todoist` - Todoist task management

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

The server automatically reloads when connector code changes:

```bash
# Start with watch mode
bun run dev -- -- --connector test

# Or spawn with watch (watch is enabled by default)
bun run server -- -- --connector test
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
📝 Logs: apps/server/logs/server.log
🔐 Credentials: 1 keys provided
⚙️  Setup: 2 config keys provided
💡 Example: Test the connector by running basic tools...

🔗 MCP endpoint: http://localhost:3000/mcp
✅ Server ready!
```

## Troubleshooting

### Common Issues

**Port already in use:**

```bash
# Check what's using the port
lsof -i :3000

# Use a different port (only when explicitly needed)
bun run server -- -- --connector test --port 3001
```

**Connector not found:**

```bash
# List all available connectors
bun run server -- -- --help
```

**Server won't start:**

```bash
# Check logs for errors
cat apps/server/logs/server.log

# Clear logs and try again
rm apps/server/logs/server.log
bun run server -- -- --connector test
```

**Credentials issues:**

```bash
# Validate JSON syntax
echo '{"apiKey":"test"}' | jq .

# Check connector-specific requirements in the connector files
```

### Testing the Server

```bash
# Test with curl
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }'

# Test specific tool
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "test_tool",
      "arguments": {}
    },
    "id": 2
  }'
```

## Architecture

The server application is structured as follows:

```
apps/server/
├── src/
│   ├── index.ts         # Main server with Hono
│   └── spawn-server.ts   # Process spawner for non-blocking mode
├── logs/
│   ├── server.log       # Server output logs
│   └── server.pid       # Process ID file
├── package.json
└── README.md
```

### Key Features

1. **File Logging**: All output written to `apps/server/logs/server.log` with JSON formatting
2. **Process Management**: PID saved to `apps/server/logs/server.pid` for easy control
3. **Watch Mode**: Auto-restart on connector code changes
4. **Non-blocking**: Spawns in background, returns URL immediately
5. **Isolation**: Server code separate from connector logic

## Next Steps

- See [MCP protocol documentation](https://spec.modelcontextprotocol.io/) for protocol details
- Check individual connector documentation for specific requirements
- Use the test connector for development and testing
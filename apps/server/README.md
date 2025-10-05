# MCP Connector Server

A dedicated server application for running MCP connectors locally with proper development tooling support.

## Features

- **Non-blocking execution**: Spawns server in background process
- **File-based logging**: All logs written to `logs/server.log` for easy monitoring
- **Watch mode**: Automatic restart on file changes during development
- **Process management**: Returns server URL immediately, doesn't block terminal
- **Agent-friendly**: Designed for AI agents to start, test, and monitor servers

## Installation

```bash
bun install
```

## Usage

### Start Server (Blocking Mode)

Run the server directly (blocks terminal):

```bash
bun start --connector <connector-key> [options]
```

### Start Server (Non-blocking Mode)

Spawn the server in the background (recommended for agents):

```bash
bun run spawn --connector <connector-key> [options]
```

This command:
- Starts the server in a detached process
- Returns the server URL immediately
- Writes logs to `logs/server.log`
- Saves PID to `logs/server.pid` for process management

### Options

| Option          | Description                                    | Default |
| --------------- | ---------------------------------------------- | ------- |
| `--connector`   | Connector key to run (required)               | -       |
| `--credentials` | JSON string with connector credentials        | {}      |
| `--setup`       | JSON string with connector setup              | {}      |
| `--port`        | Port to run server on                         | 3000    |
| `--watch`       | Enable watch mode (spawn command only) **⚠️ Note: Watch mode may not detect all file changes correctly** | true    |
| `--help`        | Show help message                             | -       |

## Examples

### Simple Test Server

```bash
# Spawn in background with watch mode
bun run spawn --connector test

# Output:
# http://localhost:3000/mcp
```

### With Credentials

```bash
bun run spawn --connector github \
  --credentials '{"token":"ghp_xxx"}' \
  --setup '{"org":"myorg"}' \
  --port 3001
```

## Log Management

### View Logs

```bash
# Real-time log monitoring
tail -f logs/server.log

# View full log
cat logs/server.log
```

### Log Format

Logs are written in JSON format with timestamps for easy parsing:

```json
{
  "level": "info",
  "message": "Tool invoked: test_tool",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "tool": "test_tool",
  "args": {...}
}
```

## Process Management

### Stop Server

```bash
# Get PID from file
kill $(cat logs/server.pid)

# Or manually with PID from spawn output
kill <PID>
```

### Check Server Status

```bash
# Check if server is running
ps aux | grep $(cat logs/server.pid)
```

## Development Workflow

1. **Start server with watch mode**:
   ```bash
   bun run spawn --connector test --watch
   ```
   **⚠️ Important**: Watch mode may not detect all file changes reliably. If changes are not detected, restart the server manually.

2. **Monitor logs in another terminal**:
   ```bash
   tail -f logs/server.log
   ```

3. **Edit connector code** - server auto-restarts on changes (when watch mode detects them)

4. **Test endpoints**:
   ```bash
   curl http://localhost:3000/mcp
   ```

## Agent Integration

This server is designed to be agent-friendly:

1. **Non-blocking**: Agents can spawn servers without blocking
2. **URL return**: Server URL returned immediately for testing
3. **File logs**: Agents can read logs from `logs/server.log`
4. **Process isolation**: Server runs independently, won't affect agent execution

### Agent Workflow Example

```bash
# 1. Agent spawns server
url=$(bun run spawn --connector test | tail -n 1)

# 2. Agent tests the server
curl $url

# 3. Agent monitors logs
tail -n 10 logs/server.log

# 4. Agent stops server when done
kill $(cat logs/server.pid)
```

## Architecture

- `src/index.ts` - Main server implementation with Hono
- `src/spawn-server.ts` - Process spawner for non-blocking execution
- `logs/server.log` - Server output logs
- `logs/server.pid` - Process ID for management

## Notes

- The server app is isolated from connector logic
- AI should not change the server code, it should only change the connector code
- Connectors are imported from `@stackone/mcp-connectors`
- Watch mode monitors connector changes, not server code changes
- Logs are appended, clear manually if needed
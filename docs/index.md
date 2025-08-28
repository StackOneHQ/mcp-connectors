# MCP Connectors Documentation

Welcome to the MCP Connectors documentation for disco.dev.

## Getting Started

- [Running Servers Locally](./running-locally.md) - How to start and configure MCP connector servers locally
- [Available Connectors](./connectors.md) - List of all available connectors and their configurations
- [Browserbase Connector](./browserbase-connector.md) - Complete guide for web automation with Browserbase
- [Custom Connectors](./custom-connectors.md) - Guide for building your own connectors

## Quick Start

```bash
# Start a test connector
bun start --connector test

# Start with credentials
bun start --connector asana --credentials '{"apiKey":"your-key"}'

# Start browserbase connector for web automation
bun start --connector browserbase --credentials '{
  "apiKey": "bb_your_api_key",
  "projectId": "proj_your_project_id"
}'
```

The server will be available at `http://localhost:3000/mcp` using HTTP streaming transport.

### Browserbase Example

```bash
# Test browserbase structure (no credentials needed)
bun start --connector browserbase

# Full browserbase setup with credentials
bun start --connector browserbase \
  --credentials '{"apiKey":"bb_xxx","projectId":"proj_xxx"}' \
  --setup '{"defaultBrowserWidth":1920,"enableStealth":true}'
```

## Key Features

- **35+ Connectors** - Pre-built connectors for popular SaaS tools
- **Web Automation** - Browserbase connector for headless browser automation
- **HTTP Streaming** - Real-time bidirectional communication
- **Auto-Reloading** - Development server with hot reload
- **Type Safe** - Full TypeScript support with Zod schemas
- **Easy Configuration** - Simple JSON-based credential management
- **AI-Powered Forms** - Smart form filling with element detection
- **Screenshot Capture** - Full-page and element-specific screenshots

## Architecture

The MCP connectors use HTTP streaming over the `/mcp` endpoint for real-time communication between MCP clients (like Cursor) and connector servers.

For customers, these docs will be exposed as `llms-full.txt` from the package.json file for AI agent integration.

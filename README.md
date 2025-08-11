# MCP Connectors

> 35+ pre-built MCP connectors for popular SaaS tools - ready to use with [disco.dev](https://disco.dev)

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![npm version](https://badge.fury.io/js/@stackone%2Fmcp-connectors.svg)](https://badge.fury.io/js/@stackone%2Fmcp-connectors)

## Quick Start

1. **Install dependencies:**

   ```bash
   bun install
   ```

2. **Start a connector server:**

   ```bash
   # Test connector (no credentials needed)
   bun start --connector test

   # Production connectors with credentials
   bun start --connector github --credentials '{"token":"ghp_your-token"}'
   bun start --connector asana --credentials '{"apiKey":"your-api-key"}'
   ```

3. **Server runs at:** `http://localhost:3000/mcp`

## Available Connectors

**Popular integrations:** `asana`, `github`, `slack`, `notion`, `jira`, `linear`, `todoist`, `google-drive`, `supabase`

**Full list:** Run `bun start --help` to see all 35+ connectors

## Usage with disco.dev

These MCP connectors are designed to work seamlessly with [**disco.dev**](https://disco.dev) - the AI-powered workspace that connects your favorite tools.

🔗 **Get started at [disco.dev](https://disco.dev)**

## Features

- ⚡ **Fast startup** - Built with Bun and TypeScript
- 🔄 **Auto-reload** - Development server with hot reload
- 🔒 **Type-safe** - Full TypeScript support with Zod schemas
- 🌐 **HTTP streaming** - Real-time MCP protocol support
- 📦 **35+ connectors** - Pre-built integrations for popular SaaS tools

## Configuration

### Basic Usage

```bash
bun start --connector <connector-key> [options]
```

### With Credentials

```bash
bun start --connector asana --credentials '{"apiKey":"your-key"}'
```

### Custom Port

```bash
bun start --connector github --port 4000 --credentials '{"token":"your-token"}'
```

## Development

```bash
# Install dependencies
bun install

# Start test server with auto-reload
bun start --connector test

# Run tests
bun test

# Build for production
bun run build
```

## Documentation

- [Running Locally](./docs/running-locally.md) - Detailed setup and configuration
- [Available Connectors](./docs/connectors.md) - Complete connector reference
- [Writing Custom Connectors](./docs/custom-connectors.md) - Build your own

## License

Apache 2.0 - see [LICENSE](LICENSE)

---

**Built by [StackOne](https://stackone.com) • Powered by [disco.dev](https://disco.dev)**

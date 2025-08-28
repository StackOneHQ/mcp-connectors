# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript monorepo for MCP (Model Context Protocol) connectors that powers disco.dev. It contains pre-built connectors for 35+ popular SaaS tools like GitHub, Slack, Notion, Jira, etc.

## Development Commands

### Install dependencies
```bash
bun install
```

### Start a connector server for testing
```bash
# No credentials needed (test connector)
bun start --connector test

# With credentials for production connectors
bun start --connector asana --credentials '{"apiKey":"your-api-key"}'
bun start --connector github --credentials '{"token":"ghp_xxx"}' --setup '{"org":"myorg"}'
```

### Build and type checking
```bash
bun run build      # Build all packages
bun run typecheck  # Type check all packages
bun run test       # Run all tests
```

### Code quality
```bash
bun run check      # Run Biome linter and formatter
bun run check:fix  # Auto-fix linting issues
```

## Architecture

### Monorepo Structure
- **packages/mcp-connectors/**: Main connectors package with 35+ connector implementations
- **packages/mcp-config-types/**: Shared TypeScript types and Zod schemas for connector configurations
- **scripts/**: Development scripts for starting and testing connector servers
- **apps/testing-agent/**: Testing utilities

### Connector Architecture
Each connector is defined using the `mcpConnectorConfig` factory function with:
- **Metadata**: name, key, version, logo, example prompt
- **Credentials schema**: Zod schema defining required API keys/tokens
- **Setup schema**: Zod schema for optional configuration
- **Tools**: Functions that can be called by MCP clients
- **Resources**: Static data that can be retrieved

### Key Components
- **ConnectorContext**: Provides credential access, data persistence, and caching
- **MCPConnectorConfig**: Type-safe connector configuration with tools and resources
- **Transport layer**: HTTP transport using Hono framework for MCP protocol

### Tools vs Resources
- **Tools**: Active functions that perform operations (API calls, data processing)
- **Resources**: Passive data retrieval (documentation, static content)

### Adding New Connectors
1. Create new connector file in `packages/mcp-connectors/src/connectors/`
2. Follow the pattern of existing connectors (see `test.ts` for simple example)
3. Export the connector config and add to `packages/mcp-connectors/src/index.ts`
4. Update credentials/setup schemas in `packages/mcp-config-types/src/` if needed

## Development Notes

### Runtime Environment
- Uses **Bun** as package manager and runtime
- **Turbo** for monorepo orchestration
- **Biome** for linting and formatting (90 char line width, single quotes)
- **Vitest** for testing
- **TypeScript 5.9** with strict settings

### Server Architecture
The development server (`scripts/start-server.ts`) creates:
- MCP server instance with connector tools and resources
- HTTP transport layer using Hono
- Request/response logging with timestamps
- Error handling and debugging output
- Support for credentials and setup configuration via CLI args

### Key Files
- `packages/mcp-connectors/src/index.ts`: Main connector registry
- `packages/mcp-config-types/src/config.ts`: Connector configuration factory
- `scripts/start-server.ts`: Development server implementation
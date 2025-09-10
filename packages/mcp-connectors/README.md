# @stackone/mcp-connectors

[![npm version](https://badge.fury.io/js/@stackone%2Fmcp-connectors.svg)](https://badge.fury.io/js/@stackone%2Fmcp-connectors)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

> Pre-built MCP (Model Context Protocol) connectors for popular SaaS tools

Production-ready TypeScript connectors for 45+ SaaS tools including GitHub, Slack, Notion, Jira, Linear, and more.

**🌟 These are the same connectors that power the [Disco.dev](https://disco.dev) integration list**

## Installation

```bash
npm install @stackone/mcp-connectors @stackone/mcp-config-types
```

## Usage

```typescript
import { GitHubConnectorConfig } from '@stackone/mcp-connectors';

// Get a tool from a connector
const createIssueTool = GitHubConnectorConfig.tools.CREATE_ISSUE;

// Use in your MCP server
const result = await createIssueTool.handler({
  owner: 'stackone-ai',
  repo: 'mcp-connectors',
  title: 'New feature request'
}, context);
```

## Available Connectors (45+)

Popular integrations: `github`, `slack`, `notion`, `jira`, `linear`, `asana`, `todoist`, `google-drive`, `supabase`

[View all connectors →](./src/connectors/)

## Documentation

- [Repository README](../../README.md) - Complete setup and development guide
- [Writing Connectors](../../docs/writing-connectors.md) - How to create new connectors

## License

Apache 2.0 - see [LICENSE](../../LICENSE)

---

**Built by [StackOne](https://stackone.com) • Powers [disco.dev](https://disco.dev)**
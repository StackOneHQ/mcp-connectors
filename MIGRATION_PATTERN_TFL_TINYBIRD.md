# Migration Pattern for TFL and Tinybird Connectors

This document shows the migration pattern for the remaining two connectors (TFL and Tinybird) from `@stackone/mcp-config-types` to native `@modelcontextprotocol/sdk`.

## TFL Connector Migration Pattern

### 1. Update Import
```typescript
// OLD:
import { mcpConnectorConfig } from '@stackone/mcp-config-types';

// NEW:
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
```

### 2. Create Credentials Interface
```typescript
export interface TFLCredentials {
  appKey?: string;  // Optional API key
}
```

### 3. Convert to Factory Function
```typescript
// OLD:
export const TFLConnectorConfig = mcpConnectorConfig({
  name: 'TFL (Transport for London)',
  key: 'tfl',
  version: '1.0.0',
  credentials: z.object({
    appKey: z.string().optional().describe('...'),
  }),
  setup: z.object({}),
  tools: (tool) => ({ ... }),
});

// NEW:
export function createTFLServer(credentials: TFLCredentials): McpServer {
  const server = new McpServer({
    name: 'TFL (Transport for London)',
    version: '1.0.0',
  });

  const client = new TFLClient(credentials.appKey);

  // Tools...

  return server;
}
```

### 4. Convert Tools
```typescript
// OLD:
GET_LINES: tool({
  name: 'tfl_get_lines',
  description: 'Get all lines for tube, bus, DLR, overground, and TfL Rail',
  schema: z.object({}),
  handler: async (_, context) => {
    const { appKey } = await context.getCredentials();
    const client = new TFLClient(appKey);
    const lines = await client.getLines();
    const filtered = await filterLineStatus(lines);
    return JSON.stringify(filtered, null, 2);
  },
}),

// NEW:
server.tool(
  'tfl_get_lines',
  'Get all lines for tube, bus, DLR, overground, and TfL Rail',
  {},
  async (_args) => {
    try {
      const lines = await client.getLines();
      const filtered = await filterLineStatus(lines);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(filtered, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to get lines: ${error instanceof Error ? error.message : String(error)}`,
        }],
      };
    }
  }
);
```

### 5. Tool with Parameters
```typescript
// OLD:
GET_LINE_STATUS: tool({
  name: 'tfl_get_line_status',
  description: 'Get the current service status for specific transport lines',
  schema: z.object({
    lineIds: z.array(z.string()).describe('Array of line IDs'),
  }),
  handler: async (args, context) => {
    const { appKey } = await context.getCredentials();
    const client = new TFLClient(appKey);
    const status = await client.getLineStatus(args.lineIds);
    return JSON.stringify(status, null, 2);
  },
}),

// NEW:
server.tool(
  'tfl_get_line_status',
  'Get the current service status for specific transport lines',
  {
    lineIds: z.array(z.string()).describe('Array of line IDs'),
  },
  async (args) => {
    try {
      const status = await client.getLineStatus(args.lineIds);
      const filtered = await filterLineStatus(status);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(filtered, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to get line status: ${error instanceof Error ? error.message : String(error)}`,
        }],
      };
    }
  }
);
```

## Tinybird Connector Migration Pattern

### 1. Update Import
```typescript
// Same as TFL
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
```

### 2. Create Credentials Interface
```typescript
export interface TinybirdCredentials {
  apiUrl: string;
  adminToken: string;
}
```

### 3. Convert to Factory Function
```typescript
export function createTinybirdServer(credentials: TinybirdCredentials): McpServer {
  const server = new McpServer({
    name: 'Tinybird',
    version: '1.0.0',
  });

  const client = new TinybirdClient(credentials.apiUrl, credentials.adminToken);

  // Tools...

  return server;
}
```

### 4. Convert Tools
```typescript
// OLD:
LIST_DATA_SOURCES: tool({
  name: 'tinybird_list_data_sources',
  description: 'List all Data Sources in the Tinybird Workspace',
  schema: z.object({}),
  handler: async (_args, context) => {
    const { apiUrl, adminToken } = await context.getCredentials();
    const client = new TinybirdClient(apiUrl, adminToken);
    const response = await client.listDataSources();
    return JSON.stringify(response, null, 2);
  },
}),

// NEW:
server.tool(
  'tinybird_list_data_sources',
  'List all Data Sources in the Tinybird Workspace',
  {},
  async (_args) => {
    try {
      const response = await client.listDataSources();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error listing data sources: ${error instanceof Error ? error.message : String(error)}`,
        }],
      };
    }
  }
);
```

### 5. Tool Returning Plain Text
```typescript
// OLD:
DEFAULT_PROMPT: tool({
  name: 'tinybird_default_prompt',
  description: 'The default prompt for the Tinybird MCP Server',
  schema: z.object({
    topic: z.string().describe('The topic of the data you want to explore'),
  }),
  handler: async (args, _context) => {
    const prompt = PROMPT_TEMPLATE.replace(/\{topic\}/g, args.topic);
    return prompt.trim();
  },
}),

// NEW:
server.tool(
  'tinybird_default_prompt',
  'The default prompt for the Tinybird MCP Server',
  {
    topic: z.string().describe('The topic of the data you want to explore'),
  },
  async (args) => {
    try {
      const prompt = PROMPT_TEMPLATE.replace(/\{topic\}/g, args.topic);
      return {
        content: [{
          type: 'text',
          text: prompt.trim(),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error generating prompt: ${error instanceof Error ? error.message : String(error)}`,
        }],
      };
    }
  }
);
```

### 6. Tool with State Management (APPEND_INSIGHT)
```typescript
// Note: The native SDK doesn't have built-in state management like context.getData/setData
// This functionality would need to be implemented separately using an external state store
// For now, you can either:
// 1. Remove this tool temporarily
// 2. Implement a simple in-memory store
// 3. Use an external database/file system

// Example with in-memory store:
const insightsStore: string[] = [];

server.tool(
  'tinybird_append_insight',
  'Adds a new business insight to the memo resource',
  {
    insight: z.string().describe('Business insight discovered from data analysis'),
  },
  async (args) => {
    try {
      insightsStore.push(args.insight);
      return {
        content: [{
          type: 'text',
          text: 'Insight added to memo',
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error adding insight: ${error instanceof Error ? error.message : String(error)}`,
        }],
      };
    }
  }
);
```

## Key Changes Summary

1. **Import**: Replace `mcpConnectorConfig` with `McpServer`
2. **Credentials**: Create interface, pass via closure instead of context
3. **Schema**: Use raw object `{ param: z.string() }` NOT `z.object({})`
4. **Handler**: `async (args)` NOT `async (args, context)`
5. **Return**: Always `{ content: [{ type: 'text', text: '...' }] }`
6. **Client**: Initialize once outside tools, access via closure
7. **Resources**: Native SDK doesn't support resources yet - omit for now
8. **State**: No built-in context.getData/setData - use external store

## Complete File Structure

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

// Interfaces, constants, client classes...

export interface ConnectorCredentials {
  // fields
}

export function createConnectorServer(credentials: ConnectorCredentials): McpServer {
  const server = new McpServer({
    name: 'Connector Name',
    version: '1.0.0',
  });

  const client = new ConnectorClient(credentials.field);

  server.tool(
    'tool_name',
    'Tool description',
    { param: z.string() },
    async (args) => {
      try {
        const result = await client.method(args.param);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  // More tools...

  return server;
}
```

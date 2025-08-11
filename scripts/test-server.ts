import { StreamableHTTPTransport } from '@hono/mcp';
// demo server for testing
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Hono } from 'hono';
import { z } from 'zod';

const app = new Hono();

const server = new McpServer({
  name: 'Test MCP (disco.dev)',
  version: '1.0.0',
});

server.tool(
  'test',
  'Test tool',
  {
    name: z.string(),
  },
  async ({ name }) => {
    return {
      content: [{ type: 'text' as const, text: `Hello, ${name}!` }],
    };
  }
);

server.resource('test', 'resource://test', async (uri: URL) => {
  return {
    contents: [
      { type: 'text' as const, text: `Hello, ${uri.toString()}!`, uri: uri.toString() },
    ],
  };
});

server.prompt(
  'test',
  'Test prompt',
  {
    name: z.string(),
  },
  async ({ name }) => {
    return {
      messages: [
        {
          role: 'user',
          content: { type: 'text' as const, text: `Hello, ${name}!` },
        },
      ],
    };
  }
);

const transport = new StreamableHTTPTransport();

let isConnected = false;
const connectedToServer = server.connect(transport).then(() => {
  isConnected = true;
});

app.all('/mcp', async (c) => {
  if (!isConnected) await connectedToServer;
  return transport.handleRequest(c);
});

export default app;

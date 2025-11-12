import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ConnectorMetadata } from '../types/metadata';

export const TestConnectorMetadata = {
  key: 'test',
  name: 'Test',
  description: 'Test connector for development',
  version: '1.0.0',
  examplePrompt: 'Test the connector',
  categories: ['testing', 'development'],
} as const satisfies ConnectorMetadata;

export interface TestCredentials {
  apiKey: string;
  someSetting: string;
}

export function createTestServer(credentials: TestCredentials): McpServer {
  const server = new McpServer({
    name: 'Test',
    version: '1.0.0',
  });

  server.tool('test-tool', 'Test tool', {}, async (_args) => {
    console.log('CREDENTIALS', credentials);
    return {
      content: [
        {
          type: 'text',
          text: 'this is a test',
        },
      ],
    };
  });

  server.tool(
    'test-tool-with-args',
    'Test tool with args',
    {
      param1: z.string().describe('Param 1'),
    },
    async (args) => {
      console.log('ARGS', args);
      return {
        content: [
          {
            type: 'text',
            text: `this is a test with args: ${JSON.stringify(args)}`,
          },
        ],
      };
    }
  );

  return server;
}

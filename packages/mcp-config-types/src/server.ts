import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type {
  CallToolResult,
  ReadResourceResult,
} from '@modelcontextprotocol/sdk/types.js';
import type { ConnectorContext, MCPConnectorConfig } from './types.js';

export const buildServerFromConnector = async (
  connectorConfig: MCPConnectorConfig,
  context: ConnectorContext
) => {
  const server = new McpServer({
    name: `${connectorConfig.name} MCP Server (disco.dev)`,
    version: connectorConfig.version,
  });

  for (const tool of Object.values(connectorConfig.tools)) {
    // Check if schema has a shape property (ZodObject)
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    const inputSchema = (tool.schema as any).shape || {};
    server.tool(tool.name, tool.description, inputSchema, async (args: unknown) => {
      try {
        const result = await tool.handler(args, context);
        return {
          content: [{ type: 'text' as const, text: result }],
        } satisfies CallToolResult;
      } catch (error) {
        return {
          content: [
            {
              isError: true,
              type: 'text' as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        } satisfies CallToolResult;
      }
    });
  }

  for (const resource of Object.values(connectorConfig.resources)) {
    server.resource(resource.name, resource.uri, async (uri: URL) => {
      try {
        const result = await resource.handler(context);
        return {
          contents: [
            {
              type: 'text' as const,
              text: result,
              uri: uri.toString(),
            },
          ],
        } satisfies ReadResourceResult;
      } catch (error) {
        return {
          contents: [
            {
              type: 'text' as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
              uri: uri.toString(),
            },
          ],
        } satisfies ReadResourceResult;
      }
    });
  }

  return server;
};

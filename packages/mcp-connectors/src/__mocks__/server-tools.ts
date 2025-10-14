import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export interface ToolHandler {
  handler: (args: Record<string, unknown>) => Promise<string>;
}

export type ExtractedTools = Record<string, ToolHandler | undefined>;

/**
 * Extract tools from an MCP Server instance for testing purposes.
 * This helper allows tests to call tool handlers directly by using the server's internal request handler.
 */
export function extractToolsFromServer(server: McpServer): ExtractedTools {
  const tools: Record<string, ToolHandler> = {};

  // Access the internal tools from the server
  const registeredTools = (
    server as unknown as {
      _registeredTools?: Record<
        string,
        {
          callback: (
            args: unknown
          ) => Promise<{ content: Array<{ type: string; text: string }> }>;
        }
      >;
    }
  )._registeredTools;

  if (!registeredTools) {
    throw new Error('Unable to access registered tools from McpServer');
  }

  // Create a handler for each tool that calls the tool callback directly
  for (const toolName of Object.keys(registeredTools)) {
    const tool = registeredTools[toolName];
    if (!tool) {
      continue;
    }

    tools[toolName] = {
      handler: async (args: Record<string, unknown>) => {
        // Call the tool callback directly
        const result = await tool.callback(args);

        // Extract the text content from the result
        if (result && typeof result === 'object' && 'content' in result) {
          const content = result.content;
          if (
            Array.isArray(content) &&
            content.length > 0 &&
            content[0] &&
            content[0].type === 'text'
          ) {
            return content[0].text;
          }
        }

        throw new Error('Unexpected tool response format');
      },
    };
  }

  return tools;
}

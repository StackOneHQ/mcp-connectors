import { Client } from '@modelcontextprotocol/sdk/client';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { ui } from './utils/ui';

export async function discoverTools(
  url: string,
  headers?: Record<string, string>
): Promise<string[]> {
  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: {
      headers: headers || {},
    },
    fetch,
  });

  const client = new Client(
    {
      name: 'mcp-test-discovery',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  try {
    await client.connect(transport);
    const tools = await client.listTools();
    await client.close();

    return tools.tools.map((tool) => tool.name);
  } catch (error) {
    ui.error(`Failed to discover tools: ${error}`);
    return [];
  }
}

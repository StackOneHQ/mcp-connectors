import { Client } from '@modelcontextprotocol/sdk/client';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

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
    console.error('Failed to discover tools:', error);
    return [];
  }
}

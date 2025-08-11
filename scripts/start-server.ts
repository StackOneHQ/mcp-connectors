import { parseArgs } from 'node:util';
import { StreamableHTTPTransport } from '@hono/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Hono } from 'hono';
import type { ConnectorContext, MCPConnectorConfig } from '../src/config-types/types.js';
import { allConnectors } from '../src/connectors/index.js';

const app = new Hono();

const getConnectorByKey = (connectorKey: string): MCPConnectorConfig | null => {
  const connector = allConnectors.find((c) => c.key === connectorKey);
  return connector || null;
};

const createRuntimeConnectorContext = (
  credentials: Record<string, unknown> = {},
  setup: Record<string, unknown> = {}
): ConnectorContext => {
  const dataStore = new Map<string, unknown>();
  const cacheStore = new Map<string, string>();

  return {
    getCredentials: async () => credentials,
    getSetup: async () => setup,
    getData: async <T = unknown>(key?: string): Promise<T | null> => {
      if (key === undefined) {
        return Object.fromEntries(dataStore) as T;
      }
      return (dataStore.get(key) as T) || null;
    },
    setData: async (
      keyOrData: string | Record<string, unknown>,
      value?: unknown
    ): Promise<void> => {
      if (typeof keyOrData === 'string') {
        dataStore.set(keyOrData, value);
      } else {
        for (const [k, v] of Object.entries(keyOrData)) {
          dataStore.set(k, v);
        }
      }
    },
    readCache: async (key: string): Promise<string | null> => {
      return cacheStore.get(key) || null;
    },
    writeCache: async (key: string, value: string): Promise<void> => {
      cacheStore.set(key, value);
    },
  };
};

const printUsage = () => {
  console.log('🚀 MCP Connector Server');
  console.log('');
  console.log('Usage: bun start --connector <connector-key> [options]');
  console.log('');
  console.log('Options:');
  console.log('  --connector    Connector key (required)');
  console.log('  --credentials  JSON string with connector credentials');
  console.log('  --setup        JSON string with connector setup configuration');
  console.log('  --port         Port to run server on (default: 3000)');
  console.log('  --help         Show this help message');
  console.log('');
  console.log(`Available connectors (${allConnectors.length}):`);
  const sortedConnectors = allConnectors.map((c) => c.key).sort();
  console.log(sortedConnectors.join(', '));
  console.log('');
  console.log('Examples:');
  console.log('  bun start --connector test');
  console.log('  bun start --connector asana --credentials \'{"apiKey":"sk-xxx"}\'');
  console.log(
    '  bun start --connector github --credentials \'{"token":"ghp_xxx"}\' --setup \'{"org":"myorg"}\''
  );
};

const startServer = async (): Promise<Hono> => {
  const { values } = parseArgs({
    args: Bun.argv,
    options: {
      connector: {
        type: 'string',
        short: 'c',
      },
      credentials: {
        type: 'string',
      },
      setup: {
        type: 'string',
      },
      port: {
        type: 'string',
        default: '3000',
      },
      help: {
        type: 'boolean',
        short: 'h',
      },
    },
    strict: true,
    allowPositionals: true,
  });

  if (values.help) {
    printUsage();
    process.exit(0);
  }

  const connectorKey = values.connector;

  if (!connectorKey) {
    console.error('❌ Connector key is required');
    console.log('');
    printUsage();
    process.exit(1);
  }

  const connectorConfig = getConnectorByKey(connectorKey);

  if (!connectorConfig) {
    console.error(`❌ Connector "${connectorKey}" not found`);
    console.log('');
    console.log(`Available connectors (${allConnectors.length}):`);
    console.log(
      allConnectors
        .map((c) => c.key)
        .sort()
        .join(', ')
    );
    process.exit(1);
  }

  let credentials = {};
  let setup = {};

  if (values.credentials) {
    try {
      credentials = JSON.parse(values.credentials);
    } catch (error) {
      console.error(
        '❌ Invalid credentials JSON:',
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  }

  if (values.setup) {
    try {
      setup = JSON.parse(values.setup);
    } catch (error) {
      console.error(
        '❌ Invalid setup JSON:',
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  }

  const context = createRuntimeConnectorContext(credentials, setup);

  const server = new McpServer({
    name: `${connectorConfig.name} MCP Server (disco.dev)`,
    version: connectorConfig.version,
  });

  for (const tool of Object.values(connectorConfig.tools)) {
    server.tool(tool.name, tool.description, tool.schema.shape, async (args: unknown) => {
      try {
        const result = await tool.handler(args, context);
        return {
          content: [{ type: 'text' as const, text: result }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
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
        };
      } catch (error) {
        return {
          contents: [
            {
              type: 'text' as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
              uri: uri.toString(),
            },
          ],
        };
      }
    });
  }

  const transport = new StreamableHTTPTransport();

  let isConnected = false;
  const connectedToServer = server.connect(transport).then(() => {
    isConnected = true;
  });

  app.all('/mcp', async (c) => {
    if (!isConnected) await connectedToServer;
    return transport.handleRequest(c);
  });

  const port = Number.parseInt(values.port || '3000', 10);

  console.log('🚀 Starting MCP Connector Server...');
  console.log(`📦 Connector: ${connectorConfig.name} (${connectorConfig.key})`);
  console.log(`🔧 Version: ${connectorConfig.version}`);
  console.log(`⚡ Tools: ${Object.keys(connectorConfig.tools).length}`);
  console.log(`📄 Resources: ${Object.keys(connectorConfig.resources).length}`);
  console.log(`🌐 Port: ${port}`);

  if (Object.keys(credentials).length > 0) {
    console.log(`🔐 Credentials: ${Object.keys(credentials).length} keys provided`);
  }

  if (Object.keys(setup).length > 0) {
    console.log(`⚙️  Setup: ${Object.keys(setup).length} config keys provided`);
  }

  if (connectorConfig.examplePrompt) {
    console.log(`💡 Example: ${connectorConfig.examplePrompt}`);
  }

  console.log('');
  console.log(`🔗 MCP endpoint: http://localhost:${port}/mcp`);
  console.log('✅ Server ready!');

  return app;
};

export default await startServer();

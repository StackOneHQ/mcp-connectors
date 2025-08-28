import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import { StreamableHTTPTransport } from '@hono/mcp';
import { serve } from '@hono/node-server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ConnectorContext, MCPConnectorConfig } from '@stackone/mcp-config-types';
import { Connectors } from '@stackone/mcp-connectors';
import { Hono } from 'hono';
import { logger } from 'hono/logger';

// Helper to format timestamps for logs
const getTimestamp = () => new Date().toISOString();

// Custom logger format
const customLogger = (
  message: string,
  level: 'info' | 'error' | 'debug' | 'warn' = 'info'
) => {
  const timestamp = getTimestamp();
  const prefix = {
    info: '📘',
    error: '❌',
    debug: '🔍',
    warn: '⚠️',
  }[level];
  console.log(`[${timestamp}] ${prefix} ${message}`);
};

const getConnectorByKey = (connectorKey: string): MCPConnectorConfig | null => {
  const connector = Connectors.find((c) => c.key === connectorKey) as MCPConnectorConfig;
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
  console.log(`Available connectors (${Connectors.length}):`);
  const sortedConnectors = Connectors.map((c) => c.key).sort();
  console.log(sortedConnectors.join(', '));
  console.log('');
  console.log('Examples:');
  console.log('  bun start --connector test');
  console.log('  bun start --connector asana --credentials \'{"apiKey":"sk-xxx"}\'');
  console.log(
    '  bun start --connector github --credentials \'{"token":"ghp_xxx"}\' --setup \'{"org":"myorg"}\''
  );
};

const startServer = async (): Promise<{ app: Hono; port: number }> => {
  const app = new Hono();

  // Add request logging middleware
  app.use(
    logger((str, ..._rest) => {
      customLogger(`Request: ${str}`, 'info');
    })
  );
  const { values } = parseArgs({
    args: process.argv.slice(2),
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
    console.log(`Available connectors (${Connectors.length}):`);
    console.log(
      Connectors.map((c) => c.key)
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
      const startTime = Date.now();
      customLogger(`Tool invoked: ${tool.name}`, 'info');
      customLogger(`Tool args: ${JSON.stringify(args, null, 2)}`, 'debug');

      try {
        const result = await tool.handler(args, context);
        const duration = Date.now() - startTime;
        customLogger(`Tool completed: ${tool.name} (${duration}ms)`, 'info');
        {
          let resultPreview: string;
          if (typeof result === 'string') {
            resultPreview = result.substring(0, 200) + (result.length > 200 ? '...' : '');
          } else if (result !== undefined && result !== null) {
            const strResult =
              typeof result === 'object' ? JSON.stringify(result) : String(result);
            resultPreview =
              strResult.substring(0, 200) + (strResult.length > 200 ? '...' : '');
          } else {
            resultPreview = String(result);
          }
          customLogger(`Tool result preview: ${resultPreview}`, 'debug');
        }

        return {
          content: [{ type: 'text' as const, text: String(result) }],
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        customLogger(`Tool failed: ${tool.name} (${duration}ms)`, 'error');
        customLogger(
          `Error details: ${error instanceof Error ? error.stack : String(error)}`,
          'error'
        );

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
      const startTime = Date.now();
      customLogger(`Resource accessed: ${resource.name}`, 'info');
      customLogger(`Resource URI: ${uri.toString()}`, 'debug');

      try {
        const result = await resource.handler(context);
        const duration = Date.now() - startTime;
        customLogger(`Resource fetched: ${resource.name} (${duration}ms)`, 'info');
        if (typeof result === 'string' || Array.isArray(result)) {
          customLogger(`Resource size: ${result.length} chars`, 'debug');
        } else {
          customLogger(`Resource type: ${typeof result}`, 'debug');
        }

        return {
          contents: [
            {
              type: 'text' as const,
              text: String(result),
              uri: uri.toString(),
            },
          ],
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        customLogger(`Resource failed: ${resource.name} (${duration}ms)`, 'error');
        customLogger(
          `Error details: ${error instanceof Error ? error.stack : String(error)}`,
          'error'
        );

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
  customLogger('Connecting MCP server to transport...', 'info');

  const connectedToServer = server
    .connect(transport)
    .then(() => {
      isConnected = true;
      customLogger('MCP server connected successfully', 'info');
    })
    .catch((error) => {
      customLogger(
        `Failed to connect MCP server: ${error instanceof Error ? error.message : String(error)}`,
        'error'
      );
      throw error;
    });

  app.all('/mcp', async (c) => {
    const requestId = randomUUID();
    customLogger(
      `MCP request received [${requestId}] - ${c.req.method} ${c.req.url}`,
      'info'
    );

    try {
      if (!isConnected) {
        customLogger(`Waiting for MCP connection [${requestId}]...`, 'debug');
        await connectedToServer;
      }

      customLogger(`Processing MCP request [${requestId}]`, 'debug');
      const response = await transport.handleRequest(c);
      customLogger(`MCP request completed [${requestId}]`, 'info');
      return response;
    } catch (error) {
      customLogger(
        `MCP request failed [${requestId}]: ${error instanceof Error ? error.message : String(error)}`,
        'error'
      );
      if (error instanceof Error) {
        customLogger(`Stack trace: ${error.stack}`, 'error');
      }
      throw error;
    }
  });

  const port = Number.parseInt(values.port || '3000', 10);

  customLogger('Starting MCP Connector Server...', 'info');
  customLogger(`Connector: ${connectorConfig.name} (${connectorConfig.key})`, 'info');
  customLogger(`Version: ${connectorConfig.version}`, 'info');
  customLogger(`Tools: ${Object.keys(connectorConfig.tools).length}`, 'info');
  customLogger(`Resources: ${Object.keys(connectorConfig.resources).length}`, 'info');
  customLogger(`Port: ${port}`, 'info');

  if (Object.keys(credentials).length > 0) {
    customLogger(`Credentials: ${Object.keys(credentials).length} keys provided`, 'info');
    customLogger(`Credential keys: ${Object.keys(credentials).join(', ')}`, 'debug');
  }

  if (Object.keys(setup).length > 0) {
    customLogger(`Setup: ${Object.keys(setup).length} config keys provided`, 'info');
    customLogger('Setup config detected (values redacted for security)', 'debug');
  }

  if (connectorConfig.examplePrompt) {
    customLogger(`Example: ${connectorConfig.examplePrompt}`, 'info');
  }

  customLogger(`MCP endpoint: http://localhost:${port}/mcp`, 'info');
  customLogger('Server ready and listening for requests!', 'info');

  return { app, port };
};

const { app, port } = await startServer();
serve({ fetch: app.fetch, port, hostname: 'localhost' });

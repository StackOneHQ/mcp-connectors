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
  console.log('🚀 MCP Connector Server (Fixed Version)');
  console.log('');
  console.log('Usage: bun start-fixed --connector <connector-key> [options]');
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
  console.log('  bun start-fixed --connector test');
  console.log('  bun start-fixed --connector asana --credentials \'{"apiKey":"sk-xxx"}\'');
  console.log(
    '  bun start-fixed --connector github --credentials \'{"token":"ghp_xxx"}\' --setup \'{"org":"myorg"}\''
  );
};

const startServer = async (): Promise<{ app: Hono; port: number }> => {
  const app = new Hono();

  // Add request logging middleware
  app.use(
    logger((str, ..._rest) => {
      customLogger(str, 'debug');
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
        short: 'k',
      },
      setup: {
        type: 'string',
        short: 's',
      },
      port: {
        type: 'string',
        short: 'p',
      },
      help: {
        type: 'boolean',
        short: 'h',
      },
    },
  });

  if (values.help) {
    printUsage();
    process.exit(0);
  }

  if (!values.connector) {
    console.error('❌ Error: --connector is required');
    printUsage();
    process.exit(1);
  }

  const connectorKey = values.connector;
  const connectorConfig = getConnectorByKey(connectorKey);

  if (!connectorConfig) {
    console.error(`❌ Error: Connector '${connectorKey}' not found`);
    console.log('Available connectors:');
    Connectors.forEach((c) => console.log(`  - ${c.key}: ${c.name}`));
    process.exit(1);
  }

  let credentials: Record<string, unknown> = {};
  let setup: Record<string, unknown> = {};

  if (values.credentials) {
    try {
      credentials = JSON.parse(values.credentials);
    } catch (error) {
      console.error('❌ Error: Invalid credentials JSON');
      process.exit(1);
    }
  }

  if (values.setup) {
    try {
      setup = JSON.parse(values.setup);
    } catch (error) {
      console.error('❌ Error: Invalid setup JSON');
      process.exit(1);
    }
  }

  const context = createRuntimeConnectorContext(credentials, setup);
  const server = new McpServer({
    name: connectorConfig.name,
    version: connectorConfig.version,
  });

  // Register tools
  for (const [toolName, toolConfig] of Object.entries(connectorConfig.tools)) {
    server.setRequestHandler(toolName, async (params) => {
      const startTime = Date.now();
      customLogger(`Tool called: ${toolName}`, 'info');

      try {
        const result = await toolConfig.handler(context, params);
        const duration = Date.now() - startTime;
        customLogger(`Tool completed: ${toolName} (${duration}ms)`, 'info');
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        customLogger(`Tool failed: ${toolName} (${duration}ms)`, 'error');
        customLogger(
          `Error details: ${error instanceof Error ? error.stack : String(error)}`,
          'error'
        );
        throw error;
      }
    });
  }

  // Register resources
  for (const [resourceName, resourceConfig] of Object.entries(connectorConfig.resources)) {
    server.setResourceHandler(resourceName, async (uri) => {
      const startTime = Date.now();
      customLogger(`Resource requested: ${resourceName}`, 'info');

      try {
        const result = await resourceConfig.handler(context, uri);
        const duration = Date.now() - startTime;
        customLogger(`Resource completed: ${resourceName} (${duration}ms)`, 'info');
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        customLogger(`Resource failed: ${resourceName} (${duration}ms)`, 'error');
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

  // Create a custom transport that handles the Response.json issue
  class FixedStreamableHTTPTransport extends StreamableHTTPTransport {
    async handleRequest(c: any) {
      try {
        // Get the request body
        const body = await c.req.json();
        
        // Create a proper response object
        const response = await this.handlePostRequest(c.req, body);
        
        // Return the response in the correct format for Hono
        return new Response(JSON.stringify(response), {
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        customLogger(`Transport error: ${error}`, 'error');
        return new Response(
          JSON.stringify({ error: 'Internal server error' }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }
  }

  const transport = new FixedStreamableHTTPTransport();

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
      
      // Return a proper error response
      return new Response(
        JSON.stringify({ 
          error: 'Internal server error',
          message: error instanceof Error ? error.message : String(error)
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  });

  const port = Number.parseInt(values.port || '3000', 10);

  customLogger('Starting MCP Connector Server (Fixed Version)...', 'info');
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

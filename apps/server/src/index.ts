import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { ConnectorContext, MCPConnectorConfig } from '@stackone/mcp-config-types';
import { Connectors as allConnectors } from '@stackone/mcp-connectors';
import express, { type Request, type Response } from 'express';
import winston from 'winston';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configure winston logger for file output
const fileLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    // Write all logs to server.log
    new winston.transports.File({
      filename: path.join(logsDir, 'server.log'),
      options: { flags: 'a' }, // Append mode
    }),
    // Also log to console for development
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});

// Helper to format timestamps for logs
const getTimestamp = () => new Date().toISOString();

// Custom logger that writes to both console and file
const customLogger = (
  message: string,
  level: 'info' | 'error' | 'debug' | 'warn' = 'info',
  meta?: Record<string, unknown>
) => {
  const timestamp = getTimestamp();
  const prefix = {
    info: '📘',
    error: '❌',
    debug: '🔍',
    warn: '⚠️',
  }[level];

  // Console output for immediate feedback
  console.log(`[${timestamp}] ${prefix} ${message}`);

  // File output for agent to read
  fileLogger.log(level, message, { ...meta, timestamp });
};

const getConnectorByKey = (connectorKey: string): MCPConnectorConfig | null => {
  const connector = allConnectors.find(
    (c) => c.key === connectorKey
  ) as MCPConnectorConfig;
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
  console.log('Usage: npm start -- --connector <connector-key> [options]');
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
  console.log('  npm start -- --connector test');
  console.log('  npm start -- --connector asana --credentials \'{"apiKey":"sk-xxx"}\'');
  console.log(
    '  npm start -- --connector github --credentials \'{"token":"ghp_xxx"}\' --setup \'{"org":"myorg"}\''
  );
};

export const startServer = async (): Promise<{
  app: express.Application;
  port: number;
  url: string;
}> => {
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

  // Function to create a new MCP server instance with configured tools/resources
  const getServer = (): McpServer => {
    const server = new McpServer({
      name: `${connectorConfig.name} MCP Server (disco.dev)`,
      version: connectorConfig.version,
    });

    // Register tools
    for (const tool of Object.values(connectorConfig.tools)) {
      server.tool(
        tool.name,
        tool.description,
        // @ts-expect-error - TODO: fix this
        tool.schema.shape,
        async (args: unknown) => {
          const startTime = Date.now();
          customLogger(`Tool invoked: ${tool.name}`, 'info', { tool: tool.name, args });

          try {
            const result = await tool.handler(args, context);
            const duration = Date.now() - startTime;
            customLogger(`Tool completed: ${tool.name} (${duration}ms)`, 'info', {
              tool: tool.name,
              duration,
            });

            return {
              content: [{ type: 'text' as const, text: String(result) }],
            };
          } catch (error) {
            const duration = Date.now() - startTime;
            customLogger(`Tool failed: ${tool.name} (${duration}ms)`, 'error', {
              tool: tool.name,
              duration,
              error: error instanceof Error ? error.message : String(error),
            });

            return {
              content: [
                {
                  type: 'text' as const,
                  text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                },
              ],
            };
          }
        }
      );
    }

    // Register resources
    for (const resource of Object.values(connectorConfig.resources)) {
      server.resource(resource.name, resource.uri, async (uri: URL) => {
        const startTime = Date.now();
        customLogger(`Resource accessed: ${resource.name}`, 'info', {
          resource: resource.name,
          uri: uri.toString(),
        });

        try {
          const result = await resource.handler(context);
          const duration = Date.now() - startTime;
          customLogger(`Resource fetched: ${resource.name} (${duration}ms)`, 'info', {
            resource: resource.name,
            duration,
          });

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
          customLogger(`Resource failed: ${resource.name} (${duration}ms)`, 'error', {
            resource: resource.name,
            duration,
            error: error instanceof Error ? error.message : String(error),
          });

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

    return server;
  };

  // Create Express app
  const app = express();
  app.use(express.json());

  // Add logging middleware
  app.use((req, _res, next) => {
    customLogger(`Request: ${req.method} ${req.url}`, 'info', {
      method: req.method,
      url: req.url,
      headers: req.headers,
    });
    next();
  });

  // Handle POST requests in stateless mode
  app.post('/mcp', async (req: Request, res: Response) => {
    const requestId = randomUUID();
    customLogger(`MCP request received [${requestId}]`, 'info', {
      requestId,
      method: req.method,
      url: req.url,
    });

    // In stateless mode, create a new instance of transport and server for each request
    // to ensure complete isolation. A single instance would cause request ID collisions
    // when multiple clients connect concurrently.
    try {
      const server = getServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // Stateless mode - no sessions
      });

      res.on('close', () => {
        customLogger(`Request closed [${requestId}]`, 'debug');
        transport.close();
        server.close();
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);

      customLogger(`MCP request completed [${requestId}]`, 'info', { requestId });
    } catch (error) {
      customLogger(
        `MCP request failed [${requestId}]: ${error instanceof Error ? error.message : String(error)}`,
        'error',
        { requestId, error: error instanceof Error ? error.message : String(error) }
      );

      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
            data: error instanceof Error ? error.message : String(error),
          },
          id: null,
        });
      }
    }
  });

  // SSE notifications not supported in stateless mode
  app.get('/mcp', async (_req: Request, res: Response) => {
    customLogger('GET request not supported in stateless mode', 'warn');
    res.status(405).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Method not allowed in stateless mode',
      },
      id: null,
    });
  });

  // Session termination not needed in stateless mode
  app.delete('/mcp', async (_req: Request, res: Response) => {
    customLogger('DELETE request not supported in stateless mode', 'warn');
    res.status(405).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Method not allowed in stateless mode',
      },
      id: null,
    });
  });

  const port = Number.parseInt(values.port || '3000', 10);
  const url = `http://localhost:${port}/mcp`;

  customLogger('Starting MCP Connector Server (Stateless Mode)...', 'info');
  customLogger(`Connector: ${connectorConfig.name} (${connectorConfig.key})`, 'info');
  customLogger(`Version: ${connectorConfig.version}`, 'info');
  customLogger(`Tools: ${Object.keys(connectorConfig.tools).length}`, 'info');
  customLogger(`Resources: ${Object.keys(connectorConfig.resources).length}`, 'info');
  customLogger(`Port: ${port}`, 'info');
  customLogger(`Log file: ${path.join(logsDir, 'server.log')}`, 'info');

  if (Object.keys(credentials).length > 0) {
    customLogger(`Credentials: ${Object.keys(credentials).length} keys provided`, 'info');
  }

  if (Object.keys(setup).length > 0) {
    customLogger(`Setup: ${Object.keys(setup).length} config keys provided`, 'info');
  }

  if (connectorConfig.examplePrompt) {
    customLogger(`Example: ${connectorConfig.examplePrompt}`, 'info');
  }

  customLogger(`MCP endpoint: ${url}`, 'info');
  customLogger('Mode: Stateless (no session management)', 'info');

  return { app, port, url };
};

// Only start the server if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  const { app, port } = await startServer();
  app.listen(port, () => {
    customLogger('Server ready and listening for requests!', 'info');
  });
}

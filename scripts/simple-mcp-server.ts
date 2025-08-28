import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
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
  console.log('🚀 Simple MCP Connector Server');
  console.log('');
  console.log('Usage: bun simple-server --connector <connector-key> [options]');
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
  console.log('  bun simple-server --connector test');
  console.log('  bun simple-server --connector asana --credentials \'{"apiKey":"sk-xxx"}\'');
  console.log(
    '  bun simple-server --connector github --credentials \'{"token":"ghp_xxx"}\' --setup \'{"org":"myorg"}\''
  );
};

// Simple MCP transport implementation
class SimpleMCPTransport {
  private server: McpServer;
  private tools: Map<string, any> = new Map();
  private resources: Map<string, any> = new Map();

  constructor(server: McpServer) {
    this.server = server;
  }

  async handleRequest(request: Request): Promise<Response> {
    try {
      const body = await request.json();
      const { method, params } = body;

      customLogger(`Handling ${method} request`, 'debug');

      switch (method) {
        case 'initialize':
          return this.handleInitialize(params);
        case 'tools/list':
          return this.handleListTools();
        case 'tools/call':
          return this.handleCallTool(params);
        case 'resources/list':
          return this.handleListResources();
        case 'resources/read':
          return this.handleReadResource(params);
        default:
          return new Response(
            JSON.stringify({ error: `Unknown method: ${method}` }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
      }
    } catch (error) {
      customLogger(`Request handling error: ${error}`, 'error');
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  private async handleInitialize(params: any): Promise<Response> {
    const result = {
      jsonrpc: '2.0',
      id: params.id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          resources: {},
        },
        serverInfo: {
          name: this.server.name,
          version: this.server.version,
        },
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleListTools(): Promise<Response> {
    const tools = Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));

    const result = {
      jsonrpc: '2.0',
      id: 1,
      result: { tools },
    };

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleCallTool(params: any): Promise<Response> {
    const { name, arguments: args } = params;
    const tool = this.tools.get(name);

    if (!tool) {
      return new Response(
        JSON.stringify({ error: `Tool not found: ${name}` }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      const result = await tool.handler(args);
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: params.id,
          result: { content: [{ type: 'text', text: JSON.stringify(result) }] },
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: params.id,
          error: { message: error instanceof Error ? error.message : String(error) },
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  private async handleListResources(): Promise<Response> {
    const resources = Array.from(this.resources.values()).map(resource => ({
      uri: resource.uri,
      name: resource.name,
      description: resource.description,
      mimeType: resource.mimeType,
    }));

    const result = {
      jsonrpc: '2.0',
      id: 1,
      result: { resources },
    };

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleReadResource(params: any): Promise<Response> {
    const { uri } = params;
    const resource = this.resources.get(uri);

    if (!resource) {
      return new Response(
        JSON.stringify({ error: `Resource not found: ${uri}` }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      const result = await resource.handler(uri);
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: params.id,
          result,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: params.id,
          error: { message: error instanceof Error ? error.message : String(error) },
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  registerTool(name: string, tool: any) {
    this.tools.set(name, tool);
  }

  registerResource(uri: string, resource: any) {
    this.resources.set(uri, resource);
  }
}

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

  const transport = new SimpleMCPTransport(server);

  // Register tools
  for (const [toolName, toolConfig] of Object.entries(connectorConfig.tools)) {
    transport.registerTool(toolName, {
      name: toolName,
      description: toolConfig.description,
      inputSchema: toolConfig.inputSchema,
      handler: async (params: any) => {
        const startTime = Date.now();
        customLogger(`Tool called: ${toolName}`, 'info');

        try {
          // Create a proper context object with all required methods
          const toolContext = {
            getCredentials: context.getCredentials,
            getSetup: context.getSetup,
            getData: context.getData,
            setData: context.setData,
            readCache: context.readCache,
            writeCache: context.writeCache,
          };
          
          const result = await toolConfig.handler(toolContext, params);
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
      },
    });
  }

  // Register resources
  for (const [resourceName, resourceConfig] of Object.entries(connectorConfig.resources)) {
    transport.registerResource(`mcp://${connectorConfig.name}/${resourceName}`, {
      uri: `mcp://${connectorConfig.name}/${resourceName}`,
      name: resourceName,
      description: resourceConfig.description,
      mimeType: resourceConfig.mimeType,
      handler: async (uri: string) => {
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
                uri: uri,
              },
            ],
          };
        }
      },
    });
  }

  app.all('/mcp', async (c) => {
    const requestId = randomUUID();
    customLogger(
      `MCP request received [${requestId}] - ${c.req.method} ${c.req.url}`,
      'info'
    );

    try {
      customLogger(`Processing MCP request [${requestId}]`, 'debug');
      const response = await transport.handleRequest(c.req.raw);
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

  customLogger('Starting Simple MCP Connector Server...', 'info');
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

#!/usr/bin/env node
import { serve, type Server } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Server as HttpServer } from 'http';

// Type definitions
interface ConnectorDefinition {
  key: string;
  name: string;
  version: string;
  category: 'communication' | 'developer' | 'ai' | 'business' | 'data';
  tools: number;
  resources: number;
  requiresOAuth: boolean;
  credentials: Record<string, {
    type: string;
    required: boolean;
    description?: string;
  }>;
  setup: Record<string, {
    type: string;
    required: boolean;
    description?: string;
  }>;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  quota: {
    used: number;
    limit: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface ConnectorInstance {
  id: string;
  workspaceId: string;
  connectorKey: string;
  status: 'active' | 'error' | 'disabled';
  credentials: Record<string, unknown>;
  setup: Record<string, unknown>;
  enabledAt: string;
  updatedAt?: string;
  lastHealthCheck: string | null;
}

interface HealthStatus {
  instanceId: string;
  status: 'healthy' | 'error';
  latencyMs: number;
  lastError: string | null;
  checkedAt: string;
}

interface ConnectionTestResult {
  instanceId: string;
  success: boolean;
  message: string;
  testedAt: string;
}

interface UsageMetrics {
  period: {
    start: string;
    end: string;
  };
  totalCalls: number;
  byConnector: Array<{
    key: string;
    calls: number;
    errors: number;
  }>;
  byTool: Array<{
    connector: string;
    tool: string;
    calls: number;
  }>;
  byDay?: Array<{
    date: string;
    calls: number;
  }>;
}

// Mock data store
const mockConnectors: ConnectorDefinition[] = [
  { 
    key: 'github', 
    name: 'GitHub', 
    version: '1.0.0',
    category: 'developer', 
    tools: 10, 
    resources: 0,
    requiresOAuth: false,
    credentials: {
      token: { type: 'string', required: true, description: 'GitHub Personal Access Token' }
    },
    setup: {}
  },
  { 
    key: 'slack', 
    name: 'Slack', 
    version: '1.0.0',
    category: 'communication', 
    tools: 8, 
    resources: 0,
    requiresOAuth: false,
    credentials: {
      botToken: { type: 'string', required: true },
      teamId: { type: 'string', required: true }
    },
    setup: {
      channelIds: { type: 'string', required: false }
    }
  },
  { 
    key: 'notion', 
    name: 'Notion', 
    version: '1.0.0',
    category: 'business', 
    tools: 9, 
    resources: 0,
    requiresOAuth: false,
    credentials: {
      token: { type: 'string', required: true }
    },
    setup: {}
  },
  {
    key: 'linear',
    name: 'Linear',
    version: '1.0.0',
    category: 'developer',
    tools: 8,
    resources: 0,
    requiresOAuth: false,
    credentials: {
      apiKey: { type: 'string', required: true }
    },
    setup: {}
  },
  {
    key: 'asana',
    name: 'Asana',
    version: '1.0.0',
    category: 'business',
    tools: 6,
    resources: 0,
    requiresOAuth: false,
    credentials: {
      token: { type: 'string', required: true }
    },
    setup: {
      workspaceId: { type: 'string', required: false }
    }
  }
];

const mockWorkspaces: Workspace[] = [
  {
    id: 'ws-test-123',
    name: 'Test Workspace',
    slug: 'test-workspace',
    plan: 'free',
    quota: { used: 2, limit: 5 },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z'
  },
  {
    id: 'ws-prod-456',
    name: 'Production Workspace',
    slug: 'production',
    plan: 'pro',
    quota: { used: 5, limit: 20 },
    createdAt: '2024-12-01T00:00:00Z',
    updatedAt: '2025-01-20T00:00:00Z'
  }
];

// Runtime state
const instances = new Map<string, ConnectorInstance>();
let instanceIdCounter = 1000;

// Metrics tracking
const metrics = {
  totalCalls: 0,
  byEndpoint: new Map<string, number>(),
  byConnector: new Map<string, { calls: number; errors: number }>(),
  byTool: new Map<string, number>(),
  byDay: new Map<string, number>()
};

// Helper functions
function validateAuth(authorization: string | undefined): boolean {
  if (!authorization) return false;
  return authorization.startsWith('Bearer disco_sk_');
}

function generateInstanceId(): string {
  return `inst-${++instanceIdCounter}`;
}

function trackMetrics(endpoint: string, connector?: string, error = false) {
  metrics.totalCalls++;
  metrics.byEndpoint.set(endpoint, (metrics.byEndpoint.get(endpoint) || 0) + 1);
  
  if (connector) {
    const current = metrics.byConnector.get(connector) || { calls: 0, errors: 0 };
    current.calls++;
    if (error) current.errors++;
    metrics.byConnector.set(connector, current);
  }
  
  // Track by day
  const today = new Date().toISOString().split('T')[0];
  metrics.byDay.set(today, (metrics.byDay.get(today) || 0) + 1);
}

// Create Hono app factory
function createApp(): Hono {
  const app = new Hono();

  // Middleware
  app.use('*', cors());
  app.use('*', logger());

  // Auth middleware for /v1 routes
  app.use('/v1/*', async (c, next) => {
    if (!validateAuth(c.req.header('Authorization'))) {
      trackMetrics(c.req.path);
      return c.json({ error: 'Invalid API key' }, 401);
    }
    await next();
  });

  // Routes

  // GET /v1/connectors - List available connectors
  app.get('/v1/connectors', (c) => {
    trackMetrics('/v1/connectors');
    
    const query = c.req.query('query');
    const category = c.req.query('category');
    const limit = parseInt(c.req.query('limit') || '20', 10);
    
    let results = [...mockConnectors];
    
    if (category) {
      results = results.filter(conn => conn.category === category);
    }
    
    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(conn => 
        conn.name.toLowerCase().includes(lowerQuery) ||
        conn.key.toLowerCase().includes(lowerQuery)
      );
    }
    
    results = results.slice(0, Math.min(limit, 100));
    
    return c.json(results);
  });

  // GET /v1/connectors/:key - Get connector details
  app.get('/v1/connectors/:key', (c) => {
    const key = c.req.param('key');
    trackMetrics('/v1/connectors/:key', key);
    
    const connector = mockConnectors.find(conn => conn.key === key);
    if (!connector) {
      return c.json({ error: 'Connector not found' }, 404);
    }
    
    return c.json(connector);
  });

  // GET /v1/workspaces - List workspaces
  app.get('/v1/workspaces', (c) => {
    trackMetrics('/v1/workspaces');
    return c.json(mockWorkspaces);
  });

  // GET /v1/workspaces/:id - Get workspace details
  app.get('/v1/workspaces/:id', (c) => {
    const id = c.req.param('id');
    trackMetrics('/v1/workspaces/:id');
    
    const workspace = mockWorkspaces.find(ws => ws.id === id);
    if (!workspace) {
      return c.json({ error: 'Workspace not found' }, 404);
    }
    
    return c.json(workspace);
  });

  // GET /v1/workspaces/:id/instances - List enabled connector instances
  app.get('/v1/workspaces/:id/instances', (c) => {
    const workspaceId = c.req.param('id');
    trackMetrics('/v1/workspaces/:id/instances');
    
    const workspace = mockWorkspaces.find(ws => ws.id === workspaceId);
    if (!workspace) {
      return c.json({ error: 'Workspace not found' }, 404);
    }
    
    const workspaceInstances = Array.from(instances.values())
      .filter(inst => inst.workspaceId === workspaceId);
    
    return c.json(workspaceInstances);
  });

  // POST /v1/workspaces/:id/instances - Enable connector
  app.post('/v1/workspaces/:id/instances', async (c) => {
    const workspaceId = c.req.param('id');
    trackMetrics('/v1/workspaces/:id/instances');
    
    const workspace = mockWorkspaces.find(ws => ws.id === workspaceId);
    if (!workspace) {
      return c.json({ error: 'Workspace not found' }, 404);
    }
    
    const body = await c.req.json();
    const { connectorKey, credentials, setup, validateOnly } = body;
    
    const connector = mockConnectors.find(conn => conn.key === connectorKey);
    if (!connector) {
      trackMetrics('/v1/workspaces/:id/instances', connectorKey, true);
      return c.json({ error: 'Connector not found' }, 404);
    }
    
    // Check quota
    const currentInstances = Array.from(instances.values())
      .filter(inst => inst.workspaceId === workspaceId);
    
    if (currentInstances.length >= workspace.quota.limit) {
      trackMetrics('/v1/workspaces/:id/instances', connectorKey, true);
      return c.json({ error: 'Workspace quota exceeded' }, 400);
    }
    
    // Validate credentials (simplified)
    const requiredCreds = Object.entries(connector.credentials)
      .filter(([_, spec]) => spec.required);
    
    for (const [key] of requiredCreds) {
      if (!credentials || !credentials[key]) {
        trackMetrics('/v1/workspaces/:id/instances', connectorKey, true);
        return c.json({ 
          error: 'Validation error',
          details: `Missing required credential: ${key}`
        }, 400);
      }
    }
    
    if (validateOnly) {
      return c.json({ valid: true, message: 'Credentials validated successfully' });
    }
    
    // Create instance
    const instance: ConnectorInstance = {
      id: generateInstanceId(),
      workspaceId,
      connectorKey,
      status: 'active',
      credentials: { ...credentials }, // In real API, these would be encrypted
      setup: setup || {},
      enabledAt: new Date().toISOString(),
      lastHealthCheck: null
    };
    
    instances.set(instance.id, instance);
    workspace.quota.used++;
    
    trackMetrics('/v1/workspaces/:id/instances', connectorKey);
    
    return c.json(instance, 201);
  });

  // PATCH /v1/instances/:id - Update instance
  app.patch('/v1/instances/:id', async (c) => {
    const instanceId = c.req.param('id');
    trackMetrics('/v1/instances/:id');
    
    const instance = instances.get(instanceId);
    if (!instance) {
      return c.json({ error: 'Instance not found' }, 404);
    }
    
    const body = await c.req.json();
    const { credentials, setup } = body;
    
    if (credentials) {
      instance.credentials = { ...instance.credentials, ...credentials };
    }
    
    if (setup) {
      instance.setup = { ...instance.setup, ...setup };
    }
    
    instance.updatedAt = new Date().toISOString();
    
    trackMetrics('/v1/instances/:id', instance.connectorKey);
    
    return c.json(instance);
  });

  // DELETE /v1/instances/:id - Disable connector
  app.delete('/v1/instances/:id', (c) => {
    const instanceId = c.req.param('id');
    trackMetrics('/v1/instances/:id');
    
    const instance = instances.get(instanceId);
    if (!instance) {
      return c.json({ error: 'Instance not found' }, 404);
    }
    
    // Update workspace quota
    const workspace = mockWorkspaces.find(ws => ws.id === instance.workspaceId);
    if (workspace) {
      workspace.quota.used = Math.max(0, workspace.quota.used - 1);
    }
    
    instances.delete(instanceId);
    
    trackMetrics('/v1/instances/:id', instance.connectorKey);
    
    return c.json({ message: 'Instance disabled successfully' });
  });

  // GET /v1/instances/:id/health - Check instance health
  app.get('/v1/instances/:id/health', (c) => {
    const instanceId = c.req.param('id');
    trackMetrics('/v1/instances/:id/health');
    
    const instance = instances.get(instanceId);
    if (!instance) {
      return c.json({ error: 'Instance not found' }, 404);
    }
    
    // Simulate health check
    const health: HealthStatus = {
      instanceId,
      status: Math.random() > 0.1 ? 'healthy' : 'error',
      latencyMs: Math.floor(Math.random() * 300) + 50,
      lastError: Math.random() > 0.9 ? 'Connection timeout' : null,
      checkedAt: new Date().toISOString()
    };
    
    instance.lastHealthCheck = health.checkedAt;
    
    trackMetrics('/v1/instances/:id/health', instance.connectorKey);
    
    return c.json(health);
  });

  // POST /v1/instances/:id/test - Test connection
  app.post('/v1/instances/:id/test', async (c) => {
    const instanceId = c.req.param('id');
    trackMetrics('/v1/instances/:id/test');
    
    const instance = instances.get(instanceId);
    if (!instance) {
      return c.json({ error: 'Instance not found' }, 404);
    }
    
    // Simulate connection test
    const success = Math.random() > 0.2;
    
    const result: ConnectionTestResult = {
      instanceId,
      success,
      message: success ? 'Connection successful' : 'Connection failed: Invalid credentials',
      testedAt: new Date().toISOString()
    };
    
    trackMetrics('/v1/instances/:id/test', instance.connectorKey, !success);
    
    return c.json(result);
  });

  // GET /v1/analytics/usage - Get usage metrics
  app.get('/v1/analytics/usage', (c) => {
    trackMetrics('/v1/analytics/usage');
    
    const workspaceId = c.req.query('workspaceId');
    const startDate = c.req.query('startDate') || '2025-01-01T00:00:00Z';
    const endDate = c.req.query('endDate') || new Date().toISOString();
    const groupBy = c.req.query('groupBy') || 'connector';
    
    // Filter instances by workspace if specified
    let relevantInstances = Array.from(instances.values());
    if (workspaceId) {
      relevantInstances = relevantInstances.filter(inst => inst.workspaceId === workspaceId);
    }
    
    // Build response based on groupBy parameter
    const response: UsageMetrics = {
      period: {
        start: startDate,
        end: endDate
      },
      totalCalls: metrics.totalCalls,
      byConnector: Array.from(metrics.byConnector.entries()).map(([key, data]) => ({
        key,
        calls: data.calls,
        errors: data.errors
      })),
      byTool: [] // Would require more detailed tracking in real implementation
    };
    
    // Add groupBy specific data
    if (groupBy === 'day') {
      response.byDay = Array.from(metrics.byDay.entries()).map(([date, calls]) => ({
        date,
        calls
      }));
    } else if (groupBy === 'tool') {
      // In a real implementation, we'd track tool-level metrics
      response.byTool = [
        { connector: 'github', tool: 'github_list_issues', calls: 45 },
        { connector: 'slack', tool: 'slack_post_message', calls: 32 }
      ];
    }
    
    return c.json(response);
  });

  // Health check endpoint
  app.get('/health', (c) => {
    return c.json({ 
      status: 'healthy', 
      uptime: process.uptime(),
      instances: instances.size,
      metrics: {
        totalCalls: metrics.totalCalls
      }
    });
  });

  return app;
}

// Export programmatic server start function
export async function startMockDiscoServer(port = 4000): Promise<{ server: HttpServer; close: () => Promise<void> }> {
  const app = createApp();
  
  console.log('🚀 Mock disco.dev API Server');
  console.log(`📡 Starting on port ${port}`);
  console.log(`🔗 Base URL: http://localhost:${port}/v1`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`🔑 Test API key: disco_sk_test`);
  
  const server = serve({ 
    fetch: app.fetch, 
    port,
    hostname: 'localhost'
  });
  
  // Return server handle with close method for teardown
  return {
    server,
    close: () => new Promise((resolve) => {
      server.close(() => {
        console.log('🛑 Mock server stopped');
        resolve();
      });
    })
  };
}

// CLI entrypoint guard - only start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = parseInt(process.env.PORT || '4000', 10);
  
  startMockDiscoServer(port).then(({ server }) => {
    console.log('');
    console.log('Available endpoints:');
    console.log('  GET  /v1/connectors');
    console.log('  GET  /v1/connectors/:key');
    console.log('  GET  /v1/workspaces');
    console.log('  GET  /v1/workspaces/:id');
    console.log('  GET  /v1/workspaces/:id/instances');
    console.log('  POST /v1/workspaces/:id/instances');
    console.log('  PATCH /v1/instances/:id');
    console.log('  DELETE /v1/instances/:id');
    console.log('  GET  /v1/instances/:id/health');
    console.log('  POST /v1/instances/:id/test');
    console.log('  GET  /v1/analytics/usage');
    console.log('');
    console.log('Press Ctrl+C to stop the server');
  });
}

// Export types for use in tests
export type {
  ConnectorDefinition,
  Workspace,
  ConnectorInstance,
  HealthStatus,
  ConnectionTestResult,
  UsageMetrics
};
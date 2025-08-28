import { describe, expect, it, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { createMockConnectorContext } from '../__mocks__/context';
import { DiscoSquaredConnectorConfig } from './discosquared';

// Mock responses
const mockConnectorsList = [
  {
    key: 'github',
    name: 'GitHub',
    version: '1.0.0',
    category: 'developer',
    tools: 10,
    resources: 0,
    requiresOAuth: false,
  },
  {
    key: 'slack',
    name: 'Slack',
    version: '1.0.0',
    category: 'communication',
    tools: 8,
    resources: 0,
    requiresOAuth: false,
  },
  {
    key: 'notion',
    name: 'Notion',
    version: '1.0.0',
    category: 'business',
    tools: 9,
    resources: 0,
    requiresOAuth: false,
  },
];

const mockWorkspaces = [
  {
    id: 'ws-test-123',
    name: 'Test Workspace',
    plan: 'free',
    quota: { used: 2, limit: 5 },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
  },
  {
    id: 'ws-prod-456',
    name: 'Production Workspace',
    plan: 'pro',
    quota: { used: 5, limit: 20 },
    createdAt: '2024-12-01T00:00:00Z',
    updatedAt: '2025-01-20T00:00:00Z',
  },
];

const mockInstance = {
  id: 'inst-1001',
  workspaceId: 'ws-test-123',
  connectorKey: 'github',
  status: 'active',
  credentials: { token: 'encrypted' },
  setup: {},
  enabledAt: '2025-01-20T12:00:00Z',
  lastHealthCheck: null,
};

const mockHealthStatus = {
  instanceId: 'inst-1001',
  status: 'healthy',
  latencyMs: 145,
  lastError: null,
  checkedAt: '2025-01-20T12:00:00Z',
};

const mockUsageMetrics = {
  period: {
    start: '2025-01-01T00:00:00Z',
    end: '2025-01-31T23:59:59Z',
  },
  totalCalls: 1234,
  byConnector: [
    {
      key: 'github',
      calls: 456,
      errors: 2,
    },
  ],
  byTool: [],
};

// Setup MSW server
const server = setupServer(
  // Connectors endpoints
  http.get('http://localhost:4000/v1/connectors', ({ request }) => {
    const url = new URL(request.url);
    const apiKey = request.headers.get('authorization');
    
    if (!apiKey || !apiKey.startsWith('Bearer disco_sk_')) {
      return HttpResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }
    
    const category = url.searchParams.get('category');
    const query = url.searchParams.get('query');
    
    let results = [...mockConnectorsList];
    
    if (category) {
      results = results.filter(c => c.category === category);
    }
    
    if (query) {
      results = results.filter(c => 
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.key.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    return HttpResponse.json(results);
  }),
  
  http.get('http://localhost:4000/v1/connectors/:key', ({ params, request }) => {
    const apiKey = request.headers.get('authorization');
    
    if (!apiKey || !apiKey.startsWith('Bearer disco_sk_')) {
      return HttpResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }
    
    const connector = mockConnectorsList.find(c => c.key === params.key);
    
    if (!connector) {
      return HttpResponse.json({ error: 'Connector not found' }, { status: 404 });
    }
    
    return HttpResponse.json(connector);
  }),
  
  // Workspaces endpoints
  http.get('http://localhost:4000/v1/workspaces', ({ request }) => {
    const apiKey = request.headers.get('authorization');
    
    if (!apiKey || !apiKey.startsWith('Bearer disco_sk_')) {
      return HttpResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }
    
    return HttpResponse.json(mockWorkspaces);
  }),
  
  http.get('http://localhost:4000/v1/workspaces/:id', ({ params, request }) => {
    const apiKey = request.headers.get('authorization');
    
    if (!apiKey || !apiKey.startsWith('Bearer disco_sk_')) {
      return HttpResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }
    
    const workspace = mockWorkspaces.find(w => w.id === params.id);
    
    if (!workspace) {
      return HttpResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }
    
    return HttpResponse.json(workspace);
  }),
  
  http.get('http://localhost:4000/v1/workspaces/:id/instances', ({ params, request }) => {
    const apiKey = request.headers.get('authorization');
    
    if (!apiKey || !apiKey.startsWith('Bearer disco_sk_')) {
      return HttpResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }
    
    const workspace = mockWorkspaces.find(w => w.id === params.id);
    
    if (!workspace) {
      return HttpResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }
    
    return HttpResponse.json([mockInstance]);
  }),
  
  // Enable connector
  http.post('http://localhost:4000/v1/workspaces/:id/instances', async ({ params, request }) => {
    const apiKey = request.headers.get('authorization');
    
    if (!apiKey || !apiKey.startsWith('Bearer disco_sk_')) {
      return HttpResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }
    
    const body = await request.json() as any;
    
    const workspace = mockWorkspaces.find(w => w.id === params.id);
    
    if (!workspace) {
      return HttpResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }
    
    if (!body.credentials) {
      return HttpResponse.json({ 
        error: 'Validation error',
        details: 'Missing required credentials'
      }, { status: 400 });
    }
    
    if (workspace.quota.used >= workspace.quota.limit) {
      return HttpResponse.json({ 
        error: 'Workspace quota exceeded'
      }, { status: 400 });
    }
    
    if (body.validateOnly) {
      return HttpResponse.json({ 
        valid: true,
        message: 'Credentials validated successfully'
      });
    }
    
    return HttpResponse.json(mockInstance, { status: 201 });
  }),
  
  // Update instance
  http.patch('http://localhost:4000/v1/instances/:id', async ({ params, request }) => {
    const apiKey = request.headers.get('authorization');
    
    if (!apiKey || !apiKey.startsWith('Bearer disco_sk_')) {
      return HttpResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }
    
    if (params.id !== 'inst-1001') {
      return HttpResponse.json({ error: 'Instance not found' }, { status: 404 });
    }
    
    return HttpResponse.json({ ...mockInstance, updatedAt: new Date().toISOString() });
  }),
  
  // Delete instance
  http.delete('http://localhost:4000/v1/instances/:id', ({ params, request }) => {
    const apiKey = request.headers.get('authorization');
    
    if (!apiKey || !apiKey.startsWith('Bearer disco_sk_')) {
      return HttpResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }
    
    if (params.id !== 'inst-1001') {
      return HttpResponse.json({ error: 'Instance not found' }, { status: 404 });
    }
    
    return HttpResponse.json({ message: 'Instance disabled successfully' });
  }),
  
  // Health check
  http.get('http://localhost:4000/v1/instances/:id/health', ({ params, request }) => {
    const apiKey = request.headers.get('authorization');
    
    if (!apiKey || !apiKey.startsWith('Bearer disco_sk_')) {
      return HttpResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }
    
    return HttpResponse.json(mockHealthStatus);
  }),
  
  // Usage metrics
  http.get('http://localhost:4000/v1/analytics/usage', ({ request }) => {
    const apiKey = request.headers.get('authorization');
    
    if (!apiKey || !apiKey.startsWith('Bearer disco_sk_')) {
      return HttpResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }
    
    return HttpResponse.json(mockUsageMetrics);
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('#DiscoSquaredConnector', () => {
  describe('.DISCOVER_CONNECTORS', () => {
    describe('when searching for connectors', () => {
      describe('and query matches results', () => {
        it('returns filtered connector list', async () => {
          const tool = DiscoSquaredConnectorConfig.tools.DISCOVER_CONNECTORS as MCPToolDefinition;
          const mockContext = createMockConnectorContext({
            credentials: { apiKey: 'disco_sk_test' },
            setup: { mockMode: true },
          });
          
          const actual = await tool.handler(
            { query: 'github', limit: 20 },
            mockContext
          );
          
          const parsedResult = JSON.parse(actual);
          expect(parsedResult).toHaveLength(1);
          expect(parsedResult[0].key).toBe('github');
        });
      });
      
      describe('and category is specified', () => {
        it('returns only connectors in that category', async () => {
          const tool = DiscoSquaredConnectorConfig.tools.DISCOVER_CONNECTORS as MCPToolDefinition;
          const mockContext = createMockConnectorContext({
            credentials: { apiKey: 'disco_sk_test' },
            setup: { mockMode: true },
          });
          
          const actual = await tool.handler(
            { category: 'communication', limit: 20 },
            mockContext
          );
          
          const parsedResult = JSON.parse(actual);
          expect(parsedResult).toHaveLength(1);
          expect(parsedResult[0].category).toBe('communication');
        });
      });
    });
    
    describe('when API key is invalid', () => {
      it('returns error message', async () => {
        const tool = DiscoSquaredConnectorConfig.tools.DISCOVER_CONNECTORS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiKey: 'invalid_key' },
          setup: { mockMode: true },
        });
        
        const actual = await tool.handler(
          { limit: 20 },
          mockContext
        );
        
        expect(actual).toContain('Failed to discover connectors');
        expect(actual).toContain('Invalid API key');
      });
    });
  });
  
  describe('.GET_CONNECTOR_SCHEMA', () => {
    describe('when connector exists', () => {
      it('returns connector schema', async () => {
        const tool = DiscoSquaredConnectorConfig.tools.GET_CONNECTOR_SCHEMA as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiKey: 'disco_sk_test' },
          setup: { mockMode: true },
        });
        
        const actual = await tool.handler(
          { connectorKey: 'github' },
          mockContext
        );
        
        const parsedResult = JSON.parse(actual);
        expect(parsedResult.key).toBe('github');
        expect(parsedResult.name).toBe('GitHub');
      });
    });
    
    describe('when connector does not exist', () => {
      it('returns not found error', async () => {
        const tool = DiscoSquaredConnectorConfig.tools.GET_CONNECTOR_SCHEMA as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiKey: 'disco_sk_test' },
          setup: { mockMode: true },
        });
        
        const actual = await tool.handler(
          { connectorKey: 'nonexistent' },
          mockContext
        );
        
        expect(actual).toContain('Failed to get connector schema');
        expect(actual).toContain('Connector not found');
      });
    });
  });
  
  describe('.LIST_WORKSPACES', () => {
    describe('when user has workspaces', () => {
      it('returns list of workspaces', async () => {
        const tool = DiscoSquaredConnectorConfig.tools.LIST_WORKSPACES as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiKey: 'disco_sk_test' },
          setup: { mockMode: true },
        });
        
        const actual = await tool.handler({}, mockContext);
        
        const parsedResult = JSON.parse(actual);
        expect(parsedResult).toHaveLength(2);
        expect(parsedResult[0].id).toBe('ws-test-123');
        expect(parsedResult[1].id).toBe('ws-prod-456');
      });
    });
  });
  
  describe('.GET_WORKSPACE_STATUS', () => {
    describe('when workspace exists', () => {
      it('returns workspace details with enabled connectors', async () => {
        const tool = DiscoSquaredConnectorConfig.tools.GET_WORKSPACE_STATUS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiKey: 'disco_sk_test' },
          setup: { mockMode: true, defaultWorkspaceId: 'ws-test-123' },
        });
        
        const actual = await tool.handler(
          { workspaceId: 'ws-test-123' },
          mockContext
        );
        
        const parsedResult = JSON.parse(actual);
        expect(parsedResult.workspace.id).toBe('ws-test-123');
        expect(parsedResult.enabledConnectors).toHaveLength(1);
      });
    });
    
    describe('when workspace does not exist', () => {
      it('returns not found error', async () => {
        const tool = DiscoSquaredConnectorConfig.tools.GET_WORKSPACE_STATUS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiKey: 'disco_sk_test' },
          setup: { mockMode: true },
        });
        
        const actual = await tool.handler(
          { workspaceId: 'ws-invalid' },
          mockContext
        );
        
        expect(actual).toContain('Failed to get workspace status');
        expect(actual).toContain('Workspace not found');
      });
    });
  });
  
  describe('.ENABLE_CONNECTOR', () => {
    describe('when enabling a valid connector', () => {
      describe('and credentials are valid', () => {
        it('returns instance details with id', async () => {
          const tool = DiscoSquaredConnectorConfig.tools.ENABLE_CONNECTOR as MCPToolDefinition;
          const mockContext = createMockConnectorContext({
            credentials: { apiKey: 'disco_sk_test' },
            setup: { mockMode: true },
          });
          
          const actual = await tool.handler(
            {
              connectorKey: 'github',
              credentials: { token: 'ghp_test' },
              workspaceId: 'ws-test-123',
              validateOnly: false,
            },
            mockContext
          );
          
          const parsedResult = JSON.parse(actual);
          expect(parsedResult.id).toBe('inst-1001');
          expect(parsedResult.connectorKey).toBe('github');
        });
      });
      
      describe('and credentials validation fails', () => {
        it('returns validation error', async () => {
          const tool = DiscoSquaredConnectorConfig.tools.ENABLE_CONNECTOR as MCPToolDefinition;
          const mockContext = createMockConnectorContext({
            credentials: { apiKey: 'disco_sk_test' },
            setup: { mockMode: true },
          });
          
          // Override the POST endpoint to return validation error for empty credentials
          server.use(
            http.post('http://localhost:4000/v1/workspaces/ws-test-123/instances', async ({ request }) => {
              return HttpResponse.json({ 
                error: 'Validation error',
                details: 'Missing required credentials'
              }, { status: 400 });
            })
          );
          
          const actual = await tool.handler(
            {
              connectorKey: 'github',
              credentials: {},
              workspaceId: 'ws-test-123',
              validateOnly: false,
            },
            mockContext
          );
          
          expect(actual).toContain('Failed to enable connector');
          expect(actual).toContain('VALIDATION_ERROR');
        });
      });
      
      describe('and workspace quota exceeded', () => {
        it('returns quota error', async () => {
          const tool = DiscoSquaredConnectorConfig.tools.ENABLE_CONNECTOR as MCPToolDefinition;
          const mockContext = createMockConnectorContext({
            credentials: { apiKey: 'disco_sk_test' },
            setup: { mockMode: true },
          });
          
          // Override the POST endpoint to return quota exceeded error
          server.use(
            http.post('http://localhost:4000/v1/workspaces/ws-test-123/instances', async ({ request }) => {
              return HttpResponse.json({ 
                error: 'Workspace quota exceeded'
              }, { status: 400 });
            })
          );
          
          const actual = await tool.handler(
            {
              connectorKey: 'github',
              credentials: { token: 'ghp_test' },
              workspaceId: 'ws-test-123',
              validateOnly: false,
            },
            mockContext
          );
          
          expect(actual).toContain('Failed to enable connector');
          expect(actual).toContain('QUOTA_EXCEEDED');
        });
      });
    });
  });
  
  describe('.UPDATE_CONNECTOR', () => {
    describe('when updating valid instance', () => {
      it('returns updated instance', async () => {
        const tool = DiscoSquaredConnectorConfig.tools.UPDATE_CONNECTOR as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiKey: 'disco_sk_test' },
          setup: { mockMode: true },
        });
        
        const actual = await tool.handler(
          {
            instanceId: 'inst-1001',
            credentials: { token: 'ghp_new' },
          },
          mockContext
        );
        
        const parsedResult = JSON.parse(actual);
        expect(parsedResult.id).toBe('inst-1001');
        expect(parsedResult).toHaveProperty('updatedAt');
      });
    });
    
    describe('when instance not found', () => {
      it('returns not found error', async () => {
        const tool = DiscoSquaredConnectorConfig.tools.UPDATE_CONNECTOR as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiKey: 'disco_sk_test' },
          setup: { mockMode: true },
        });
        
        const actual = await tool.handler(
          {
            instanceId: 'inst-invalid',
            credentials: { token: 'ghp_new' },
          },
          mockContext
        );
        
        expect(actual).toContain('Failed to update connector');
        expect(actual).toContain('NOT_FOUND');
      });
    });
  });
  
  describe('.DISABLE_CONNECTOR', () => {
    describe('when disabling valid instance', () => {
      it('returns success message', async () => {
        const tool = DiscoSquaredConnectorConfig.tools.DISABLE_CONNECTOR as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiKey: 'disco_sk_test' },
          setup: { mockMode: true },
        });
        
        const actual = await tool.handler(
          { instanceId: 'inst-1001' },
          mockContext
        );
        
        expect(actual).toContain('inst-1001 disabled successfully');
      });
    });
    
    describe('when instance not found', () => {
      it('returns not found error', async () => {
        const tool = DiscoSquaredConnectorConfig.tools.DISABLE_CONNECTOR as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiKey: 'disco_sk_test' },
          setup: { mockMode: true },
        });
        
        const actual = await tool.handler(
          { instanceId: 'inst-invalid' },
          mockContext
        );
        
        expect(actual).toContain('Failed to disable connector');
        expect(actual).toContain('NOT_FOUND');
      });
    });
  });
  
  describe('.CHECK_HEALTH', () => {
    describe('when checking instance health', () => {
      it('returns health status', async () => {
        const tool = DiscoSquaredConnectorConfig.tools.CHECK_HEALTH as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiKey: 'disco_sk_test' },
          setup: { mockMode: true },
        });
        
        const actual = await tool.handler(
          { instanceIds: ['inst-1001'] },
          mockContext
        );
        
        const parsedResult = JSON.parse(actual);
        expect(parsedResult).toHaveLength(1);
        expect(parsedResult[0].status).toBe('healthy');
        expect(parsedResult[0].latencyMs).toBe(145);
      });
    });
  });
  
  describe('.TEST_CONNECTION', () => {
    describe('when testing valid credentials', () => {
      it('returns success result', async () => {
        const tool = DiscoSquaredConnectorConfig.tools.TEST_CONNECTION as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiKey: 'disco_sk_test' },
          setup: { mockMode: true },
        });
        
        const actual = await tool.handler(
          {
            connectorKey: 'github',
            credentials: { token: 'ghp_test' },
          },
          mockContext
        );
        
        const parsedResult = JSON.parse(actual);
        expect(parsedResult.success).toBe(true);
        expect(parsedResult.message).toContain('validated successfully');
      });
    });
  });
  
  describe('.GET_USAGE_METRICS', () => {
    describe('when retrieving metrics', () => {
      it('returns usage data', async () => {
        const tool = DiscoSquaredConnectorConfig.tools.GET_USAGE_METRICS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiKey: 'disco_sk_test' },
          setup: { mockMode: true },
        });
        
        const actual = await tool.handler(
          { workspaceId: 'ws-test-123' },
          mockContext
        );
        
        const parsedResult = JSON.parse(actual);
        expect(parsedResult.totalCalls).toBe(1234);
        expect(parsedResult.byConnector).toHaveLength(1);
        expect(parsedResult.byConnector[0].key).toBe('github');
      });
    });
  });
});
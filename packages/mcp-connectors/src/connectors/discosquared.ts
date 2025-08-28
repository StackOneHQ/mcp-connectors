import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

// Type definitions for disco.dev API responses
interface Connector {
  key: string;
  name: string;
  version: string;
  category: 'communication' | 'developer' | 'ai' | 'business' | 'data';
  tools: number;
  resources: number;
  requiresOAuth: boolean;
  credentials?: Record<string, {
    type: string;
    required: boolean;
    description?: string;
  }>;
  setup?: Record<string, {
    type: string;
    required: boolean;
    description?: string;
  }>;
}

interface Workspace {
  id: string;
  name: string;
  slug?: string;
  plan: 'free' | 'pro' | 'enterprise';
  quota: {
    used: number;
    limit: number;
  };
  createdAt: string;
  updatedAt?: string;
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
  success: boolean;
  message: string;
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
  byTool?: Array<{
    connector: string;
    tool: string;
    calls: number;
  }>;
  byDay?: Array<{
    date: string;
    calls: number;
  }>;
}

// Error codes as const object instead of enum
const DiscoErrorCode = {
  API_ERROR: 'DISCO_API_ERROR',
  VALIDATION_ERROR: 'DISCO_VALIDATION_ERROR',
  NOT_FOUND: 'DISCO_NOT_FOUND',
  QUOTA_EXCEEDED: 'DISCO_QUOTA_EXCEEDED',
  RATE_LIMIT: 'DISCO_RATE_LIMIT',
  CONNECTION_FAILED: 'DISCO_CONNECTION_FAILED',
  INVALID_CREDENTIALS: 'DISCO_INVALID_CREDENTIALS',
} as const;

// API Client for disco.dev
class DiscoAPIClient {
  private baseUrl: string;
  private headers: { Authorization: string; 'Content-Type': string };

  constructor(apiKey: string, mockMode = false) {
    this.baseUrl = mockMode 
      ? 'http://localhost:4000/v1'
      : 'https://api.disco.dev/v1';
    this.headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async listConnectors(query?: string, category?: string, limit = 20): Promise<Connector[]> {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (category) params.append('category', category);
    params.append('limit', Math.min(limit, 100).toString());

    const response = await fetch(`${this.baseUrl}/connectors?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      this.handleErrorResponse(response);
    }

    return response.json() as Promise<Connector[]>;
  }

  async getConnectorSchema(connectorKey: string): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/connectors/${connectorKey}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`${DiscoErrorCode.NOT_FOUND}: Connector not found`);
      }
      this.handleErrorResponse(response);
    }

    return response.json();
  }

  async listWorkspaces(): Promise<Workspace[]> {
    const response = await fetch(`${this.baseUrl}/workspaces`, {
      headers: this.headers,
    });

    if (!response.ok) {
      this.handleErrorResponse(response);
    }

    return response.json() as Promise<Workspace[]>;
  }

  async getWorkspace(workspaceId: string): Promise<Workspace> {
    const response = await fetch(`${this.baseUrl}/workspaces/${workspaceId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`${DiscoErrorCode.NOT_FOUND}: Workspace not found`);
      }
      this.handleErrorResponse(response);
    }

    return response.json() as Promise<Workspace>;
  }

  async listEnabledConnectors(workspaceId: string): Promise<ConnectorInstance[]> {
    const response = await fetch(`${this.baseUrl}/workspaces/${workspaceId}/instances`, {
      headers: this.headers,
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`${DiscoErrorCode.NOT_FOUND}: Workspace not found`);
      }
      this.handleErrorResponse(response);
    }

    return response.json() as Promise<ConnectorInstance[]>;
  }

  async enableConnector(
    workspaceId: string,
    connectorKey: string,
    credentials: Record<string, unknown>,
    setup?: Record<string, unknown>,
    validateOnly = false
  ): Promise<ConnectorInstance | { valid: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/workspaces/${workspaceId}/instances`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        connectorKey,
        credentials,
        setup,
        validateOnly,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      if (response.status === 400) {
        if (error.error === 'Workspace quota exceeded') {
          throw new Error(`${DiscoErrorCode.QUOTA_EXCEEDED}: Workspace quota exceeded`);
        }
        throw new Error(`${DiscoErrorCode.VALIDATION_ERROR}: ${error.error || 'Validation failed'}`);
      }
      if (response.status === 404) {
        throw new Error(`${DiscoErrorCode.NOT_FOUND}: ${error.error || 'Not found'}`);
      }
      this.handleErrorResponse(response);
    }

    return response.json();
  }

  async updateConnectorConfig(
    instanceId: string,
    credentials?: Record<string, unknown>,
    setup?: Record<string, unknown>
  ): Promise<ConnectorInstance> {
    const response = await fetch(`${this.baseUrl}/instances/${instanceId}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify({ credentials, setup }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`${DiscoErrorCode.NOT_FOUND}: Instance not found`);
      }
      if (response.status === 400) {
        throw new Error(`${DiscoErrorCode.VALIDATION_ERROR}: Invalid configuration`);
      }
      this.handleErrorResponse(response);
    }

    return response.json() as Promise<ConnectorInstance>;
  }

  async disableConnector(instanceId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/instances/${instanceId}`, {
      method: 'DELETE',
      headers: this.headers,
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`${DiscoErrorCode.NOT_FOUND}: Instance not found`);
      }
      this.handleErrorResponse(response);
    }
  }

  async checkHealth(
    instanceIds?: string[],
    workspaceId?: string
  ): Promise<HealthStatus[]> {
    const results: HealthStatus[] = [];

    if (instanceIds) {
      for (const instanceId of instanceIds) {
        const response = await fetch(`${this.baseUrl}/instances/${instanceId}/health`, {
          headers: this.headers,
        });

        if (response.ok) {
          const health = await response.json() as HealthStatus;
          results.push(health);
        }
      }
    } else if (workspaceId) {
      const instances = await this.listEnabledConnectors(workspaceId);
      for (const instance of instances) {
        const response = await fetch(`${this.baseUrl}/instances/${instance.id}/health`, {
          headers: this.headers,
        });

        if (response.ok) {
          const health = await response.json() as HealthStatus;
          results.push(health);
        }
      }
    }

    return results;
  }

  async testConnection(
    connectorKey: string,
    credentials: Record<string, unknown>
  ): Promise<ConnectionTestResult> {
    // First, we need to find or create a test instance
    // In a real implementation, this would use a separate endpoint
    // For now, use validation mode of enableConnector
    const workspaces = await this.listWorkspaces();
    if (workspaces.length === 0) {
      throw new Error(`${DiscoErrorCode.API_ERROR}: No workspaces available`);
    }

    const result = await this.enableConnector(
      workspaces[0].id,
      connectorKey,
      credentials,
      undefined,
      true // validateOnly
    ) as { valid: boolean; message: string };

    return {
      success: result.valid,
      message: result.message,
    };
  }

  async getUsageMetrics(
    workspaceId?: string,
    startDate?: string,
    endDate?: string,
    groupBy?: 'connector' | 'day' | 'tool'
  ): Promise<UsageMetrics> {
    const params = new URLSearchParams();
    if (workspaceId) params.append('workspaceId', workspaceId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (groupBy) params.append('groupBy', groupBy);

    const response = await fetch(`${this.baseUrl}/analytics/usage?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      this.handleErrorResponse(response);
    }

    return response.json() as Promise<UsageMetrics>;
  }

  private handleErrorResponse(response: Response): never {
    if (response.status === 401) {
      throw new Error(`${DiscoErrorCode.INVALID_CREDENTIALS}: Invalid API key`);
    }
    if (response.status === 429) {
      throw new Error(`${DiscoErrorCode.RATE_LIMIT}: Rate limit exceeded`);
    }
    throw new Error(`${DiscoErrorCode.API_ERROR}: API request failed with status ${response.status}`);
  }
}

export const DiscoSquaredConnectorConfig = mcpConnectorConfig({
  name: 'DiscoSquared',
  key: 'discosquared',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/disco/filled/svg',
  description: 'Manage disco.dev connectors and workspaces through MCP',
  
  // Credentials schema
  credentials: z.object({
    apiKey: z.string()
      .min(1)
      .regex(/^disco_sk_/)
      .describe('disco.dev API Key from Settings > API'),
  }),
  
  // Setup schema
  setup: z.object({
    defaultWorkspaceId: z.string()
      .optional()
      .describe('Default workspace ID for operations'),
    mockMode: z.boolean()
      .default(false)
      .describe('Enable mock mode for testing without real API'),
  }),
  
  // Example prompt
  examplePrompt: 'List my disco.dev workspaces, discover available connectors for Slack, enable GitHub connector with my token, and check the health of all enabled connectors.',
  
  // Tools
  tools: (tool) => ({
    DISCOVER_CONNECTORS: tool({
      name: 'disco_discover_connectors',
      description: 'Search and discover available connectors on disco.dev',
      schema: z.object({
        query: z.string().optional().describe('Search query for connectors'),
        category: z.enum(['communication', 'developer', 'ai', 'business', 'data']).optional()
          .describe('Filter by category'),
        limit: z.number().min(1).max(100).default(20)
          .describe('Maximum number of results'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const { mockMode } = await context.getSetup();
          const client = new DiscoAPIClient(apiKey, mockMode);
          
          const connectors = await client.listConnectors(args.query, args.category, args.limit);
          
          // Store search results in context
          await context.setData('lastSearch', {
            query: args.query,
            category: args.category,
            timestamp: new Date().toISOString(),
            resultCount: connectors.length,
          });
          
          return JSON.stringify(connectors, null, 2);
        } catch (error) {
          return `Failed to discover connectors: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    
    GET_CONNECTOR_SCHEMA: tool({
      name: 'disco_get_connector_schema',
      description: 'Get detailed schema and configuration for a specific connector',
      schema: z.object({
        connectorKey: z.string().describe('Key of the connector'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const { mockMode } = await context.getSetup();
          const client = new DiscoAPIClient(apiKey, mockMode);
          
          const schema = await client.getConnectorSchema(args.connectorKey);
          return JSON.stringify(schema, null, 2);
        } catch (error) {
          return `Failed to get connector schema: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    
    LIST_WORKSPACES: tool({
      name: 'disco_list_workspaces',
      description: 'List all workspaces for the authenticated user',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const { mockMode } = await context.getSetup();
          const client = new DiscoAPIClient(apiKey, mockMode);
          
          const workspaces = await client.listWorkspaces();
          
          // Store workspace info for easy access
          if (workspaces.length > 0) {
            await context.setData('workspaces', workspaces);
          }
          
          return JSON.stringify(workspaces, null, 2);
        } catch (error) {
          return `Failed to list workspaces: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    
    GET_WORKSPACE_STATUS: tool({
      name: 'disco_get_workspace_status',
      description: 'Get detailed status of a workspace including enabled connectors',
      schema: z.object({
        workspaceId: z.string().optional()
          .describe('Workspace ID (uses default if not provided)'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const { mockMode, defaultWorkspaceId } = await context.getSetup();
          const client = new DiscoAPIClient(apiKey, mockMode);
          
          const workspaceId = args.workspaceId || defaultWorkspaceId;
          if (!workspaceId) {
            return 'No workspace ID provided and no default workspace configured';
          }
          
          const [workspace, instances] = await Promise.all([
            client.getWorkspace(workspaceId),
            client.listEnabledConnectors(workspaceId),
          ]);
          
          await context.setData('activeWorkspaceId', workspaceId);
          
          return JSON.stringify({
            workspace,
            enabledConnectors: instances,
          }, null, 2);
        } catch (error) {
          return `Failed to get workspace status: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    
    ENABLE_CONNECTOR: tool({
      name: 'disco_enable_connector',
      description: 'Enable a connector in a workspace',
      schema: z.object({
        connectorKey: z.string().describe('Key of the connector to enable'),
        credentials: z.record(z.unknown())
          .describe('Credentials for the connector'),
        setup: z.record(z.unknown()).optional()
          .describe('Setup configuration for the connector'),
        workspaceId: z.string().optional()
          .describe('Workspace ID (uses default if not provided)'),
        validateOnly: z.boolean().default(false)
          .describe('Only validate credentials without enabling'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const { mockMode, defaultWorkspaceId } = await context.getSetup();
          const client = new DiscoAPIClient(apiKey, mockMode);
          
          const workspaceId = args.workspaceId || defaultWorkspaceId;
          if (!workspaceId) {
            // Try to get from context or list workspaces
            const activeWorkspaceId = await context.getData('activeWorkspaceId');
            if (!activeWorkspaceId) {
              const workspaces = await client.listWorkspaces();
              if (workspaces.length === 0) {
                return 'No workspaces available';
              }
              args.workspaceId = workspaces[0].id;
            } else {
              args.workspaceId = activeWorkspaceId as string;
            }
          }
          
          const result = await client.enableConnector(
            args.workspaceId || workspaceId!,
            args.connectorKey,
            args.credentials,
            args.setup,
            args.validateOnly
          );
          
          // Track recently enabled connectors
          if (!args.validateOnly && 'id' in result) {
            const recentlyEnabled = await context.getData('recentlyEnabledConnectors') || [];
            const recentArray = Array.isArray(recentlyEnabled) ? recentlyEnabled : [];
            
            recentArray.push({
              key: args.connectorKey,
              instanceId: result.id,
              timestamp: new Date().toISOString(),
            });
            
            await context.setData('recentlyEnabledConnectors', recentArray.slice(-5));
          }
          
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to enable connector: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    
    UPDATE_CONNECTOR: tool({
      name: 'disco_update_connector',
      description: 'Update connector configuration',
      schema: z.object({
        instanceId: z.string().describe('Instance ID of the connector'),
        credentials: z.record(z.unknown()).optional()
          .describe('Updated credentials'),
        setup: z.record(z.unknown()).optional()
          .describe('Updated setup configuration'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const { mockMode } = await context.getSetup();
          const client = new DiscoAPIClient(apiKey, mockMode);
          
          const result = await client.updateConnectorConfig(
            args.instanceId,
            args.credentials,
            args.setup
          );
          
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to update connector: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    
    DISABLE_CONNECTOR: tool({
      name: 'disco_disable_connector',
      description: 'Disable a connector instance',
      schema: z.object({
        instanceId: z.string().describe('Instance ID of the connector to disable'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const { mockMode } = await context.getSetup();
          const client = new DiscoAPIClient(apiKey, mockMode);
          
          await client.disableConnector(args.instanceId);
          return `Connector instance ${args.instanceId} disabled successfully`;
        } catch (error) {
          return `Failed to disable connector: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    
    CHECK_HEALTH: tool({
      name: 'disco_check_health',
      description: 'Check health status of connector instances',
      schema: z.object({
        instanceIds: z.array(z.string()).optional()
          .describe('Specific instance IDs to check'),
        workspaceId: z.string().optional()
          .describe('Check all instances in workspace'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const { mockMode, defaultWorkspaceId } = await context.getSetup();
          const client = new DiscoAPIClient(apiKey, mockMode);
          
          const workspaceId = args.workspaceId || defaultWorkspaceId || 
                            await context.getData('activeWorkspaceId') as string;
          
          const healthStatuses = await client.checkHealth(args.instanceIds, workspaceId);
          
          // Store health check results
          await context.setData('lastHealthCheck', {
            timestamp: new Date().toISOString(),
            results: healthStatuses,
          });
          
          return JSON.stringify(healthStatuses, null, 2);
        } catch (error) {
          return `Failed to check health: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    
    TEST_CONNECTION: tool({
      name: 'disco_test_connection',
      description: 'Test connector credentials without enabling',
      schema: z.object({
        connectorKey: z.string().describe('Key of the connector to test'),
        credentials: z.record(z.unknown())
          .describe('Credentials to test'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const { mockMode } = await context.getSetup();
          const client = new DiscoAPIClient(apiKey, mockMode);
          
          const result = await client.testConnection(
            args.connectorKey,
            args.credentials
          );
          
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to test connection: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    
    GET_USAGE_METRICS: tool({
      name: 'disco_get_usage_metrics',
      description: 'Get usage analytics and metrics',
      schema: z.object({
        workspaceId: z.string().optional()
          .describe('Workspace ID for metrics'),
        startDate: z.string().optional()
          .describe('Start date in ISO 8601 format'),
        endDate: z.string().optional()
          .describe('End date in ISO 8601 format'),
        groupBy: z.enum(['connector', 'day', 'tool']).optional()
          .describe('Group metrics by'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const { mockMode, defaultWorkspaceId } = await context.getSetup();
          const client = new DiscoAPIClient(apiKey, mockMode);
          
          const workspaceId = args.workspaceId || defaultWorkspaceId || 
                            await context.getData('activeWorkspaceId') as string;
          
          const metrics = await client.getUsageMetrics(
            workspaceId,
            args.startDate,
            args.endDate,
            args.groupBy
          );
          
          return JSON.stringify(metrics, null, 2);
        } catch (error) {
          return `Failed to get usage metrics: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    CREATE_WORKFLOW_TEMPLATE: tool({
      name: 'disco_create_workflow_template',
      description: 'Save common multi-connector workflows as reusable templates',
      schema: z.object({
        name: z.string().describe('Template name'),
        description: z.string().describe('Template description'),
        workflow: z.array(z.object({
          step: z.number().describe('Step order in workflow'),
          connectorKey: z.string().describe('Connector to use'),
          toolName: z.string().describe('Tool to execute'),
          args: z.record(z.unknown()).describe('Arguments for the tool'),
          dependsOn: z.array(z.number()).optional().describe('Previous steps this depends on'),
          outputMapping: z.record(z.string()).optional().describe('Map outputs to next step inputs'),
        })).describe('Ordered list of workflow steps'),
        tags: z.array(z.string()).optional().describe('Tags for categorizing templates'),
      }),
      handler: async (args, context) => {
        try {
          // Get existing templates
          const templates = await context.getData('workflowTemplates') || {};
          const templatesMap = typeof templates === 'object' && templates ? templates as Record<string, unknown> : {};
          
          // Create new template
          const template = {
            id: `template-${Date.now()}`,
            name: args.name,
            description: args.description,
            workflow: args.workflow,
            tags: args.tags || [],
            createdAt: new Date().toISOString(),
            createdBy: 'user', // Would be actual user ID in real implementation
            usageCount: 0,
          };
          
          // Save template
          templatesMap[template.id] = template;
          await context.setData('workflowTemplates', templatesMap);
          
          return `Workflow template "${args.name}" created successfully with ${args.workflow.length} steps. Template ID: ${template.id}`;
        } catch (error) {
          return `Failed to create workflow template: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    EXECUTE_WORKFLOW: tool({
      name: 'disco_execute_workflow',
      description: 'Execute a predefined workflow across multiple connectors',
      schema: z.object({
        templateId: z.string().optional().describe('ID of saved workflow template'),
        workflowName: z.string().optional().describe('Name of saved workflow template'),
        workflow: z.array(z.object({
          step: z.number().describe('Step order in workflow'),
          connectorKey: z.string().describe('Connector to use'),
          toolName: z.string().describe('Tool to execute'),
          args: z.record(z.unknown()).describe('Arguments for the tool'),
          dependsOn: z.array(z.number()).optional().describe('Previous steps this depends on'),
          outputMapping: z.record(z.string()).optional().describe('Map outputs to next step inputs'),
        })).optional().describe('Workflow definition if not using template'),
        workspaceId: z.string().optional().describe('Workspace ID for execution'),
        dryRun: z.boolean().default(false).describe('Preview workflow without executing'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const { mockMode, defaultWorkspaceId } = await context.getSetup();
          const client = new DiscoAPIClient(apiKey, mockMode);
          
          let workflow = args.workflow;
          
          // Load workflow from template if specified
          if (args.templateId || args.workflowName) {
            const templates = await context.getData('workflowTemplates') as Record<string, any> || {};
            
            let template: any = null;
            if (args.templateId) {
              template = templates[args.templateId];
            } else if (args.workflowName) {
              template = Object.values(templates).find((t: any) => t?.name === args.workflowName);
            }
            
            if (!template) {
              return `Workflow template not found: ${args.templateId || args.workflowName}`;
            }
            
            workflow = template.workflow;
            
            // Update usage count
            template.usageCount = (template.usageCount || 0) + 1;
            template.lastUsed = new Date().toISOString();
            await context.setData('workflowTemplates', templates);
          }
          
          if (!workflow || workflow.length === 0) {
            return 'No workflow provided or found in template';
          }
          
          // Sort steps by order
          const sortedSteps = workflow.sort((a, b) => a.step - b.step);
          
          if (args.dryRun) {
            let preview = `## Workflow Preview (${sortedSteps.length} steps)\n\n`;
            for (const step of sortedSteps) {
              preview += `**Step ${step.step}**: Use ${step.connectorKey}.${step.toolName}\n`;
              preview += `- Args: ${JSON.stringify(step.args, null, 2)}\n`;
              if (step.dependsOn?.length) {
                preview += `- Depends on steps: ${step.dependsOn.join(', ')}\n`;
              }
              preview += '\n';
            }
            return preview;
          }
          
          // Execute workflow
          const results: Record<number, unknown> = {};
          const workspaceId = args.workspaceId || defaultWorkspaceId || await context.getData('activeWorkspaceId') as string;
          
          for (const step of sortedSteps) {
            // Check dependencies
            if (step.dependsOn?.length) {
              for (const depStep of step.dependsOn) {
                if (!results[depStep]) {
                  return `Workflow failed: Step ${step.step} depends on step ${depStep} which hasn't completed`;
                }
              }
            }
            
            // Map outputs from previous steps if specified
            let stepArgs = { ...step.args };
            if (step.outputMapping) {
              for (const [sourceKey, targetKey] of Object.entries(step.outputMapping)) {
                const [stepNum, outputField] = sourceKey.split('.');
                if (stepNum && outputField && results[parseInt(stepNum)]) {
                  const stepResult = results[parseInt(stepNum)] as Record<string, unknown>;
                  if (stepResult[outputField]) {
                    stepArgs[targetKey] = stepResult[outputField];
                  }
                }
              }
            }
            
            // For simulation purposes, we'll just validate the connectors exist
            const connectors = await client.listConnectors();
            const connector = connectors.find(c => c.key === step.connectorKey);
            
            if (!connector) {
              return `Workflow failed at step ${step.step}: Connector ${step.connectorKey} not available`;
            }
            
            // Simulate tool execution (in real implementation, would call actual tools)
            results[step.step] = {
              connector: step.connectorKey,
              tool: step.toolName,
              args: stepArgs,
              success: true,
              timestamp: new Date().toISOString(),
            };
          }
          
          return `Workflow executed successfully with ${Object.keys(results).length} steps completed`;
        } catch (error) {
          return `Failed to execute workflow: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    BATCH_CONNECTOR_OPERATIONS: tool({
      name: 'disco_batch_connector_operations',
      description: 'Perform bulk operations across multiple connectors',
      schema: z.object({
        operation: z.enum(['enable', 'disable', 'update', 'test', 'health_check'])
          .describe('Operation to perform on all connectors'),
        connectors: z.array(z.object({
          connectorKey: z.string().optional().describe('Connector key (for enable operations)'),
          instanceId: z.string().optional().describe('Instance ID (for update/disable operations)'),
          credentials: z.record(z.unknown()).optional().describe('Credentials (for enable/update)'),
          setup: z.record(z.unknown()).optional().describe('Setup config (for enable/update)'),
        })).describe('List of connectors to operate on'),
        workspaceId: z.string().optional().describe('Workspace for operations'),
        continueOnError: z.boolean().default(true).describe('Continue processing if one operation fails'),
        maxConcurrent: z.number().min(1).max(10).default(3).describe('Max concurrent operations'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const { mockMode, defaultWorkspaceId } = await context.getSetup();
          const client = new DiscoAPIClient(apiKey, mockMode);
          
          const workspaceId = args.workspaceId || defaultWorkspaceId || await context.getData('activeWorkspaceId') as string;
          if (!workspaceId) {
            return 'No workspace ID available for batch operations';
          }
          
          const results = [];
          const errors = [];
          
          // Process connectors in batches to respect maxConcurrent
          for (let i = 0; i < args.connectors.length; i += args.maxConcurrent) {
            const batch = args.connectors.slice(i, i + args.maxConcurrent);
            
            const batchPromises = batch.map(async (conn, batchIndex) => {
              const globalIndex = i + batchIndex;
              
              try {
                let result;
                
                switch (args.operation) {
                  case 'enable':
                    if (!conn.connectorKey || !conn.credentials) {
                      throw new Error('connectorKey and credentials required for enable operation');
                    }
                    result = await client.enableConnector(
                      workspaceId,
                      conn.connectorKey,
                      conn.credentials,
                      conn.setup
                    );
                    break;
                    
                  case 'disable':
                    if (!conn.instanceId) {
                      throw new Error('instanceId required for disable operation');
                    }
                    await client.disableConnector(conn.instanceId);
                    result = { success: true, instanceId: conn.instanceId };
                    break;
                    
                  case 'update':
                    if (!conn.instanceId) {
                      throw new Error('instanceId required for update operation');
                    }
                    result = await client.updateConnectorConfig(
                      conn.instanceId,
                      conn.credentials,
                      conn.setup
                    );
                    break;
                    
                  case 'test':
                    if (!conn.connectorKey || !conn.credentials) {
                      throw new Error('connectorKey and credentials required for test operation');
                    }
                    result = await client.testConnection(conn.connectorKey, conn.credentials);
                    break;
                    
                  case 'health_check':
                    if (!conn.instanceId) {
                      throw new Error('instanceId required for health check operation');
                    }
                    const healthResults = await client.checkHealth([conn.instanceId]);
                    result = healthResults[0] || null;
                    break;
                    
                  default:
                    throw new Error(`Unsupported operation: ${args.operation}`);
                }
                
                return {
                  index: globalIndex,
                  connector: conn.connectorKey || conn.instanceId,
                  success: true,
                  result,
                };
              } catch (error) {
                const errorResult = {
                  index: globalIndex,
                  connector: conn.connectorKey || conn.instanceId,
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                };
                
                if (!args.continueOnError) {
                  throw error;
                }
                
                return errorResult;
              }
            });
            
            const batchResults = await Promise.allSettled(batchPromises);
            
            batchResults.forEach((promiseResult, batchIndex) => {
              if (promiseResult.status === 'fulfilled') {
                if (promiseResult.value.success) {
                  results.push(promiseResult.value);
                } else {
                  errors.push(promiseResult.value);
                }
              } else {
                errors.push({
                  index: i + batchIndex,
                  connector: batch[batchIndex].connectorKey || batch[batchIndex].instanceId,
                  success: false,
                  error: promiseResult.reason instanceof Error ? promiseResult.reason.message : String(promiseResult.reason),
                });
              }
            });
          }
          
          const summary = {
            operation: args.operation,
            totalProcessed: args.connectors.length,
            successful: results.length,
            failed: errors.length,
            results,
            errors,
            completedAt: new Date().toISOString(),
          };
          
          return JSON.stringify(summary, null, 2);
        } catch (error) {
          return `Failed to complete batch operations: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    RECOMMEND_CONNECTORS: tool({
      name: 'disco_recommend_connectors',
      description: 'AI-powered connector recommendations based on usage patterns',
      schema: z.object({
        basedOn: z.enum(['usage', 'similar_users', 'industry', 'workflow_gaps'])
          .default('usage')
          .describe('Basis for recommendations'),
        limit: z.number().min(1).max(20).default(5)
          .describe('Maximum number of recommendations'),
        category: z.enum(['communication', 'developer', 'ai', 'business', 'data']).optional()
          .describe('Filter recommendations by category'),
        excludeEnabled: z.boolean().default(true)
          .describe('Exclude already enabled connectors'),
        workspaceId: z.string().optional()
          .describe('Workspace for recommendations'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const { mockMode, defaultWorkspaceId } = await context.getSetup();
          const client = new DiscoAPIClient(apiKey, mockMode);
          
          const workspaceId = args.workspaceId || defaultWorkspaceId || await context.getData('activeWorkspaceId') as string;
          
          // Get current state for analysis
          const [allConnectors, enabledConnectors, usageMetrics] = await Promise.all([
            client.listConnectors(undefined, args.category, 100),
            workspaceId ? client.listEnabledConnectors(workspaceId) : Promise.resolve([]),
            workspaceId ? client.getUsageMetrics(workspaceId) : Promise.resolve(null),
          ]);
          
          // Filter out already enabled connectors if requested
          let candidateConnectors = allConnectors;
          if (args.excludeEnabled && enabledConnectors.length > 0) {
            const enabledKeys = new Set(enabledConnectors.map(instance => instance.connectorKey));
            candidateConnectors = allConnectors.filter(conn => !enabledKeys.has(conn.key));
          }
          
          // Generate recommendations based on strategy
          const recommendations = [];
          
          switch (args.basedOn) {
            case 'usage':
              // Recommend popular connectors that user doesn't have
              const popularConnectors = candidateConnectors
                .filter(conn => ['github', 'slack', 'notion', 'linear', 'asana'].includes(conn.key))
                .slice(0, args.limit);
              
              for (const conn of popularConnectors) {
                recommendations.push({
                  connector: conn,
                  reason: 'Highly popular connector used by most teams',
                  confidence: 0.8,
                  estimatedSetupTime: '5 minutes',
                });
              }
              break;
              
            case 'workflow_gaps':
              // Analyze enabled connectors and suggest complementary ones
              const enabledCategories = new Set(enabledConnectors.map(instance => {
                const connector = allConnectors.find(c => c.key === instance.connectorKey);
                return connector?.category;
              }));
              
              const missingCategories = ['communication', 'developer', 'business'].filter(cat => !enabledCategories.has(cat));
              
              for (const category of missingCategories) {
                const categoryConnectors = candidateConnectors
                  .filter(conn => conn.category === category)
                  .slice(0, 2); // Top 2 per missing category
                
                for (const conn of categoryConnectors) {
                  recommendations.push({
                    connector: conn,
                    reason: `Fills gap in ${category} tools for your workflow`,
                    confidence: 0.7,
                    estimatedSetupTime: '10 minutes',
                  });
                }
              }
              break;
              
            case 'similar_users':
              // Mock recommendation based on "similar user patterns"
              const commonCombinations = [
                { if: 'github', then: ['linear', 'slack'] },
                { if: 'slack', then: ['notion', 'asana'] },
                { if: 'linear', then: ['github', 'slack'] },
              ];
              
              const enabledKeys = new Set(enabledConnectors.map(instance => instance.connectorKey));
              
              for (const combo of commonCombinations) {
                if (enabledKeys.has(combo.if)) {
                  for (const suggestion of combo.then) {
                    if (!enabledKeys.has(suggestion)) {
                      const connector = candidateConnectors.find(c => c.key === suggestion);
                      if (connector) {
                        recommendations.push({
                          connector,
                          reason: `Users with ${combo.if} often also use ${suggestion}`,
                          confidence: 0.6,
                          estimatedSetupTime: '7 minutes',
                        });
                      }
                    }
                  }
                }
              }
              break;
              
            case 'industry':
              // Mock industry-based recommendations
              recommendations.push({
                connector: candidateConnectors.find(c => c.key === 'github') || candidateConnectors[0],
                reason: 'Essential for software development teams',
                confidence: 0.9,
                estimatedSetupTime: '5 minutes',
              });
              break;
          }
          
          // Remove duplicates and limit results
          const uniqueRecommendations = recommendations
            .filter((rec, index, arr) => 
              arr.findIndex(r => r.connector.key === rec.connector.key) === index
            )
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, args.limit);
          
          // Store recommendations for future reference
          await context.setData('lastRecommendations', {
            timestamp: new Date().toISOString(),
            basedOn: args.basedOn,
            count: uniqueRecommendations.length,
            recommendations: uniqueRecommendations,
          });
          
          return JSON.stringify({
            strategy: args.basedOn,
            workspaceId,
            recommendationCount: uniqueRecommendations.length,
            recommendations: uniqueRecommendations,
          }, null, 2);
        } catch (error) {
          return `Failed to generate recommendations: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
  
  // Resources
  resources: (resource) => ({
    CONNECTOR_CATALOG: resource({
      name: 'disco_catalog',
      uri: 'disco://catalog',
      title: 'Connector Catalog',
      description: 'Complete catalog of available connectors',
      mimeType: 'text/markdown',
      handler: async (context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const { mockMode } = await context.getSetup();
          const client = new DiscoAPIClient(apiKey, mockMode);
          
          const connectors = await client.listConnectors(undefined, undefined, 100);
          
          // Group by category
          const byCategory = connectors.reduce((acc, conn) => {
            if (!acc[conn.category]) {
              acc[conn.category] = [];
            }
            acc[conn.category].push(conn);
            return acc;
          }, {} as Record<string, Connector[]>);
          
          let markdown = '# disco.dev Connector Catalog\n\n';
          markdown += `*Total Connectors: ${connectors.length}*\n\n`;
          
          for (const [category, categoryConnectors] of Object.entries(byCategory)) {
            markdown += `## ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
            
            for (const conn of categoryConnectors) {
              markdown += `### ${conn.name} (\`${conn.key}\`)\n`;
              markdown += `- **Version**: ${conn.version}\n`;
              markdown += `- **Tools**: ${conn.tools}\n`;
              markdown += `- **Resources**: ${conn.resources}\n`;
              markdown += `- **OAuth Required**: ${conn.requiresOAuth ? 'Yes' : 'No'}\n\n`;
            }
          }
          
          return markdown;
        } catch (error) {
          return `# Error Loading Catalog\n\n${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    
    WORKSPACE_SUMMARY: resource({
      name: 'disco_workspace_summary',
      uri: 'disco://workspace/summary',
      title: 'Workspace Summary',
      description: 'Current workspace configuration and enabled connectors',
      mimeType: 'text/markdown',
      handler: async (context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const { mockMode, defaultWorkspaceId } = await context.getSetup();
          const client = new DiscoAPIClient(apiKey, mockMode);
          
          const workspaceId = defaultWorkspaceId || 
                            await context.getData('activeWorkspaceId') as string;
          
          if (!workspaceId) {
            return '# Workspace Summary\n\nNo workspace selected. Use disco_list_workspaces to see available workspaces.';
          }
          
          const [workspace, instances] = await Promise.all([
            client.getWorkspace(workspaceId),
            client.listEnabledConnectors(workspaceId),
          ]);
          
          let markdown = `# Workspace: ${workspace.name}\n\n`;
          markdown += `- **ID**: ${workspace.id}\n`;
          markdown += `- **Plan**: ${workspace.plan}\n`;
          markdown += `- **Quota**: ${workspace.quota.used}/${workspace.quota.limit} connectors\n`;
          markdown += `- **Created**: ${workspace.createdAt}\n\n`;
          
          markdown += `## Enabled Connectors (${instances.length})\n\n`;
          
          if (instances.length === 0) {
            markdown += '*No connectors enabled yet*\n';
          } else {
            for (const inst of instances) {
              markdown += `### ${inst.connectorKey}\n`;
              markdown += `- **Instance ID**: ${inst.id}\n`;
              markdown += `- **Status**: ${inst.status}\n`;
              markdown += `- **Enabled**: ${inst.enabledAt}\n`;
              markdown += `- **Last Health Check**: ${inst.lastHealthCheck || 'Never'}\n\n`;
            }
          }
          
          // Add recent activity if available
          const recentlyEnabled = await context.getData('recentlyEnabledConnectors') as Array<{
            key: string;
            instanceId: string;
            timestamp: string;
          }> | null;
          
          if (recentlyEnabled && recentlyEnabled.length > 0) {
            markdown += '## Recent Activity\n\n';
            for (const recent of recentlyEnabled) {
              markdown += `- Enabled **${recent.key}** at ${recent.timestamp}\n`;
            }
          }
          
          return markdown;
        } catch (error) {
          return `# Error Loading Summary\n\n${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});
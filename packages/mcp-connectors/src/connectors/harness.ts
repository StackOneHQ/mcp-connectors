import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface HarnessFeatureFlag {
  identifier: string;
  name: string;
  description?: string;
  kind: 'boolean' | 'int' | 'string' | 'json';
  permanent: boolean;
  tags?: string[];
  defaultServe: {
    variation: string;
  };
  offVariation: string;
  variations: Array<{
    identifier: string;
    name: string;
    value: string | boolean | number | object;
    description?: string;
  }>;
  prerequisites?: Array<{
    flag: string;
    variations: string[];
  }>;
  state: 'on' | 'off';
  envProperties?: {
    environment: string;
    state: 'on' | 'off';
    defaultServe: {
      variation: string;
    };
    offVariation: string;
    modifiedAt: number;
    version: number;
  };
  createdAt: number;
  modifiedAt: number;
  version: number;
  [key: string]: unknown;
}

interface HarnessTarget {
  identifier: string;
  account: string;
  org: string;
  environment: string;
  project: string;
  name: string;
  anonymous?: boolean;
  attributes?: Record<string, string>;
  createdAt?: number;
  segments?: Array<{
    identifier: string;
    name: string;
  }>;
  [key: string]: unknown;
}

interface HarnessTargetGroup {
  identifier: string;
  name: string;
  environment: string;
  project: string;
  account: string;
  org: string;
  description?: string;
  tags?: string[];
  includedTargets?: Array<{
    identifier: string;
    name: string;
  }>;
  excludedTargets?: Array<{
    identifier: string;
    name: string;
  }>;
  rules?: Array<{
    attribute: string;
    op: string;
    values: string[];
  }>;
  createdAt: number;
  modifiedAt: number;
  version: number;
  [key: string]: unknown;
}

interface HarnessMetrics {
  flagIdentifier: string;
  environment: string;
  variationMetrics: Array<{
    variation: string;
    count: number;
    percentage: number;
  }>;
  totalEvaluations: number;
  [key: string]: unknown;
}

class HarnessClient {
  private baseUrl: string;
  private headers: {
    Authorization: string;
    'Content-Type': string;
    'Harness-Account': string;
  };
  private accountId: string;
  private orgId: string;
  private projectId: string;

  constructor(apiKey: string, accountId: string, orgId: string, projectId: string) {
    this.baseUrl = 'https://app.harness.io/gateway/cf/admin';
    this.accountId = accountId;
    this.orgId = orgId;
    this.projectId = projectId;
    this.headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Harness-Account': accountId,
    };
  }

  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
    body?: unknown
  ): Promise<unknown> {
    const url = `${this.baseUrl}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: this.headers,
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`Harness API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getFeatureFlags(
    environmentId: string
  ): Promise<{ features: HarnessFeatureFlag[] }> {
    const endpoint = `/features?accountIdentifier=${this.accountId}&orgIdentifier=${this.orgId}&projectIdentifier=${this.projectId}&environmentIdentifier=${environmentId}`;
    return (await this.makeRequest(endpoint)) as { features: HarnessFeatureFlag[] };
  }

  async getFeatureFlag(
    flagIdentifier: string,
    environmentId: string
  ): Promise<HarnessFeatureFlag> {
    const endpoint = `/features/${flagIdentifier}?accountIdentifier=${this.accountId}&orgIdentifier=${this.orgId}&projectIdentifier=${this.projectId}&environmentIdentifier=${environmentId}`;
    return (await this.makeRequest(endpoint)) as HarnessFeatureFlag;
  }

  async createFeatureFlag(flagData: {
    identifier: string;
    name: string;
    description?: string;
    kind: 'boolean' | 'int' | 'string' | 'json';
    permanent?: boolean;
    tags?: string[];
    variations: Array<{
      identifier: string;
      name: string;
      value: string | boolean | number | object;
      description?: string;
    }>;
    defaultOnVariation: string;
    defaultOffVariation: string;
  }): Promise<HarnessFeatureFlag> {
    const endpoint = `/features?accountIdentifier=${this.accountId}&orgIdentifier=${this.orgId}&projectIdentifier=${this.projectId}`;
    return (await this.makeRequest(endpoint, 'POST', flagData)) as HarnessFeatureFlag;
  }

  async updateFeatureFlag(
    flagIdentifier: string,
    environmentId: string,
    instructions: Array<{
      kind: string;
      parameters?: Record<string, unknown>;
    }>
  ): Promise<HarnessFeatureFlag> {
    const endpoint = `/features/${flagIdentifier}?accountIdentifier=${this.accountId}&orgIdentifier=${this.orgId}&projectIdentifier=${this.projectId}&environmentIdentifier=${environmentId}`;
    return (await this.makeRequest(endpoint, 'PATCH', {
      instructions,
    })) as HarnessFeatureFlag;
  }

  async toggleFeatureFlag(
    flagIdentifier: string,
    environmentId: string,
    state: 'on' | 'off'
  ): Promise<HarnessFeatureFlag> {
    const instruction = {
      kind: state === 'on' ? 'setFeatureFlagState' : 'setFeatureFlagState',
      parameters: {
        state,
      },
    };
    return this.updateFeatureFlag(flagIdentifier, environmentId, [instruction]);
  }

  async deleteFeatureFlag(flagIdentifier: string): Promise<void> {
    const endpoint = `/features/${flagIdentifier}?accountIdentifier=${this.accountId}&orgIdentifier=${this.orgId}&projectIdentifier=${this.projectId}`;
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Harness API error: ${response.status} ${response.statusText}`);
    }
  }

  async getTargets(environmentId: string): Promise<{ targets: HarnessTarget[] }> {
    const endpoint = `/targets?accountIdentifier=${this.accountId}&orgIdentifier=${this.orgId}&projectIdentifier=${this.projectId}&environmentIdentifier=${environmentId}`;
    return (await this.makeRequest(endpoint)) as { targets: HarnessTarget[] };
  }

  async getTargetGroups(
    environmentId: string
  ): Promise<{ targetGroups: HarnessTargetGroup[] }> {
    const endpoint = `/target-groups?accountIdentifier=${this.accountId}&orgIdentifier=${this.orgId}&projectIdentifier=${this.projectId}&environmentIdentifier=${environmentId}`;
    return (await this.makeRequest(endpoint)) as { targetGroups: HarnessTargetGroup[] };
  }

  async getFeatureFlagMetrics(
    flagIdentifier: string,
    environmentId: string,
    fromTimestamp?: number,
    toTimestamp?: number
  ): Promise<HarnessMetrics> {
    let endpoint = `/metrics/flags/${flagIdentifier}?accountIdentifier=${this.accountId}&orgIdentifier=${this.orgId}&projectIdentifier=${this.projectId}&environmentIdentifier=${environmentId}`;

    if (fromTimestamp) {
      endpoint += `&from=${fromTimestamp}`;
    }
    if (toTimestamp) {
      endpoint += `&to=${toTimestamp}`;
    }

    return (await this.makeRequest(endpoint)) as HarnessMetrics;
  }
}

export const HarnessConnectorConfig = mcpConnectorConfig({
  name: 'Harness',
  key: 'harness',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/harness/filled/svg',
  credentials: z.object({
    apiKey: z
      .string()
      .describe(
        'Harness API Key from Personal Access Tokens :: har_platform_1234567890abcdef :: https://developer.harness.io/docs/platform/automation/api/add-and-manage-api-keys/'
      ),
    accountId: z
      .string()
      .describe(
        'Harness Account Identifier :: wlgELJ0TTre5aZhzpt8gVA :: Found in Account Settings'
      ),
    orgId: z
      .string()
      .describe(
        'Harness Organization Identifier :: default :: Found in Organization Settings'
      ),
    projectId: z
      .string()
      .describe(
        'Harness Project Identifier :: default_project :: Found in Project Settings'
      ),
  }),
  setup: z.object({}),
  examplePrompt:
    'Get all feature flags in the production environment, toggle the beta_features flag to on, check the usage metrics for user_dashboard_v2 flag, and create a new feature flag for the mobile app.',
  tools: (tool) => ({
    GET_FEATURE_FLAGS: tool({
      name: 'harness_get_feature_flags',
      description: 'Get all feature flags for a specific environment',
      schema: z.object({
        environmentId: z
          .string()
          .describe('Environment identifier (e.g., production, staging, dev)'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, accountId, orgId, projectId } = await context.getCredentials();
          const client = new HarnessClient(apiKey, accountId, orgId, projectId);
          const result = await client.getFeatureFlags(args.environmentId);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to get feature flags: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_FEATURE_FLAG: tool({
      name: 'harness_get_feature_flag',
      description: 'Get detailed information about a specific feature flag',
      schema: z.object({
        flagIdentifier: z.string().describe('Feature flag identifier'),
        environmentId: z
          .string()
          .describe('Environment identifier (e.g., production, staging, dev)'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, accountId, orgId, projectId } = await context.getCredentials();
          const client = new HarnessClient(apiKey, accountId, orgId, projectId);
          const result = await client.getFeatureFlag(
            args.flagIdentifier,
            args.environmentId
          );
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to get feature flag: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    CREATE_FEATURE_FLAG: tool({
      name: 'harness_create_feature_flag',
      description: 'Create a new feature flag',
      schema: z.object({
        identifier: z.string().describe('Unique feature flag identifier'),
        name: z.string().describe('Human-readable feature flag name'),
        description: z.string().optional().describe('Feature flag description'),
        kind: z
          .enum(['boolean', 'int', 'string', 'json'])
          .describe('Type of feature flag'),
        permanent: z.boolean().optional().describe('Whether the flag is permanent'),
        tags: z.array(z.string()).optional().describe('Tags for organizing flags'),
        variations: z
          .array(
            z.object({
              identifier: z.string().describe('Variation identifier'),
              name: z.string().describe('Variation name'),
              value: z
                .union([z.string(), z.boolean(), z.number(), z.object({})])
                .describe('Variation value'),
              description: z.string().optional().describe('Variation description'),
            })
          )
          .describe('Available variations for the flag'),
        defaultOnVariation: z.string().describe('Default variation when flag is on'),
        defaultOffVariation: z.string().describe('Default variation when flag is off'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, accountId, orgId, projectId } = await context.getCredentials();
          const client = new HarnessClient(apiKey, accountId, orgId, projectId);
          const result = await client.createFeatureFlag(args);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to create feature flag: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    TOGGLE_FEATURE_FLAG: tool({
      name: 'harness_toggle_feature_flag',
      description: 'Turn a feature flag on or off in a specific environment',
      schema: z.object({
        flagIdentifier: z.string().describe('Feature flag identifier'),
        environmentId: z
          .string()
          .describe('Environment identifier (e.g., production, staging, dev)'),
        state: z.enum(['on', 'off']).describe('New state for the feature flag'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, accountId, orgId, projectId } = await context.getCredentials();
          const client = new HarnessClient(apiKey, accountId, orgId, projectId);
          const result = await client.toggleFeatureFlag(
            args.flagIdentifier,
            args.environmentId,
            args.state
          );
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to toggle feature flag: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    UPDATE_FEATURE_FLAG: tool({
      name: 'harness_update_feature_flag',
      description: 'Update a feature flag with custom instructions',
      schema: z.object({
        flagIdentifier: z.string().describe('Feature flag identifier'),
        environmentId: z
          .string()
          .describe('Environment identifier (e.g., production, staging, dev)'),
        instructions: z
          .array(
            z.object({
              kind: z
                .string()
                .describe(
                  'Type of instruction (e.g., setFeatureFlagState, updateDefaultServe)'
                ),
              parameters: z
                .record(z.unknown())
                .optional()
                .describe('Parameters for the instruction'),
            })
          )
          .describe('Array of update instructions'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, accountId, orgId, projectId } = await context.getCredentials();
          const client = new HarnessClient(apiKey, accountId, orgId, projectId);
          const result = await client.updateFeatureFlag(
            args.flagIdentifier,
            args.environmentId,
            args.instructions
          );
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to update feature flag: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    DELETE_FEATURE_FLAG: tool({
      name: 'harness_delete_feature_flag',
      description: 'Delete a feature flag (use with caution)',
      schema: z.object({
        flagIdentifier: z.string().describe('Feature flag identifier to delete'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, accountId, orgId, projectId } = await context.getCredentials();
          const client = new HarnessClient(apiKey, accountId, orgId, projectId);
          await client.deleteFeatureFlag(args.flagIdentifier);
          return `Feature flag ${args.flagIdentifier} deleted successfully`;
        } catch (error) {
          return `Failed to delete feature flag: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_TARGETS: tool({
      name: 'harness_get_targets',
      description:
        'Get all targets (users/entities) for feature flag evaluation in an environment',
      schema: z.object({
        environmentId: z
          .string()
          .describe('Environment identifier (e.g., production, staging, dev)'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, accountId, orgId, projectId } = await context.getCredentials();
          const client = new HarnessClient(apiKey, accountId, orgId, projectId);
          const result = await client.getTargets(args.environmentId);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to get targets: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_TARGET_GROUPS: tool({
      name: 'harness_get_target_groups',
      description:
        'Get all target groups (segments) for feature flag targeting in an environment',
      schema: z.object({
        environmentId: z
          .string()
          .describe('Environment identifier (e.g., production, staging, dev)'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, accountId, orgId, projectId } = await context.getCredentials();
          const client = new HarnessClient(apiKey, accountId, orgId, projectId);
          const result = await client.getTargetGroups(args.environmentId);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to get target groups: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_FEATURE_FLAG_METRICS: tool({
      name: 'harness_get_feature_flag_metrics',
      description: 'Get usage metrics and analytics for a specific feature flag',
      schema: z.object({
        flagIdentifier: z.string().describe('Feature flag identifier'),
        environmentId: z
          .string()
          .describe('Environment identifier (e.g., production, staging, dev)'),
        fromTimestamp: z
          .number()
          .optional()
          .describe('Start timestamp for metrics (Unix timestamp in milliseconds)'),
        toTimestamp: z
          .number()
          .optional()
          .describe('End timestamp for metrics (Unix timestamp in milliseconds)'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, accountId, orgId, projectId } = await context.getCredentials();
          const client = new HarnessClient(apiKey, accountId, orgId, projectId);
          const result = await client.getFeatureFlagMetrics(
            args.flagIdentifier,
            args.environmentId,
            args.fromTimestamp,
            args.toTimestamp
          );
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to get feature flag metrics: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

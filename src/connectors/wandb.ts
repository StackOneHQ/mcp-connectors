import { z } from 'zod';
import { mcpConnectorConfig } from '../config-types';

interface WandbProject {
  id: string;
  name: string;
  entity: string;
  description?: string;
  created_at: string;
  updated_at: string;
  repo?: string;
  default_access: string;
}

interface WandbRun {
  id: string;
  name: string;
  display_name?: string;
  state: string;
  project: string;
  entity: string;
  created_at: string;
  updated_at: string;
  finished_at?: string;
  config: Record<string, unknown>;
  summary: Record<string, unknown>;
  notes?: string;
  tags: string[];
  group?: string;
  job_type?: string;
  url: string;
}

interface WandbArtifact {
  id: string;
  name: string;
  type: string;
  description?: string;
  size: number;
  digest: string;
  state: string;
  created_at: string;
  updated_at: string;
  version: string;
  aliases: string[];
  tags: string[];
  url: string;
}

interface WandbMetric {
  timestamp: number;
  step: number;
  values: Record<string, number | string>;
}

interface WandbProjectsResponse {
  projects?: WandbProject[];
}

interface WandbRunsResponse {
  runs: WandbRun[];
  total: number;
}

interface WandbArtifactsResponse {
  artifacts: WandbArtifact[];
  total: number;
}

interface WandbHistoryResponse {
  history: WandbMetric[];
}

interface WandbUserResponse {
  username: string;
  email: string;
  teams: string[];
}

class WandbClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = 'https://api.wandb.ai') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async makeRequest(
    endpoint: string,
    options: {
      method?: string;
      body?: unknown;
      params?: Record<string, string>;
    } = {}
  ): Promise<unknown> {
    const { method = 'GET', body, params } = options;

    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`W&B API Error (${response.status}): ${errorText}`);
    }

    // Handle responses with no content (like 204)
    if (
      response.status === 204 ||
      !response.headers.get('content-type')?.includes('application/json')
    ) {
      return null;
    }

    return await response.json();
  }

  async getProjects(entity?: string): Promise<WandbProject[]> {
    const endpoint = entity ? `/api/v1/projects/${entity}` : '/api/v1/projects';
    const response = (await this.makeRequest(endpoint)) as
      | WandbProjectsResponse
      | WandbProject[];
    return Array.isArray(response) ? response : response.projects || [];
  }

  async getProject(entity: string, project: string): Promise<WandbProject> {
    const endpoint = `/api/v1/projects/${entity}/${project}`;
    return (await this.makeRequest(endpoint)) as WandbProject;
  }

  async createProject(
    entity: string,
    name: string,
    description?: string,
    visibility: 'public' | 'private' = 'private'
  ): Promise<WandbProject> {
    const endpoint = `/api/v1/projects/${entity}`;
    const body = {
      name,
      description,
      default_access: visibility,
    };
    return (await this.makeRequest(endpoint, { method: 'POST', body })) as WandbProject;
  }

  async getRuns(
    entity: string,
    project: string,
    options: {
      limit?: number;
      offset?: number;
      state?: string;
      tags?: string[];
    } = {}
  ): Promise<{ runs: WandbRun[]; total: number }> {
    const endpoint = `/api/v1/runs/${entity}/${project}`;
    const params: Record<string, string> = {};

    if (options.limit) params.limit = options.limit.toString();
    if (options.offset) params.offset = options.offset.toString();
    if (options.state) params.state = options.state;
    if (options.tags?.length) params.tags = options.tags.join(',');

    const response = await this.makeRequest(endpoint, { params });
    return {
      runs: (response as WandbRunsResponse).runs || [],
      total: (response as WandbRunsResponse).total || 0,
    };
  }

  async getRun(entity: string, project: string, runId: string): Promise<WandbRun> {
    const endpoint = `/api/v1/runs/${entity}/${project}/${runId}`;
    return (await this.makeRequest(endpoint)) as WandbRun;
  }

  async createRun(
    entity: string,
    project: string,
    data: {
      name?: string;
      display_name?: string;
      notes?: string;
      tags?: string[];
      config?: Record<string, unknown>;
      group?: string;
      job_type?: string;
    }
  ): Promise<WandbRun> {
    const endpoint = `/api/v1/runs/${entity}/${project}`;
    return (await this.makeRequest(endpoint, { method: 'POST', body: data })) as WandbRun;
  }

  async updateRun(
    entity: string,
    project: string,
    runId: string,
    data: {
      display_name?: string;
      notes?: string;
      tags?: string[];
      summary?: Record<string, unknown>;
    }
  ): Promise<WandbRun> {
    const endpoint = `/api/v1/runs/${entity}/${project}/${runId}`;
    return (await this.makeRequest(endpoint, { method: 'PUT', body: data })) as WandbRun;
  }

  async deleteRun(entity: string, project: string, runId: string): Promise<void> {
    const endpoint = `/api/v1/runs/${entity}/${project}/${runId}`;
    await this.makeRequest(endpoint, { method: 'DELETE' });
  }

  async logMetrics(
    entity: string,
    project: string,
    runId: string,
    metrics: Record<string, number | string>,
    step?: number
  ): Promise<void> {
    const endpoint = `/api/v1/runs/${entity}/${project}/${runId}/history`;
    const body = {
      history: [
        {
          ...metrics,
          _step: step || 0,
          _timestamp: Date.now() / 1000,
        },
      ],
    };
    await this.makeRequest(endpoint, { method: 'POST', body });
  }

  async getArtifacts(
    entity: string,
    project: string,
    options: {
      type?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ artifacts: WandbArtifact[]; total: number }> {
    const endpoint = `/api/v1/artifacts/${entity}/${project}`;
    const params: Record<string, string> = {};

    if (options.type) params.type = options.type;
    if (options.limit) params.limit = options.limit.toString();
    if (options.offset) params.offset = options.offset.toString();

    const response = await this.makeRequest(endpoint, { params });
    return {
      artifacts: (response as WandbArtifactsResponse).artifacts || [],
      total: (response as WandbArtifactsResponse).total || 0,
    };
  }

  async getArtifact(
    entity: string,
    project: string,
    artifactName: string,
    version?: string
  ): Promise<WandbArtifact> {
    const artifactId = version ? `${artifactName}:${version}` : `${artifactName}:latest`;
    const endpoint = `/api/v1/artifacts/${entity}/${project}/${artifactId}`;
    return (await this.makeRequest(endpoint)) as WandbArtifact;
  }

  async getRunHistory(
    entity: string,
    project: string,
    runId: string,
    options: {
      keys?: string[];
      samples?: number;
      minStep?: number;
      maxStep?: number;
    } = {}
  ): Promise<WandbMetric[]> {
    const endpoint = `/api/v1/runs/${entity}/${project}/${runId}/history`;
    const params: Record<string, string> = {};

    if (options.keys?.length) params.keys = options.keys.join(',');
    if (options.samples) params.samples = options.samples.toString();
    if (options.minStep !== undefined) params.min_step = options.minStep.toString();
    if (options.maxStep !== undefined) params.max_step = options.maxStep.toString();

    const response = await this.makeRequest(endpoint, { params });
    return (response as WandbHistoryResponse).history || [];
  }

  async getMe(): Promise<{ username: string; email: string; teams: string[] }> {
    const endpoint = '/api/v1/viewer';
    return (await this.makeRequest(endpoint)) as WandbUserResponse;
  }
}

export const WandbConnectorConfig = mcpConnectorConfig({
  name: 'Weights and Biases',
  key: 'wandb',
  version: '1.0.0',
  logo: 'https://avatars.githubusercontent.com/u/26401354?s=200&v=4',
  credentials: z.object({
    api_key: z
      .string()
      .describe(
        'W&B API Key from wandb.ai/authorize or Settings > API keys :: local-1234567890abcdefghijklmnopqrstuv'
      ),
    base_url: z
      .string()
      .optional()
      .describe('W&B API Base URL (defaults to https://api.wandb.ai)'),
  }),
  setup: z.object({}),
  examplePrompt:
    'List my W&B projects, create a new run for training a model, log some metrics during training, and retrieve the best performing runs from my project.',
  tools: (tool) => ({
    GET_ME: tool({
      name: 'wandb_get_me',
      description: 'Get information about the authenticated user',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { api_key, base_url } = await context.getCredentials();
          const client = new WandbClient(api_key, base_url);
          const user = await client.getMe();
          return JSON.stringify(user, null, 2);
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    LIST_PROJECTS: tool({
      name: 'wandb_list_projects',
      description: 'List W&B projects for an entity',
      schema: z.object({
        entity: z
          .string()
          .optional()
          .describe(
            'Entity name (username or team). If not provided, lists all accessible projects'
          ),
      }),
      handler: async (args, context) => {
        try {
          const { api_key, base_url } = await context.getCredentials();
          const client = new WandbClient(api_key, base_url);
          const projects = await client.getProjects(args.entity);
          return JSON.stringify(projects, null, 2);
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_PROJECT: tool({
      name: 'wandb_get_project',
      description: 'Get details of a specific W&B project',
      schema: z.object({
        entity: z.string().describe('Entity name (username or team)'),
        project: z.string().describe('Project name'),
      }),
      handler: async (args, context) => {
        try {
          const { api_key, base_url } = await context.getCredentials();
          const client = new WandbClient(api_key, base_url);
          const project = await client.getProject(args.entity, args.project);
          return JSON.stringify(project, null, 2);
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    CREATE_PROJECT: tool({
      name: 'wandb_create_project',
      description: 'Create a new W&B project',
      schema: z.object({
        entity: z.string().describe('Entity name (username or team)'),
        name: z.string().describe('Project name'),
        description: z.string().optional().describe('Project description'),
        visibility: z
          .enum(['public', 'private'])
          .optional()
          .default('private')
          .describe('Project visibility'),
      }),
      handler: async (args, context) => {
        try {
          const { api_key, base_url } = await context.getCredentials();
          const client = new WandbClient(api_key, base_url);
          const project = await client.createProject(
            args.entity,
            args.name,
            args.description,
            args.visibility
          );
          return JSON.stringify(project, null, 2);
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    LIST_RUNS: tool({
      name: 'wandb_list_runs',
      description: 'List runs in a W&B project',
      schema: z.object({
        entity: z.string().describe('Entity name (username or team)'),
        project: z.string().describe('Project name'),
        limit: z
          .number()
          .min(1)
          .max(1000)
          .optional()
          .describe('Number of runs to return (max 1000)'),
        offset: z.number().min(0).optional().describe('Number of runs to skip'),
        state: z
          .enum(['running', 'finished', 'failed', 'crashed'])
          .optional()
          .describe('Filter by run state'),
        tags: z.array(z.string()).optional().describe('Filter by tags'),
      }),
      handler: async (args, context) => {
        try {
          const { api_key, base_url } = await context.getCredentials();
          const client = new WandbClient(api_key, base_url);
          const result = await client.getRuns(args.entity, args.project, {
            limit: args.limit,
            offset: args.offset,
            state: args.state,
            tags: args.tags,
          });
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_RUN: tool({
      name: 'wandb_get_run',
      description: 'Get details of a specific W&B run',
      schema: z.object({
        entity: z.string().describe('Entity name (username or team)'),
        project: z.string().describe('Project name'),
        run_id: z.string().describe('Run ID'),
      }),
      handler: async (args, context) => {
        try {
          const { api_key, base_url } = await context.getCredentials();
          const client = new WandbClient(api_key, base_url);
          const run = await client.getRun(args.entity, args.project, args.run_id);
          return JSON.stringify(run, null, 2);
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    CREATE_RUN: tool({
      name: 'wandb_create_run',
      description: 'Create a new W&B run',
      schema: z.object({
        entity: z.string().describe('Entity name (username or team)'),
        project: z.string().describe('Project name'),
        name: z.string().optional().describe('Run name (auto-generated if not provided)'),
        display_name: z.string().optional().describe('Display name for the run'),
        notes: z.string().optional().describe('Run notes/description'),
        tags: z.array(z.string()).optional().describe('Tags for the run'),
        config: z
          .record(z.unknown())
          .optional()
          .describe('Configuration parameters for the run'),
        group: z.string().optional().describe('Group name for organizing related runs'),
        job_type: z
          .string()
          .optional()
          .describe('Job type (e.g., train, eval, preprocess)'),
      }),
      handler: async (args, context) => {
        try {
          const { api_key, base_url } = await context.getCredentials();
          const client = new WandbClient(api_key, base_url);
          const run = await client.createRun(args.entity, args.project, {
            name: args.name,
            display_name: args.display_name,
            notes: args.notes,
            tags: args.tags,
            config: args.config,
            group: args.group,
            job_type: args.job_type,
          });
          return JSON.stringify(run, null, 2);
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    UPDATE_RUN: tool({
      name: 'wandb_update_run',
      description: 'Update an existing W&B run',
      schema: z.object({
        entity: z.string().describe('Entity name (username or team)'),
        project: z.string().describe('Project name'),
        run_id: z.string().describe('Run ID'),
        display_name: z.string().optional().describe('Display name for the run'),
        notes: z.string().optional().describe('Run notes/description'),
        tags: z.array(z.string()).optional().describe('Tags for the run'),
        summary: z.record(z.unknown()).optional().describe('Summary metrics for the run'),
      }),
      handler: async (args, context) => {
        try {
          const { api_key, base_url } = await context.getCredentials();
          const client = new WandbClient(api_key, base_url);
          const run = await client.updateRun(args.entity, args.project, args.run_id, {
            display_name: args.display_name,
            notes: args.notes,
            tags: args.tags,
            summary: args.summary,
          });
          return JSON.stringify(run, null, 2);
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    DELETE_RUN: tool({
      name: 'wandb_delete_run',
      description: 'Delete a W&B run',
      schema: z.object({
        entity: z.string().describe('Entity name (username or team)'),
        project: z.string().describe('Project name'),
        run_id: z.string().describe('Run ID'),
      }),
      handler: async (args, context) => {
        try {
          const { api_key, base_url } = await context.getCredentials();
          const client = new WandbClient(api_key, base_url);
          await client.deleteRun(args.entity, args.project, args.run_id);
          return 'Run deleted successfully';
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    LOG_METRICS: tool({
      name: 'wandb_log_metrics',
      description: 'Log metrics to a W&B run',
      schema: z.object({
        entity: z.string().describe('Entity name (username or team)'),
        project: z.string().describe('Project name'),
        run_id: z.string().describe('Run ID'),
        metrics: z.record(z.union([z.number(), z.string()])).describe('Metrics to log'),
        step: z.number().optional().describe('Step number for the metrics'),
      }),
      handler: async (args, context) => {
        try {
          const { api_key, base_url } = await context.getCredentials();
          const client = new WandbClient(api_key, base_url);
          await client.logMetrics(
            args.entity,
            args.project,
            args.run_id,
            args.metrics,
            args.step
          );
          return 'Metrics logged successfully';
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_RUN_HISTORY: tool({
      name: 'wandb_get_run_history',
      description: 'Get logged metrics history for a W&B run',
      schema: z.object({
        entity: z.string().describe('Entity name (username or team)'),
        project: z.string().describe('Project name'),
        run_id: z.string().describe('Run ID'),
        keys: z
          .array(z.string())
          .optional()
          .describe('Specific metric keys to retrieve (all if not specified)'),
        samples: z.number().optional().describe('Number of samples to return'),
        min_step: z.number().optional().describe('Minimum step to include'),
        max_step: z.number().optional().describe('Maximum step to include'),
      }),
      handler: async (args, context) => {
        try {
          const { api_key, base_url } = await context.getCredentials();
          const client = new WandbClient(api_key, base_url);
          const history = await client.getRunHistory(
            args.entity,
            args.project,
            args.run_id,
            {
              keys: args.keys,
              samples: args.samples,
              minStep: args.min_step,
              maxStep: args.max_step,
            }
          );
          return JSON.stringify(history, null, 2);
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    LIST_ARTIFACTS: tool({
      name: 'wandb_list_artifacts',
      description: 'List artifacts in a W&B project',
      schema: z.object({
        entity: z.string().describe('Entity name (username or team)'),
        project: z.string().describe('Project name'),
        type: z
          .string()
          .optional()
          .describe('Filter by artifact type (e.g., dataset, model)'),
        limit: z
          .number()
          .min(1)
          .max(1000)
          .optional()
          .describe('Number of artifacts to return'),
        offset: z.number().min(0).optional().describe('Number of artifacts to skip'),
      }),
      handler: async (args, context) => {
        try {
          const { api_key, base_url } = await context.getCredentials();
          const client = new WandbClient(api_key, base_url);
          const result = await client.getArtifacts(args.entity, args.project, {
            type: args.type,
            limit: args.limit,
            offset: args.offset,
          });
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_ARTIFACT: tool({
      name: 'wandb_get_artifact',
      description: 'Get details of a specific W&B artifact',
      schema: z.object({
        entity: z.string().describe('Entity name (username or team)'),
        project: z.string().describe('Project name'),
        artifact_name: z.string().describe('Artifact name'),
        version: z
          .string()
          .optional()
          .describe('Artifact version (defaults to "latest")'),
      }),
      handler: async (args, context) => {
        try {
          const { api_key, base_url } = await context.getCredentials();
          const client = new WandbClient(api_key, base_url);
          const artifact = await client.getArtifact(
            args.entity,
            args.project,
            args.artifact_name,
            args.version
          );
          return JSON.stringify(artifact, null, 2);
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

export default WandbConnectorConfig;

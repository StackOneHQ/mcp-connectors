import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface LangsmithRun {
  id: string;
  name?: string;
  run_type: string;
  status: string;
  start_time: string;
  end_time?: string;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  error?: string;
  execution_order?: number;
  session_id?: string;
  parent_run_id?: string;
  tags?: string[];
  extra?: Record<string, unknown>;
}

interface LangsmithPrompt {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  template: string;
  template_format?: string;
  input_variables?: string[];
  tags?: string[];
  prompt_config?: Record<string, unknown>;
}

interface LangsmithSession {
  id: string;
  name?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
  extra?: Record<string, unknown>;
  run_count?: number;
}

class LangsmithClient {
  private headers: { Authorization: string; 'Content-Type': string };
  private baseUrl = 'https://api.smith.langchain.com';

  constructor(apiKey: string) {
    this.headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async getThreadHistory(
    sessionId: string,
    limit = 50,
    offset = 0
  ): Promise<LangsmithRun[]> {
    const params = new URLSearchParams({
      session: sessionId,
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const response = await fetch(`${this.baseUrl}/runs?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Langsmith API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { runs?: LangsmithRun[] };
    return result.runs || [];
  }

  async getPrompts(
    limit = 50,
    offset = 0,
    nameContains?: string,
    isPublic?: boolean
  ): Promise<LangsmithPrompt[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    if (nameContains) {
      params.append('name_contains', nameContains);
    }

    if (isPublic !== undefined) {
      params.append('is_public', isPublic.toString());
    }

    const response = await fetch(`${this.baseUrl}/prompts?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Langsmith API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { prompts?: LangsmithPrompt[] };
    return result.prompts || [];
  }

  async pullPrompt(promptName: string, version?: string): Promise<LangsmithPrompt> {
    let url = `${this.baseUrl}/prompts/${encodeURIComponent(promptName)}`;
    if (version) {
      url += `?version=${encodeURIComponent(version)}`;
    }

    const response = await fetch(url, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Langsmith API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<LangsmithPrompt>;
  }

  async getSessions(
    limit = 50,
    offset = 0,
    nameContains?: string
  ): Promise<LangsmithSession[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    if (nameContains) {
      params.append('name_contains', nameContains);
    }

    const response = await fetch(`${this.baseUrl}/sessions?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Langsmith API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { sessions?: LangsmithSession[] };
    return result.sessions || [];
  }

  async getSession(sessionId: string): Promise<LangsmithSession> {
    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Langsmith API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<LangsmithSession>;
  }

  async getRun(runId: string): Promise<LangsmithRun> {
    const response = await fetch(`${this.baseUrl}/runs/${runId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Langsmith API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<LangsmithRun>;
  }

  async searchRuns(
    query?: string,
    sessionId?: string,
    runType?: string,
    status?: string,
    limit = 50,
    offset = 0
  ): Promise<LangsmithRun[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    if (query) {
      params.append('query', query);
    }

    if (sessionId) {
      params.append('session', sessionId);
    }

    if (runType) {
      params.append('run_type', runType);
    }

    if (status) {
      params.append('status', status);
    }

    const response = await fetch(`${this.baseUrl}/runs?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Langsmith API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { runs?: LangsmithRun[] };
    return result.runs || [];
  }
}

export const LangsmithConnectorConfig = mcpConnectorConfig({
  name: 'LangSmith',
  key: 'langsmith',
  logo: 'https://stackone-logos.com/api/langsmith/filled/svg',
  version: '1.0.0',
  credentials: z.object({
    apiKey: z
      .string()
      .describe(
        'Langsmith API key from your dashboard :: lsv2_pt_1234567890abcdef1234567890abcdef_123456 :: https://docs.smith.langchain.com/administration/how_to_guides/organization_management/create_account_api_key'
      ),
  }),
  description:
    'LangSmith is a platform for monitoring and managing LLM applications. It allows you to create datasets, iterate on prompts, and run evaluations.',
  setup: z.object({}),
  examplePrompt:
    'Get my recent prompts, pull the "customer-support-agent" prompt, and search for all successful LLM runs from the last 24 hours in my main session.',
  tools: (tool) => ({
    GET_THREAD_HISTORY: tool({
      name: 'langsmith_get_thread_history',
      description: 'Fetch conversation history for a specific session/thread',
      schema: z.object({
        sessionId: z.string().describe('The session ID to get history for'),
        limit: z.number().default(50).describe('Maximum number of runs to return'),
        offset: z.number().default(0).describe('Number of runs to skip'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new LangsmithClient(apiKey);
          const history = await client.getThreadHistory(
            args.sessionId,
            args.limit,
            args.offset
          );
          return JSON.stringify(history, null, 2);
        } catch (error) {
          return `Failed to get thread history: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_PROMPTS: tool({
      name: 'langsmith_get_prompts',
      description: 'Retrieve prompts with optional filtering',
      schema: z.object({
        limit: z.number().default(50).describe('Maximum number of prompts to return'),
        offset: z.number().default(0).describe('Number of prompts to skip'),
        nameContains: z
          .string()
          .optional()
          .describe('Filter prompts by name containing this string'),
        isPublic: z.boolean().optional().describe('Filter by public/private prompts'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new LangsmithClient(apiKey);
          const prompts = await client.getPrompts(
            args.limit,
            args.offset,
            args.nameContains,
            args.isPublic
          );
          return JSON.stringify(prompts, null, 2);
        } catch (error) {
          return `Failed to get prompts: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    PULL_PROMPT: tool({
      name: 'langsmith_pull_prompt',
      description: 'Get a specific prompt by name and optional version',
      schema: z.object({
        promptName: z.string().describe('The name of the prompt to retrieve'),
        version: z
          .string()
          .optional()
          .describe('Specific version of the prompt (defaults to latest)'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new LangsmithClient(apiKey);
          const prompt = await client.pullPrompt(args.promptName, args.version);
          return JSON.stringify(prompt, null, 2);
        } catch (error) {
          return `Failed to pull prompt: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_SESSIONS: tool({
      name: 'langsmith_get_sessions',
      description: 'List all sessions with optional filtering',
      schema: z.object({
        limit: z.number().default(50).describe('Maximum number of sessions to return'),
        offset: z.number().default(0).describe('Number of sessions to skip'),
        nameContains: z
          .string()
          .optional()
          .describe('Filter sessions by name containing this string'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new LangsmithClient(apiKey);
          const sessions = await client.getSessions(
            args.limit,
            args.offset,
            args.nameContains
          );
          return JSON.stringify(sessions, null, 2);
        } catch (error) {
          return `Failed to get sessions: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_SESSION: tool({
      name: 'langsmith_get_session',
      description: 'Get details of a specific session',
      schema: z.object({
        sessionId: z.string().describe('The session ID to retrieve'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new LangsmithClient(apiKey);
          const session = await client.getSession(args.sessionId);
          return JSON.stringify(session, null, 2);
        } catch (error) {
          return `Failed to get session: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_RUN: tool({
      name: 'langsmith_get_run',
      description: 'Get details of a specific run',
      schema: z.object({
        runId: z.string().describe('The run ID to retrieve'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new LangsmithClient(apiKey);
          const run = await client.getRun(args.runId);
          return JSON.stringify(run, null, 2);
        } catch (error) {
          return `Failed to get run: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    SEARCH_RUNS: tool({
      name: 'langsmith_search_runs',
      description: 'Search runs with various filters',
      schema: z.object({
        query: z.string().optional().describe('Search query string'),
        sessionId: z.string().optional().describe('Filter by session ID'),
        runType: z
          .string()
          .optional()
          .describe('Filter by run type (e.g., llm, chain, tool)'),
        status: z.string().optional().describe('Filter by status (e.g., success, error)'),
        limit: z.number().default(50).describe('Maximum number of runs to return'),
        offset: z.number().default(0).describe('Number of runs to skip'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new LangsmithClient(apiKey);
          const runs = await client.searchRuns(
            args.query,
            args.sessionId,
            args.runType,
            args.status,
            args.limit,
            args.offset
          );
          return JSON.stringify(runs, null, 2);
        } catch (error) {
          return `Failed to search runs: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

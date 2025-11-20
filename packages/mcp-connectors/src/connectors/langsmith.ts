import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ConnectorMetadata } from '../types/metadata';

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

export interface LangsmithCredentials {
  apiKey: string;
}

export const LangsmithCredentialsSchema = z.object({
  apiKey: z.string().describe('API key for authentication'),
});

export const LangsmithConnectorMetadata = {
  key: 'langsmith',
  name: 'LangSmith',
  description: 'LLM application monitoring',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/langsmith/filled/svg',
  examplePrompt: 'View LangSmith traces',
  categories: ['ai', 'monitoring'],
  credentialsSchema: LangsmithCredentialsSchema,
} as const satisfies ConnectorMetadata;

export function createLangsmithServer(credentials: LangsmithCredentials): McpServer {
  const server = new McpServer({
    name: 'LangSmith',
    version: '1.0.0',
  });

  server.tool(
    'langsmith_get_thread_history',
    'Fetch conversation history for a specific session/thread',
    {
      sessionId: z.string().describe('The session ID to get history for'),
      limit: z.number().default(50).describe('Maximum number of runs to return'),
      offset: z.number().default(0).describe('Number of runs to skip'),
    },
    async (args) => {
      try {
        const client = new LangsmithClient(credentials.apiKey);
        const history = await client.getThreadHistory(
          args.sessionId,
          args.limit,
          args.offset
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(history, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get thread history: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'langsmith_get_prompts',
    'Retrieve prompts with optional filtering',
    {
      limit: z.number().default(50).describe('Maximum number of prompts to return'),
      offset: z.number().default(0).describe('Number of prompts to skip'),
      nameContains: z
        .string()
        .optional()
        .describe('Filter prompts by name containing this string'),
      isPublic: z.boolean().optional().describe('Filter by public/private prompts'),
    },
    async (args) => {
      try {
        const client = new LangsmithClient(credentials.apiKey);
        const prompts = await client.getPrompts(
          args.limit,
          args.offset,
          args.nameContains,
          args.isPublic
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(prompts, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get prompts: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'langsmith_pull_prompt',
    'Get a specific prompt by name and optional version',
    {
      promptName: z.string().describe('The name of the prompt to retrieve'),
      version: z
        .string()
        .optional()
        .describe('Specific version of the prompt (defaults to latest)'),
    },
    async (args) => {
      try {
        const client = new LangsmithClient(credentials.apiKey);
        const prompt = await client.pullPrompt(args.promptName, args.version);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(prompt, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to pull prompt: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'langsmith_get_sessions',
    'List all sessions with optional filtering',
    {
      limit: z.number().default(50).describe('Maximum number of sessions to return'),
      offset: z.number().default(0).describe('Number of sessions to skip'),
      nameContains: z
        .string()
        .optional()
        .describe('Filter sessions by name containing this string'),
    },
    async (args) => {
      try {
        const client = new LangsmithClient(credentials.apiKey);
        const sessions = await client.getSessions(
          args.limit,
          args.offset,
          args.nameContains
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(sessions, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get sessions: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'langsmith_get_session',
    'Get details of a specific session',
    {
      sessionId: z.string().describe('The session ID to retrieve'),
    },
    async (args) => {
      try {
        const client = new LangsmithClient(credentials.apiKey);
        const session = await client.getSession(args.sessionId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(session, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get session: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'langsmith_get_run',
    'Get details of a specific run',
    {
      runId: z.string().describe('The run ID to retrieve'),
    },
    async (args) => {
      try {
        const client = new LangsmithClient(credentials.apiKey);
        const run = await client.getRun(args.runId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(run, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get run: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'langsmith_search_runs',
    'Search runs with various filters',
    {
      query: z.string().optional().describe('Search query string'),
      sessionId: z.string().optional().describe('Filter by session ID'),
      runType: z
        .string()
        .optional()
        .describe('Filter by run type (e.g., llm, chain, tool)'),
      status: z.string().optional().describe('Filter by status (e.g., success, error)'),
      limit: z.number().default(50).describe('Maximum number of runs to return'),
      offset: z.number().default(0).describe('Number of runs to skip'),
    },
    async (args) => {
      try {
        const client = new LangsmithClient(credentials.apiKey);
        const runs = await client.searchRuns(
          args.query,
          args.sessionId,
          args.runType,
          args.status,
          args.limit,
          args.offset
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(runs, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to search runs: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  return server;
}

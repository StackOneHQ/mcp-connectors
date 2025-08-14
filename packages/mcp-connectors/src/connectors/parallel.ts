import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface ParallelSearchResult {
  url: string;
  title: string;
  content: string;
  relevance_score?: number;
}

interface ParallelSearchResponse {
  results: ParallelSearchResult[];
  total_results: number;
  search_time: number;
}

interface ParallelTaskResponse {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: Record<string, unknown>;
  error?: string;
}

interface ParallelChatResponse {
  response: string;
  sources?: Array<{
    url: string;
    title: string;
    snippet: string;
  }>;
}

class ParallelClient {
  private headers: { 'x-api-key': string; 'Content-Type': string };
  private baseUrl = 'https://api.parallel.ai';

  constructor(apiKey: string) {
    this.headers = {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    };
  }

  async search(
    objective?: string,
    searchQueries?: string[],
    processor: 'base' | 'pro' = 'base',
    maxResults = 5,
    maxCharsPerResult = 1500
  ): Promise<ParallelSearchResponse> {
    const payload: Record<string, unknown> = {
      processor,
      max_results: maxResults,
      max_chars_per_result: maxCharsPerResult,
    };

    if (objective) {
      payload.objective = objective;
    }

    if (searchQueries && searchQueries.length > 0) {
      payload.search_queries = searchQueries;
    }

    const response = await fetch(`${this.baseUrl}/alpha/search`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Parallel Search API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json() as Promise<ParallelSearchResponse>;
  }

  async createTask(
    objective: string,
    entities?: string[],
    maxResults = 10
  ): Promise<ParallelTaskResponse> {
    const payload: Record<string, unknown> = {
      objective,
      max_results: maxResults,
    };

    if (entities && entities.length > 0) {
      payload.entities = entities;
    }

    const response = await fetch(`${this.baseUrl}/alpha/task`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Parallel Task API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json() as Promise<ParallelTaskResponse>;
  }

  async getTaskStatus(taskId: string): Promise<ParallelTaskResponse> {
    const response = await fetch(`${this.baseUrl}/alpha/task/${taskId}`, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Parallel Task API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json() as Promise<ParallelTaskResponse>;
  }

  async chat(
    message: string,
    systemPrompt?: string,
    maxTokens = 2000
  ): Promise<ParallelChatResponse> {
    const payload: Record<string, unknown> = {
      message,
      max_tokens: maxTokens,
    };

    if (systemPrompt) {
      payload.system_prompt = systemPrompt;
    }

    const response = await fetch(`${this.baseUrl}/alpha/chat`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Parallel Chat API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json() as Promise<ParallelChatResponse>;
  }
}

const formatSearchResults = (response: ParallelSearchResponse): string => {
  if (response.results.length === 0) {
    return 'No search results found for your query.';
  }

  const output = [
    `Found ${response.total_results} search results (showing ${response.results.length}):\n`,
  ];

  for (let i = 0; i < response.results.length; i++) {
    const result = response.results[i];
    if (result) {
      output.push(`${i + 1}. ${result.title}`);
      output.push(`   URL: ${result.url}`);
      if (result.relevance_score) {
        output.push(`   Relevance: ${result.relevance_score}`);
      }
      output.push(`   Content: ${result.content.substring(0, 200)}...`);
      output.push(''); // Empty line between results
    }
  }

  output.push(`Search completed in ${response.search_time}s`);
  return output.join('\n');
};

export const ParallelConnectorConfig = mcpConnectorConfig({
  name: 'Parallel.ai',
  key: 'parallel',
  logo: 'https://parallel.ai/favicon.ico',
  version: '1.0.0',
  credentials: z.object({
    apiKey: z
      .string()
      .describe(
        'Parallel.ai API key from platform.parallel.ai :: PARALLEL_API_KEY_1234567890abcdef'
      ),
  }),
  setup: z.object({}),
  examplePrompt:
    'Search for "latest AI model developments 2024", create a research task about "enterprise AI adoption trends", and chat about the implications of these findings.',
  tools: (tool) => ({
    SEARCH: tool({
      name: 'parallel_search',
      description:
        'Perform AI-native web search using Parallel Search API with ranked URLs and extended content',
      schema: z.object({
        objective: z
          .string()
          .optional()
          .describe('The search objective or question to answer'),
        searchQueries: z
          .array(z.string())
          .optional()
          .describe('Specific search queries to execute'),
        processor: z
          .enum(['base', 'pro'])
          .default('base')
          .describe(
            'Search processor tier: base (2-5s, cost-effective) or pro (15-60s, best quality)'
          ),
        maxResults: z
          .number()
          .default(5)
          .describe('Maximum number of search results to return'),
        maxCharsPerResult: z
          .number()
          .default(1500)
          .describe('Maximum characters per search result content'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new ParallelClient(apiKey);

          if (
            !args.objective &&
            (!args.searchQueries || args.searchQueries.length === 0)
          ) {
            return 'Error: Either objective or searchQueries must be provided.';
          }

          const result = await client.search(
            args.objective,
            args.searchQueries,
            args.processor,
            args.maxResults,
            args.maxCharsPerResult
          );
          return formatSearchResults(result);
        } catch (error) {
          return `Failed to perform search: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    CREATE_TASK: tool({
      name: 'parallel_create_task',
      description:
        'Create a deep research task using Parallel Task API for comprehensive automated research',
      schema: z.object({
        objective: z
          .string()
          .describe('The research objective or question for deep investigation'),
        entities: z
          .array(z.string())
          .optional()
          .describe('Optional list of entities to research'),
        maxResults: z
          .number()
          .default(10)
          .describe('Maximum number of results to include in research'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new ParallelClient(apiKey);
          const result = await client.createTask(
            args.objective,
            args.entities,
            args.maxResults
          );

          if (result.status === 'pending' || result.status === 'processing') {
            return `Task created successfully. Task ID: ${result.task_id}. Status: ${result.status}. Use parallel_get_task_status to check progress.`;
          }

          return `Task completed immediately. Result: ${JSON.stringify(result.result, null, 2)}`;
        } catch (error) {
          return `Failed to create task: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_TASK_STATUS: tool({
      name: 'parallel_get_task_status',
      description: 'Check the status and retrieve results of a Parallel research task',
      schema: z.object({
        taskId: z.string().describe('The task ID returned from create_task'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new ParallelClient(apiKey);
          const result = await client.getTaskStatus(args.taskId);

          if (result.status === 'completed' && result.result) {
            return `Task completed successfully:\n\n${JSON.stringify(result.result, null, 2)}`;
          }
          if (result.status === 'failed') {
            return `Task failed: ${result.error || 'Unknown error'}`;
          }
          return `Task status: ${result.status}. Please check again later.`;
        } catch (error) {
          return `Failed to get task status: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    CHAT: tool({
      name: 'parallel_chat',
      description:
        'Get fast web-researched completions using Parallel Chat API with automatic source citations',
      schema: z.object({
        message: z.string().describe('The message or question to ask'),
        systemPrompt: z
          .string()
          .optional()
          .describe('Optional system prompt to set context and behavior'),
        maxTokens: z.number().default(2000).describe('Maximum tokens for the response'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new ParallelClient(apiKey);
          const result = await client.chat(
            args.message,
            args.systemPrompt,
            args.maxTokens
          );

          let output = result.response;

          if (result.sources && result.sources.length > 0) {
            output += '\n\nSources:\n';
            for (let i = 0; i < result.sources.length; i++) {
              const source = result.sources[i];
              if (source) {
                output += `${i + 1}. ${source.title}\n`;
                output += `   URL: ${source.url}\n`;
                output += `   Snippet: ${source.snippet}\n\n`;
              }
            }
          }

          return output;
        } catch (error) {
          return `Failed to chat: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

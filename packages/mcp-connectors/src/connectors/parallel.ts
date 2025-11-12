import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ConnectorMetadata } from '../types/metadata';

interface ParallelSearchResult {
  url: string;
  title: string;
  excerpts: string[];
}

interface ParallelSearchResponse {
  search_id: string;
  results: ParallelSearchResult[];
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
    maxResults = 5
  ): Promise<ParallelSearchResponse> {
    const payload: Record<string, unknown> = {
      processor,
      max_results: maxResults,
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
}

const formatSearchResults = (response: ParallelSearchResponse): string => {
  if (!response.results || response.results.length === 0) {
    return 'No search results found for your query.';
  }

  const output = [`Found ${response.results.length} search results:\n`];

  for (let i = 0; i < response.results.length; i++) {
    const result = response.results[i];
    if (!result) continue;

    output.push(`${i + 1}. ${result.title}`);
    output.push(`   URL: ${result.url}`);

    if (result.excerpts && result.excerpts.length > 0) {
      const contentPreview = result.excerpts.join(' ');
      const maxLength = 200;
      const preview =
        contentPreview.length > maxLength
          ? `${contentPreview.substring(0, maxLength)}...`
          : contentPreview;
      output.push(`   Content: ${preview}`);
    }

    output.push('');
  }

  return output.join('\n');
};

export const ParallelConnectorMetadata = {
  key: 'parallel',
  name: 'Parallel',
  description: 'Parallel processing',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/parallel/filled/svg',
  examplePrompt: 'Process tasks in parallel',
  categories: ['compute', 'processing'],
} as const satisfies ConnectorMetadata;

export interface ParallelCredentials {
  apiKey: string;
  processor?: 'base' | 'pro';
}

export function createParallelServer(credentials: ParallelCredentials): McpServer {
  const server = new McpServer({
    name: 'Parallel.ai',
    version: '1.0.0',
  });

  const processor = credentials.processor || 'base';

  server.tool(
    'parallel_search',
    'Perform AI-native web search using Parallel Search API',
    {
      objective: z
        .string()
        .optional()
        .describe('The search objective or question to answer'),
      searchQueries: z
        .array(z.string())
        .optional()
        .describe('Specific search queries to execute'),
      maxResults: z
        .number()
        .default(5)
        .describe('Maximum number of search results to return'),
    },
    async (args) => {
      try {
        const client = new ParallelClient(credentials.apiKey);

        if (!args.objective && (!args.searchQueries || args.searchQueries.length === 0)) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: Either objective or searchQueries must be provided.',
              },
            ],
          };
        }

        const result = await client.search(
          args.objective,
          args.searchQueries,
          processor,
          args.maxResults
        );
        return {
          content: [
            {
              type: 'text',
              text: formatSearchResults(result),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to perform search: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  return server;
}

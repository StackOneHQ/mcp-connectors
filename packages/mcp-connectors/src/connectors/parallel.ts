import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

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

    // Handle excerpts
    if (result.excerpts && result.excerpts.length > 0) {
      const contentPreview = result.excerpts.join(' ');
      const maxLength = 200;
      const preview =
        contentPreview.length > maxLength
          ? `${contentPreview.substring(0, maxLength)}...`
          : contentPreview;
      output.push(`   Content: ${preview}`);
    }

    output.push(''); // Empty line between results
  }

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
    'Search for "latest AI model developments 2024" or search with specific queries like ["machine learning", "transformer models"]',
  tools: (tool) => ({
    SEARCH: tool({
      name: 'parallel_search',
      description: 'Perform AI-native web search using Parallel Search API',
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
            args.maxResults
          );
          return formatSearchResults(result);
        } catch (error) {
          return `Failed to perform search: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface ExaSearchResult {
  id: string;
  url: string;
  title: string;
  score: number;
  publishedDate?: string;
  author?: string;
  text?: string;
  highlights?: string[];
  summary?: string;
}

interface ExaSearchResponse {
  results: ExaSearchResult[];
  autopromptString?: string;
}

const BASE_URL = 'https://api.exa.ai';

const performSearch = async (
  query: string,
  apiKey: string,
  options: {
    numResults?: number;
    includeText?: boolean;
    includeDomains?: string[];
    excludeDomains?: string[];
    startCrawlDate?: string;
    endCrawlDate?: string;
    startPublishedDate?: string;
    endPublishedDate?: string;
    useAutoprompt?: boolean;
    type?: 'neural' | 'keyword' | 'auto';
    category?:
      | 'company'
      | 'research paper'
      | 'news'
      | 'github'
      | 'tweet'
      | 'movie'
      | 'song'
      | 'personal site'
      | 'pdf';
    includeTextInResult?: boolean;
    livecrawl?: boolean;
  } = {}
): Promise<ExaSearchResponse> => {
  console.info(`Searching Exa for: ${query}`);

  const requestBody = {
    query,
    numResults: options.numResults || 10,
    includeDomains: options.includeDomains,
    excludeDomains: options.excludeDomains,
    startCrawlDate: options.startCrawlDate,
    endCrawlDate: options.endCrawlDate,
    startPublishedDate: options.startPublishedDate,
    endPublishedDate: options.endPublishedDate,
    useAutoprompt: options.useAutoprompt,
    type: options.type || 'auto',
    category: options.category,
    text: options.includeTextInResult,
    livecrawl: options.livecrawl,
  };

  // Remove undefined values
  const cleanedBody = Object.fromEntries(
    Object.entries(requestBody).filter(([_, value]) => value !== undefined)
  );

  try {
    const response = await fetch(`${BASE_URL}/search`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cleanedBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Exa API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as ExaSearchResponse;
    console.info(`Successfully found ${data.results.length} results from Exa`);
    return data;
  } catch (error) {
    console.error('Exa search request failed:', error);
    throw error;
  }
};

const getContents = async (
  ids: string[],
  apiKey: string,
  options: {
    text?: boolean;
    highlights?: boolean;
    summary?: boolean;
  } = {}
): Promise<ExaSearchResult[]> => {
  console.info(`Getting contents for ${ids.length} Exa results`);

  const requestBody = {
    ids,
    text: options.text,
    highlights: options.highlights,
    summary: options.summary,
  };

  // Remove undefined values
  const cleanedBody = Object.fromEntries(
    Object.entries(requestBody).filter(([_, value]) => value !== undefined)
  );

  try {
    const response = await fetch(`${BASE_URL}/contents`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cleanedBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Exa API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as { results: ExaSearchResult[] };
    console.info(`Successfully retrieved content for ${data.results.length} results`);
    return data.results;
  } catch (error) {
    console.error('Exa contents request failed:', error);
    throw error;
  }
};

const formatSearchResultsForLLM = (
  results: ExaSearchResult[],
  includeText = false
): string => {
  if (results.length === 0) {
    return 'No results were found for your search query.';
  }

  const output = [`Found ${results.length} search results:\n`];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (!result) {
      continue;
    }

    output.push(`${i + 1}. ${result.title}`);
    output.push(`   URL: ${result.url}`);
    output.push(`   Score: ${result.score.toFixed(3)}`);

    if (result.author) {
      output.push(`   Author: ${result.author}`);
    }

    if (result.publishedDate) {
      output.push(`   Published: ${result.publishedDate}`);
    }

    if (result.summary) {
      output.push(`   Summary: ${result.summary}`);
    }

    if (includeText && result.text) {
      const truncatedText =
        result.text.length > 500 ? `${result.text.substring(0, 500)}...` : result.text;
      output.push(`   Content: ${truncatedText}`);
    }

    if (result.highlights && result.highlights.length > 0) {
      output.push(`   Highlights: ${result.highlights.join(' | ')}`);
    }

    output.push(''); // Empty line between results
  }

  return output.join('\n');
};

export const ExaConnectorConfig = mcpConnectorConfig({
  name: 'Exa',
  key: 'exa',
  logo: 'https://exa.ai/favicon.ico',
  version: '1.0.0',
  credentials: z.object({
    apiKey: z.string().describe('Your Exa API key'),
  }),
  setup: z.object({}),
  examplePrompt:
    'Search for "latest AI research papers on large language models" using Exa and get detailed content from the most relevant results.',
  tools: (tool) => ({
    SEARCH: tool({
      name: 'search',
      description:
        "Search the web using Exa's AI-powered search engine. Exa uses neural embeddings to find semantically relevant results.",
      schema: z.object({
        query: z.string().describe('The search query string'),
        numResults: z
          .number()
          .min(1)
          .max(100)
          .default(10)
          .describe('Maximum number of results to return (1-100)'),
        includeText: z
          .boolean()
          .default(false)
          .describe('Whether to include full text content of the pages'),
        type: z
          .enum(['neural', 'keyword', 'auto'])
          .default('auto')
          .describe(
            'Search type: neural (semantic), keyword (traditional), or auto (best of both)'
          ),
        category: z
          .enum([
            'company',
            'research paper',
            'news',
            'github',
            'tweet',
            'movie',
            'song',
            'personal site',
            'pdf',
          ])
          .optional()
          .describe('Filter results by content category'),
        includeDomains: z
          .array(z.string())
          .optional()
          .describe(
            'Only include results from these domains (e.g., ["reddit.com", "stackoverflow.com"])'
          ),
        excludeDomains: z
          .array(z.string())
          .optional()
          .describe('Exclude results from these domains'),
        startPublishedDate: z
          .string()
          .optional()
          .describe('Only include results published after this date (YYYY-MM-DD)'),
        endPublishedDate: z
          .string()
          .optional()
          .describe('Only include results published before this date (YYYY-MM-DD)'),
        useAutoprompt: z
          .boolean()
          .default(true)
          .describe("Use Exa's autoprompt feature to improve search quality"),
      }),
      handler: async (args, context) => {
        try {
          const credentials = await context.getCredentials();
          const response = await performSearch(args.query, credentials.apiKey, {
            numResults: args.numResults,
            includeTextInResult: args.includeText,
            type: args.type,
            category: args.category,
            includeDomains: args.includeDomains,
            excludeDomains: args.excludeDomains,
            startPublishedDate: args.startPublishedDate,
            endPublishedDate: args.endPublishedDate,
            useAutoprompt: args.useAutoprompt,
          });

          return formatSearchResultsForLLM(response.results, args.includeText);
        } catch (error) {
          console.error('Error during Exa search:', error);
          return `An error occurred while searching: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_CONTENTS: tool({
      name: 'get_contents',
      description:
        'Get detailed content (text, highlights, summary) for specific Exa search results by their IDs',
      schema: z.object({
        ids: z
          .array(z.string())
          .min(1)
          .max(100)
          .describe('Array of Exa result IDs to get content for'),
        text: z.boolean().default(true).describe('Include full text content'),
        highlights: z
          .boolean()
          .default(false)
          .describe('Include key highlights from the content'),
        summary: z.boolean().default(false).describe('Include AI-generated summary'),
      }),
      handler: async (args, context) => {
        try {
          const credentials = await context.getCredentials();
          const results = await getContents(args.ids, credentials.apiKey, {
            text: args.text,
            highlights: args.highlights,
            summary: args.summary,
          });

          return formatSearchResultsForLLM(results, true);
        } catch (error) {
          console.error('Error getting Exa contents:', error);
          return `An error occurred while getting contents: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    NEURAL_SEARCH: tool({
      name: 'neural_search',
      description:
        "Perform semantic search using Exa's neural embeddings. Best for finding content similar in meaning to your query.",
      schema: z.object({
        query: z.string().describe('The search query string'),
        numResults: z
          .number()
          .min(1)
          .max(100)
          .default(10)
          .describe('Maximum number of results to return (1-100)'),
        includeText: z
          .boolean()
          .default(false)
          .describe('Whether to include full text content of the pages'),
        category: z
          .enum([
            'company',
            'research paper',
            'news',
            'github',
            'tweet',
            'movie',
            'song',
            'personal site',
            'pdf',
          ])
          .optional()
          .describe('Filter results by content category'),
        includeDomains: z
          .array(z.string())
          .optional()
          .describe('Only include results from these domains'),
        excludeDomains: z
          .array(z.string())
          .optional()
          .describe('Exclude results from these domains'),
      }),
      handler: async (args, context) => {
        try {
          const credentials = await context.getCredentials();
          const response = await performSearch(args.query, credentials.apiKey, {
            numResults: args.numResults,
            includeTextInResult: args.includeText,
            type: 'neural',
            category: args.category,
            includeDomains: args.includeDomains,
            excludeDomains: args.excludeDomains,
          });

          return formatSearchResultsForLLM(response.results, args.includeText);
        } catch (error) {
          console.error('Error during Exa neural search:', error);
          return `An error occurred while performing neural search: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

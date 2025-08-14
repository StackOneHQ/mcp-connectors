import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import OpenAI from 'openai';
import { z } from 'zod';

interface Document {
  id: string;
  content: string;
  metadata: {
    url: string;
    relevancy_score?: number;
  };
}

// Define the type for the Turbopuffer response
interface TurbopufferResult {
  attributes: {
    page_content: string;
    metadata: { url: string };
  };
  dist: number;
  id: string;
}

class TurbopufferClient {
  private apiKey: string;
  private openaiApiKey: string;

  constructor(apiKey: string, openaiApiKey: string) {
    this.apiKey = apiKey;
    this.openaiApiKey = openaiApiKey;
  }

  // OpenAI Embeddings
  private async getEmbeddings(query: string): Promise<number[]> {
    const openai = new OpenAI({ apiKey: this.openaiApiKey });

    const response = await openai.embeddings.create({
      input: query,
      model: 'text-embedding-3-large',
    });

    if (!response.data[0]?.embedding) {
      throw new Error('No embedding found');
    }

    return response.data[0]?.embedding;
  }

  private async callTurbopuffer(
    query: string,
    provider: string,
    k = 3
  ): Promise<Document[]> {
    try {
      const vector = await this.getEmbeddings(query);

      // Query both OAS and Docs namespaces
      const namespaces = ['oas', 'docs'];
      const allResults = await Promise.all(
        namespaces.map(async (suffix) => {
          const namespace = `${provider}-${suffix}`;
          try {
            const response = await fetch(
              `https://api.turbopuffer.com/v1/namespaces/${namespace}/query`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${this.apiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  vector,
                  distance_metric: 'cosine_distance',
                  include_attributes: ['page_content', 'metadata'],
                  top_k: k,
                }),
              }
            );

            if (!response.ok) {
              console.log('Failed Turbopuffer API request', {
                namespace,
                status: response.status,
                statusText: response.statusText,
              });
              return [];
            }

            const results = (await response.json()) as TurbopufferResult[];
            return results.map((result: TurbopufferResult) => ({
              id: result.id,
              content: result.attributes.page_content || '',
              metadata: result.attributes.metadata || { url: '' },
            }));
          } catch (error) {
            console.log('Namespace query error', { namespace, error });
            return [];
          }
        })
      );

      // Combine results and check if empty
      const combinedResults = allResults.flat();
      if (combinedResults.length === 0) {
        return [];
      }

      return combinedResults;
    } catch (error) {
      console.log('Turbopuffer search failed', { error });
      return [];
    }
  }

  async vectorSearch(query: string, provider: string, k = 3): Promise<string> {
    const results = await this.callTurbopuffer(query, provider, k);
    if (results.length === 0) {
      console.log('No results found');
      return 'No results found for the search query.';
    }

    const formattedResults = results
      .map((doc) => {
        return `<doc id="${doc.id}" page_content="${doc.content}" url="${doc.metadata.url}" relevancy_score="${doc.metadata.relevancy_score}"/>`;
      })
      .join('\n');

    return formattedResults;
  }
}

export const TurbopufferConnectorConfig = mcpConnectorConfig({
  name: 'Turbopuffer',
  key: 'turbopuffer',
  logo: 'https://stackone-logos.com/api/turbopuffer/filled/svg',
  version: '1.0.0',
  credentials: z.object({
    apiKey: z
      .string()
      .describe('Turbopuffer API key :: tbp_1234567890abcdefghijklmnopqrstuv'),
    openaiApiKey: z
      .string()
      .describe(
        'OpenAI API key to use for embeddings :: sk-1234567890abcdefghijklmnopqrstuvwxyz'
      ),
  }),
  setup: z.object({}),
  examplePrompt:
    'Search the HR/Payroll knowledge base for API documentation about BambooHR authentication, Workday endpoints, and ADP integration requirements.',
  tools: (tool) => ({
    VECTOR_SEARCH: tool({
      name: 'vector_search',
      description:
        'Perform semantic search across StackOne knowledge base. This contains HR/Payroll provider API documentation and other relevant information. Optimized for finding technical details like API endpoints, scopes, authentication methods, request/response schemas, and implementation requirements. Can be queried multiple times for different topics and providers.',
      schema: z.object({
        query: z
          .string()
          .describe(
            'Technical search query specifying provider name and detailed API aspects (endpoints, scopes, parameters, authentication, rate limits, etc.).'
          ),
        k: z.number().describe('Number of results to return from the search').default(3),
        provider: z
          .string()
          .describe(
            'The specific HR/Payroll provider to search (e.g., workday, bamboohr, adp, paychex, gusto)'
          ),
      }),
      handler: async (args, context) => {
        console.log('Vector Search Tool', {
          query: args.query,
          k: args.k,
          provider: args.provider,
        });

        try {
          const { apiKey, openaiApiKey } = await context.getCredentials();
          const client = new TurbopufferClient(apiKey, openaiApiKey);
          const text = await client.vectorSearch(args.query, args.provider, args.k);
          console.log('Vector Search Tool Response', { text });
          return text;
        } catch (error) {
          console.log('Vector Search Tool Error', { error });
          return 'Failed to invoke vector search tool, please try again later.';
        }
      },
    }),
  }),
});

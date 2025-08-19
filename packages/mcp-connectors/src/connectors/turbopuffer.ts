import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import OpenAI from 'openai';
import { z } from 'zod';

interface TurbopufferQueryResult {
  vectors: Array<{
    id: string;
    vector?: number[];
    attributes?: Record<string, unknown>;
    dist: number;
  }>;
}

interface TurbopufferNamespace {
  id: string;
  dimensions: number;
  approx_count: number;
  vectors_per_list?: number;
}

interface TurbopufferUpsertData {
  id: string;
  vector?: number[];
  attributes?: Record<string, unknown>;
}

class EmbeddingsClient {
  private openai: OpenAI;
  private model: string;

  constructor(openaiApiKey: string, model: string) {
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.model = model;
  }

  async getEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      input: text,
      model: this.model,
    });

    if (!response.data[0]?.embedding) {
      throw new Error('No embedding found');
    }

    return response.data[0].embedding;
  }
}

class TurbopufferClient {
  private apiKey: string;
  private baseUrl = 'https://api.turbopuffer.com';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Turbopuffer API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json() as Promise<T>;
  }

  async listNamespaces(): Promise<TurbopufferNamespace[]> {
    return this.request<TurbopufferNamespace[]>('/v1/namespaces');
  }

  async query(
    namespace: string,
    vector: number[],
    options: {
      top_k?: number;
      distance_metric?: 'cosine_distance' | 'euclidean_squared';
      include_attributes?: string[];
      include_vectors?: boolean;
      filters?: Record<string, unknown>;
    } = {}
  ): Promise<TurbopufferQueryResult> {
    return this.request<TurbopufferQueryResult>(`/v2/namespaces/${namespace}/query`, {
      method: 'POST',
      body: JSON.stringify({
        vector,
        top_k: options.top_k ?? 10,
        distance_metric: options.distance_metric ?? 'cosine_distance',
        include_attributes: options.include_attributes,
        include_vectors: options.include_vectors ?? false,
        filters: options.filters,
      }),
    });
  }

  async upsert(
    namespace: string,
    vectors: TurbopufferUpsertData[]
  ): Promise<{ status: string }> {
    return this.request<{ status: string }>(`/v1/namespaces/${namespace}/upsert`, {
      method: 'POST',
      body: JSON.stringify({
        vectors,
      }),
    });
  }
}

export const TurbopufferConnectorConfig = mcpConnectorConfig({
  name: 'Turbopuffer',
  key: 'turbopuffer',
  logo: 'https://stackone-logos.com/api/turbopuffer/filled/svg',
  version: '2.0.0',
  credentials: z.object({
    apiKey: z
      .string()
      .describe(
        'Turbopuffer API key :: tbp_1234567890abcdefghijklmnopqrstuv :: https://turbopuffer.com/docs/auth'
      ),
    openaiApiKey: z
      .string()
      .describe(
        'OpenAI API key to use for embeddings :: sk-1234567890abcdefghijklmnopqrstuvwxyz'
      ),
  }),
  description:
    'Turbopuffer is a serverless vector database. This connector provides tools to manage namespaces, search vectors, and upsert data using OpenAI embeddings.',
  setup: z.object({
    embeddingModel: z
      .string()
      .describe(
        'OpenAI embedding model to use (e.g., text-embedding-3-large, text-embedding-ada-002)'
      )
      .default('text-embedding-3-large'),
    includeAttributes: z
      .array(z.string())
      .describe('Default attributes to include in query responses')
      .default(['page_content', 'metadata']),
  }),
  examplePrompt:
    'List all available namespaces, then search the docs namespace for authentication information, and upsert a new document about API keys.',
  tools: (tool) => ({
    LIST_NAMESPACES: tool({
      name: 'turbopuffer_list_namespaces',
      description:
        'List all available Turbopuffer namespaces with their dimensions and approximate vector counts.',
      schema: z.object({}),
      handler: async (_, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new TurbopufferClient(apiKey);
          const namespaces = await client.listNamespaces();

          if (namespaces.length === 0) {
            return 'No namespaces found.';
          }

          return namespaces
            .map(
              (ns) =>
                `Namespace: ${ns.id}\n  Dimensions: ${ns.dimensions}\n  Approximate vectors: ${ns.approx_count}`
            )
            .join('\n\n');
        } catch (error) {
          return `Failed to list namespaces: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    }),

    VECTOR_SEARCH: tool({
      name: 'turbopuffer_vector_search',
      description:
        'Perform semantic search across a Turbopuffer namespace using text queries.',
      schema: z.object({
        query: z
          .string()
          .describe('Text query to search for semantically similar documents'),
        namespace: z.string().describe('The Turbopuffer namespace to search in'),
        top_k: z.number().describe('Number of results to return').default(10),
        include_vectors: z
          .boolean()
          .describe('Whether to include vectors in the response')
          .default(false),
        filters: z
          .record(z.unknown())
          .describe('Optional filters to apply to the search')
          .optional(),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, openaiApiKey } = await context.getCredentials();
          const { embeddingModel, includeAttributes } = await context.getSetup();

          const embeddingsClient = new EmbeddingsClient(openaiApiKey, embeddingModel);
          const turbopufferClient = new TurbopufferClient(apiKey);

          const vector = await embeddingsClient.getEmbedding(args.query);
          const results = await turbopufferClient.query(args.namespace, vector, {
            top_k: args.top_k,
            include_attributes: includeAttributes,
            include_vectors: args.include_vectors,
            filters: args.filters,
          });

          if (results.vectors.length === 0) {
            return 'No results found for the search query.';
          }

          return results.vectors
            .map((result) => {
              const attributes = result.attributes
                ? Object.entries(result.attributes)
                    .map(([key, value]) => {
                      const stringValue =
                        typeof value === 'object' ? JSON.stringify(value) : String(value);
                      return `${key}="${stringValue.replace(/"/g, '&quot;')}"`;
                    })
                    .join(' ')
                : '';
              return `<doc id="${result.id}" distance="${result.dist}" ${attributes}/>`;
            })
            .join('\n');
        } catch (error) {
          return `Failed to perform vector search: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    }),

    UPSERT_DOCUMENTS: tool({
      name: 'turbopuffer_upsert_documents',
      description:
        'Insert or update documents in a Turbopuffer namespace with text content that will be embedded.',
      schema: z.object({
        namespace: z
          .string()
          .describe('The Turbopuffer namespace to upsert documents into'),
        documents: z
          .array(
            z.object({
              id: z.string().describe('Unique identifier for the document'),
              content: z.string().describe('Text content to be embedded'),
              attributes: z
                .record(z.unknown())
                .describe('Additional attributes to store with the document')
                .optional(),
            })
          )
          .describe('Documents to upsert'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, openaiApiKey } = await context.getCredentials();
          const { embeddingModel } = await context.getSetup();

          const embeddingsClient = new EmbeddingsClient(openaiApiKey, embeddingModel);
          const turbopufferClient = new TurbopufferClient(apiKey);

          const vectors: TurbopufferUpsertData[] = await Promise.all(
            args.documents.map(async (doc) => ({
              id: doc.id,
              vector: await embeddingsClient.getEmbedding(doc.content),
              attributes: {
                ...doc.attributes,
                content: doc.content,
              },
            }))
          );

          await turbopufferClient.upsert(args.namespace, vectors);
          return `Successfully upserted ${vectors.length} document(s) to namespace "${args.namespace}".`;
        } catch (error) {
          return `Failed to upsert documents: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    }),
  }),
});

import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

class EmbeddingsClient {
  private baseUrl = 'https://api.openai.com/v1/embeddings';
  private apiKey: string;
  private model: string;

  constructor(openaiApiKey: string, model: string) {
    this.apiKey = openaiApiKey;
    this.model = model;
  }

  async getEmbedding(text: string): Promise<number[]> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        model: this.model,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as { data: Array<{ embedding: number[] }> };

    if (!data.data[0]?.embedding) {
      throw new Error('No embedding found in response');
    }

    return data.data[0].embedding;
  }
}

interface TurbopufferQueryResult {
  rows: Array<{
    id: string;
    $dist?: number;
    [key: string]: unknown;
  }>;
}

interface TurbopufferNamespace {
  id: string;
}

interface TurbopufferNamespacesResponse {
  namespaces: TurbopufferNamespace[];
  next_cursor?: string;
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
    const response = await this.request<TurbopufferNamespacesResponse>('/v1/namespaces');
    return response.namespaces;
  }

  async query(
    namespace: string,
    vector: number[],
    options: {
      top_k?: number;
      include_attributes?: string[] | boolean;
      filters?: unknown;
    } = {}
  ): Promise<TurbopufferQueryResult> {
    return this.request<TurbopufferQueryResult>(`/v2/namespaces/${namespace}/query`, {
      method: 'POST',
      body: JSON.stringify({
        rank_by: ['vector', 'ANN', vector],
        top_k: options.top_k ?? 10,
        include_attributes: options.include_attributes,
        filters: options.filters,
      }),
    });
  }

  async write(
    namespace: string,
    documents: Array<{
      id: string;
      vector: number[];
      [key: string]: unknown;
    }>
  ): Promise<{ status: string; rows_affected?: number }> {
    return this.request<{ status: string; rows_affected?: number }>(
      `/v2/namespaces/${namespace}`,
      {
        method: 'POST',
        body: JSON.stringify({
          upsert_rows: documents,
          distance_metric: 'cosine_distance',
        }),
      }
    );
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
        'OpenAI API key for embeddings :: sk-1234567890abcdefghijklmnopqrstuvwxyz'
      ),
  }),
  description:
    'Turbopuffer is a serverless vector database. This connector provides tools to manage namespaces, search vectors, and write data using OpenAI embeddings.',
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
    'List all available namespaces, then search the docs namespace for authentication information with filters like ["And", [["category", "Eq", "auth"], ["public", "Eq", true]]], and write a new document about API keys.',
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

          return namespaces.map((ns) => `Namespace: ${ns.id}`).join('\n');
        } catch (error) {
          return `Failed to list namespaces: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    }),

    VECTOR_SEARCH: tool({
      name: 'turbopuffer_vector_search',
      description:
        'Perform semantic vector search across a Turbopuffer namespace using text queries. The text is automatically converted to embeddings. Supports filtering by metadata attributes.',
      schema: z.object({
        query: z
          .string()
          .describe('Text query to search for semantically similar documents'),
        namespace: z.string().describe('The Turbopuffer namespace to search in'),
        top_k: z.number().describe('Number of results to return').default(10),
        filters: z
          .unknown()
          .describe(
            `Optional filters to apply to the search. Filters use array syntax with operators.
            
Examples:
- Exact match: ["status", "Eq", "active"]
- Multiple conditions with And: ["And", [["age", "Gte", 18], ["age", "Lt", 65]]]
- Or conditions: ["Or", [["category", "Eq", "tech"], ["category", "Eq", "science"]]]
- Array contains: ["tags", "Contains", "javascript"]
- Array intersection: ["permissions", "ContainsAny", ["read", "write"]]
- Pattern matching: ["filename", "Glob", "*.tsx"]
- Null checks: ["deleted_at", "Eq", null]
- Nested conditions: ["And", [["public", "Eq", true], ["Or", [["author", "Eq", "alice"], ["editor", "Eq", "bob"]]]]]

Operators:
- Comparison: Eq, NotEq, Lt, Lte, Gt, Gte
- Array: Contains, NotContains, ContainsAny, NotContainsAny
- Pattern: Glob, NotGlob, IGlob (case-insensitive), NotIGlob
- List: In, NotIn
- Logic: And, Or, Not
- Text: ContainsAllTokens (requires full-text search enabled)
- Regex: Regex (requires regex enabled in schema)`
          )
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
            filters: args.filters,
          });

          if (results.rows.length === 0) {
            return 'No results found for the search query.';
          }

          return results.rows
            .map((row) => {
              const { id, $dist, ...attributes } = row;
              const attributeString = Object.entries(attributes)
                .map(([key, value]) => {
                  const stringValue =
                    typeof value === 'object' ? JSON.stringify(value) : String(value);
                  return `${key}="${stringValue.replace(/"/g, '&quot;')}"`;
                })
                .join(' ');
              const distanceAttr = $dist !== undefined ? ` distance="${$dist}"` : '';
              return `<doc id="${id}"${distanceAttr}${attributeString ? ` ${attributeString}` : ''}/>`;
            })
            .join('\n');
        } catch (error) {
          return `Failed to perform vector search: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    }),

    WRITE_DOCUMENTS: tool({
      name: 'turbopuffer_write_documents',
      description:
        'Write documents to a Turbopuffer namespace with text content that will be embedded. Documents are automatically indexed by their content hash for deduplication. Metadata fields are automatically indexed and can be used for filtering in queries.',
      schema: z.object({
        namespace: z.string().describe('The Turbopuffer namespace to write documents to'),
        documents: z
          .array(
            z.object({
              page_content: z.string().describe('Text content to be embedded'),
              metadata: z
                .record(z.unknown())
                .describe(
                  'Additional metadata to store with the document. These attributes can be used for filtering in queries. For example, author, source_url, etc.'
                )
                .optional(),
            })
          )
          .describe('Documents to write'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, openaiApiKey } = await context.getCredentials();
          const { embeddingModel } = await context.getSetup();

          const embeddingsClient = new EmbeddingsClient(openaiApiKey, embeddingModel);
          const turbopufferClient = new TurbopufferClient(apiKey);

          // Generate content hash for each document to use as ID
          const crypto = await import('node:crypto');

          const documents = await Promise.all(
            args.documents.map(async (doc) => {
              const contentHash = crypto
                .createHash('sha256')
                .update(doc.page_content)
                .digest('hex')
                .substring(0, 16);

              return {
                id: contentHash,
                vector: await embeddingsClient.getEmbedding(doc.page_content),
                page_content: doc.page_content,
                metadata: doc.metadata || {},
                timestamp: new Date().toISOString(),
              };
            })
          );

          await turbopufferClient.write(args.namespace, documents);
          return `Successfully wrote ${documents.length} document(s) to namespace "${args.namespace}".`;
        } catch (error) {
          return `Failed to write documents: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    }),
  }),
});

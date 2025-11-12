import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ConnectorMetadata } from '../types/metadata';

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

export const TurbopufferConnectorMetadata = {
  key: 'turbopuffer',
  name: 'Turbopuffer',
  description: 'Vector database',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/turbopuffer/filled/svg',
  examplePrompt: 'Query Turbopuffer vectors',
  categories: ['database', 'vector-search'],
} as const satisfies ConnectorMetadata;

export interface TurbopufferCredentials {
  apiKey: string;
  openaiApiKey: string;
  embeddingModel?: string;
  includeAttributes?: string[];
}

export function createTurbopufferServer(credentials: TurbopufferCredentials): McpServer {
  const server = new McpServer({
    name: 'Turbopuffer',
    version: '2.0.0',
  });

  const embeddingModel = credentials.embeddingModel || 'text-embedding-3-large';
  const includeAttributes = credentials.includeAttributes || ['page_content', 'metadata'];

  server.tool(
    'turbopuffer_list_namespaces',
    'List all available Turbopuffer namespaces with their dimensions and approximate vector counts.',
    {},
    async () => {
      try {
        const client = new TurbopufferClient(credentials.apiKey);
        const namespaces = await client.listNamespaces();

        if (namespaces.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No namespaces found.',
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: namespaces.map((ns) => `Namespace: ${ns.id}`).join('\n'),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to list namespaces: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'turbopuffer_vector_search',
    'Perform semantic vector search across a Turbopuffer namespace using text queries. The text is automatically converted to embeddings. Supports filtering by metadata attributes.',
    {
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
    },
    async (args) => {
      try {
        const embeddingsClient = new EmbeddingsClient(
          credentials.openaiApiKey,
          embeddingModel
        );
        const turbopufferClient = new TurbopufferClient(credentials.apiKey);

        const vector = await embeddingsClient.getEmbedding(args.query);
        const results = await turbopufferClient.query(args.namespace, vector, {
          top_k: args.top_k,
          include_attributes: includeAttributes,
          filters: args.filters,
        });

        if (results.rows.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No results found for the search query.',
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: results.rows
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
                .join('\n'),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to perform vector search: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'turbopuffer_write_documents',
    'Write documents to a Turbopuffer namespace with text content that will be embedded. Documents are automatically indexed by their content hash for deduplication. Metadata fields are automatically indexed and can be used for filtering in queries.',
    {
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
    },
    async (args) => {
      try {
        const embeddingsClient = new EmbeddingsClient(
          credentials.openaiApiKey,
          embeddingModel
        );
        const turbopufferClient = new TurbopufferClient(credentials.apiKey);

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
        return {
          content: [
            {
              type: 'text',
              text: `Successfully wrote ${documents.length} document(s) to namespace "${args.namespace}".`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to write documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  return server;
}

import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { describe, expect, it, type vi } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { TurbopufferConnectorConfig } from './turbopuffer';

interface CapturedWriteRequest {
  upsert_rows: Array<{
    id: string;
    vector: number[];
    page_content: string;
    metadata: Record<string, unknown>;
    timestamp: string;
  }>;
  distance_metric: string;
}

describe('#TurbopufferConnector', () => {
  describe('.LIST_NAMESPACES', () => {
    describe('when API returns namespaces', () => {
      it('returns formatted namespace list', async () => {
        const server = setupServer(
          http.get('https://api.turbopuffer.com/v1/namespaces', () => {
            return HttpResponse.json({
              namespaces: [{ id: 'docs' }, { id: 'products' }],
            });
          })
        );
        server.listen();

        const tool = TurbopufferConnectorConfig.tools
          .LIST_NAMESPACES as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'test-api-key',
          openaiApiKey: 'test-openai-key',
        });

        const actual = await tool.handler({}, mockContext);

        server.close();

        expect(actual).toContain('Namespace: docs');
        expect(actual).toContain('Namespace: products');
      });
    });

    describe('when API returns empty array', () => {
      it('returns no namespaces message', async () => {
        const server = setupServer(
          http.get('https://api.turbopuffer.com/v1/namespaces', () => {
            return HttpResponse.json({ namespaces: [] });
          })
        );
        server.listen();

        const tool = TurbopufferConnectorConfig.tools
          .LIST_NAMESPACES as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'test-api-key',
          openaiApiKey: 'test-openai-key',
        });

        const actual = await tool.handler({}, mockContext);

        server.close();

        expect(actual).toBe('No namespaces found.');
      });
    });

    describe('when API returns error', () => {
      it('returns error message', async () => {
        const server = setupServer(
          http.get('https://api.turbopuffer.com/v1/namespaces', () => {
            return HttpResponse.text('Invalid API key', { status: 401 });
          })
        );
        server.listen();

        const tool = TurbopufferConnectorConfig.tools
          .LIST_NAMESPACES as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'invalid-key',
          openaiApiKey: 'test-openai-key',
        });

        const actual = await tool.handler({}, mockContext);

        server.close();

        expect(actual).toContain('Failed to list namespaces');
        expect(actual).toContain('401');
      });
    });
  });

  describe('.VECTOR_SEARCH', () => {
    describe('when search returns results', () => {
      it('returns formatted search results', async () => {
        const server = setupServer(
          http.post('https://api.openai.com/v1/embeddings', () => {
            return HttpResponse.json({
              data: [{ embedding: new Array(1536).fill(0.1) }],
            });
          }),
          http.post('https://api.turbopuffer.com/v2/namespaces/docs/query', () => {
            return HttpResponse.json({
              rows: [
                {
                  id: 'doc1',
                  $dist: 0.95,
                  page_content: 'Test content',
                  metadata: { source: 'test.md', author: 'John' },
                },
                {
                  id: 'doc2',
                  $dist: 0.87,
                  page_content: 'Another document',
                  metadata: { source: 'test2.md' },
                },
              ],
            });
          })
        );
        server.listen();

        const tool = TurbopufferConnectorConfig.tools.VECTOR_SEARCH as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'test-api-key',
          openaiApiKey: 'test-openai-key',
        });
        (mockContext.getSetup as ReturnType<typeof vi.fn>).mockResolvedValue({
          embeddingModel: 'text-embedding-3-large',
          includeAttributes: ['page_content', 'metadata'],
        });

        const actual = await tool.handler(
          {
            query: 'test query',
            namespace: 'docs',
            top_k: 5,
          },
          mockContext
        );

        server.close();

        expect(actual).toContain('id="doc1"');
        expect(actual).toContain('distance="0.95"');
        expect(actual).toContain('page_content="Test content"');
        expect(actual).toContain('metadata=');
        expect(actual).toContain('id="doc2"');
        expect(actual).toContain('distance="0.87"');
      });
    });

    describe('when search returns no results', () => {
      it('returns no results message', async () => {
        const server = setupServer(
          http.post('https://api.openai.com/v1/embeddings', () => {
            return HttpResponse.json({
              data: [{ embedding: new Array(1536).fill(0.1) }],
            });
          }),
          http.post('https://api.turbopuffer.com/v2/namespaces/docs/query', () => {
            return HttpResponse.json({ rows: [] });
          })
        );
        server.listen();

        const tool = TurbopufferConnectorConfig.tools.VECTOR_SEARCH as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'test-api-key',
          openaiApiKey: 'test-openai-key',
        });
        (mockContext.getSetup as ReturnType<typeof vi.fn>).mockResolvedValue({
          embeddingModel: 'text-embedding-3-large',
          includeAttributes: ['page_content', 'metadata'],
        });

        const actual = await tool.handler(
          {
            query: 'test query',
            namespace: 'docs',
            top_k: 5,
          },
          mockContext
        );

        server.close();

        expect(actual).toBe('No results found for the search query.');
      });
    });

    describe('when OpenAI API fails', () => {
      it('returns error message', async () => {
        const server = setupServer(
          http.post('https://api.openai.com/v1/embeddings', () => {
            return HttpResponse.text('Invalid API key', { status: 401 });
          })
        );
        server.listen();

        const tool = TurbopufferConnectorConfig.tools.VECTOR_SEARCH as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'test-api-key',
          openaiApiKey: 'invalid-openai-key',
        });
        (mockContext.getSetup as ReturnType<typeof vi.fn>).mockResolvedValue({
          embeddingModel: 'text-embedding-3-large',
          includeAttributes: ['page_content', 'metadata'],
        });

        const actual = await tool.handler(
          {
            query: 'test query',
            namespace: 'docs',
            top_k: 5,
          },
          mockContext
        );

        server.close();

        expect(actual).toContain('Failed to perform vector search');
        expect(actual).toContain('401');
      });
    });
  });

  describe('.WRITE_DOCUMENTS', () => {
    describe('when writing documents with page_content and metadata', () => {
      it('embeds content and writes to namespace', async () => {
        let capturedRequest: CapturedWriteRequest | null = null;
        const server = setupServer(
          http.post('https://api.openai.com/v1/embeddings', () => {
            return HttpResponse.json({
              data: [{ embedding: new Array(1536).fill(0.1) }],
            });
          }),
          http.post(
            'https://api.turbopuffer.com/v2/namespaces/docs',
            async ({ request }) => {
              capturedRequest = (await request.json()) as CapturedWriteRequest;
              return HttpResponse.json({ status: 'OK' });
            }
          )
        );
        server.listen();

        const tool = TurbopufferConnectorConfig.tools
          .WRITE_DOCUMENTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'test-api-key',
          openaiApiKey: 'test-openai-key',
        });
        (mockContext.getSetup as ReturnType<typeof vi.fn>).mockResolvedValue({
          embeddingModel: 'text-embedding-3-large',
        });

        const actual = await tool.handler(
          {
            namespace: 'docs',
            documents: [
              {
                page_content: 'This is test content',
                metadata: { source: 'test.md', author: 'test' },
              },
            ],
          },
          mockContext
        );

        server.close();

        expect(actual).toBe('Successfully wrote 1 document(s) to namespace "docs".');

        // Verify request structure
        expect(capturedRequest).not.toBeNull();
        expect(capturedRequest).toHaveProperty('upsert_rows');
        expect(capturedRequest).toHaveProperty('distance_metric');

        // biome-ignore lint/style/noNonNullAssertion: <explanation>
        const request = capturedRequest!;
        expect(request.upsert_rows).toHaveLength(1);
        expect(request.upsert_rows[0]).toMatchObject({
          id: expect.any(String),
          vector: expect.any(Array),
          page_content: 'This is test content',
          metadata: { source: 'test.md', author: 'test' },
          timestamp: expect.any(String),
        });
        expect(request.distance_metric).toBe('cosine_distance');
      });
    });

    describe('when document has no metadata', () => {
      it('uses empty object for metadata', async () => {
        let capturedRequest: CapturedWriteRequest | null = null;
        const server = setupServer(
          http.post('https://api.openai.com/v1/embeddings', () => {
            return HttpResponse.json({
              data: [{ embedding: new Array(1536).fill(0.1) }],
            });
          }),
          http.post(
            'https://api.turbopuffer.com/v2/namespaces/docs',
            async ({ request }) => {
              capturedRequest = (await request.json()) as CapturedWriteRequest;
              return HttpResponse.json({ status: 'OK' });
            }
          )
        );
        server.listen();

        const tool = TurbopufferConnectorConfig.tools
          .WRITE_DOCUMENTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'test-api-key',
          openaiApiKey: 'test-openai-key',
        });
        (mockContext.getSetup as ReturnType<typeof vi.fn>).mockResolvedValue({
          embeddingModel: 'text-embedding-3-large',
        });

        const actual = await tool.handler(
          {
            namespace: 'docs',
            documents: [
              {
                page_content: 'Content without metadata',
              },
            ],
          },
          mockContext
        );

        server.close();

        expect(actual).toBe('Successfully wrote 1 document(s) to namespace "docs".');
        expect(capturedRequest).not.toBeNull();
        // biome-ignore lint/style/noNonNullAssertion: <explanation>
        const request = capturedRequest!;
        expect(request.upsert_rows[0]).toMatchObject({
          page_content: 'Content without metadata',
          metadata: {},
        });
      });
    });

    describe('when API returns error', () => {
      it('returns error message', async () => {
        const server = setupServer(
          http.post('https://api.openai.com/v1/embeddings', () => {
            return HttpResponse.json({
              data: [{ embedding: new Array(1536).fill(0.1) }],
            });
          }),
          http.post('https://api.turbopuffer.com/v2/namespaces/nonexistent', () => {
            return HttpResponse.text('Namespace not found', { status: 404 });
          })
        );
        server.listen();

        const tool = TurbopufferConnectorConfig.tools
          .WRITE_DOCUMENTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'test-api-key',
          openaiApiKey: 'test-openai-key',
        });
        (mockContext.getSetup as ReturnType<typeof vi.fn>).mockResolvedValue({
          embeddingModel: 'text-embedding-3-large',
        });

        const actual = await tool.handler(
          {
            namespace: 'nonexistent',
            documents: [
              {
                page_content: 'Test content',
              },
            ],
          },
          mockContext
        );

        server.close();

        expect(actual).toContain('Failed to write documents');
        expect(actual).toContain('404');
      });
    });
  });
});

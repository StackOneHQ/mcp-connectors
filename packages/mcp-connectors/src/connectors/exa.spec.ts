import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { describe, expect, it, type vi } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { ExaConnectorConfig } from './exa';

const mockSearchResponse = {
  results: [
    {
      id: 'test-id-1',
      url: 'https://example.com/article1',
      title: 'Test Article 1',
      score: 0.95,
      publishedDate: '2024-01-01',
      author: 'Test Author',
      text: 'This is the full text content of article 1',
      highlights: ['key insight', 'important finding'],
      summary: 'This article discusses key insights',
    },
    {
      id: 'test-id-2',
      url: 'https://example.com/article2',
      title: 'Test Article 2',
      score: 0.87,
      publishedDate: '2024-01-02',
      text: 'This is the full text content of article 2',
    },
  ],
  autopromptString: 'Improved query for better results',
};

const mockContentsResponse = {
  results: [
    {
      id: 'test-id-1',
      url: 'https://example.com/article1',
      title: 'Test Article 1',
      score: 0.95,
      text: 'Full detailed text content from the article',
      highlights: ['important point 1', 'key finding 2'],
      summary: 'Detailed summary of the article content',
    },
  ],
};

describe('#ExaConnectorConfig', () => {
  describe('.SEARCH', () => {
    describe('when API key is valid and search is successful', () => {
      it('returns formatted search results', async () => {
        const server = setupServer(
          http.post('https://api.exa.ai/search', () => {
            return HttpResponse.json(mockSearchResponse);
          })
        );
        server.listen();

        const tool = ExaConnectorConfig.tools.SEARCH as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'test-api-key',
        });

        const actual = await tool.handler(
          {
            query: 'test query',
            numResults: 10,
            includeText: false,
            type: 'auto',
          },
          mockContext
        );

        server.close();

        expect(actual).toContain('Found 2 search results');
        expect(actual).toContain('Test Article 1');
        expect(actual).toContain('https://example.com/article1');
        expect(actual).toContain('Score: 0.950');
        expect(actual).toContain('Author: Test Author');
        expect(actual).toContain('Published: 2024-01-01');
      });
    });

    describe('when includeText is true', () => {
      it('includes text content in results', async () => {
        const server = setupServer(
          http.post('https://api.exa.ai/search', () => {
            return HttpResponse.json(mockSearchResponse);
          })
        );
        server.listen();

        const tool = ExaConnectorConfig.tools.SEARCH as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'test-api-key',
        });

        const actual = await tool.handler(
          {
            query: 'test query',
            includeText: true,
          },
          mockContext
        );

        server.close();

        expect(actual).toContain('Content: This is the full text content of article 1');
      });
    });

    describe('when API returns error', () => {
      it('returns error message', async () => {
        const server = setupServer(
          http.post('https://api.exa.ai/search', () => {
            return new HttpResponse('Invalid API key', { status: 401 });
          })
        );
        server.listen();

        const tool = ExaConnectorConfig.tools.SEARCH as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'invalid-key',
        });

        const actual = await tool.handler(
          {
            query: 'test query',
          },
          mockContext
        );

        server.close();

        expect(actual).toContain('An error occurred while searching');
        expect(actual).toContain('Exa API error (401)');
      });
    });

    describe('when network error occurs', () => {
      it('returns network error message', async () => {
        const server = setupServer(
          http.post('https://api.exa.ai/search', () => {
            throw new Error('Network error');
          })
        );
        server.listen();

        const tool = ExaConnectorConfig.tools.SEARCH as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'test-api-key',
        });

        const actual = await tool.handler(
          {
            query: 'test query',
          },
          mockContext
        );

        server.close();

        expect(actual).toContain('An error occurred while searching');
        expect(actual).toContain('Network error');
      });
    });

    describe('when search returns no results', () => {
      it('returns no results message', async () => {
        const server = setupServer(
          http.post('https://api.exa.ai/search', () => {
            return HttpResponse.json({ results: [] });
          })
        );
        server.listen();

        const tool = ExaConnectorConfig.tools.SEARCH as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'test-api-key',
        });

        const actual = await tool.handler(
          {
            query: 'nonexistent query',
          },
          mockContext
        );

        server.close();

        expect(actual).toContain('No results were found for your search query');
      });
    });

    describe('when using filters', () => {
      it('includes filters in request body', async () => {
        let requestBody: unknown;
        const server = setupServer(
          http.post('https://api.exa.ai/search', async ({ request }) => {
            requestBody = await request.json();
            return HttpResponse.json(mockSearchResponse);
          })
        );
        server.listen();

        const tool = ExaConnectorConfig.tools.SEARCH as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'test-api-key',
        });

        await tool.handler(
          {
            query: 'test query',
            type: 'neural',
            category: 'research paper',
            includeDomains: ['arxiv.org'],
            excludeDomains: ['example.com'],
            startPublishedDate: '2024-01-01',
            endPublishedDate: '2024-12-31',
            useAutoprompt: false,
          },
          mockContext
        );

        server.close();

        expect(requestBody).toMatchObject({
          query: 'test query',
          type: 'neural',
          category: 'research paper',
          includeDomains: ['arxiv.org'],
          excludeDomains: ['example.com'],
          startPublishedDate: '2024-01-01',
          endPublishedDate: '2024-12-31',
          useAutoprompt: false,
        });
      });
    });
  });

  describe('.GET_CONTENTS', () => {
    describe('when content retrieval is successful', () => {
      it('returns formatted content results', async () => {
        const server = setupServer(
          http.post('https://api.exa.ai/contents', () => {
            return HttpResponse.json(mockContentsResponse);
          })
        );
        server.listen();

        const tool = ExaConnectorConfig.tools.GET_CONTENTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'test-api-key',
        });

        const actual = await tool.handler(
          {
            ids: ['test-id-1'],
            text: true,
            highlights: true,
            summary: true,
          },
          mockContext
        );

        server.close();

        expect(actual).toContain('Found 1 search results');
        expect(actual).toContain('Test Article 1');
        expect(actual).toContain('Content: Full detailed text content from the article');
        expect(actual).toContain('Highlights: important point 1 | key finding 2');
        expect(actual).toContain('Summary: Detailed summary of the article content');
      });
    });

    describe('when API returns error', () => {
      it('returns error message', async () => {
        const server = setupServer(
          http.post('https://api.exa.ai/contents', () => {
            return new HttpResponse('Invalid IDs', { status: 400 });
          })
        );
        server.listen();

        const tool = ExaConnectorConfig.tools.GET_CONTENTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'test-api-key',
        });

        const actual = await tool.handler(
          {
            ids: ['invalid-id'],
          },
          mockContext
        );

        server.close();

        expect(actual).toContain('An error occurred while getting contents');
        expect(actual).toContain('Exa API error (400)');
      });
    });

    describe('when multiple IDs are provided', () => {
      it('includes all IDs in request', async () => {
        let requestBody: unknown;
        const server = setupServer(
          http.post('https://api.exa.ai/contents', async ({ request }) => {
            requestBody = await request.json();
            return HttpResponse.json({ results: [] });
          })
        );
        server.listen();

        const tool = ExaConnectorConfig.tools.GET_CONTENTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'test-api-key',
        });

        await tool.handler(
          {
            ids: ['id-1', 'id-2', 'id-3'],
            text: true,
          },
          mockContext
        );

        server.close();

        expect(requestBody).toMatchObject({
          ids: ['id-1', 'id-2', 'id-3'],
          text: true,
        });
      });
    });
  });

  describe('.NEURAL_SEARCH', () => {
    describe('when neural search is successful', () => {
      it('returns formatted neural search results', async () => {
        const server = setupServer(
          http.post('https://api.exa.ai/search', () => {
            return HttpResponse.json(mockSearchResponse);
          })
        );
        server.listen();

        const tool = ExaConnectorConfig.tools.NEURAL_SEARCH as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'test-api-key',
        });

        const actual = await tool.handler(
          {
            query: 'semantic search query',
            numResults: 5,
            category: 'research paper',
          },
          mockContext
        );

        server.close();

        expect(actual).toContain('Found 2 search results');
        expect(actual).toContain('Test Article 1');
      });
    });

    describe('when using neural search type', () => {
      it('forces type to neural in request', async () => {
        let requestBody: unknown;
        const server = setupServer(
          http.post('https://api.exa.ai/search', async ({ request }) => {
            requestBody = await request.json();
            return HttpResponse.json(mockSearchResponse);
          })
        );
        server.listen();

        const tool = ExaConnectorConfig.tools.NEURAL_SEARCH as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'test-api-key',
        });

        await tool.handler(
          {
            query: 'semantic query',
          },
          mockContext
        );

        server.close();

        expect((requestBody as { type: string }).type).toBe('neural');
      });
    });

    describe('when API returns error', () => {
      it('returns specific neural search error message', async () => {
        const server = setupServer(
          http.post('https://api.exa.ai/search', () => {
            return new HttpResponse('Neural search failed', { status: 500 });
          })
        );
        server.listen();

        const tool = ExaConnectorConfig.tools.NEURAL_SEARCH as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'test-api-key',
        });

        const actual = await tool.handler(
          {
            query: 'test query',
          },
          mockContext
        );

        server.close();

        expect(actual).toContain('An error occurred while performing neural search');
        expect(actual).toContain('Exa API error (500)');
      });
    });
  });
});

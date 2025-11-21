import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { ParallelConnectorConfig } from './parallel';

const createMockContextWithCredentials = () => {
  const mockContext = createMockConnectorContext();
  mockContext.getCredentials = vi.fn().mockResolvedValue({ apiKey: 'test-api-key' });
  return mockContext;
};

const mockSearchResponse = {
  search_id: 'search_12345',
  results: [
    {
      url: 'https://example.com/result1',
      title: 'Test Result 1',
      excerpts: [
        'This is test content for result 1 with detailed information about the topic.',
      ],
    },
    {
      url: 'https://example.com/result2',
      title: 'Test Result 2',
      excerpts: [
        'This is test content for result 2 with more details about the subject matter.',
      ],
    },
  ],
};

const server = setupServer(
  http.post('https://api.parallel.ai/alpha/search', () => {
    return HttpResponse.json(mockSearchResponse);
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('#ParallelConnectorConfig', () => {
  describe('.SEARCH', () => {
    it('should search with objective only', async () => {
      const tool = ParallelConnectorConfig.tools.SEARCH as MCPToolDefinition;

      const actual = await tool.handler(
        {
          objective: 'What is artificial intelligence?',
        },
        createMockContextWithCredentials()
      );

      expect(actual).toContain('Found 2 search results');
      expect(actual).toContain('Test Result 1');
      expect(actual).toContain('Test Result 2');
      expect(actual).toContain('https://example.com/result1');
      expect(actual).toContain('https://example.com/result2');
    });

    it('should search with search queries only', async () => {
      const tool = ParallelConnectorConfig.tools.SEARCH as MCPToolDefinition;

      const actual = await tool.handler(
        {
          searchQueries: ['AI development', 'machine learning'],
        },
        createMockContextWithCredentials()
      );

      expect(actual).toContain('Found 2 search results');
      expect(actual).toContain('Test Result 1');
    });

    it('should return error when neither objective nor searchQueries provided', async () => {
      const tool = ParallelConnectorConfig.tools.SEARCH as MCPToolDefinition;

      const actual = await tool.handler({}, createMockContextWithCredentials());

      expect(actual).toBe('Error: Either objective or searchQueries must be provided.');
    });

    it('should handle search results with empty excerpts', async () => {
      server.use(
        http.post('https://api.parallel.ai/alpha/search', () => {
          return HttpResponse.json({
            search_id: 'search_456',
            results: [
              {
                url: 'https://example.com/no-excerpts',
                title: 'Result Without Excerpts',
                excerpts: [],
              },
              {
                url: 'https://example.com/with-excerpts',
                title: 'Result With Excerpts',
                excerpts: ['This has content'],
              },
            ],
          });
        })
      );

      const tool = ParallelConnectorConfig.tools.SEARCH as MCPToolDefinition;

      const actual = await tool.handler(
        {
          objective: 'test search with missing content',
        },
        createMockContextWithCredentials()
      );

      expect(actual).toContain('Found 2 search results');
      expect(actual).toContain('Result Without Excerpts');
      expect(actual).toContain('Result With Excerpts');
      expect(actual).toContain('This has content');
    });

    it('should handle long excerpts by truncating', async () => {
      const longText = 'A'.repeat(300);
      server.use(
        http.post('https://api.parallel.ai/alpha/search', () => {
          return HttpResponse.json({
            search_id: 'search_789',
            results: [
              {
                url: 'https://example.com/long',
                title: 'Long Content Result',
                excerpts: [longText],
              },
            ],
          });
        })
      );

      const tool = ParallelConnectorConfig.tools.SEARCH as MCPToolDefinition;

      const actual = await tool.handler(
        {
          objective: 'test long content',
        },
        createMockContextWithCredentials()
      );

      expect(actual).toContain('Found 1 search results');
      expect(actual).toContain('Long Content Result');
      expect(actual).toContain(`${'A'.repeat(200)}...`);
    });

    it('should handle empty results', async () => {
      server.use(
        http.post('https://api.parallel.ai/alpha/search', () => {
          return HttpResponse.json({
            search_id: 'search_empty',
            results: [],
          });
        })
      );

      const tool = ParallelConnectorConfig.tools.SEARCH as MCPToolDefinition;

      const actual = await tool.handler(
        {
          objective: 'nonexistent topic',
        },
        createMockContextWithCredentials()
      );

      expect(actual).toBe('No search results found for your query.');
    });

    it('should handle API error', async () => {
      server.use(
        http.post('https://api.parallel.ai/alpha/search', () => {
          return new HttpResponse(null, { status: 401, statusText: 'Unauthorized' });
        })
      );

      const tool = ParallelConnectorConfig.tools.SEARCH as MCPToolDefinition;

      const actual = await tool.handler(
        {
          objective: 'test search',
        },
        createMockContextWithCredentials()
      );

      expect(actual).toContain('Failed to perform search');
      expect(actual).toContain('401 Unauthorized');
    });

    it('should use pro processor when specified', async () => {
      const tool = ParallelConnectorConfig.tools.SEARCH as MCPToolDefinition;

      const actual = await tool.handler(
        {
          objective: 'Advanced search',
          processor: 'pro',
          maxResults: 3,
        },
        createMockContextWithCredentials()
      );

      expect(actual).toContain('Found 2 search results');
    });

    it('should handle both objective and searchQueries', async () => {
      const tool = ParallelConnectorConfig.tools.SEARCH as MCPToolDefinition;

      const actual = await tool.handler(
        {
          objective: 'AI research',
          searchQueries: ['machine learning', 'neural networks'],
          maxResults: 10,
        },
        createMockContextWithCredentials()
      );

      expect(actual).toContain('Found 2 search results');
      expect(actual).toContain('Test Result 1');
      expect(actual).toContain('Test Result 2');
    });
  });
});

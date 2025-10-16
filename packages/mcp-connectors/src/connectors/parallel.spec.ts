import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { extractToolsFromServer } from '../__mocks__/server-tools';
import { createParallelServer } from './parallel';

const PARALLEL_API_BASE = 'https://api.parallel.ai';

describe('#ParallelConnector', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe('.parallel_search', () => {
    it('returns formatted results when the API succeeds', async () => {
      server.use(
        http.post(`${PARALLEL_API_BASE}/alpha/search`, async ({ request }) => {
          const body = (await request.json()) as Record<string, unknown>;

          expect(body.objective).toBe('Find AI news');
          expect(body.max_results).toBe(3);
          expect(body.processor).toBe('base');

          return HttpResponse.json({
            search_id: 'search_123',
            results: [
              {
                url: 'https://example.com/result1',
                title: 'Result 1',
                excerpts: ['Snippet 1'],
              },
              {
                url: 'https://example.com/result2',
                title: 'Result 2',
                excerpts: ['Snippet 2'],
              },
            ],
          });
        })
      );

      const mcpServer = createParallelServer({ apiKey: 'test-api-key' });
      const tools = extractToolsFromServer(mcpServer);
      const actual = (await tools.parallel_search?.handler({
        objective: 'Find AI news',
        maxResults: 3,
      })) ?? '';

      expect(actual).toContain('Found 2 search results');
      expect(actual).toContain('Result 1');
      expect(actual).toContain('https://example.com/result2');
    });

    it('returns a validation error message when objective and queries missing', async () => {
      const mcpServer = createParallelServer({ apiKey: 'test-api-key' });
      const tools = extractToolsFromServer(mcpServer);
      const actual = (await tools.parallel_search?.handler({})) ?? '';

      expect(actual).toBe('Error: Either objective or searchQueries must be provided.');
    });

    it('returns API error details when the request fails', async () => {
      server.use(
        http.post(`${PARALLEL_API_BASE}/alpha/search`, () => {
          return HttpResponse.json(
            {
              error: 'invalid processor',
            },
            {
              status: 400,
              statusText: 'Bad Request',
            }
          );
        })
      );

      const mcpServer = createParallelServer({ apiKey: 'test-api-key', processor: 'pro' });
      const tools = extractToolsFromServer(mcpServer);
      const actual = (await tools.parallel_search?.handler({
        objective: 'Find AI news',
      })) ?? '';

      expect(actual).toContain('Failed to perform search');
      expect(actual).toContain('400');
    });
  });
});

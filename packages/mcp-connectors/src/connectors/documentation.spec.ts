import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { describe, expect, it } from 'vitest';
import { extractToolsFromServer } from '../__mocks__/server-tools';
import { createDocumentationServer } from './documentation';

describe('#DocumentationConnectorConfig', () => {
  describe('.GET_PROVIDER_KEY', () => {
    describe('when provider_name is not provided', () => {
      it('returns all available providers', async () => {
        const mcpServer = createDocumentationServer({});
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.get_provider_key?.handler({});

        expect(actual).toContain('Available Documentation Providers:');
      });
    });

    describe('when provider_name is empty string', () => {
      it('returns all available providers', async () => {
        const mcpServer = createDocumentationServer({});
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.get_provider_key?.handler({ provider_name: '' });

        expect(actual).toContain('Available Documentation Providers:');
      });
    });

    describe('when provider_name matches existing provider', () => {
      it('returns matching providers with descriptions', async () => {
        const mcpServer = createDocumentationServer({});
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.get_provider_key?.handler({
          provider_name: 'anthropic',
        });

        expect(actual).toContain('anthropic');
      });
    });

    describe('when provider_name does not match any provider', () => {
      it('returns no matches message', async () => {
        const mcpServer = createDocumentationServer({});
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.get_provider_key?.handler({
          provider_name: 'nonexistent',
        });

        expect(actual).toContain('No providers found matching "nonexistent"');
      });
    });
  });

  describe('.SEARCH_DOCS', () => {
    describe('when provider_key does not exist', () => {
      it('returns provider not found error', async () => {
        const mcpServer = createDocumentationServer({});
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.search_docs?.handler({
          provider_key: 'nonexistent',
          query: 'test query',
        });

        expect(actual).toContain('Provider "nonexistent" not found');
      });
    });

    describe('when query is empty', () => {
      it('returns meaningful query error', async () => {
        const mcpServer = createDocumentationServer({});
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.search_docs?.handler({
          provider_key: 'anthropic',
          query: '',
        });

        expect(actual).toContain('Please provide a meaningful search query');
      });
    });

    describe('when query is too short', () => {
      it('returns meaningful query error', async () => {
        const mcpServer = createDocumentationServer({});
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.search_docs?.handler({
          provider_key: 'anthropic',
          query: 'a',
        });

        expect(actual).toContain('Please provide a meaningful search query');
      });
    });

    describe('when documentation is not cached', () => {
      describe('and external fetch fails', () => {
        it('returns fetch error message', async () => {
          const server = setupServer(
            http.get('https://docs.anthropic.com/llms-full.txt', () => {
              return new HttpResponse(null, { status: 404, statusText: 'Not Found' });
            })
          );
          server.listen();

          const mcpServer = createDocumentationServer({});
          const tools = extractToolsFromServer(mcpServer);

          const actual = await tools.search_docs?.handler({
            provider_key: 'anthropic',
            query: 'test',
          });

          server.close();

          expect(actual).toContain(
            'Error fetching documentation for Anthropic: 404 Not Found'
          );
        });
      });
    });

    describe('when documentation is cached', () => {
      it('uses cached text and skips external fetch', async () => {
        const mcpServer = createDocumentationServer({});
        const tools = extractToolsFromServer(mcpServer);
        const sampleText = 'hello '.repeat(60); // ~300 chars

        // Pre-populate the in-memory cache by making a successful first request
        const server = setupServer(
          http.get(
            'https://docs.anthropic.com/llms-full.txt',
            () => new HttpResponse(sampleText)
          )
        );
        server.listen();

        // First request to populate cache
        await tools.search_docs?.handler({
          provider_key: 'anthropic',
          query: 'hello',
        });

        server.close();

        // Second request should use cache
        const actual = await tools.search_docs?.handler({
          provider_key: 'anthropic',
          query: 'hello',
        });

        expect(actual).toContain('Found');
      });
    });

    describe('when documentation is fetched successfully', () => {
      it('writes fetched text to cache', async () => {
        const sampleText = 'pinecone '.repeat(60);
        const server = setupServer(
          http.get(
            'https://docs.pinecone.io/llms-full.txt',
            () => new HttpResponse(sampleText)
          )
        );
        server.listen();

        const mcpServer = createDocumentationServer({});
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.search_docs?.handler({
          provider_key: 'pinecone',
          query: 'pinecone',
        });

        server.close();

        expect(actual).toContain('Found');
      });
    });
  });
});

import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { describe, expect, it, vi } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { DocumentationConnectorConfig } from './documentation';

describe('#DocumentationConnectorConfig', () => {
  describe('.GET_PROVIDER_KEY', () => {
    describe('when provider_name is not provided', () => {
      it('returns all available providers', async () => {
        const tool = DocumentationConnectorConfig.tools
          .GET_PROVIDER_KEY as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler({}, mockContext);

        expect(actual).toContain('Available Documentation Providers:');
      });
    });

    describe('when provider_name is empty string', () => {
      it('returns all available providers', async () => {
        const tool = DocumentationConnectorConfig.tools
          .GET_PROVIDER_KEY as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler({ provider_name: '' }, mockContext);

        expect(actual).toContain('Available Documentation Providers:');
      });
    });

    describe('when provider_name matches existing provider', () => {
      it('returns matching providers with descriptions', async () => {
        const tool = DocumentationConnectorConfig.tools
          .GET_PROVIDER_KEY as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler({ provider_name: 'anthropic' }, mockContext);

        expect(actual).toContain('anthropic');
      });
    });

    describe('when provider_name does not match any provider', () => {
      it('returns no matches message', async () => {
        const tool = DocumentationConnectorConfig.tools
          .GET_PROVIDER_KEY as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler({ provider_name: 'nonexistent' }, mockContext);

        expect(actual).toContain('No providers found matching "nonexistent"');
      });
    });
  });

  describe('.SEARCH_DOCS', () => {
    describe('when provider_key does not exist', () => {
      it('returns provider not found error', async () => {
        const tool = DocumentationConnectorConfig.tools.SEARCH_DOCS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler(
          {
            provider_key: 'nonexistent',
            query: 'test query',
          },
          mockContext
        );

        expect(actual).toContain('Provider "nonexistent" not found');
      });
    });

    describe('when query is empty', () => {
      it('returns meaningful query error', async () => {
        const tool = DocumentationConnectorConfig.tools.SEARCH_DOCS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler(
          {
            provider_key: 'anthropic',
            query: '',
          },
          mockContext
        );

        expect(actual).toContain('Please provide a meaningful search query');
      });
    });

    describe('when query is too short', () => {
      it('returns meaningful query error', async () => {
        const tool = DocumentationConnectorConfig.tools.SEARCH_DOCS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler(
          {
            provider_key: 'anthropic',
            query: 'a',
          },
          mockContext
        );

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

          const tool = DocumentationConnectorConfig.tools
            .SEARCH_DOCS as MCPToolDefinition;
          const mockContext = createMockConnectorContext();
          (
            mockContext.readCache as unknown as ReturnType<typeof vi.fn>
          ).mockResolvedValueOnce(null);

          const actual = await tool.handler(
            {
              provider_key: 'anthropic',
              query: 'test',
            },
            mockContext
          );

          server.close();

          expect(actual).toContain(
            'Error fetching documentation for Anthropic: 404 Not Found'
          );
        });
      });
    });

    describe('when documentation is cached', () => {
      it('uses cached text and skips external fetch', async () => {
        const tool = DocumentationConnectorConfig.tools.SEARCH_DOCS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        const sampleText = 'hello '.repeat(60); // ~300 chars

        (
          mockContext.readCache as unknown as ReturnType<typeof vi.fn>
        ).mockResolvedValueOnce(sampleText);

        const fetchSpy = vi.spyOn(global, 'fetch');

        const actual = await tool.handler(
          {
            provider_key: 'anthropic',
            query: 'hello',
          },
          mockContext
        );

        expect(actual).toContain('Found');
        expect(fetchSpy).not.toHaveBeenCalled();

        fetchSpy.mockRestore();
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

        const tool = DocumentationConnectorConfig.tools.SEARCH_DOCS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        // Ensure cache miss first
        (
          mockContext.readCache as unknown as ReturnType<typeof vi.fn>
        ).mockResolvedValueOnce(null);

        const writeSpy = mockContext.writeCache as unknown as ReturnType<typeof vi.fn>;

        const actual = await tool.handler(
          {
            provider_key: 'pinecone',
            query: 'pinecone',
          },
          mockContext
        );

        server.close();

        expect(actual).toContain('Found');
        expect(writeSpy).toHaveBeenCalled();
      });
    });
  });
});

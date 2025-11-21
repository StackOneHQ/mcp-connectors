import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { NotionConnectorConfig } from './notion';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('#NotionConnector', () => {
  describe('.GET_ME', () => {
    describe('when request is successful', () => {
      it('returns user information', async () => {
        server.use(
          http.get('https://api.notion.com/v1/users/me', () => {
            return HttpResponse.json({
              object: 'user',
              id: 'user-123',
              name: 'Test User',
              avatar_url: null,
              type: 'person',
              person: {
                email: 'test@example.com',
              },
            });
          })
        );

        const tool = NotionConnectorConfig.tools.GET_ME as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ token: 'secret_test_token' });

        const actual = await tool.handler({}, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.id).toBe('user-123');
        expect(parsed.name).toBe('Test User');
        expect(parsed.person.email).toBe('test@example.com');
      });
    });

    describe('when authentication fails', () => {
      it('returns unauthorized error', async () => {
        server.use(
          http.get('https://api.notion.com/v1/users/me', () => {
            return HttpResponse.json(
              { code: 'unauthorized', message: 'API token is invalid' },
              { status: 401 }
            );
          })
        );

        const tool = NotionConnectorConfig.tools.GET_ME as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ token: 'invalid_token' });

        const actual = await tool.handler({}, mockContext);

        expect(actual).toContain('Unauthorized');
        expect(actual).toContain('check your Notion integration token');
      });
    });
  });

  describe('.LIST_USERS', () => {
    describe('when listing users with pagination', () => {
      it('returns paginated user list', async () => {
        server.use(
          http.get('https://api.notion.com/v1/users', ({ request }) => {
            const url = new URL(request.url);
            const pageSize = url.searchParams.get('page_size');
            const startCursor = url.searchParams.get('start_cursor');

            expect(pageSize).toBe('10');
            expect(startCursor).toBe('cursor-123');

            return HttpResponse.json({
              object: 'list',
              results: [
                { id: 'user-1', name: 'User 1', type: 'person' },
                { id: 'user-2', name: 'User 2', type: 'bot' },
              ],
              has_more: false,
              next_cursor: null,
            });
          })
        );

        const tool = NotionConnectorConfig.tools.LIST_USERS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ token: 'secret_test_token' });

        const actual = await tool.handler(
          { page_size: 10, start_cursor: 'cursor-123' },
          mockContext
        );
        const parsed = JSON.parse(actual);

        expect(parsed.results).toHaveLength(2);
        expect(parsed.results[0].name).toBe('User 1');
        expect(parsed.has_more).toBe(false);
      });
    });
  });

  describe('.GET_PAGE', () => {
    describe('when page exists', () => {
      it('returns page details', async () => {
        server.use(
          http.get('https://api.notion.com/v1/pages/page-123', () => {
            return HttpResponse.json({
              object: 'page',
              id: 'page-123',
              created_time: '2024-01-01T00:00:00.000Z',
              last_edited_time: '2024-01-02T00:00:00.000Z',
              properties: {
                title: {
                  id: 'title',
                  type: 'title',
                  title: [{ text: { content: 'Test Page' } }],
                },
              },
            });
          })
        );

        const tool = NotionConnectorConfig.tools.GET_PAGE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ token: 'secret_test_token' });

        const actual = await tool.handler({ page_id: 'page-123' }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.id).toBe('page-123');
        expect(parsed.properties.title.title[0].text.content).toBe('Test Page');
      });
    });

    describe('when page does not exist', () => {
      it('returns not found error', async () => {
        server.use(
          http.get('https://api.notion.com/v1/pages/invalid-id', () => {
            return HttpResponse.json(
              { code: 'object_not_found', message: 'Page not found' },
              { status: 404 }
            );
          })
        );

        const tool = NotionConnectorConfig.tools.GET_PAGE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ token: 'secret_test_token' });

        const actual = await tool.handler({ page_id: 'invalid-id' }, mockContext);

        expect(actual).toContain('not found');
        expect(actual).toContain('check the ID');
      });
    });
  });

  describe('.CREATE_PAGE', () => {
    describe('when creating a page in another page', () => {
      it('creates page successfully', async () => {
        server.use(
          http.post('https://api.notion.com/v1/pages', async ({ request }) => {
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            const body = (await request.json()) as any;

            expect(body.parent.page_id).toBe('parent-123');
            expect(body.properties.title.title[0].text.content).toBe('New Page');

            return HttpResponse.json({
              object: 'page',
              id: 'new-page-123',
              parent: { type: 'page_id', page_id: 'parent-123' },
              properties: body.properties,
            });
          })
        );

        const tool = NotionConnectorConfig.tools.CREATE_PAGE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ token: 'secret_test_token' });

        const actual = await tool.handler(
          {
            parent_id: 'parent-123',
            parent_type: 'page_id',
            title: 'New Page',
          },
          mockContext
        );
        const parsed = JSON.parse(actual);

        expect(parsed.id).toBe('new-page-123');
        expect(parsed.parent.page_id).toBe('parent-123');
      });
    });

    describe('when creating a page with content blocks', () => {
      it('creates page with children', async () => {
        server.use(
          http.post('https://api.notion.com/v1/pages', async ({ request }) => {
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            const body = (await request.json()) as any;

            expect(body.children).toHaveLength(2);
            expect(body.children[0].type).toBe('heading_1');
            expect(body.children[1].type).toBe('paragraph');

            return HttpResponse.json({
              object: 'page',
              id: 'new-page-123',
              parent: body.parent,
              properties: body.properties,
            });
          })
        );

        const tool = NotionConnectorConfig.tools.CREATE_PAGE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ token: 'secret_test_token' });

        const actual = await tool.handler(
          {
            parent_id: 'parent-123',
            parent_type: 'page_id',
            title: 'Page with Content',
            children: [
              {
                type: 'heading_1',
                heading_1: {
                  rich_text: [{ type: 'text', text: { content: 'Heading' } }],
                },
              },
              {
                type: 'paragraph',
                paragraph: {
                  rich_text: [{ type: 'text', text: { content: 'Paragraph text' } }],
                },
              },
            ],
          },
          mockContext
        );
        const parsed = JSON.parse(actual);

        expect(parsed.id).toBe('new-page-123');
      });
    });
  });

  describe('.SEARCH', () => {
    describe('when searching with filters', () => {
      it('returns filtered search results', async () => {
        server.use(
          http.post('https://api.notion.com/v1/search', async ({ request }) => {
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            const body = (await request.json()) as any;

            expect(body.query).toBe('test query');
            expect(body.filter.value).toBe('page');
            expect(body.page_size).toBe(20);

            return HttpResponse.json({
              object: 'list',
              results: [
                {
                  object: 'page',
                  id: 'page-1',
                  properties: {
                    title: { title: [{ text: { content: 'Test Result 1' } }] },
                  },
                },
                {
                  object: 'page',
                  id: 'page-2',
                  properties: {
                    title: { title: [{ text: { content: 'Test Result 2' } }] },
                  },
                },
              ],
              has_more: false,
              next_cursor: null,
            });
          })
        );

        const tool = NotionConnectorConfig.tools.SEARCH as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ token: 'secret_test_token' });

        const actual = await tool.handler(
          { query: 'test query', filter: 'page', page_size: 20 },
          mockContext
        );
        const parsed = JSON.parse(actual);

        expect(parsed.results).toHaveLength(2);
        expect(parsed.results[0].id).toBe('page-1');
      });
    });

    describe('when search is rate limited', () => {
      it('returns rate limit error', async () => {
        server.use(
          http.post('https://api.notion.com/v1/search', () => {
            return HttpResponse.json(
              { code: 'rate_limited', message: 'Too many requests' },
              { status: 429 }
            );
          })
        );

        const tool = NotionConnectorConfig.tools.SEARCH as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ token: 'secret_test_token' });

        const actual = await tool.handler({ query: 'test' }, mockContext);

        expect(actual).toContain('Rate limited');
        expect(actual).toContain('wait before making more requests');
      });
    });
  });

  describe('.QUERY_DATABASE', () => {
    describe('when querying with filters and sorts', () => {
      it('returns filtered database entries', async () => {
        server.use(
          http.post(
            'https://api.notion.com/v1/databases/db-123/query',
            async ({ request }) => {
              // biome-ignore lint/suspicious/noExplicitAny: <explanation>
              const body = (await request.json()) as any;

              expect(body.filter).toBeDefined();
              expect(body.sorts).toHaveLength(1);
              expect(body.sorts[0].direction).toBe('descending');

              return HttpResponse.json({
                object: 'list',
                results: [
                  {
                    id: 'entry-1',
                    properties: { Name: { title: [{ text: { content: 'Entry 1' } }] } },
                  },
                  {
                    id: 'entry-2',
                    properties: { Name: { title: [{ text: { content: 'Entry 2' } }] } },
                  },
                ],
                has_more: false,
                next_cursor: null,
              });
            }
          )
        );

        const tool = NotionConnectorConfig.tools.QUERY_DATABASE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ token: 'secret_test_token' });

        const actual = await tool.handler(
          {
            database_id: 'db-123',
            filter: { property: 'Status', select: { equals: 'Done' } },
            sorts: [{ property: 'Created', direction: 'descending' }],
          },
          mockContext
        );
        const parsed = JSON.parse(actual);

        expect(parsed.results).toHaveLength(2);
        expect(parsed.results[0].id).toBe('entry-1');
      });
    });
  });

  describe('.CREATE_DATABASE', () => {
    describe('when creating a database', () => {
      it('creates database with properties', async () => {
        server.use(
          http.post('https://api.notion.com/v1/databases', async ({ request }) => {
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            const body = (await request.json()) as any;

            expect(body.parent.page_id).toBe('parent-page-123');
            expect(body.title[0].text.content).toBe('Tasks Database');
            expect(body.properties.Name).toBeDefined();
            expect(body.properties.Status).toBeDefined();

            return HttpResponse.json({
              object: 'database',
              id: 'db-new-123',
              title: body.title,
              properties: body.properties,
            });
          })
        );

        const tool = NotionConnectorConfig.tools.CREATE_DATABASE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ token: 'secret_test_token' });

        const actual = await tool.handler(
          {
            parent_page_id: 'parent-page-123',
            title: 'Tasks Database',
            properties: {
              Name: { type: 'title', title: {} },
              Status: {
                type: 'select',
                select: {
                  options: [
                    { name: 'Todo', color: 'gray' },
                    { name: 'In Progress', color: 'blue' },
                    { name: 'Done', color: 'green' },
                  ],
                },
              },
            },
          },
          mockContext
        );
        const parsed = JSON.parse(actual);

        expect(parsed.id).toBe('db-new-123');
        expect(parsed.title[0].text.content).toBe('Tasks Database');
      });
    });
  });

  describe('.APPEND_BLOCK_CHILDREN', () => {
    describe('when appending blocks to a page', () => {
      it('adds blocks successfully', async () => {
        server.use(
          http.patch(
            'https://api.notion.com/v1/blocks/block-123/children',
            async ({ request }) => {
              // biome-ignore lint/suspicious/noExplicitAny: <explanation>
              const body = (await request.json()) as any;

              expect(body.children).toHaveLength(3);
              expect(body.children[0].type).toBe('heading_2');
              expect(body.children[1].type).toBe('paragraph');
              expect(body.children[2].type).toBe('divider');

              return HttpResponse.json({
                object: 'list',
                results: body.children.map(
                  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
                  (child: any, index: number) => ({
                    ...child,
                    id: `block-${index}`,
                    object: 'block',
                  })
                ),
              });
            }
          )
        );

        const tool = NotionConnectorConfig.tools
          .APPEND_BLOCK_CHILDREN as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ token: 'secret_test_token' });

        const actual = await tool.handler(
          {
            block_id: 'block-123',
            children: [
              {
                type: 'heading_2',
                heading_2: {
                  rich_text: [{ type: 'text', text: { content: 'Section Title' } }],
                },
              },
              {
                type: 'paragraph',
                paragraph: {
                  rich_text: [{ type: 'text', text: { content: 'Some content' } }],
                },
              },
              { type: 'divider', divider: {} },
            ],
          },
          mockContext
        );
        const parsed = JSON.parse(actual);

        expect(parsed.results).toHaveLength(3);
        expect(parsed.results[0].type).toBe('heading_2');
      });
    });
  });

  describe('.UPDATE_PAGE', () => {
    describe('when updating page properties', () => {
      it('updates page successfully', async () => {
        server.use(
          http.patch('https://api.notion.com/v1/pages/page-123', async ({ request }) => {
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            const body = (await request.json()) as any;

            expect(body.properties.title.title[0].text.content).toBe('Updated Title');
            expect(body.archived).toBe(false);

            return HttpResponse.json({
              object: 'page',
              id: 'page-123',
              properties: body.properties,
              archived: body.archived,
            });
          })
        );

        const tool = NotionConnectorConfig.tools.UPDATE_PAGE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ token: 'secret_test_token' });

        const actual = await tool.handler(
          {
            page_id: 'page-123',
            properties: {
              title: {
                title: [{ type: 'text', text: { content: 'Updated Title' } }],
              },
            },
            archived: false,
          },
          mockContext
        );
        const parsed = JSON.parse(actual);

        expect(parsed.id).toBe('page-123');
        expect(parsed.archived).toBe(false);
      });
    });
  });

  describe('.CREATE_COMMENT', () => {
    describe('when creating a new comment thread', () => {
      it('creates comment on page', async () => {
        server.use(
          http.post('https://api.notion.com/v1/comments', async ({ request }) => {
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            const body = (await request.json()) as any;

            expect(body.parent.page_id).toBe('page-123');
            expect(body.rich_text[0].text.content).toBe('This is a comment');

            return HttpResponse.json({
              id: 'comment-123',
              object: 'comment',
              parent: body.parent,
              rich_text: body.rich_text,
              created_time: '2024-01-01T00:00:00.000Z',
            });
          })
        );

        const tool = NotionConnectorConfig.tools.CREATE_COMMENT as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ token: 'secret_test_token' });

        const actual = await tool.handler(
          {
            parent_id: 'page-123',
            parent_type: 'page_id',
            comment_text: 'This is a comment',
          },
          mockContext
        );
        const parsed = JSON.parse(actual);

        expect(parsed.id).toBe('comment-123');
        expect(parsed.rich_text[0].text.content).toBe('This is a comment');
      });
    });

    describe('when adding to existing discussion', () => {
      it('adds comment to thread', async () => {
        server.use(
          http.post('https://api.notion.com/v1/comments', async ({ request }) => {
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            const body = (await request.json()) as any;

            expect(body.discussion_id).toBe('discussion-123');
            expect(body.rich_text[0].text.content).toBe('Reply to thread');

            return HttpResponse.json({
              id: 'comment-456',
              object: 'comment',
              discussion_id: 'discussion-123',
              rich_text: body.rich_text,
            });
          })
        );

        const tool = NotionConnectorConfig.tools.CREATE_COMMENT as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ token: 'secret_test_token' });

        const actual = await tool.handler(
          {
            parent_id: 'page-123',
            parent_type: 'page_id',
            comment_text: 'Reply to thread',
            discussion_id: 'discussion-123',
          },
          mockContext
        );
        const parsed = JSON.parse(actual);

        expect(parsed.id).toBe('comment-456');
        expect(parsed.discussion_id).toBe('discussion-123');
      });
    });
  });

  describe('configuration', () => {
    it('should be properly configured', () => {
      expect(NotionConnectorConfig).toBeDefined();
      expect(NotionConnectorConfig.name).toBe('Notion');
      expect(NotionConnectorConfig.key).toBe('notion');
      expect(NotionConnectorConfig.version).toBe('1.0.0');
    });

    it('should have valid credentials schema', () => {
      const credentialsSchema = NotionConnectorConfig.credentials;

      expect(() =>
        credentialsSchema.parse({
          token: 'secret_1234567890abcdefghijklmnopqrstuv',
        })
      ).not.toThrow();

      expect(() => credentialsSchema.parse({})).toThrow();
    });

    it('should have empty setup schema', () => {
      const setupSchema = NotionConnectorConfig.setup;
      expect(() => setupSchema.parse({})).not.toThrow();
    });

    it('should have an example prompt', () => {
      expect(NotionConnectorConfig.examplePrompt).toBeDefined();
      expect(typeof NotionConnectorConfig.examplePrompt).toBe('string');
      expect(NotionConnectorConfig.examplePrompt?.length).toBeGreaterThan(0);
    });

    it('should have tools object with expected tools', () => {
      expect(typeof NotionConnectorConfig.tools).toBe('object');
      expect(NotionConnectorConfig.tools).toBeDefined();

      const expectedTools = [
        'GET_ME',
        'LIST_USERS',
        'GET_PAGE',
        'CREATE_PAGE',
        'UPDATE_PAGE',
        'CREATE_COMMENT',
        'LIST_COMMENTS',
        'SEARCH',
        'CREATE_DATABASE',
        'LIST_DATABASES',
        'GET_DATABASE',
        'QUERY_DATABASE',
        'GET_BLOCK_CHILDREN',
        'APPEND_BLOCK_CHILDREN',
      ];

      for (const toolName of expectedTools) {
        expect(NotionConnectorConfig.tools[toolName]).toBeDefined();
      }
    });
  });
});

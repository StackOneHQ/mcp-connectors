import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { GraphyConnectorConfig } from './graphy';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('#GraphyConnector', () => {
  describe('.LIST_BOARDS', () => {
    describe('when API returns boards successfully', () => {
      describe('and no pagination parameters are provided', () => {
        it('returns list of boards with default pagination', async () => {
          const mockBoards = [
            {
              id: 'board-1',
              title: 'Sales Dashboard',
              type: 'bar',
              description: 'Monthly sales data',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-02T00:00:00Z',
              is_public: false,
            },
            {
              id: 'board-2',
              title: 'User Growth',
              type: 'line',
              description: 'User growth over time',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-02T00:00:00Z',
              is_public: true,
            },
          ];

          server.use(
            http.get('https://api.graphy.app/rest/v1/boards', ({ request }) => {
              const url = new URL(request.url);
              expect(url.searchParams.get('limit')).toBe('50');
              expect(url.searchParams.get('offset')).toBe('0');
              return HttpResponse.json({ results: mockBoards });
            })
          );

          const tool = GraphyConnectorConfig.tools.LIST_BOARDS as MCPToolDefinition;
          const mockContext = createMockConnectorContext({
            credentials: { apiToken: 'test-token' },
          });

          const actual = await tool.handler({}, mockContext);

          expect(actual).toBe(JSON.stringify(mockBoards, null, 2));
        });
      });

      describe('and custom pagination parameters are provided', () => {
        it('returns list of boards with specified pagination', async () => {
          const mockBoards = [
            {
              id: 'board-3',
              title: 'Revenue Chart',
              type: 'pie',
              description: 'Revenue breakdown',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-02T00:00:00Z',
              is_public: false,
            },
          ];

          server.use(
            http.get('https://api.graphy.app/rest/v1/boards', ({ request }) => {
              const url = new URL(request.url);
              expect(url.searchParams.get('limit')).toBe('10');
              expect(url.searchParams.get('offset')).toBe('5');
              return HttpResponse.json({ results: mockBoards });
            })
          );

          const tool = GraphyConnectorConfig.tools.LIST_BOARDS as MCPToolDefinition;
          const mockContext = createMockConnectorContext({
            credentials: { apiToken: 'test-token' },
          });

          const actual = await tool.handler({ limit: 10, offset: 5 }, mockContext);

          expect(actual).toBe(JSON.stringify(mockBoards, null, 2));
        });
      });
    });

    describe('when API returns unauthorized error', () => {
      it('returns authorization error message', async () => {
        server.use(
          http.get('https://api.graphy.app/rest/v1/boards', () => {
            return HttpResponse.json({ message: 'Unauthorized access' }, { status: 401 });
          })
        );

        const tool = GraphyConnectorConfig.tools.LIST_BOARDS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiToken: 'test-token' },
        });

        const actual = await tool.handler({}, mockContext);

        expect(actual).toBe('Error: Unauthorized. Please check your Graphy API token and permissions.');
      });
    });

    describe('when API returns not found error', () => {
      it('returns not found error message with API guidance', async () => {
        server.use(
          http.get('https://api.graphy.app/rest/v1/boards', () => {
            return HttpResponse.json({ message: 'Not found' }, { status: 404 });
          })
        );

        const tool = GraphyConnectorConfig.tools.LIST_BOARDS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiToken: 'test-token' },
        });

        const actual = await tool.handler({}, mockContext);

        expect(actual).toBe('Error: API endpoint not found. The Graphy REST API may not be available yet or the endpoint path may have changed. Please check the API documentation at https://visualize.graphy.app/rest-api for the correct endpoints.');
      });
    });
  });

  describe('.GET_BOARD', () => {
    describe('when board exists', () => {
      it('returns board details', async () => {
        const mockBoard = {
          id: 'board-1',
          title: 'Sales Dashboard',
          type: 'bar',
          description: 'Monthly sales data',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          is_public: false,
        };

        server.use(
          http.get('https://api.graphy.app/rest/v1/boards/board-1', () => {
            return HttpResponse.json(mockBoard);
          })
        );

        const tool = GraphyConnectorConfig.tools.GET_BOARD as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiToken: 'test-token' },
        });

        const actual = await tool.handler({ boardId: 'board-1' }, mockContext);

        expect(actual).toBe(JSON.stringify(mockBoard, null, 2));
      });
    });

    describe('when board does not exist', () => {
      it('returns not found error message', async () => {
        server.use(
          http.get('https://api.graphy.app/rest/v1/boards/nonexistent', () => {
            return HttpResponse.json({ message: 'Board not found' }, { status: 404 });
          })
        );

        const tool = GraphyConnectorConfig.tools.GET_BOARD as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiToken: 'test-token' },
        });

        const actual = await tool.handler({ boardId: 'nonexistent' }, mockContext);

        expect(actual).toBe('Error: API endpoint not found. The Graphy REST API may not be available yet or the endpoint path may have changed. Please check the API documentation at https://visualize.graphy.app/rest-api for the correct endpoints.');
      });
    });
  });

  describe('.CREATE_BOARD', () => {
    describe('when board creation is successful', () => {
      it('returns created board details', async () => {
        const mockBoard = {
          id: 'board-new',
          title: 'New Board',
          type: 'line',
          description: 'A new board',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_public: false,
        };

        server.use(
          http.post('https://api.graphy.app/rest/v1/boards', () => {
            return HttpResponse.json(mockBoard);
          })
        );

        const tool = GraphyConnectorConfig.tools.CREATE_BOARD as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiToken: 'test-token' },
        });

        const actual = await tool.handler(
          { title: 'New Board', type: 'line', description: 'A new board' },
          mockContext
        );

        expect(actual).toBe(JSON.stringify(mockBoard, null, 2));
      });
    });

    describe('when board creation fails due to validation', () => {
      it('returns validation error message', async () => {
        server.use(
          http.post('https://api.graphy.app/rest/v1/boards', () => {
            return HttpResponse.json({ message: 'Title is required' }, { status: 400 });
          })
        );

        const tool = GraphyConnectorConfig.tools.CREATE_BOARD as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiToken: 'test-token' },
        });

        const actual = await tool.handler({ title: '', type: 'line' }, mockContext);

        expect(actual).toBe('Error: Title is required');
      });
    });
  });

  describe('.UPDATE_BOARD', () => {
    describe('when board update is successful', () => {
      it('returns updated board details', async () => {
        const mockBoard = {
          id: 'board-1',
          title: 'Updated Board',
          type: 'bar',
          description: 'Updated description',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-03T00:00:00Z',
          is_public: true,
        };

        server.use(
          http.put('https://api.graphy.app/rest/v1/boards/board-1', () => {
            return HttpResponse.json(mockBoard);
          })
        );

        const tool = GraphyConnectorConfig.tools.UPDATE_BOARD as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiToken: 'test-token' },
        });

        const actual = await tool.handler(
          { boardId: 'board-1', title: 'Updated Board', description: 'Updated description' },
          mockContext
        );

        expect(actual).toBe(JSON.stringify(mockBoard, null, 2));
      });
    });
  });

  describe('.DELETE_BOARD', () => {
    describe('when board deletion is successful', () => {
      it('returns success message', async () => {
        server.use(
          http.delete('https://api.graphy.app/rest/v1/boards/board-1', () => {
            return new HttpResponse(null, { status: 204 });
          })
        );

        const tool = GraphyConnectorConfig.tools.DELETE_BOARD as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiToken: 'test-token' },
        });

        const actual = await tool.handler({ boardId: 'board-1' }, mockContext);

        expect(actual).toBe('Board board-1 deleted successfully');
      });
    });
  });

  describe('.LIST_DATASETS', () => {
    describe('when API returns datasets successfully', () => {
      it('returns list of datasets', async () => {
        const mockDatasets = [
          {
            id: 'dataset-1',
            name: 'Sales Data',
            description: 'Monthly sales figures',
            columns: [
              { name: 'month', type: 'string', nullable: false },
              { name: 'revenue', type: 'number', nullable: false },
            ],
            row_count: 12,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z',
          },
        ];

        server.use(
          http.get('https://api.graphy.app/rest/v1/datasets', () => {
            return HttpResponse.json({ results: mockDatasets });
          })
        );

        const tool = GraphyConnectorConfig.tools.LIST_DATASETS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiToken: 'test-token' },
        });

        const actual = await tool.handler({}, mockContext);

        expect(actual).toBe(JSON.stringify(mockDatasets, null, 2));
      });
    });
  });

  describe('.CREATE_DATASET', () => {
    describe('when dataset creation is successful', () => {
      it('returns created dataset details', async () => {
        const mockDataset = {
          id: 'dataset-new',
          name: 'Test Dataset',
          description: 'A test dataset',
          columns: [
            { name: 'id', type: 'number', nullable: false },
            { name: 'name', type: 'string', nullable: false },
          ],
          row_count: 2,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        server.use(
          http.post('https://api.graphy.app/rest/v1/datasets', () => {
            return HttpResponse.json(mockDataset);
          })
        );

        const tool = GraphyConnectorConfig.tools.CREATE_DATASET as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiToken: 'test-token' },
        });

        const actual = await tool.handler(
          {
            name: 'Test Dataset',
            data: [
              [1, 'John'],
              [2, 'Jane'],
            ],
            columns: [
              { name: 'id', type: 'number' },
              { name: 'name', type: 'string' },
            ],
            description: 'A test dataset',
          },
          mockContext
        );

        expect(actual).toBe(JSON.stringify(mockDataset, null, 2));
      });
    });
  });

  describe('.GET_BOARD_DATA', () => {
    describe('when board data is retrieved successfully', () => {
      it('returns board data in JSON format', async () => {
        const mockData = [
          { month: 'January', revenue: 10000 },
          { month: 'February', revenue: 12000 },
        ];

        server.use(
          http.get('https://api.graphy.app/rest/v1/boards/board-1/data', ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get('format')).toBe('json');
            return HttpResponse.json(mockData);
          })
        );

        const tool = GraphyConnectorConfig.tools.GET_BOARD_DATA as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiToken: 'test-token' },
        });

        const actual = await tool.handler({ boardId: 'board-1', format: 'json' }, mockContext);

        expect(actual).toBe(JSON.stringify(mockData, null, 2));
      });
    });
  });

  describe('.SHARE_BOARD', () => {
    describe('when board sharing is successful', () => {
      it('returns success message with embed URL', async () => {
        const mockResponse = {
          embed_url: 'https://visualize.graphy.app/embed/board-1',
        };

        server.use(
          http.post('https://api.graphy.app/rest/v1/boards/board-1/share', () => {
            return HttpResponse.json(mockResponse);
          })
        );

        const tool = GraphyConnectorConfig.tools.SHARE_BOARD as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiToken: 'test-token' },
        });

        const actual = await tool.handler({ boardId: 'board-1', isPublic: true }, mockContext);

        expect(actual).toBe('Board shared successfully. Embed URL: https://visualize.graphy.app/embed/board-1');
      });
    });
  });
});
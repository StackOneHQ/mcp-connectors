import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { describe, expect, it } from 'vitest';
import { extractToolsFromServer } from '../__mocks__/server-tools';
import { createGraphyServer } from './graphy';

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

          const server = setupServer(
            http.get('https://api.graphy.app/rest/v1/boards', ({ request }) => {
              const url = new URL(request.url);
              expect(url.searchParams.get('limit')).toBe('50');
              expect(url.searchParams.get('offset')).toBe('0');
              return HttpResponse.json({ results: mockBoards });
            })
          );
          server.listen();

          const mcpServer = createGraphyServer({ apiKey: 'test-token' });
          const tools = extractToolsFromServer(mcpServer);

          const actual = await tools.graphy_list_boards?.handler({});

          server.close();
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

          const server = setupServer(
            http.get('https://api.graphy.app/rest/v1/boards', ({ request }) => {
              const url = new URL(request.url);
              expect(url.searchParams.get('limit')).toBe('10');
              expect(url.searchParams.get('offset')).toBe('5');
              return HttpResponse.json({ results: mockBoards });
            })
          );
          server.listen();

          const mcpServer = createGraphyServer({ apiKey: 'test-token' });
          const tools = extractToolsFromServer(mcpServer);

          const actual = await tools.graphy_list_boards?.handler({
            limit: 10,
            offset: 5,
          });

          server.close();
          expect(actual).toBe(JSON.stringify(mockBoards, null, 2));
        });
      });
    });

    describe('when API returns unauthorized error', () => {
      it('returns original API error message', async () => {
        const server = setupServer(
          http.get('https://api.graphy.app/rest/v1/boards', () => {
            return HttpResponse.json({ message: 'Unauthorized access' }, { status: 401 });
          })
        );
        server.listen();

        const mcpServer = createGraphyServer({ apiKey: 'test-token' });
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.graphy_list_boards?.handler({});

        server.close();
        expect(actual).toBe('Unauthorized access');
      });
    });

    describe('when API returns not found error', () => {
      it('returns original API error message', async () => {
        const server = setupServer(
          http.get('https://api.graphy.app/rest/v1/boards', () => {
            return HttpResponse.json({ message: 'Endpoint not found' }, { status: 404 });
          })
        );
        server.listen();

        const mcpServer = createGraphyServer({ apiKey: 'test-token' });
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.graphy_list_boards?.handler({});

        server.close();
        expect(actual).toBe('Endpoint not found');
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

        const server = setupServer(
          http.get('https://api.graphy.app/rest/v1/boards/board-1', () => {
            return HttpResponse.json(mockBoard);
          })
        );
        server.listen();

        const mcpServer = createGraphyServer({ apiKey: 'test-token' });
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.graphy_get_board?.handler({ boardId: 'board-1' });

        server.close();
        expect(actual).toBe(JSON.stringify(mockBoard, null, 2));
      });
    });

    describe('when board does not exist', () => {
      it('returns original API error message', async () => {
        const server = setupServer(
          http.get('https://api.graphy.app/rest/v1/boards/nonexistent', () => {
            return HttpResponse.json({ message: 'Board not found' }, { status: 404 });
          })
        );
        server.listen();

        const mcpServer = createGraphyServer({ apiKey: 'test-token' });
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.graphy_get_board?.handler({ boardId: 'nonexistent' });

        server.close();
        expect(actual).toBe('Board not found');
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

        const server = setupServer(
          http.post('https://api.graphy.app/rest/v1/boards', () => {
            return HttpResponse.json(mockBoard);
          })
        );
        server.listen();

        const mcpServer = createGraphyServer({ apiKey: 'test-token' });
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.graphy_create_board?.handler({
          title: 'New Board',
          type: 'line',
          description: 'A new board',
        });

        server.close();
        expect(actual).toBe(JSON.stringify(mockBoard, null, 2));
      });
    });

    describe('when board creation fails due to validation', () => {
      it('returns original API error message', async () => {
        const server = setupServer(
          http.post('https://api.graphy.app/rest/v1/boards', () => {
            return HttpResponse.json({ message: 'Title is required' }, { status: 400 });
          })
        );
        server.listen();

        const mcpServer = createGraphyServer({ apiKey: 'test-token' });
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.graphy_create_board?.handler({
          title: '',
          type: 'line',
        });

        server.close();
        expect(actual).toBe('Title is required');
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

        const server = setupServer(
          http.put('https://api.graphy.app/rest/v1/boards/board-1', () => {
            return HttpResponse.json(mockBoard);
          })
        );
        server.listen();

        const mcpServer = createGraphyServer({ apiKey: 'test-token' });
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.graphy_update_board?.handler({
          boardId: 'board-1',
          title: 'Updated Board',
          description: 'Updated description',
        });

        server.close();
        expect(actual).toBe(JSON.stringify(mockBoard, null, 2));
      });
    });
  });

  describe('.DELETE_BOARD', () => {
    describe('when board deletion is successful', () => {
      it('returns success message', async () => {
        const server = setupServer(
          http.delete('https://api.graphy.app/rest/v1/boards/board-1', () => {
            return new HttpResponse(null, { status: 204 });
          })
        );
        server.listen();

        const mcpServer = createGraphyServer({ apiKey: 'test-token' });
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.graphy_delete_board?.handler({ boardId: 'board-1' });

        server.close();
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

        const server = setupServer(
          http.get('https://api.graphy.app/rest/v1/datasets', () => {
            return HttpResponse.json({ results: mockDatasets });
          })
        );
        server.listen();

        const mcpServer = createGraphyServer({ apiKey: 'test-token' });
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.graphy_list_datasets?.handler({});

        server.close();
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

        const server = setupServer(
          http.post('https://api.graphy.app/rest/v1/datasets', () => {
            return HttpResponse.json(mockDataset);
          })
        );
        server.listen();

        const mcpServer = createGraphyServer({ apiKey: 'test-token' });
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.graphy_create_dataset?.handler({
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
        });

        server.close();
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

        const server = setupServer(
          http.get(
            'https://api.graphy.app/rest/v1/boards/board-1/data',
            ({ request }) => {
              const url = new URL(request.url);
              expect(url.searchParams.get('format')).toBe('json');
              return HttpResponse.json(mockData);
            }
          )
        );
        server.listen();

        const mcpServer = createGraphyServer({ apiKey: 'test-token' });
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.graphy_get_board_data?.handler({
          boardId: 'board-1',
          format: 'json',
        });

        server.close();
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

        const server = setupServer(
          http.post('https://api.graphy.app/rest/v1/boards/board-1/share', () => {
            return HttpResponse.json(mockResponse);
          })
        );
        server.listen();

        const mcpServer = createGraphyServer({ apiKey: 'test-token' });
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.graphy_share_board?.handler({
          boardId: 'board-1',
          isPublic: true,
        });

        server.close();
        expect(actual).toBe(
          'Board shared successfully. Embed URL: https://visualize.graphy.app/embed/board-1'
        );
      });
    });
  });
});

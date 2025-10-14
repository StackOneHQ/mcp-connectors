import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { extractToolsFromServer } from '../__mocks__/server-tools';
import { createTodoListServer } from './todolist';

describe('#TodoListConnector', () => {
  let mockContext: ReturnType<typeof createMockConnectorContext>;

  beforeEach(() => {
    mockContext = createMockConnectorContext();
  });

  describe('.LIST_TODOS', () => {
    describe('when no todos exist', () => {
      it('returns empty list message', async () => {
        mockContext.getData = vi.fn().mockResolvedValue([]);

        const mcpServer = createTodoListServer({});
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.list_todos?.handler({});

        expect(actual).toContain(
          'Error: This connector requires external storage implementation'
        );
      });
    });

    describe('when todos exist', () => {
      it('returns formatted todo list', async () => {
        const mockTodos = [
          {
            id: 1,
            title: 'Test Todo',
            description: 'Test Description',
            dueDate: new Date('2025-01-01'),
            priority: 3,
            createdAt: new Date('2024-12-01'),
            updatedAt: new Date('2024-12-01'),
          },
          {
            id: 2,
            title: 'Another Todo',
            description: null,
            dueDate: null,
            priority: null,
            createdAt: new Date('2024-12-02'),
            updatedAt: new Date('2024-12-02'),
          },
        ];

        mockContext.getData = vi.fn().mockResolvedValue(mockTodos);

        const mcpServer = createTodoListServer({});
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.list_todos?.handler({});

        expect(actual).toContain(
          'Error: This connector requires external storage implementation'
        );
      });
    });

    describe('when getData throws error', () => {
      it('returns error message', async () => {
        mockContext.getData = vi.fn().mockRejectedValue(new Error('Storage error'));

        const mcpServer = createTodoListServer({});
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.list_todos?.handler({});

        expect(actual).toContain(
          'Error: This connector requires external storage implementation'
        );
      });
    });
  });

  describe('.CREATE_TODO', () => {
    describe('when creating todo with all fields', () => {
      it('creates todo successfully', async () => {
        const existingTodos = [
          {
            id: 1,
            title: 'Existing',
            description: null,
            dueDate: null,
            priority: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
        mockContext.getData = vi.fn().mockResolvedValue(existingTodos);
        mockContext.setData = vi.fn().mockResolvedValue(undefined);

        const mcpServer = createTodoListServer({});
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.create_todo?.handler({
          title: 'New Todo',
          description: 'New Description',
          dueDate: '2025-01-01',
          priority: 5,
        });

        expect(actual).toContain(
          'Error: This connector requires external storage implementation'
        );
      });
    });

    describe('when creating todo with minimal fields', () => {
      it('creates todo with defaults', async () => {
        mockContext.getData = vi.fn().mockResolvedValue([]);
        mockContext.setData = vi.fn().mockResolvedValue(undefined);

        const mcpServer = createTodoListServer({});
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.create_todo?.handler({
          title: 'Simple Todo',
        });

        expect(actual).toContain(
          'Error: This connector requires external storage implementation'
        );
      });
    });

    describe('when setData throws error', () => {
      it('returns error message', async () => {
        mockContext.getData = vi.fn().mockResolvedValue([]);
        mockContext.setData = vi.fn().mockRejectedValue(new Error('Storage error'));

        const mcpServer = createTodoListServer({});
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.create_todo?.handler({ title: 'Test' });

        expect(actual).toContain(
          'Error: This connector requires external storage implementation'
        );
      });
    });
  });

  describe('.UPDATE_TODO', () => {
    describe('when todo exists', () => {
      it('updates todo successfully', async () => {
        const existingTodos = [
          {
            id: 1,
            title: 'Original Title',
            description: 'Original Description',
            dueDate: new Date('2024-01-01'),
            priority: 1,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          },
        ];
        mockContext.getData = vi.fn().mockResolvedValue(existingTodos);
        mockContext.setData = vi.fn().mockResolvedValue(undefined);

        const mcpServer = createTodoListServer({});
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.update_todo?.handler({
          id: 1,
          title: 'Updated Title',
          priority: 5,
        });

        expect(actual).toContain(
          'Error: This connector requires external storage implementation'
        );
      });
    });

    describe('when todo does not exist', () => {
      it('returns not found error', async () => {
        mockContext.getData = vi.fn().mockResolvedValue([]);

        const mcpServer = createTodoListServer({});
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.update_todo?.handler({ id: 999 });

        expect(actual).toContain(
          'Error: This connector requires external storage implementation'
        );
      });
    });

    describe('when setData throws error', () => {
      it('returns error message', async () => {
        const existingTodos = [
          {
            id: 1,
            title: 'Test',
            description: null,
            dueDate: null,
            priority: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
        mockContext.getData = vi.fn().mockResolvedValue(existingTodos);
        mockContext.setData = vi.fn().mockRejectedValue(new Error('Storage error'));

        const mcpServer = createTodoListServer({});
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.update_todo?.handler({ id: 1, title: 'Updated' });

        expect(actual).toContain(
          'Error: This connector requires external storage implementation'
        );
      });
    });
  });

  describe('.DELETE_TODO', () => {
    describe('when todo exists', () => {
      it('deletes todo successfully', async () => {
        const existingTodos = [
          {
            id: 1,
            title: 'First Todo',
            description: null,
            dueDate: null,
            priority: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 2,
            title: 'Second Todo',
            description: null,
            dueDate: null,
            priority: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
        mockContext.getData = vi.fn().mockResolvedValue(existingTodos);
        mockContext.setData = vi.fn().mockResolvedValue(undefined);

        const mcpServer = createTodoListServer({});
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.delete_todo?.handler({ id: 1 });

        expect(actual).toContain(
          'Error: This connector requires external storage implementation'
        );
      });
    });

    describe('when todo does not exist', () => {
      it('returns not found error', async () => {
        mockContext.getData = vi.fn().mockResolvedValue([]);

        const mcpServer = createTodoListServer({});
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.delete_todo?.handler({ id: 999 });

        expect(actual).toContain(
          'Error: This connector requires external storage implementation'
        );
      });
    });

    describe('when setData throws error', () => {
      it('returns error message', async () => {
        const existingTodos = [
          {
            id: 1,
            title: 'Test',
            description: null,
            dueDate: null,
            priority: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
        mockContext.getData = vi.fn().mockResolvedValue(existingTodos);
        mockContext.setData = vi.fn().mockRejectedValue(new Error('Storage error'));

        const mcpServer = createTodoListServer({});
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.delete_todo?.handler({ id: 1 });

        expect(actual).toContain(
          'Error: This connector requires external storage implementation'
        );
      });
    });
  });
});

import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { TodoListConnectorConfig } from './todolist';

describe('#TodoListConnector', () => {
  let mockContext: ReturnType<typeof createMockConnectorContext>;

  beforeEach(() => {
    mockContext = createMockConnectorContext();
  });

  describe('.LIST_TODOS', () => {
    describe('when no todos exist', () => {
      it('returns empty list message', async () => {
        mockContext.getData = vi.fn().mockResolvedValue([]);

        const tool = TodoListConnectorConfig.tools.LIST_TODOS as MCPToolDefinition;
        const actual = await tool.handler({}, mockContext);

        expect(actual).toBe('No todos found. Use create_todo to add your first todo.');
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

        const tool = TodoListConnectorConfig.tools.LIST_TODOS as MCPToolDefinition;
        const actual = await tool.handler({}, mockContext);

        expect(actual).toContain('Found 2 todo(s):');
        expect(actual).toContain('ID: 1');
        expect(actual).toContain('Title: Test Todo');
        expect(actual).toContain('Description: Test Description');
        expect(actual).toContain('Priority: 3');
        expect(actual).toContain('ID: 2');
        expect(actual).toContain('Title: Another Todo');
        expect(actual).toContain('Description: No description');
        expect(actual).toContain('Due Date: No due date');
        expect(actual).toContain('No priority');
      });
    });

    describe('when getData throws error', () => {
      it('returns error message', async () => {
        mockContext.getData = vi.fn().mockRejectedValue(new Error('Storage error'));

        const tool = TodoListConnectorConfig.tools.LIST_TODOS as MCPToolDefinition;
        const actual = await tool.handler({}, mockContext);

        expect(actual).toBe('Error listing todos: Storage error');
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

        const tool = TodoListConnectorConfig.tools.CREATE_TODO as MCPToolDefinition;
        const actual = await tool.handler(
          {
            title: 'New Todo',
            description: 'New Description',
            dueDate: '2025-01-01',
            priority: 5,
          },
          mockContext
        );

        expect(mockContext.setData).toHaveBeenCalledWith(
          'todos',
          expect.arrayContaining([
            expect.objectContaining({ id: 1 }),
            expect.objectContaining({
              id: 2,
              title: 'New Todo',
              description: 'New Description',
              priority: 5,
            }),
          ])
        );
        expect(actual).toContain('Todo created successfully!');
        expect(actual).toContain('ID: 2');
        expect(actual).toContain('Title: New Todo');
        expect(actual).toContain('Priority: 5');
      });
    });

    describe('when creating todo with minimal fields', () => {
      it('creates todo with defaults', async () => {
        mockContext.getData = vi.fn().mockResolvedValue([]);
        mockContext.setData = vi.fn().mockResolvedValue(undefined);

        const tool = TodoListConnectorConfig.tools.CREATE_TODO as MCPToolDefinition;
        const actual = await tool.handler(
          {
            title: 'Simple Todo',
          },
          mockContext
        );

        expect(mockContext.setData).toHaveBeenCalledWith(
          'todos',
          expect.arrayContaining([
            expect.objectContaining({
              id: 1,
              title: 'Simple Todo',
              description: null,
              dueDate: null,
              priority: null,
            }),
          ])
        );
        expect(actual).toContain('Todo created successfully!');
        expect(actual).toContain('ID: 1');
        expect(actual).toContain('No description');
        expect(actual).toContain('No due date');
        expect(actual).toContain('No priority');
      });
    });

    describe('when setData throws error', () => {
      it('returns error message', async () => {
        mockContext.getData = vi.fn().mockResolvedValue([]);
        mockContext.setData = vi.fn().mockRejectedValue(new Error('Storage error'));

        const tool = TodoListConnectorConfig.tools.CREATE_TODO as MCPToolDefinition;
        const actual = await tool.handler({ title: 'Test' }, mockContext);

        expect(actual).toBe('Error creating todo: Storage error');
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

        const tool = TodoListConnectorConfig.tools.UPDATE_TODO as MCPToolDefinition;
        const actual = await tool.handler(
          {
            id: 1,
            title: 'Updated Title',
            priority: 5,
          },
          mockContext
        );

        expect(mockContext.setData).toHaveBeenCalledWith(
          'todos',
          expect.arrayContaining([
            expect.objectContaining({
              id: 1,
              title: 'Updated Title',
              description: 'Original Description',
              priority: 5,
            }),
          ])
        );
        expect(actual).toContain('Todo updated successfully!');
        expect(actual).toContain('ID: 1');
        expect(actual).toContain('Title: Updated Title');
        expect(actual).toContain('Priority: 5');
      });
    });

    describe('when todo does not exist', () => {
      it('returns not found error', async () => {
        mockContext.getData = vi.fn().mockResolvedValue([]);

        const tool = TodoListConnectorConfig.tools.UPDATE_TODO as MCPToolDefinition;
        const actual = await tool.handler({ id: 999 }, mockContext);

        expect(actual).toBe(
          'Todo with ID 999 not found. Use list_todos to see available todos.'
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

        const tool = TodoListConnectorConfig.tools.UPDATE_TODO as MCPToolDefinition;
        const actual = await tool.handler({ id: 1, title: 'Updated' }, mockContext);

        expect(actual).toBe('Error updating todo: Storage error');
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

        const tool = TodoListConnectorConfig.tools.DELETE_TODO as MCPToolDefinition;
        const actual = await tool.handler({ id: 1 }, mockContext);

        expect(mockContext.setData).toHaveBeenCalledWith(
          'todos',
          expect.arrayContaining([
            expect.objectContaining({ id: 2, title: 'Second Todo' }),
          ])
        );
        expect(mockContext.setData).toHaveBeenCalledWith(
          'todos',
          expect.not.arrayContaining([expect.objectContaining({ id: 1 })])
        );
        expect(actual).toContain('Todo deleted successfully!');
        expect(actual).toContain('Deleted: "First Todo" (ID: 1)');
      });
    });

    describe('when todo does not exist', () => {
      it('returns not found error', async () => {
        mockContext.getData = vi.fn().mockResolvedValue([]);

        const tool = TodoListConnectorConfig.tools.DELETE_TODO as MCPToolDefinition;
        const actual = await tool.handler({ id: 999 }, mockContext);

        expect(actual).toBe(
          'Todo with ID 999 not found. Use list_todos to see available todos.'
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

        const tool = TodoListConnectorConfig.tools.DELETE_TODO as MCPToolDefinition;
        const actual = await tool.handler({ id: 1 }, mockContext);

        expect(actual).toBe('Error deleting todo: Storage error');
      });
    });
  });

  describe('configuration', () => {
    it('should be properly configured', () => {
      expect(TodoListConnectorConfig).toBeDefined();
      expect(TodoListConnectorConfig.name).toBe('Todo List');
      expect(TodoListConnectorConfig.key).toBe('todolist');
      expect(TodoListConnectorConfig.version).toBe('1.0.0');
    });

    it('should have empty credentials schema', () => {
      const credentialsSchema = TodoListConnectorConfig.credentials;
      expect(() => credentialsSchema.parse({})).not.toThrow();
    });

    it('should have empty setup schema', () => {
      const setupSchema = TodoListConnectorConfig.setup;
      expect(() => setupSchema.parse({})).not.toThrow();
    });

    it('should have an example prompt', () => {
      expect(TodoListConnectorConfig.examplePrompt).toBeDefined();
      expect(typeof TodoListConnectorConfig.examplePrompt).toBe('string');
      expect(TodoListConnectorConfig.examplePrompt?.length).toBeGreaterThan(0);
    });

    it('should have tools object with expected tools', () => {
      expect(typeof TodoListConnectorConfig.tools).toBe('object');
      expect(TodoListConnectorConfig.tools).toBeDefined();

      const expectedTools = ['LIST_TODOS', 'CREATE_TODO', 'UPDATE_TODO', 'DELETE_TODO'];

      for (const toolName of expectedTools) {
        expect(TodoListConnectorConfig.tools[toolName]).toBeDefined();
      }
    });
  });
});

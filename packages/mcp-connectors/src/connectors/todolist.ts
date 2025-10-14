import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

// Note: This connector relies on context.getData/setData which doesn't exist in native SDK
// It would need to be reimplemented with external storage (e.g., file system, database)
// This is a placeholder that shows the structure but won't function without storage

const todoSchema = z.object({
  id: z.number().describe('Unique identifier for the todo'),
  title: z.string().nullable().describe('Title of the todo'),
  description: z.string().nullable().describe('Description of the todo'),
  dueDate: z.date().nullable().describe('Due date for the todo'),
  priority: z.number().nullable().describe('Priority level (1-5, where 5 is highest)'),
  createdAt: z.date().nullable().describe('When the todo was created'),
  updatedAt: z.date().nullable().describe('When the todo was last updated'),
});

type _Todo = z.infer<typeof todoSchema>;

export type TodoListCredentials = Record<string, never>;

export function createTodoListServer(_credentials: TodoListCredentials): McpServer {
  const server = new McpServer({
    name: 'Todo List',
    version: '1.0.0',
  });

  server.tool('list_todos', 'List all todos stored in memory', {}, async (_args) => {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: This connector requires external storage implementation. context.getData/setData are not available in native SDK.',
        },
      ],
    };
  });

  server.tool(
    'create_todo',
    'Create a new todo item',
    {
      title: z.string().describe('Title of the todo'),
      description: z.string().optional().describe('Description of the todo'),
      dueDate: z.string().optional().describe('Due date in YYYY-MM-DD format'),
      priority: z
        .number()
        .min(1)
        .max(5)
        .optional()
        .describe('Priority level (1-5, where 5 is highest)'),
    },
    async (_args) => {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: This connector requires external storage implementation. context.getData/setData are not available in native SDK.',
          },
        ],
      };
    }
  );

  server.tool(
    'update_todo',
    'Update an existing todo item',
    {
      id: z.number().describe('ID of the todo to update'),
      title: z.string().optional().describe('New title for the todo'),
      description: z.string().optional().describe('New description for the todo'),
      dueDate: z.string().optional().describe('New due date in YYYY-MM-DD format'),
      priority: z
        .number()
        .min(1)
        .max(5)
        .optional()
        .describe('New priority level (1-5, where 5 is highest)'),
    },
    async (_args) => {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: This connector requires external storage implementation. context.getData/setData are not available in native SDK.',
          },
        ],
      };
    }
  );

  server.tool(
    'delete_todo',
    'Delete a todo item by ID',
    {
      id: z.number().describe('ID of the todo to delete'),
    },
    async (_args) => {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: This connector requires external storage implementation. context.getData/setData are not available in native SDK.',
          },
        ],
      };
    }
  );

  return server;
}

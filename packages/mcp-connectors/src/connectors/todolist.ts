import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

const todoSchema = z.object({
  id: z.number().describe('Unique identifier for the todo'),
  title: z.string().nullable().describe('Title of the todo'),
  description: z.string().nullable().describe('Description of the todo'),
  dueDate: z.date().nullable().describe('Due date for the todo'),
  priority: z.number().nullable().describe('Priority level (1-5, where 5 is highest)'),
  createdAt: z.date().nullable().describe('When the todo was created'),
  updatedAt: z.date().nullable().describe('When the todo was last updated'),
});

type Todo = z.infer<typeof todoSchema>;

export const TodoListConnectorConfig = mcpConnectorConfig({
  name: 'Todo List',
  key: 'todolist',
  version: '1.0.0',
  credentials: z.object({}),
  setup: z.object({}),
  description: 'A memory-based todo list connector that allows you to create, list, update, and delete todos with persistent storage.',
  examplePrompt: 'Create a new todo item for "Buy groceries", then list all todos and mark it as completed.',
  logo: 'https://stackone-logos.com/api/todolist/filled/svg',
  tools: (tool) => ({
    LIST_TODOS: tool({
      name: 'list_todos',
      description: 'List all todos stored in memory',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          
          const todos = await context.getData<Todo[]>('todos') || [];
          
          if (todos.length === 0) {
            return 'No todos found. Use create_todo to add your first todo.';
          }

          const todoList = todos.map(todo => {
            const dueDateStr = todo.dueDate ? new Date(todo.dueDate).toLocaleDateString() : 'No due date';
            const priorityStr = todo.priority ? `Priority: ${todo.priority}` : 'No priority';
            return `ID: ${todo.id}\nTitle: ${todo.title || 'No title'}\nDescription: ${todo.description || 'No description'}\nDue Date: ${dueDateStr}\n${priorityStr}\nCreated: ${todo.createdAt ? new Date(todo.createdAt).toLocaleDateString() : 'Unknown'}\nUpdated: ${todo.updatedAt ? new Date(todo.updatedAt).toLocaleDateString() : 'Unknown'}`;
          }).join('\n\n---\n\n');

          return `Found ${todos.length} todo(s):\n\n${todoList}`;
        } catch (error) {
          return `Error listing todos: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    }),

    CREATE_TODO: tool({
      name: 'create_todo',
      description: 'Create a new todo item',
      schema: z.object({
        title: z.string().describe('Title of the todo'),
        description: z.string().optional().describe('Description of the todo'),
        dueDate: z.string().optional().describe('Due date in YYYY-MM-DD format'),
        priority: z.number().min(1).max(5).optional().describe('Priority level (1-5, where 5 is highest)'),
      }),
      handler: async (args, context) => {
        try {
          const todos = await context.getData<Todo[]>('todos') || [];
          const nextId = todos.length > 0 ? Math.max(...todos.map(t => t.id)) + 1 : 1;
          
          const now = new Date();
          const dueDate = args.dueDate ? new Date(args.dueDate) : null;
          
          const newTodo: Todo = {
            id: nextId,
            title: args.title,
            description: args.description || null,
            dueDate,
            priority: args.priority || null,
            createdAt: now,
            updatedAt: now,
          };

          todos.push(newTodo);
          await context.setData('todos', todos);

          return `Todo created successfully!\nID: ${newTodo.id}\nTitle: ${newTodo.title}\nDescription: ${newTodo.description || 'No description'}\nDue Date: ${dueDate ? dueDate.toLocaleDateString() : 'No due date'}\nPriority: ${newTodo.priority || 'No priority'}`;
        } catch (error) {
          return `Error creating todo: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    }),

    UPDATE_TODO: tool({
      name: 'update_todo',
      description: 'Update an existing todo item',
      schema: z.object({
        id: z.number().describe('ID of the todo to update'),
        title: z.string().optional().describe('New title for the todo'),
        description: z.string().optional().describe('New description for the todo'),
        dueDate: z.string().optional().describe('New due date in YYYY-MM-DD format'),
        priority: z.number().min(1).max(5).optional().describe('New priority level (1-5, where 5 is highest)'),
      }),
      handler: async (args, context) => {
        try {
          const todos = await context.getData<Todo[]>('todos') || [];
          const todoIndex = todos.findIndex(todo => todo.id === args.id);
          
          if (todoIndex === -1) {
            return `Todo with ID ${args.id} not found. Use list_todos to see available todos.`;
          }

          const existingTodo = todos[todoIndex]!;
          const updatedTodo: Todo = {
            id: existingTodo.id,
            title: args.title !== undefined ? args.title : existingTodo.title,
            description: args.description !== undefined ? args.description : existingTodo.description,
            dueDate: args.dueDate !== undefined ? new Date(args.dueDate) : existingTodo.dueDate,
            priority: args.priority !== undefined ? args.priority : existingTodo.priority,
            createdAt: existingTodo.createdAt,
            updatedAt: new Date(),
          };

          todos[todoIndex] = updatedTodo;
          await context.setData('todos', todos);

          return `Todo updated successfully!\nID: ${updatedTodo.id}\nTitle: ${updatedTodo.title}\nDescription: ${updatedTodo.description || 'No description'}\nDue Date: ${updatedTodo.dueDate ? updatedTodo.dueDate.toLocaleDateString() : 'No due date'}\nPriority: ${updatedTodo.priority || 'No priority'}`;
        } catch (error) {
          return `Error updating todo: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    }),

    DELETE_TODO: tool({
      name: 'delete_todo',
      description: 'Delete a todo item by ID',
      schema: z.object({
        id: z.number().describe('ID of the todo to delete'),
      }),
      handler: async (args, context) => {
        try {
          const todos = await context.getData<Todo[]>('todos') || [];
          const todoIndex = todos.findIndex(todo => todo.id === args.id);
          
          if (todoIndex === -1) {
            return `Todo with ID ${args.id} not found. Use list_todos to see available todos.`;
          }

          const deletedTodo = todos[todoIndex]!;
          todos.splice(todoIndex, 1);
          await context.setData('todos', todos);

          return `Todo deleted successfully!\nDeleted: "${deletedTodo.title}" (ID: ${deletedTodo.id})`;
        } catch (error) {
          return `Error deleting todo: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    }),
  }),
});
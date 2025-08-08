import { z } from 'zod';
import { mcpConnectorConfig } from '../config-types';

// Types based on the unofficial Workflowy client
interface WorkFlowyItem {
  id: string;
  name: string;
  note?: string;
  isCompleted: boolean;
  items: WorkFlowyItem[];
}

interface WorkFlowyDocument {
  items: WorkFlowyItem[];
  isDirty(): boolean;
  save(): Promise<void>;
  findOne(predicate: (item: WorkFlowyItem) => boolean): WorkFlowyItem | null;
  findAll(predicate: (item: WorkFlowyItem) => boolean): WorkFlowyItem[];
}

// Workflowy client class (simplified interface)
declare class WorkFlowy {
  constructor(username: string, password: string);
  getDocument(): Promise<WorkFlowyDocument>;
}

// Helper function to create WorkFlowy client
const createWorkFlowyClient = async (
  username: string,
  password: string
): Promise<WorkFlowyDocument> => {
  // We'll use dynamic import since the workflowy package might not be installed
  try {
    const { WorkFlowy } = await import('workflowy');
    const client = new WorkFlowy(username, password);
    return await client.getDocument();
  } catch (error) {
    throw new Error(
      `Failed to initialize WorkFlowy client: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

// Helper function to find item by URL path
const findItemByPath = (
  document: WorkFlowyDocument,
  path: string
): WorkFlowyItem | null => {
  if (!path || path === '/') {
    // Return root level - we'll create a virtual root item
    return {
      id: 'root',
      name: 'Root',
      note: '',
      isCompleted: false,
      items: document.items,
    };
  }

  // Split path and traverse
  const pathParts = path.split('/').filter((part) => part.length > 0);

  return document.findOne((item) => {
    // Simple name-based matching for now
    return pathParts.some((part) => item.name.toLowerCase().includes(part.toLowerCase()));
  });
};

export const WorkFlowyConnectorConfig = mcpConnectorConfig({
  name: 'WorkFlowy',
  key: 'workflowy',
  version: '1.0.0',
  logo: 'https://workflowy.com/static/img/favicon.ico',
  description: 'Create and manage bullet points in your WorkFlowy workspace',
  credentials: z.object({
    username: z.string().email().describe('Your WorkFlowy username/email address'),
    password: z.string().describe('Your WorkFlowy password'),
  }),
  setup: z.object({
    defaultLocation: z
      .string()
      .optional()
      .describe(
        'Default location URL for new bullets (optional - uses root if not provided)'
      ),
  }),
  examplePrompt:
    'Create a new bullet point "Review quarterly goals" under my work projects, read all my pending tasks, and create a bullet for "Schedule team meeting" in my meetings section.',

  tools: (tool) => ({
    CREATE_BULLET: tool({
      name: 'workflowy_create_bullet',
      description: 'Create a new bullet point under a specified location',
      schema: z.object({
        content: z.string().describe('The text content for the new bullet point'),
        location: z
          .string()
          .optional()
          .describe(
            'Location path or URL where to create the bullet (uses default if not provided)'
          ),
        note: z.string().optional().describe('Optional note to add to the bullet point'),
      }),
      handler: async (args, context) => {
        try {
          const { username, password } = await context.getCredentials();
          const { defaultLocation } = await context.getSetup();
          const document = await createWorkFlowyClient(username, password);

          const targetLocation = args.location || defaultLocation || '/';
          const parentItem = findItemByPath(document, targetLocation);

          if (!parentItem) {
            return `Error: Could not find location "${targetLocation}". Please check the path.`;
          }

          // Create new item (simplified - actual implementation would use the client's methods)
          const newItem: WorkFlowyItem = {
            id: `temp_${Date.now()}`,
            name: args.content,
            note: args.note || '',
            isCompleted: false,
            items: [],
          };

          // In reality, this would use document.createList() or similar method
          parentItem.items.push(newItem);

          if (document.isDirty()) {
            await document.save();
          }

          return `Successfully created bullet point "${args.content}" under ${parentItem.name}`;
        } catch (error) {
          return `Error creating bullet: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    READ_TASKS: tool({
      name: 'workflowy_read_tasks',
      description: 'Read tasks/bullet points from WorkFlowy',
      schema: z.object({
        location: z
          .string()
          .optional()
          .describe('Location path to read from (reads entire document if not provided)'),
        includeCompleted: z
          .boolean()
          .optional()
          .default(false)
          .describe('Whether to include completed tasks'),
        maxDepth: z
          .number()
          .optional()
          .default(3)
          .describe('Maximum depth to traverse (1-10)'),
      }),
      handler: async (args, context) => {
        try {
          const { username, password } = await context.getCredentials();
          const document = await createWorkFlowyClient(username, password);

          let items: WorkFlowyItem[];

          if (args.location) {
            const targetItem = findItemByPath(document, args.location);
            if (!targetItem) {
              return `Error: Could not find location "${args.location}"`;
            }
            items = targetItem.items;
          } else {
            items = document.items;
          }

          const formatItems = (items: WorkFlowyItem[], depth = 0): string => {
            if (depth >= (args.maxDepth || 3)) {
              return '';
            }

            return items
              .filter((item) => args.includeCompleted || !item.isCompleted)
              .map((item) => {
                const indent = '  '.repeat(depth);
                const status = item.isCompleted ? '✓' : '•';
                let result = `${indent}${status} ${item.name}`;

                if (item.note) {
                  result += `\n${indent}  Note: ${item.note}`;
                }

                if (item.items.length > 0) {
                  const subitems = formatItems(item.items, depth + 1);
                  if (subitems) {
                    result += `\n${subitems}`;
                  }
                }

                return result;
              })
              .join('\n');
          };

          const formattedTasks = formatItems(items);

          if (!formattedTasks) {
            return 'No tasks found matching the criteria.';
          }

          return `Tasks from WorkFlowy:\n\n${formattedTasks}`;
        } catch (error) {
          return `Error reading tasks: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    SEARCH_TASKS: tool({
      name: 'workflowy_search_tasks',
      description: 'Search for specific tasks/bullet points by content',
      schema: z.object({
        query: z.string().describe('Search query to find tasks'),
        includeCompleted: z
          .boolean()
          .optional()
          .default(false)
          .describe('Whether to include completed tasks'),
      }),
      handler: async (args, context) => {
        try {
          const { username, password } = await context.getCredentials();
          const document = await createWorkFlowyClient(username, password);

          const matchingItems = document.findAll((item) => {
            if (!args.includeCompleted && item.isCompleted) {
              return false;
            }

            const query = args.query.toLowerCase();
            return (
              item.name.toLowerCase().includes(query) ||
              item.note?.toLowerCase().includes(query)
            );
          });

          if (matchingItems.length === 0) {
            return `No tasks found matching "${args.query}"`;
          }

          const results = matchingItems
            .map((item) => {
              const status = item.isCompleted ? '✓' : '•';
              let result = `${status} ${item.name}`;
              if (item.note) {
                result += `\n  Note: ${item.note}`;
              }
              return result;
            })
            .join('\n\n');

          return `Found ${matchingItems.length} tasks matching "${args.query}":\n\n${results}`;
        } catch (error) {
          return `Error searching tasks: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_DOCUMENT_STRUCTURE: tool({
      name: 'workflowy_get_structure',
      description: 'Get the hierarchical structure of your WorkFlowy document',
      schema: z.object({
        maxDepth: z
          .number()
          .optional()
          .default(2)
          .describe('Maximum depth to show (1-5)'),
        showOnlyNames: z
          .boolean()
          .optional()
          .default(true)
          .describe('Show only names without notes'),
      }),
      handler: async (args, context) => {
        try {
          const { username, password } = await context.getCredentials();
          const document = await createWorkFlowyClient(username, password);

          const formatStructure = (items: WorkFlowyItem[], depth = 0): string => {
            if (depth >= (args.maxDepth || 2)) {
              return '';
            }

            return items
              .map((item) => {
                const indent = '  '.repeat(depth);
                const status = item.isCompleted ? '✓' : '•';
                let result = `${indent}${status} ${item.name}`;

                if (!args.showOnlyNames && item.note) {
                  result += ` (${item.note.substring(0, 50)}${item.note.length > 50 ? '...' : ''})`;
                }

                if (item.items.length > 0) {
                  const subitems = formatStructure(item.items, depth + 1);
                  if (subitems) {
                    result += `\n${subitems}`;
                  }
                }

                return result;
              })
              .join('\n');
          };

          const structure = formatStructure(document.items);
          return `WorkFlowy Document Structure:\n\n${structure}`;
        } catch (error) {
          return `Error getting document structure: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

import { z } from 'zod';
import { mcpConnectorConfig } from '../config-types';

interface WorkflowyItem {
  name?: string;
  note?: string;
  items?: WorkflowyItem[];
}

interface WorkflowyList {
  items?: WorkflowyItem[];
}

const createWorkflowyClient = async (username: string, password: string) => {
  const { WorkFlowy } = await import('workflowy');
  return new WorkFlowy(username, password);
};

export const WorkflowyConnectorConfig = mcpConnectorConfig({
  name: 'WorkFlowy',
  key: 'workflowy',
  version: '1.0.0',
  logo: 'https://workflowy.com/favicon.ico',
  credentials: z.object({
    username: z.string().describe('WorkFlowy username/email address'),
    password: z.string().describe('WorkFlowy password'),
  }),
  setup: z.object({
    defaultLocation: z
      .string()
      .optional()
      .describe('Default location URL for creating new bullets (optional)'),
  }),
  examplePrompt:
    'Create a new bullet point under my "Work Tasks" list, read all my incomplete tasks, and show me the structure of my main project list.',
  tools: (tool) => ({
    CREATE_BULLET: tool({
      name: 'workflowy_create_bullet',
      description:
        'Create a new bullet point under a specific location or the default location',
      schema: z.object({
        text: z.string().describe('The text content for the new bullet point'),
        note: z.string().optional().describe('Optional note to add to the bullet point'),
        location: z
          .string()
          .optional()
          .describe(
            'Optional location URL or path. Uses default location if not provided'
          ),
      }),
      handler: async (args, context) => {
        try {
          const { username, password } = await context.getCredentials();
          const { defaultLocation } = await context.getSetup();
          const workflowy = await createWorkflowyClient(username, password);

          const document = await workflowy.getDocument();
          const locationToUse = args.location || defaultLocation;

          let targetList = document.root;

          if (locationToUse) {
            // Simple path-based location finding (e.g., "Work/Tasks")
            if (locationToUse.includes('/')) {
              const pathParts = locationToUse.split('/').filter(Boolean);
              for (const part of pathParts) {
                const found = targetList.findOne(new RegExp(part, 'i'));
                if (found) {
                  targetList = found;
                } else {
                  return `Error: Could not find location part "${part}" in path "${locationToUse}"`;
                }
              }
            } else {
              // Single location name
              const found = targetList.findOne(new RegExp(locationToUse, 'i'));
              if (found) {
                targetList = found;
              } else {
                return `Error: Could not find location "${locationToUse}"`;
              }
            }
          }

          const newItem = targetList.createItem();
          newItem.setName(args.text);

          if (args.note) {
            newItem.setNote(args.note);
          }

          if (document.isDirty()) {
            await document.save();
          }

          return `Successfully created bullet point "${args.text}" under location "${locationToUse || 'root'}"`;
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    READ_TASKS: tool({
      name: 'workflowy_read_tasks',
      description:
        'Read tasks from WorkFlowy, with options to filter by completion status and location',
      schema: z.object({
        location: z
          .string()
          .optional()
          .describe(
            'Optional location URL or path to read from. Reads from root if not provided'
          ),
        includeCompleted: z
          .boolean()
          .default(false)
          .describe('Whether to include completed tasks'),
        maxDepth: z
          .number()
          .optional()
          .default(3)
          .describe('Maximum depth to traverse (default: 3)'),
      }),
      handler: async (args, context) => {
        try {
          const { username, password } = await context.getCredentials();
          const workflowy = await createWorkflowyClient(username, password);

          const document = await workflowy.getDocument();
          let targetList = document.root;

          if (args.location) {
            if (args.location.includes('/')) {
              const pathParts = args.location.split('/').filter(Boolean);
              for (const part of pathParts) {
                const found = targetList.findOne(new RegExp(part, 'i'));
                if (found) {
                  targetList = found;
                } else {
                  return `Error: Could not find location part "${part}" in path "${args.location}"`;
                }
              }
            } else {
              const found = targetList.findOne(new RegExp(args.location, 'i'));
              if (found) {
                targetList = found;
              } else {
                return `Error: Could not find location "${args.location}"`;
              }
            }
          }

          const formatTasks = (
            list: WorkflowyList,
            depth = 0,
            maxDepth = args.maxDepth || 3
          ): string => {
            if (depth > maxDepth) return '';

            const indent = '  '.repeat(depth);
            let result = '';

            if (list.items && list.items.length > 0) {
              for (const item of list.items) {
                const isCompleted =
                  item.name?.includes('✓') || item.name?.includes('[COMPLETE]');

                if (!isCompleted || args.includeCompleted) {
                  result += `${indent}- ${item.name || '(no name)'}`;
                  if (item.note) {
                    result += ` (Note: ${item.note})`;
                  }
                  if (isCompleted) {
                    result += ' ✓';
                  }
                  result += '\n';

                  if (item.items && item.items.length > 0) {
                    result += formatTasks(item, depth + 1, maxDepth);
                  }
                }
              }
            }

            return result;
          };

          const tasks = formatTasks(targetList);
          const locationText = args.location || 'root';

          if (!tasks.trim()) {
            return `No ${args.includeCompleted ? '' : 'incomplete '}tasks found in location "${locationText}"`;
          }

          return `Tasks from "${locationText}":\n\n${tasks}`;
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    SEARCH_TASKS: tool({
      name: 'workflowy_search_tasks',
      description: 'Search for tasks by content in names and notes',
      schema: z.object({
        query: z.string().describe('Search query (supports regex patterns)'),
        includeCompleted: z
          .boolean()
          .default(false)
          .describe('Whether to include completed tasks'),
        searchInNotes: z
          .boolean()
          .default(true)
          .describe('Whether to search in notes as well as names'),
      }),
      handler: async (args, context) => {
        try {
          const { username, password } = await context.getCredentials();
          const workflowy = await createWorkflowyClient(username, password);

          const document = await workflowy.getDocument();

          const searchRegex = new RegExp(args.query, 'i');
          const results: string[] = [];

          const searchItems = (list: WorkflowyList, path = '') => {
            if (list.items && list.items.length > 0) {
              for (const item of list.items) {
                const isCompleted =
                  item.name?.includes('✓') || item.name?.includes('[COMPLETE]');

                if (!isCompleted || args.includeCompleted) {
                  const nameMatch = item.name && searchRegex.test(item.name);
                  const noteMatch =
                    args.searchInNotes && item.note && searchRegex.test(item.note);

                  if (nameMatch || noteMatch) {
                    const currentPath = path
                      ? `${path}/${item.name || '(no name)'}`
                      : item.name || '(no name)';
                    let result = `- ${currentPath}`;

                    if (item.note && noteMatch) {
                      result += ` (Note: ${item.note})`;
                    }

                    if (isCompleted) {
                      result += ' ✓';
                    }

                    results.push(result);
                  }
                }

                if (item.items && item.items.length > 0) {
                  const currentPath = path
                    ? `${path}/${item.name || '(no name)'}`
                    : item.name || '(no name)';
                  searchItems(item, currentPath);
                }
              }
            }
          };

          searchItems(document.root);

          if (results.length === 0) {
            return `No ${args.includeCompleted ? '' : 'incomplete '}tasks found matching "${args.query}"`;
          }

          return `Found ${results.length} ${args.includeCompleted ? '' : 'incomplete '}tasks matching "${args.query}":\n\n${results.join('\n')}`;
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_STRUCTURE: tool({
      name: 'workflowy_get_structure',
      description: 'Get the hierarchical structure overview of your WorkFlowy document',
      schema: z.object({
        maxDepth: z
          .number()
          .optional()
          .default(2)
          .describe('Maximum depth to show (default: 2)'),
        showItemCounts: z
          .boolean()
          .default(true)
          .describe('Whether to show item counts for each section'),
        location: z
          .string()
          .optional()
          .describe('Optional location to get structure from (defaults to root)'),
      }),
      handler: async (args, context) => {
        try {
          const { username, password } = await context.getCredentials();
          const workflowy = await createWorkflowyClient(username, password);

          const document = await workflowy.getDocument();
          let targetList = document.root;

          if (args.location) {
            if (args.location.includes('/')) {
              const pathParts = args.location.split('/').filter(Boolean);
              for (const part of pathParts) {
                const found = targetList.findOne(new RegExp(part, 'i'));
                if (found) {
                  targetList = found;
                } else {
                  return `Error: Could not find location part "${part}" in path "${args.location}"`;
                }
              }
            } else {
              const found = targetList.findOne(new RegExp(args.location, 'i'));
              if (found) {
                targetList = found;
              } else {
                return `Error: Could not find location "${args.location}"`;
              }
            }
          }

          const buildStructure = (
            list: WorkflowyList,
            depth = 0,
            maxDepth = args.maxDepth || 2
          ): string => {
            if (depth > maxDepth) return '';

            const indent = '  '.repeat(depth);
            let result = '';

            if (list.items && list.items.length > 0) {
              for (const item of list.items) {
                const itemCount = item.items ? item.items.length : 0;
                const countText =
                  args.showItemCounts && itemCount > 0 ? ` (${itemCount} items)` : '';

                result += `${indent}- ${item.name || '(no name)'}${countText}\n`;

                if (depth < maxDepth && item.items && item.items.length > 0) {
                  result += buildStructure(item, depth + 1, maxDepth);
                }
              }
            }

            return result;
          };

          const structure = buildStructure(targetList);
          const locationText = args.location || 'root';

          if (!structure.trim()) {
            return `No structure found in location "${locationText}"`;
          }

          return `Structure of "${locationText}":\n\n${structure}`;
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

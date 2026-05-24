import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface WorkFlowyAuth {
  sessionId: string;
  username: string;
  userId: string;
}

interface WorkFlowyNode {
  id: string;
  name: string;
  description?: string;
  children?: WorkFlowyNode[];
  completed?: boolean;
  last_modified: number;
  parent?: string;
}

interface WorkFlowyResponse {
  results: WorkFlowyNode[];
  polling_interval_ms: number;
}

class WorkFlowyClient {
  private auth: WorkFlowyAuth | null = null;
  private baseUrl = 'https://workflowy.com';

  async login(username: string, password: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/ajax_login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username,
        password,
      }),
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${response.statusText}`);
    }

    const setCookieHeader = response.headers.get('set-cookie');
    if (!setCookieHeader) {
      throw new Error('No session cookie received');
    }

    const sessionMatch = setCookieHeader.match(/sessionid=([^;]+)/);
    if (!sessionMatch) {
      throw new Error('Session ID not found in response');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(`Login failed: ${data.errors?.join(', ') || 'Unknown error'}`);
    }

    this.auth = {
      sessionId: sessionMatch[1],
      username: data.username,
      userId: data.user_id,
    };
  }

  private getHeaders(): HeadersInit {
    if (!this.auth) {
      throw new Error('Not authenticated. Please login first.');
    }
    
    return {
      'Cookie': `sessionid=${this.auth.sessionId}`,
      'Content-Type': 'application/json',
      'User-Agent': 'WorkFlowy MCP Connector',
    };
  }

  async getOutline(): Promise<WorkFlowyResponse> {
    const response = await fetch(`${this.baseUrl}/get_initialization_data`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(`Failed to get outline: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async createBullet(name: string, parentId?: string, description?: string): Promise<void> {
    const projectid = Date.now().toString();
    const operations = [{
      type: 'create',
      data: {
        projectid,
        parentid: parentId || null,
        priority: 0,
      },
      client_timestamp: Date.now(),
      undo_data: {}
    }];

    // Create the bullet
    let response = await fetch(`${this.baseUrl}/push_and_poll`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        client_id: this.auth?.userId,
        client_version: 18,
        push_poll_id: Date.now(),
        push_poll_data: operations,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create bullet: ${response.status} ${response.statusText}`);
    }

    // Set the name
    if (name) {
      const editOp = [{
        type: 'edit',
        data: {
          projectid,
          name,
        },
        client_timestamp: Date.now(),
        undo_data: {}
      }];

      response = await fetch(`${this.baseUrl}/push_and_poll`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          client_id: this.auth?.userId,
          client_version: 18,
          push_poll_id: Date.now(),
          push_poll_data: editOp,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to set bullet name: ${response.status} ${response.statusText}`);
      }
    }

    // Set description if provided
    if (description) {
      const descOp = [{
        type: 'edit',
        data: {
          projectid,
          description,
        },
        client_timestamp: Date.now(),
        undo_data: {}
      }];

      response = await fetch(`${this.baseUrl}/push_and_poll`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          client_id: this.auth?.userId,
          client_version: 18,
          push_poll_id: Date.now(),
          push_poll_data: descOp,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to set bullet description: ${response.status} ${response.statusText}`);
      }
    }
  }

  findNodeByPath(nodes: WorkFlowyNode[], path: string): WorkFlowyNode | null {
    const pathParts = path.split('/').filter(part => part.length > 0);
    
    let currentNodes = nodes;
    let targetNode: WorkFlowyNode | null = null;

    for (const part of pathParts) {
      targetNode = currentNodes.find(node => 
        node.name.toLowerCase().includes(part.toLowerCase())
      ) || null;
      
      if (!targetNode) {
        return null;
      }
      
      currentNodes = targetNode.children || [];
    }

    return targetNode;
  }

  getAllTasks(nodes: WorkFlowyNode[], includeCompleted = true): WorkFlowyNode[] {
    const tasks: WorkFlowyNode[] = [];
    
    const traverse = (nodeList: WorkFlowyNode[]) => {
      for (const node of nodeList) {
        if (includeCompleted || !node.completed) {
          tasks.push(node);
        }
        if (node.children) {
          traverse(node.children);
        }
      }
    };

    traverse(nodes);
    return tasks;
  }

  searchTasks(nodes: WorkFlowyNode[], query: string, includeCompleted = true): WorkFlowyNode[] {
    const results: WorkFlowyNode[] = [];
    const lowerQuery = query.toLowerCase();
    
    const traverse = (nodeList: WorkFlowyNode[], path = '') => {
      for (const node of nodeList) {
        if (includeCompleted || !node.completed) {
          const matchesName = node.name.toLowerCase().includes(lowerQuery);
          const matchesDescription = node.description?.toLowerCase().includes(lowerQuery);
          
          if (matchesName || matchesDescription) {
            results.push({
              ...node,
              parent: path,
            });
          }
        }
        if (node.children) {
          traverse(node.children, path ? `${path}/${node.name}` : node.name);
        }
      }
    };

    traverse(nodes);
    return results;
  }

  formatTask(task: WorkFlowyNode, depth = 0): string {
    const indent = '  '.repeat(depth);
    const status = task.completed ? '✓' : '•';
    const description = task.description ? `\n${indent}  ${task.description}` : '';
    return `${indent}${status} ${task.name}${description}`;
  }

  formatTasks(tasks: WorkFlowyNode[]): string {
    return tasks.map(task => this.formatTask(task)).join('\n');
  }
}

export const WorkFlowyConnectorConfig = mcpConnectorConfig({
  name: 'WorkFlowy',
  key: 'workflowy',
  version: '1.0.0',
  logo: 'https://workflowy.com/favicon.ico',
  credentials: z.object({
    username: z
      .string()
      .describe('WorkFlowy username or email address'),
    password: z
      .string()
      .describe('WorkFlowy password'),
  }),
  setup: z.object({
    defaultLocation: z
      .string()
      .optional()
      .describe('Default location path for new bullet points (e.g., "Work/Tasks")'),
  }),
  examplePrompt:
    'Create a new task "Review quarterly report" under my Work section, read all incomplete tasks from my Personal area, and search for tasks containing "urgent".',
  tools: (tool) => ({
    CREATE_BULLET: tool({
      name: 'workflowy_create_bullet',
      description: 'Create a new bullet point in WorkFlowy',
      schema: z.object({
        name: z.string().describe('The content/name of the bullet point'),
        location: z
          .string()
          .optional()
          .describe('Path to the location where the bullet should be created (e.g., "Work/Projects"). If not provided, uses default location from setup.'),
        description: z
          .string()
          .optional()
          .describe('Optional description/notes for the bullet point'),
      }),
      handler: async (args, context) => {
        try {
          const { username, password } = await context.getCredentials();
          const { defaultLocation } = await context.getSetup();
          
          const client = new WorkFlowyClient();
          await client.login(username, password);

          const outline = await client.getOutline();
          let parentId: string | undefined;

          const targetLocation = args.location || defaultLocation;
          if (targetLocation) {
            const targetNode = client.findNodeByPath(outline.results, targetLocation);
            if (!targetNode) {
              return `Error: Location "${targetLocation}" not found. Please check the path.`;
            }
            parentId = targetNode.id;
          }

          await client.createBullet(args.name, parentId, args.description);

          return `Successfully created bullet point "${args.name}"${targetLocation ? ` under ${targetLocation}` : ''}${args.description ? ` with description: ${args.description}` : ''}`;
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    READ_TASKS: tool({
      name: 'workflowy_read_tasks',
      description: 'Read tasks from WorkFlowy document or specific location',
      schema: z.object({
        location: z
          .string()
          .optional()
          .describe('Path to specific location to read from (e.g., "Work/Projects"). If not provided, reads from entire document.'),
        includeCompleted: z
          .boolean()
          .optional()
          .default(false)
          .describe('Whether to include completed tasks (marked with ✓)'),
        maxTasks: z
          .number()
          .optional()
          .default(50)
          .describe('Maximum number of tasks to return'),
      }),
      handler: async (args, context) => {
        try {
          const { username, password } = await context.getCredentials();
          
          const client = new WorkFlowyClient();
          await client.login(username, password);

          const outline = await client.getOutline();
          let targetNodes = outline.results;

          if (args.location) {
            const targetNode = client.findNodeByPath(outline.results, args.location);
            if (!targetNode) {
              return `Error: Location "${args.location}" not found. Please check the path.`;
            }
            targetNodes = targetNode.children || [];
          }

          const tasks = client.getAllTasks(targetNodes, args.includeCompleted);
          const limitedTasks = tasks.slice(0, args.maxTasks);

          if (limitedTasks.length === 0) {
            return 'No tasks found in the specified location.';
          }

          return `Found ${limitedTasks.length} task(s)${args.location ? ` in ${args.location}` : ''}:\n\n${client.formatTasks(limitedTasks)}`;
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    SEARCH_TASKS: tool({
      name: 'workflowy_search_tasks',
      description: 'Search for tasks by content in WorkFlowy document',
      schema: z.object({
        query: z.string().describe('Search query to match against task names and descriptions'),
        includeCompleted: z
          .boolean()
          .optional()
          .default(false)
          .describe('Whether to include completed tasks (marked with ✓)'),
        maxResults: z
          .number()
          .optional()
          .default(20)
          .describe('Maximum number of results to return'),
      }),
      handler: async (args, context) => {
        try {
          const { username, password } = await context.getCredentials();
          
          const client = new WorkFlowyClient();
          await client.login(username, password);

          const outline = await client.getOutline();
          const results = client.searchTasks(outline.results, args.query, args.includeCompleted);
          const limitedResults = results.slice(0, args.maxResults);

          if (limitedResults.length === 0) {
            return `No tasks found matching "${args.query}".`;
          }

          const formattedResults = limitedResults.map(task => {
            const path = task.parent ? ` (in ${task.parent})` : '';
            const status = task.completed ? '✓' : '•';
            const description = task.description ? `\n  ${task.description}` : '';
            return `${status} ${task.name}${path}${description}`;
          }).join('\n\n');

          return `Found ${limitedResults.length} task(s) matching "${args.query}":\n\n${formattedResults}`;
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_STRUCTURE: tool({
      name: 'workflowy_get_structure',
      description: 'Get the hierarchical structure overview of WorkFlowy document',
      schema: z.object({
        location: z
          .string()
          .optional()
          .describe('Path to specific location to show structure for. If not provided, shows entire document structure.'),
        maxDepth: z
          .number()
          .optional()
          .default(3)
          .describe('Maximum depth levels to show in the structure'),
        showItemCounts: z
          .boolean()
          .optional()
          .default(true)
          .describe('Whether to show item counts for each section'),
      }),
      handler: async (args, context) => {
        try {
          const { username, password } = await context.getCredentials();
          
          const client = new WorkFlowyClient();
          await client.login(username, password);

          const outline = await client.getOutline();
          let targetNodes = outline.results;

          if (args.location) {
            const targetNode = client.findNodeByPath(outline.results, args.location);
            if (!targetNode) {
              return `Error: Location "${args.location}" not found. Please check the path.`;
            }
            targetNodes = targetNode.children || [];
          }

          const buildStructure = (nodes: WorkFlowyNode[], currentDepth = 0): string => {
            if (currentDepth >= args.maxDepth) return '';
            
            return nodes.map(node => {
              const indent = '  '.repeat(currentDepth);
              const itemCount = args.showItemCounts && node.children 
                ? ` (${node.children.length} items)` 
                : '';
              const status = node.completed ? '✓ ' : '';
              
              let result = `${indent}${status}${node.name}${itemCount}`;
              
              if (node.children && node.children.length > 0 && currentDepth < args.maxDepth - 1) {
                const childStructure = buildStructure(node.children, currentDepth + 1);
                if (childStructure) {
                  result += '\n' + childStructure;
                }
              }
              
              return result;
            }).join('\n');
          };

          const structure = buildStructure(targetNodes);

          if (!structure) {
            return 'No items found in the specified location.';
          }

          return `Document structure${args.location ? ` for ${args.location}` : ''}:\n\n${structure}`;
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});
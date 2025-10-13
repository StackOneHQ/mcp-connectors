import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

interface TodoistTask {
  id: string;
  content: string;
  description: string;
  projectId: string;
  sectionId?: string;
  parentId?: string;
  order: number;
  priority: number;
  labels: string[];
  due?: {
    date: string;
    datetime?: string;
    string: string;
    timezone?: string;
  };
  url: string;
  commentCount: number;
  isCompleted: boolean;
  createdAt: string;
  creatorId: string;
  assigneeId?: string;
}

interface TodoistProject {
  id: string;
  name: string;
  color: string;
  parentId?: string;
  order: number;
  commentCount: number;
  isShared: boolean;
  isFavorite: boolean;
  isInboxProject: boolean;
  isTeamInbox: boolean;
  url: string;
  viewStyle: string;
}

interface TodoistLabel {
  id: string;
  name: string;
  color: string;
  order: number;
  isFavorite: boolean;
}

interface TodoistComment {
  id: string;
  taskId?: string;
  projectId?: string;
  content: string;
  postedAt: string;
  attachment?: {
    fileName: string;
    fileType: string;
    fileUrl: string;
    resourceType: string;
  };
}

class TodoistClient {
  private headers: { Authorization: string; 'Content-Type': string };
  private baseUrl = 'https://api.todoist.com/rest/v2';

  constructor(token: string) {
    this.headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Todoist API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  async getTasks(
    projectId?: string,
    sectionId?: string,
    label?: string,
    filter?: string,
    lang?: string
  ): Promise<TodoistTask[]> {
    const params = new URLSearchParams();
    if (projectId) params.append('project_id', projectId);
    if (sectionId) params.append('section_id', sectionId);
    if (label) params.append('label', label);
    if (filter) params.append('filter', filter);
    if (lang) params.append('lang', lang);

    const query = params.toString();
    const endpoint = `/tasks${query ? `?${query}` : ''}`;

    return this.request<TodoistTask[]>(endpoint);
  }

  async getTask(id: string): Promise<TodoistTask> {
    return this.request<TodoistTask>(`/tasks/${id}`);
  }

  async createTask(args: {
    content: string;
    description?: string;
    projectId?: string;
    sectionId?: string;
    parentId?: string;
    order?: number;
    labels?: string[];
    priority?: number;
    dueString?: string;
    dueDate?: string;
    dueDatetime?: string;
    dueLang?: string;
    assigneeId?: string;
  }): Promise<TodoistTask> {
    return this.request<TodoistTask>('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        content: args.content,
        description: args.description,
        project_id: args.projectId,
        section_id: args.sectionId,
        parent_id: args.parentId,
        order: args.order,
        labels: args.labels,
        priority: args.priority || 1,
        due_string: args.dueString,
        due_date: args.dueDate,
        due_datetime: args.dueDatetime,
        due_lang: args.dueLang,
        assignee_id: args.assigneeId,
      }),
    });
  }

  async updateTask(
    id: string,
    args: {
      content?: string;
      description?: string;
      labels?: string[];
      priority?: number;
      dueString?: string;
      dueDate?: string;
      dueDatetime?: string;
      dueLang?: string;
      assigneeId?: string;
    }
  ): Promise<TodoistTask> {
    return this.request<TodoistTask>(`/tasks/${id}`, {
      method: 'POST',
      body: JSON.stringify({
        content: args.content,
        description: args.description,
        labels: args.labels,
        priority: args.priority,
        due_string: args.dueString,
        due_date: args.dueDate,
        due_datetime: args.dueDatetime,
        due_lang: args.dueLang,
        assignee_id: args.assigneeId,
      }),
    });
  }

  async completeTask(id: string): Promise<boolean> {
    await this.request(`/tasks/${id}/close`, {
      method: 'POST',
    });
    return true;
  }

  async deleteTask(id: string): Promise<boolean> {
    await this.request(`/tasks/${id}`, {
      method: 'DELETE',
    });
    return true;
  }

  async getProjects(): Promise<TodoistProject[]> {
    return this.request<TodoistProject[]>('/projects');
  }

  async getProject(id: string): Promise<TodoistProject> {
    return this.request<TodoistProject>(`/projects/${id}`);
  }

  async createProject(args: {
    name: string;
    parentId?: string;
    color?: string;
    isFavorite?: boolean;
    viewStyle?: string;
  }): Promise<TodoistProject> {
    return this.request<TodoistProject>('/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: args.name,
        parent_id: args.parentId,
        color: args.color,
        is_favorite: args.isFavorite,
        view_style: args.viewStyle,
      }),
    });
  }

  async updateProject(
    id: string,
    args: {
      name?: string;
      color?: string;
      isFavorite?: boolean;
      viewStyle?: string;
    }
  ): Promise<TodoistProject> {
    return this.request<TodoistProject>(`/projects/${id}`, {
      method: 'POST',
      body: JSON.stringify({
        name: args.name,
        color: args.color,
        is_favorite: args.isFavorite,
        view_style: args.viewStyle,
      }),
    });
  }

  async deleteProject(id: string): Promise<boolean> {
    await this.request(`/projects/${id}`, {
      method: 'DELETE',
    });
    return true;
  }

  async getLabels(): Promise<TodoistLabel[]> {
    return this.request<TodoistLabel[]>('/labels');
  }

  async createLabel(args: {
    name: string;
    order?: number;
    color?: string;
    isFavorite?: boolean;
  }): Promise<TodoistLabel> {
    return this.request<TodoistLabel>('/labels', {
      method: 'POST',
      body: JSON.stringify({
        name: args.name,
        order: args.order,
        color: args.color,
        is_favorite: args.isFavorite,
      }),
    });
  }

  async getComments(taskId?: string, projectId?: string): Promise<TodoistComment[]> {
    const params = new URLSearchParams();
    if (taskId) params.append('task_id', taskId);
    if (projectId) params.append('project_id', projectId);

    const query = params.toString();
    const endpoint = `/comments${query ? `?${query}` : ''}`;

    return this.request<TodoistComment[]>(endpoint);
  }

  async addComment(args: {
    taskId?: string;
    projectId?: string;
    content: string;
    attachment?: {
      fileName: string;
      fileType: string;
      fileUrl: string;
      resourceType: string;
    };
  }): Promise<TodoistComment> {
    return this.request<TodoistComment>('/comments', {
      method: 'POST',
      body: JSON.stringify({
        task_id: args.taskId,
        project_id: args.projectId,
        content: args.content,
        attachment: args.attachment,
      }),
    });
  }
}

export interface TodoistCredentials {
  apiToken: string;
}

export function createTodoistServer(credentials: TodoistCredentials): McpServer {
  const server = new McpServer({
    name: 'Todoist',
    version: '1.0.0',
  });

  server.tool(
    'create_task',
    'Creates a new task in Todoist. Supports natural language due dates, labels, priorities, and project assignment.',
    {
      content: z.string().describe('Task content/title'),
      description: z.string().optional().describe('Task description'),
      projectId: z.string().optional().describe('Project ID to add task to'),
      sectionId: z.string().optional().describe('Section ID within project'),
      parentId: z.string().optional().describe('Parent task ID for subtasks'),
      priority: z
        .number()
        .min(1)
        .max(4)
        .optional()
        .describe('Priority: 1 (normal) to 4 (urgent)'),
      labels: z.array(z.string()).optional().describe('Array of label names'),
      dueString: z
        .string()
        .optional()
        .describe(
          'Due date in natural language (e.g., "tomorrow", "next Monday at 2pm")'
        ),
      dueDate: z.string().optional().describe('Due date in YYYY-MM-DD format'),
      dueDatetime: z.string().optional().describe('Due datetime in RFC3339 format'),
      assigneeId: z.string().optional().describe('User ID to assign task to'),
    },
    async (args) => {
      try {
        const client = new TodoistClient(credentials.apiToken);
        const task = await client.createTask(args);
        return {
          content: [
            {
              type: 'text',
              text: `Created task "${task.content}" (ID: ${task.id})\nURL: ${task.url}\nPriority: ${task.priority}\nDue: ${task.due?.string || 'None'}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to create task: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'update_task',
    'Updates an existing task with new content, priority, due date, or other properties.',
    {
      id: z.string().describe('Task ID to update'),
      content: z.string().optional().describe('New task content'),
      description: z.string().optional().describe('New task description'),
      priority: z
        .number()
        .min(1)
        .max(4)
        .optional()
        .describe('New priority: 1 (normal) to 4 (urgent)'),
      labels: z.array(z.string()).optional().describe('New array of label names'),
      dueString: z.string().optional().describe('New due date in natural language'),
      dueDate: z.string().optional().describe('New due date in YYYY-MM-DD format'),
      dueDatetime: z.string().optional().describe('New due datetime in RFC3339 format'),
      assigneeId: z.string().optional().describe('New assignee user ID'),
    },
    async (args) => {
      try {
        const client = new TodoistClient(credentials.apiToken);
        const task = await client.updateTask(args.id, args);
        return {
          content: [
            {
              type: 'text',
              text: `Updated task "${task.content}" (ID: ${task.id})\nURL: ${task.url}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to update task: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'get_task',
    'Retrieves details of a specific task by its ID.',
    {
      id: z.string().describe('Task ID to retrieve'),
    },
    async (args) => {
      try {
        const client = new TodoistClient(credentials.apiToken);
        const task = await client.getTask(args.id);
        return {
          content: [
            {
              type: 'text',
              text: `Task: ${task.content}\nDescription: ${task.description || 'None'}\nProject ID: ${task.projectId}\nPriority: ${task.priority}\nLabels: ${task.labels.join(', ') || 'None'}\nDue: ${task.due?.string || 'None'}\nCompleted: ${task.isCompleted}\nURL: ${task.url}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get task: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'list_tasks',
    'Lists tasks with optional filtering by project, section, label, or custom filter expressions.',
    {
      projectId: z.string().optional().describe('Filter by project ID'),
      sectionId: z.string().optional().describe('Filter by section ID'),
      label: z.string().optional().describe('Filter by label name'),
      filter: z
        .string()
        .optional()
        .describe('Custom filter expression (e.g., "today", "overdue", "@work")'),
      lang: z.string().optional().describe('Language for date parsing (default: en)'),
    },
    async (args) => {
      try {
        const client = new TodoistClient(credentials.apiToken);
        const tasks = await client.getTasks(
          args.projectId,
          args.sectionId,
          args.label,
          args.filter,
          args.lang
        );

        if (tasks.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No tasks found matching the criteria.',
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Found ${tasks.length} tasks:\n${tasks
                .map(
                  (task) =>
                    `- ${task.content} (ID: ${task.id})\n  Priority: ${task.priority}\n  Due: ${task.due?.string || 'None'}\n  Labels: ${task.labels.join(', ') || 'None'}\n  ${task.url}`
                )
                .join('\n\n')}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to list tasks: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'complete_task',
    'Marks a task as completed.',
    {
      id: z.string().describe('Task ID to complete'),
    },
    async (args) => {
      try {
        const client = new TodoistClient(credentials.apiToken);
        await client.completeTask(args.id);
        return {
          content: [
            {
              type: 'text',
              text: `Task ${args.id} marked as completed.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to complete task: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'delete_task',
    'Permanently deletes a task.',
    {
      id: z.string().describe('Task ID to delete'),
    },
    async (args) => {
      try {
        const client = new TodoistClient(credentials.apiToken);
        await client.deleteTask(args.id);
        return {
          content: [
            {
              type: 'text',
              text: `Task ${args.id} deleted successfully.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to delete task: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'create_project',
    'Creates a new project in Todoist.',
    {
      name: z.string().describe('Project name'),
      parentId: z.string().optional().describe('Parent project ID'),
      color: z.string().optional().describe('Project color'),
      isFavorite: z.boolean().optional().describe('Mark as favorite'),
      viewStyle: z.enum(['list', 'board']).optional().describe('Project view style'),
    },
    async (args) => {
      try {
        const client = new TodoistClient(credentials.apiToken);
        const project = await client.createProject(args);
        return {
          content: [
            {
              type: 'text',
              text: `Created project "${project.name}" (ID: ${project.id})\nURL: ${project.url}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to create project: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'list_projects',
    "Lists all projects in the user's account.",
    {},
    async () => {
      try {
        const client = new TodoistClient(credentials.apiToken);
        const projects = await client.getProjects();

        if (projects.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No projects found.',
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Found ${projects.length} projects:\n${projects
                .map(
                  (project) =>
                    `- ${project.name} (ID: ${project.id})\n  Color: ${project.color}\n  Favorite: ${project.isFavorite}\n  ${project.url}`
                )
                .join('\n\n')}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to list projects: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'update_project',
    'Updates an existing project.',
    {
      id: z.string().describe('Project ID to update'),
      name: z.string().optional().describe('New project name'),
      color: z.string().optional().describe('New project color'),
      isFavorite: z.boolean().optional().describe('New favorite status'),
      viewStyle: z
        .enum(['list', 'board'])
        .optional()
        .describe('New project view style'),
    },
    async (args) => {
      try {
        const client = new TodoistClient(credentials.apiToken);
        const project = await client.updateProject(args.id, args);
        return {
          content: [
            {
              type: 'text',
              text: `Updated project "${project.name}" (ID: ${project.id})\nURL: ${project.url}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to update project: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'delete_project',
    'Permanently deletes a project and all its tasks.',
    {
      id: z.string().describe('Project ID to delete'),
    },
    async (args) => {
      try {
        const client = new TodoistClient(credentials.apiToken);
        await client.deleteProject(args.id);
        return {
          content: [
            {
              type: 'text',
              text: `Project ${args.id} deleted successfully.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to delete project: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'list_labels',
    "Lists all labels in the user's account.",
    {},
    async () => {
      try {
        const client = new TodoistClient(credentials.apiToken);
        const labels = await client.getLabels();

        if (labels.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No labels found.',
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Found ${labels.length} labels:\n${labels
                .map(
                  (label) =>
                    `- ${label.name} (ID: ${label.id})\n  Color: ${label.color}\n  Favorite: ${label.isFavorite}`
                )
                .join('\n\n')}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to list labels: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'create_label',
    'Creates a new label for organizing tasks.',
    {
      name: z.string().describe('Label name'),
      order: z.number().optional().describe('Label order'),
      color: z.string().optional().describe('Label color'),
      isFavorite: z.boolean().optional().describe('Mark as favorite'),
    },
    async (args) => {
      try {
        const client = new TodoistClient(credentials.apiToken);
        const label = await client.createLabel(args);
        return {
          content: [
            {
              type: 'text',
              text: `Created label "${label.name}" (ID: ${label.id})`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to create label: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'add_comment',
    'Adds a comment to a task or project.',
    {
      taskId: z.string().optional().describe('Task ID to comment on'),
      projectId: z.string().optional().describe('Project ID to comment on'),
      content: z.string().describe('Comment content'),
      attachment: z
        .object({
          fileName: z.string(),
          fileType: z.string(),
          fileUrl: z.string(),
          resourceType: z.string(),
        })
        .optional()
        .describe('Optional file attachment'),
    },
    async (args) => {
      try {
        if (!args.taskId && !args.projectId) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: Either taskId or projectId must be provided.',
              },
            ],
          };
        }

        const client = new TodoistClient(credentials.apiToken);
        const comment = await client.addComment(args);
        return {
          content: [
            {
              type: 'text',
              text: `Added comment (ID: ${comment.id})\nContent: ${comment.content}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to add comment: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'list_comments',
    'Lists comments for a task or project.',
    {
      taskId: z.string().optional().describe('Task ID to get comments for'),
      projectId: z.string().optional().describe('Project ID to get comments for'),
    },
    async (args) => {
      try {
        if (!args.taskId && !args.projectId) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: Either taskId or projectId must be provided.',
              },
            ],
          };
        }

        const client = new TodoistClient(credentials.apiToken);
        const comments = await client.getComments(args.taskId, args.projectId);

        if (comments.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No comments found.',
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Found ${comments.length} comments:\n${comments
                .map(
                  (comment) =>
                    `- Comment ID: ${comment.id}\n  Content: ${comment.content}\n  Posted: ${comment.postedAt}${comment.attachment ? `\n  Attachment: ${comment.attachment.fileName}` : ''}`
                )
                .join('\n\n')}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to list comments: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  return server;
}

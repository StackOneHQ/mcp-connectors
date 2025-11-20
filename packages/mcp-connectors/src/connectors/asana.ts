import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ConnectorMetadata } from '../types/metadata';

interface AsanaTask {
  gid: string;
  name: string;
  notes?: string;
  html_notes?: string;
  completed: boolean;
  assignee?: {
    gid: string;
    name: string;
  };
  assignee_status?: string;
  due_at?: string;
  due_on?: string;
  projects?: Array<{
    gid: string;
    name: string;
  }>;
  memberships?: Array<{
    project: {
      gid: string;
      name: string;
    };
    section?: {
      gid: string;
      name: string;
    };
  }>;
  tags?: Array<{
    gid: string;
    name: string;
  }>;
  followers?: Array<{
    gid: string;
    name: string;
  }>;
  custom_fields?: Array<{
    gid: string;
    name: string;
    type: string;
    number_value?: number;
    text_value?: string;
    enum_value?: {
      gid: string;
      name: string;
    };
  }>;
  created_at: string;
  modified_at: string;
  permalink_url: string;
}

interface AsanaProject {
  gid: string;
  name: string;
  notes?: string;
  color?: string;
  public: boolean;
  archived: boolean;
  current_status?: {
    text: string;
    color: string;
    author: {
      name: string;
    };
  };
  default_view: string;
  due_date?: string;
  due_on?: string;
  html_notes?: string;
  is_template: boolean;
  members: Array<{
    gid: string;
    name: string;
  }>;
  owner?: {
    gid: string;
    name: string;
  };
  team?: {
    gid: string;
    name: string;
  };
  workspace: {
    gid: string;
    name: string;
  };
  created_at: string;
  modified_at: string;
  permalink_url: string;
}

interface AsanaUser {
  gid: string;
  email: string;
  name: string;
  photo?: {
    image_128x128?: string;
    image_21x21?: string;
    image_27x27?: string;
    image_36x36?: string;
    image_60x60?: string;
  };
  workspaces: Array<{
    gid: string;
    name: string;
  }>;
}

interface AsanaWorkspace {
  gid: string;
  name: string;
  email_domains?: string[];
  is_organization: boolean;
}

interface AsanaTeam {
  gid: string;
  name: string;
  description?: string;
  organization?: {
    gid: string;
    name: string;
  };
  permalink_url: string;
  visibility: string;
}

class AsanaClient {
  private headers: { Authorization: string; Accept: string };
  private baseUrl = 'https://app.asana.com/api/1.0';

  constructor(accessToken: string) {
    this.headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    };
  }

  async getUser(userGid = 'me'): Promise<AsanaUser> {
    const response = await fetch(`${this.baseUrl}/users/${userGid}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Asana API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: AsanaUser };
    return result.data;
  }

  async getWorkspaces(): Promise<AsanaWorkspace[]> {
    const response = await fetch(`${this.baseUrl}/workspaces`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Asana API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: AsanaWorkspace[] };
    return result.data;
  }

  async getTeams(workspaceGid: string): Promise<AsanaTeam[]> {
    const response = await fetch(`${this.baseUrl}/workspaces/${workspaceGid}/teams`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Asana API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: AsanaTeam[] };
    return result.data;
  }

  async getProjects(
    workspaceGid?: string,
    teamGid?: string,
    limit = 50
  ): Promise<AsanaProject[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });

    if (workspaceGid) {
      params.append('workspace', workspaceGid);
    }
    if (teamGid) {
      params.append('team', teamGid);
    }

    const response = await fetch(`${this.baseUrl}/projects?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Asana API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: AsanaProject[] };
    return result.data;
  }

  async getProject(projectGid: string): Promise<AsanaProject> {
    const response = await fetch(`${this.baseUrl}/projects/${projectGid}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Asana API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: AsanaProject };
    return result.data;
  }

  async getTasks(
    projectGid?: string,
    assigneeGid?: string,
    workspaceGid?: string,
    completedSince?: string,
    limit = 50
  ): Promise<AsanaTask[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      opt_fields:
        'name,notes,completed,assignee,assignee.name,due_at,due_on,projects,projects.name,tags,tags.name,custom_fields,created_at,modified_at,permalink_url',
    });

    if (projectGid) {
      params.append('project', projectGid);
    }
    if (assigneeGid) {
      params.append('assignee', assigneeGid);
    }
    if (workspaceGid) {
      params.append('workspace', workspaceGid);
    }
    if (completedSince) {
      params.append('completed_since', completedSince);
    }

    const response = await fetch(`${this.baseUrl}/tasks?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Asana API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: AsanaTask[] };
    return result.data;
  }

  async getTask(taskGid: string): Promise<AsanaTask> {
    const params = new URLSearchParams({
      opt_fields:
        'name,notes,html_notes,completed,assignee,assignee.name,assignee_status,due_at,due_on,projects,projects.name,memberships,memberships.project,memberships.project.name,memberships.section,memberships.section.name,tags,tags.name,followers,followers.name,custom_fields,custom_fields.name,custom_fields.type,custom_fields.number_value,custom_fields.text_value,custom_fields.enum_value,custom_fields.enum_value.name,created_at,modified_at,permalink_url',
    });

    const response = await fetch(`${this.baseUrl}/tasks/${taskGid}?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Asana API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: AsanaTask };
    return result.data;
  }

  async createTask(data: {
    name: string;
    notes?: string;
    html_notes?: string;
    assignee?: string;
    projects?: string[];
    due_at?: string;
    due_on?: string;
    completed?: boolean;
  }): Promise<AsanaTask> {
    const response = await fetch(`${this.baseUrl}/tasks`, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      throw new Error(`Asana API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: AsanaTask };
    return result.data;
  }

  async updateTask(
    taskGid: string,
    data: {
      name?: string;
      notes?: string;
      html_notes?: string;
      assignee?: string;
      due_at?: string;
      due_on?: string;
      completed?: boolean;
    }
  ): Promise<AsanaTask> {
    const response = await fetch(`${this.baseUrl}/tasks/${taskGid}`, {
      method: 'PUT',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      throw new Error(`Asana API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: AsanaTask };
    return result.data;
  }

  async deleteTask(taskGid: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/tasks/${taskGid}`, {
      method: 'DELETE',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Asana API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: { success: boolean } };
    return result.data;
  }

  async createProject(data: {
    name: string;
    notes?: string;
    team?: string;
    workspace?: string;
    public?: boolean;
    color?: string;
  }): Promise<AsanaProject> {
    const response = await fetch(`${this.baseUrl}/projects`, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      throw new Error(`Asana API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: AsanaProject };
    return result.data;
  }

  async updateProject(
    projectGid: string,
    data: {
      name?: string;
      notes?: string;
      color?: string;
      public?: boolean;
      archived?: boolean;
    }
  ): Promise<AsanaProject> {
    const response = await fetch(`${this.baseUrl}/projects/${projectGid}`, {
      method: 'PUT',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      throw new Error(`Asana API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: AsanaProject };
    return result.data;
  }
}

export interface AsanaCredentials {
  accessToken: string;
}

export const AsanaCredentialsSchema = z.object({
  accessToken: z.string().describe('OAuth access token'),
});

export const AsanaConnectorMetadata = {
  key: 'asana',
  name: 'Asana',
  description: 'Project management and team collaboration',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/asana/filled/svg',
  examplePrompt: 'List my Asana tasks',
  categories: ['productivity', 'project-management'],
  credentialsSchema: AsanaCredentialsSchema,
} as const satisfies ConnectorMetadata;

export function createAsanaServer(credentials: AsanaCredentials): McpServer {
  const server = new McpServer({
    name: 'Asana',
    version: '1.0.0',
  });

  server.tool(
    'asana_get_user',
    'Get information about the current user or a specific user',
    {
      userGid: z
        .string()
        .optional()
        .describe('User GID to get info for (omit for current user)'),
    },
    async (args) => {
      try {
        const client = new AsanaClient(credentials.accessToken);
        const user = await client.getUser(args.userGid);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(user, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get user: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'asana_list_workspaces',
    'List all workspaces the user has access to',
    {},
    async (_args) => {
      try {
        const client = new AsanaClient(credentials.accessToken);
        const workspaces = await client.getWorkspaces();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(workspaces, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to list workspaces: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'asana_list_teams',
    'List teams in a workspace',
    {
      workspaceGid: z.string().describe('Workspace GID to list teams for'),
    },
    async (args) => {
      try {
        const client = new AsanaClient(credentials.accessToken);
        const teams = await client.getTeams(args.workspaceGid);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(teams, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to list teams: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'asana_list_projects',
    'List projects with optional filtering',
    {
      workspaceGid: z.string().optional().describe('Workspace GID to filter projects'),
      teamGid: z.string().optional().describe('Team GID to filter projects'),
      limit: z.number().default(50).describe('Maximum number of projects to return'),
    },
    async (args) => {
      try {
        const client = new AsanaClient(credentials.accessToken);
        const projects = await client.getProjects(
          args.workspaceGid,
          args.teamGid,
          args.limit
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(projects, null, 2),
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
    'asana_get_project',
    'Get detailed information about a specific project',
    {
      projectGid: z.string().describe('Project GID to retrieve'),
    },
    async (args) => {
      try {
        const client = new AsanaClient(credentials.accessToken);
        const project = await client.getProject(args.projectGid);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(project, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get project: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'asana_list_tasks',
    'List tasks with optional filtering',
    {
      projectGid: z.string().optional().describe('Project GID to filter tasks'),
      assigneeGid: z.string().optional().describe('Assignee GID to filter tasks'),
      workspaceGid: z.string().optional().describe('Workspace GID to filter tasks'),
      completedSince: z
        .string()
        .optional()
        .describe('ISO 8601 datetime to filter completed tasks since'),
      limit: z.number().default(50).describe('Maximum number of tasks to return'),
    },
    async (args) => {
      try {
        const client = new AsanaClient(credentials.accessToken);
        const tasks = await client.getTasks(
          args.projectGid,
          args.assigneeGid,
          args.workspaceGid,
          args.completedSince,
          args.limit
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(tasks, null, 2),
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
    'asana_get_task',
    'Get detailed information about a specific task',
    {
      taskGid: z.string().describe('Task GID to retrieve'),
    },
    async (args) => {
      try {
        const client = new AsanaClient(credentials.accessToken);
        const task = await client.getTask(args.taskGid);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(task, null, 2),
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
    'asana_create_task',
    'Create a new task',
    {
      name: z.string().describe('Task name'),
      notes: z.string().optional().describe('Task notes (plain text)'),
      htmlNotes: z.string().optional().describe('Task notes (HTML format)'),
      assignee: z.string().optional().describe('Assignee GID or "me"'),
      projects: z.array(z.string()).optional().describe('Array of project GIDs'),
      dueAt: z.string().optional().describe('Due date and time (ISO 8601)'),
      dueOn: z.string().optional().describe('Due date (YYYY-MM-DD)'),
      completed: z.boolean().optional().describe('Whether the task is completed'),
    },
    async (args) => {
      try {
        const client = new AsanaClient(credentials.accessToken);
        const task = await client.createTask({
          name: args.name,
          notes: args.notes,
          html_notes: args.htmlNotes,
          assignee: args.assignee,
          projects: args.projects,
          due_at: args.dueAt,
          due_on: args.dueOn,
          completed: args.completed,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(task, null, 2),
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
    'asana_update_task',
    'Update an existing task',
    {
      taskGid: z.string().describe('Task GID to update'),
      name: z.string().optional().describe('Task name'),
      notes: z.string().optional().describe('Task notes (plain text)'),
      htmlNotes: z.string().optional().describe('Task notes (HTML format)'),
      assignee: z.string().optional().describe('Assignee GID or "me"'),
      dueAt: z.string().optional().describe('Due date and time (ISO 8601)'),
      dueOn: z.string().optional().describe('Due date (YYYY-MM-DD)'),
      completed: z.boolean().optional().describe('Whether the task is completed'),
    },
    async (args) => {
      try {
        const client = new AsanaClient(credentials.accessToken);
        const task = await client.updateTask(args.taskGid, {
          name: args.name,
          notes: args.notes,
          html_notes: args.htmlNotes,
          assignee: args.assignee,
          due_at: args.dueAt,
          due_on: args.dueOn,
          completed: args.completed,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(task, null, 2),
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
    'asana_delete_task',
    'Delete a task',
    {
      taskGid: z.string().describe('Task GID to delete'),
    },
    async (args) => {
      try {
        const client = new AsanaClient(credentials.accessToken);
        const result = await client.deleteTask(args.taskGid);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
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
    'asana_create_project',
    'Create a new project',
    {
      name: z.string().describe('Project name'),
      notes: z.string().optional().describe('Project notes'),
      team: z.string().optional().describe('Team GID'),
      workspace: z.string().optional().describe('Workspace GID'),
      public: z.boolean().optional().describe('Whether the project is public'),
      color: z.string().optional().describe('Project color'),
    },
    async (args) => {
      try {
        const client = new AsanaClient(credentials.accessToken);
        const project = await client.createProject({
          name: args.name,
          notes: args.notes,
          team: args.team,
          workspace: args.workspace,
          public: args.public,
          color: args.color,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(project, null, 2),
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
    'asana_update_project',
    'Update an existing project',
    {
      projectGid: z.string().describe('Project GID to update'),
      name: z.string().optional().describe('Project name'),
      notes: z.string().optional().describe('Project notes'),
      color: z.string().optional().describe('Project color'),
      public: z.boolean().optional().describe('Whether the project is public'),
      archived: z.boolean().optional().describe('Whether the project is archived'),
    },
    async (args) => {
      try {
        const client = new AsanaClient(credentials.accessToken);
        const project = await client.updateProject(args.projectGid, {
          name: args.name,
          notes: args.notes,
          color: args.color,
          public: args.public,
          archived: args.archived,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(project, null, 2),
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

  return server;
}

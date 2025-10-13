import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

interface GitLabProject {
  id: number;
  name: string;
  path: string;
  path_with_namespace: string;
  description: string | null;
  visibility: string;
  web_url: string;
  ssh_url_to_repo: string;
  http_url_to_repo: string;
  default_branch: string;
  star_count: number;
  forks_count: number;
  open_issues_count: number;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
}

interface GitLabIssue {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  description: string | null;
  state: string;
  author: {
    username: string;
    id: number;
    avatar_url: string;
    name: string;
  };
  assignees: Array<{
    username: string;
    id: number;
    name: string;
  }>;
  labels: string[];
  web_url: string;
  created_at: string;
  updated_at: string;
}

interface GitLabMergeRequest {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  description: string | null;
  state: string;
  author: {
    username: string;
    id: number;
    avatar_url: string;
    name: string;
  };
  assignees: Array<{
    username: string;
    id: number;
    name: string;
  }>;
  source_branch: string;
  target_branch: string;
  web_url: string;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  merge_status: string;
}

interface GitLabUser {
  id: number;
  username: string;
  name: string;
  email?: string;
  bio: string | null;
  location: string | null;
  website_url: string | null;
  avatar_url: string;
  web_url: string;
  public_projects_count: number;
  created_at: string;
}

interface GitLabFile {
  id: string;
  name: string;
  path: string;
  type: string;
  size?: number;
  mode: string;
}

class GitLabClient {
  private headers: { 'Private-Token': string; Accept: string; 'User-Agent': string };
  private baseUrl: string;

  constructor(token: string, baseUrl = 'https://gitlab.com/api/v4') {
    this.baseUrl = baseUrl;
    this.headers = {
      'Private-Token': token,
      Accept: 'application/json',
      'User-Agent': 'MCP-GitLab-Connector/1.0.0',
    };
  }

  private validatePath(path: string): void {
    // Prevent path traversal attacks
    if (path.includes('..') || path.includes('\0') || path.includes('\n')) {
      throw new Error('Invalid path: potentially malicious path detected');
    }
  }

  async getProject(projectId: string): Promise<GitLabProject> {
    const response = await fetch(
      `${this.baseUrl}/projects/${encodeURIComponent(projectId)}`,
      {
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<GitLabProject>;
  }

  async listProjects(owned = false, limit = 30): Promise<GitLabProject[]> {
    let url = `${this.baseUrl}/projects?per_page=${limit}&order_by=updated_at&sort=desc`;
    if (owned) {
      url += '&owned=true';
    }

    const response = await fetch(url, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<GitLabProject[]>;
  }

  async listIssues(
    projectId: string,
    state: 'opened' | 'closed' | 'all' = 'opened',
    limit = 30
  ): Promise<GitLabIssue[]> {
    const response = await fetch(
      `${this.baseUrl}/projects/${encodeURIComponent(projectId)}/issues?state=${state}&per_page=${limit}&order_by=updated_at&sort=desc`,
      {
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<GitLabIssue[]>;
  }

  async getIssue(projectId: string, issueIid: number): Promise<GitLabIssue> {
    const response = await fetch(
      `${this.baseUrl}/projects/${encodeURIComponent(projectId)}/issues/${issueIid}`,
      {
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<GitLabIssue>;
  }

  async createIssue(
    projectId: string,
    title: string,
    description?: string,
    labels?: string[],
    assigneeIds?: number[]
  ): Promise<GitLabIssue> {
    const response = await fetch(
      `${this.baseUrl}/projects/${encodeURIComponent(projectId)}/issues`,
      {
        method: 'POST',
        headers: { ...this.headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          labels: labels,
          assignee_ids: assigneeIds,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<GitLabIssue>;
  }

  async listMergeRequests(
    projectId: string,
    state: 'opened' | 'closed' | 'merged' | 'all' = 'opened',
    limit = 30
  ): Promise<GitLabMergeRequest[]> {
    const response = await fetch(
      `${this.baseUrl}/projects/${encodeURIComponent(projectId)}/merge_requests?state=${state}&per_page=${limit}&order_by=updated_at&sort=desc`,
      {
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<GitLabMergeRequest[]>;
  }

  async getMergeRequest(
    projectId: string,
    mergeRequestIid: number
  ): Promise<GitLabMergeRequest> {
    const response = await fetch(
      `${this.baseUrl}/projects/${encodeURIComponent(projectId)}/merge_requests/${mergeRequestIid}`,
      {
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<GitLabMergeRequest>;
  }

  async getCurrentUser(): Promise<GitLabUser> {
    const response = await fetch(`${this.baseUrl}/user`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<GitLabUser>;
  }

  async getUser(userId: number): Promise<GitLabUser> {
    const response = await fetch(`${this.baseUrl}/users/${userId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<GitLabUser>;
  }

  async listFiles(projectId: string, path = '', ref?: string): Promise<GitLabFile[]> {
    this.validatePath(path);

    let url = `${this.baseUrl}/projects/${encodeURIComponent(projectId)}/repository/tree?path=${encodeURIComponent(path)}`;
    if (ref) {
      url += `&ref=${encodeURIComponent(ref)}`;
    }

    const response = await fetch(url, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<GitLabFile[]>;
  }

  async getFileContent(projectId: string, path: string, ref?: string): Promise<string> {
    this.validatePath(path);

    let url = `${this.baseUrl}/projects/${encodeURIComponent(projectId)}/repository/files/${encodeURIComponent(path)}/raw`;
    if (ref) {
      url += `?ref=${encodeURIComponent(ref)}`;
    }

    const response = await fetch(url, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.status} ${response.statusText}`);
    }

    return response.text();
  }
}

export interface GitLabCredentials {
  token: string;
  baseUrl?: string;
}

export function createGitLabServer(credentials: GitLabCredentials): McpServer {
  const server = new McpServer({
    name: 'GitLab',
    version: '1.0.0',
  });

  server.tool(
    'gitlab_get_project',
    'Get information about a specific GitLab project',
    {
      projectId: z
        .string()
        .describe('Project ID or path (e.g., "123" or "group/project")'),
    },
    async (args) => {
      try {
        const client = new GitLabClient(credentials.token, credentials.baseUrl);
        const project = await client.getProject(args.projectId);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(project, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to get project: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'gitlab_list_projects',
    'List projects for the authenticated user',
    {
      owned: z.boolean().default(false).describe('Only show owned projects'),
      limit: z.number().default(30).describe('Maximum number of projects to return'),
    },
    async (args) => {
      try {
        const client = new GitLabClient(credentials.token, credentials.baseUrl);
        const projects = await client.listProjects(args.owned, args.limit);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(projects, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to list projects: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'gitlab_list_issues',
    'List issues for a project',
    {
      projectId: z.string().describe('Project ID or path'),
      state: z
        .enum(['opened', 'closed', 'all'])
        .default('opened')
        .describe('Issue state filter'),
      limit: z.number().default(30).describe('Maximum number of issues to return'),
    },
    async (args) => {
      try {
        const client = new GitLabClient(credentials.token, credentials.baseUrl);
        const issues = await client.listIssues(args.projectId, args.state, args.limit);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(issues, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to list issues: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'gitlab_get_issue',
    'Get details of a specific issue',
    {
      projectId: z.string().describe('Project ID or path'),
      issueIid: z.number().describe('Issue IID (internal ID)'),
    },
    async (args) => {
      try {
        const client = new GitLabClient(credentials.token, credentials.baseUrl);
        const issue = await client.getIssue(args.projectId, args.issueIid);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(issue, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to get issue: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'gitlab_create_issue',
    'Create a new issue in a project',
    {
      projectId: z.string().describe('Project ID or path'),
      title: z.string().describe('Issue title'),
      description: z.string().optional().describe('Issue description'),
      labels: z.array(z.string()).optional().describe('Labels to apply to the issue'),
      assigneeIds: z
        .array(z.number())
        .optional()
        .describe('User IDs to assign to the issue'),
    },
    async (args) => {
      try {
        const client = new GitLabClient(credentials.token, credentials.baseUrl);
        const issue = await client.createIssue(
          args.projectId,
          args.title,
          args.description,
          args.labels,
          args.assigneeIds
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(issue, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to create issue: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'gitlab_list_merge_requests',
    'List merge requests for a project',
    {
      projectId: z.string().describe('Project ID or path'),
      state: z
        .enum(['opened', 'closed', 'merged', 'all'])
        .default('opened')
        .describe('Merge request state filter'),
      limit: z
        .number()
        .default(30)
        .describe('Maximum number of merge requests to return'),
    },
    async (args) => {
      try {
        const client = new GitLabClient(credentials.token, credentials.baseUrl);
        const mergeRequests = await client.listMergeRequests(
          args.projectId,
          args.state,
          args.limit
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(mergeRequests, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to list merge requests: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'gitlab_get_merge_request',
    'Get details of a specific merge request',
    {
      projectId: z.string().describe('Project ID or path'),
      mergeRequestIid: z.number().describe('Merge request IID (internal ID)'),
    },
    async (args) => {
      try {
        const client = new GitLabClient(credentials.token, credentials.baseUrl);
        const mergeRequest = await client.getMergeRequest(
          args.projectId,
          args.mergeRequestIid
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(mergeRequest, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to get merge request: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'gitlab_get_current_user',
    'Get information about the authenticated user',
    {},
    async (_args) => {
      try {
        const client = new GitLabClient(credentials.token, credentials.baseUrl);
        const user = await client.getCurrentUser();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(user, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to get current user: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'gitlab_get_user',
    'Get information about a specific user',
    {
      userId: z.number().describe('User ID'),
    },
    async (args) => {
      try {
        const client = new GitLabClient(credentials.token, credentials.baseUrl);
        const user = await client.getUser(args.userId);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(user, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to get user: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'gitlab_list_files',
    'List files and directories in a project path',
    {
      projectId: z.string().describe('Project ID or path'),
      path: z.string().default('').describe('Path to list (empty for root)'),
      ref: z
        .string()
        .optional()
        .describe('Branch, tag, or commit SHA (default: default branch)'),
    },
    async (args) => {
      try {
        const client = new GitLabClient(credentials.token, credentials.baseUrl);
        const files = await client.listFiles(args.projectId, args.path, args.ref);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(files, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to list files: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'gitlab_get_file_content',
    'Get the content of a file from a project',
    {
      projectId: z.string().describe('Project ID or path'),
      path: z.string().describe('File path'),
      ref: z
        .string()
        .optional()
        .describe('Branch, tag, or commit SHA (default: default branch)'),
    },
    async (args) => {
      try {
        const client = new GitLabClient(credentials.token, credentials.baseUrl);
        const content = await client.getFileContent(
          args.projectId,
          args.path,
          args.ref
        );
        return {
          content: [{
            type: 'text',
            text: content,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to get file content: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  return server;
}

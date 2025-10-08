import { mcpConnectorConfig } from '@stackone/mcp-config-types';
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

  async getProject(projectId: string): Promise<GitLabProject> {
    const response = await fetch(`${this.baseUrl}/projects/${encodeURIComponent(projectId)}`, {
      headers: this.headers,
    });

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
    const response = await fetch(`${this.baseUrl}/projects/${encodeURIComponent(projectId)}/issues`, {
      method: 'POST',
      headers: { ...this.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        labels: labels,
        assignee_ids: assigneeIds,
      }),
    });

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

  async getMergeRequest(projectId: string, mergeRequestIid: number): Promise<GitLabMergeRequest> {
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

  async listFiles(
    projectId: string,
    path = '',
    ref?: string
  ): Promise<GitLabFile[]> {
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

  async getFileContent(
    projectId: string,
    path: string,
    ref?: string
  ): Promise<string> {
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

export const GitLabConnectorConfig = mcpConnectorConfig({
  name: 'GitLab',
  key: 'gitlab',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/gitlab/filled/svg',
  credentials: z.object({
    token: z
      .string()
      .describe(
        'GitLab Personal Access Token'
      ),
    baseUrl: z
      .string()
      .default('https://gitlab.com/api/v4')
      .describe('GitLab API base URL (for self-hosted instances)'),
  }),
  setup: z.object({}),
  examplePrompt:
    'List all open issues in my main project, create a new feature request issue, and check the latest merge requests that need review.',
  tools: (tool) => ({
    GET_PROJECT: tool({
      name: 'gitlab_get_project',
      description: 'Get information about a specific GitLab project',
      schema: z.object({
        projectId: z.string().describe('Project ID or path (e.g., "123" or "group/project")'),
      }),
      handler: async (args, context) => {
        try {
          const { token, baseUrl } = await context.getCredentials();
          const client = new GitLabClient(token, baseUrl);
          const project = await client.getProject(args.projectId);
          return JSON.stringify(project, null, 2);
        } catch (error) {
          return `Failed to get project: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_PROJECTS: tool({
      name: 'gitlab_list_projects',
      description: 'List projects for the authenticated user',
      schema: z.object({
        owned: z.boolean().default(false).describe('Only show owned projects'),
        limit: z
          .number()
          .default(30)
          .describe('Maximum number of projects to return'),
      }),
      handler: async (args, context) => {
        try {
          const { token, baseUrl } = await context.getCredentials();
          const client = new GitLabClient(token, baseUrl);
          const projects = await client.listProjects(args.owned, args.limit);
          return JSON.stringify(projects, null, 2);
        } catch (error) {
          return `Failed to list projects: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_ISSUES: tool({
      name: 'gitlab_list_issues',
      description: 'List issues for a project',
      schema: z.object({
        projectId: z.string().describe('Project ID or path'),
        state: z
          .enum(['opened', 'closed', 'all'])
          .default('opened')
          .describe('Issue state filter'),
        limit: z.number().default(30).describe('Maximum number of issues to return'),
      }),
      handler: async (args, context) => {
        try {
          const { token, baseUrl } = await context.getCredentials();
          const client = new GitLabClient(token, baseUrl);
          const issues = await client.listIssues(
            args.projectId,
            args.state,
            args.limit
          );
          return JSON.stringify(issues, null, 2);
        } catch (error) {
          return `Failed to list issues: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_ISSUE: tool({
      name: 'gitlab_get_issue',
      description: 'Get details of a specific issue',
      schema: z.object({
        projectId: z.string().describe('Project ID or path'),
        issueIid: z.number().describe('Issue IID (internal ID)'),
      }),
      handler: async (args, context) => {
        try {
          const { token, baseUrl } = await context.getCredentials();
          const client = new GitLabClient(token, baseUrl);
          const issue = await client.getIssue(args.projectId, args.issueIid);
          return JSON.stringify(issue, null, 2);
        } catch (error) {
          return `Failed to get issue: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    CREATE_ISSUE: tool({
      name: 'gitlab_create_issue',
      description: 'Create a new issue in a project',
      schema: z.object({
        projectId: z.string().describe('Project ID or path'),
        title: z.string().describe('Issue title'),
        description: z.string().optional().describe('Issue description'),
        labels: z.array(z.string()).optional().describe('Labels to apply to the issue'),
        assigneeIds: z
          .array(z.number())
          .optional()
          .describe('User IDs to assign to the issue'),
      }),
      handler: async (args, context) => {
        try {
          const { token, baseUrl } = await context.getCredentials();
          const client = new GitLabClient(token, baseUrl);
          const issue = await client.createIssue(
            args.projectId,
            args.title,
            args.description,
            args.labels,
            args.assigneeIds
          );
          return JSON.stringify(issue, null, 2);
        } catch (error) {
          return `Failed to create issue: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_MERGE_REQUESTS: tool({
      name: 'gitlab_list_merge_requests',
      description: 'List merge requests for a project',
      schema: z.object({
        projectId: z.string().describe('Project ID or path'),
        state: z
          .enum(['opened', 'closed', 'merged', 'all'])
          .default('opened')
          .describe('Merge request state filter'),
        limit: z
          .number()
          .default(30)
          .describe('Maximum number of merge requests to return'),
      }),
      handler: async (args, context) => {
        try {
          const { token, baseUrl } = await context.getCredentials();
          const client = new GitLabClient(token, baseUrl);
          const mergeRequests = await client.listMergeRequests(
            args.projectId,
            args.state,
            args.limit
          );
          return JSON.stringify(mergeRequests, null, 2);
        } catch (error) {
          return `Failed to list merge requests: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_MERGE_REQUEST: tool({
      name: 'gitlab_get_merge_request',
      description: 'Get details of a specific merge request',
      schema: z.object({
        projectId: z.string().describe('Project ID or path'),
        mergeRequestIid: z.number().describe('Merge request IID (internal ID)'),
      }),
      handler: async (args, context) => {
        try {
          const { token, baseUrl } = await context.getCredentials();
          const client = new GitLabClient(token, baseUrl);
          const mergeRequest = await client.getMergeRequest(
            args.projectId,
            args.mergeRequestIid
          );
          return JSON.stringify(mergeRequest, null, 2);
        } catch (error) {
          return `Failed to get merge request: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_CURRENT_USER: tool({
      name: 'gitlab_get_current_user',
      description: 'Get information about the authenticated user',
      schema: z.object({}),
      handler: async (args, context) => {
        try {
          const { token, baseUrl } = await context.getCredentials();
          const client = new GitLabClient(token, baseUrl);
          const user = await client.getCurrentUser();
          return JSON.stringify(user, null, 2);
        } catch (error) {
          return `Failed to get current user: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_USER: tool({
      name: 'gitlab_get_user',
      description: 'Get information about a specific user',
      schema: z.object({
        userId: z.number().describe('User ID'),
      }),
      handler: async (args, context) => {
        try {
          const { token, baseUrl } = await context.getCredentials();
          const client = new GitLabClient(token, baseUrl);
          const user = await client.getUser(args.userId);
          return JSON.stringify(user, null, 2);
        } catch (error) {
          return `Failed to get user: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_FILES: tool({
      name: 'gitlab_list_files',
      description: 'List files and directories in a project path',
      schema: z.object({
        projectId: z.string().describe('Project ID or path'),
        path: z.string().default('').describe('Path to list (empty for root)'),
        ref: z
          .string()
          .optional()
          .describe('Branch, tag, or commit SHA (default: default branch)'),
      }),
      handler: async (args, context) => {
        try {
          const { token, baseUrl } = await context.getCredentials();
          const client = new GitLabClient(token, baseUrl);
          const files = await client.listFiles(
            args.projectId,
            args.path,
            args.ref
          );
          return JSON.stringify(files, null, 2);
        } catch (error) {
          return `Failed to list files: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_FILE_CONTENT: tool({
      name: 'gitlab_get_file_content',
      description: 'Get the content of a file from a project',
      schema: z.object({
        projectId: z.string().describe('Project ID or path'),
        path: z.string().describe('File path'),
        ref: z
          .string()
          .optional()
          .describe('Branch, tag, or commit SHA (default: default branch)'),
      }),
      handler: async (args, context) => {
        try {
          const { token, baseUrl } = await context.getCredentials();
          const client = new GitLabClient(token, baseUrl);
          const content = await client.getFileContent(
            args.projectId,
            args.path,
            args.ref
          );
          return content;
        } catch (error) {
          return `Failed to get file content: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});
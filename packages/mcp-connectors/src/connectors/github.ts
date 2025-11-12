import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ConnectorMetadata } from '../types/metadata';

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  clone_url: string;
  default_branch: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  created_at: string;
  updated_at: string;
}

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  user: {
    login: string;
    id: number;
    avatar_url: string;
  };
  labels: Array<{
    name: string;
    color: string;
  }>;
  assignees: Array<{
    login: string;
    id: number;
  }>;
  html_url: string;
  created_at: string;
  updated_at: string;
}

interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  user: {
    login: string;
    id: number;
    avatar_url: string;
  };
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  html_url: string;
  created_at: string;
  updated_at: string;
  mergeable: boolean | null;
  merged: boolean;
}

interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  avatar_url: string;
  html_url: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
}

interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: string;
}

class GitHubClient {
  private headers: { Authorization: string; Accept: string; 'User-Agent': string };
  private baseUrl = 'https://api.github.com';

  constructor(token: string) {
    this.headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'MCP-GitHub-Connector/1.0.0',
    };
  }

  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<GitHubRepository>;
  }

  async listRepositories(
    username?: string,
    org?: string,
    limit = 30
  ): Promise<GitHubRepository[]> {
    let url: string;
    if (org) {
      url = `${this.baseUrl}/orgs/${org}/repos?per_page=${limit}`;
    } else if (username) {
      url = `${this.baseUrl}/users/${username}/repos?per_page=${limit}`;
    } else {
      url = `${this.baseUrl}/user/repos?per_page=${limit}`;
    }

    const response = await fetch(url, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<GitHubRepository[]>;
  }

  async listIssues(
    owner: string,
    repo: string,
    state: 'open' | 'closed' | 'all' = 'open',
    limit = 30
  ): Promise<GitHubIssue[]> {
    const response = await fetch(
      `${this.baseUrl}/repos/${owner}/${repo}/issues?state=${state}&per_page=${limit}`,
      {
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<GitHubIssue[]>;
  }

  async getIssue(owner: string, repo: string, issueNumber: number): Promise<GitHubIssue> {
    const response = await fetch(
      `${this.baseUrl}/repos/${owner}/${repo}/issues/${issueNumber}`,
      {
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<GitHubIssue>;
  }

  async createIssue(
    owner: string,
    repo: string,
    title: string,
    body?: string,
    labels?: string[],
    assignees?: string[]
  ): Promise<GitHubIssue> {
    const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        title,
        body,
        labels,
        assignees,
      }),
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<GitHubIssue>;
  }

  async listPullRequests(
    owner: string,
    repo: string,
    state: 'open' | 'closed' | 'all' = 'open',
    limit = 30
  ): Promise<GitHubPullRequest[]> {
    const response = await fetch(
      `${this.baseUrl}/repos/${owner}/${repo}/pulls?state=${state}&per_page=${limit}`,
      {
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<GitHubPullRequest[]>;
  }

  async getPullRequest(
    owner: string,
    repo: string,
    pullNumber: number
  ): Promise<GitHubPullRequest> {
    const response = await fetch(
      `${this.baseUrl}/repos/${owner}/${repo}/pulls/${pullNumber}`,
      {
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<GitHubPullRequest>;
  }

  async getUser(username?: string): Promise<GitHubUser> {
    const url = username ? `${this.baseUrl}/users/${username}` : `${this.baseUrl}/user`;
    const response = await fetch(url, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<GitHubUser>;
  }

  async listFiles(
    owner: string,
    repo: string,
    path = '',
    ref?: string
  ): Promise<GitHubFile[]> {
    let url = `${this.baseUrl}/repos/${owner}/${repo}/contents/${path}`;
    if (ref) {
      url += `?ref=${ref}`;
    }

    const response = await fetch(url, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return Array.isArray(result) ? (result as GitHubFile[]) : [result as GitHubFile];
  }

  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<string> {
    let url = `${this.baseUrl}/repos/${owner}/${repo}/contents/${path}`;
    if (ref) {
      url += `?ref=${ref}`;
    }

    const response = await fetch(url, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { type?: string; content?: string };
    if (result.type === 'file' && result.content) {
      return atob(result.content.replace(/\n/g, ''));
    }

    throw new Error('Not a file or content not available');
  }
}

export const GithubConnectorMetadata = {
  key: 'github',
  name: 'GitHub',
  description: 'Repository and issue management',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/github/filled/svg',
  examplePrompt: 'List my GitHub repositories',
  categories: ['development', 'version-control'],
} as const satisfies ConnectorMetadata;

export interface GitHubCredentials {
  token: string;
}

export function createGitHubServer(credentials: GitHubCredentials): McpServer {
  const server = new McpServer({
    name: 'GitHub',
    version: '1.0.0',
  });

  server.tool(
    'github_get_repository',
    'Get information about a specific GitHub repository',
    {
      owner: z.string().describe('Repository owner (username or organization)'),
      repo: z.string().describe('Repository name'),
    },
    async (args) => {
      try {
        const client = new GitHubClient(credentials.token);
        const repository = await client.getRepository(args.owner, args.repo);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(repository, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get repository: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'github_list_repositories',
    'List repositories for a user, organization, or authenticated user',
    {
      username: z.string().optional().describe('Username to list repositories for'),
      org: z.string().optional().describe('Organization to list repositories for'),
      limit: z.number().default(30).describe('Maximum number of repositories to return'),
    },
    async (args) => {
      try {
        const client = new GitHubClient(credentials.token);
        const repositories = await client.listRepositories(
          args.username,
          args.org,
          args.limit
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(repositories, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to list repositories: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'github_list_issues',
    'List issues for a repository',
    {
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      state: z
        .enum(['open', 'closed', 'all'])
        .default('open')
        .describe('Issue state filter'),
      limit: z.number().default(30).describe('Maximum number of issues to return'),
    },
    async (args) => {
      try {
        const client = new GitHubClient(credentials.token);
        const issues = await client.listIssues(
          args.owner,
          args.repo,
          args.state,
          args.limit
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(issues, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to list issues: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'github_get_issue',
    'Get details of a specific issue',
    {
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      issueNumber: z.number().describe('Issue number'),
    },
    async (args) => {
      try {
        const client = new GitHubClient(credentials.token);
        const issue = await client.getIssue(args.owner, args.repo, args.issueNumber);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(issue, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get issue: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'github_create_issue',
    'Create a new issue in a repository',
    {
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      title: z.string().describe('Issue title'),
      body: z.string().optional().describe('Issue body/description'),
      labels: z.array(z.string()).optional().describe('Labels to apply to the issue'),
      assignees: z
        .array(z.string())
        .optional()
        .describe('Usernames to assign to the issue'),
    },
    async (args) => {
      try {
        const client = new GitHubClient(credentials.token);
        const issue = await client.createIssue(
          args.owner,
          args.repo,
          args.title,
          args.body,
          args.labels,
          args.assignees
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(issue, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to create issue: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'github_list_pull_requests',
    'List pull requests for a repository',
    {
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      state: z
        .enum(['open', 'closed', 'all'])
        .default('open')
        .describe('Pull request state filter'),
      limit: z.number().default(30).describe('Maximum number of pull requests to return'),
    },
    async (args) => {
      try {
        const client = new GitHubClient(credentials.token);
        const pullRequests = await client.listPullRequests(
          args.owner,
          args.repo,
          args.state,
          args.limit
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(pullRequests, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to list pull requests: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'github_get_pull_request',
    'Get details of a specific pull request',
    {
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      pullNumber: z.number().describe('Pull request number'),
    },
    async (args) => {
      try {
        const client = new GitHubClient(credentials.token);
        const pullRequest = await client.getPullRequest(
          args.owner,
          args.repo,
          args.pullNumber
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(pullRequest, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get pull request: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'github_get_user',
    'Get information about a GitHub user',
    {
      username: z
        .string()
        .optional()
        .describe('Username to get info for (omit for authenticated user)'),
    },
    async (args) => {
      try {
        const client = new GitHubClient(credentials.token);
        const user = await client.getUser(args.username);
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
    'github_list_files',
    'List files and directories in a repository path',
    {
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      path: z.string().default('').describe('Path to list (empty for root)'),
      ref: z
        .string()
        .optional()
        .describe('Branch, tag, or commit SHA (default: default branch)'),
    },
    async (args) => {
      try {
        const client = new GitHubClient(credentials.token);
        const files = await client.listFiles(args.owner, args.repo, args.path, args.ref);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(files, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to list files: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'github_get_file_content',
    'Get the content of a file from a repository',
    {
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      path: z.string().describe('File path'),
      ref: z
        .string()
        .optional()
        .describe('Branch, tag, or commit SHA (default: default branch)'),
    },
    async (args) => {
      try {
        const client = new GitHubClient(credentials.token);
        const content = await client.getFileContent(
          args.owner,
          args.repo,
          args.path,
          args.ref
        );
        return {
          content: [
            {
              type: 'text',
              text: content,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get file content: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  return server;
}

import { type Issue, type IssueLabel, LinearClient } from '@linear/sdk';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ConnectorMetadata } from '../types/metadata';

class LinearClientWrapper {
  private client: LinearClient;

  constructor(apiKey: string) {
    this.client = new LinearClient({ apiKey });
  }

  private async getIssueDetails(issue: Issue) {
    const [state, assignee, team] = await Promise.all([
      issue.state,
      issue.assignee,
      issue.team,
    ]);

    return {
      state,
      assignee,
      team,
    };
  }

  private buildSearchFilter(args: {
    query?: string;
    teamId?: string;
    status?: string;
    assigneeId?: string;
    labels?: string[];
    priority?: number;
    estimate?: number;
  }) {
    const filter: Record<string, unknown> = {};

    if (args.query) {
      filter.or = [
        { title: { contains: args.query } },
        { description: { contains: args.query } },
      ];
    }

    if (args.teamId) {
      filter.team = { id: { eq: args.teamId } };
    }

    if (args.status) {
      filter.state = { name: { eq: args.status } };
    }

    if (args.assigneeId) {
      filter.assignee = { id: { eq: args.assigneeId } };
    }

    if (args.labels && args.labels.length > 0) {
      filter.labels = {
        some: {
          name: { in: args.labels },
        },
      };
    }

    if (args.priority) {
      filter.priority = { eq: args.priority };
    }

    if (args.estimate) {
      filter.estimate = { eq: args.estimate };
    }

    return filter;
  }

  async createIssue(
    title: string,
    teamId: string,
    description?: string,
    priority?: number,
    status?: string
  ) {
    const issuePayload = await this.client.createIssue({
      title,
      teamId,
      description,
      priority,
      stateId: status,
    });

    if (!issuePayload) throw new Error('Failed to create issue');

    const issue = await issuePayload.issue;
    if (!issue) throw new Error('Failed to create issue');

    return {
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      url: issue.url,
    };
  }

  async updateIssue(
    id: string,
    title?: string,
    description?: string,
    priority?: number,
    status?: string
  ) {
    const issue = await this.client.issue(id);
    if (!issue) throw new Error(`Issue ${id} not found`);

    const updatePayload = await issue.update({
      title,
      description,
      priority,
      stateId: status,
    });

    const updatedIssue = await updatePayload.issue;
    if (!updatedIssue) throw new Error('Failed to update issue');

    return {
      id: updatedIssue.id,
      identifier: updatedIssue.identifier,
      title: updatedIssue.title,
      url: updatedIssue.url,
    };
  }

  async searchIssues(args: {
    query?: string;
    teamId?: string;
    status?: string;
    assigneeId?: string;
    labels?: string[];
    priority?: number;
    estimate?: number;
    includeArchived?: boolean;
    limit?: number;
  }) {
    const result = await this.client.issues({
      filter: this.buildSearchFilter(args),
      first: args.limit || 10,
      includeArchived: args.includeArchived,
    });

    const issues = [];
    for (const issue of result.nodes) {
      const details = await this.getIssueDetails(issue);
      const labels = await issue.labels();

      issues.push({
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        description: issue.description,
        priority: issue.priority,
        estimate: issue.estimate,
        status: details.state?.name || null,
        assignee: details.assignee?.name || null,
        labels: labels?.nodes?.map((label: IssueLabel) => label.name) || [],
        url: issue.url,
      });
    }

    return issues;
  }

  async getUserIssues(userId?: string, includeArchived?: boolean, limit?: number) {
    const user =
      userId && typeof userId === 'string'
        ? await this.client.user(userId)
        : await this.client.viewer;

    const result = await user.assignedIssues({
      first: limit || 50,
      includeArchived,
    });

    if (!result?.nodes) {
      return [];
    }

    const issues = [];
    for (const issue of result.nodes) {
      const state = await issue.state;
      issues.push({
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        description: issue.description,
        priority: issue.priority,
        stateName: state?.name || 'Unknown',
        url: issue.url,
      });
    }

    return issues;
  }

  async addComment(
    issueId: string,
    body: string,
    createAsUser?: string,
    displayIconUrl?: string
  ) {
    const commentPayload = await this.client.createComment({
      issueId,
      body,
      createAsUser,
      displayIconUrl,
    });

    const comment = await commentPayload.comment;
    if (!comment) throw new Error('Failed to create comment');

    const issue = await comment.issue;

    return {
      commentId: comment.id,
      issueIdentifier: issue?.identifier,
      commentUrl: comment.url,
    };
  }

  async getOrganization() {
    const organization = await this.client.organization;
    const [teams, users] = await Promise.all([
      organization.teams(),
      organization.users(),
    ]);

    return {
      id: organization.id,
      name: organization.name,
      urlKey: organization.urlKey,
      teams: teams.nodes.map((team) => ({
        id: team.id,
        name: team.name,
        key: team.key,
      })),
      users: users.nodes.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        admin: user.admin,
        active: user.active,
      })),
    };
  }

  async getViewer() {
    const viewer = await this.client.viewer;
    const [teams, organization] = await Promise.all([
      viewer.teams(),
      this.client.organization,
    ]);

    return {
      id: viewer.id,
      name: viewer.name,
      email: viewer.email,
      admin: viewer.admin,
      teams: teams.nodes.map((team) => ({
        id: team.id,
        name: team.name,
        key: team.key,
      })),
      organization: {
        id: organization.id,
        name: organization.name,
        urlKey: organization.urlKey,
      },
    };
  }
}

export const LinearCredentialsSchema = z.object({
  apiKey: z.string().describe('API key for authentication'),
});

export type LinearCredentials = z.infer<typeof LinearCredentialsSchema>;

export const LinearConnectorMetadata = {
  key: 'linear',
  name: 'Linear',
  description: 'Issue tracking and project management',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/linear/filled/svg',
  examplePrompt: 'List my Linear issues',
  categories: ['project-management', 'issue-tracking'],
  credentialsSchema: LinearCredentialsSchema,
} as const satisfies ConnectorMetadata;

export function createLinearServer(credentials: LinearCredentials): McpServer {
  const server = new McpServer({
    name: 'Linear',
    version: '1.0.0',
  });

  server.tool(
    'create_issue',
    "Creates a new Linear issue with specified details. Use this to create tickets for tasks, bugs, or feature requests. Returns the created issue's identifier and URL.",
    {
      title: z.string().describe('Issue title'),
      teamId: z.string().describe('Team ID'),
      description: z.string().optional().describe('Issue description'),
      priority: z.number().min(0).max(4).optional().describe('Priority (0-4)'),
      status: z.string().optional().describe('Issue status'),
    },
    async (args) => {
      try {
        const client = new LinearClientWrapper(credentials.apiKey);
        const result = await client.createIssue(
          args.title,
          args.teamId,
          args.description,
          args.priority,
          args.status
        );
        return {
          content: [
            {
              type: 'text',
              text: `Created issue ${result.identifier}: ${result.title}\nURL: ${result.url}`,
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
    'update_issue',
    "Updates an existing Linear issue's properties. Use this to modify issue details like title, description, priority, or status.",
    {
      id: z.string().describe('Issue ID'),
      title: z.string().optional().describe('New title'),
      description: z.string().optional().describe('New description'),
      priority: z.number().min(0).max(4).optional().describe('New priority (0-4)'),
      status: z.string().optional().describe('New status'),
    },
    async (args) => {
      try {
        const client = new LinearClientWrapper(credentials.apiKey);
        const result = await client.updateIssue(
          args.id,
          args.title,
          args.description,
          args.priority,
          args.status
        );
        return {
          content: [
            {
              type: 'text',
              text: `Updated issue ${result.identifier}\nURL: ${result.url}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to update issue: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'search_issues',
    'Searches Linear issues using flexible criteria. Supports filtering by various attributes.',
    {
      query: z
        .string()
        .optional()
        .describe('Optional text to search in title and description'),
      teamId: z.string().optional().describe('Filter by team ID'),
      status: z
        .string()
        .optional()
        .describe("Filter by status name (e.g., 'In Progress', 'Done')"),
      assigneeId: z.string().optional().describe("Filter by assignee's user ID"),
      labels: z.array(z.string()).optional().describe('Filter by label names'),
      priority: z
        .number()
        .optional()
        .describe('Filter by priority (1=urgent, 2=high, 3=normal, 4=low)'),
      estimate: z.number().optional().describe('Filter by estimate points'),
      includeArchived: z
        .boolean()
        .optional()
        .describe('Include archived issues in results (default: false)'),
      limit: z.number().optional().describe('Max results to return (default: 10)'),
    },
    async (args) => {
      try {
        const client = new LinearClientWrapper(credentials.apiKey);
        const issues = await client.searchIssues(args);

        return {
          content: [
            {
              type: 'text',
              text: `Found ${issues.length} issues:\n${issues
                .map(
                  (issue) =>
                    `- ${issue.identifier}: ${issue.title}\n  Priority: ${issue.priority || 'None'}\n  Status: ${issue.status || 'None'}\n  ${issue.url}`
                )
                .join('\n')}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to search issues: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'get_user_issues',
    'Retrieves issues assigned to a specific user or the authenticated user if no userId is provided.',
    {
      userId: z
        .string()
        .optional()
        .describe(
          "Optional user ID. If not provided, returns authenticated user's issues"
        ),
      includeArchived: z
        .boolean()
        .optional()
        .describe('Include archived issues in results'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of issues to return (default: 50)'),
    },
    async (args) => {
      try {
        const client = new LinearClientWrapper(credentials.apiKey);
        const issues = await client.getUserIssues(
          args.userId,
          args.includeArchived,
          args.limit
        );

        if (issues.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No issues found',
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Found ${issues.length} issues:\n${issues
                .map(
                  (issue) =>
                    `- ${issue.identifier}: ${issue.title}\n  Priority: ${issue.priority || 'None'}\n  Status: ${issue.stateName}\n  ${issue.url}`
                )
                .join('\n')}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get user issues: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'add_comment',
    'Adds a comment to an existing Linear issue. Supports markdown formatting in the comment body.',
    {
      issueId: z.string().describe('ID of the issue to comment on'),
      body: z.string().describe('Comment text in markdown format'),
      createAsUser: z
        .string()
        .optional()
        .describe('Optional custom username to show for the comment'),
      displayIconUrl: z
        .string()
        .optional()
        .describe('Optional avatar URL for the comment'),
    },
    async (args) => {
      try {
        const client = new LinearClientWrapper(credentials.apiKey);
        const result = await client.addComment(
          args.issueId,
          args.body,
          args.createAsUser,
          args.displayIconUrl
        );
        return {
          content: [
            {
              type: 'text',
              text: `Added comment to issue ${result.issueIdentifier}\nURL: ${result.commentUrl}`,
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
    'get_organization',
    'Get details about your Linear organization including teams and users',
    {},
    async () => {
      try {
        const client = new LinearClientWrapper(credentials.apiKey);
        const result = await client.getOrganization();
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
              text: `Failed to get organization details: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool('get_viewer', 'Get details about the authenticated user', {}, async () => {
    try {
      const client = new LinearClientWrapper(credentials.apiKey);
      const result = await client.getViewer();
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
            text: `Failed to get viewer details: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  });

  return server;
}

import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface SentryOrganization {
  id: string;
  slug: string;
  name: string;
  dateCreated: string;
  status: {
    id: string;
    name: string;
  };
}

interface SentryProject {
  id: string;
  slug: string;
  name: string;
  platform: string;
  status: string;
  dateCreated: string;
  firstEvent: string | null;
  hasAccess: boolean;
  isBookmarked: boolean;
  isMember: boolean;
}

interface SentryTeam {
  id: string;
  slug: string;
  name: string;
  dateCreated: string;
  isMember: boolean;
  hasAccess: boolean;
  memberCount: number;
}

interface SentryIssue {
  id: string;
  shortId: string;
  title: string;
  culprit: string;
  level: string;
  status: string;
  statusDetails: object;
  count: string;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
  metadata: object;
  project: {
    id: string;
    slug: string;
    name: string;
  };
}

interface SentryEvent {
  id: string;
  eventID: string;
  title: string;
  message: string;
  datetime: string;
  platform: string;
  type: string;
  user: object | null;
  tags: object[];
  contexts: object;
}

interface SentryRelease {
  version: string;
  shortVersion: string;
  dateCreated: string;
  dateReleased: string | null;
  newGroups: number;
  commitCount: number;
  deployCount: number;
  authors: object[];
  projects: object[];
}

interface SentryProjectKey {
  id: string;
  name: string;
  label: string;
  public: string;
  secret: string;
  projectId: string;
  isActive: boolean;
  dateCreated: string;
  dsn: {
    secret: string;
    public: string;
    csp: string;
    security: string;
    minidump: string;
    nel: string;
    unreal: string;
  };
}

class SentryClientWrapper {
  private baseUrl: string;
  private authToken: string;

  constructor(authToken: string, baseUrl = 'https://sentry.io') {
    this.authToken = authToken;
    this.baseUrl = baseUrl;
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/api/0${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.authToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Sentry API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json();
  }

  async listOrganizations(): Promise<SentryOrganization[]> {
    return this.makeRequest<SentryOrganization[]>('/organizations/');
  }

  async getOrganization(orgSlug: string): Promise<SentryOrganization> {
    return this.makeRequest<SentryOrganization>(`/organizations/${orgSlug}/`);
  }

  async listProjects(orgSlug: string): Promise<SentryProject[]> {
    return this.makeRequest<SentryProject[]>(`/organizations/${orgSlug}/projects/`);
  }

  async getProject(orgSlug: string, projectSlug: string): Promise<SentryProject> {
    return this.makeRequest<SentryProject>(`/projects/${orgSlug}/${projectSlug}/`);
  }

  async createProject(
    orgSlug: string,
    name: string,
    slug?: string,
    platform?: string,
    defaultRules = true
  ): Promise<SentryProject> {
    const payload = {
      name,
      slug: slug || name,
      platform: platform || 'other',
      default_rules: defaultRules,
    };

    return this.makeRequest<SentryProject>(`/organizations/${orgSlug}/projects/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async listTeams(orgSlug: string, detailed = false): Promise<SentryTeam[]> {
    const query = detailed ? '?detailed=1' : '';
    return this.makeRequest<SentryTeam[]>(`/organizations/${orgSlug}/teams/${query}`);
  }

  async listIssues(
    orgSlug: string,
    options: {
      projectSlug?: string;
      query?: string;
      statsPeriod?: string;
      limit?: number;
      cursor?: string;
    } = {}
  ): Promise<SentryIssue[]> {
    const params = new URLSearchParams();

    if (options.query) params.set('query', options.query);
    if (options.statsPeriod) params.set('statsPeriod', options.statsPeriod);
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.cursor) params.set('cursor', options.cursor);

    const endpoint = options.projectSlug
      ? `/projects/${orgSlug}/${options.projectSlug}/issues/`
      : `/organizations/${orgSlug}/issues/`;

    const queryString = params.toString();
    return this.makeRequest<SentryIssue[]>(
      `${endpoint}${queryString ? `?${queryString}` : ''}`
    );
  }

  async getIssue(orgSlug: string, issueId: string): Promise<SentryIssue> {
    return this.makeRequest<SentryIssue>(`/organizations/${orgSlug}/issues/${issueId}/`);
  }

  async getIssueEvents(
    orgSlug: string,
    issueId: string,
    options: { limit?: number; cursor?: string } = {}
  ): Promise<SentryEvent[]> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.cursor) params.set('cursor', options.cursor);

    const queryString = params.toString();
    return this.makeRequest<SentryEvent[]>(
      `/organizations/${orgSlug}/issues/${issueId}/events/${queryString ? `?${queryString}` : ''}`
    );
  }

  async searchEvents(
    orgSlug: string,
    options: {
      query?: string;
      field?: string[];
      sort?: string;
      statsPeriod?: string;
      limit?: number;
      cursor?: string;
    } = {}
  ): Promise<{ data: SentryEvent[]; meta: object }> {
    const params = new URLSearchParams();

    if (options.query) params.set('query', options.query);
    if (options.field) {
      for (const field of options.field) {
        params.append('field', field);
      }
    }
    if (options.sort) params.set('sort', options.sort);
    if (options.statsPeriod) params.set('statsPeriod', options.statsPeriod);
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.cursor) params.set('cursor', options.cursor);

    const queryString = params.toString();
    return this.makeRequest<{ data: SentryEvent[]; meta: object }>(
      `/organizations/${orgSlug}/events/${queryString ? `?${queryString}` : ''}`
    );
  }

  async listReleases(
    orgSlug: string,
    projectSlug?: string,
    options: { limit?: number; cursor?: string } = {}
  ): Promise<SentryRelease[]> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.cursor) params.set('cursor', options.cursor);

    const endpoint = projectSlug
      ? `/projects/${orgSlug}/${projectSlug}/releases/`
      : `/organizations/${orgSlug}/releases/`;

    const queryString = params.toString();
    return this.makeRequest<SentryRelease[]>(
      `${endpoint}${queryString ? `?${queryString}` : ''}`
    );
  }

  async listProjectKeys(
    orgSlug: string,
    projectSlug: string
  ): Promise<SentryProjectKey[]> {
    return this.makeRequest<SentryProjectKey[]>(
      `/projects/${orgSlug}/${projectSlug}/keys/`
    );
  }

  async createProjectKey(
    orgSlug: string,
    projectSlug: string,
    name: string
  ): Promise<SentryProjectKey> {
    return this.makeRequest<SentryProjectKey>(
      `/projects/${orgSlug}/${projectSlug}/keys/`,
      {
        method: 'POST',
        body: JSON.stringify({ name }),
      }
    );
  }
}

export const SentryConnectorConfig = mcpConnectorConfig({
  name: 'Sentry',
  key: 'sentry',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/sentry/filled/svg',
  credentials: z.object({
    authToken: z
      .string()
      .describe(
        'Sentry Auth Token from Settings > API :: sntrys_... :: https://sentry.io/orgredirect/organizations/:orgslug/settings/api/'
      ),
    baseUrl: z
      .string()
      .optional()
      .describe('Custom Sentry instance URL (default: https://sentry.io)'),
  }),
  setup: z.object({}),
  description:
    'Sentry is an error monitoring and performance monitoring platform that helps developers identify, triage, and resolve issues in real-time.',
  examplePrompt:
    'List all organizations, get issues from the "my-project" project, create a new project called "web-app", and search for JavaScript errors in the last 24 hours.',
  tools: (tool) => ({
    LIST_ORGANIZATIONS: tool({
      name: 'sentry_list_organizations',
      description: 'List all organizations accessible to your Sentry account.',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { authToken, baseUrl } = await context.getCredentials();
          const client = new SentryClientWrapper(authToken, baseUrl);
          const organizations = await client.listOrganizations();

          return `Found ${organizations.length} organizations:\n${organizations
            .map(
              (org) =>
                `- ${org.name} (${org.slug})\n  ID: ${org.id}\n  Status: ${org.status.name}\n  Created: ${org.dateCreated}`
            )
            .join('\n')}`;
        } catch (error) {
          return `Failed to list organizations: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_ORGANIZATION: tool({
      name: 'sentry_get_organization',
      description: 'Get details about a specific organization.',
      schema: z.object({
        orgSlug: z.string().describe('Organization slug'),
      }),
      handler: async (args, context) => {
        try {
          const { authToken, baseUrl } = await context.getCredentials();
          const client = new SentryClientWrapper(authToken, baseUrl);
          const org = await client.getOrganization(args.orgSlug);

          return JSON.stringify(org, null, 2);
        } catch (error) {
          return `Failed to get organization: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_PROJECTS: tool({
      name: 'sentry_list_projects',
      description: 'List all projects in an organization.',
      schema: z.object({
        orgSlug: z.string().describe('Organization slug'),
      }),
      handler: async (args, context) => {
        try {
          const { authToken, baseUrl } = await context.getCredentials();
          const client = new SentryClientWrapper(authToken, baseUrl);
          const projects = await client.listProjects(args.orgSlug);

          return `Found ${projects.length} projects:\n${projects
            .map(
              (project) =>
                `- ${project.name} (${project.slug})\n  Platform: ${project.platform}\n  Status: ${project.status}\n  Created: ${project.dateCreated}`
            )
            .join('\n')}`;
        } catch (error) {
          return `Failed to list projects: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_PROJECT: tool({
      name: 'sentry_get_project',
      description: 'Get details about a specific project.',
      schema: z.object({
        orgSlug: z.string().describe('Organization slug'),
        projectSlug: z.string().describe('Project slug'),
      }),
      handler: async (args, context) => {
        try {
          const { authToken, baseUrl } = await context.getCredentials();
          const client = new SentryClientWrapper(authToken, baseUrl);
          const project = await client.getProject(args.orgSlug, args.projectSlug);

          return JSON.stringify(project, null, 2);
        } catch (error) {
          return `Failed to get project: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    CREATE_PROJECT: tool({
      name: 'sentry_create_project',
      description: 'Create a new project in an organization.',
      schema: z.object({
        orgSlug: z.string().describe('Organization slug'),
        name: z.string().describe('Project name'),
        slug: z.string().optional().describe('Project slug (defaults to name)'),
        platform: z
          .string()
          .optional()
          .describe('Platform type (e.g., javascript, python, etc.)'),
        defaultRules: z
          .boolean()
          .optional()
          .describe('Create default alert rules (default: true)'),
      }),
      handler: async (args, context) => {
        try {
          const { authToken, baseUrl } = await context.getCredentials();
          const client = new SentryClientWrapper(authToken, baseUrl);
          const project = await client.createProject(
            args.orgSlug,
            args.name,
            args.slug,
            args.platform,
            args.defaultRules
          );

          return `Created project: ${project.name} (${project.slug})\nPlatform: ${project.platform}\nID: ${project.id}`;
        } catch (error) {
          return `Failed to create project: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_TEAMS: tool({
      name: 'sentry_list_teams',
      description: 'List all teams in an organization.',
      schema: z.object({
        orgSlug: z.string().describe('Organization slug'),
        detailed: z
          .boolean()
          .optional()
          .describe('Include detailed information and associated projects'),
      }),
      handler: async (args, context) => {
        try {
          const { authToken, baseUrl } = await context.getCredentials();
          const client = new SentryClientWrapper(authToken, baseUrl);
          const teams = await client.listTeams(args.orgSlug, args.detailed);

          return `Found ${teams.length} teams:\n${teams
            .map(
              (team) =>
                `- ${team.name} (${team.slug})\n  Members: ${team.memberCount}\n  Has Access: ${team.hasAccess}\n  Created: ${team.dateCreated}`
            )
            .join('\n')}`;
        } catch (error) {
          return `Failed to list teams: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_ISSUES: tool({
      name: 'sentry_list_issues',
      description: 'List issues in an organization or project with optional filtering.',
      schema: z.object({
        orgSlug: z.string().describe('Organization slug'),
        projectSlug: z
          .string()
          .optional()
          .describe('Project slug (if omitted, searches all projects)'),
        query: z
          .string()
          .optional()
          .describe('Search query (e.g., "is:unresolved", "level:error")'),
        statsPeriod: z
          .string()
          .optional()
          .describe('Time period for stats (e.g., "24h", "14d")'),
        limit: z
          .number()
          .optional()
          .describe('Maximum number of issues to return (default: 25)'),
        cursor: z.string().optional().describe('Pagination cursor'),
      }),
      handler: async (args, context) => {
        try {
          const { authToken, baseUrl } = await context.getCredentials();
          const client = new SentryClientWrapper(authToken, baseUrl);
          const issues = await client.listIssues(args.orgSlug, {
            projectSlug: args.projectSlug,
            query: args.query,
            statsPeriod: args.statsPeriod,
            limit: args.limit,
            cursor: args.cursor,
          });

          return `Found ${issues.length} issues:\n${issues
            .map(
              (issue) =>
                `- ${issue.shortId}: ${issue.title}\n  Level: ${issue.level}\n  Status: ${issue.status}\n  Count: ${issue.count}\n  Last Seen: ${issue.lastSeen}\n  Project: ${issue.project.name}`
            )
            .join('\n')}`;
        } catch (error) {
          return `Failed to list issues: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_ISSUE: tool({
      name: 'sentry_get_issue',
      description: 'Get detailed information about a specific issue.',
      schema: z.object({
        orgSlug: z.string().describe('Organization slug'),
        issueId: z.string().describe('Issue ID'),
      }),
      handler: async (args, context) => {
        try {
          const { authToken, baseUrl } = await context.getCredentials();
          const client = new SentryClientWrapper(authToken, baseUrl);
          const issue = await client.getIssue(args.orgSlug, args.issueId);

          return JSON.stringify(issue, null, 2);
        } catch (error) {
          return `Failed to get issue: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_ISSUE_EVENTS: tool({
      name: 'sentry_get_issue_events',
      description: 'Get events for a specific issue.',
      schema: z.object({
        orgSlug: z.string().describe('Organization slug'),
        issueId: z.string().describe('Issue ID'),
        limit: z.number().optional().describe('Maximum number of events to return'),
        cursor: z.string().optional().describe('Pagination cursor'),
      }),
      handler: async (args, context) => {
        try {
          const { authToken, baseUrl } = await context.getCredentials();
          const client = new SentryClientWrapper(authToken, baseUrl);
          const events = await client.getIssueEvents(args.orgSlug, args.issueId, {
            limit: args.limit,
            cursor: args.cursor,
          });

          return `Found ${events.length} events for issue ${args.issueId}:\n${events
            .map(
              (event) =>
                `- ${event.eventID}: ${event.title || event.message}\n  Platform: ${event.platform}\n  Type: ${event.type}\n  Time: ${event.datetime}`
            )
            .join('\n')}`;
        } catch (error) {
          return `Failed to get issue events: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    SEARCH_EVENTS: tool({
      name: 'sentry_search_events',
      description: 'Search events across an organization with advanced filtering.',
      schema: z.object({
        orgSlug: z.string().describe('Organization slug'),
        query: z
          .string()
          .optional()
          .describe('Search query (e.g., "event.type:error", "transaction:api/users")'),
        field: z.array(z.string()).optional().describe('Fields to include in response'),
        sort: z.string().optional().describe('Sort order (e.g., "-timestamp")'),
        statsPeriod: z.string().optional().describe('Time period (e.g., "24h", "14d")'),
        limit: z.number().optional().describe('Maximum number of events to return'),
        cursor: z.string().optional().describe('Pagination cursor'),
      }),
      handler: async (args, context) => {
        try {
          const { authToken, baseUrl } = await context.getCredentials();
          const client = new SentryClientWrapper(authToken, baseUrl);
          const result = await client.searchEvents(args.orgSlug, {
            query: args.query,
            field: args.field,
            sort: args.sort,
            statsPeriod: args.statsPeriod,
            limit: args.limit,
            cursor: args.cursor,
          });

          return `Found ${result.data.length} events:\n${result.data
            .map(
              (event) =>
                `- ${event.eventID}: ${event.title || event.message}\n  Platform: ${event.platform}\n  Type: ${event.type}\n  Time: ${event.datetime}`
            )
            .join('\n')}`;
        } catch (error) {
          return `Failed to search events: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_RELEASES: tool({
      name: 'sentry_list_releases',
      description: 'List releases for an organization or project.',
      schema: z.object({
        orgSlug: z.string().describe('Organization slug'),
        projectSlug: z
          .string()
          .optional()
          .describe('Project slug (if omitted, lists all releases)'),
        limit: z.number().optional().describe('Maximum number of releases to return'),
        cursor: z.string().optional().describe('Pagination cursor'),
      }),
      handler: async (args, context) => {
        try {
          const { authToken, baseUrl } = await context.getCredentials();
          const client = new SentryClientWrapper(authToken, baseUrl);
          const releases = await client.listReleases(args.orgSlug, args.projectSlug, {
            limit: args.limit,
            cursor: args.cursor,
          });

          return `Found ${releases.length} releases:\n${releases
            .map(
              (release) =>
                `- ${release.version}\n  Created: ${release.dateCreated}\n  Released: ${release.dateReleased || 'Not released'}\n  Commits: ${release.commitCount}\n  New Issues: ${release.newGroups}`
            )
            .join('\n')}`;
        } catch (error) {
          return `Failed to list releases: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_PROJECT_KEYS: tool({
      name: 'sentry_list_project_keys',
      description: 'List DSN keys for a project.',
      schema: z.object({
        orgSlug: z.string().describe('Organization slug'),
        projectSlug: z.string().describe('Project slug'),
      }),
      handler: async (args, context) => {
        try {
          const { authToken, baseUrl } = await context.getCredentials();
          const client = new SentryClientWrapper(authToken, baseUrl);
          const keys = await client.listProjectKeys(args.orgSlug, args.projectSlug);

          return `Found ${keys.length} project keys:\n${keys
            .map(
              (key) =>
                `- ${key.name} (${key.label})\n  Public Key: ${key.public}\n  Active: ${key.isActive}\n  Created: ${key.dateCreated}\n  DSN: ${key.dsn.public}`
            )
            .join('\n')}`;
        } catch (error) {
          return `Failed to list project keys: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    CREATE_PROJECT_KEY: tool({
      name: 'sentry_create_project_key',
      description: 'Create a new DSN key for a project.',
      schema: z.object({
        orgSlug: z.string().describe('Organization slug'),
        projectSlug: z.string().describe('Project slug'),
        name: z.string().describe('Name for the new key'),
      }),
      handler: async (args, context) => {
        try {
          const { authToken, baseUrl } = await context.getCredentials();
          const client = new SentryClientWrapper(authToken, baseUrl);
          const key = await client.createProjectKey(
            args.orgSlug,
            args.projectSlug,
            args.name
          );

          return `Created project key: ${key.name}\nPublic Key: ${key.public}\nDSN: ${key.dsn.public}`;
        } catch (error) {
          return `Failed to create project key: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

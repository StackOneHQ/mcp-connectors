import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface SonarQubeProject {
  key: string;
  name: string;
  qualifier: string;
  visibility: string;
  lastAnalysisDate?: string;
  revision?: string;
}

interface SonarQubeIssue {
  key: string;
  rule: string;
  severity: string;
  component: string;
  project: string;
  line?: number;
  hash?: string;
  textRange?: {
    startLine: number;
    endLine: number;
    startOffset: number;
    endOffset: number;
  };
  flows: unknown[];
  status: string;
  message: string;
  effort?: string;
  debt?: string;
  author?: string;
  tags: string[];
  creationDate: string;
  updateDate: string;
  type: string;
}

interface SonarQubeMeasure {
  metric: string;
  value?: string;
  periods?: Array<{
    index: number;
    value: string;
  }>;
  bestValue?: boolean;
}

interface SonarQubeComponent {
  key: string;
  name: string;
  qualifier: string;
  measures: SonarQubeMeasure[];
}

interface SonarQubeQualityGate {
  id: string;
  name: string;
  isDefault?: boolean;
}

interface SonarQubeQualityGateStatus {
  projectStatus: {
    status: string;
    conditions: Array<{
      status: string;
      metricKey: string;
      comparator: string;
      periodIndex?: number;
      errorThreshold?: string;
      actualValue?: string;
    }>;
  };
}

class SonarQubeClient {
  private headers: { Authorization: string; Accept: string };
  private baseUrl: string;

  constructor(token: string, serverUrl?: string, _organization?: string) {
    this.headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    };

    // Default to SonarCloud if no server URL provided
    this.baseUrl = serverUrl || 'https://sonarcloud.io';
  }

  private addOrgParam(url: string, organization?: string): string {
    if (organization && this.baseUrl.includes('sonarcloud.io')) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}organization=${organization}`;
    }
    return url;
  }

  async listProjects(organization?: string, limit = 100): Promise<SonarQubeProject[]> {
    let url = `${this.baseUrl}/api/projects/search?ps=${limit}`;
    url = this.addOrgParam(url, organization);

    const response = await fetch(url, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`SonarQube API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { components: SonarQubeProject[] };
    return result.components;
  }

  async getProject(projectKey: string, organization?: string): Promise<SonarQubeProject> {
    let url = `${this.baseUrl}/api/projects/search?projects=${projectKey}`;
    url = this.addOrgParam(url, organization);

    const response = await fetch(url, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`SonarQube API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { components: SonarQubeProject[] };
    if (result.components && result.components.length > 0) {
      return result.components[0] as SonarQubeProject;
    }
    throw new Error(`Project ${projectKey} not found`);
  }

  async searchIssues(
    projectKey: string,
    organization?: string,
    severity?: string,
    types?: string,
    statuses?: string,
    limit = 100
  ): Promise<SonarQubeIssue[]> {
    let url = `${this.baseUrl}/api/issues/search?componentKeys=${projectKey}&ps=${limit}`;

    if (severity) {
      url += `&severities=${severity}`;
    }
    if (types) {
      url += `&types=${types}`;
    }
    if (statuses) {
      url += `&statuses=${statuses}`;
    }

    url = this.addOrgParam(url, organization);

    const response = await fetch(url, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`SonarQube API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { issues: SonarQubeIssue[] };
    return result.issues;
  }

  async getComponentMeasures(
    componentKey: string,
    metrics: string,
    organization?: string
  ): Promise<SonarQubeComponent> {
    let url = `${this.baseUrl}/api/measures/component?component=${componentKey}&metricKeys=${metrics}`;
    url = this.addOrgParam(url, organization);

    const response = await fetch(url, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`SonarQube API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { component: SonarQubeComponent };
    return result.component;
  }

  async getQualityGateStatus(
    projectKey: string,
    organization?: string
  ): Promise<SonarQubeQualityGateStatus> {
    let url = `${this.baseUrl}/api/qualitygates/project_status?projectKey=${projectKey}`;
    url = this.addOrgParam(url, organization);

    const response = await fetch(url, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`SonarQube API error: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as SonarQubeQualityGateStatus;
  }

  async listQualityGates(organization?: string): Promise<SonarQubeQualityGate[]> {
    let url = `${this.baseUrl}/api/qualitygates/list`;
    url = this.addOrgParam(url, organization);

    const response = await fetch(url, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`SonarQube API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { qualitygates: SonarQubeQualityGate[] };
    return result.qualitygates;
  }

  async getSystemHealth(): Promise<{ health: string; causes?: string[] }> {
    const url = `${this.baseUrl}/api/system/health`;

    const response = await fetch(url, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`SonarQube API error: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as { health: string; causes?: string[] };
  }
}

export const SonarQubeConnectorConfig = mcpConnectorConfig({
  name: 'SonarQube Cloud',
  key: 'sonarqube',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/sonarqube/filled/svg',
  credentials: z.object({
    token: z
      .string()
      .describe(
        'SonarQube User Token :: sq_1234567890abcdefghij :: Generate in SonarQube under My Account > Security > Generate Tokens'
      ),
    organization: z
      .string()
      .optional()
      .describe(
        'Organization key (required for SonarCloud) :: my-org-key :: Found in SonarCloud organization settings'
      ),
    serverUrl: z
      .string()
      .optional()
      .describe(
        'SonarQube Server URL (leave empty for SonarCloud) :: https://sonarqube.mycompany.com :: Only needed for on-premise SonarQube'
      ),
  }),
  setup: z.object({}),
  examplePrompt:
    'Show me all critical issues in my main project, get the quality gate status, and provide code coverage metrics.',
  tools: (tool) => ({
    LIST_PROJECTS: tool({
      name: 'sonarqube_list_projects',
      description: 'List all projects available in SonarQube/SonarCloud',
      schema: z.object({
        limit: z
          .number()
          .default(100)
          .describe('Maximum number of projects to return (default: 100)'),
      }),
      handler: async (args, context) => {
        try {
          const { token, organization, serverUrl } = await context.getCredentials();
          const client = new SonarQubeClient(token, serverUrl, organization);
          const projects = await client.listProjects(organization, args.limit);
          return JSON.stringify(projects, null, 2);
        } catch (error) {
          return `Failed to list projects: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_PROJECT: tool({
      name: 'sonarqube_get_project',
      description: 'Get details of a specific project',
      schema: z.object({
        projectKey: z.string().describe('Project key identifier'),
      }),
      handler: async (args, context) => {
        try {
          const { token, organization, serverUrl } = await context.getCredentials();
          const client = new SonarQubeClient(token, serverUrl, organization);
          const project = await client.getProject(args.projectKey, organization);
          return JSON.stringify(project, null, 2);
        } catch (error) {
          return `Failed to get project: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    SEARCH_ISSUES: tool({
      name: 'sonarqube_search_issues',
      description: 'Search for issues in a project with optional filters',
      schema: z.object({
        projectKey: z.string().describe('Project key identifier'),
        severity: z
          .enum(['INFO', 'MINOR', 'MAJOR', 'CRITICAL', 'BLOCKER'])
          .optional()
          .describe('Filter by issue severity'),
        types: z
          .enum(['CODE_SMELL', 'BUG', 'VULNERABILITY', 'SECURITY_HOTSPOT'])
          .optional()
          .describe('Filter by issue type'),
        statuses: z
          .enum(['OPEN', 'CONFIRMED', 'REOPENED', 'RESOLVED', 'CLOSED'])
          .optional()
          .describe('Filter by issue status'),
        limit: z
          .number()
          .default(100)
          .describe('Maximum number of issues to return (default: 100)'),
      }),
      handler: async (args, context) => {
        try {
          const { token, organization, serverUrl } = await context.getCredentials();
          const client = new SonarQubeClient(token, serverUrl, organization);
          const issues = await client.searchIssues(
            args.projectKey,
            organization,
            args.severity,
            args.types,
            args.statuses,
            args.limit
          );
          return JSON.stringify(issues, null, 2);
        } catch (error) {
          return `Failed to search issues: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_MEASURES: tool({
      name: 'sonarqube_get_measures',
      description: 'Get component measures (metrics) for a project',
      schema: z.object({
        componentKey: z.string().describe('Component key (usually same as project key)'),
        metrics: z
          .string()
          .describe(
            'Comma-separated list of metric keys (e.g., "ncloc,bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density")'
          ),
      }),
      handler: async (args, context) => {
        try {
          const { token, organization, serverUrl } = await context.getCredentials();
          const client = new SonarQubeClient(token, serverUrl, organization);
          const component = await client.getComponentMeasures(
            args.componentKey,
            args.metrics,
            organization
          );
          return JSON.stringify(component, null, 2);
        } catch (error) {
          return `Failed to get measures: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_QUALITY_GATE_STATUS: tool({
      name: 'sonarqube_get_quality_gate_status',
      description: 'Get the quality gate status for a project',
      schema: z.object({
        projectKey: z.string().describe('Project key identifier'),
      }),
      handler: async (args, context) => {
        try {
          const { token, organization, serverUrl } = await context.getCredentials();
          const client = new SonarQubeClient(token, serverUrl, organization);
          const status = await client.getQualityGateStatus(args.projectKey, organization);
          return JSON.stringify(status, null, 2);
        } catch (error) {
          return `Failed to get quality gate status: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_QUALITY_GATES: tool({
      name: 'sonarqube_list_quality_gates',
      description: 'List all available quality gates',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { token, organization, serverUrl } = await context.getCredentials();
          const client = new SonarQubeClient(token, serverUrl, organization);
          const qualityGates = await client.listQualityGates(organization);
          return JSON.stringify(qualityGates, null, 2);
        } catch (error) {
          return `Failed to list quality gates: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_SYSTEM_HEALTH: tool({
      name: 'sonarqube_get_system_health',
      description: 'Get the health status of the SonarQube system',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { token, organization, serverUrl } = await context.getCredentials();
          const client = new SonarQubeClient(token, serverUrl, organization);
          const health = await client.getSystemHealth();
          return JSON.stringify(health, null, 2);
        } catch (error) {
          return `Failed to get system health: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

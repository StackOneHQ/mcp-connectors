import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface SupabaseProject {
  id: string;
  name: string;
  status: string;
  database?: {
    host: string;
    version: string;
  };
  api_url: string;
  db_host: string;
  db_port: number;
  db_user: string;
  db_ssl: boolean;
  jwt_secret: string;
  service_api_keys: Array<{
    name: string;
    api_key: string;
  }>;
  auto_api_service_key: string;
  kps_enabled: boolean;
  created_at: string;
  updated_at: string;
  inserted_at: string;
}

interface SupabaseOrganization {
  id: string;
  name: string;
  slug: string;
  billing_email: string;
  project_limit: number;
  created_at: string;
  updated_at: string;
}

interface SupabaseFunction {
  id: string;
  slug: string;
  name: string;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
}

interface SupabaseSecret {
  name: string;
  value?: string;
}

class SupabaseClient {
  private headers: { Authorization: string; Accept: string };
  private baseUrl = 'https://api.supabase.com/v1';

  constructor(accessToken: string) {
    this.headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    };
  }

  async getProjects(): Promise<SupabaseProject[]> {
    const response = await fetch(`${this.baseUrl}/projects`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Supabase API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<SupabaseProject[]>;
  }

  async getProject(projectRef: string): Promise<SupabaseProject> {
    const response = await fetch(`${this.baseUrl}/projects/${projectRef}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Supabase API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<SupabaseProject>;
  }

  async createProject(data: {
    name: string;
    organization_id: string;
    plan: string;
    region: string;
    db_pass: string;
  }): Promise<SupabaseProject> {
    const response = await fetch(`${this.baseUrl}/projects`, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Supabase API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<SupabaseProject>;
  }

  async updateProject(
    projectRef: string,
    data: {
      name?: string;
      db_pass?: string;
    }
  ): Promise<SupabaseProject> {
    const response = await fetch(`${this.baseUrl}/projects/${projectRef}`, {
      method: 'PATCH',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Supabase API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<SupabaseProject>;
  }

  async deleteProject(projectRef: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/projects/${projectRef}`, {
      method: 'DELETE',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Supabase API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<{ message: string }>;
  }

  async getOrganizations(): Promise<SupabaseOrganization[]> {
    const response = await fetch(`${this.baseUrl}/organizations`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Supabase API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<SupabaseOrganization[]>;
  }

  async getFunctions(projectRef: string): Promise<SupabaseFunction[]> {
    const response = await fetch(`${this.baseUrl}/projects/${projectRef}/functions`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Supabase API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<SupabaseFunction[]>;
  }

  async getFunction(projectRef: string, functionSlug: string): Promise<SupabaseFunction> {
    const response = await fetch(
      `${this.baseUrl}/projects/${projectRef}/functions/${functionSlug}`,
      {
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<SupabaseFunction>;
  }

  async createFunction(
    projectRef: string,
    data: {
      slug: string;
      name: string;
      body: string;
      args?: string[];
    }
  ): Promise<SupabaseFunction> {
    const response = await fetch(`${this.baseUrl}/projects/${projectRef}/functions`, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Supabase API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<SupabaseFunction>;
  }

  async updateFunction(
    projectRef: string,
    functionSlug: string,
    data: {
      name?: string;
      body?: string;
      args?: string[];
    }
  ): Promise<SupabaseFunction> {
    const response = await fetch(
      `${this.baseUrl}/projects/${projectRef}/functions/${functionSlug}`,
      {
        method: 'PATCH',
        headers: {
          ...this.headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<SupabaseFunction>;
  }

  async deleteFunction(
    projectRef: string,
    functionSlug: string
  ): Promise<{ message: string }> {
    const response = await fetch(
      `${this.baseUrl}/projects/${projectRef}/functions/${functionSlug}`,
      {
        method: 'DELETE',
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<{ message: string }>;
  }

  async getSecrets(projectRef: string): Promise<SupabaseSecret[]> {
    const response = await fetch(`${this.baseUrl}/projects/${projectRef}/secrets`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Supabase API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<SupabaseSecret[]>;
  }

  async createSecret(
    projectRef: string,
    data: {
      name: string;
      value: string;
    }
  ): Promise<SupabaseSecret> {
    const response = await fetch(`${this.baseUrl}/projects/${projectRef}/secrets`, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Supabase API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<SupabaseSecret>;
  }

  async deleteSecret(
    projectRef: string,
    secretName: string
  ): Promise<{ message: string }> {
    const response = await fetch(
      `${this.baseUrl}/projects/${projectRef}/secrets/${secretName}`,
      {
        method: 'DELETE',
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<{ message: string }>;
  }

  async executeSQL(
    projectRef: string,
    query: string,
    apiKey: string
  ): Promise<{ result: unknown[]; statement_id: number }> {
    const response = await fetch(
      `${this.baseUrl}/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          ...this.headers,
          'Content-Type': 'application/json',
          apikey: apiKey,
        },
        body: JSON.stringify({ query }),
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<{ result: unknown[]; statement_id: number }>;
  }

  async postgrestRequest(
    apiUrl: string,
    apiKey: string,
    method: string,
    path: string,
    params?: Record<string, string>,
    body?: unknown
  ): Promise<unknown> {
    const url = new URL(`${apiUrl}${path}`);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.append(key, value);
      }
    }

    const response = await fetch(url.toString(), {
      method,
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`PostgREST API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

export const SupabaseConnectorConfig = mcpConnectorConfig({
  name: 'Supabase',
  key: 'supabase',
  logo: 'https://stackone-logos.com/api/supabase/filled/svg',
  version: '1.0.0',
  credentials: z.object({
    accessToken: z
      .string()
      .describe(
        'Supabase Personal Access Token from Account Settings > Access Tokens :: sbp_1234567890abcdef1234567890abcdef12345678'
      ),
  }),
  setup: z.object({}),
  examplePrompt:
    'List all my Supabase projects, create a new edge function for user authentication, and execute a SQL query to get recent user activity.',
  tools: (tool) => ({
    LIST_PROJECTS: tool({
      name: 'supabase_list_projects',
      description: 'List all Supabase projects',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new SupabaseClient(accessToken);
          const projects = await client.getProjects();
          return JSON.stringify(projects, null, 2);
        } catch (error) {
          return `Failed to list projects: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_PROJECT: tool({
      name: 'supabase_get_project',
      description: 'Get detailed information about a specific project',
      schema: z.object({
        projectRef: z.string().describe('Project reference ID'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new SupabaseClient(accessToken);
          const project = await client.getProject(args.projectRef);
          return JSON.stringify(project, null, 2);
        } catch (error) {
          return `Failed to get project: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    CREATE_PROJECT: tool({
      name: 'supabase_create_project',
      description: 'Create a new Supabase project',
      schema: z.object({
        name: z.string().describe('Project name'),
        organizationId: z.string().describe('Organization ID'),
        plan: z
          .string()
          .default('free')
          .describe('Plan type (free, pro, team, enterprise)'),
        region: z.string().default('us-east-1').describe('Project region'),
        dbPass: z.string().describe('Database password'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new SupabaseClient(accessToken);
          const project = await client.createProject({
            name: args.name,
            organization_id: args.organizationId,
            plan: args.plan,
            region: args.region,
            db_pass: args.dbPass,
          });
          return JSON.stringify(project, null, 2);
        } catch (error) {
          return `Failed to create project: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    UPDATE_PROJECT: tool({
      name: 'supabase_update_project',
      description: 'Update an existing project',
      schema: z.object({
        projectRef: z.string().describe('Project reference ID'),
        name: z.string().optional().describe('New project name'),
        dbPass: z.string().optional().describe('New database password'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new SupabaseClient(accessToken);
          const project = await client.updateProject(args.projectRef, {
            name: args.name,
            db_pass: args.dbPass,
          });
          return JSON.stringify(project, null, 2);
        } catch (error) {
          return `Failed to update project: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    DELETE_PROJECT: tool({
      name: 'supabase_delete_project',
      description: 'Delete a project',
      schema: z.object({
        projectRef: z.string().describe('Project reference ID'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new SupabaseClient(accessToken);
          const result = await client.deleteProject(args.projectRef);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to delete project: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_ORGANIZATIONS: tool({
      name: 'supabase_list_organizations',
      description: 'List all organizations',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new SupabaseClient(accessToken);
          const organizations = await client.getOrganizations();
          return JSON.stringify(organizations, null, 2);
        } catch (error) {
          return `Failed to list organizations: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_FUNCTIONS: tool({
      name: 'supabase_list_functions',
      description: 'List edge functions for a project',
      schema: z.object({
        projectRef: z.string().describe('Project reference ID'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new SupabaseClient(accessToken);
          const functions = await client.getFunctions(args.projectRef);
          return JSON.stringify(functions, null, 2);
        } catch (error) {
          return `Failed to list functions: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_FUNCTION: tool({
      name: 'supabase_get_function',
      description: 'Get details of a specific edge function',
      schema: z.object({
        projectRef: z.string().describe('Project reference ID'),
        functionSlug: z.string().describe('Function slug'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new SupabaseClient(accessToken);
          const func = await client.getFunction(args.projectRef, args.functionSlug);
          return JSON.stringify(func, null, 2);
        } catch (error) {
          return `Failed to get function: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    CREATE_FUNCTION: tool({
      name: 'supabase_create_function',
      description: 'Create a new edge function',
      schema: z.object({
        projectRef: z.string().describe('Project reference ID'),
        slug: z.string().describe('Function slug'),
        name: z.string().describe('Function name'),
        body: z.string().describe('Function body (TypeScript/JavaScript code)'),
        args: z.array(z.string()).optional().describe('Function arguments'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new SupabaseClient(accessToken);
          const func = await client.createFunction(args.projectRef, {
            slug: args.slug,
            name: args.name,
            body: args.body,
            args: args.args,
          });
          return JSON.stringify(func, null, 2);
        } catch (error) {
          return `Failed to create function: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    UPDATE_FUNCTION: tool({
      name: 'supabase_update_function',
      description: 'Update an existing edge function',
      schema: z.object({
        projectRef: z.string().describe('Project reference ID'),
        functionSlug: z.string().describe('Function slug'),
        name: z.string().optional().describe('Function name'),
        body: z
          .string()
          .optional()
          .describe('Function body (TypeScript/JavaScript code)'),
        args: z.array(z.string()).optional().describe('Function arguments'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new SupabaseClient(accessToken);
          const func = await client.updateFunction(args.projectRef, args.functionSlug, {
            name: args.name,
            body: args.body,
            args: args.args,
          });
          return JSON.stringify(func, null, 2);
        } catch (error) {
          return `Failed to update function: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    DELETE_FUNCTION: tool({
      name: 'supabase_delete_function',
      description: 'Delete an edge function',
      schema: z.object({
        projectRef: z.string().describe('Project reference ID'),
        functionSlug: z.string().describe('Function slug'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new SupabaseClient(accessToken);
          const result = await client.deleteFunction(args.projectRef, args.functionSlug);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to delete function: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_SECRETS: tool({
      name: 'supabase_list_secrets',
      description: 'List project secrets',
      schema: z.object({
        projectRef: z.string().describe('Project reference ID'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new SupabaseClient(accessToken);
          const secrets = await client.getSecrets(args.projectRef);
          return JSON.stringify(secrets, null, 2);
        } catch (error) {
          return `Failed to list secrets: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    CREATE_SECRET: tool({
      name: 'supabase_create_secret',
      description: 'Create a new project secret',
      schema: z.object({
        projectRef: z.string().describe('Project reference ID'),
        name: z.string().describe('Secret name'),
        value: z.string().describe('Secret value'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new SupabaseClient(accessToken);
          const secret = await client.createSecret(args.projectRef, {
            name: args.name,
            value: args.value,
          });
          return JSON.stringify(secret, null, 2);
        } catch (error) {
          return `Failed to create secret: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    DELETE_SECRET: tool({
      name: 'supabase_delete_secret',
      description: 'Delete a project secret',
      schema: z.object({
        projectRef: z.string().describe('Project reference ID'),
        secretName: z.string().describe('Secret name'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new SupabaseClient(accessToken);
          const result = await client.deleteSecret(args.projectRef, args.secretName);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to delete secret: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    EXECUTE_SQL: tool({
      name: 'supabase_execute_sql',
      description: 'Execute SQL query on project database',
      schema: z.object({
        projectRef: z.string().describe('Project reference ID'),
        query: z.string().describe('SQL query to execute'),
        apiKey: z.string().describe('Project API key (anon or service role)'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new SupabaseClient(accessToken);
          const result = await client.executeSQL(
            args.projectRef,
            args.query,
            args.apiKey
          );
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to execute SQL: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    POSTGREST_REQUEST: tool({
      name: 'supabase_postgrest_request',
      description: 'Make a request to the PostgREST API',
      schema: z.object({
        apiUrl: z
          .string()
          .describe('Project API URL (e.g., https://xxx.supabase.co/rest/v1)'),
        apiKey: z.string().describe('Project API key (anon or service role)'),
        method: z.string().describe('HTTP method (GET, POST, PATCH, DELETE)'),
        path: z.string().describe('API path (e.g., /users, /posts)'),
        params: z
          .record(z.string())
          .optional()
          .describe('Query parameters for filtering and pagination'),
        body: z.any().optional().describe('Request body for POST/PATCH requests'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new SupabaseClient(accessToken);
          const result = await client.postgrestRequest(
            args.apiUrl,
            args.apiKey,
            args.method.toUpperCase(),
            args.path,
            args.params,
            args.body
          );
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to make PostgREST request: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

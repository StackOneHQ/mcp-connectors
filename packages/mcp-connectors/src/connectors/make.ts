import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface MakeScenario {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  team_id: number;
  folder_id?: number;
  concept: boolean;
  scheduling: {
    type: 'immediately' | 'cron' | 'every' | 'on-demand';
    interval?: number;
    cron?: string;
  };
  last_edit?: string;
  last_run?: string;
  status: 'active' | 'inactive' | 'draft';
  blueprint?: object;
  settings?: {
    incomplete_execution_policy?: 'break' | 'rollback' | 'ignore';
    sequential_processing?: boolean;
    auto_commit?: boolean;
  };
}

interface MakeOrganization {
  id: number;
  name: string;
  timezone: string;
  plan: string;
}

interface MakeTeam {
  id: number;
  name: string;
  organization_id: number;
}

interface MakeBlueprint {
  flow: Array<{
    id: number;
    module: string;
    version: number;
    parameters: Record<string, unknown>;
    mapper?: Record<string, unknown>;
    metadata?: {
      designer: {
        x: number;
        y: number;
      };
    };
  }>;
  metadata?: {
    version: number;
    scenario: {
      name: string;
      description?: string;
      team_id?: number;
      folder_id?: number;
    };
  };
}

interface MakeScenarioExecution {
  id: number;
  scenario_id: number;
  status: 'success' | 'error' | 'warning' | 'incomplete';
  started_at: string;
  finished_at?: string;
  operations_count?: number;
  data_transfer?: number;
}

class MakeClient {
  private headers: { Authorization: string; Accept: string };
  private baseUrl: string;

  constructor(apiToken: string, region = 'eu1') {
    this.baseUrl = `https://${region}.make.com/api/v2`;
    this.headers = {
      Authorization: `Token ${apiToken}`,
      Accept: 'application/json',
    };
  }

  async getOrganizations(): Promise<MakeOrganization[]> {
    const response = await fetch(`${this.baseUrl}/organizations`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Make.com API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as { organizations?: MakeOrganization[] };
    return result.organizations || [];
  }

  async getTeams(): Promise<MakeTeam[]> {
    const response = await fetch(`${this.baseUrl}/teams`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Make.com API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as { teams?: MakeTeam[] };
    return result.teams || [];
  }

  async getScenarios(teamId?: number, folderId?: number): Promise<MakeScenario[]> {
    const params = new URLSearchParams();
    if (teamId) params.append('team_id', teamId.toString());
    if (folderId) params.append('folder_id', folderId.toString());

    const response = await fetch(`${this.baseUrl}/scenarios?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Make.com API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as { scenarios?: MakeScenario[] };
    return result.scenarios || [];
  }

  async getScenario(scenarioId: number): Promise<MakeScenario> {
    const response = await fetch(`${this.baseUrl}/scenarios/${scenarioId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Make.com API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as { scenario: MakeScenario };
    return result.scenario;
  }

  async getScenarioBlueprint(scenarioId: number): Promise<MakeBlueprint> {
    const response = await fetch(`${this.baseUrl}/scenarios/${scenarioId}/blueprint`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Make.com API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as { blueprint: MakeBlueprint };
    return result.blueprint;
  }

  async createScenario(data: {
    name: string;
    description?: string;
    team_id: number;
    folder_id?: number;
    blueprint?: MakeBlueprint;
    scheduling?: MakeScenario['scheduling'];
    settings?: MakeScenario['settings'];
  }): Promise<MakeScenario> {
    const response = await fetch(`${this.baseUrl}/scenarios`, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scenario: {
          name: data.name,
          description: data.description,
          team_id: data.team_id,
          folder_id: data.folder_id,
          blueprint: data.blueprint,
          scheduling: data.scheduling || { type: 'on-demand' },
          settings: data.settings || {
            incomplete_execution_policy: 'break',
            sequential_processing: true,
            auto_commit: true,
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Make.com API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as { scenario: MakeScenario };
    return result.scenario;
  }

  async updateScenario(
    scenarioId: number,
    data: {
      name?: string;
      description?: string;
      folder_id?: number;
      blueprint?: MakeBlueprint;
      scheduling?: MakeScenario['scheduling'];
      settings?: MakeScenario['settings'];
    }
  ): Promise<MakeScenario> {
    const response = await fetch(`${this.baseUrl}/scenarios/${scenarioId}`, {
      method: 'PATCH',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ scenario: data }),
    });

    if (!response.ok) {
      throw new Error(`Make.com API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as { scenario: MakeScenario };
    return result.scenario;
  }

  async cloneScenario(
    scenarioId: number,
    data: {
      name: string;
      team_id?: number;
      folder_id?: number;
    }
  ): Promise<MakeScenario> {
    const response = await fetch(`${this.baseUrl}/scenarios/${scenarioId}/clone`, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ scenario: data }),
    });

    if (!response.ok) {
      throw new Error(`Make.com API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as { scenario: MakeScenario };
    return result.scenario;
  }

  async runScenario(scenarioId: number): Promise<MakeScenarioExecution> {
    const response = await fetch(`${this.baseUrl}/scenarios/${scenarioId}/run`, {
      method: 'POST',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Make.com API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as { execution: MakeScenarioExecution };
    return result.execution;
  }

  async getScenarioExecutions(
    scenarioId: number,
    limit = 20
  ): Promise<MakeScenarioExecution[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });

    const response = await fetch(
      `${this.baseUrl}/scenarios/${scenarioId}/executions?${params}`,
      {
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(`Make.com API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as { executions?: MakeScenarioExecution[] };
    return result.executions || [];
  }

  async deleteScenario(scenarioId: number): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/scenarios/${scenarioId}`, {
      method: 'DELETE',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Make.com API error: ${response.status} ${response.statusText}`);
    }

    return { success: true };
  }
}

export const MakeConnectorConfig = mcpConnectorConfig({
  name: 'Make.com',
  key: 'make',
  version: '1.0.0',
  logo: 'https://cdn.worldvectorlogo.com/logos/make.svg',
  credentials: z.object({
    apiToken: z
      .string()
      .describe(
        'Make.com API Token from Settings > API Keys :: Create a new API token with appropriate scopes'
      ),
    region: z
      .enum(['eu1', 'eu2', 'us1', 'us2'])
      .default('eu1')
      .describe('Make.com region (eu1, eu2, us1, us2)'),
  }),
  setup: z.object({}),
  examplePrompt:
    'List all my Make scenarios, show me the JSON configuration of a specific scenario, and create a new scenario based on an existing one for automated data processing.',
  tools: (tool) => ({
    LIST_ORGANIZATIONS: tool({
      name: 'make_list_organizations',
      description: 'List all organizations the user has access to',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { apiToken, region } = await context.getCredentials();
          const client = new MakeClient(apiToken, region);
          const organizations = await client.getOrganizations();
          return JSON.stringify(organizations, null, 2);
        } catch (error) {
          return `Failed to list organizations: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_TEAMS: tool({
      name: 'make_list_teams',
      description: 'List all teams the user has access to',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { apiToken, region } = await context.getCredentials();
          const client = new MakeClient(apiToken, region);
          const teams = await client.getTeams();
          return JSON.stringify(teams, null, 2);
        } catch (error) {
          return `Failed to list teams: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_SCENARIOS: tool({
      name: 'make_list_scenarios',
      description: 'List scenarios with optional team and folder filtering',
      schema: z.object({
        teamId: z.number().optional().describe('Team ID to filter scenarios'),
        folderId: z.number().optional().describe('Folder ID to filter scenarios'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken, region } = await context.getCredentials();
          const client = new MakeClient(apiToken, region);
          const scenarios = await client.getScenarios(args.teamId, args.folderId);
          return JSON.stringify(scenarios, null, 2);
        } catch (error) {
          return `Failed to list scenarios: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_SCENARIO: tool({
      name: 'make_get_scenario',
      description: 'Get detailed information about a specific scenario',
      schema: z.object({
        scenarioId: z.number().describe('Scenario ID to retrieve'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken, region } = await context.getCredentials();
          const client = new MakeClient(apiToken, region);
          const scenario = await client.getScenario(args.scenarioId);
          return JSON.stringify(scenario, null, 2);
        } catch (error) {
          return `Failed to get scenario: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_SCENARIO_BLUEPRINT: tool({
      name: 'make_get_scenario_blueprint',
      description: 'Get the JSON blueprint/configuration of a specific scenario',
      schema: z.object({
        scenarioId: z.number().describe('Scenario ID to retrieve blueprint for'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken, region } = await context.getCredentials();
          const client = new MakeClient(apiToken, region);
          const blueprint = await client.getScenarioBlueprint(args.scenarioId);
          return JSON.stringify(blueprint, null, 2);
        } catch (error) {
          return `Failed to get scenario blueprint: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    CREATE_SCENARIO: tool({
      name: 'make_create_scenario',
      description: 'Create a new scenario',
      schema: z.object({
        name: z.string().describe('Scenario name'),
        description: z.string().optional().describe('Scenario description'),
        teamId: z.number().describe('Team ID where the scenario will be created'),
        folderId: z.number().optional().describe('Folder ID (optional)'),
        blueprint: z
          .record(z.unknown())
          .optional()
          .describe('Scenario blueprint/configuration (JSON object)'),
        schedulingType: z
          .enum(['immediately', 'cron', 'every', 'on-demand'])
          .default('on-demand')
          .describe('Scheduling type for the scenario'),
        schedulingInterval: z
          .number()
          .optional()
          .describe('Interval for "every" scheduling type (in minutes)'),
        schedulingCron: z
          .string()
          .optional()
          .describe('Cron expression for "cron" scheduling type'),
        incompleteExecutionPolicy: z
          .enum(['break', 'rollback', 'ignore'])
          .default('break')
          .describe('Policy for handling incomplete executions'),
        sequentialProcessing: z
          .boolean()
          .default(true)
          .describe('Enable sequential processing'),
        autoCommit: z.boolean().default(true).describe('Enable auto-commit'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken, region } = await context.getCredentials();
          const client = new MakeClient(apiToken, region);
          const scenario = await client.createScenario({
            name: args.name,
            description: args.description,
            team_id: args.teamId,
            folder_id: args.folderId,
            blueprint: args.blueprint as MakeBlueprint | undefined,
            scheduling: {
              type: args.schedulingType,
              interval: args.schedulingInterval,
              cron: args.schedulingCron,
            },
            settings: {
              incomplete_execution_policy: args.incompleteExecutionPolicy,
              sequential_processing: args.sequentialProcessing,
              auto_commit: args.autoCommit,
            },
          });
          return JSON.stringify(scenario, null, 2);
        } catch (error) {
          return `Failed to create scenario: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    UPDATE_SCENARIO: tool({
      name: 'make_update_scenario',
      description: 'Update an existing scenario',
      schema: z.object({
        scenarioId: z.number().describe('Scenario ID to update'),
        name: z.string().optional().describe('Scenario name'),
        description: z.string().optional().describe('Scenario description'),
        folderId: z.number().optional().describe('Folder ID'),
        blueprint: z
          .record(z.unknown())
          .optional()
          .describe('Scenario blueprint/configuration (JSON object)'),
        schedulingType: z
          .enum(['immediately', 'cron', 'every', 'on-demand'])
          .optional()
          .describe('Scheduling type for the scenario'),
        schedulingInterval: z
          .number()
          .optional()
          .describe('Interval for "every" scheduling type (in minutes)'),
        schedulingCron: z
          .string()
          .optional()
          .describe('Cron expression for "cron" scheduling type'),
        incompleteExecutionPolicy: z
          .enum(['break', 'rollback', 'ignore'])
          .optional()
          .describe('Policy for handling incomplete executions'),
        sequentialProcessing: z
          .boolean()
          .optional()
          .describe('Enable sequential processing'),
        autoCommit: z.boolean().optional().describe('Enable auto-commit'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken, region } = await context.getCredentials();
          const client = new MakeClient(apiToken, region);

          const updateData: Parameters<typeof client.updateScenario>[1] = {
            name: args.name,
            description: args.description,
            folder_id: args.folderId,
            blueprint: args.blueprint as MakeBlueprint | undefined,
          };

          if (args.schedulingType) {
            updateData.scheduling = {
              type: args.schedulingType,
              interval: args.schedulingInterval,
              cron: args.schedulingCron,
            };
          }

          if (
            args.incompleteExecutionPolicy !== undefined ||
            args.sequentialProcessing !== undefined ||
            args.autoCommit !== undefined
          ) {
            updateData.settings = {
              incomplete_execution_policy: args.incompleteExecutionPolicy,
              sequential_processing: args.sequentialProcessing,
              auto_commit: args.autoCommit,
            };
          }

          const scenario = await client.updateScenario(args.scenarioId, updateData);
          return JSON.stringify(scenario, null, 2);
        } catch (error) {
          return `Failed to update scenario: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    CLONE_SCENARIO: tool({
      name: 'make_clone_scenario',
      description: 'Clone an existing scenario to create a new one based on it',
      schema: z.object({
        scenarioId: z.number().describe('Scenario ID to clone'),
        name: z.string().describe('Name for the new cloned scenario'),
        teamId: z.number().optional().describe('Team ID for the cloned scenario'),
        folderId: z.number().optional().describe('Folder ID for the cloned scenario'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken, region } = await context.getCredentials();
          const client = new MakeClient(apiToken, region);
          const scenario = await client.cloneScenario(args.scenarioId, {
            name: args.name,
            team_id: args.teamId,
            folder_id: args.folderId,
          });
          return JSON.stringify(scenario, null, 2);
        } catch (error) {
          return `Failed to clone scenario: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    RUN_SCENARIO: tool({
      name: 'make_run_scenario',
      description: 'Execute a scenario immediately',
      schema: z.object({
        scenarioId: z.number().describe('Scenario ID to execute'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken, region } = await context.getCredentials();
          const client = new MakeClient(apiToken, region);
          const execution = await client.runScenario(args.scenarioId);
          return JSON.stringify(execution, null, 2);
        } catch (error) {
          return `Failed to run scenario: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_SCENARIO_EXECUTIONS: tool({
      name: 'make_get_scenario_executions',
      description: 'Get execution history for a scenario',
      schema: z.object({
        scenarioId: z.number().describe('Scenario ID to get executions for'),
        limit: z.number().default(20).describe('Maximum number of executions to return'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken, region } = await context.getCredentials();
          const client = new MakeClient(apiToken, region);
          const executions = await client.getScenarioExecutions(
            args.scenarioId,
            args.limit
          );
          return JSON.stringify(executions, null, 2);
        } catch (error) {
          return `Failed to get scenario executions: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    DELETE_SCENARIO: tool({
      name: 'make_delete_scenario',
      description: 'Delete a scenario',
      schema: z.object({
        scenarioId: z.number().describe('Scenario ID to delete'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken, region } = await context.getCredentials();
          const client = new MakeClient(apiToken, region);
          const result = await client.deleteScenario(args.scenarioId);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to delete scenario: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

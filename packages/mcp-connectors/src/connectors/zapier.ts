import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface ZapierAction {
  id: string;
  app: string;
  label: string;
  noun: string;
  description?: string;
  important: boolean;
  premium: boolean;
}

interface ZapierActionsResponse {
  actions: ZapierAction[];
}

interface ZapierExecuteResponse {
  status: string;
  attempt: string;
  id: string;
  request_id: string;
  results?: unknown[];
  errors?: string[];
}

interface ZapierActionDetailsResponse {
  id: string;
  app: string;
  label: string;
  noun: string;
  description?: string;
  important: boolean;
  premium: boolean;
  input_fields: Array<{
    key: string;
    label: string;
    type: string;
    required: boolean;
    helpText?: string;
  }>;
}

class ZapierClient {
  private headers: { Authorization: string; 'Content-Type': string };
  private baseUrl = 'https://nla.zapier.com/api/v1';

  constructor(apiKey: string) {
    this.headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async listActions(): Promise<ZapierActionsResponse> {
    const response = await fetch(`${this.baseUrl}/exposed/`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to list actions: ${response.statusText}`);
    }

    return response.json() as Promise<ZapierActionsResponse>;
  }

  async searchActions(query: string): Promise<ZapierActionsResponse> {
    const params = new URLSearchParams({ q: query });
    const response = await fetch(`${this.baseUrl}/exposed/?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to search actions: ${response.statusText}`);
    }

    return response.json() as Promise<ZapierActionsResponse>;
  }

  async executeAction(
    actionId: string,
    parameters: Record<string, unknown>
  ): Promise<ZapierExecuteResponse> {
    const response = await fetch(`${this.baseUrl}/exposed/${actionId}/execute/`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(parameters),
    });

    if (!response.ok) {
      throw new Error(`Failed to execute action: ${response.statusText}`);
    }

    return response.json() as Promise<ZapierExecuteResponse>;
  }

  async getActionDetails(actionId: string): Promise<ZapierActionDetailsResponse> {
    const response = await fetch(`${this.baseUrl}/exposed/${actionId}/`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to get action details: ${response.statusText}`);
    }

    return response.json() as Promise<ZapierActionDetailsResponse>;
  }
}

export const ZapierConnectorConfig = mcpConnectorConfig({
  name: 'Zapier',
  key: 'zapier',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/zapier/filled/svg',
  credentials: z.object({
    apiKey: z
      .string()
      .describe(
        'Zapier API Key from your Zapier account :: sk-xxx :: https://nla.zapier.com/'
      ),
  }),
  setup: z.object({}),
  examplePrompt:
    'List all available Zapier actions, execute a Gmail send email action, or search for Slack actions.',
  tools: (tool) => ({
    LIST_ACTIONS: tool({
      name: 'zapier_list_actions',
      description: 'List all available Zapier actions for the authenticated user',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new ZapierClient(apiKey);
          const response = await client.listActions();
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to list actions: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    SEARCH_ACTIONS: tool({
      name: 'zapier_search_actions',
      description: 'Search for Zapier actions by app name or keywords',
      schema: z.object({
        query: z.string().describe('Search query for actions (app name, keywords, etc.)'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new ZapierClient(apiKey);
          const response = await client.searchActions(args.query);
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to search actions: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    EXECUTE_ACTION: tool({
      name: 'zapier_execute_action',
      description: 'Execute a specific Zapier action with provided parameters',
      schema: z.object({
        action_id: z.string().describe('The ID of the action to execute'),
        parameters: z.record(z.unknown()).describe('Parameters to pass to the action'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new ZapierClient(apiKey);
          const response = await client.executeAction(args.action_id, args.parameters);
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to execute action: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_ACTION_DETAILS: tool({
      name: 'zapier_get_action_details',
      description:
        'Get detailed information about a specific Zapier action including input fields',
      schema: z.object({
        action_id: z.string().describe('The ID of the action to get details for'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new ZapierClient(apiKey);
          const response = await client.getActionDetails(args.action_id);
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to get action details: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

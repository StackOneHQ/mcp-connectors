import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ConnectorMetadata } from '../types/metadata';

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

export const ZapierConnectorMetadata = {
  key: 'zapier',
  name: 'Zapier',
  description: 'Automation platform',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/zapier/filled/svg',
  examplePrompt: 'Trigger Zapier zaps',
  categories: ['automation', 'integration'],
} as const satisfies ConnectorMetadata;

export interface ZapierCredentials {
  apiKey: string;
}

export function createZapierServer(credentials: ZapierCredentials): McpServer {
  const server = new McpServer({
    name: 'Zapier',
    version: '1.0.0',
  });

  server.tool(
    'zapier_list_actions',
    'List all available Zapier actions for the authenticated user',
    {},
    async (_args) => {
      try {
        const client = new ZapierClient(credentials.apiKey);
        const response = await client.listActions();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to list actions: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'zapier_search_actions',
    'Search for Zapier actions by app name or keywords',
    {
      query: z.string().describe('Search query for actions (app name, keywords, etc.)'),
    },
    async (args) => {
      try {
        const client = new ZapierClient(credentials.apiKey);
        const response = await client.searchActions(args.query);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to search actions: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'zapier_execute_action',
    'Execute a specific Zapier action with provided parameters',
    {
      action_id: z.string().describe('The ID of the action to execute'),
      parameters: z.record(z.unknown()).describe('Parameters to pass to the action'),
    },
    async (args) => {
      try {
        const client = new ZapierClient(credentials.apiKey);
        const response = await client.executeAction(args.action_id, args.parameters);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to execute action: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'zapier_get_action_details',
    'Get detailed information about a specific Zapier action including input fields',
    {
      action_id: z.string().describe('The ID of the action to get details for'),
    },
    async (args) => {
      try {
        const client = new ZapierClient(credentials.apiKey);
        const response = await client.getActionDetails(args.action_id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get action details: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  return server;
}

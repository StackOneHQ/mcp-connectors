import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface AttioList {
  id: {
    workspace_id: string;
    list_id: string;
  };
  name: string;
  parent_object: string;
  created_at: string;
  attributes?: Record<string, unknown>;
}

interface AttioListEntry {
  id: {
    workspace_id: string;
    list_id: string;
    entry_id: string;
  };
  parent_record_id: string;
  created_at: string;
  values: Record<string, unknown>;
}

interface AttioListDetails {
  id: {
    workspace_id: string;
    list_id: string;
  };
  name: string;
  parent_object: string;
  created_at: string;
  attributes: Array<{
    id: string;
    name: string;
    type: string;
    config?: Record<string, unknown>;
  }>;
}

class AttioClient {
  private headers: { Authorization: string; Accept: string; 'Content-Type': string };
  private baseUrl = 'https://api.attio.com/v2';

  constructor(apiKey: string) {
    this.headers = {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  async getFilteredLists(keyword = 'customer_success'): Promise<AttioList[]> {
    const response = await fetch(`${this.baseUrl}/lists`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Attio API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: AttioList[] };
    const allLists = result.data || [];

    // Filter lists by keyword to avoid context overflow
    const filteredLists = allLists.filter((list) =>
      list.name.toLowerCase().includes(keyword.toLowerCase())
    );

    return filteredLists;
  }

  async getListDetails(listSlug: string): Promise<AttioListDetails> {
    const response = await fetch(`${this.baseUrl}/lists/${listSlug}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Attio API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: AttioListDetails };
    return result.data;
  }

  async getListEntries(listSlug: string, limit = 50): Promise<AttioListEntry[]> {
    const body: Record<string, unknown> = { limit };

    const response = await fetch(`${this.baseUrl}/lists/${listSlug}/entries/query`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Attio API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: AttioListEntry[] };
    return result.data || [];
  }
}

export const AttioConnectorConfig = mcpConnectorConfig({
  name: 'Attio',
  key: 'attio',
  logo: 'https://stackone-logos.com/api/attio/filled/svg',
  version: '2.0.0',
  credentials: z.object({
    apiKey: z
      .string()
      .describe(
        'Attio API Key from Workspace settings > Developers tab > New access token. :: sk_live_1234567890abcdefghijklmnopqrstuvwxyz :: https://attio.com/help/apps/other-apps/generating-an-api-key'
      ),
  }),
  setup: z.object({}),
  examplePrompt: 'Get all my lists on Attio',
  tools: (tool) => ({
    GET_LIST: tool({
      name: 'attio_get_list',
      description:
        'Get lists filtered by keyword to avoid context overflow. Defaults to customer_success list.',
      schema: z.object({
        keyword: z
          .string()
          .default('customer_success')
          .describe('Keyword to filter lists by (e.g., "customer_success", "sales")'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new AttioClient(apiKey);
          const lists = await client.getFilteredLists(args.keyword);

          if (lists.length === 0) {
            return `No lists found matching keyword: "${args.keyword}"`;
          }

          // Return basic info to avoid context overflow
          const listSummary = lists.map((list) => ({
            id: list.id,
            name: list.name,
            parent_object: list.parent_object,
            created_at: list.created_at,
          }));

          return JSON.stringify(
            {
              keyword_used: args.keyword,
              total_matches: lists.length,
              lists: listSummary,
            },
            null,
            2
          );
        } catch (error) {
          return `Failed to get filtered lists: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_LIST_FIELDS: tool({
      name: 'attio_get_list_fields',
      description: 'Get all fields or attributes within a specific list',
      schema: z.object({
        listSlug: z.string().describe('List slug or ID (e.g., "customer_success_list")'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new AttioClient(apiKey);
          const listDetails = await client.getListDetails(args.listSlug);

          // Return structured field information
          const fieldInfo = {
            list_id: listDetails.id,
            list_name: listDetails.name,
            parent_object: listDetails.parent_object,
            attributes: listDetails.attributes || [],
            created_at: listDetails.created_at,
          };

          return JSON.stringify(fieldInfo, null, 2);
        } catch (error) {
          return `Failed to get list fields: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_LIST_ENTRIES: tool({
      name: 'attio_get_list_entries',
      description:
        'Get all entries found within a specific list, with limited results to avoid context overflow',
      schema: z.object({
        listSlug: z.string().describe('List slug or ID'),
        limit: z
          .number()
          .default(50)
          .describe(
            'Maximum number of entries to return (default 50 to avoid context overflow)'
          ),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new AttioClient(apiKey);
          const entries = await client.getListEntries(args.listSlug, args.limit);

          if (entries.length === 0) {
            return `No entries found in list: "${args.listSlug}"`;
          }

          // Return summarized entry information to avoid context overflow
          const entrySummary = entries.map((entry) => ({
            id: entry.id,
            parent_record_id: entry.parent_record_id,
            created_at: entry.created_at,
            values: entry.values,
          }));

          return JSON.stringify(
            {
              list_slug: args.listSlug,
              total_entries: entries.length,
              limit_applied: args.limit,
              entries: entrySummary,
            },
            null,
            2
          );
        } catch (error) {
          return `Failed to get list entries: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

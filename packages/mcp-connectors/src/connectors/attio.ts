import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
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

export interface AttioCredentials {
  apiKey: string;
}

export function createAttioServer(credentials: AttioCredentials): McpServer {
  const server = new McpServer({
    name: 'Attio',
    version: '2.0.0',
  });

  server.tool(
    'attio_get_list',
    'Get lists filtered by keyword to avoid context overflow. Defaults to customer_success list.',
    {
      keyword: z
        .string()
        .default('customer_success')
        .describe('Keyword to filter lists by (e.g., "customer_success", "sales")'),
    },
    async (args) => {
      try {
        const client = new AttioClient(credentials.apiKey);
        const lists = await client.getFilteredLists(args.keyword);

        if (lists.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No lists found matching keyword: "${args.keyword}"`,
              },
            ],
          };
        }

        // Return basic info to avoid context overflow
        const listSummary = lists.map((list) => ({
          id: list.id,
          name: list.name,
          parent_object: list.parent_object,
          created_at: list.created_at,
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  keyword_used: args.keyword,
                  total_matches: lists.length,
                  lists: listSummary,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get filtered lists: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'attio_get_list_fields',
    'Get all fields or attributes within a specific list',
    {
      listSlug: z.string().describe('List slug or ID (e.g., "customer_success_list")'),
    },
    async (args) => {
      try {
        const client = new AttioClient(credentials.apiKey);
        const listDetails = await client.getListDetails(args.listSlug);

        // Return structured field information
        const fieldInfo = {
          list_id: listDetails.id,
          list_name: listDetails.name,
          parent_object: listDetails.parent_object,
          attributes: listDetails.attributes || [],
          created_at: listDetails.created_at,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(fieldInfo, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get list fields: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'attio_get_list_entries',
    'Get all entries found within a specific list, with limited results to avoid context overflow',
    {
      listSlug: z.string().describe('List slug or ID'),
      limit: z
        .number()
        .default(50)
        .describe(
          'Maximum number of entries to return (default 50 to avoid context overflow)'
        ),
    },
    async (args) => {
      try {
        const client = new AttioClient(credentials.apiKey);
        const entries = await client.getListEntries(args.listSlug, args.limit);

        if (entries.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No entries found in list: "${args.listSlug}"`,
              },
            ],
          };
        }

        // Return summarized entry information to avoid context overflow
        const entrySummary = entries.map((entry) => ({
          id: entry.id,
          parent_record_id: entry.parent_record_id,
          created_at: entry.created_at,
          values: entry.values,
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  list_slug: args.listSlug,
                  total_entries: entries.length,
                  limit_applied: args.limit,
                  entries: entrySummary,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get list entries: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  return server;
}

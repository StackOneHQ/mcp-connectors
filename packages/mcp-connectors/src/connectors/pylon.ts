import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

// String similarity utility functions
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = Array.from({ length: str2.length + 1 }, (_, i) =>
    Array.from({ length: str1.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      const row = matrix[i];
      const prevRow = matrix[i - 1];
      if (row && prevRow) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          row[j] = prevRow[j - 1] ?? 0;
        } else {
          row[j] = Math.min(
            (prevRow[j - 1] ?? 0) + 1, // substitution
            (row[j - 1] ?? 0) + 1, // insertion
            (prevRow[j] ?? 0) + 1 // deletion
          );
        }
      }
    }
  }

  return matrix[str2.length]?.[str1.length] ?? 0;
}

function jaccardSimilarity(str1: string, str2: string): number {
  const set1 = new Set(str1.toLowerCase().split(/\s+/));
  const set2 = new Set(str2.toLowerCase().split(/\s+/));

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

function stringSimilarity(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;

  const levDistance = levenshteinDistance(str1, str2);
  const levSimilarity = 1 - levDistance / maxLen;

  const jaccardSim = jaccardSimilarity(str1, str2);

  // Combine both metrics with equal weight
  return (levSimilarity + jaccardSim) / 2;
}

interface PylonIssue {
  id: string;
  number: number;
  title: string;
  link: string;
  body_html: string;
  state: string;
  account: { id: string };
  assignee?: { id: string } | null;
  requester?: { id: string } | null;
  team?: { id: string } | null;
  tags?: string[] | null;
  custom_fields?: Record<string, unknown>;
  first_response_time?: string | null;
  resolution_time?: string | null;
  latest_message_time?: string | null;
  created_at: string;
  customer_portal_visible?: boolean;
  source?: string;
  slack?: { message_ts: string; channel_id: string } | null;
  type?: string;
  first_response_seconds?: number;
  business_hours_first_response_seconds?: number;
  number_of_touches?: number;
}

interface PylonAccount {
  id: string;
  name: string;
  email?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
  status?: string;
}

interface PylonSearchResult {
  data: PylonIssue[];
  pagination?: {
    cursor?: string;
    has_more: boolean;
    total?: number;
  };
}

interface PylonAccountListResult {
  data: PylonAccount[];
  pagination?: {
    cursor?: string;
    has_more: boolean;
    total?: number;
  };
}

interface PylonMessage {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    email?: string;
    type: 'user' | 'agent';
  };
  created_at: string;
  updated_at: string;
  type: 'message' | 'note' | 'system';
}

interface PylonMessageListResult {
  data: PylonMessage[];
  pagination?: {
    cursor?: string;
    has_more: boolean;
    total?: number;
  };
}

interface PylonIssueWithMessages extends PylonIssue {
  messages?: PylonMessage[];
}

class PylonClient {
  private headers: { Authorization: string; Accept: string };
  private baseUrl = 'https://api.usepylon.com';

  constructor(apiToken: string) {
    this.headers = {
      Authorization: `Bearer ${apiToken}`,
      Accept: '*/*',
    };
  }

  async getIssue(
    issueId: string,
    includeMessages = false
  ): Promise<PylonIssue | PylonIssueWithMessages> {
    const response = await fetch(`${this.baseUrl}/issues/${issueId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Pylon issue: ${response.status} ${response.statusText}`
      );
    }

    const issue: PylonIssue = (await response.json()) as PylonIssue;

    if (includeMessages) {
      const messages = await this.getIssueMessages(issueId);
      return {
        ...issue,
        messages: messages.data,
      };
    }

    return issue;
  }

  async getIssueMessages(issueId: string): Promise<PylonMessageListResult> {
    const response = await fetch(`${this.baseUrl}/issues/${issueId}/messages`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Pylon issue messages: ${response.status} ${response.statusText}`
      );
    }

    return (await response.json()) as PylonMessageListResult;
  }

  async searchAccounts(
    query?: string,
    limit = 3,
    cursor?: string
  ): Promise<PylonAccountListResult> {
    // First fetch all accounts (or a larger set for searching)
    const queryParams = new URLSearchParams();
    if (cursor) queryParams.append('cursor', cursor);
    // Fetch more accounts to search through, but limit final results
    queryParams.append('limit', '100');

    const response = await fetch(`${this.baseUrl}/accounts?${queryParams.toString()}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to search Pylon accounts: ${response.status} ${response.statusText}`
      );
    }

    const result: PylonAccountListResult =
      (await response.json()) as PylonAccountListResult;

    if (!query) {
      // If no query, return first 'limit' accounts
      result.data = result.data.slice(0, limit);
      return result;
    }

    // Filter and rank accounts by name similarity
    const scoredAccounts = result.data
      .map((account) => ({
        account,
        score: stringSimilarity(query.toLowerCase(), account.name.toLowerCase()),
      }))
      .filter((item) => item.score > 0.3) // Minimum similarity threshold
      .sort((a, b) => b.score - a.score) // Sort by similarity score
      .slice(0, limit) // Take top results
      .map((item) => item.account);

    return {
      ...result,
      data: scoredAccounts,
    };
  }

  async searchIssues(accountId: string, limit = 20): Promise<PylonSearchResult> {
    const filter = {
      field: 'account_id',
      operator: 'equals',
      value: accountId,
    };

    const response = await fetch(`${this.baseUrl}/issues/search`, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter,
        limit,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to search Pylon issues: ${response.status} ${response.statusText}`
      );
    }

    return (await response.json()) as PylonSearchResult;
  }

  async listIssues(limit = 20, cursor?: string): Promise<PylonSearchResult> {
    const body: { limit: number; cursor?: string } = { limit };
    if (cursor) {
      body.cursor = cursor;
    }

    const response = await fetch(`${this.baseUrl}/issues/search`, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to list Pylon issues: ${response.status} ${response.statusText}`
      );
    }

    return (await response.json()) as PylonSearchResult;
  }
}

export const PylonConnectorConfig = mcpConnectorConfig({
  name: 'Pylon',
  key: 'pylon',
  version: '1.0.0',
  credentials: z.object({
    apiToken: z
      .string()
      .describe('Pylon API Token :: pyl_1234567890abcdefghijklmnopqrstuvwxyz'),
  }),
  logo: 'https://stackone-logos.com/api/pylon/filled/svg',
  setup: z.object({}),
  examplePrompt:
    'Search for accounts matching "Acme Corp", list all issues for that account, and get detailed information including messages for issue #123.',
  tools: (tool) => ({
    GET_ISSUE: tool({
      name: 'pylon_get_issue',
      description:
        'Get a Pylon issue by its ID, optionally including all messages within the issue',
      schema: z.object({
        issueId: z.string().describe('The ID of the Pylon issue to retrieve'),
        includeMessages: z
          .boolean()
          .optional()
          .default(false)
          .describe('Whether to include all messages within the issue (default: false)'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new PylonClient(apiToken);
          const issue = await client.getIssue(args.issueId, args.includeMessages);
          return JSON.stringify(issue, null, 2);
        } catch (error) {
          throw new Error(
            `Error getting Pylon issue: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      },
    }),
    SEARCH_ACCOUNTS: tool({
      name: 'pylon_search_accounts',
      description:
        'Search Pylon accounts by name using fuzzy matching. Returns top matching accounts.',
      schema: z.object({
        query: z
          .string()
          .optional()
          .describe('Search query to match against account names (fuzzy search)'),
        limit: z
          .number()
          .default(3)
          .optional()
          .describe('The number of accounts to return (default: 3)'),
        cursor: z.string().optional().describe('The cursor to use for pagination'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new PylonClient(apiToken);
          const accounts = await client.searchAccounts(
            args.query,
            args.limit,
            args.cursor
          );
          return JSON.stringify(accounts, null, 2);
        } catch (error) {
          throw new Error(
            `Error searching Pylon accounts: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      },
    }),
    SEARCH_ISSUES: tool({
      name: 'pylon_search_issues',
      description: 'Search Pylon issues by account ID',
      schema: z.object({
        accountId: z.string().describe('Filter issues by account ID'),
        limit: z
          .number()
          .default(20)
          .optional()
          .describe('Maximum number of issues to return (default: 20)'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new PylonClient(apiToken);
          const issues = await client.searchIssues(args.accountId, args.limit);
          return JSON.stringify(issues, null, 2);
        } catch (error) {
          throw new Error(
            `Error searching Pylon issues: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      },
    }),
    LIST_ISSUES: tool({
      name: 'pylon_list_issues',
      description: 'List all Pylon issues with optional pagination',
      schema: z.object({
        limit: z
          .number()
          .default(20)
          .optional()
          .describe('Maximum number of issues to return (default: 20)'),
        cursor: z.string().optional().describe('Cursor for pagination'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new PylonClient(apiToken);
          const issues = await client.listIssues(args.limit, args.cursor);
          return JSON.stringify(issues, null, 2);
        } catch (error) {
          throw new Error(
            `Error listing Pylon issues: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      },
    }),
  }),
});

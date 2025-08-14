import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

// Jira API types
interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  active?: boolean;
  self?: string;
}

interface JiraStatus {
  id: string;
  name: string;
  description?: string;
  statusCategory?: {
    id: number;
    key: string;
    name: string;
  };
  self?: string;
}

interface JiraTransition {
  id: string;
  name: string;
  to: {
    id: string;
    name: string;
    statusCategory?: {
      id: number;
      key: string;
      name: string;
    };
  };
}

interface JiraRawComment {
  id: string;
  body: {
    type?: string;
    version?: number;
    content?: AdfNode[];
  };
  author?: {
    accountId?: string;
    displayName?: string;
  };
  created: string;
  updated: string;
  self?: string;
}

interface JiraIssueFields {
  summary?: string;
  description?: {
    type?: string;
    version?: number;
    content?: AdfNode[];
  };
  status?: JiraStatus;
  creator?: JiraUser;
  reporter?: JiraUser;
  assignee?: JiraUser;
  created?: string;
  updated?: string;
  parent?: JiraRawIssue;
  subtasks?: JiraRawIssue[];
  issuelinks?: JiraIssueLink[];
  customfield_10014?: string; // Epic Link field
  [key: string]: unknown; // For custom fields
}

interface JiraIssueLink {
  id: string;
  type: {
    id: string;
    name: string;
    inward: string;
    outward: string;
  };
  inwardIssue?: JiraRawIssue;
  outwardIssue?: JiraRawIssue;
  self?: string;
}

interface JiraRawIssue {
  id: string;
  key: string;
  fields?: JiraIssueFields;
  self?: string;
}

interface JiraRawIssueResponse {
  expand?: string;
  startAt?: number;
  maxResults?: number;
  total: number;
  issues: JiraRawIssue[];
}

interface JiraErrorResponse {
  errorMessages?: string[];
  errors?: Record<string, string>;
  message?: string;
  errorMessage?: string;
  status?: number;
}

interface CleanComment {
  id: string;
  body: string;
  author: string | undefined;
  created: string;
  updated: string;
  mentions: Array<{
    key: string;
    type: 'mention' | 'link';
    source: 'description' | 'comment';
    commentId?: string;
  }>;
}

interface CleanJiraIssue {
  id: string;
  key: string;
  summary: string | undefined;
  status: string | undefined;
  created: string | undefined;
  updated: string | undefined;
  description: string;
  comments?: CleanComment[];
  parent?: {
    id: string;
    key: string;
    summary?: string;
  };
  children?: {
    id: string;
    key: string;
    summary?: string;
  }[];
  epicLink?: {
    id: string;
    key: string;
    summary?: string;
  };
  relatedIssues: {
    key: string;
    summary?: string;
    type: 'mention' | 'link';
    relationship?: string; // For formal issue links e.g. "blocks", "relates to"
    source: 'description' | 'comment';
    commentId?: string;
  }[];
}

interface SearchIssuesResponse {
  total: number;
  issues: CleanJiraIssue[];
}

// Basic Atlassian Document Format (ADF) structure for a simple paragraph
interface AdfDoc {
  version: 1;
  type: 'doc';
  content: AdfNode[];
}

type AdfNodeType = 'paragraph' | 'text' | 'inlineCard'; // Add other types as needed

interface AdfNode {
  type: AdfNodeType;
  content?: AdfNode[];
  text?: string;
  attrs?: {
    url?: string;
    [key: string]: unknown;
  };
}

class JiraClient {
  private baseUrl: string;
  private email: string;
  private apiToken: string;

  constructor(baseUrl: string, email: string, apiToken: string) {
    this.baseUrl = baseUrl;
    this.email = email;
    this.apiToken = apiToken;
  }

  private getHeaders(): Headers {
    const auth = btoa(`${this.email}:${this.apiToken}`);
    return new Headers({
      Authorization: `Basic ${auth}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    });
  }

  // Helper to handle fetch response errors
  private async handleFetchError(response: Response): Promise<never> {
    let message = response.statusText;
    let errorData: JiraErrorResponse = {};

    try {
      errorData = (await response.json()) as JiraErrorResponse;
      if (Array.isArray(errorData.errorMessages) && errorData.errorMessages.length > 0) {
        message = errorData.errorMessages.join('; ');
      } else if (errorData.message) {
        message = errorData.message;
      } else if (errorData.errorMessage) {
        message = errorData.errorMessage;
      }
    } catch (_e) {
      // Ignore JSON parsing errors if the body is not JSON or empty
      console.log('Could not parse Jira error response body as JSON');
    }

    const details = JSON.stringify(errorData, null, 2);
    console.log('Jira API Error Details:', details);

    throw new Error(`Jira API Error: ${message} (Status: ${response.status})`);
  }

  // Helper to fetch JSON from the Jira API
  private async fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const headers = this.getHeaders();

    const response = await fetch(this.baseUrl + url, {
      ...init,
      headers,
    });

    if (!response.ok) {
      await this.handleFetchError(response);
    }

    return response.json() as Promise<T>;
  }

  // Extracts text content from Atlassian Document Format nodes
  private extractTextContent(content: AdfNode[]): string {
    if (!Array.isArray(content)) return '';

    return content
      .map((node) => {
        if (node.type === 'text') {
          return node.text || '';
        }
        if (node.content) {
          return this.extractTextContent(node.content);
        }
        return '';
      })
      .join('');
  }

  // Extracts issue mentions from Atlassian document content
  private extractIssueMentions(
    content: AdfNode[],
    source: 'description' | 'comment',
    commentId?: string
  ): CleanJiraIssue['relatedIssues'] {
    const mentions: NonNullable<CleanJiraIssue['relatedIssues']> = [];

    // Recursively process content nodes
    const processNode = (node: AdfNode) => {
      // Check for inlineCard nodes (auto-converted issue mentions)
      if (node.type === 'inlineCard' && node.attrs?.url) {
        const match = node.attrs.url.match(/\/browse\/([A-Z]+-\d+)/);
        if (match) {
          mentions.push({
            key: match[1] as string,
            type: 'mention',
            source,
            commentId,
          });
        }
      }

      // Check for text nodes that might contain issue keys
      if (node.type === 'text' && node.text) {
        const matches = node.text.match(/[A-Z]+-\d+/g) || [];
        for (const key of matches) {
          mentions.push({
            key,
            type: 'mention',
            source,
            commentId,
          });
        }
      }

      // Process child nodes
      if (node.content) {
        node.content.forEach(processNode);
      }
    };

    content.forEach(processNode);
    return [...new Map(mentions.map((m) => [m.key, m])).values()]; // Remove duplicates
  }

  // Clean comment data
  private cleanComment(comment: JiraRawComment): CleanComment {
    const body = comment.body?.content
      ? this.extractTextContent(comment.body.content)
      : '';
    const mentions = comment.body?.content
      ? this.extractIssueMentions(comment.body.content, 'comment', comment.id)
      : [];

    return {
      id: comment.id,
      body,
      author: comment.author?.displayName,
      created: comment.created,
      updated: comment.updated,
      mentions: mentions,
    };
  }

  // Clean issue data
  private cleanIssue(issue: JiraRawIssue): CleanJiraIssue {
    const description = issue.fields?.description?.content
      ? this.extractTextContent(issue.fields.description.content)
      : '';

    const cleanedIssue: CleanJiraIssue = {
      id: issue.id,
      key: issue.key,
      summary: issue.fields?.summary,
      status: issue.fields?.status?.name,
      created: issue.fields?.created,
      updated: issue.fields?.updated,
      description,
      relatedIssues: [],
    };

    // Extract mentions from description
    if (issue.fields?.description?.content) {
      const mentions = this.extractIssueMentions(
        issue.fields.description.content,
        'description'
      );
      if (mentions.length > 0) {
        cleanedIssue.relatedIssues = mentions;
      }
    }

    // Add formal issue links if they exist
    if (issue.fields?.issuelinks && issue.fields.issuelinks.length > 0) {
      const links = issue.fields.issuelinks.map((link: JiraIssueLink) => {
        const linkedIssue = link.inwardIssue || link.outwardIssue;
        const relationship = link.type.inward || link.type.outward;
        return {
          key: linkedIssue?.key || '',
          summary: linkedIssue?.fields?.summary,
          type: 'link' as const,
          relationship,
          source: 'description' as const,
        };
      });

      cleanedIssue.relatedIssues = [...(cleanedIssue.relatedIssues || []), ...links];
    }

    // Add parent if exists
    if (issue.fields?.parent) {
      cleanedIssue.parent = {
        id: issue.fields.parent.id,
        key: issue.fields.parent.key,
        summary: issue.fields.parent.fields?.summary,
      };
    }

    // Add epic link if exists
    if (issue.fields?.customfield_10014) {
      // Epic Link field
      cleanedIssue.epicLink = {
        id: issue.fields.customfield_10014,
        key: issue.fields.customfield_10014,
        summary: undefined, // We'll need a separate request to get epic details
      };
    }

    // Add subtasks if exist
    if (issue.fields?.subtasks && issue.fields.subtasks.length > 0) {
      cleanedIssue.children = issue.fields.subtasks.map((subtask: JiraRawIssue) => ({
        id: subtask.id,
        key: subtask.key,
        summary: subtask.fields?.summary,
      }));
    }

    return cleanedIssue;
  }

  // Create Atlassian Document Format from plain text
  private createAdfFromBody(text: string): AdfDoc {
    return {
      version: 1,
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: text,
            },
          ],
        },
      ],
    };
  }

  // Search issues
  async searchIssues(searchString: string): Promise<SearchIssuesResponse> {
    const params = new URLSearchParams({
      jql: searchString,
      maxResults: '50',
      fields: [
        'id',
        'key',
        'summary',
        'description',
        'status',
        'created',
        'updated',
        'parent',
        'subtasks',
        'customfield_10014', // Epic Link field
        'issuelinks', // For formal issue links
      ].join(','),
      expand: 'names,renderedFields',
    });

    const data = await this.fetchJson<JiraRawIssueResponse>(
      `/rest/api/3/search?${params}`
    );

    return {
      total: data.total,
      issues: data.issues.map((issue: JiraRawIssue) => this.cleanIssue(issue)),
    };
  }

  // Get epic children
  async getEpicChildren(epicKey: string): Promise<CleanJiraIssue[]> {
    const params = new URLSearchParams({
      jql: `"Epic Link" = ${epicKey}`,
      maxResults: '100',
      fields: [
        'id',
        'key',
        'summary',
        'description',
        'status',
        'created',
        'updated',
        'parent',
        'subtasks',
        'customfield_10014', // Epic Link field
        'issuelinks', // For formal issue links
      ].join(','),
      expand: 'names,renderedFields',
    });

    const data = await this.fetchJson<JiraRawIssueResponse>(
      `/rest/api/3/search?${params}`
    );

    // Get comments for each child issue
    const issuesWithComments = await Promise.all(
      data.issues.map(async (issue: JiraRawIssue) => {
        const commentsData = await this.fetchJson<{ comments: JiraRawComment[] }>(
          `/rest/api/3/issue/${issue.key}/comment`
        );
        const cleanedIssue = this.cleanIssue(issue);
        const comments = commentsData.comments.map((comment: JiraRawComment) =>
          this.cleanComment(comment)
        );

        // Add comment mentions to related issues
        const commentMentions = comments.flatMap(
          (comment: CleanComment) => comment.mentions
        );
        cleanedIssue.relatedIssues = [...cleanedIssue.relatedIssues, ...commentMentions];

        cleanedIssue.comments = comments;
        return cleanedIssue;
      })
    );

    return issuesWithComments;
  }

  // Get issue with comments
  async getIssueWithComments(issueId: string): Promise<CleanJiraIssue> {
    const params = new URLSearchParams({
      fields: [
        'id',
        'key',
        'summary',
        'description',
        'status',
        'created',
        'updated',
        'parent',
        'subtasks',
        'customfield_10014', // Epic Link field
        'issuelinks', // For formal issue links
      ].join(','),
      expand: 'names,renderedFields',
    });

    let issueData: JiraRawIssue;
    let commentsData: { comments: JiraRawComment[] };

    try {
      [issueData, commentsData] = await Promise.all([
        this.fetchJson<JiraRawIssue>(`/rest/api/3/issue/${issueId}?${params}`),
        this.fetchJson<{ comments: JiraRawComment[] }>(
          `/rest/api/3/issue/${issueId}/comment`
        ),
      ]);
    } catch (error: unknown) {
      // Check if the error is the specific 404 for the main issue fetch
      if (error instanceof Error && error.message.includes('(Status: 404)')) {
        throw new Error(`Issue not found: ${issueId}`);
      }
      // Re-throw other errors
      throw error;
    }

    const issue = this.cleanIssue(issueData);
    const comments = commentsData.comments.map((comment: JiraRawComment) =>
      this.cleanComment(comment)
    );

    // Add comment mentions to related issues
    const commentMentions = comments.flatMap((comment: CleanComment) => comment.mentions);
    issue.relatedIssues = [...issue.relatedIssues, ...commentMentions];

    issue.comments = comments;

    // If there's an epic link, fetch its details
    if (issue.epicLink) {
      try {
        const epicData = await this.fetchJson<JiraRawIssue>(
          `/rest/api/3/issue/${issue.epicLink.key}?fields=summary`
        );
        issue.epicLink.summary = epicData.fields?.summary;
      } catch (error) {
        console.log('Failed to fetch epic details:', error);
      }
    }

    return issue;
  }

  // Create issue
  async createIssue(
    projectKey: string,
    issueType: string,
    summary: string,
    description?: string,
    fields?: Record<string, unknown>
  ): Promise<{ id: string; key: string }> {
    const payload = {
      fields: {
        project: {
          key: projectKey,
        },
        summary,
        issuetype: {
          name: issueType,
        },
        ...(description && { description: this.createAdfFromBody(description) }),
        ...fields,
      },
    };

    return this.fetchJson<{ id: string; key: string }>('/rest/api/3/issue', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Update issue
  async updateIssue(issueKey: string, fields: Record<string, unknown>): Promise<void> {
    await this.fetchJson(`/rest/api/3/issue/${issueKey}`, {
      method: 'PUT',
      body: JSON.stringify({ fields }),
    });
  }

  // Get transitions
  async getTransitions(issueKey: string): Promise<Array<JiraTransition>> {
    const data = await this.fetchJson<{ transitions: JiraTransition[] }>(
      `/rest/api/3/issue/${issueKey}/transitions`
    );
    return data.transitions;
  }

  // Transition issue
  async transitionIssue(
    issueKey: string,
    transitionId: string,
    comment?: string
  ): Promise<void> {
    const payload: Record<string, unknown> = {
      transition: { id: transitionId },
    };

    if (comment) {
      payload.update = {
        comment: [
          {
            add: {
              body: this.createAdfFromBody(comment),
            },
          },
        ],
      };
    }

    await this.fetchJson(`/rest/api/3/issue/${issueKey}/transitions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Add attachment
  async addAttachment(
    issueKey: string,
    fileContent: string, // Base64 encoded
    filename: string
  ): Promise<{ id: string; filename: string }> {
    const file = Buffer.from(fileContent, 'base64');
    const formData = new FormData();
    formData.append('file', new Blob([file]), filename);

    const headers = new Headers(this.getHeaders());
    headers.delete('Content-Type'); // Let the browser set the correct content type for FormData
    headers.set('X-Atlassian-Token', 'no-check'); // Required for file uploads

    const response = await fetch(
      `${this.baseUrl}/rest/api/3/issue/${issueKey}/attachments`,
      {
        method: 'POST',
        headers,
        body: formData,
      }
    );

    if (!response.ok) {
      await this.handleFetchError(response);
    }

    const data = (await response.json()) as Array<{ id: string; filename: string }>;
    // JIRA returns an array with one item for single file upload
    const attachment = data[0];
    return {
      id: attachment?.id as string,
      filename: attachment?.filename as string,
    };
  }

  // Add comment
  async addComment(
    issueIdOrKey: string,
    body: string
  ): Promise<{
    id: string;
    author: string;
    created: string;
    updated: string;
    body: string;
  }> {
    const adfBody = this.createAdfFromBody(body);

    const payload = {
      body: adfBody,
    };

    type CommentResponse = {
      id: string;
      author: { displayName: string };
      created: string;
      updated: string;
      body: { content: AdfNode[] };
    };

    const response = await this.fetchJson<CommentResponse>(
      `/rest/api/3/issue/${issueIdOrKey}/comment`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    // Clean the response
    return {
      id: response.id,
      author: response.author.displayName,
      created: response.created,
      updated: response.updated,
      body: this.extractTextContent(response.body.content), // Extract plain text from returned ADF
    };
  }
}

export const JiraConnectorConfig = mcpConnectorConfig({
  name: 'Jira',
  key: 'jira',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/jira/filled/svg',
  credentials: z.object({
    baseUrl: z
      .string()
      .describe('The Jira API base URL :: https://your-domain.atlassian.net'),
    email: z
      .string()
      .describe('The email address associated with the API token :: user@example.com'),
    apiToken: z
      .string()
      .describe(
        'The Jira API token from Account Settings > Security > API tokens :: ATATT3xFfGF01234567890abcdefghijklmnop'
      ),
  }),
  setup: z.object({}),
  examplePrompt:
    'Search for all open bugs in project "PROJ", create a new story for implementing user authentication, and add a comment to ticket PROJ-123.',
  tools: (tool) => ({
    SEARCH_ISSUES: tool({
      name: 'jira_search_issues',
      description: 'Search JIRA issues using JQL (Jira Query Language)',
      schema: z.object({
        searchString: z.string().describe('JQL search string'),
      }),
      handler: async (args, context) => {
        try {
          const { baseUrl, email, apiToken } = await context.getCredentials();
          const client = new JiraClient(baseUrl, email, apiToken);
          const result = await client.searchIssues(args.searchString);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to search issues: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_EPIC_CHILDREN: tool({
      name: 'jira_get_epic_children',
      description: 'Get all child issues in an epic including their comments',
      schema: z.object({
        epicKey: z.string().describe('The key of the epic issue'),
      }),
      handler: async (args, context) => {
        try {
          const { baseUrl, email, apiToken } = await context.getCredentials();
          const client = new JiraClient(baseUrl, email, apiToken);
          const result = await client.getEpicChildren(args.epicKey);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to get epic children: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_ISSUE: tool({
      name: 'jira_get_issue',
      description:
        'Get detailed information about a specific JIRA issue including comments',
      schema: z.object({
        issueId: z.string().describe('The ID or key of the JIRA issue'),
      }),
      handler: async (args, context) => {
        try {
          const { baseUrl, email, apiToken } = await context.getCredentials();
          const client = new JiraClient(baseUrl, email, apiToken);
          const result = await client.getIssueWithComments(args.issueId);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to get issue: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    CREATE_ISSUE: tool({
      name: 'jira_create_issue',
      description: 'Create a new JIRA issue',
      schema: z.object({
        projectKey: z
          .string()
          .describe('The project key where the issue will be created'),
        issueType: z
          .string()
          .describe('The type of issue to create (e.g., "Bug", "Story", "Task")'),
        summary: z.string().describe('The issue summary/title'),
        description: z.string().optional().describe('The issue description'),
        fields: z
          .record(z.any())
          .optional()
          .describe('Additional fields to set on the issue'),
      }),
      handler: async (args, context) => {
        try {
          const { baseUrl, email, apiToken } = await context.getCredentials();
          const client = new JiraClient(baseUrl, email, apiToken);
          const result = await client.createIssue(
            args.projectKey,
            args.issueType,
            args.summary,
            args.description,
            args.fields
          );
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to create issue: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    UPDATE_ISSUE: tool({
      name: 'jira_update_issue',
      description: 'Update an existing JIRA issue',
      schema: z.object({
        issueKey: z.string().describe('The key of the issue to update'),
        fields: z.record(z.any()).describe('Fields to update on the issue'),
      }),
      handler: async (args, context) => {
        try {
          const { baseUrl, email, apiToken } = await context.getCredentials();
          const client = new JiraClient(baseUrl, email, apiToken);
          await client.updateIssue(args.issueKey, args.fields);
          return JSON.stringify(
            { message: `Issue ${args.issueKey} updated successfully` },
            null,
            2
          );
        } catch (error) {
          return `Failed to update issue: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_TRANSITIONS: tool({
      name: 'jira_get_transitions',
      description: 'Get available status transitions for a JIRA issue',
      schema: z.object({
        issueKey: z.string().describe('The key of the issue to get transitions for'),
      }),
      handler: async (args, context) => {
        try {
          const { baseUrl, email, apiToken } = await context.getCredentials();
          const client = new JiraClient(baseUrl, email, apiToken);
          const result = await client.getTransitions(args.issueKey);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to get transitions: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    TRANSITION_ISSUE: tool({
      name: 'jira_transition_issue',
      description: 'Transition a JIRA issue to a new status',
      schema: z.object({
        issueKey: z.string().describe('The key of the issue to transition'),
        transitionId: z.string().describe('The ID of the transition to perform'),
        comment: z
          .string()
          .optional()
          .describe('Optional comment to add with the transition'),
      }),
      handler: async (args, context) => {
        try {
          const { baseUrl, email, apiToken } = await context.getCredentials();
          const client = new JiraClient(baseUrl, email, apiToken);
          await client.transitionIssue(args.issueKey, args.transitionId, args.comment);
          return JSON.stringify(
            {
              message: `Issue ${args.issueKey} transitioned successfully${args.comment ? ' with comment' : ''}`,
            },
            null,
            2
          );
        } catch (error) {
          return `Failed to transition issue: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    ADD_ATTACHMENT: tool({
      name: 'jira_add_attachment',
      description: 'Add a file attachment to a JIRA issue',
      schema: z.object({
        issueKey: z.string().describe('The key of the issue to add attachment to'),
        fileContent: z.string().describe('Base64 encoded content of the file'),
        filename: z.string().describe('Name of the file to be attached'),
      }),
      handler: async (args, context) => {
        try {
          const { baseUrl, email, apiToken } = await context.getCredentials();
          const client = new JiraClient(baseUrl, email, apiToken);
          const result = await client.addAttachment(
            args.issueKey,
            args.fileContent,
            args.filename
          );
          return JSON.stringify(
            {
              message: `File ${args.filename} attached successfully to issue ${args.issueKey}`,
              attachmentId: result.id,
              filename: result.filename,
            },
            null,
            2
          );
        } catch (error) {
          return `Failed to add attachment: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    ADD_COMMENT: tool({
      name: 'jira_add_comment',
      description: 'Add a comment to a JIRA issue',
      schema: z.object({
        issueIdOrKey: z
          .string()
          .describe('The ID or key of the issue to add the comment to'),
        body: z.string().describe('The content of the comment (plain text)'),
      }),
      handler: async (args, context) => {
        try {
          const { baseUrl, email, apiToken } = await context.getCredentials();
          const client = new JiraClient(baseUrl, email, apiToken);
          const result = await client.addComment(args.issueIdOrKey, args.body);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to add comment: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

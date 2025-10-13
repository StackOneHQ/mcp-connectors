import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const NOTION_API_VERSION = '2022-06-28';
const NOTION_API_BASE = 'https://api.notion.com/v1';

const notionRequest = async (
  path: string,
  token: string,
  method = 'GET',
  body?: unknown
) => {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Notion-Version': NOTION_API_VERSION,
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${NOTION_API_BASE}${path}`, options);

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

    try {
      const errorJson = JSON.parse(errorBody);
      if (errorJson.message) {
        errorMessage = errorJson.message;
      }
      if (errorJson.code) {
        errorMessage = `[${errorJson.code}] ${errorMessage}`;
      }
    } catch {
      if (errorBody) {
        errorMessage += ` - ${errorBody}`;
      }
    }

    throw new Error(errorMessage);
  }

  return response.json();
};

const handleNotionError = (error: unknown): string => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('unauthorized') || message.includes('401')) {
      return 'Error: Unauthorized. Please check your Notion integration token and permissions.';
    }
    if (message.includes('not found') || message.includes('404')) {
      return 'Error: Resource not found. Please check the ID and ensure your integration has access to it.';
    }
    if (message.includes('restricted') || message.includes('403')) {
      return "Error: Access restricted. Your integration doesn't have permission to access this resource.";
    }
    if (message.includes('rate') || message.includes('429')) {
      return 'Error: Rate limited. Please wait before making more requests.';
    }
    if (message.includes('validation') || message.includes('400')) {
      return `Error: Invalid request. ${error.message}`;
    }
    if (message.includes('conflict') || message.includes('409')) {
      return "Error: Conflict. The resource you're trying to create already exists or conflicts with existing data.";
    }
    if (message.includes('server error') || message.includes('500')) {
      return 'Error: Internal server error. Please try again later.';
    }
    if (message.includes('service unavailable') || message.includes('503')) {
      return 'Error: Service unavailable. Please try again later.';
    }

    return `Error: ${error.message}`;
  }

  return `Error: ${String(error)}`;
};

export interface NotionCredentials {
  token: string;
}

export function createNotionServer(credentials: NotionCredentials): McpServer {
  const server = new McpServer({
    name: 'Notion',
    version: '1.0.0',
  });

  server.tool(
    'notion_get_me',
    'Get the authenticated user',
    {},
    async () => {
      try {
        const response = await notionRequest('/users/me', credentials.token);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: handleNotionError(error),
          }],
        };
      }
    }
  );

  server.tool(
    'notion_list_users',
    'List all users in the Notion workspace',
    {
      page_size: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of users to return (max 100)'),
      start_cursor: z.string().optional().describe('Cursor for pagination'),
    },
    async (args) => {
      try {
        const params = new URLSearchParams();
        if (args.page_size) params.append('page_size', args.page_size.toString());
        if (args.start_cursor) params.append('start_cursor', args.start_cursor);

        const queryString = params.toString();
        const path = queryString ? `/users?${queryString}` : '/users';
        const response = await notionRequest(path, credentials.token);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: handleNotionError(error),
          }],
        };
      }
    }
  );

  server.tool(
    'notion_get_page',
    'Retrieve a Notion page by ID',
    {
      page_id: z.string().describe('The ID of the page to retrieve'),
    },
    async (args) => {
      try {
        const response = await notionRequest(`/pages/${args.page_id}`, credentials.token);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: handleNotionError(error),
          }],
        };
      }
    }
  );

  server.tool(
    'notion_create_page',
    'Create a new page in Notion',
    {
      parent_id: z.string().describe('The ID of the parent page or database'),
      parent_type: z
        .enum(['page_id', 'database_id'])
        .describe('The type of parent (page or database)'),
      title: z.string().describe('The title of the page'),
      properties: z
        .record(z.unknown())
        .optional()
        .describe('Properties for the page, following Notion property structure'),
      children: z
        .array(z.unknown())
        .optional()
        .describe('Content blocks to add to the page'),
    },
    async (args) => {
      try {
        const { parent_id, parent_type, title, properties, children } = args;

        const parent =
          parent_type === 'page_id'
            ? { page_id: parent_id }
            : { database_id: parent_id };

        let pageProperties: Record<string, unknown> = {};

        if (parent_type === 'page_id') {
          pageProperties = {
            title: {
              title: [
                {
                  type: 'text',
                  text: { content: title },
                },
              ],
            },
          };
        } else if (parent_type === 'database_id' && properties) {
          pageProperties = properties;

          // Ensure there's a title property if required
          if (
            !properties.title &&
            !properties.Title &&
            !properties.Name &&
            !properties.name
          ) {
            pageProperties.title = {
              title: [
                {
                  type: 'text',
                  text: { content: title },
                },
              ],
            };
          }
        }

        const body: Record<string, unknown> = {
          parent,
          properties: pageProperties,
        };

        if (children && Array.isArray(children) && children.length > 0) {
          body.children = children;
        }

        const response = await notionRequest('/pages', credentials.token, 'POST', body);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: handleNotionError(error),
          }],
        };
      }
    }
  );

  server.tool(
    'notion_update_page',
    'Update a Notion page',
    {
      page_id: z.string().describe('The ID of the page to update'),
      properties: z
        .record(z.unknown())
        .describe('Properties to update, following Notion property structure'),
      archived: z.boolean().optional().describe('Archive or restore the page'),
    },
    async (args) => {
      try {
        const { page_id, properties, archived } = args;

        const body: Record<string, unknown> = { properties };
        if (archived !== undefined) {
          body.archived = archived;
        }

        const response = await notionRequest(`/pages/${page_id}`, credentials.token, 'PATCH', body);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: handleNotionError(error),
          }],
        };
      }
    }
  );

  server.tool(
    'notion_create_comment',
    'Create a new comment on a page or block',
    {
      parent_id: z.string().describe('The ID of the page or block to comment on'),
      parent_type: z
        .enum(['page_id', 'block_id'])
        .describe('The type of parent (page or block)'),
      comment_text: z.string().describe('The text content of the comment'),
      discussion_id: z
        .string()
        .optional()
        .describe('Optional discussion ID to add comment to an existing thread'),
    },
    async (args) => {
      try {
        const { parent_id, parent_type, comment_text, discussion_id } = args;

        const body: Record<string, unknown> = {
          rich_text: [
            {
              type: 'text',
              text: { content: comment_text },
            },
          ],
        };

        if (discussion_id) {
          body.discussion_id = discussion_id;
        } else {
          body.parent =
            parent_type === 'page_id'
              ? { page_id: parent_id }
              : { block_id: parent_id };
        }

        const response = await notionRequest('/comments', credentials.token, 'POST', body);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: handleNotionError(error),
          }],
        };
      }
    }
  );

  server.tool(
    'notion_list_comments',
    'List comments on a page or block',
    {
      block_id: z.string().describe('Block ID to get comments for'),
      start_cursor: z.string().optional().describe('Cursor for pagination'),
    },
    async (args) => {
      try {
        const params = new URLSearchParams();
        params.append('block_id', args.block_id);
        if (args.start_cursor) params.append('start_cursor', args.start_cursor);

        const response = await notionRequest(`/comments?${params}`, credentials.token);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: handleNotionError(error),
          }],
        };
      }
    }
  );

  server.tool(
    'notion_search',
    'Search for pages in Notion',
    {
      query: z.string().describe('Search query'),
      filter: z
        .enum(['page', 'database'])
        .optional()
        .describe('Filter by object type (page or database)'),
      sort: z
        .object({
          direction: z.enum(['ascending', 'descending']).describe('Sort direction'),
          timestamp: z
            .enum(['last_edited_time'])
            .describe('Timestamp to sort by (only last_edited_time supported)'),
        })
        .optional()
        .describe('Sort options'),
      page_size: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of results to return (max 100)'),
      start_cursor: z.string().optional().describe('Cursor for pagination'),
    },
    async (args) => {
      try {
        const { query, filter, sort, page_size, start_cursor } = args;

        const body: Record<string, unknown> = { query };

        if (filter) {
          body.filter = { property: 'object', value: filter };
        }

        if (sort) {
          body.sort = {
            direction: sort.direction,
            timestamp: sort.timestamp,
          };
        }

        if (page_size) body.page_size = page_size;
        if (start_cursor) body.start_cursor = start_cursor;

        const response = await notionRequest('/search', credentials.token, 'POST', body);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: handleNotionError(error),
          }],
        };
      }
    }
  );

  server.tool(
    'notion_create_database',
    'Create a new database in Notion',
    {
      parent_page_id: z.string().describe('The ID of the parent page'),
      title: z.string().describe('The title of the database'),
      properties: z
        .record(z.unknown())
        .describe('Database property schema following Notion property types'),
    },
    async (args) => {
      try {
        const { parent_page_id, title, properties } = args;

        const body = {
          parent: {
            type: 'page_id',
            page_id: parent_page_id,
          },
          title: [
            {
              type: 'text',
              text: { content: title },
            },
          ],
          properties,
        };

        const response = await notionRequest('/databases', credentials.token, 'POST', body);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: handleNotionError(error),
          }],
        };
      }
    }
  );

  server.tool(
    'notion_list_databases',
    'List databases accessible to the integration',
    {
      page_size: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of databases to return (max 100)'),
      start_cursor: z.string().optional().describe('Cursor for pagination'),
    },
    async (args) => {
      try {
        const body: Record<string, unknown> = {
          filter: {
            property: 'object',
            value: 'database',
          },
        };

        if (args.page_size) body.page_size = args.page_size;
        if (args.start_cursor) body.start_cursor = args.start_cursor;

        const response = await notionRequest('/search', credentials.token, 'POST', body);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: handleNotionError(error),
          }],
        };
      }
    }
  );

  server.tool(
    'notion_get_database',
    'Retrieve a database by ID',
    {
      database_id: z.string().describe('The ID of the database to retrieve'),
    },
    async (args) => {
      try {
        const response = await notionRequest(`/databases/${args.database_id}`, credentials.token);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: handleNotionError(error),
          }],
        };
      }
    }
  );

  server.tool(
    'notion_query_database',
    'Query a database with filters and sorts',
    {
      database_id: z.string().describe('The ID of the database to query'),
      filter: z.unknown().optional().describe('Filter conditions for the query'),
      sorts: z
        .array(
          z.object({
            property: z.string().optional(),
            timestamp: z.enum(['created_time', 'last_edited_time']).optional(),
            direction: z.enum(['ascending', 'descending']),
          })
        )
        .optional()
        .describe('Sort options for the query'),
      page_size: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of results to return (max 100)'),
      start_cursor: z.string().optional().describe('Cursor for pagination'),
    },
    async (args) => {
      try {
        const { database_id, filter, sorts, page_size, start_cursor } = args;

        const body: Record<string, unknown> = {};
        if (filter) body.filter = filter;
        if (sorts) body.sorts = sorts;
        if (page_size) body.page_size = page_size;
        if (start_cursor) body.start_cursor = start_cursor;

        const response = await notionRequest(
          `/databases/${database_id}/query`,
          credentials.token,
          'POST',
          body
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: handleNotionError(error),
          }],
        };
      }
    }
  );

  server.tool(
    'notion_get_block_children',
    'Retrieve child blocks of a page or block',
    {
      block_id: z.string().describe('The ID of the parent block (page or block)'),
      page_size: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of blocks to return (max 100)'),
      start_cursor: z.string().optional().describe('Cursor for pagination'),
    },
    async (args) => {
      try {
        const params = new URLSearchParams();
        if (args.page_size) params.append('page_size', args.page_size.toString());
        if (args.start_cursor) params.append('start_cursor', args.start_cursor);

        const queryString = params.toString();
        const path = queryString
          ? `/blocks/${args.block_id}/children?${queryString}`
          : `/blocks/${args.block_id}/children`;

        const response = await notionRequest(path, credentials.token);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: handleNotionError(error),
          }],
        };
      }
    }
  );

  server.tool(
    'notion_append_block_children',
    'Add new blocks as children to a page or block',
    {
      block_id: z.string().describe('The ID of the parent block (page or block)'),
      children: z.array(z.unknown()).describe('Array of blocks to add as children'),
    },
    async (args) => {
      try {
        const { block_id, children } = args;

        const body = { children };

        const response = await notionRequest(
          `/blocks/${block_id}/children`,
          credentials.token,
          'PATCH',
          body
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: handleNotionError(error),
          }],
        };
      }
    }
  );

  return server;
}

import { Client } from '@notionhq/client';
import type {
  BlockObjectRequest,
  CreateCommentResponse,
  CreatePageParameters,
  SearchParameters,
  UpdatePageParameters,
} from '@notionhq/client/build/src/api-endpoints';
import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

const createNotionClient = (token: string) => {
  return new Client({
    auth: token,
  });
};

export const NotionConnectorConfig = mcpConnectorConfig({
  name: 'Notion',
  key: 'notion',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/notion/filled/svg',
  credentials: z.object({
    token: z
      .string()
      .describe(
        'Notion Integration Token from Settings > Integrations :: secret_1234567890abcdefghijklmnopqrstuv :: https://developers.notion.com/docs/authorization'
      ),
  }),
  setup: z.object({}),
  examplePrompt:
    'Search for pages about "project planning", create a new page with meeting notes, and add a comment to the roadmap page with progress updates.',
  tools: (tool) => ({
    GET_ME: tool({
      name: 'notion_get_me',
      description: 'Get the authenticated user',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { token } = await context.getCredentials();
          const notion = createNotionClient(token);
          const response = await notion.users.me({});
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_USERS: tool({
      name: 'notion_list_users',
      description: 'List all users in the Notion workspace',
      schema: z.object({
        page_size: z
          .number()
          .min(1)
          .max(100)
          .optional()
          .describe('Number of users to return (max 100)'),
        start_cursor: z.string().optional().describe('Cursor for pagination'),
      }),
      handler: async (args, context) => {
        try {
          const { token } = await context.getCredentials();
          const notion = createNotionClient(token);
          const response = await notion.users.list({
            page_size: args.page_size,
            start_cursor: args.start_cursor,
          });
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_PAGE: tool({
      name: 'notion_get_page',
      description: 'Retrieve a Notion page by ID',
      schema: z.object({
        page_id: z.string().describe('The ID of the page to retrieve'),
      }),
      handler: async (args, context) => {
        try {
          const { token } = await context.getCredentials();
          const notion = createNotionClient(token);
          const response = await notion.pages.retrieve({
            page_id: args.page_id,
          });
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    CREATE_PAGE: tool({
      name: 'notion_create_page',
      description: 'Create a new page in Notion',
      schema: z.object({
        parent_id: z.string().describe('The ID of the parent page or database'),
        parent_type: z
          .enum(['page_id', 'database_id'])
          .describe('The type of parent (page or database)'),
        title: z.string().describe('The title of the page'),
        properties: z
          .record(
            z.union([
              // Title property
              z.object({
                title: z.array(
                  z.object({
                    type: z.literal('text'),
                    text: z.object({
                      content: z.string(),
                      link: z.object({ url: z.string() }).nullable().optional(),
                    }),
                  })
                ),
              }),
              // Rich text property
              z.object({
                rich_text: z.array(
                  z.object({
                    type: z.literal('text'),
                    text: z.object({
                      content: z.string(),
                      link: z.object({ url: z.string() }).nullable().optional(),
                    }),
                  })
                ),
              }),
              // Number property
              z.object({
                number: z.number().nullable(),
              }),
              // Select property
              z.object({
                select: z
                  .object({
                    name: z.string().optional(),
                    id: z.string().optional(),
                  })
                  .nullable(),
              }),
              // Multi-select property
              z.object({
                multi_select: z
                  .array(
                    z.object({
                      name: z.string().optional(),
                      id: z.string().optional(),
                    })
                  )
                  .optional(),
              }),
              // Date property
              z.object({
                date: z
                  .object({
                    start: z.string(),
                    end: z.string().nullable().optional(),
                    time_zone: z.string().nullable().optional(),
                  })
                  .nullable(),
              }),
              // Checkbox property
              z.object({
                checkbox: z.boolean(),
              }),
              // URL property
              z.object({
                url: z.string().nullable(),
              }),
              // Email property
              z.object({
                email: z.string().nullable(),
              }),
              // Status property
              z.object({
                status: z
                  .object({
                    id: z.string().optional(),
                    name: z.string().optional(),
                  })
                  .nullable(),
              }),
            ])
          )
          .optional()
          .describe('Properties for the page, following Notion property structure'),
        children: z
          .array(
            z.union([
              // Paragraph block
              z.object({
                type: z.literal('paragraph'),
                paragraph: z.object({
                  rich_text: z.array(
                    z.object({
                      type: z.literal('text'),
                      text: z.object({
                        content: z.string(),
                        link: z.object({ url: z.string() }).nullable().optional(),
                      }),
                    })
                  ),
                }),
              }),
              // Heading blocks
              z.object({
                type: z.literal('heading_1'),
                heading_1: z.object({
                  rich_text: z.array(
                    z.object({
                      type: z.literal('text'),
                      text: z.object({
                        content: z.string(),
                        link: z.object({ url: z.string() }).nullable().optional(),
                      }),
                    })
                  ),
                }),
              }),
              z.object({
                type: z.literal('heading_2'),
                heading_2: z.object({
                  rich_text: z.array(
                    z.object({
                      type: z.literal('text'),
                      text: z.object({
                        content: z.string(),
                        link: z.object({ url: z.string() }).nullable().optional(),
                      }),
                    })
                  ),
                }),
              }),
              z.object({
                type: z.literal('heading_3'),
                heading_3: z.object({
                  rich_text: z.array(
                    z.object({
                      type: z.literal('text'),
                      text: z.object({
                        content: z.string(),
                        link: z.object({ url: z.string() }).nullable().optional(),
                      }),
                    })
                  ),
                }),
              }),
              // Bulleted list item
              z.object({
                type: z.literal('bulleted_list_item'),
                bulleted_list_item: z.object({
                  rich_text: z.array(
                    z.object({
                      type: z.literal('text'),
                      text: z.object({
                        content: z.string(),
                        link: z.object({ url: z.string() }).nullable().optional(),
                      }),
                    })
                  ),
                }),
              }),
              // Numbered list item
              z.object({
                type: z.literal('numbered_list_item'),
                numbered_list_item: z.object({
                  rich_text: z.array(
                    z.object({
                      type: z.literal('text'),
                      text: z.object({
                        content: z.string(),
                        link: z.object({ url: z.string() }).nullable().optional(),
                      }),
                    })
                  ),
                }),
              }),
              // To-do block
              z.object({
                type: z.literal('to_do'),
                to_do: z.object({
                  rich_text: z.array(
                    z.object({
                      type: z.literal('text'),
                      text: z.object({
                        content: z.string(),
                        link: z.object({ url: z.string() }).nullable().optional(),
                      }),
                    })
                  ),
                  checked: z.boolean().optional(),
                }),
              }),
              // Divider
              z.object({
                type: z.literal('divider'),
                divider: z.object({}),
              }),
            ])
          )
          .optional()
          .describe('Content blocks to add to the page'),
      }),
      handler: async (args, context) => {
        try {
          const { token } = await context.getCredentials();
          const notion = createNotionClient(token);
          const { parent_id, parent_type, title, properties, children } = args;

          const parent =
            parent_type === 'page_id'
              ? { page_id: parent_id }
              : { database_id: parent_id };

          let pageProperties: CreatePageParameters['properties'] = {};

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
            pageProperties = properties as CreatePageParameters['properties'];

            // Ensure there's a title property if required
            if (
              !properties.title &&
              !properties.Title &&
              !properties.Name &&
              !properties.name
            ) {
              if (pageProperties) {
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
          }

          const createPageParams: CreatePageParameters = {
            parent,
            properties: pageProperties,
          };

          if (children && Array.isArray(children) && children.length > 0) {
            createPageParams.children = children as BlockObjectRequest[];
          }

          const response = await notion.pages.create(createPageParams);
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    UPDATE_PAGE: tool({
      name: 'notion_update_page',
      description: 'Update a Notion page',
      schema: z.object({
        page_id: z.string().describe('The ID of the page to update'),
        properties: z
          .record(
            z.union([
              // Title property
              z.object({
                title: z.array(
                  z.object({
                    type: z.literal('text'),
                    text: z.object({
                      content: z.string(),
                      link: z.object({ url: z.string() }).nullable().optional(),
                    }),
                  })
                ),
              }),
              // Rich text property
              z.object({
                rich_text: z.array(
                  z.object({
                    type: z.literal('text'),
                    text: z.object({
                      content: z.string(),
                      link: z.object({ url: z.string() }).nullable().optional(),
                    }),
                  })
                ),
              }),
              // Number property
              z.object({
                number: z.number().nullable(),
              }),
              // Select property
              z.object({
                select: z
                  .object({
                    name: z.string().optional(),
                    id: z.string().optional(),
                  })
                  .nullable(),
              }),
              // Multi-select property
              z.object({
                multi_select: z
                  .array(
                    z.object({
                      name: z.string().optional(),
                      id: z.string().optional(),
                    })
                  )
                  .optional(),
              }),
              // Date property
              z.object({
                date: z
                  .object({
                    start: z.string(),
                    end: z.string().nullable().optional(),
                    time_zone: z.string().nullable().optional(),
                  })
                  .nullable(),
              }),
              // Checkbox property
              z.object({
                checkbox: z.boolean(),
              }),
              // URL property
              z.object({
                url: z.string().nullable(),
              }),
              // Email property
              z.object({
                email: z.string().nullable(),
              }),
              // Status property
              z.object({
                status: z
                  .object({
                    id: z.string().optional(),
                    name: z.string().optional(),
                  })
                  .nullable(),
              }),
            ])
          )
          .describe('Properties to update, following Notion property structure'),
        archived: z.boolean().optional().describe('Archive or restore the page'),
      }),
      handler: async (args, context) => {
        try {
          const { token } = await context.getCredentials();
          const notion = createNotionClient(token);
          const { page_id, properties, archived } = args;

          const response = await notion.pages.update({
            page_id,
            properties: properties as UpdatePageParameters['properties'],
            archived,
          });
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    CREATE_COMMENT: tool({
      name: 'notion_create_comment',
      description: 'Create a new comment on a page or block',
      schema: z.object({
        parent_id: z.string().describe('The ID of the page or block to comment on'),
        parent_type: z
          .enum(['page_id', 'block_id'])
          .describe('The type of parent (page or block)'),
        comment_text: z.string().describe('The text content of the comment'),
        discussion_id: z
          .string()
          .optional()
          .describe('Optional discussion ID to add comment to an existing thread'),
      }),
      handler: async (args, context) => {
        try {
          const { token } = await context.getCredentials();
          const notion = createNotionClient(token);
          const { parent_id, comment_text, discussion_id } = args;

          let response: CreateCommentResponse;
          if (discussion_id) {
            // add to existing thread
            response = await notion.comments.create({
              discussion_id,
              rich_text: [
                {
                  type: 'text',
                  text: { content: comment_text },
                },
              ],
            });
          } else {
            // create new thread
            response = await notion.comments.create({
              parent: {
                page_id: parent_id,
              },
              rich_text: [
                {
                  type: 'text',
                  text: { content: comment_text },
                },
              ],
            });
          }
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_COMMENTS: tool({
      name: 'notion_list_comments',
      description: 'List comments on a page or block',
      schema: z.object({
        block_id: z.string().describe('Block ID to get comments for'),
        start_cursor: z.string().optional().describe('Cursor for pagination'),
      }),
      handler: async (args, context) => {
        try {
          const { token } = await context.getCredentials();
          const notion = createNotionClient(token);
          const response = await notion.comments.list({
            block_id: args.block_id,
            start_cursor: args.start_cursor,
          });
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    SEARCH: tool({
      name: 'notion_search',
      description: 'Search for pages in Notion',
      schema: z.object({
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
      }),
      handler: async (args, context) => {
        try {
          const { token } = await context.getCredentials();
          const notion = createNotionClient(token);
          const { query, filter, sort, page_size, start_cursor } = args;

          const searchParams: SearchParameters = {
            query,
            page_size,
            start_cursor,
          };

          if (filter) {
            searchParams.filter = { property: 'object', value: filter };
          }

          if (sort) {
            searchParams.sort = {
              direction: sort.direction,
              timestamp: sort.timestamp,
            };
          }

          const response = await notion.search(searchParams);
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

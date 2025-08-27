import {
  APIErrorCode,
  Client,
  ClientErrorCode,
  isNotionClientError,
} from '@notionhq/client';
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
    notionVersion: '2022-06-28', // Latest stable version
  });
};

const handleNotionError = (error: unknown): string => {
  if (isNotionClientError(error)) {
    switch (error.code) {
      case APIErrorCode.ObjectNotFound:
        return `Error: Resource not found. Please check the ID and ensure your integration has access to it.`;
      case APIErrorCode.Unauthorized:
        return `Error: Unauthorized. Please check your Notion integration token and permissions.`;
      case APIErrorCode.RestrictedResource:
        return `Error: Access restricted. Your integration doesn't have permission to access this resource.`;
      case APIErrorCode.RateLimited:
        return `Error: Rate limited. Please wait before making more requests.`;
      case APIErrorCode.InvalidJson:
        return `Error: Invalid request format. Please check the request parameters.`;
      case APIErrorCode.InvalidRequestUrl:
        return `Error: Invalid request URL.`;
      case APIErrorCode.InvalidRequest:
        return `Error: Invalid request. Please check the request parameters.`;
      case APIErrorCode.ValidationError:
        return `Error: Validation failed. ${error.message}`;
      case APIErrorCode.ConflictError:
        return `Error: Conflict. The resource you're trying to create already exists or conflicts with existing data.`;
      case APIErrorCode.InternalServerError:
        return `Error: Internal server error. Please try again later.`;
      case APIErrorCode.ServiceUnavailable:
        return `Error: Service unavailable. Please try again later.`;
      case ClientErrorCode.RequestTimeout:
        return `Error: Request timeout. Please try again.`;
      case ClientErrorCode.ResponseError:
        return `Error: Response error. ${error.message}`;
      default:
        return `Error: ${error.message}`;
    }
  }
  return `Error: ${error instanceof Error ? error.message : String(error)}`;
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
    'Create a project management database with tasks, assignees, and due dates. Then create a new page for meeting notes, add some structured content with headings and bullet points, and query the database to find overdue tasks.',
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
          return handleNotionError(error);
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
          return handleNotionError(error);
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
          return handleNotionError(error);
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
          return handleNotionError(error);
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
          return handleNotionError(error);
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
          return handleNotionError(error);
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
          return handleNotionError(error);
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
          return handleNotionError(error);
        }
      },
    }),
    CREATE_DATABASE: tool({
      name: 'notion_create_database',
      description: 'Create a new database in Notion',
      schema: z.object({
        parent_page_id: z.string().describe('The ID of the parent page'),
        title: z.string().describe('The title of the database'),
        properties: z
          .record(
            z.union([
              // Title property
              z.object({
                type: z.literal('title'),
                title: z.object({}).optional(),
              }),
              // Rich text property
              z.object({
                type: z.literal('rich_text'),
                rich_text: z.object({}).optional(),
              }),
              // Number property
              z.object({
                type: z.literal('number'),
                number: z
                  .object({
                    format: z
                      .enum([
                        'number',
                        'number_with_commas',
                        'percent',
                        'dollar',
                        'canadian_dollar',
                        'singapore_dollar',
                        'euro',
                        'pound',
                        'yen',
                        'ruble',
                        'rupiah',
                        'won',
                        'yuan',
                        'real',
                        'lira',
                        'rupee',
                        'franc',
                        'hong_kong_dollar',
                        'new_zealand_dollar',
                        'krona',
                        'norwegian_krone',
                        'mexican_peso',
                        'rand',
                        'new_taiwan_dollar',
                        'danish_krone',
                        'zloty',
                        'baht',
                        'forint',
                        'koruna',
                        'shekel',
                        'chilean_peso',
                        'philippine_peso',
                        'dirham',
                        'colombian_peso',
                        'riyal',
                        'ringgit',
                        'leu',
                        'argentine_peso',
                        'uruguayan_peso',
                        'peruvian_sol',
                      ])
                      .optional(),
                  })
                  .optional(),
              }),
              // Select property
              z.object({
                type: z.literal('select'),
                select: z
                  .object({
                    options: z
                      .array(
                        z.object({
                          name: z.string(),
                          color: z
                            .enum([
                              'default',
                              'gray',
                              'brown',
                              'red',
                              'orange',
                              'yellow',
                              'green',
                              'blue',
                              'purple',
                              'pink',
                            ])
                            .optional(),
                        })
                      )
                      .optional(),
                  })
                  .optional(),
              }),
              // Multi-select property
              z.object({
                type: z.literal('multi_select'),
                multi_select: z
                  .object({
                    options: z
                      .array(
                        z.object({
                          name: z.string(),
                          color: z
                            .enum([
                              'default',
                              'gray',
                              'brown',
                              'red',
                              'orange',
                              'yellow',
                              'green',
                              'blue',
                              'purple',
                              'pink',
                            ])
                            .optional(),
                        })
                      )
                      .optional(),
                  })
                  .optional(),
              }),
              // Date property
              z.object({
                type: z.literal('date'),
                date: z.object({}).optional(),
              }),
              // Checkbox property
              z.object({
                type: z.literal('checkbox'),
                checkbox: z.object({}).optional(),
              }),
              // URL property
              z.object({
                type: z.literal('url'),
                url: z.object({}).optional(),
              }),
              // Email property
              z.object({
                type: z.literal('email'),
                email: z.object({}).optional(),
              }),
              // People property
              z.object({
                type: z.literal('people'),
                people: z.object({}).optional(),
              }),
              // Files property
              z.object({
                type: z.literal('files'),
                files: z.object({}).optional(),
              }),
              // Phone number property
              z.object({
                type: z.literal('phone_number'),
                phone_number: z.object({}).optional(),
              }),
              // Formula property
              z.object({
                type: z.literal('formula'),
                formula: z.object({
                  expression: z.string(),
                }),
              }),
              // Relation property
              z.object({
                type: z.literal('relation'),
                relation: z.object({
                  database_id: z.string(),
                  type: z.enum(['single_property', 'dual_property']).optional(),
                  single_property: z.object({}).optional(),
                  dual_property: z
                    .object({
                      synced_property_name: z.string(),
                      synced_property_id: z.string(),
                    })
                    .optional(),
                }),
              }),
              // Rollup property
              z.object({
                type: z.literal('rollup'),
                rollup: z.object({
                  relation_property_name: z.string(),
                  relation_property_id: z.string(),
                  rollup_property_name: z.string(),
                  rollup_property_id: z.string(),
                  function: z.enum([
                    'count',
                    'count_values',
                    'empty',
                    'not_empty',
                    'unique',
                    'show_unique',
                    'percent_empty',
                    'percent_not_empty',
                    'sum',
                    'average',
                    'median',
                    'min',
                    'max',
                    'range',
                  ]),
                }),
              }),
              // Created time property
              z.object({
                type: z.literal('created_time'),
                created_time: z.object({}).optional(),
              }),
              // Created by property
              z.object({
                type: z.literal('created_by'),
                created_by: z.object({}).optional(),
              }),
              // Last edited time property
              z.object({
                type: z.literal('last_edited_time'),
                last_edited_time: z.object({}).optional(),
              }),
              // Last edited by property
              z.object({
                type: z.literal('last_edited_by'),
                last_edited_by: z.object({}).optional(),
              }),
            ])
          )
          .describe('Database property schema following Notion property types'),
      }),
      handler: async (args, context) => {
        try {
          const { token } = await context.getCredentials();
          const notion = createNotionClient(token);
          const { parent_page_id, title, properties } = args;

          const response = await notion.databases.create({
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
            properties: properties as Record<string, DatabasePropertySchema>,
          });
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return handleNotionError(error);
        }
      },
    }),
    LIST_DATABASES: tool({
      name: 'notion_list_databases',
      description: 'List databases accessible to the integration',
      schema: z.object({
        page_size: z
          .number()
          .min(1)
          .max(100)
          .optional()
          .describe('Number of databases to return (max 100)'),
        start_cursor: z.string().optional().describe('Cursor for pagination'),
      }),
      handler: async (args, context) => {
        try {
          const { token } = await context.getCredentials();
          const notion = createNotionClient(token);

          // Use search with database filter to list databases
          const response = await notion.search({
            filter: {
              property: 'object',
              value: 'database',
            },
            page_size: args.page_size,
            start_cursor: args.start_cursor,
          });
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return handleNotionError(error);
        }
      },
    }),
    GET_DATABASE: tool({
      name: 'notion_get_database',
      description: 'Retrieve a database by ID',
      schema: z.object({
        database_id: z.string().describe('The ID of the database to retrieve'),
      }),
      handler: async (args, context) => {
        try {
          const { token } = await context.getCredentials();
          const notion = createNotionClient(token);
          const response = await notion.databases.retrieve({
            database_id: args.database_id,
          });
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return handleNotionError(error);
        }
      },
    }),
    QUERY_DATABASE: tool({
      name: 'notion_query_database',
      description: 'Query a database with filters and sorts',
      schema: z.object({
        database_id: z.string().describe('The ID of the database to query'),
        filter: z
          .object({
            property: z.string(),
            rich_text: z
              .object({
                contains: z.string().optional(),
                does_not_contain: z.string().optional(),
                starts_with: z.string().optional(),
                ends_with: z.string().optional(),
                equals: z.string().optional(),
                does_not_equal: z.string().optional(),
                is_empty: z.boolean().optional(),
                is_not_empty: z.boolean().optional(),
              })
              .optional(),
            title: z
              .object({
                contains: z.string().optional(),
                does_not_contain: z.string().optional(),
                starts_with: z.string().optional(),
                ends_with: z.string().optional(),
                equals: z.string().optional(),
                does_not_equal: z.string().optional(),
                is_empty: z.boolean().optional(),
                is_not_empty: z.boolean().optional(),
              })
              .optional(),
            number: z
              .object({
                equals: z.number().optional(),
                does_not_equal: z.number().optional(),
                greater_than: z.number().optional(),
                less_than: z.number().optional(),
                greater_than_or_equal_to: z.number().optional(),
                less_than_or_equal_to: z.number().optional(),
                is_empty: z.boolean().optional(),
                is_not_empty: z.boolean().optional(),
              })
              .optional(),
            checkbox: z
              .object({
                equals: z.boolean().optional(),
                does_not_equal: z.boolean().optional(),
              })
              .optional(),
            select: z
              .object({
                equals: z.string().optional(),
                does_not_equal: z.string().optional(),
                is_empty: z.boolean().optional(),
                is_not_empty: z.boolean().optional(),
              })
              .optional(),
            multi_select: z
              .object({
                contains: z.string().optional(),
                does_not_contain: z.string().optional(),
                is_empty: z.boolean().optional(),
                is_not_empty: z.boolean().optional(),
              })
              .optional(),
            date: z
              .object({
                equals: z.string().optional(),
                before: z.string().optional(),
                after: z.string().optional(),
                on_or_before: z.string().optional(),
                on_or_after: z.string().optional(),
                past_week: z.object({}).optional(),
                past_month: z.object({}).optional(),
                past_year: z.object({}).optional(),
                next_week: z.object({}).optional(),
                next_month: z.object({}).optional(),
                next_year: z.object({}).optional(),
                is_empty: z.boolean().optional(),
                is_not_empty: z.boolean().optional(),
              })
              .optional(),
          })
          .optional()
          .describe('Filter conditions for the query'),
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
      }),
      handler: async (args, context) => {
        try {
          const { token } = await context.getCredentials();
          const notion = createNotionClient(token);
          const { database_id, filter, sorts, page_size, start_cursor } = args;

          const response = await notion.databases.query({
            database_id,
            filter: filter as any,
            sorts: sorts as any,
            page_size,
            start_cursor,
          });
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return handleNotionError(error);
        }
      },
    }),
    GET_BLOCK_CHILDREN: tool({
      name: 'notion_get_block_children',
      description: 'Retrieve child blocks of a page or block',
      schema: z.object({
        block_id: z.string().describe('The ID of the parent block (page or block)'),
        page_size: z
          .number()
          .min(1)
          .max(100)
          .optional()
          .describe('Number of blocks to return (max 100)'),
        start_cursor: z.string().optional().describe('Cursor for pagination'),
      }),
      handler: async (args, context) => {
        try {
          const { token } = await context.getCredentials();
          const notion = createNotionClient(token);
          const response = await notion.blocks.children.list({
            block_id: args.block_id,
            page_size: args.page_size,
            start_cursor: args.start_cursor,
          });
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return handleNotionError(error);
        }
      },
    }),
    APPEND_BLOCK_CHILDREN: tool({
      name: 'notion_append_block_children',
      description: 'Add new blocks as children to a page or block',
      schema: z.object({
        block_id: z.string().describe('The ID of the parent block (page or block)'),
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
                      annotations: z
                        .object({
                          bold: z.boolean().optional(),
                          italic: z.boolean().optional(),
                          strikethrough: z.boolean().optional(),
                          underline: z.boolean().optional(),
                          code: z.boolean().optional(),
                          color: z
                            .enum([
                              'default',
                              'gray',
                              'brown',
                              'red',
                              'orange',
                              'yellow',
                              'green',
                              'blue',
                              'purple',
                              'pink',
                            ])
                            .optional(),
                        })
                        .optional(),
                    })
                  ),
                  color: z
                    .enum([
                      'default',
                      'gray',
                      'brown',
                      'red',
                      'orange',
                      'yellow',
                      'green',
                      'blue',
                      'purple',
                      'pink',
                    ])
                    .optional(),
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
                      annotations: z
                        .object({
                          bold: z.boolean().optional(),
                          italic: z.boolean().optional(),
                          strikethrough: z.boolean().optional(),
                          underline: z.boolean().optional(),
                          code: z.boolean().optional(),
                          color: z
                            .enum([
                              'default',
                              'gray',
                              'brown',
                              'red',
                              'orange',
                              'yellow',
                              'green',
                              'blue',
                              'purple',
                              'pink',
                            ])
                            .optional(),
                        })
                        .optional(),
                    })
                  ),
                  color: z
                    .enum([
                      'default',
                      'gray',
                      'brown',
                      'red',
                      'orange',
                      'yellow',
                      'green',
                      'blue',
                      'purple',
                      'pink',
                    ])
                    .optional(),
                  is_toggleable: z.boolean().optional(),
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
                      annotations: z
                        .object({
                          bold: z.boolean().optional(),
                          italic: z.boolean().optional(),
                          strikethrough: z.boolean().optional(),
                          underline: z.boolean().optional(),
                          code: z.boolean().optional(),
                          color: z
                            .enum([
                              'default',
                              'gray',
                              'brown',
                              'red',
                              'orange',
                              'yellow',
                              'green',
                              'blue',
                              'purple',
                              'pink',
                            ])
                            .optional(),
                        })
                        .optional(),
                    })
                  ),
                  color: z
                    .enum([
                      'default',
                      'gray',
                      'brown',
                      'red',
                      'orange',
                      'yellow',
                      'green',
                      'blue',
                      'purple',
                      'pink',
                    ])
                    .optional(),
                  is_toggleable: z.boolean().optional(),
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
                      annotations: z
                        .object({
                          bold: z.boolean().optional(),
                          italic: z.boolean().optional(),
                          strikethrough: z.boolean().optional(),
                          underline: z.boolean().optional(),
                          code: z.boolean().optional(),
                          color: z
                            .enum([
                              'default',
                              'gray',
                              'brown',
                              'red',
                              'orange',
                              'yellow',
                              'green',
                              'blue',
                              'purple',
                              'pink',
                            ])
                            .optional(),
                        })
                        .optional(),
                    })
                  ),
                  color: z
                    .enum([
                      'default',
                      'gray',
                      'brown',
                      'red',
                      'orange',
                      'yellow',
                      'green',
                      'blue',
                      'purple',
                      'pink',
                    ])
                    .optional(),
                  is_toggleable: z.boolean().optional(),
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
                      annotations: z
                        .object({
                          bold: z.boolean().optional(),
                          italic: z.boolean().optional(),
                          strikethrough: z.boolean().optional(),
                          underline: z.boolean().optional(),
                          code: z.boolean().optional(),
                          color: z
                            .enum([
                              'default',
                              'gray',
                              'brown',
                              'red',
                              'orange',
                              'yellow',
                              'green',
                              'blue',
                              'purple',
                              'pink',
                            ])
                            .optional(),
                        })
                        .optional(),
                    })
                  ),
                  color: z
                    .enum([
                      'default',
                      'gray',
                      'brown',
                      'red',
                      'orange',
                      'yellow',
                      'green',
                      'blue',
                      'purple',
                      'pink',
                    ])
                    .optional(),
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
                      annotations: z
                        .object({
                          bold: z.boolean().optional(),
                          italic: z.boolean().optional(),
                          strikethrough: z.boolean().optional(),
                          underline: z.boolean().optional(),
                          code: z.boolean().optional(),
                          color: z
                            .enum([
                              'default',
                              'gray',
                              'brown',
                              'red',
                              'orange',
                              'yellow',
                              'green',
                              'blue',
                              'purple',
                              'pink',
                            ])
                            .optional(),
                        })
                        .optional(),
                    })
                  ),
                  color: z
                    .enum([
                      'default',
                      'gray',
                      'brown',
                      'red',
                      'orange',
                      'yellow',
                      'green',
                      'blue',
                      'purple',
                      'pink',
                    ])
                    .optional(),
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
                      annotations: z
                        .object({
                          bold: z.boolean().optional(),
                          italic: z.boolean().optional(),
                          strikethrough: z.boolean().optional(),
                          underline: z.boolean().optional(),
                          code: z.boolean().optional(),
                          color: z
                            .enum([
                              'default',
                              'gray',
                              'brown',
                              'red',
                              'orange',
                              'yellow',
                              'green',
                              'blue',
                              'purple',
                              'pink',
                            ])
                            .optional(),
                        })
                        .optional(),
                    })
                  ),
                  checked: z.boolean().optional(),
                  color: z
                    .enum([
                      'default',
                      'gray',
                      'brown',
                      'red',
                      'orange',
                      'yellow',
                      'green',
                      'blue',
                      'purple',
                      'pink',
                    ])
                    .optional(),
                }),
              }),
              // Toggle block
              z.object({
                type: z.literal('toggle'),
                toggle: z.object({
                  rich_text: z.array(
                    z.object({
                      type: z.literal('text'),
                      text: z.object({
                        content: z.string(),
                        link: z.object({ url: z.string() }).nullable().optional(),
                      }),
                      annotations: z
                        .object({
                          bold: z.boolean().optional(),
                          italic: z.boolean().optional(),
                          strikethrough: z.boolean().optional(),
                          underline: z.boolean().optional(),
                          code: z.boolean().optional(),
                          color: z
                            .enum([
                              'default',
                              'gray',
                              'brown',
                              'red',
                              'orange',
                              'yellow',
                              'green',
                              'blue',
                              'purple',
                              'pink',
                            ])
                            .optional(),
                        })
                        .optional(),
                    })
                  ),
                  color: z
                    .enum([
                      'default',
                      'gray',
                      'brown',
                      'red',
                      'orange',
                      'yellow',
                      'green',
                      'blue',
                      'purple',
                      'pink',
                    ])
                    .optional(),
                }),
              }),
              // Code block
              z.object({
                type: z.literal('code'),
                code: z.object({
                  rich_text: z.array(
                    z.object({
                      type: z.literal('text'),
                      text: z.object({
                        content: z.string(),
                        link: z.object({ url: z.string() }).nullable().optional(),
                      }),
                      annotations: z
                        .object({
                          bold: z.boolean().optional(),
                          italic: z.boolean().optional(),
                          strikethrough: z.boolean().optional(),
                          underline: z.boolean().optional(),
                          code: z.boolean().optional(),
                          color: z
                            .enum([
                              'default',
                              'gray',
                              'brown',
                              'red',
                              'orange',
                              'yellow',
                              'green',
                              'blue',
                              'purple',
                              'pink',
                            ])
                            .optional(),
                        })
                        .optional(),
                    })
                  ),
                  language: z
                    .enum([
                      'abap',
                      'arduino',
                      'bash',
                      'basic',
                      'c',
                      'clojure',
                      'coffeescript',
                      'c++',
                      'c#',
                      'css',
                      'dart',
                      'diff',
                      'docker',
                      'elixir',
                      'elm',
                      'erlang',
                      'flow',
                      'fortran',
                      'f#',
                      'gherkin',
                      'glsl',
                      'go',
                      'graphql',
                      'groovy',
                      'haskell',
                      'html',
                      'java',
                      'javascript',
                      'json',
                      'julia',
                      'kotlin',
                      'latex',
                      'less',
                      'lisp',
                      'livescript',
                      'lua',
                      'makefile',
                      'markdown',
                      'markup',
                      'matlab',
                      'mermaid',
                      'nix',
                      'objective-c',
                      'ocaml',
                      'pascal',
                      'perl',
                      'php',
                      'plain text',
                      'powershell',
                      'prolog',
                      'protobuf',
                      'python',
                      'r',
                      'reason',
                      'ruby',
                      'rust',
                      'sass',
                      'scala',
                      'scheme',
                      'scss',
                      'shell',
                      'sql',
                      'swift',
                      'typescript',
                      'vb.net',
                      'verilog',
                      'vhdl',
                      'visual basic',
                      'webassembly',
                      'xml',
                      'yaml',
                      'java/c/c++/c#',
                    ])
                    .optional(),
                  caption: z
                    .array(
                      z.object({
                        type: z.literal('text'),
                        text: z.object({
                          content: z.string(),
                          link: z.object({ url: z.string() }).nullable().optional(),
                        }),
                        annotations: z
                          .object({
                            bold: z.boolean().optional(),
                            italic: z.boolean().optional(),
                            strikethrough: z.boolean().optional(),
                            underline: z.boolean().optional(),
                            code: z.boolean().optional(),
                            color: z
                              .enum([
                                'default',
                                'gray',
                                'brown',
                                'red',
                                'orange',
                                'yellow',
                                'green',
                                'blue',
                                'purple',
                                'pink',
                              ])
                              .optional(),
                          })
                          .optional(),
                      })
                    )
                    .optional(),
                }),
              }),
              // Quote block
              z.object({
                type: z.literal('quote'),
                quote: z.object({
                  rich_text: z.array(
                    z.object({
                      type: z.literal('text'),
                      text: z.object({
                        content: z.string(),
                        link: z.object({ url: z.string() }).nullable().optional(),
                      }),
                      annotations: z
                        .object({
                          bold: z.boolean().optional(),
                          italic: z.boolean().optional(),
                          strikethrough: z.boolean().optional(),
                          underline: z.boolean().optional(),
                          code: z.boolean().optional(),
                          color: z
                            .enum([
                              'default',
                              'gray',
                              'brown',
                              'red',
                              'orange',
                              'yellow',
                              'green',
                              'blue',
                              'purple',
                              'pink',
                            ])
                            .optional(),
                        })
                        .optional(),
                    })
                  ),
                  color: z
                    .enum([
                      'default',
                      'gray',
                      'brown',
                      'red',
                      'orange',
                      'yellow',
                      'green',
                      'blue',
                      'purple',
                      'pink',
                    ])
                    .optional(),
                }),
              }),
              // Callout block
              z.object({
                type: z.literal('callout'),
                callout: z.object({
                  rich_text: z.array(
                    z.object({
                      type: z.literal('text'),
                      text: z.object({
                        content: z.string(),
                        link: z.object({ url: z.string() }).nullable().optional(),
                      }),
                      annotations: z
                        .object({
                          bold: z.boolean().optional(),
                          italic: z.boolean().optional(),
                          strikethrough: z.boolean().optional(),
                          underline: z.boolean().optional(),
                          code: z.boolean().optional(),
                          color: z
                            .enum([
                              'default',
                              'gray',
                              'brown',
                              'red',
                              'orange',
                              'yellow',
                              'green',
                              'blue',
                              'purple',
                              'pink',
                            ])
                            .optional(),
                        })
                        .optional(),
                    })
                  ),
                  icon: z
                    .union([
                      z.object({
                        type: z.literal('emoji'),
                        emoji: z.string(),
                      }),
                      z.object({
                        type: z.literal('external'),
                        external: z.object({
                          url: z.string(),
                        }),
                      }),
                    ])
                    .optional(),
                  color: z
                    .enum([
                      'default',
                      'gray',
                      'brown',
                      'red',
                      'orange',
                      'yellow',
                      'green',
                      'blue',
                      'purple',
                      'pink',
                    ])
                    .optional(),
                }),
              }),
              // Divider
              z.object({
                type: z.literal('divider'),
                divider: z.object({}),
              }),
              // Table of contents
              z.object({
                type: z.literal('table_of_contents'),
                table_of_contents: z.object({
                  color: z
                    .enum([
                      'default',
                      'gray',
                      'brown',
                      'red',
                      'orange',
                      'yellow',
                      'green',
                      'blue',
                      'purple',
                      'pink',
                    ])
                    .optional(),
                }),
              }),
            ])
          )
          .describe('Array of blocks to add as children'),
      }),
      handler: async (args, context) => {
        try {
          const { token } = await context.getCredentials();
          const notion = createNotionClient(token);
          const { block_id, children } = args;

          const response = await notion.blocks.children.append({
            block_id,
            children: children as BlockObjectRequest[],
          });
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return handleNotionError(error);
        }
      },
    }),
  }),
});

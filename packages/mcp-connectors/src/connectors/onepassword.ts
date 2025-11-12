import { ItemBuilder, OnePasswordConnect } from '@1password/connect';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ConnectorMetadata } from '../types/metadata';
import { createIndex, search } from '../utils/lexical-search';

export const OnepasswordConnectorMetadata = {
  key: 'onepassword',
  name: '1Password',
  description: 'Password management',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/onepassword/filled/svg',
  examplePrompt: 'Get passwords from 1Password',
  categories: ['security', 'password-management'],
} as const satisfies ConnectorMetadata;

export interface OnePasswordCredentials {
  serverUrl: string;
  token: string;
}

export function createOnePasswordServer(credentials: OnePasswordCredentials): McpServer {
  const server = new McpServer({
    name: '1Password',
    version: '1.0.0',
  });

  server.tool(
    '1password_list_vaults',
    'List all accessible 1Password vaults',
    {},
    async () => {
      try {
        const op = OnePasswordConnect({
          serverURL: credentials.serverUrl,
          token: credentials.token,
          keepAlive: true,
        });
        const vaults = await op.listVaults();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(vaults, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to list vaults: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    '1password_get_vault',
    'Get details of a specific vault',
    {
      vaultId: z.string().describe('The ID of the vault to retrieve'),
    },
    async (args) => {
      try {
        const op = OnePasswordConnect({
          serverURL: credentials.serverUrl,
          token: credentials.token,
          keepAlive: true,
        });
        const vault = await op.getVault(args.vaultId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(vault, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get vault: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    '1password_list_items',
    'List all items in a vault',
    {
      vaultId: z.string().describe('The ID of the vault to list items from'),
    },
    async (args) => {
      try {
        const op = OnePasswordConnect({
          serverURL: credentials.serverUrl,
          token: credentials.token,
          keepAlive: true,
        });
        const items = await op.listItems(args.vaultId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(items, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to list items: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    '1password_get_item',
    'Get details of a specific item including its fields',
    {
      vaultId: z.string().describe('The ID of the vault containing the item'),
      itemId: z.string().describe('The ID of the item to retrieve'),
    },
    async (args) => {
      try {
        const op = OnePasswordConnect({
          serverURL: credentials.serverUrl,
          token: credentials.token,
          keepAlive: true,
        });
        const item = await op.getItem(args.vaultId, args.itemId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(item, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get item: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    '1password_search_items',
    'Search for items in a vault by title or field labels',
    {
      vaultId: z.string().describe('The ID of the vault to search in'),
      query: z
        .string()
        .describe('Search query to match against item titles and field labels'),
    },
    async (args) => {
      try {
        const op = OnePasswordConnect({
          serverURL: credentials.serverUrl,
          token: credentials.token,
          keepAlive: true,
        });
        const items = await op.listItems(args.vaultId);
        const index = await createIndex(items as unknown as Record<string, unknown>[], {
          maxResults: 20,
          threshold: 0.1,
        });
        const searchResults = await search(index, args.query);
        const filteredItems = searchResults.map((result) => result.item);

        // Format results as readable strings instead of JSON
        if (filteredItems.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No items found matching "${args.query}" in vault ${args.vaultId}`,
              },
            ],
          };
        }

        const formattedItems = filteredItems
          .map((item: unknown, index: number) => {
            const itemObj = item as Record<string, unknown>;
            const title = itemObj.title || itemObj.name || 'Untitled';
            const category = itemObj.category || 'Unknown';
            return `${index + 1}. ${title} (${category})`;
          })
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `Found ${filteredItems.length} item${filteredItems.length === 1 ? '' : 's'}:\n${formattedItems}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to search items: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    '1password_create_item',
    'Create a new item in a vault',
    {
      vaultId: z.string().describe('The ID of the vault to create the item in'),
      title: z.string().describe('Title of the new item'),
      category: z
        .string()
        .describe('Category of the item (e.g., LOGIN, SECURE_NOTE, PASSWORD, etc.)'),
      fields: z
        .array(
          z.object({
            type: z.string().describe('Field type (e.g., STRING, CONCEALED, URL, etc.)'),
            label: z.string().optional().describe('Field label'),
            value: z.string().optional().describe('Field value'),
            purpose: z
              .string()
              .optional()
              .describe('Field purpose (e.g., USERNAME, PASSWORD, etc.)'),
          })
        )
        .optional()
        .describe('Fields for the item'),
      sections: z
        .array(
          z.object({
            label: z.string().optional().describe('Section label'),
            fields: z
              .array(
                z.object({
                  type: z.string().describe('Field type'),
                  label: z.string().optional().describe('Field label'),
                  value: z.string().optional().describe('Field value'),
                  purpose: z.string().optional().describe('Field purpose'),
                })
              )
              .optional()
              .describe('Fields in this section'),
          })
        )
        .optional()
        .describe('Sections for organizing fields'),
    },
    async (args) => {
      try {
        const op = OnePasswordConnect({
          serverURL: credentials.serverUrl,
          token: credentials.token,
          keepAlive: true,
        });

        const itemBuilder = new ItemBuilder()
          .setTitle(args.title)
          .setCategory(args.category);

        if (args.fields) {
          for (const field of args.fields) {
            itemBuilder.addField({
              type: field.type as never,
              label: field.label,
              value: field.value,
              purpose: field.purpose as never,
            });
          }
        }

        if (args.sections) {
          for (const section of args.sections) {
            if (section.fields) {
              for (const field of section.fields) {
                itemBuilder.addField({
                  type: field.type as never,
                  label: field.label,
                  value: field.value,
                  purpose: field.purpose as never,
                  sectionName: section.label,
                });
              }
            }
          }
        }

        const newItem = itemBuilder.build();
        const item = await op.createItem(args.vaultId, newItem);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(item, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to create item: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    '1password_update_item',
    'Update an existing item in a vault',
    {
      vaultId: z.string().describe('The ID of the vault containing the item'),
      itemId: z.string().describe('The ID of the item to update'),
      title: z.string().optional().describe('New title for the item'),
      fields: z
        .array(
          z.object({
            type: z.string().describe('Field type'),
            label: z.string().optional().describe('Field label'),
            value: z.string().optional().describe('Field value'),
            purpose: z.string().optional().describe('Field purpose'),
          })
        )
        .optional()
        .describe('Updated fields for the item'),
      sections: z
        .array(
          z.object({
            label: z.string().optional().describe('Section label'),
            fields: z
              .array(
                z.object({
                  type: z.string().describe('Field type'),
                  label: z.string().optional().describe('Field label'),
                  value: z.string().optional().describe('Field value'),
                  purpose: z.string().optional().describe('Field purpose'),
                })
              )
              .optional()
              .describe('Fields in this section'),
          })
        )
        .optional()
        .describe('Updated sections for organizing fields'),
    },
    async (args) => {
      try {
        const op = OnePasswordConnect({
          serverURL: credentials.serverUrl,
          token: credentials.token,
          keepAlive: true,
        });

        const existingItem = await op.getItem(args.vaultId, args.itemId);

        if (args.title) {
          existingItem.title = args.title;
        }

        if (args.fields) {
          (existingItem as unknown as Record<string, unknown>).fields = args.fields;
        }

        if (args.sections) {
          (existingItem as unknown as Record<string, unknown>).sections = args.sections;
        }

        const updatedItem = await op.updateItem(args.vaultId, existingItem);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(updatedItem, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to update item: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    '1password_delete_item',
    'Delete an item from a vault',
    {
      vaultId: z.string().describe('The ID of the vault containing the item'),
      itemId: z.string().describe('The ID of the item to delete'),
    },
    async (args) => {
      try {
        const op = OnePasswordConnect({
          serverURL: credentials.serverUrl,
          token: credentials.token,
          keepAlive: true,
        });
        await op.deleteItem(args.vaultId, args.itemId);
        return {
          content: [
            {
              type: 'text',
              text: 'Item deleted successfully',
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to delete item: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  return server;
}

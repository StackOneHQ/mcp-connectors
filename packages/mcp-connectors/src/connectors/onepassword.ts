import { ItemBuilder, OnePasswordConnect } from '@1password/connect';
import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';
import { createIndex, search } from '../utils/lexical-search';

export const OnePasswordConnectorConfig = mcpConnectorConfig({
  name: '1Password',
  key: '1password',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/1password/filled/svg',
  credentials: z.object({
    serverUrl: z
      .string()
      .describe('1Password Connect server URL :: https://connect.1password.com'),
    token: z
      .string()
      .describe(
        '1Password Connect API token :: A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6 :: https://developer.1password.com/docs/connect/manage-connect/#manage-access-tokens'
      ),
  }),
  setup: z.object({}),
  examplePrompt:
    'List all my vaults, search for login credentials in my Personal vault, and create a new secure note with my WiFi password.',
  tools: (tool) => ({
    LIST_VAULTS: tool({
      name: '1password_list_vaults',
      description: 'List all accessible 1Password vaults',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { serverUrl, token } = await context.getCredentials();
          const op = OnePasswordConnect({
            serverURL: serverUrl,
            token,
            keepAlive: true,
          });
          const vaults = await op.listVaults();
          return JSON.stringify(vaults, null, 2);
        } catch (error) {
          return `Failed to list vaults: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_VAULT: tool({
      name: '1password_get_vault',
      description: 'Get details of a specific vault',
      schema: z.object({
        vaultId: z.string().describe('The ID of the vault to retrieve'),
      }),
      handler: async (args, context) => {
        try {
          const { serverUrl, token } = await context.getCredentials();
          const op = OnePasswordConnect({
            serverURL: serverUrl,
            token,
            keepAlive: true,
          });
          const vault = await op.getVault(args.vaultId);
          return JSON.stringify(vault, null, 2);
        } catch (error) {
          return `Failed to get vault: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_ITEMS: tool({
      name: '1password_list_items',
      description: 'List all items in a vault',
      schema: z.object({
        vaultId: z.string().describe('The ID of the vault to list items from'),
      }),
      handler: async (args, context) => {
        try {
          const { serverUrl, token } = await context.getCredentials();
          const op = OnePasswordConnect({
            serverURL: serverUrl,
            token,
            keepAlive: true,
          });
          const items = await op.listItems(args.vaultId);
          return JSON.stringify(items, null, 2);
        } catch (error) {
          return `Failed to list items: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_ITEM: tool({
      name: '1password_get_item',
      description: 'Get details of a specific item including its fields',
      schema: z.object({
        vaultId: z.string().describe('The ID of the vault containing the item'),
        itemId: z.string().describe('The ID of the item to retrieve'),
      }),
      handler: async (args, context) => {
        try {
          const { serverUrl, token } = await context.getCredentials();
          const op = OnePasswordConnect({
            serverURL: serverUrl,
            token,
            keepAlive: true,
          });
          const item = await op.getItem(args.vaultId, args.itemId);
          return JSON.stringify(item, null, 2);
        } catch (error) {
          return `Failed to get item: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    SEARCH_ITEMS: tool({
      name: '1password_search_items',
      description: 'Search for items in a vault by title or field labels',
      schema: z.object({
        vaultId: z.string().describe('The ID of the vault to search in'),
        query: z
          .string()
          .describe('Search query to match against item titles and field labels'),
      }),
      handler: async (args, context) => {
        try {
          const { serverUrl, token } = await context.getCredentials();
          const op = OnePasswordConnect({
            serverURL: serverUrl,
            token,
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
            return `No items found matching "${args.query}" in vault ${args.vaultId}`;
          }

          const formattedItems = filteredItems
            .map((item: unknown, index: number) => {
              const itemObj = item as Record<string, unknown>;
              const title = itemObj.title || itemObj.name || 'Untitled';
              const category = itemObj.category || 'Unknown';
              return `${index + 1}. ${title} (${category})`;
            })
            .join('\n');

          return `Found ${filteredItems.length} item${filteredItems.length === 1 ? '' : 's'}:\n${formattedItems}`;
        } catch (error) {
          return `Failed to search items: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    CREATE_ITEM: tool({
      name: '1password_create_item',
      description: 'Create a new item in a vault',
      schema: z.object({
        vaultId: z.string().describe('The ID of the vault to create the item in'),
        title: z.string().describe('Title of the new item'),
        category: z
          .string()
          .describe('Category of the item (e.g., LOGIN, SECURE_NOTE, PASSWORD, etc.)'),
        fields: z
          .array(
            z.object({
              type: z
                .string()
                .describe('Field type (e.g., STRING, CONCEALED, URL, etc.)'),
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
      }),
      handler: async (args, context) => {
        try {
          const { serverUrl, token } = await context.getCredentials();
          const op = OnePasswordConnect({
            serverURL: serverUrl,
            token,
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
          return JSON.stringify(item, null, 2);
        } catch (error) {
          return `Failed to create item: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    UPDATE_ITEM: tool({
      name: '1password_update_item',
      description: 'Update an existing item in a vault',
      schema: z.object({
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
      }),
      handler: async (args, context) => {
        try {
          const { serverUrl, token } = await context.getCredentials();
          const op = OnePasswordConnect({
            serverURL: serverUrl,
            token,
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
          return JSON.stringify(updatedItem, null, 2);
        } catch (error) {
          return `Failed to update item: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    DELETE_ITEM: tool({
      name: '1password_delete_item',
      description: 'Delete an item from a vault',
      schema: z.object({
        vaultId: z.string().describe('The ID of the vault containing the item'),
        itemId: z.string().describe('The ID of the item to delete'),
      }),
      handler: async (args, context) => {
        try {
          const { serverUrl, token } = await context.getCredentials();
          const op = OnePasswordConnect({
            serverURL: serverUrl,
            token,
            keepAlive: true,
          });
          await op.deleteItem(args.vaultId, args.itemId);
          return 'Item deleted successfully';
        } catch (error) {
          return `Failed to delete item: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

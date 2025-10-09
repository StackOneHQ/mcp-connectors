import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';
import { createIndex, search } from '../utils/lexical-search';

interface UnipileAccount {
  id: string;
  name: string;
  type: string;
  created_at: string;
  sources: Array<{
    id: string;
    status: string;
    [key: string]: unknown;
  }>;
  connection_params?: any;
  groups?: any[];
  [key: string]: unknown;
}

interface UnipileAccountsResponse {
  items: UnipileAccount[];
  cursor?: string;
  [key: string]: unknown;
}

interface UnipileChat {
  id: string;
  name: string | null;
  type: number;
  folder: string[];
  unread: number;
  archived: number;
  read_only: number;
  timestamp: string;
  account_id: string;
  account_type?: string;
  unread_count: number;
  provider_id: string;
  attendee_provider_id: string;
  muted_until?: string | null;
  [key: string]: unknown;
}

interface UnipileChatsResponse {
  items: UnipileChat[];
  cursor?: string;
  [key: string]: unknown;
}

interface UnipileMessage {
  id: string;
  text: string | null;
  timestamp: string;
  sender_id: string;
  chat_id: string;
  account_id: string;
  provider_id: string;
  chat_provider_id: string;
  sender_attendee_id: string;
  seen: number;
  edited: number;
  hidden: number;
  deleted: number;
  delivered: number;
  is_sender: number;
  is_event: number;
  attachments: Array<{
    id: string;
    type: string;
    mimetype?: string;
    size?: any;
    gif?: boolean;
    unavailable: boolean;
  }>;
  reactions: any[];
  seen_by: Record<string, unknown>;
  behavior?: any;
  original?: string;
  event_type?: number;
  quoted?: {
    text: string;
    sender_id: string;
    attachments: any[];
    provider_id: string;
  };
  subject?: string | null;
  chat_info?: {
    id: string;
    name: string;
    account_type: string;
    account_id: string;
  };
  [key: string]: unknown;
}

interface UnipileMessagesResponse {
  items: UnipileMessage[];
  cursor?: string;
  [key: string]: unknown;
}

interface UnipileEmail {
  id: string;
  subject: string;
  date: string;
  role: string;
  folders: string[];
  has_attachments: boolean;
  from?: string;
  to: string[];
  cc: string[];
  body_markdown?: string;
  attachments?: Array<{
    name: string;
    size: number;
    type: string;
  }>;
  [key: string]: unknown;
}

interface UnipileEmailsResponse {
  items: UnipileEmail[];
  cursor?: string;
  [key: string]: unknown;
}

class UnipileClient {
  private baseUrl: string;
  private headers: { 'X-API-Key': string; 'Content-Type': string };

  constructor(dsn: string, apiKey: string) {
    this.baseUrl = dsn.startsWith('http') ? dsn : `https://${dsn}`;
    this.headers = {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    };
  }

  async getAccounts(): Promise<UnipileAccountsResponse> {
    const response = await fetch(`${this.baseUrl}/accounts`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch accounts: ${response.statusText}`);
    }

    return response.json() as Promise<UnipileAccountsResponse>;
  }

  async getChats(accountId: string, limit = 10): Promise<UnipileChatsResponse> {
    const cleanAccountId = accountId.replace(/_[A-Z]+$/, '');
    const params = new URLSearchParams({
      account_id: cleanAccountId,
      limit: limit.toString(),
    });

    const response = await fetch(`${this.baseUrl}/chats?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch chats: ${response.statusText}`);
    }

    return response.json() as Promise<UnipileChatsResponse>;
  }

  async getMessages(chatId: string, batchSize = 100): Promise<UnipileMessagesResponse> {
    const params = new URLSearchParams({
      chat_id: chatId,
      batch_size: batchSize.toString(),
    });

    const response = await fetch(`${this.baseUrl}/messages?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch messages: ${response.statusText}`);
    }

    return response.json() as Promise<UnipileMessagesResponse>;
  }

  async getEmails(accountId: string, limit = 10): Promise<UnipileEmailsResponse> {
    const cleanAccountId = accountId.replace(/_[A-Z]+$/, '');
    const params = new URLSearchParams({
      account_id: cleanAccountId,
      limit: limit.toString(),
    });

    const response = await fetch(`${this.baseUrl}/emails?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch emails: ${response.statusText}`);
    }

    return response.json() as Promise<UnipileEmailsResponse>;
  }

  async getAllMessages(accountId: string, limit = 10): Promise<UnipileMessage[]> {
    const chatsResponse = await this.getChats(accountId, limit);
    const allMessages: UnipileMessage[] = [];

    for (const chat of chatsResponse.items) {
      try {
        const messagesResponse = await this.getMessages(chat.id);
        const messagesWithChatInfo = messagesResponse.items.map((message) => ({
          ...message,
          chat_info: {
            id: chat.id,
            name: chat.name || 'Unnamed',
            account_type: chat.account_type || 'WHATSAPP',
            account_id: chat.account_id,
          },
        }));
        allMessages.push(...messagesWithChatInfo);
      } catch (error) {
        // Continue with other chats if one fails
        console.warn(`Failed to fetch messages for chat ${chat.id}:`, error);
      }
    }

    return allMessages;
  }

  async sendMessage(chatId: string, text: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/chats/${chatId}/messages`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        text: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }

    return response.json();
  }
}

export const UnipileConnectorConfig = mcpConnectorConfig({
  name: 'Unipile',
  key: 'unipile',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/unipile/filled/svg',
  credentials: z.object({
    dsn: z
      .string()
      .describe(
        'Unipile DSN endpoint :: api8.unipile.com:13851 :: Get from your Unipile dashboard'
      ),
    apiKey: z
      .string()
      .describe(
        'Unipile API Key :: your-api-key-here :: Get from your Unipile dashboard'
      ),
  }),
  setup: z.object({}),
  examplePrompt:
    'Get all connected accounts, list messages from LinkedIn, retrieve recent emails, and get chat messages from a specific conversation.',
  tools: (tool) => ({
    GET_ACCOUNTS: tool({
      name: 'unipile_get_accounts',
      description:
        'Get all connected messaging accounts from supported platforms: Mobile, Mail, WhatsApp, LinkedIn, Slack, Twitter, Telegram, Instagram, Messenger. Returns clean account details including ID, name, type, status, source_id, and creation date.',
      schema: z.object({}),
      handler: async (args, context) => {
        try {
          const { dsn, apiKey } = await context.getCredentials();
          const client = new UnipileClient(dsn, apiKey);
          const response = await client.getAccounts();

          // Transform response to include only useful fields for LLM
          const cleanedAccounts = response.items.map((account) => ({
            id: account.id,
            name: account.name,
            type: account.type,
            created_at: account.created_at,
            status: account.sources?.[0]?.status || 'UNKNOWN',
            source_id: account.sources?.[0]?.id || account.id,
          }));

          return JSON.stringify({
            accounts: cleanedAccounts,
            count: cleanedAccounts.length,
          });
        } catch (error) {
          return JSON.stringify({
            error: `Failed to get accounts: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      },
    }),
    GET_CHATS: tool({
      name: 'unipile_get_chats',
      description:
        'Get the most recent chats for a specific account, ordered by timestamp (newest first). Supports messaging platforms: Mobile, Mail, WhatsApp, LinkedIn, Slack, Twitter, Telegram, Instagram, Messenger.',
      schema: z.object({
        account_id: z
          .string()
          .describe(
            "The ID of the account to get chats from. Use the source ID from the account's sources array."
          ),

        limit: z
          .number()
          .optional()
          .describe('Maximum number of chats to return (default: 10)'),
      }),
      handler: async (args, context) => {
        try {
          const { dsn, apiKey } = await context.getCredentials();
          const client = new UnipileClient(dsn, apiKey);
          const response = await client.getChats(args.account_id, args.limit);

          // Transform response to include only essential fields for LLM
          const cleanedChats = response.items.map((chat) => ({
            id: chat.id,
            name: chat.name || 'Unnamed Chat',
            unread: chat.unread_count,
            timestamp: chat.timestamp,
          }));

          return JSON.stringify({
            chats: cleanedChats,
            count: cleanedChats.length,
          });
        } catch (error) {
          return JSON.stringify({
            error: `Failed to get chats: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      },
    }),
    GET_CHAT_MESSAGES: tool({
      name: 'unipile_get_chat_messages',
      description:
        'Get messages from a specific chat conversation. Returns clean message data with text, timestamps, and sender info. Much more focused than GET_RECENT_MESSAGES.',
      schema: z.object({
        chat_id: z.string().describe('The ID of the chat to get messages from'),
        batch_size: z
          .number()
          .optional()
          .describe('Number of messages to return (default: all available messages)'),
      }),
      handler: async (args, context) => {
        try {
          const { dsn, apiKey } = await context.getCredentials();
          const client = new UnipileClient(dsn, apiKey);
          const response = await client.getMessages(args.chat_id, args.batch_size);

          // Transform response to include only essential fields for LLM
          const items = response.items || response;
          if (!Array.isArray(items)) {
            return JSON.stringify({
              error: 'Unexpected response format',
              raw_response: response,
            });
          }

          const cleanedMessages = items.map((message) => ({
            id: message.id,
            text: message.text || '[No text content]',
            timestamp: message.timestamp,
            is_sender: message.is_sender === 1,
            has_attachments: message.attachments?.length > 0,
            quoted_text: message.quoted?.text || null,
          }));

          // Apply our own batch_size filtering if specified
          const finalMessages = args.batch_size
            ? cleanedMessages.slice(0, args.batch_size)
            : cleanedMessages;

          return JSON.stringify({
            messages: finalMessages,
            count: finalMessages.length,
            total_available: cleanedMessages.length,
          });
        } catch (error) {
          return JSON.stringify({
            error: `Failed to get chat messages: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      },
    }),
    GET_RECENT_MESSAGES: tool({
      name: 'unipile_get_recent_messages',
      description:
        'Get recent messages from all chats associated with a specific account. ⚠️ WARNING: This returns A LOT of data from multiple chats. RECOMMENDED: Use GET_CHATS first to see available chats, then use GET_CHAT_MESSAGES for specific conversations. Only use this for broad message overview.',
      schema: z.object({
        account_id: z
          .string()
          .describe(
            "The source ID of the account to get messages from. Use the id from the account's sources array."
          ),
        batch_size: z
          .number()
          .optional()
          .describe('Number of messages to return (default: all available messages)'),
      }),
      handler: async (args, context) => {
        try {
          const { dsn, apiKey } = await context.getCredentials();
          const client = new UnipileClient(dsn, apiKey);
          const messages = await client.getAllMessages(args.account_id, args.batch_size);

          // Transform response to include only essential fields for LLM
          const items = Array.isArray(messages)
            ? messages
            : (messages as any).items || [];
          if (!Array.isArray(items)) {
            return JSON.stringify({
              error: 'Unexpected response format',
              raw_response: messages,
            });
          }

          const cleanedMessages = items.map((message) => ({
            id: message.id,
            text: message.text || '[No text content]',
            timestamp: message.timestamp,
            is_sender: message.is_sender === 1,
            chat_name: message.chat_info?.name || 'Unknown Chat',
            chat_id: message.chat_id,
            has_attachments: message.attachments?.length > 0,
            quoted_text: message.quoted?.text || null,
          }));

          // Apply our own batch_size filtering if specified
          const finalMessages = args.batch_size
            ? cleanedMessages.slice(0, args.batch_size)
            : cleanedMessages;

          return JSON.stringify({
            messages: finalMessages,
            count: finalMessages.length,
            total_available: cleanedMessages.length,
            warning:
              'This tool returns data from multiple chats. Consider using GET_CHATS then GET_CHAT_MESSAGES for specific conversations.',
          });
        } catch (error) {
          return JSON.stringify({
            error: `Failed to get recent messages: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      },
    }),
    GET_EMAILS: tool({
      name: 'unipile_get_emails',
      description:
        'Get recent emails from a specific account. Returns email details including subject, body in markdown format, sender, recipients, attachments, and metadata. URLs are automatically removed from the email body for security.',
      schema: z.object({
        account_id: z.string().describe('The ID of the account to get emails from'),
        limit: z
          .number()
          .optional()
          .describe('Maximum number of emails to return (default: 10)'),
      }),
      handler: async (args, context) => {
        try {
          const { dsn, apiKey } = await context.getCredentials();
          const client = new UnipileClient(dsn, apiKey);
          const response = await client.getEmails(args.account_id, args.limit);
          return JSON.stringify(response);
        } catch (error) {
          return JSON.stringify({
            error: `Failed to get emails: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      },
    }),
    SEND_MESSAGE: tool({
      name: 'unipile_send_message',
      description:
        'Send a text message to a specific chat. IMPORTANT: If user says "message [person name]", first use SEARCH_CONTACTS to find their chat_id, then use this tool. Works with all messaging platforms: WhatsApp, LinkedIn, Slack, Twitter, Telegram, Instagram, Messenger. Automatically tracks message count for all contacts.',
      schema: z.object({
        chat_id: z.string().describe('The ID of the chat to send the message to'),
        text: z.string().describe('The text message to send'),
        contact_name: z
          .string()
          .optional()
          .describe('Name of the contact (optional, helps with contact tracking)'),
        platform: z
          .string()
          .optional()
          .describe('Platform type (e.g., WHATSAPP, LINKEDIN) - stored in custom_fields'),
        account_id: z
          .string()
          .optional()
          .describe('Account ID - stored in custom_fields'),
      }),
      handler: async (args, context) => {
        try {
          const { dsn, apiKey } = await context.getCredentials();
          const client = new UnipileClient(dsn, apiKey);

          // Send the message
          const response = await client.sendMessage(args.chat_id, args.text);

          // Track message count for any contact (automatic frequency tracking)
          if (args.chat_id) {
            const contactsData =
              (await context.getData<Record<string, any>>('unipile_contacts')) || {};
            const now = new Date().toISOString();

            if (contactsData[args.chat_id]) {
              // Update existing contact - preserve all existing fields, just increment message count
              contactsData[args.chat_id] = {
                ...contactsData[args.chat_id],
                message_count: (contactsData[args.chat_id].message_count || 0) + 1,
                updated_at: now,
                // Update name if provided and different
                ...(args.contact_name &&
                args.contact_name !== contactsData[args.chat_id].name
                  ? { name: args.contact_name }
                  : {}),
              };
            } else {
              // Create minimal contact for message tracking (user can enrich later with SAVE_CONTACT)
              contactsData[args.chat_id] = {
                id: args.chat_id,
                name: args.contact_name || 'Unknown Contact',
                message_count: 1,
                created_at: now,
                updated_at: now,
                // Store platform info in custom_fields to maintain schema consistency
                custom_fields: {
                  platform: args.platform,
                  account_id: args.account_id,
                },
              };
            }

            await context.setData('unipile_contacts', contactsData);
          }

          return JSON.stringify(response);
        } catch (error) {
          return JSON.stringify({
            error: `Failed to send message: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      },
    }),
    GET_ALL_STORED_CONTACTS: tool({
      name: 'unipile_get_all_stored_contacts',
      description:
        'Get all stored contacts from MCP persistent memory with complete field details including phone_number, whatsapp_chat_id, linkedin_chat_id, custom_fields, and notes.',
      schema: z.object({
        include_details: z
          .boolean()
          .optional()
          .describe('Include full contact details (default: true)'),
      }),
      handler: async (args, context) => {
        try {
          // Use MCP's built-in persistence
          const contactsData =
            (await context.getData<Record<string, any>>('unipile_contacts')) || {};
          const contacts = Object.values(contactsData);

          if (args.include_details === false) {
            // Return minimal info if requested
            const minimalContacts = contacts.map((contact) => ({
              id: contact.id,
              name: contact.name,
              created_at: contact.created_at,
              updated_at: contact.updated_at,
            }));
            return JSON.stringify({ contacts: minimalContacts, count: contacts.length });
          }

          return JSON.stringify({
            contacts,
            count: contacts.length,
            fields_available: [
              'id',
              'name',
              'phone_number',
              'whatsapp_chat_id',
              'linkedin_chat_id',
              'email',
              'custom_fields',
              'notes',
              'message_count',
              'created_at',
              'updated_at',
            ],
          });
        } catch (error) {
          return JSON.stringify({
            error: `Failed to get stored contacts: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      },
    }),
    SAVE_CONTACT: tool({
      name: 'unipile_save_contact',
      description:
        'Save contact details. Use this proactively to save frequently messaged contacts. Use phone_number (not "phone"), whatsapp_chat_id (not in custom_fields) for proper field mapping. When saving contacts from WhatsApp chats, ALWAYS include both phone_number and whatsapp_chat_id from the chat data.',
      schema: z.object({
        name: z.string().describe('Contact name (required)'),
        phone_number: z
          .string()
          .optional()
          .describe('Phone number for WhatsApp/SMS - USE THIS FIELD, not "phone"'),
        whatsapp_chat_id: z
          .string()
          .optional()
          .describe(
            'WhatsApp chat ID from Unipile for direct messaging - USE THIS FIELD, not custom_fields'
          ),
        linkedin_chat_id: z
          .string()
          .optional()
          .describe('LinkedIn chat ID from Unipile for direct messaging'),
        email: z.string().optional().describe('Email address'),
        custom_fields: z
          .record(z.any())
          .optional()
          .describe('Additional fields like company, birthday, etc. (key-value pairs)'),
        notes: z.string().optional().describe('Additional notes about the contact'),
      }),
      handler: async (args, context) => {
        try {
          const contactsData =
            (await context.getData<Record<string, any>>('unipile_contacts')) || {};
          const now = new Date().toISOString();

          // Use whatsapp_chat_id as primary ID, fallback to phone_number or create a hash
          const contactId =
            args.whatsapp_chat_id ||
            args.linkedin_chat_id ||
            args.phone_number ||
            `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          // Build the contact object
          const contactData = {
            id: contactId,
            name: args.name,
            phone_number: args.phone_number,
            whatsapp_chat_id: args.whatsapp_chat_id,
            linkedin_chat_id: args.linkedin_chat_id,
            email: args.email,
            notes: args.notes,
            custom_fields: args.custom_fields || {},
            message_count: contactsData[contactId]?.message_count || 0, // Preserve existing message count
            created_at: contactsData[contactId]?.created_at || now,
            updated_at: now,
          };

          // Remove undefined fields to keep the data clean
          Object.keys(contactData).forEach((key) => {
            if ((contactData as any)[key] === undefined) {
              delete (contactData as any)[key];
            }
          });

          contactsData[contactId] = contactData;
          await context.setData('unipile_contacts', contactsData);

          return JSON.stringify({
            success: true,
            message: `Contact "${args.name}" saved successfully`,
            contact_id: contactId,
            contact: contactData,
          });
        } catch (error) {
          return JSON.stringify({
            error: `Failed to save contact: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      },
    }),
    UPDATE_CONTACT: tool({
      name: 'unipile_update_contact',
      description:
        'Update an existing contact with new information. Use contact_id from previously saved contacts. IMPORTANT: Use phone_number (not "phone"), whatsapp_chat_id (not in custom_fields) for proper field mapping. Only updates provided fields, preserves existing data.',
      schema: z.object({
        contact_id: z
          .string()
          .describe('ID of the contact to update (from previous save/get operations)'),
        name: z.string().optional().describe('Update contact name'),
        phone_number: z
          .string()
          .optional()
          .describe('Update phone number - USE THIS FIELD, not "phone"'),
        whatsapp_chat_id: z
          .string()
          .optional()
          .describe(
            'Update WhatsApp chat ID from Unipile - USE THIS FIELD, not custom_fields'
          ),
        linkedin_chat_id: z
          .string()
          .optional()
          .describe('Update LinkedIn chat ID from Unipile'),
        email: z.string().optional().describe('Update email address'),
        custom_fields: z
          .record(z.any())
          .optional()
          .describe('Update or add custom fields (merges with existing)'),
        notes: z.string().optional().describe('Update notes about the contact'),
      }),
      handler: async (args, context) => {
        try {
          const contactsData =
            (await context.getData<Record<string, any>>('unipile_contacts')) || {};

          if (!contactsData[args.contact_id]) {
            return JSON.stringify({
              error: `Contact with ID "${args.contact_id}" not found`,
              available_contacts: Object.keys(contactsData),
            });
          }

          const existingContact = contactsData[args.contact_id];
          const now = new Date().toISOString();

          // Build updated contact by merging new data with existing
          const updatedContact = {
            ...existingContact,
            name: args.name ?? existingContact.name,
            phone_number: args.phone_number ?? existingContact.phone_number,
            whatsapp_chat_id: args.whatsapp_chat_id ?? existingContact.whatsapp_chat_id,
            linkedin_chat_id: args.linkedin_chat_id ?? existingContact.linkedin_chat_id,
            email: args.email ?? existingContact.email,
            notes: args.notes ?? existingContact.notes,
            custom_fields: {
              ...(existingContact.custom_fields || {}),
              ...(args.custom_fields || {}),
            },
            message_count: existingContact.message_count || 0, // Preserve message count
            updated_at: now,
          };

          // Remove undefined fields to keep data clean
          Object.keys(updatedContact).forEach((key) => {
            if ((updatedContact as any)[key] === undefined) {
              delete (updatedContact as any)[key];
            }
          });

          contactsData[args.contact_id] = updatedContact;
          await context.setData('unipile_contacts', contactsData);

          return JSON.stringify({
            success: true,
            message: `Contact "${updatedContact.name}" updated successfully`,
            contact_id: args.contact_id,
            contact: updatedContact,
          });
        } catch (error) {
          return JSON.stringify({
            error: `Failed to update contact: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      },
    }),
    CLEAR_CONTACT_MEMORY: tool({
      name: 'unipile_clear_contact_memory',
      description: 'Clear all stored contact frequency data from MCP persistent memory.',
      schema: z.object({}),
      handler: async (args, context) => {
        try {
          // Use MCP's built-in persistence
          await context.setData('unipile_contacts', {});
          return JSON.stringify({
            success: true,
            message: 'Contact memory cleared using MCP persistence',
          });
        } catch (error) {
          return JSON.stringify({
            error: `Failed to clear contact memory: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      },
    }),
    SEARCH_CONTACTS: tool({
      name: 'unipile_search_contacts',
      description:
        'Smart contact search that finds people by name. First checks stored contacts, then progressively searches chat history (last week → last month) using intelligent text matching. Use this when user says "message [person name]" to find their chat_id for messaging.',
      schema: z.object({
        query: z
          .string()
          .describe('Name or partial name to search for (e.g., "Jiro", "Jiro Blogs")'),
        account_type: z
          .enum([
            'WHATSAPP',
            'LINKEDIN',
            'SLACK',
            'TWITTER',
            'MESSENGER',
            'INSTAGRAM',
            'TELEGRAM',
          ])
          .optional()
          .describe('Platform to search in (optional)'),
        account_id: z
          .string()
          .optional()
          .describe('Specific account ID to search in (optional)'),
      }),
      handler: async (args, context) => {
        try {
          const { dsn, apiKey } = await context.getCredentials();
          const searchResults: any[] = [];

          // Stage 1: Search stored contacts first (instant)
          const contactsData =
            (await context.getData<Record<string, any>>('unipile_contacts')) || {};
          const storedContacts = Object.values(contactsData);

          if (storedContacts.length > 0) {
            const contactIndex = await createIndex(storedContacts, {
              fields: ['name', 'phone_number', 'notes'],
              threshold: 0.1,
              maxResults: 5,
            });
            const contactMatches = await search(contactIndex, args.query);

            if (contactMatches.length > 0) {
              searchResults.push({
                source: 'stored_contacts',
                matches: contactMatches.map((match) => ({
                  ...match.item,
                  score: match.score,
                  confidence: 'high',
                })),
              });
            }
          }

          // Stage 2-4: Progressive chat search (last week → last month)
          const now = new Date();
          const searchStages = [
            { period: '7 days', limit: 20, days: 7 },
            { period: '7 days', limit: 100, days: 7 },
            { period: '30 days', limit: 100, days: 30 },
          ];

          for (const stage of searchStages) {
            // Only search chats if we haven't found high-confidence matches yet
            const hasHighConfidenceMatch = searchResults.some((result) =>
              result.matches.some((match: any) => match.score > 0.5)
            );

            if (hasHighConfidenceMatch) break;

            const afterDate = new Date(now.getTime() - stage.days * 24 * 60 * 60 * 1000);

            // Build API call directly since getChats method doesn't support all parameters
            const chatsParams = new URLSearchParams({
              limit: stage.limit.toString(),
              after: afterDate.toISOString(),
            });

            if (args.account_type) chatsParams.append('account_type', args.account_type);
            if (args.account_id) chatsParams.append('account_id', args.account_id);

            const baseUrl = dsn.startsWith('http') ? dsn : `https://${dsn}`;
            const response = await fetch(`${baseUrl}/chats?${chatsParams.toString()}`, {
              headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json',
              },
            });

            if (!response.ok) {
              throw new Error(`API call failed: ${response.status}`);
            }

            const chatsResponse = (await response.json()) as UnipileChatsResponse;
            const chats = chatsResponse.items || [];

            if (chats.length > 0) {
              const chatIndex = await createIndex(chats, {
                fields: ['name'],
                threshold: 0.1,
                maxResults: 10,
              });
              const chatMatches = await search(chatIndex, args.query);

              if (chatMatches.length > 0) {
                searchResults.push({
                  source: `chats_${stage.period}_${stage.limit}`,
                  period: stage.period,
                  searched_chats: chats.length,
                  matches: chatMatches.map((match) => ({
                    id: match.item.id,
                    name: match.item.name || 'Unknown Chat',
                    unread: match.item.unread_count,
                    timestamp: match.item.timestamp,
                    score: match.score,
                    confidence: match.score > 0.5 ? 'high' : 'medium',
                  })),
                });
              }
            }
          }

          // Summary and recommendations
          const allMatches = searchResults.flatMap((result) => result.matches);
          const bestMatch = allMatches.reduce(
            (best, current) => (current.score > (best?.score || 0) ? current : best),
            null
          );

          return JSON.stringify({
            query: args.query,
            found_contacts: allMatches.length > 0,
            best_match: bestMatch,
            search_stages: searchResults,
            total_matches: allMatches.length,
            recommendation: bestMatch
              ? `Found "${bestMatch.name}" with ${bestMatch.confidence} confidence. Use chat_id: ${bestMatch.id || bestMatch.whatsapp_chat_id}`
              : `No contacts found matching "${args.query}". You may need to search message content or this person hasn't been messaged recently.`,
            suggested_next_steps: bestMatch
              ? [
                  `SEND_MESSAGE with chat_id: ${bestMatch.id || bestMatch.whatsapp_chat_id}`,
                ]
              : [
                  `Try GET_RECENT_MESSAGES and search content`,
                  `Use SAVE_CONTACT to add this person manually`,
                ],
          });
        } catch (error) {
          return JSON.stringify({
            error: `Contact search failed: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      },
    }),
  }),
  resources: (resource) => ({
    ACCOUNTS: resource({
      name: 'unipile_accounts',
      description:
        'List of connected messaging accounts from supported platforms: Mobile, Mail, WhatsApp, LinkedIn, Slack, Twitter, Telegram, Instagram, Messenger',
      uri: 'unipile://accounts',
      mimeType: 'application/json',
      handler: async (context) => {
        try {
          const { dsn, apiKey } = await context.getCredentials();
          const client = new UnipileClient(dsn, apiKey);
          const response = await client.getAccounts();

          // Transform response to include only useful fields for LLM
          const cleanedAccounts = response.items.map((account) => ({
            id: account.id,
            name: account.name,
            type: account.type,
            created_at: account.created_at,
            status: account.sources?.[0]?.status || 'UNKNOWN',
            source_id: account.sources?.[0]?.id || account.id,
          }));

          return JSON.stringify({
            accounts: cleanedAccounts,
            count: cleanedAccounts.length,
          });
        } catch (error) {
          return JSON.stringify({
            error: `Failed to get accounts: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      },
    }),
  }),
});

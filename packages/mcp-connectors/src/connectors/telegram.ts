import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  added_to_attachment_menu?: boolean;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  sender_chat?: TelegramChat;
  date: number;
  chat: TelegramChat;
  text?: string;
  caption?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
  edited_channel_post?: TelegramMessage;
  inline_query?: unknown;
  chosen_inline_result?: unknown;
  callback_query?: unknown;
}

interface TelegramResponse<T = unknown> {
  ok: boolean;
  result?: T;
  error_code?: number;
  description?: string;
}

interface TelegramFile {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
}

class TelegramClient {
  private baseUrl: string;

  constructor(
    private botToken: string
  ) {
    this.baseUrl = `https://api.telegram.org/bot${botToken}`;
  }

  private async makeRequest<T = unknown>(
    method: string,
    params: Record<string, unknown> = {}
  ): Promise<TelegramResponse<T>> {
    const url = `${this.baseUrl}/${method}`;

    // Filter out undefined values
    const filteredParams = Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== undefined)
    );

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(filteredParams),
    });

    return response.json() as Promise<TelegramResponse<T>>;
  }

  async getMe(): Promise<TelegramResponse<TelegramUser>> {
    return this.makeRequest<TelegramUser>('getMe');
  }

  async sendMessage(
    chatId: string | number,
    text: string,
    options: {
      parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
      disable_web_page_preview?: boolean;
      disable_notification?: boolean;
      reply_to_message_id?: number;
    } = {}
  ): Promise<TelegramResponse<TelegramMessage>> {
    return this.makeRequest<TelegramMessage>('sendMessage', {
      chat_id: chatId,
      text,
      ...options,
    });
  }

  async sendPhoto(
    chatId: string | number,
    photo: string,
    options: {
      caption?: string;
      parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
      disable_notification?: boolean;
      reply_to_message_id?: number;
    } = {}
  ): Promise<TelegramResponse<TelegramMessage>> {
    return this.makeRequest<TelegramMessage>('sendPhoto', {
      chat_id: chatId,
      photo,
      ...options,
    });
  }

  async sendDocument(
    chatId: string | number,
    document: string,
    options: {
      caption?: string;
      parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
      disable_notification?: boolean;
      reply_to_message_id?: number;
    } = {}
  ): Promise<TelegramResponse<TelegramMessage>> {
    return this.makeRequest<TelegramMessage>('sendDocument', {
      chat_id: chatId,
      document,
      ...options,
    });
  }

  async editMessageText(
    chatId: string | number,
    messageId: number,
    text: string,
    options: {
      parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
      disable_web_page_preview?: boolean;
    } = {}
  ): Promise<TelegramResponse<TelegramMessage | boolean>> {
    return this.makeRequest<TelegramMessage | boolean>('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      ...options,
    });
  }

  async deleteMessage(
    chatId: string | number,
    messageId: number
  ): Promise<TelegramResponse<boolean>> {
    return this.makeRequest<boolean>('deleteMessage', {
      chat_id: chatId,
      message_id: messageId,
    });
  }

  async getUpdates(
    offset?: number,
    limit?: number,
    timeout?: number
  ): Promise<TelegramResponse<TelegramUpdate[]>> {
    return this.makeRequest<TelegramUpdate[]>('getUpdates', {
      offset,
      limit,
      timeout,
    });
  }

  async getChat(chatId: string | number): Promise<TelegramResponse<TelegramChat>> {
    return this.makeRequest<TelegramChat>('getChat', {
      chat_id: chatId,
    });
  }

  async getFile(fileId: string): Promise<TelegramResponse<TelegramFile>> {
    return this.makeRequest<TelegramFile>('getFile', {
      file_id: fileId,
    });
  }

  async answerCallbackQuery(
    callbackQueryId: string,
    options: {
      text?: string;
      show_alert?: boolean;
      url?: string;
      cache_time?: number;
    } = {}
  ): Promise<TelegramResponse<boolean>> {
    return this.makeRequest<boolean>('answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      ...options,
    });
  }

  getFileDownloadUrl(filePath: string): string {
    return `https://api.telegram.org/file/bot${this.botToken}/${filePath}`;
  }
}

export const TelegramConnectorConfig = mcpConnectorConfig({
  name: 'Telegram',
  key: 'telegram',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/telegram/filled/svg',
  credentials: z.object({
    botToken: z
      .string()
      .describe(
        'Telegram Bot Token obtained from @BotFather :: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11 :: https://core.telegram.org/bots#6-botfather'
      ),
  }),
  setup: z.object({
    defaultChatId: z
      .string()
      .optional()
      .describe(
        'Default chat ID to send messages to (can be user ID, group ID, or channel username) :: 123456789 or @mychannel'
      ),
  }),
  examplePrompt:
    'Send a message to my Telegram channel, get recent updates, send a photo with caption, and get bot information.',
  tools: (tool) => ({
    GET_ME: tool({
      name: 'telegram_get_me',
      description: 'Get basic information about the bot',
      schema: z.object({}),
      handler: async (_, context) => {
        try {
          const { botToken } = await context.getCredentials();
          const client = new TelegramClient(botToken);
          const response = await client.getMe();
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to get bot information: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    SEND_MESSAGE: tool({
      name: 'telegram_send_message',
      description: 'Send a text message to a chat',
      schema: z.object({
        chat_id: z
          .string()
          .optional()
          .describe(
            'Chat ID to send message to. If not provided, uses default chat ID from setup'
          ),
        text: z.string().min(1).max(4096).describe('Message text to send (1-4096 characters)'),
        parse_mode: z
          .enum(['HTML', 'Markdown', 'MarkdownV2'])
          .optional()
          .describe('Parse mode for message formatting'),
        disable_web_page_preview: z
          .boolean()
          .optional()
          .describe('Disables link previews for links in this message'),
        disable_notification: z
          .boolean()
          .optional()
          .describe('Sends the message silently'),
        reply_to_message_id: z.number().optional().describe('Message ID to reply to'),
      }),
      handler: async (args, context) => {
        try {
          const { botToken } = await context.getCredentials();
          const { defaultChatId } = await context.getSetup();
          const client = new TelegramClient(botToken);

          const chatId = args.chat_id || defaultChatId;
          if (!chatId) {
            return 'Error: No chat_id provided and no default chat ID configured in setup';
          }

          const response = await client.sendMessage(chatId, args.text, {
            parse_mode: args.parse_mode,
            disable_web_page_preview: args.disable_web_page_preview,
            disable_notification: args.disable_notification,
            reply_to_message_id: args.reply_to_message_id,
          });
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to send message: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    SEND_PHOTO: tool({
      name: 'telegram_send_photo',
      description: 'Send a photo to a chat',
      schema: z.object({
        chat_id: z
          .string()
          .optional()
          .describe(
            'Chat ID to send photo to. If not provided, uses default chat ID from setup'
          ),
        photo: z
          .string()
          .describe(
            'Photo to send. Pass a file_id to resend a photo that exists on the Telegram servers, or pass an HTTP URL for Telegram to get a photo from the Internet'
          ),
        caption: z.string().max(1024).optional().describe('Photo caption (0-1024 characters)'),
        parse_mode: z
          .enum(['HTML', 'Markdown', 'MarkdownV2'])
          .optional()
          .describe('Parse mode for caption formatting'),
        disable_notification: z
          .boolean()
          .optional()
          .describe('Sends the message silently'),
        reply_to_message_id: z.number().optional().describe('Message ID to reply to'),
      }),
      handler: async (args, context) => {
        try {
          const { botToken } = await context.getCredentials();
          const { defaultChatId } = await context.getSetup();
          const client = new TelegramClient(botToken);

          const chatId = args.chat_id || defaultChatId;
          if (!chatId) {
            return 'Error: No chat_id provided and no default chat ID configured in setup';
          }

          const response = await client.sendPhoto(chatId, args.photo, {
            caption: args.caption,
            parse_mode: args.parse_mode,
            disable_notification: args.disable_notification,
            reply_to_message_id: args.reply_to_message_id,
          });
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to send photo: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    SEND_DOCUMENT: tool({
      name: 'telegram_send_document',
      description: 'Send a document to a chat',
      schema: z.object({
        chat_id: z
          .string()
          .optional()
          .describe(
            'Chat ID to send document to. If not provided, uses default chat ID from setup'
          ),
        document: z
          .string()
          .describe(
            'Document to send. Pass a file_id to resend a document that exists on the Telegram servers, or pass an HTTP URL for Telegram to get a document from the Internet'
          ),
        caption: z.string().max(1024).optional().describe('Document caption (0-1024 characters)'),
        parse_mode: z
          .enum(['HTML', 'Markdown', 'MarkdownV2'])
          .optional()
          .describe('Parse mode for caption formatting'),
        disable_notification: z
          .boolean()
          .optional()
          .describe('Sends the message silently'),
        reply_to_message_id: z.number().optional().describe('Message ID to reply to'),
      }),
      handler: async (args, context) => {
        try {
          const { botToken } = await context.getCredentials();
          const { defaultChatId } = await context.getSetup();
          const client = new TelegramClient(botToken);

          const chatId = args.chat_id || defaultChatId;
          if (!chatId) {
            return 'Error: No chat_id provided and no default chat ID configured in setup';
          }

          const response = await client.sendDocument(chatId, args.document, {
            caption: args.caption,
            parse_mode: args.parse_mode,
            disable_notification: args.disable_notification,
            reply_to_message_id: args.reply_to_message_id,
          });
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to send document: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    EDIT_MESSAGE: tool({
      name: 'telegram_edit_message',
      description: 'Edit text of a message sent by the bot',
      schema: z.object({
        chat_id: z
          .string()
          .optional()
          .describe(
            'Chat ID where the message was sent. If not provided, uses default chat ID from setup'
          ),
        message_id: z.number().describe('ID of the message to edit'),
        text: z.string().min(1).max(4096).describe('New text of the message (1-4096 characters)'),
        parse_mode: z
          .enum(['HTML', 'Markdown', 'MarkdownV2'])
          .optional()
          .describe('Parse mode for message formatting'),
        disable_web_page_preview: z
          .boolean()
          .optional()
          .describe('Disables link previews for links in this message'),
      }),
      handler: async (args, context) => {
        try {
          const { botToken } = await context.getCredentials();
          const { defaultChatId } = await context.getSetup();
          const client = new TelegramClient(botToken);

          const chatId = args.chat_id || defaultChatId;
          if (!chatId) {
            return 'Error: No chat_id provided and no default chat ID configured in setup';
          }

          const response = await client.editMessageText(
            chatId,
            args.message_id,
            args.text,
            {
              parse_mode: args.parse_mode,
              disable_web_page_preview: args.disable_web_page_preview,
            }
          );
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to edit message: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    DELETE_MESSAGE: tool({
      name: 'telegram_delete_message',
      description: 'Delete a message sent by the bot',
      schema: z.object({
        chat_id: z
          .string()
          .optional()
          .describe(
            'Chat ID where the message was sent. If not provided, uses default chat ID from setup'
          ),
        message_id: z.number().describe('ID of the message to delete'),
      }),
      handler: async (args, context) => {
        try {
          const { botToken } = await context.getCredentials();
          const { defaultChatId } = await context.getSetup();
          const client = new TelegramClient(botToken);

          const chatId = args.chat_id || defaultChatId;
          if (!chatId) {
            return 'Error: No chat_id provided and no default chat ID configured in setup';
          }

          const response = await client.deleteMessage(chatId, args.message_id);
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to delete message: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_UPDATES: tool({
      name: 'telegram_get_updates',
      description:
        'Get incoming updates from Telegram (messages, callback queries, etc.)',
      schema: z.object({
        offset: z
          .number()
          .optional()
          .describe('Identifier of the first update to be returned'),
        limit: z
          .number()
          .min(1)
          .max(100)
          .optional()
          .describe('Limits the number of updates to be retrieved (1-100, default 100)'),
        timeout: z
          .number()
          .optional()
          .describe('Timeout in seconds for long polling (0-50, default 0)'),
      }),
      handler: async (args, context) => {
        try {
          const { botToken } = await context.getCredentials();
          const client = new TelegramClient(botToken);
          const response = await client.getUpdates(args.offset, args.limit, args.timeout);
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to get updates: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_CHAT: tool({
      name: 'telegram_get_chat',
      description: 'Get up to date information about a chat',
      schema: z.object({
        chat_id: z
          .string()
          .describe('Unique identifier for the chat or username of the target chat'),
      }),
      handler: async (args, context) => {
        try {
          const { botToken } = await context.getCredentials();
          const client = new TelegramClient(botToken);
          const response = await client.getChat(args.chat_id);
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to get chat information: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_FILE: tool({
      name: 'telegram_get_file',
      description: 'Get basic information about a file and prepare it for downloading',
      schema: z.object({
        file_id: z.string().describe('File identifier to get information about'),
      }),
      handler: async (args, context) => {
        try {
          const { botToken } = await context.getCredentials();
          const client = new TelegramClient(botToken);
          const response = await client.getFile(args.file_id);

          // If successful, add download URL to the response
          if (response.ok && response.result?.file_path) {
            const downloadUrl = client.getFileDownloadUrl(response.result.file_path);
            return JSON.stringify({
              ...response,
              download_url: downloadUrl,
            });
          }

          return JSON.stringify(response);
        } catch (error) {
          return `Failed to get file information: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    ANSWER_CALLBACK_QUERY: tool({
      name: 'telegram_answer_callback_query',
      description: 'Send answers to callback queries sent from inline keyboards',
      schema: z.object({
        callback_query_id: z
          .string()
          .describe('Unique identifier for the query to be answered'),
        text: z
          .string()
          .max(200)
          .optional()
          .describe('Text of the notification (0-200 characters)'),
        show_alert: z
          .boolean()
          .optional()
          .describe(
            'If true, an alert will be shown by the client instead of a notification'
          ),
        url: z.string().optional().describe('URL to be opened by the client'),
        cache_time: z
          .number()
          .optional()
          .describe(
            'The maximum amount of time in seconds that the result of the callback query may be cached client-side'
          ),
      }),
      handler: async (args, context) => {
        try {
          const { botToken } = await context.getCredentials();
          const client = new TelegramClient(botToken);
          const response = await client.answerCallbackQuery(args.callback_query_id, {
            text: args.text,
            show_alert: args.show_alert,
            url: args.url,
            cache_time: args.cache_time,
          });
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to answer callback query: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
  resources: (resource) => ({
    UPDATES: resource({
      name: 'telegram_updates',
      description: 'Recent updates from Telegram bot (messages, callback queries, etc.)',
      uri: 'telegram://updates',
      handler: async (context) => {
        try {
          const { botToken } = await context.getCredentials();
          const client = new TelegramClient(botToken);
          const response = await client.getUpdates(undefined, 10);

          if (!response.ok) {
            return `Error retrieving updates: ${response.description || 'Unknown error'}`;
          }

          const updates = response.result || [];
          return JSON.stringify(
            {
              total_updates: updates.length,
              updates: updates.map((update) => ({
                update_id: update.update_id,
                type: update.message
                  ? 'message'
                  : update.callback_query
                    ? 'callback_query'
                    : update.inline_query
                      ? 'inline_query'
                      : 'other',
                timestamp: update.message?.date || Date.now(),
                from: update.message?.from?.first_name || 'Unknown',
                chat_id: update.message?.chat?.id,
                text: update.message?.text || update.message?.caption || 'No text',
              })),
            },
            null,
            2
          );
        } catch (error) {
          return `Failed to retrieve updates: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    BOT_INFO: resource({
      name: 'telegram_bot',
      description: 'Information about the Telegram bot',
      uri: 'telegram://bot',
      handler: async (context) => {
        try {
          const { botToken } = await context.getCredentials();
          const client = new TelegramClient(botToken);
          const response = await client.getMe();

          if (!response.ok) {
            return `Error retrieving bot information: ${response.description || 'Unknown error'}`;
          }

          const bot = response.result;
          if (!bot) {
            return 'No bot information available';
          }

          return JSON.stringify(
            {
              id: bot.id,
              username: bot.username,
              first_name: bot.first_name,
              is_bot: bot.is_bot,
              can_join_groups: bot.can_join_groups,
              can_read_all_group_messages: bot.can_read_all_group_messages,
              supports_inline_queries: bot.supports_inline_queries,
            },
            null,
            2
          );
        } catch (error) {
          return `Failed to retrieve bot information: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  [key: string]: unknown;
}

interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  [key: string]: unknown;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  caption?: string;
  [key: string]: unknown;
}

interface TelegramResponse<T> {
  ok: boolean;
  result?: T;
  error_code?: number;
  description?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
  edited_channel_post?: TelegramMessage;
  callback_query?: {
    id: string;
    from: TelegramUser;
    message?: TelegramMessage;
    data?: string;
  };
  [key: string]: unknown;
}

interface TelegramFile {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
}

class TelegramClient {
  constructor(
    private botToken: string,
    private defaultChatId?: string
  ) {}

  private get apiUrl(): string {
    return `https://api.telegram.org/bot${this.botToken}`;
  }

  async makeRequest<T>(
    method: string,
    params?: Record<string, unknown>
  ): Promise<TelegramResponse<T>> {
    const url = `${this.apiUrl}/${method}`;
    const body = params ? JSON.stringify(params) : undefined;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
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
      reply_to_message_id?: number;
      disable_notification?: boolean;
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
      reply_to_message_id?: number;
      disable_notification?: boolean;
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
      reply_to_message_id?: number;
      disable_notification?: boolean;
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
    } = {}
  ): Promise<TelegramResponse<TelegramMessage | true>> {
    return this.makeRequest<TelegramMessage | true>('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      ...options,
    });
  }

  async deleteMessage(
    chatId: string | number,
    messageId: number
  ): Promise<TelegramResponse<true>> {
    return this.makeRequest<true>('deleteMessage', {
      chat_id: chatId,
      message_id: messageId,
    });
  }

  async getUpdates(
    offset?: number,
    limit?: number,
    timeout?: number
  ): Promise<TelegramResponse<TelegramUpdate[]>> {
    const params: Record<string, unknown> = {};
    if (offset !== undefined) params.offset = offset;
    if (limit !== undefined) params.limit = limit;
    if (timeout !== undefined) params.timeout = timeout;

    return this.makeRequest<TelegramUpdate[]>('getUpdates', params);
  }

  async getChat(chatId: string | number): Promise<TelegramResponse<TelegramChat>> {
    return this.makeRequest<TelegramChat>('getChat', { chat_id: chatId });
  }

  async getFile(fileId: string): Promise<TelegramResponse<TelegramFile>> {
    return this.makeRequest<TelegramFile>('getFile', { file_id: fileId });
  }

  async answerCallbackQuery(
    callbackQueryId: string,
    options: {
      text?: string;
      show_alert?: boolean;
    } = {}
  ): Promise<TelegramResponse<true>> {
    return this.makeRequest<true>('answerCallbackQuery', {
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
  logo: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg',
  credentials: z.object({
    botToken: z
      .string()
      .describe(
        'Telegram Bot Token from @BotFather :: 1234567890:ABCdefGHIjklMNOpqrsTUVwxyz-AbCdEfGh :: https://core.telegram.org/bots#6-botfather'
      ),
  }),
  setup: z.object({
    defaultChatId: z
      .string()
      .optional()
      .describe(
        'Default chat ID to use when not specified :: 123456789 or @username :: You can get chat ID by messaging the bot and using getUpdates'
      ),
  }),
  examplePrompt:
    'Send a message to a chat, upload a photo, get bot information, check for new messages, and manage message interactions.',
  tools: (tool) => ({
    GET_ME: tool({
      name: 'telegram_get_me',
      description: 'Get information about the bot',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { botToken } = await context.getCredentials();
          const client = new TelegramClient(botToken);
          const response = await client.getMe();
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to get bot info: ${error instanceof Error ? error.message : String(error)}`;
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
            'Chat ID, username, or channel ID. If not provided, uses default chat ID from setup'
          ),
        text: z.string().describe('Message text to send'),
        parse_mode: z
          .enum(['HTML', 'Markdown', 'MarkdownV2'])
          .optional()
          .describe('Message formatting mode'),
        reply_to_message_id: z
          .number()
          .optional()
          .describe('ID of the message to reply to'),
        disable_notification: z
          .boolean()
          .optional()
          .describe('Send message silently without notification'),
      }),
      handler: async (args, context) => {
        try {
          const { botToken } = await context.getCredentials();
          const { defaultChatId } = await context.getSetup();
          const client = new TelegramClient(botToken, defaultChatId);

          const chatId = args.chat_id || defaultChatId;
          if (!chatId) {
            return 'Error: No chat_id provided and no default chat ID configured';
          }

          const response = await client.sendMessage(chatId, args.text, {
            parse_mode: args.parse_mode,
            reply_to_message_id: args.reply_to_message_id,
            disable_notification: args.disable_notification,
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
            'Chat ID, username, or channel ID. If not provided, uses default chat ID from setup'
          ),
        photo: z.string().describe('Photo to send (file_id, HTTP URL, or file path)'),
        caption: z.string().optional().describe('Photo caption'),
        parse_mode: z
          .enum(['HTML', 'Markdown', 'MarkdownV2'])
          .optional()
          .describe('Caption formatting mode'),
        reply_to_message_id: z
          .number()
          .optional()
          .describe('ID of the message to reply to'),
        disable_notification: z
          .boolean()
          .optional()
          .describe('Send photo silently without notification'),
      }),
      handler: async (args, context) => {
        try {
          const { botToken } = await context.getCredentials();
          const { defaultChatId } = await context.getSetup();
          const client = new TelegramClient(botToken, defaultChatId);

          const chatId = args.chat_id || defaultChatId;
          if (!chatId) {
            return 'Error: No chat_id provided and no default chat ID configured';
          }

          const response = await client.sendPhoto(chatId, args.photo, {
            caption: args.caption,
            parse_mode: args.parse_mode,
            reply_to_message_id: args.reply_to_message_id,
            disable_notification: args.disable_notification,
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
            'Chat ID, username, or channel ID. If not provided, uses default chat ID from setup'
          ),
        document: z
          .string()
          .describe('Document to send (file_id, HTTP URL, or file path)'),
        caption: z.string().optional().describe('Document caption'),
        parse_mode: z
          .enum(['HTML', 'Markdown', 'MarkdownV2'])
          .optional()
          .describe('Caption formatting mode'),
        reply_to_message_id: z
          .number()
          .optional()
          .describe('ID of the message to reply to'),
        disable_notification: z
          .boolean()
          .optional()
          .describe('Send document silently without notification'),
      }),
      handler: async (args, context) => {
        try {
          const { botToken } = await context.getCredentials();
          const { defaultChatId } = await context.getSetup();
          const client = new TelegramClient(botToken, defaultChatId);

          const chatId = args.chat_id || defaultChatId;
          if (!chatId) {
            return 'Error: No chat_id provided and no default chat ID configured';
          }

          const response = await client.sendDocument(chatId, args.document, {
            caption: args.caption,
            parse_mode: args.parse_mode,
            reply_to_message_id: args.reply_to_message_id,
            disable_notification: args.disable_notification,
          });
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to send document: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    EDIT_MESSAGE: tool({
      name: 'telegram_edit_message',
      description: 'Edit a text message',
      schema: z.object({
        chat_id: z
          .string()
          .optional()
          .describe(
            'Chat ID, username, or channel ID. If not provided, uses default chat ID from setup'
          ),
        message_id: z.number().describe('ID of the message to edit'),
        text: z.string().describe('New message text'),
        parse_mode: z
          .enum(['HTML', 'Markdown', 'MarkdownV2'])
          .optional()
          .describe('Message formatting mode'),
      }),
      handler: async (args, context) => {
        try {
          const { botToken } = await context.getCredentials();
          const { defaultChatId } = await context.getSetup();
          const client = new TelegramClient(botToken, defaultChatId);

          const chatId = args.chat_id || defaultChatId;
          if (!chatId) {
            return 'Error: No chat_id provided and no default chat ID configured';
          }

          const response = await client.editMessageText(
            chatId,
            args.message_id,
            args.text,
            {
              parse_mode: args.parse_mode,
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
      description: 'Delete a message',
      schema: z.object({
        chat_id: z
          .string()
          .optional()
          .describe(
            'Chat ID, username, or channel ID. If not provided, uses default chat ID from setup'
          ),
        message_id: z.number().describe('ID of the message to delete'),
      }),
      handler: async (args, context) => {
        try {
          const { botToken } = await context.getCredentials();
          const { defaultChatId } = await context.getSetup();
          const client = new TelegramClient(botToken, defaultChatId);

          const chatId = args.chat_id || defaultChatId;
          if (!chatId) {
            return 'Error: No chat_id provided and no default chat ID configured';
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
      description: 'Get new incoming messages and updates',
      schema: z.object({
        offset: z
          .number()
          .optional()
          .describe('Identifier of the first update to be returned'),
        limit: z
          .number()
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
      description: 'Get information about a chat',
      schema: z.object({
        chat_id: z
          .string()
          .optional()
          .describe(
            'Chat ID, username, or channel ID. If not provided, uses default chat ID from setup'
          ),
      }),
      handler: async (args, context) => {
        try {
          const { botToken } = await context.getCredentials();
          const { defaultChatId } = await context.getSetup();
          const client = new TelegramClient(botToken, defaultChatId);

          const chatId = args.chat_id || defaultChatId;
          if (!chatId) {
            return 'Error: No chat_id provided and no default chat ID configured';
          }

          const response = await client.getChat(chatId);
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to get chat: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_FILE: tool({
      name: 'telegram_get_file',
      description: 'Get file information and download URL',
      schema: z.object({
        file_id: z.string().describe('File identifier to get info about'),
      }),
      handler: async (args, context) => {
        try {
          const { botToken } = await context.getCredentials();
          const client = new TelegramClient(botToken);
          const response = await client.getFile(args.file_id);

          if (response.ok && response.result?.file_path) {
            const downloadUrl = client.getFileDownloadUrl(response.result.file_path);
            return JSON.stringify({
              ...response,
              download_url: downloadUrl,
            });
          }

          return JSON.stringify(response);
        } catch (error) {
          return `Failed to get file: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    ANSWER_CALLBACK_QUERY: tool({
      name: 'telegram_answer_callback_query',
      description: 'Answer a callback query from an inline keyboard',
      schema: z.object({
        callback_query_id: z
          .string()
          .describe('Unique identifier for the callback query'),
        text: z.string().optional().describe('Text to show the user'),
        show_alert: z
          .boolean()
          .optional()
          .describe('Show an alert instead of notification'),
      }),
      handler: async (args, context) => {
        try {
          const { botToken } = await context.getCredentials();
          const client = new TelegramClient(botToken);
          const response = await client.answerCallbackQuery(args.callback_query_id, {
            text: args.text,
            show_alert: args.show_alert,
          });
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to answer callback query: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
  resources: (resource) => ({
    updates: resource({
      uri: 'telegram://updates',
      name: 'Recent Telegram Updates',
      description: 'Get recent incoming messages and updates from Telegram',
      mimeType: 'application/json',
      handler: async (_uri, context) => {
        try {
          const { botToken } = await context.getCredentials();
          const client = new TelegramClient(botToken);
          const response = await client.getUpdates(undefined, 10);

          if (response.ok && response.result) {
            const updates = response.result.map((update) => {
              const message =
                update.message ||
                update.edited_message ||
                update.channel_post ||
                update.edited_channel_post;
              return {
                update_id: update.update_id,
                type: update.message
                  ? 'message'
                  : update.edited_message
                    ? 'edited_message'
                    : update.channel_post
                      ? 'channel_post'
                      : update.edited_channel_post
                        ? 'edited_channel_post'
                        : update.callback_query
                          ? 'callback_query'
                          : 'other',
                chat: message?.chat,
                from: message?.from,
                text: message?.text || message?.caption,
                date: message?.date,
              };
            });

            return JSON.stringify(
              {
                ok: true,
                updates_count: updates.length,
                updates,
              },
              null,
              2
            );
          }

          return JSON.stringify(response, null, 2);
        } catch (error) {
          return JSON.stringify({
            error: `Failed to get updates: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      },
    }),
    bot: resource({
      uri: 'telegram://bot',
      name: 'Telegram Bot Information',
      description: 'Get information about the configured Telegram bot',
      mimeType: 'application/json',
      handler: async (_uri, context) => {
        try {
          const { botToken } = await context.getCredentials();
          const client = new TelegramClient(botToken);
          const response = await client.getMe();

          if (response.ok && response.result) {
            return JSON.stringify(
              {
                ok: true,
                bot_info: {
                  id: response.result.id,
                  is_bot: response.result.is_bot,
                  first_name: response.result.first_name,
                  username: response.result.username,
                  can_join_groups: response.result.can_join_groups,
                  can_read_all_group_messages:
                    response.result.can_read_all_group_messages,
                  supports_inline_queries: response.result.supports_inline_queries,
                },
              },
              null,
              2
            );
          }

          return JSON.stringify(response, null, 2);
        } catch (error) {
          return JSON.stringify({
            error: `Failed to get bot info: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      },
    }),
  }),
});

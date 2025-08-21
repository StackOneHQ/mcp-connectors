import type {
  MCPResourceDefinition,
  MCPToolDefinition,
} from '@stackone/mcp-config-types';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { TelegramConnectorConfig } from './telegram';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('#TelegramConnector', () => {
  describe('.GET_ME', () => {
    describe('when bot token is valid', () => {
      it('returns bot information', async () => {
        const mockBotInfo = {
          id: 123456789,
          is_bot: true,
          first_name: 'Test Bot',
          username: 'testbot',
          can_join_groups: true,
          can_read_all_group_messages: false,
          supports_inline_queries: true,
        };

        server.use(
          http.post('https://api.telegram.org/bot**/getMe', () => {
            return HttpResponse.json({
              ok: true,
              result: mockBotInfo,
            });
          })
        );

        const tool = TelegramConnectorConfig.tools.GET_ME as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { botToken: 'test-token' },
          setup: {},
        });

        const actual = await tool.handler({}, mockContext);
        const result = JSON.parse(actual);

        expect(result.ok).toBe(true);
        expect(result.result).toEqual(mockBotInfo);
      });
    });

    describe('when bot token is invalid', () => {
      it('returns error response', async () => {
        server.use(
          http.post('https://api.telegram.org/bot**/getMe', () => {
            return HttpResponse.json({
              ok: false,
              error_code: 401,
              description: 'Unauthorized',
            });
          })
        );

        const tool = TelegramConnectorConfig.tools.GET_ME as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { botToken: 'invalid-token' },
          setup: {},
        });

        const actual = await tool.handler({}, mockContext);
        const result = JSON.parse(actual);

        expect(result.ok).toBe(false);
        expect(result.error_code).toBe(401);
      });
    });
  });

  describe('.SEND_MESSAGE', () => {
    describe('when message is sent successfully', () => {
      describe('and chat_id is provided', () => {
        it('sends message to specified chat', async () => {
          const mockMessage = {
            message_id: 123,
            date: 1640995200,
            text: 'Hello, World!',
            chat: { id: 123456, type: 'private' },
            from: { id: 987654, is_bot: true, first_name: 'Test Bot' },
          };

          server.use(
            http.post('https://api.telegram.org/bot**/sendMessage', () => {
              return HttpResponse.json({
                ok: true,
                result: mockMessage,
              });
            })
          );

          const tool = TelegramConnectorConfig.tools.SEND_MESSAGE as MCPToolDefinition;
          const mockContext = createMockConnectorContext({
            credentials: { botToken: 'test-token' },
            setup: {},
          });

          const actual = await tool.handler(
            { chat_id: '123456', text: 'Hello, World!' },
            mockContext
          );
          const result = JSON.parse(actual);

          expect(result.ok).toBe(true);
          expect(result.result.text).toBe('Hello, World!');
        });
      });

      describe('and default chat ID is used', () => {
        it('sends message to default chat', async () => {
          const mockMessage = {
            message_id: 124,
            date: 1640995200,
            text: 'Hello, Default!',
            chat: { id: 789012, type: 'private' },
            from: { id: 987654, is_bot: true, first_name: 'Test Bot' },
          };

          server.use(
            http.post('https://api.telegram.org/bot**/sendMessage', () => {
              return HttpResponse.json({
                ok: true,
                result: mockMessage,
              });
            })
          );

          const tool = TelegramConnectorConfig.tools.SEND_MESSAGE as MCPToolDefinition;
          const mockContext = createMockConnectorContext({
            credentials: { botToken: 'test-token' },
            setup: { defaultChatId: '789012' },
          });

          const actual = await tool.handler({ text: 'Hello, Default!' }, mockContext);
          const result = JSON.parse(actual);

          expect(result.ok).toBe(true);
          expect(result.result.text).toBe('Hello, Default!');
        });
      });

      describe('and formatting options are provided', () => {
        it('applies message formatting', async () => {
          const mockMessage = {
            message_id: 125,
            date: 1640995200,
            text: '<b>Bold text</b>',
            chat: { id: 123456, type: 'private' },
            from: { id: 987654, is_bot: true, first_name: 'Test Bot' },
          };

          server.use(
            http.post('https://api.telegram.org/bot**/sendMessage', () => {
              return HttpResponse.json({
                ok: true,
                result: mockMessage,
              });
            })
          );

          const tool = TelegramConnectorConfig.tools.SEND_MESSAGE as MCPToolDefinition;
          const mockContext = createMockConnectorContext({
            credentials: { botToken: 'test-token' },
            setup: {},
          });

          const actual = await tool.handler(
            {
              chat_id: '123456',
              text: '<b>Bold text</b>',
              parse_mode: 'HTML',
              disable_notification: true,
            },
            mockContext
          );
          const result = JSON.parse(actual);

          expect(result.ok).toBe(true);
          expect(result.result.text).toBe('<b>Bold text</b>');
        });
      });
    });

    describe('when no chat ID is provided', () => {
      describe('and no default chat ID is configured', () => {
        it('returns error message', async () => {
          const tool = TelegramConnectorConfig.tools.SEND_MESSAGE as MCPToolDefinition;
          const mockContext = createMockConnectorContext({
            credentials: { botToken: 'test-token' },
            setup: {},
          });

          const actual = await tool.handler({ text: 'Hello!' }, mockContext);

          expect(actual).toBe(
            'Error: No chat_id provided and no default chat ID configured in setup'
          );
        });
      });
    });

    describe('when API returns error', () => {
      it('returns error response', async () => {
        server.use(
          http.post('https://api.telegram.org/bot**/sendMessage', () => {
            return HttpResponse.json({
              ok: false,
              error_code: 400,
              description: 'Bad Request: chat not found',
            });
          })
        );

        const tool = TelegramConnectorConfig.tools.SEND_MESSAGE as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { botToken: 'test-token' },
          setup: {},
        });

        const actual = await tool.handler(
          { chat_id: 'invalid', text: 'Hello!' },
          mockContext
        );
        const result = JSON.parse(actual);

        expect(result.ok).toBe(false);
        expect(result.error_code).toBe(400);
      });
    });
  });

  describe('.SEND_PHOTO', () => {
    describe('when photo is sent successfully', () => {
      it('sends photo with caption', async () => {
        const mockMessage = {
          message_id: 126,
          date: 1640995200,
          photo: [{ file_id: 'photo123', width: 100, height: 100 }],
          caption: 'Test photo',
          chat: { id: 123456, type: 'private' },
          from: { id: 987654, is_bot: true, first_name: 'Test Bot' },
        };

        server.use(
          http.post('https://api.telegram.org/bot**/sendPhoto', () => {
            return HttpResponse.json({
              ok: true,
              result: mockMessage,
            });
          })
        );

        const tool = TelegramConnectorConfig.tools.SEND_PHOTO as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { botToken: 'test-token' },
          setup: { defaultChatId: '123456' },
        });

        const actual = await tool.handler(
          {
            photo: 'https://example.com/photo.jpg',
            caption: 'Test photo',
            parse_mode: 'HTML',
          },
          mockContext
        );
        const result = JSON.parse(actual);

        expect(result.ok).toBe(true);
        expect(result.result.caption).toBe('Test photo');
      });
    });
  });

  describe('.SEND_DOCUMENT', () => {
    describe('when document is sent successfully', () => {
      it('sends document with caption', async () => {
        const mockMessage = {
          message_id: 127,
          date: 1640995200,
          document: {
            file_id: 'doc123',
            file_name: 'test.pdf',
            mime_type: 'application/pdf',
            file_size: 1024,
          },
          caption: 'Test document',
          chat: { id: 123456, type: 'private' },
          from: { id: 987654, is_bot: true, first_name: 'Test Bot' },
        };

        server.use(
          http.post('https://api.telegram.org/bot**/sendDocument', () => {
            return HttpResponse.json({
              ok: true,
              result: mockMessage,
            });
          })
        );

        const tool = TelegramConnectorConfig.tools.SEND_DOCUMENT as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { botToken: 'test-token' },
          setup: { defaultChatId: '123456' },
        });

        const actual = await tool.handler(
          {
            document: 'https://example.com/document.pdf',
            caption: 'Test document',
          },
          mockContext
        );
        const result = JSON.parse(actual);

        expect(result.ok).toBe(true);
        expect(result.result.caption).toBe('Test document');
      });
    });
  });

  describe('.EDIT_MESSAGE', () => {
    describe('when message is edited successfully', () => {
      it('edits message text', async () => {
        const mockMessage = {
          message_id: 123,
          date: 1640995200,
          text: 'Edited text',
          chat: { id: 123456, type: 'private' },
          from: { id: 987654, is_bot: true, first_name: 'Test Bot' },
        };

        server.use(
          http.post('https://api.telegram.org/bot**/editMessageText', () => {
            return HttpResponse.json({
              ok: true,
              result: mockMessage,
            });
          })
        );

        const tool = TelegramConnectorConfig.tools.EDIT_MESSAGE as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { botToken: 'test-token' },
          setup: { defaultChatId: '123456' },
        });

        const actual = await tool.handler(
          {
            message_id: 123,
            text: 'Edited text',
            parse_mode: 'HTML',
          },
          mockContext
        );
        const result = JSON.parse(actual);

        expect(result.ok).toBe(true);
        expect(result.result.text).toBe('Edited text');
      });
    });
  });

  describe('.DELETE_MESSAGE', () => {
    describe('when message is deleted successfully', () => {
      it('deletes the message', async () => {
        server.use(
          http.post('https://api.telegram.org/bot**/deleteMessage', () => {
            return HttpResponse.json({
              ok: true,
              result: true,
            });
          })
        );

        const tool = TelegramConnectorConfig.tools.DELETE_MESSAGE as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { botToken: 'test-token' },
          setup: { defaultChatId: '123456' },
        });

        const actual = await tool.handler({ message_id: 123 }, mockContext);
        const result = JSON.parse(actual);

        expect(result.ok).toBe(true);
        expect(result.result).toBe(true);
      });
    });
  });

  describe('.GET_UPDATES', () => {
    describe('when updates are retrieved successfully', () => {
      it('returns list of updates', async () => {
        const mockUpdates = [
          {
            update_id: 123456,
            message: {
              message_id: 1,
              date: 1640995200,
              text: 'Hello',
              chat: { id: 123456, type: 'private' },
              from: { id: 987654, is_bot: false, first_name: 'User' },
            },
          },
        ];

        server.use(
          http.post('https://api.telegram.org/bot**/getUpdates', () => {
            return HttpResponse.json({
              ok: true,
              result: mockUpdates,
            });
          })
        );

        const tool = TelegramConnectorConfig.tools.GET_UPDATES as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { botToken: 'test-token' },
          setup: {},
        });

        const actual = await tool.handler({ limit: 10 }, mockContext);
        const result = JSON.parse(actual);

        expect(result.ok).toBe(true);
        expect(result.result).toHaveLength(1);
        expect(result.result[0].update_id).toBe(123456);
      });
    });

    describe('when no updates are available', () => {
      it('returns empty array', async () => {
        server.use(
          http.post('https://api.telegram.org/bot**/getUpdates', () => {
            return HttpResponse.json({
              ok: true,
              result: [],
            });
          })
        );

        const tool = TelegramConnectorConfig.tools.GET_UPDATES as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { botToken: 'test-token' },
          setup: {},
        });

        const actual = await tool.handler({}, mockContext);
        const result = JSON.parse(actual);

        expect(result.ok).toBe(true);
        expect(result.result).toHaveLength(0);
      });
    });
  });

  describe('.GET_CHAT', () => {
    describe('when chat information is retrieved successfully', () => {
      it('returns chat details', async () => {
        const mockChat = {
          id: 123456,
          type: 'private',
          first_name: 'John',
          last_name: 'Doe',
          username: 'johndoe',
        };

        server.use(
          http.post('https://api.telegram.org/bot**/getChat', () => {
            return HttpResponse.json({
              ok: true,
              result: mockChat,
            });
          })
        );

        const tool = TelegramConnectorConfig.tools.GET_CHAT as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { botToken: 'test-token' },
          setup: {},
        });

        const actual = await tool.handler({ chat_id: '123456' }, mockContext);
        const result = JSON.parse(actual);

        expect(result.ok).toBe(true);
        expect(result.result.id).toBe(123456);
        expect(result.result.type).toBe('private');
      });
    });
  });

  describe('.GET_FILE', () => {
    describe('when file information is retrieved successfully', () => {
      it('returns file details with download URL', async () => {
        const mockFile = {
          file_id: 'file123',
          file_unique_id: 'unique123',
          file_size: 1024,
          file_path: 'photos/file_123.jpg',
        };

        server.use(
          http.post('https://api.telegram.org/bot**/getFile', () => {
            return HttpResponse.json({
              ok: true,
              result: mockFile,
            });
          })
        );

        const tool = TelegramConnectorConfig.tools.GET_FILE as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { botToken: 'test-token' },
          setup: {},
        });

        const actual = await tool.handler({ file_id: 'file123' }, mockContext);
        const result = JSON.parse(actual);

        expect(result.ok).toBe(true);
        expect(result.result.file_id).toBe('file123');
        expect(result.download_url).toBe(
          'https://api.telegram.org/file/bottest-token/photos/file_123.jpg'
        );
      });
    });

    describe('when file path is not available', () => {
      it('returns file info without download URL', async () => {
        const mockFile = {
          file_id: 'file123',
          file_unique_id: 'unique123',
          file_size: 1024,
        };

        server.use(
          http.post('https://api.telegram.org/bot**/getFile', () => {
            return HttpResponse.json({
              ok: true,
              result: mockFile,
            });
          })
        );

        const tool = TelegramConnectorConfig.tools.GET_FILE as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { botToken: 'test-token' },
          setup: {},
        });

        const actual = await tool.handler({ file_id: 'file123' }, mockContext);
        const result = JSON.parse(actual);

        expect(result.ok).toBe(true);
        expect(result.result.file_id).toBe('file123');
        expect(result.download_url).toBeUndefined();
      });
    });
  });

  describe('.ANSWER_CALLBACK_QUERY', () => {
    describe('when callback query is answered successfully', () => {
      it('answers the callback query', async () => {
        server.use(
          http.post('https://api.telegram.org/bot**/answerCallbackQuery', () => {
            return HttpResponse.json({
              ok: true,
              result: true,
            });
          })
        );

        const tool = TelegramConnectorConfig.tools
          .ANSWER_CALLBACK_QUERY as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { botToken: 'test-token' },
          setup: {},
        });

        const actual = await tool.handler(
          {
            callback_query_id: 'query123',
            text: 'Query answered',
            show_alert: true,
          },
          mockContext
        );
        const result = JSON.parse(actual);

        expect(result.ok).toBe(true);
        expect(result.result).toBe(true);
      });
    });
  });

  describe('.UPDATES', () => {
    describe('when resource is accessed', () => {
      it('returns formatted updates list', async () => {
        const mockUpdates = [
          {
            update_id: 123456,
            message: {
              message_id: 1,
              date: 1640995200,
              text: 'Hello there',
              chat: { id: 123456, type: 'private' },
              from: { id: 987654, is_bot: false, first_name: 'Alice' },
            },
          },
          {
            update_id: 123457,
            callback_query: {
              id: 'query123',
              from: { id: 987654, is_bot: false, first_name: 'Bob' },
              data: 'button_clicked',
            },
          },
        ];

        server.use(
          http.post('https://api.telegram.org/bot**/getUpdates', () => {
            return HttpResponse.json({
              ok: true,
              result: mockUpdates,
            });
          })
        );

        const resource = TelegramConnectorConfig.resources
          .UPDATES as MCPResourceDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { botToken: 'test-token' },
          setup: {},
        });

        const actual = await resource.handler('telegram://updates', mockContext);
        const result = JSON.parse(actual);

        expect(result.total_updates).toBe(2);
        expect(result.updates).toHaveLength(2);
        expect(result.updates[0].type).toBe('message');
        expect(result.updates[0].text).toBe('Hello there');
        expect(result.updates[1].type).toBe('callback_query');
      });
    });

    describe('when API returns error', () => {
      it('returns error message', async () => {
        server.use(
          http.post('https://api.telegram.org/bot**/getUpdates', () => {
            return HttpResponse.json({
              ok: false,
              error_code: 401,
              description: 'Unauthorized',
            });
          })
        );

        const resource = TelegramConnectorConfig.resources
          .UPDATES as MCPResourceDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { botToken: 'invalid-token' },
          setup: {},
        });

        const actual = await resource.handler('telegram://updates', mockContext);

        expect(actual).toBe('Error retrieving updates: Unauthorized');
      });
    });
  });

  describe('.BOT_INFO', () => {
    describe('when resource is accessed', () => {
      it('returns formatted bot information', async () => {
        const mockBotInfo = {
          id: 123456789,
          is_bot: true,
          first_name: 'My Bot',
          username: 'mybot',
          can_join_groups: true,
          can_read_all_group_messages: false,
          supports_inline_queries: true,
        };

        server.use(
          http.post('https://api.telegram.org/bot**/getMe', () => {
            return HttpResponse.json({
              ok: true,
              result: mockBotInfo,
            });
          })
        );

        const resource = TelegramConnectorConfig.resources
          .BOT_INFO as MCPResourceDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { botToken: 'test-token' },
          setup: {},
        });

        const actual = await resource.handler('telegram://bot', mockContext);
        const result = JSON.parse(actual);

        expect(result.id).toBe(123456789);
        expect(result.username).toBe('mybot');
        expect(result.is_bot).toBe(true);
        expect(result.can_join_groups).toBe(true);
      });
    });

    describe('when bot information is not available', () => {
      it('returns appropriate message', async () => {
        server.use(
          http.post('https://api.telegram.org/bot**/getMe', () => {
            return HttpResponse.json({
              ok: true,
              result: null,
            });
          })
        );

        const resource = TelegramConnectorConfig.resources
          .BOT_INFO as MCPResourceDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { botToken: 'test-token' },
          setup: {},
        });

        const actual = await resource.handler('telegram://bot', mockContext);

        expect(actual).toBe('No bot information available');
      });
    });
  });
});

import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { TelegramConnectorConfig } from './telegram';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const mockBot = {
  id: 123456789,
  is_bot: true,
  first_name: 'TestBot',
  username: 'test_bot',
  can_join_groups: true,
  can_read_all_group_messages: false,
  supports_inline_queries: false,
};

const mockMessage = {
  message_id: 1,
  from: {
    id: 987654321,
    is_bot: false,
    first_name: 'John',
    username: 'john_doe',
  },
  chat: {
    id: 123456789,
    type: 'private' as const,
    first_name: 'John',
    username: 'john_doe',
  },
  date: 1609459200,
  text: 'Hello, world!',
};

const mockUpdate = {
  update_id: 1,
  message: mockMessage,
};

const mockFile = {
  file_id: 'BAADBAADrwADBREAAYdaJUUIjJk_Ag',
  file_unique_id: 'AgADrwADBREAAQ',
  file_size: 1024,
  file_path: 'photos/file_1.jpg',
};

describe('#TelegramConnector', () => {
  describe('.GET_ME', () => {
    describe('when request is successful', () => {
      it('returns bot information', async () => {
        server.use(
          http.post('https://api.telegram.org/bot*/getMe', () => {
            return HttpResponse.json({
              ok: true,
              result: mockBot,
            });
          })
        );

        const tool = TelegramConnectorConfig.tools.GET_ME as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = async () => ({ botToken: 'test_token' });

        const actual = await tool.handler({}, mockContext);
        const response = JSON.parse(actual);

        expect(response.ok).toBe(true);
        expect(response.result.id).toBe(mockBot.id);
        expect(response.result.username).toBe(mockBot.username);
      });
    });

    describe('when request fails', () => {
      it('returns error response', async () => {
        server.use(
          http.post('https://api.telegram.org/bot*/getMe', () => {
            return HttpResponse.json({
              ok: false,
              error_code: 401,
              description: 'Unauthorized',
            });
          })
        );

        const tool = TelegramConnectorConfig.tools.GET_ME as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = async () => ({ botToken: 'invalid_token' });

        const actual = await tool.handler({}, mockContext);
        const response = JSON.parse(actual);

        expect(response.ok).toBe(false);
        expect(response.error_code).toBe(401);
      });
    });
  });

  describe('.SEND_MESSAGE', () => {
    describe('when message is sent successfully', () => {
      it('returns message response', async () => {
        server.use(
          http.post('https://api.telegram.org/bot*/sendMessage', () => {
            return HttpResponse.json({
              ok: true,
              result: mockMessage,
            });
          })
        );

        const tool = TelegramConnectorConfig.tools.SEND_MESSAGE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = async () => ({ botToken: 'test_token' });
        mockContext.getSetup = async () => ({ defaultChatId: '123456789' });

        const actual = await tool.handler({ text: 'Hello, world!' }, mockContext);
        const response = JSON.parse(actual);

        expect(response.ok).toBe(true);
        expect(response.result.text).toBe('Hello, world!');
      });
    });

    describe('when no chat_id provided', () => {
      describe('and no default chat ID configured', () => {
        it('returns error message', async () => {
          const tool = TelegramConnectorConfig.tools.SEND_MESSAGE as MCPToolDefinition;
          const mockContext = createMockConnectorContext();
          mockContext.getCredentials = async () => ({ botToken: 'test_token' });
          mockContext.getSetup = async () => ({});

          const actual = await tool.handler({ text: 'Hello, world!' }, mockContext);

          expect(actual).toBe(
            'Error: No chat_id provided and no default chat ID configured'
          );
        });
      });
    });

    describe('when message has formatting', () => {
      it('includes parse_mode in request', async () => {
        let requestBody: Record<string, unknown> | null = null;

        server.use(
          http.post('https://api.telegram.org/bot*/sendMessage', async ({ request }) => {
            requestBody = await request.json();
            return HttpResponse.json({
              ok: true,
              result: mockMessage,
            });
          })
        );

        const tool = TelegramConnectorConfig.tools.SEND_MESSAGE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = async () => ({ botToken: 'test_token' });
        mockContext.getSetup = async () => ({ defaultChatId: '123456789' });

        await tool.handler({ text: '<b>Bold text</b>', parse_mode: 'HTML' }, mockContext);

        expect(requestBody.parse_mode).toBe('HTML');
        expect(requestBody.text).toBe('<b>Bold text</b>');
      });
    });
  });

  describe('.SEND_PHOTO', () => {
    describe('when photo is sent successfully', () => {
      it('returns message response', async () => {
        server.use(
          http.post('https://api.telegram.org/bot*/sendPhoto', () => {
            return HttpResponse.json({
              ok: true,
              result: { ...mockMessage, photo: [{ file_id: 'photo123' }] },
            });
          })
        );

        const tool = TelegramConnectorConfig.tools.SEND_PHOTO as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = async () => ({ botToken: 'test_token' });
        mockContext.getSetup = async () => ({ defaultChatId: '123456789' });

        const actual = await tool.handler(
          { photo: 'https://example.com/photo.jpg', caption: 'Test photo' },
          mockContext
        );
        const response = JSON.parse(actual);

        expect(response.ok).toBe(true);
        expect(response.result.photo).toBeDefined();
      });
    });
  });

  describe('.SEND_DOCUMENT', () => {
    describe('when document is sent successfully', () => {
      it('returns message response', async () => {
        server.use(
          http.post('https://api.telegram.org/bot*/sendDocument', () => {
            return HttpResponse.json({
              ok: true,
              result: { ...mockMessage, document: { file_id: 'doc123' } },
            });
          })
        );

        const tool = TelegramConnectorConfig.tools.SEND_DOCUMENT as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = async () => ({ botToken: 'test_token' });
        mockContext.getSetup = async () => ({ defaultChatId: '123456789' });

        const actual = await tool.handler(
          { document: 'https://example.com/document.pdf', caption: 'Test document' },
          mockContext
        );
        const response = JSON.parse(actual);

        expect(response.ok).toBe(true);
        expect(response.result.document).toBeDefined();
      });
    });
  });

  describe('.EDIT_MESSAGE', () => {
    describe('when message is edited successfully', () => {
      it('returns updated message response', async () => {
        server.use(
          http.post('https://api.telegram.org/bot*/editMessageText', () => {
            return HttpResponse.json({
              ok: true,
              result: { ...mockMessage, text: 'Updated message' },
            });
          })
        );

        const tool = TelegramConnectorConfig.tools.EDIT_MESSAGE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = async () => ({ botToken: 'test_token' });
        mockContext.getSetup = async () => ({ defaultChatId: '123456789' });

        const actual = await tool.handler(
          { message_id: 1, text: 'Updated message' },
          mockContext
        );
        const response = JSON.parse(actual);

        expect(response.ok).toBe(true);
        expect(response.result.text).toBe('Updated message');
      });
    });
  });

  describe('.DELETE_MESSAGE', () => {
    describe('when message is deleted successfully', () => {
      it('returns success response', async () => {
        server.use(
          http.post('https://api.telegram.org/bot*/deleteMessage', () => {
            return HttpResponse.json({
              ok: true,
              result: true,
            });
          })
        );

        const tool = TelegramConnectorConfig.tools.DELETE_MESSAGE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = async () => ({ botToken: 'test_token' });
        mockContext.getSetup = async () => ({ defaultChatId: '123456789' });

        const actual = await tool.handler({ message_id: 1 }, mockContext);
        const response = JSON.parse(actual);

        expect(response.ok).toBe(true);
        expect(response.result).toBe(true);
      });
    });
  });

  describe('.GET_UPDATES', () => {
    describe('when updates are retrieved successfully', () => {
      it('returns updates array', async () => {
        server.use(
          http.post('https://api.telegram.org/bot*/getUpdates', () => {
            return HttpResponse.json({
              ok: true,
              result: [mockUpdate],
            });
          })
        );

        const tool = TelegramConnectorConfig.tools.GET_UPDATES as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = async () => ({ botToken: 'test_token' });

        const actual = await tool.handler({}, mockContext);
        const response = JSON.parse(actual);

        expect(response.ok).toBe(true);
        expect(response.result).toHaveLength(1);
        expect(response.result[0].update_id).toBe(1);
      });
    });

    describe('when parameters are provided', () => {
      it('includes parameters in request', async () => {
        let requestBody: Record<string, unknown> | null = null;

        server.use(
          http.post('https://api.telegram.org/bot*/getUpdates', async ({ request }) => {
            requestBody = await request.json();
            return HttpResponse.json({
              ok: true,
              result: [],
            });
          })
        );

        const tool = TelegramConnectorConfig.tools.GET_UPDATES as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = async () => ({ botToken: 'test_token' });

        await tool.handler({ offset: 10, limit: 50, timeout: 30 }, mockContext);

        expect(requestBody.offset).toBe(10);
        expect(requestBody.limit).toBe(50);
        expect(requestBody.timeout).toBe(30);
      });
    });
  });

  describe('.GET_CHAT', () => {
    describe('when chat information is retrieved successfully', () => {
      it('returns chat details', async () => {
        const mockChat = {
          id: 123456789,
          type: 'private',
          first_name: 'John',
          username: 'john_doe',
        };

        server.use(
          http.post('https://api.telegram.org/bot*/getChat', () => {
            return HttpResponse.json({
              ok: true,
              result: mockChat,
            });
          })
        );

        const tool = TelegramConnectorConfig.tools.GET_CHAT as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = async () => ({ botToken: 'test_token' });
        mockContext.getSetup = async () => ({ defaultChatId: '123456789' });

        const actual = await tool.handler({}, mockContext);
        const response = JSON.parse(actual);

        expect(response.ok).toBe(true);
        expect(response.result.id).toBe(mockChat.id);
        expect(response.result.type).toBe(mockChat.type);
      });
    });
  });

  describe('.GET_FILE', () => {
    describe('when file information is retrieved successfully', () => {
      it('returns file details with download URL', async () => {
        server.use(
          http.post('https://api.telegram.org/bot*/getFile', () => {
            return HttpResponse.json({
              ok: true,
              result: mockFile,
            });
          })
        );

        const tool = TelegramConnectorConfig.tools.GET_FILE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = async () => ({ botToken: 'test_token' });

        const actual = await tool.handler(
          { file_id: 'BAADBAADrwADBREAAYdaJUUIjJk_Ag' },
          mockContext
        );
        const response = JSON.parse(actual);

        expect(response.ok).toBe(true);
        expect(response.result.file_id).toBe(mockFile.file_id);
        expect(response.download_url).toBe(
          'https://api.telegram.org/file/bottest_token/photos/file_1.jpg'
        );
      });
    });

    describe('when file has no path', () => {
      it('returns file info without download URL', async () => {
        server.use(
          http.post('https://api.telegram.org/bot*/getFile', () => {
            return HttpResponse.json({
              ok: true,
              result: { ...mockFile, file_path: undefined },
            });
          })
        );

        const tool = TelegramConnectorConfig.tools.GET_FILE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = async () => ({ botToken: 'test_token' });

        const actual = await tool.handler(
          { file_id: 'BAADBAADrwADBREAAYdaJUUIjJk_Ag' },
          mockContext
        );
        const response = JSON.parse(actual);

        expect(response.ok).toBe(true);
        expect(response.download_url).toBeUndefined();
      });
    });
  });

  describe('.ANSWER_CALLBACK_QUERY', () => {
    describe('when callback query is answered successfully', () => {
      it('returns success response', async () => {
        server.use(
          http.post('https://api.telegram.org/bot*/answerCallbackQuery', () => {
            return HttpResponse.json({
              ok: true,
              result: true,
            });
          })
        );

        const tool = TelegramConnectorConfig.tools
          .ANSWER_CALLBACK_QUERY as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = async () => ({ botToken: 'test_token' });

        const actual = await tool.handler(
          { callback_query_id: 'query123', text: 'Acknowledged', show_alert: true },
          mockContext
        );
        const response = JSON.parse(actual);

        expect(response.ok).toBe(true);
        expect(response.result).toBe(true);
      });
    });
  });

  describe('resources', () => {
    describe('updates resource', () => {
      describe('when updates are retrieved successfully', () => {
        it('returns formatted updates', async () => {
          server.use(
            http.post('https://api.telegram.org/bot*/getUpdates', () => {
              return HttpResponse.json({
                ok: true,
                result: [mockUpdate],
              });
            })
          );

          const resource = TelegramConnectorConfig.resources?.updates;
          const mockContext = createMockConnectorContext();
          mockContext.getCredentials = async () => ({ botToken: 'test_token' });

          const actual = await resource?.handler('telegram://updates', mockContext);
          if (!actual) throw new Error('Resource handler returned undefined');
          const response = JSON.parse(actual);

          expect(response.ok).toBe(true);
          expect(response.updates_count).toBe(1);
          expect(response.updates[0].update_id).toBe(1);
          expect(response.updates[0].type).toBe('message');
        });
      });
    });

    describe('bot resource', () => {
      describe('when bot information is retrieved successfully', () => {
        it('returns formatted bot info', async () => {
          server.use(
            http.post('https://api.telegram.org/bot*/getMe', () => {
              return HttpResponse.json({
                ok: true,
                result: mockBot,
              });
            })
          );

          const resource = TelegramConnectorConfig.resources?.bot;
          const mockContext = createMockConnectorContext();
          mockContext.getCredentials = async () => ({ botToken: 'test_token' });

          const actual = await resource?.handler('telegram://bot', mockContext);
          if (!actual) throw new Error('Resource handler returned undefined');
          const response = JSON.parse(actual);

          expect(response.ok).toBe(true);
          expect(response.bot_info.id).toBe(mockBot.id);
          expect(response.bot_info.username).toBe(mockBot.username);
          expect(response.bot_info.is_bot).toBe(true);
        });
      });
    });
  });
});

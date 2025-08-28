import { describe, expect, it, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { createMockConnectorContext } from '../__mocks__/context';
import { UnipileConnectorConfig } from './unipile';

const server = setupServer(
  http.get('https://api8.unipile.com:13851/accounts', () => {
    return HttpResponse.json({
      items: [
        {
          id: 'account-1',
          name: 'Test Account',
          type: 'WHATSAPP',
          created_at: '2024-01-01',
          sources: [
            { id: 'source-1', status: 'OK' },
            { id: 'source-2_MAILS', status: 'OK' },
          ],
        },
      ],
    });
  }),
  http.get('https://api8.unipile.com:13851/chats', ({ request }) => {
    const url = new URL(request.url);
    const accountId = url.searchParams.get('account_id');
    const limit = url.searchParams.get('limit');
    
    return HttpResponse.json({
      items: [
        {
          id: 'chat-1',
          name: 'Test Chat',
          type: 1,
          folder: ['INBOX'],
          unread: 0,
          archived: 0,
          read_only: 0,
          timestamp: '2024-01-01T10:00:00Z',
          account_id: accountId,
          account_type: 'WHATSAPP',
          unread_count: 0,
          provider_id: 'test-provider',
          attendee_provider_id: 'test-attendee',
          muted_until: null,
        },
      ],
    });
  }),
  http.get('https://api8.unipile.com:13851/messages', ({ request }) => {
    const url = new URL(request.url);
    const chatId = url.searchParams.get('chat_id');
    
    return HttpResponse.json({
      items: [
        {
          id: 'msg-1',
          text: 'Hello, this is a test message',
          timestamp: '2024-01-01T10:00:00Z',
          sender_id: 'sender-1',
          chat_id: chatId,
          account_id: 'account-1',
          provider_id: 'msg-provider-1',
          chat_provider_id: 'chat-provider-1',
          sender_attendee_id: 'attendee-1',
          seen: 0,
          edited: 0,
          hidden: 0,
          deleted: 0,
          delivered: 1,
          is_sender: 0,
          is_event: 0,
          attachments: [],
          reactions: [],
          seen_by: {},
          behavior: null,
          subject: null,
        },
      ],
    });
  }),
  http.get('https://api8.unipile.com:13851/emails', ({ request }) => {
    const url = new URL(request.url);
    const accountId = url.searchParams.get('account_id');
    
    return HttpResponse.json({
      items: [
        {
          id: 'email-1',
          subject: 'Test Email',
          date: '2024-01-01T10:00:00Z',
          role: 'inbox',
          folders: ['INBOX'],
          has_attachments: false,
          from: 'sender@example.com',
          to: ['recipient@example.com'],
          cc: [],
          body_markdown: '# Test Email\n\nThis is a test email.',
        },
      ],
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('#UnipileConnector', () => {
  describe('.GET_ACCOUNTS', () => {
    describe('when credentials are valid', () => {
      it('returns list of connected accounts', async () => {
        const tool = UnipileConnectorConfig.tools.GET_ACCOUNTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials.mockResolvedValue({
          dsn: 'api8.unipile.com:13851',
          apiKey: 'test-api-key',
        });

        const actual = await tool.handler({}, mockContext);
        const response = JSON.parse(actual);

        expect(response.items).toHaveLength(1);
        expect(response.items[0].id).toBe('account-1');
        expect(response.items[0].name).toBe('Test Account');
      });
    });

    describe('when API request fails', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://api8.unipile.com:13851/accounts', () => {
            return new HttpResponse(null, { status: 401 });
          })
        );

        const tool = UnipileConnectorConfig.tools.GET_ACCOUNTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials.mockResolvedValue({
          dsn: 'api8.unipile.com:13851',
          apiKey: 'invalid-key',
        });

        const actual = await tool.handler({}, mockContext);
        const response = JSON.parse(actual);

        expect(response.error).toContain('Failed to get accounts');
      });
    });
  });

  describe('.GET_CHATS', () => {
    describe('when account_id is provided', () => {
      it('returns list of chats for the account', async () => {
        const tool = UnipileConnectorConfig.tools.GET_CHATS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials.mockResolvedValue({
          dsn: 'api8.unipile.com:13851',
          apiKey: 'test-api-key',
        });

        const actual = await tool.handler(
          { account_id: 'source-1', limit: 10 },
          mockContext
        );
        const response = JSON.parse(actual);

        expect(response.items).toHaveLength(1);
        expect(response.items[0].id).toBe('chat-1');
        expect(response.items[0].name).toBe('Test Chat');
      });
    });

    describe('when account_id has suffix', () => {
      it('removes suffix and returns chats', async () => {
        const tool = UnipileConnectorConfig.tools.GET_CHATS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials.mockResolvedValue({
          dsn: 'api8.unipile.com:13851',
          apiKey: 'test-api-key',
        });

        const actual = await tool.handler(
          { account_id: 'source-1_MESSAGING' },
          mockContext
        );
        const response = JSON.parse(actual);

        expect(response.items).toHaveLength(1);
      });
    });
  });

  describe('.GET_CHAT_MESSAGES', () => {
    describe('when chat_id is provided', () => {
      it('returns messages from the chat', async () => {
        const tool = UnipileConnectorConfig.tools.GET_CHAT_MESSAGES as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials.mockResolvedValue({
          dsn: 'api8.unipile.com:13851',
          apiKey: 'test-api-key',
        });

        const actual = await tool.handler(
          { chat_id: 'chat-1', batch_size: 100 },
          mockContext
        );
        const response = JSON.parse(actual);

        expect(response.items).toHaveLength(1);
        expect(response.items[0].id).toBe('msg-1');
        expect(response.items[0].text).toBe('Hello, this is a test message');
      });
    });

    describe('when batch_size is not provided', () => {
      it('uses default batch size', async () => {
        const tool = UnipileConnectorConfig.tools.GET_CHAT_MESSAGES as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials.mockResolvedValue({
          dsn: 'api8.unipile.com:13851',
          apiKey: 'test-api-key',
        });

        const actual = await tool.handler({ chat_id: 'chat-1' }, mockContext);
        const response = JSON.parse(actual);

        expect(response.items).toHaveLength(1);
      });
    });
  });

  describe('.GET_RECENT_MESSAGES', () => {
    describe('when account_id is provided', () => {
      it('returns messages from all chats in the account', async () => {
        const tool = UnipileConnectorConfig.tools.GET_RECENT_MESSAGES as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials.mockResolvedValue({
          dsn: 'api8.unipile.com:13851',
          apiKey: 'test-api-key',
        });

        const actual = await tool.handler(
          { account_id: 'source-1', batch_size: 20 },
          mockContext
        );
        const response = JSON.parse(actual);

        expect(response.messages).toHaveLength(1);
        expect(response.messages[0].chat_info).toBeDefined();
        expect(response.messages[0].chat_info.id).toBe('chat-1');
      });
    });

    describe('when batch_size is not provided', () => {
      it('uses default batch size', async () => {
        const tool = UnipileConnectorConfig.tools.GET_RECENT_MESSAGES as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials.mockResolvedValue({
          dsn: 'api8.unipile.com:13851',
          apiKey: 'test-api-key',
        });

        const actual = await tool.handler({ account_id: 'source-1' }, mockContext);
        const response = JSON.parse(actual);

        expect(response.messages).toHaveLength(1);
      });
    });
  });

  describe('.GET_EMAILS', () => {
    describe('when account_id is provided', () => {
      it('returns emails from the account', async () => {
        const tool = UnipileConnectorConfig.tools.GET_EMAILS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials.mockResolvedValue({
          dsn: 'api8.unipile.com:13851',
          apiKey: 'test-api-key',
        });

        const actual = await tool.handler(
          { account_id: 'source-2', limit: 10 },
          mockContext
        );
        const response = JSON.parse(actual);

        expect(response.items).toHaveLength(1);
        expect(response.items[0].id).toBe('email-1');
        expect(response.items[0].subject).toBe('Test Email');
      });
    });

    describe('when account_id has mail suffix', () => {
      it('removes suffix and returns emails', async () => {
        const tool = UnipileConnectorConfig.tools.GET_EMAILS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials.mockResolvedValue({
          dsn: 'api8.unipile.com:13851',
          apiKey: 'test-api-key',
        });

        const actual = await tool.handler(
          { account_id: 'source-2_MAILS' },
          mockContext
        );
        const response = JSON.parse(actual);

        expect(response.items).toHaveLength(1);
      });
    });

    describe('when limit is not provided', () => {
      it('uses default limit', async () => {
        const tool = UnipileConnectorConfig.tools.GET_EMAILS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials.mockResolvedValue({
          dsn: 'api8.unipile.com:13851',
          apiKey: 'test-api-key',
        });

        const actual = await tool.handler({ account_id: 'source-2' }, mockContext);
        const response = JSON.parse(actual);

        expect(response.items).toHaveLength(1);
      });
    });
  });
});
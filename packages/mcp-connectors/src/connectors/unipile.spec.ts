import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { describe, expect, it } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { UnipileConnectorConfig } from './unipile';

describe('#UnipileConnector', () => {
  describe('.GET_ACCOUNTS', () => {
    describe('when credentials are valid', () => {
      it('returns cleaned account data', async () => {
        const server = setupServer(
          http.get('https://api8.unipile.com:13851/accounts', () => {
            return HttpResponse.json({
              items: [
                {
                  id: 'account-1',
                  name: 'Test WhatsApp Account',
                  type: 'WHATSAPP',
                  created_at: '2024-01-01T10:00:00Z',
                  sources: [{ id: 'source-1', status: 'OK' }],
                  extra_field: 'should_be_filtered_out',
                },
              ],
            });
          })
        );
        server.listen();

        const tool = UnipileConnectorConfig.tools.GET_ACCOUNTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            dsn: 'api8.unipile.com:13851',
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler({}, mockContext);
        const response = JSON.parse(actual);

        expect(response.accounts).toHaveLength(1);
        expect(response.accounts[0]).toEqual({
          id: 'account-1',
          name: 'Test WhatsApp Account',
          type: 'WHATSAPP',
          status: 'OK',
          source_id: 'source-1',
          created_at: '2024-01-01T10:00:00Z',
        });
        expect(response.count).toBe(1);

        server.close();
      });
    });

    describe('when account has no sources', () => {
      it('handles missing sources gracefully', async () => {
        const server = setupServer(
          http.get('https://api8.unipile.com:13851/accounts', () => {
            return HttpResponse.json({
              items: [
                {
                  id: 'account-2',
                  name: 'Account Without Sources',
                  type: 'LINKEDIN',
                  created_at: '2024-01-01T10:00:00Z',
                  sources: [],
                },
              ],
            });
          })
        );
        server.listen();

        const tool = UnipileConnectorConfig.tools.GET_ACCOUNTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            dsn: 'api8.unipile.com:13851',
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler({}, mockContext);
        const response = JSON.parse(actual);

        expect(response.accounts[0].status).toBe('UNKNOWN');
        expect(response.accounts[0].source_id).toBe('account-2');

        server.close();
      });
    });
  });

  describe('.GET_CHATS', () => {
    describe('when account_id is provided', () => {
      it('returns cleaned chat data', async () => {
        const server = setupServer(
          http.get('https://api8.unipile.com:13851/chats', () => {
            return HttpResponse.json({
              items: [
                {
                  id: 'chat-1',
                  name: 'Felix Enslin',
                  unread_count: 2,
                  timestamp: '2024-01-01T10:00:00Z',
                },
              ],
            });
          })
        );
        server.listen();

        const tool = UnipileConnectorConfig.tools.GET_CHATS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            dsn: 'api8.unipile.com:13851',
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler(
          { account_id: 'source-1', limit: 10 },
          mockContext
        );
        const response = JSON.parse(actual);

        expect(response.chats).toHaveLength(1);
        expect(response.chats[0]).toEqual({
          id: 'chat-1',
          name: 'Felix Enslin',
          unread: 2,
          timestamp: '2024-01-01T10:00:00Z',
        });
        expect(response.count).toBe(1);

        server.close();
      });
    });

    describe('when chat has no name', () => {
      it('uses fallback name', async () => {
        const server = setupServer(
          http.get('https://api8.unipile.com:13851/chats', () => {
            return HttpResponse.json({
              items: [
                {
                  id: 'chat-2',
                  name: null,
                  unread_count: 0,
                  timestamp: '2024-01-01T10:00:00Z',
                },
              ],
            });
          })
        );
        server.listen();

        const tool = UnipileConnectorConfig.tools.GET_CHATS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            dsn: 'api8.unipile.com:13851',
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler({ account_id: 'source-1' }, mockContext);
        const response = JSON.parse(actual);

        expect(response.chats[0].name).toBe('Unnamed Chat');

        server.close();
      });
    });
  });

  describe('.GET_CHAT_MESSAGES', () => {
    describe('when chat_id is provided', () => {
      it('returns cleaned message data', async () => {
        const server = setupServer(
          http.get('https://api8.unipile.com:13851/messages', () => {
            return HttpResponse.json({
              items: [
                {
                  id: 'msg-1',
                  text: 'Hello there!',
                  timestamp: '2024-01-01T10:00:00Z',
                  is_sender: 1,
                  attachments: [{ type: 'image' }],
                  quoted: { text: 'Original message' },
                },
              ],
            });
          })
        );
        server.listen();

        const tool = UnipileConnectorConfig.tools.GET_CHAT_MESSAGES as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            dsn: 'api8.unipile.com:13851',
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler(
          { chat_id: 'chat-1', batch_size: 10 },
          mockContext
        );
        const response = JSON.parse(actual);

        expect(response.messages).toHaveLength(1);
        expect(response.messages[0]).toEqual({
          id: 'msg-1',
          text: 'Hello there!',
          timestamp: '2024-01-01T10:00:00Z',
          is_sender: true,
          has_attachments: true,
          quoted_text: 'Original message',
        });

        server.close();
      });
    });

    describe('when batch_size is provided', () => {
      it('limits results to batch_size', async () => {
        const server = setupServer(
          http.get('https://api8.unipile.com:13851/messages', () => {
            return HttpResponse.json({
              items: [
                {
                  id: 'msg-1',
                  text: 'Message 1',
                  timestamp: '2024-01-01T10:00:00Z',
                  is_sender: 0,
                },
                {
                  id: 'msg-2',
                  text: 'Message 2',
                  timestamp: '2024-01-01T10:01:00Z',
                  is_sender: 1,
                },
                {
                  id: 'msg-3',
                  text: 'Message 3',
                  timestamp: '2024-01-01T10:02:00Z',
                  is_sender: 0,
                },
              ],
            });
          })
        );
        server.listen();

        const tool = UnipileConnectorConfig.tools.GET_CHAT_MESSAGES as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            dsn: 'api8.unipile.com:13851',
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler(
          { chat_id: 'chat-1', batch_size: 2 },
          mockContext
        );
        const response = JSON.parse(actual);

        expect(response.messages).toHaveLength(2);
        expect(response.count).toBe(2);
        expect(response.total_available).toBe(3);

        server.close();
      });
    });
  });

  describe('.SEND_MESSAGE', () => {
    describe('when message is sent successfully', () => {
      it('tracks message count and returns response', async () => {
        const server = setupServer(
          http.post(
            'https://api8.unipile.com:13851/chats/chat-1/messages',
            async ({ request }) => {
              const body = (await request.json()) as { text: string };
              expect(body.text).toBe('Hello Felix!');
              return HttpResponse.json({ id: 'sent-msg-1', status: 'sent' });
            }
          )
        );
        server.listen();

        const tool = UnipileConnectorConfig.tools.SEND_MESSAGE as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            dsn: 'api8.unipile.com:13851',
            apiKey: 'test-api-key',
          },
          data: {},
        });

        await tool.handler(
          {
            chat_id: 'chat-1',
            text: 'Hello Felix!',
            contact_name: 'Felix',
          },
          mockContext
        );

        // Check that contact data was stored
        expect(mockContext.setData).toHaveBeenCalledWith(
          'unipile_contacts',
          expect.objectContaining({
            'chat-1': expect.objectContaining({
              id: 'chat-1',
              name: 'Felix',
              message_count: 1,
            }),
          })
        );

        server.close();
      });
    });

    describe('when contact already exists', () => {
      it('increments message count', async () => {
        const server = setupServer(
          http.post('https://api8.unipile.com:13851/chats/chat-1/messages', () => {
            return HttpResponse.json({ id: 'sent-msg-1', status: 'sent' });
          })
        );
        server.listen();

        const tool = UnipileConnectorConfig.tools.SEND_MESSAGE as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            dsn: 'api8.unipile.com:13851',
            apiKey: 'test-api-key',
          },
          data: {
            'chat-1': {
              id: 'chat-1',
              name: 'Felix',
              message_count: 5,
              phone_number: '+1234567890',
              created_at: '2024-01-01T09:00:00Z',
            },
          },
        });

        await tool.handler(
          {
            chat_id: 'chat-1',
            text: 'Another message',
          },
          mockContext
        );

        expect(mockContext.setData).toHaveBeenCalledWith(
          'unipile_contacts',
          expect.objectContaining({
            'chat-1': expect.objectContaining({
              message_count: 6,
            }),
          })
        );

        server.close();
      });
    });
  });

  describe('.SAVE_CONTACT', () => {
    describe('when saving new contact', () => {
      it('creates contact with generated ID', async () => {
        const tool = UnipileConnectorConfig.tools.SAVE_CONTACT as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          data: {},
        });

        const actual = await tool.handler(
          {
            name: 'Felix Enslin',
            phone_number: '+1234567890',
            whatsapp_chat_id: 'chat-felix-123',
            email: 'felix@example.com',
            notes: 'Great contact',
          },
          mockContext
        );
        const response = JSON.parse(actual);

        expect(response.success).toBe(true);
        expect(response.contact_id).toBe('chat-felix-123');
        expect(response.contact.name).toBe('Felix Enslin');
        expect(response.contact.phone_number).toBe('+1234567890');
        expect(response.contact.message_count).toBe(0);
        expect(mockContext.setData).toHaveBeenCalled();
      });
    });

    describe('when updating existing contact', () => {
      it('preserves existing message count and created_at', async () => {
        const tool = UnipileConnectorConfig.tools.SAVE_CONTACT as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          data: {
            'chat-felix-123': {
              id: 'chat-felix-123',
              name: 'Felix',
              message_count: 10,
              created_at: '2024-01-01T09:00:00Z',
            },
          },
        });

        const actual = await tool.handler(
          {
            name: 'Felix Enslin Updated',
            whatsapp_chat_id: 'chat-felix-123',
            email: 'felix.new@example.com',
          },
          mockContext
        );
        const response = JSON.parse(actual);

        expect(response.contact.name).toBe('Felix Enslin Updated');
        expect(response.contact.message_count).toBe(10);
        expect(response.contact.created_at).toBe('2024-01-01T09:00:00Z');
        expect(response.contact.email).toBe('felix.new@example.com');
      });
    });
  });

  describe('.UPDATE_CONTACT', () => {
    describe('when contact exists', () => {
      it('updates specified fields only', async () => {
        const tool = UnipileConnectorConfig.tools.UPDATE_CONTACT as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          data: {
            'contact-123': {
              id: 'contact-123',
              name: 'Original Name',
              phone_number: '+1111111111',
              email: 'old@example.com',
              message_count: 5,
              custom_fields: { company: 'OldCorp' },
              created_at: '2024-01-01T09:00:00Z',
            },
          },
        });

        const actual = await tool.handler(
          {
            contact_id: 'contact-123',
            name: 'Updated Name',
            email: 'new@example.com',
            custom_fields: { company: 'NewCorp', role: 'Manager' },
          },
          mockContext
        );
        const response = JSON.parse(actual);

        expect(response.success).toBe(true);
        expect(response.contact.name).toBe('Updated Name');
        expect(response.contact.phone_number).toBe('+1111111111');
        expect(response.contact.email).toBe('new@example.com');
        expect(response.contact.message_count).toBe(5);
        expect(response.contact.custom_fields).toEqual({
          company: 'NewCorp',
          role: 'Manager',
        });
      });
    });

    describe('when contact does not exist', () => {
      it('returns error with available contacts', async () => {
        const tool = UnipileConnectorConfig.tools.UPDATE_CONTACT as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          data: {
            'contact-456': { id: 'contact-456', name: 'Other Contact' },
          },
        });

        const actual = await tool.handler(
          {
            contact_id: 'nonexistent-contact',
            name: 'Updated Name',
          },
          mockContext
        );
        const response = JSON.parse(actual);

        expect(response.error).toContain(
          'Contact with ID "nonexistent-contact" not found'
        );
        expect(response.available_contacts).toEqual(['contact-456']);
      });
    });
  });

  describe('.GET_ALL_STORED_CONTACTS', () => {
    describe('when contacts exist', () => {
      it('returns all contact data with field info', async () => {
        const tool = UnipileConnectorConfig.tools
          .GET_ALL_STORED_CONTACTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          data: {
            'contact-1': {
              id: 'contact-1',
              name: 'Felix Enslin',
              phone_number: '+1234567890',
              message_count: 10,
            },
            'contact-2': {
              id: 'contact-2',
              name: 'Jane Doe',
              email: 'jane@example.com',
              message_count: 5,
            },
          },
        });

        const actual = await tool.handler({}, mockContext);
        const response = JSON.parse(actual);

        expect(response.contacts).toHaveLength(2);
        expect(response.count).toBe(2);
        expect(response.fields_available).toContain('message_count');
        expect(response.fields_available).toContain('phone_number');
      });
    });
  });

  describe('.SEARCH_CONTACTS', () => {
    describe('when searching stored contacts', () => {
      it('finds contacts using lexical search', async () => {
        const tool = UnipileConnectorConfig.tools.SEARCH_CONTACTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            dsn: 'api8.unipile.com:13851',
            apiKey: 'test-api-key',
          },
          data: {
            'contact-1': {
              id: 'contact-1',
              name: 'Felix Enslin',
              phone_number: '+1234567890',
              whatsapp_chat_id: 'chat-felix-123',
            },
            'contact-2': {
              id: 'contact-2',
              name: 'John Doe',
              email: 'john@example.com',
            },
          },
        });

        const actual = await tool.handler({ query: 'Felix' }, mockContext);
        const response = JSON.parse(actual);

        expect(response.found_contacts).toBe(true);
        expect(response.best_match.name).toBe('Felix Enslin');
        expect(response.best_match.confidence).toBe('high');
        expect(response.recommendation).toContain('Use chat_id: contact-1');
      });
    });

    describe('when searching chat history', () => {
      it('searches progressive time periods', async () => {
        const server = setupServer(
          http.get('https://api8.unipile.com:13851/chats', () => {
            return HttpResponse.json({
              items: [
                {
                  id: 'chat-jiro-456',
                  name: 'Jiro Blogs',
                  unread_count: 1,
                  timestamp: '2024-01-01T10:00:00Z',
                },
              ],
            });
          })
        );
        server.listen();

        const tool = UnipileConnectorConfig.tools.SEARCH_CONTACTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            dsn: 'api8.unipile.com:13851',
            apiKey: 'test-api-key',
          },
          data: {},
        });

        const actual = await tool.handler(
          {
            query: 'Jiro',
            account_type: 'WHATSAPP',
          },
          mockContext
        );
        const response = JSON.parse(actual);

        expect(response.found_contacts).toBe(true);
        expect(response.best_match.name).toBe('Jiro Blogs');
        expect(response.best_match.id).toBe('chat-jiro-456');

        server.close();
      });
    });

    describe('when no contacts found', () => {
      it('returns helpful suggestions', async () => {
        const server = setupServer(
          http.get('https://api8.unipile.com:13851/chats', () => {
            return HttpResponse.json({ items: [] });
          })
        );
        server.listen();

        const tool = UnipileConnectorConfig.tools.SEARCH_CONTACTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            dsn: 'api8.unipile.com:13851',
            apiKey: 'test-api-key',
          },
          data: {},
        });

        const actual = await tool.handler({ query: 'NonexistentPerson' }, mockContext);
        const response = JSON.parse(actual);

        expect(response.found_contacts).toBe(false);
        expect(response.recommendation).toContain('No contacts found');
        expect(response.suggested_next_steps).toContain(
          'Try GET_RECENT_MESSAGES and search content'
        );

        server.close();
      });
    });
  });

  describe('.CLEAR_CONTACT_MEMORY', () => {
    describe('when clearing contacts', () => {
      it('clears all stored contact data', async () => {
        const tool = UnipileConnectorConfig.tools
          .CLEAR_CONTACT_MEMORY as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler({}, mockContext);
        const response = JSON.parse(actual);

        expect(response.success).toBe(true);
        expect(response.message).toContain('Contact memory cleared');
        expect(mockContext.setData).toHaveBeenCalledWith('unipile_contacts', {});
      });
    });
  });
});
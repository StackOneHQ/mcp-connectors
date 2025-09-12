import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { CustomerIOConnectorConfig } from './customerio';

const mockCredentials = { appApiKey: 'test-api-key' };
const mockSetup = { region: 'us' as const };

describe('#CustomerIOConnector', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterAll(() => server.close());
  afterEach(() => server.resetHandlers());

  describe('.SEND_TRANSACTIONAL_EMAIL', () => {
    describe('when email data is valid', () => {
      describe('and all required fields are provided', () => {
        it('returns delivery confirmation', async () => {
          server.use(
            http.post('https://api.customer.io/v1/api/send-email', () => {
              return HttpResponse.json({
                delivery_id: 'test-delivery-123',
                queued_at: 1672531200,
              });
            })
          );

          const tool = CustomerIOConnectorConfig.tools
            .SEND_TRANSACTIONAL_EMAIL as MCPToolDefinition;
          const mockContext = createMockConnectorContext({
            credentials: mockCredentials,
            setup: mockSetup,
          });

          const actual = await tool.handler(
            {
              to: 'test@example.com',
              subject: 'Welcome!',
              body: '<h1>Welcome to our platform!</h1>',
            },
            mockContext
          );

          const response = JSON.parse(actual);
          expect(response.delivery_id).toBe('test-delivery-123');
          expect(response.queued_at).toBe(1672531200);
        });
      });

      describe('and optional message data is provided', () => {
        it('includes personalization data in request', async () => {
          server.use(
            http.post('https://api.customer.io/v1/api/send-email', () => {
              return HttpResponse.json({
                delivery_id: 'test-delivery-123',
                queued_at: 1672531200,
              });
            })
          );

          const tool = CustomerIOConnectorConfig.tools
            .SEND_TRANSACTIONAL_EMAIL as MCPToolDefinition;
          const mockContext = createMockConnectorContext({
            credentials: mockCredentials,
            setup: mockSetup,
          });

          const actual = await tool.handler(
            {
              to: 'test@example.com',
              subject: 'Hello {{name}}!',
              body: '<h1>Welcome {{name}}!</h1>',
              message_data: { name: 'John' },
              identifiers: { id: 'user123' },
            },
            mockContext
          );

          const response = JSON.parse(actual);
          expect(response.delivery_id).toBe('test-delivery-123');
        });
      });
    });

    describe('when API request fails', () => {
      it('returns error message', async () => {
        server.use(
          http.post('https://api.customer.io/v1/api/send-email', () => {
            return new HttpResponse(null, { status: 500 });
          })
        );

        const tool = CustomerIOConnectorConfig.tools
          .SEND_TRANSACTIONAL_EMAIL as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: mockCredentials,
          setup: mockSetup,
        });

        const actual = await tool.handler(
          {
            to: 'test@example.com',
            subject: 'Test',
            body: 'Test body',
          },
          mockContext
        );

        expect(actual).toContain('Failed to send transactional email');
      });
    });
  });

  describe('.TRIGGER_BROADCAST', () => {
    describe('when broadcast data is valid', () => {
      describe('and broadcast ID is provided', () => {
        it('triggers broadcast successfully', async () => {
          server.use(
            http.post('https://api.customer.io/v1/api/campaigns/123/triggers', () => {
              return HttpResponse.json({
                broadcast_id: 123,
                run_id: 'run-456',
              });
            })
          );

          const tool = CustomerIOConnectorConfig.tools
            .TRIGGER_BROADCAST as MCPToolDefinition;
          const mockContext = createMockConnectorContext({
            credentials: mockCredentials,
            setup: mockSetup,
          });

          const actual = await tool.handler(
            {
              broadcast_id: 123,
              data: { product: 'New Product' },
              emails: ['test1@example.com', 'test2@example.com'],
            },
            mockContext
          );

          const response = JSON.parse(actual);
          expect(response.broadcast_id).toBe(123);
          expect(response.run_id).toBe('run-456');
        });
      });

      describe('and per-user data is provided', () => {
        it('includes personalized data for each user', async () => {
          server.use(
            http.post('https://api.customer.io/v1/api/campaigns/123/triggers', () => {
              return HttpResponse.json({
                broadcast_id: 123,
                run_id: 'run-456',
              });
            })
          );

          const tool = CustomerIOConnectorConfig.tools
            .TRIGGER_BROADCAST as MCPToolDefinition;
          const mockContext = createMockConnectorContext({
            credentials: mockCredentials,
            setup: mockSetup,
          });

          const actual = await tool.handler(
            {
              broadcast_id: 123,
              per_user_data: [
                { email: 'test1@example.com', data: { name: 'John' } },
                { email: 'test2@example.com', data: { name: 'Jane' } },
              ],
            },
            mockContext
          );

          const response = JSON.parse(actual);
          expect(response.broadcast_id).toBe(123);
        });
      });
    });

    describe('when API request fails', () => {
      it('returns error message', async () => {
        server.use(
          http.post('https://api.customer.io/v1/api/campaigns/123/triggers', () => {
            return new HttpResponse(null, { status: 400 });
          })
        );

        const tool = CustomerIOConnectorConfig.tools
          .TRIGGER_BROADCAST as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: mockCredentials,
          setup: mockSetup,
        });

        const actual = await tool.handler(
          {
            broadcast_id: 123,
          },
          mockContext
        );

        expect(actual).toContain('Failed to trigger broadcast');
      });
    });
  });

  describe('.LIST_CAMPAIGNS', () => {
    describe('when API call succeeds', () => {
      it('returns list of campaigns', async () => {
        server.use(
          http.get('https://api.customer.io/v1/api/campaigns', () => {
            return HttpResponse.json({
              campaigns: [
                {
                  id: 1,
                  name: 'Welcome Campaign',
                  state: 'active',
                  created_at: 1672531200,
                  updated_at: 1672531300,
                },
                {
                  id: 2,
                  name: 'Product Launch Broadcast',
                  state: 'draft',
                  type: 'broadcast',
                  created_at: 1672531400,
                  updated_at: 1672531500,
                },
              ],
            });
          })
        );

        const tool = CustomerIOConnectorConfig.tools.LIST_CAMPAIGNS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: mockCredentials,
          setup: mockSetup,
        });

        const actual = await tool.handler({}, mockContext);

        const response = JSON.parse(actual);
        expect(response.campaigns).toHaveLength(2);
        expect(response.campaigns[0].name).toBe('Welcome Campaign');
        expect(response.campaigns[1].name).toBe('Product Launch Broadcast');
      });
    });

    describe('when API request fails', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://api.customer.io/v1/api/campaigns', () => {
            return new HttpResponse(null, { status: 401 });
          })
        );

        const tool = CustomerIOConnectorConfig.tools.LIST_CAMPAIGNS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: mockCredentials,
          setup: mockSetup,
        });

        const actual = await tool.handler({}, mockContext);

        expect(actual).toContain('Failed to list campaigns');
      });
    });
  });

  describe('.GET_CAMPAIGN', () => {
    describe('when campaign ID is valid', () => {
      it('returns campaign details', async () => {
        server.use(
          http.get('https://api.customer.io/v1/api/campaigns/1', () => {
            return HttpResponse.json({
              id: 1,
              name: 'Test Campaign',
              state: 'active',
              created_at: 1672531200,
              updated_at: 1672531300,
            });
          })
        );

        const tool = CustomerIOConnectorConfig.tools.GET_CAMPAIGN as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: mockCredentials,
          setup: mockSetup,
        });

        const actual = await tool.handler(
          {
            campaign_id: 1,
          },
          mockContext
        );

        const response = JSON.parse(actual);
        expect(response.id).toBe(1);
        expect(response.name).toBe('Test Campaign');
        expect(response.state).toBe('active');
      });
    });

    describe('when campaign ID does not exist', () => {
      it('handles not found error', async () => {
        server.use(
          http.get('https://api.customer.io/v1/api/campaigns/999', () => {
            return new HttpResponse(null, { status: 404 });
          })
        );

        const tool = CustomerIOConnectorConfig.tools.GET_CAMPAIGN as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: mockCredentials,
          setup: mockSetup,
        });

        const actual = await tool.handler(
          {
            campaign_id: 999,
          },
          mockContext
        );

        expect(actual).toContain('Failed to get campaign');
      });
    });
  });

  describe('.LIST_BROADCASTS', () => {
    describe('when API call succeeds', () => {
      it('filters campaigns to show only broadcasts', async () => {
        server.use(
          http.get('https://api.customer.io/v1/api/campaigns', () => {
            return HttpResponse.json({
              campaigns: [
                {
                  id: 1,
                  name: 'Welcome Campaign',
                  state: 'active',
                  created_at: 1672531200,
                  updated_at: 1672531300,
                },
                {
                  id: 2,
                  name: 'Product Launch Broadcast',
                  state: 'draft',
                  type: 'broadcast',
                  created_at: 1672531400,
                  updated_at: 1672531500,
                },
              ],
            });
          })
        );

        const tool = CustomerIOConnectorConfig.tools.LIST_BROADCASTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: mockCredentials,
          setup: mockSetup,
        });

        const actual = await tool.handler({}, mockContext);

        const response = JSON.parse(actual);
        expect(response.broadcasts).toHaveLength(1);
        expect(response.broadcasts[0].name).toBe('Product Launch Broadcast');
      });
    });
  });

  describe('.GET_CAMPAIGN_METRICS', () => {
    describe('when campaign ID is valid', () => {
      describe('and no period is specified', () => {
        it('returns campaign metrics', async () => {
          server.use(
            http.get('https://api.customer.io/v1/api/campaigns/1/metrics', () => {
              return HttpResponse.json({
                sent: 1000,
                delivered: 950,
                opened: 400,
                clicked: 100,
              });
            })
          );

          const tool = CustomerIOConnectorConfig.tools
            .GET_CAMPAIGN_METRICS as MCPToolDefinition;
          const mockContext = createMockConnectorContext({
            credentials: mockCredentials,
            setup: mockSetup,
          });

          const actual = await tool.handler(
            {
              campaign_id: 1,
            },
            mockContext
          );

          const response = JSON.parse(actual);
          expect(response.sent).toBe(1000);
          expect(response.delivered).toBe(950);
          expect(response.opened).toBe(400);
          expect(response.clicked).toBe(100);
        });
      });

      describe('and period is specified', () => {
        it('includes period parameter in request', async () => {
          server.use(
            http.get(
              'https://api.customer.io/v1/api/campaigns/1/metrics',
              ({ request }) => {
                const url = new URL(request.url);
                expect(url.searchParams.get('period')).toBe('7d');

                return HttpResponse.json({
                  sent: 1000,
                  delivered: 950,
                  opened: 400,
                  clicked: 100,
                });
              }
            )
          );

          const tool = CustomerIOConnectorConfig.tools
            .GET_CAMPAIGN_METRICS as MCPToolDefinition;
          const mockContext = createMockConnectorContext({
            credentials: mockCredentials,
            setup: mockSetup,
          });

          const actual = await tool.handler(
            {
              campaign_id: 1,
              period: '7d',
            },
            mockContext
          );

          const response = JSON.parse(actual);
          expect(response.sent).toBe(1000);
        });
      });
    });
  });

  describe('.GET_CAMPAIGN_ACTIONS', () => {
    describe('when campaign ID is valid', () => {
      it('returns campaign actions', async () => {
        server.use(
          http.get('https://api.customer.io/v1/api/campaigns/1/actions', () => {
            return HttpResponse.json({
              actions: [
                {
                  id: 1,
                  type: 'email',
                  name: 'Welcome Email',
                },
              ],
            });
          })
        );

        const tool = CustomerIOConnectorConfig.tools
          .GET_CAMPAIGN_ACTIONS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: mockCredentials,
          setup: mockSetup,
        });

        const actual = await tool.handler(
          {
            campaign_id: 1,
          },
          mockContext
        );

        const response = JSON.parse(actual);
        expect(response.actions).toHaveLength(1);
        expect(response.actions[0].type).toBe('email');
        expect(response.actions[0].name).toBe('Welcome Email');
      });
    });
  });

  describe('.GET_CAMPAIGN_ACTIVITIES', () => {
    describe('when campaign ID is valid', () => {
      it('returns campaign activities', async () => {
        server.use(
          http.get('https://api.customer.io/v1/api/campaigns/1/activities', () => {
            return HttpResponse.json({
              activities: [
                {
                  id: 1,
                  name: 'Welcome Message',
                  type: 'email',
                  created_at: 1672531200,
                  updated_at: 1672531300,
                },
              ],
            });
          })
        );

        const tool = CustomerIOConnectorConfig.tools
          .GET_CAMPAIGN_ACTIVITIES as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: mockCredentials,
          setup: mockSetup,
        });

        const actual = await tool.handler(
          {
            campaign_id: 1,
          },
          mockContext
        );

        const response = JSON.parse(actual);
        expect(response.activities).toHaveLength(1);
        expect(response.activities[0].name).toBe('Welcome Message');
        expect(response.activities[0].type).toBe('email');
      });
    });
  });

  describe('.GET_CAMPAIGN_MESSAGES', () => {
    describe('when campaign ID is valid', () => {
      it('returns campaign messages', async () => {
        server.use(
          http.get('https://api.customer.io/v1/api/campaigns/1/messages', () => {
            return HttpResponse.json({
              messages: [
                {
                  id: 1,
                  name: 'Welcome Email',
                  type: 'email',
                  subject: 'Welcome to our platform!',
                  created_at: 1672531200,
                  updated_at: 1672531300,
                },
              ],
            });
          })
        );

        const tool = CustomerIOConnectorConfig.tools
          .GET_CAMPAIGN_MESSAGES as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: mockCredentials,
          setup: mockSetup,
        });

        const actual = await tool.handler(
          {
            campaign_id: 1,
          },
          mockContext
        );

        const response = JSON.parse(actual);
        expect(response.messages).toHaveLength(1);
        expect(response.messages[0].name).toBe('Welcome Email');
        expect(response.messages[0].subject).toBe('Welcome to our platform!');
      });
    });
  });

  describe('.CREATE_EXPORT', () => {
    describe('when export request is valid', () => {
      it('creates export successfully', async () => {
        server.use(
          http.post('https://api.customer.io/v1/api/exports', () => {
            return HttpResponse.json({
              export_id: 'export-123',
              status: 'pending',
            });
          })
        );

        const tool = CustomerIOConnectorConfig.tools.CREATE_EXPORT as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: mockCredentials,
          setup: mockSetup,
        });

        const actual = await tool.handler(
          {
            type: 'campaigns',
            start: 1672531200,
            end: 1675123200,
            format: 'csv',
          },
          mockContext
        );

        const response = JSON.parse(actual);
        expect(response.export_id).toBe('export-123');
        expect(response.status).toBe('pending');
      });
    });
  });

  describe('.GET_EXPORT_STATUS', () => {
    describe('when export ID is valid', () => {
      it('returns export status', async () => {
        server.use(
          http.get('https://api.customer.io/v1/api/exports/export-123', () => {
            return HttpResponse.json({
              export_id: 'export-123',
              status: 'completed',
              download_url: 'https://download.example.com/export.csv',
            });
          })
        );

        const tool = CustomerIOConnectorConfig.tools
          .GET_EXPORT_STATUS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: mockCredentials,
          setup: mockSetup,
        });

        const actual = await tool.handler(
          {
            export_id: 'export-123',
          },
          mockContext
        );

        const response = JSON.parse(actual);
        expect(response.export_id).toBe('export-123');
        expect(response.status).toBe('completed');
        expect(response.download_url).toBe('https://download.example.com/export.csv');
      });
    });
  });

  describe('.LIST_NEWSLETTERS', () => {
    describe('when API call succeeds', () => {
      it('returns list of newsletters', async () => {
        server.use(
          http.get('https://api.customer.io/v1/api/newsletters', () => {
            return HttpResponse.json({
              newsletters: [
                {
                  id: 1,
                  name: 'Weekly Newsletter',
                  subject: 'Your weekly update',
                  created_at: 1672531200,
                },
              ],
            });
          })
        );

        const tool = CustomerIOConnectorConfig.tools
          .LIST_NEWSLETTERS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: mockCredentials,
          setup: mockSetup,
        });

        const actual = await tool.handler({}, mockContext);

        const response = JSON.parse(actual);
        expect(response.newsletters).toHaveLength(1);
        expect(response.newsletters[0].name).toBe('Weekly Newsletter');
      });
    });
  });

  describe('when using EU region', () => {
    const mockEuSetup = { region: 'eu' as const };

    it('uses EU API endpoint', async () => {
      server.use(
        http.post('https://api-eu.customer.io/v1/api/send-email', () => {
          return HttpResponse.json({
            delivery_id: 'eu-delivery-123',
            queued_at: 1672531200,
          });
        })
      );

      const tool = CustomerIOConnectorConfig.tools
        .SEND_TRANSACTIONAL_EMAIL as MCPToolDefinition;
      const mockContext = createMockConnectorContext({
        credentials: mockCredentials,
        setup: mockEuSetup,
      });

      const actual = await tool.handler(
        {
          to: 'test@example.com',
          subject: 'EU Test',
          body: 'Test body',
        },
        mockContext
      );

      const response = JSON.parse(actual);
      expect(response.delivery_id).toBe('eu-delivery-123');
    });
  });
});

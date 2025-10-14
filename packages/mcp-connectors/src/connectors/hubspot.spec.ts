import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { extractToolsFromServer } from '../__mocks__/server-tools';
import { createHubSpotServer } from './hubspot';

const HUBSPOT_API_BASE = 'https://api.hubapi.com';

describe('#HubSpotConnector', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterAll(() => server.close());
  afterEach(() => server.resetHandlers());

  describe('.GET_CONTACTS', () => {
    describe('when fetching contacts successfully', () => {
      it('returns a list of contacts', async () => {
        const mockContacts = {
          results: [
            {
              id: '1',
              properties: {
                email: 'john@example.com',
                firstname: 'John',
                lastname: 'Doe',
              },
            },
          ],
          paging: {
            next: {
              after: '100',
            },
          },
        };

        server.use(
          http.get(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts`, () => {
            return HttpResponse.json(mockContacts);
          })
        );

        const mcpServer = createHubSpotServer({ apiKey: 'test-api-key' });
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.hubspot_get_contacts.handler({ limit: 10 });

        const content = JSON.parse(actual);
        expect(content.results).toHaveLength(1);
        expect(content.results[0].properties.email).toBe('john@example.com');
      });

      describe('and pagination is provided', () => {
        it('includes pagination parameters', async () => {
          const mockContacts = { results: [], paging: {} };

          let capturedUrl: URL | undefined;
          server.use(
            http.get(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts`, ({ request }) => {
              capturedUrl = new URL(request.url);
              return HttpResponse.json(mockContacts);
            })
          );

          const mcpServer = createHubSpotServer({ apiKey: 'test-api-key' });
          const tools = extractToolsFromServer(mcpServer);
          await tools.hubspot_get_contacts.handler({ limit: 20, after: 'cursor123' });

          expect(capturedUrl?.searchParams.get('limit')).toBe('20');
          expect(capturedUrl?.searchParams.get('after')).toBe('cursor123');
        });
      });

      describe('and properties are specified', () => {
        it('includes property parameters', async () => {
          const mockContacts = { results: [], paging: {} };

          let capturedUrl: URL | undefined;
          server.use(
            http.get(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts`, ({ request }) => {
              capturedUrl = new URL(request.url);
              return HttpResponse.json(mockContacts);
            })
          );

          const mcpServer = createHubSpotServer({ apiKey: 'test-api-key' });
          const tools = extractToolsFromServer(mcpServer);
          await tools.hubspot_get_contacts.handler({
            properties: ['email', 'firstname', 'company'],
          });

          const properties = capturedUrl?.searchParams.getAll('properties');
          expect(properties).toEqual(['email', 'firstname', 'company']);
        });
      });
    });

    describe('when API returns an error', () => {
      it('returns error message', async () => {
        server.use(
          http.get(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts`, () => {
            return HttpResponse.text('Invalid API key', { status: 401 });
          })
        );

        const mcpServer = createHubSpotServer({ apiKey: 'invalid-key' });
        const tools = extractToolsFromServer(mcpServer);
        const result = await tools.hubspot_get_contacts.handler({});

        expect(result).toContain('Failed to fetch contacts');
        expect(result).toContain('401');
      });
    });
  });

  describe('.GET_DEALS', () => {
    describe('when fetching deals successfully', () => {
      it('returns a list of deals', async () => {
        const mockDeals = {
          results: [
            {
              id: '1',
              properties: {
                dealname: 'Big Deal',
                amount: '10000',
                dealstage: 'closedwon',
              },
            },
          ],
          paging: {},
        };

        server.use(
          http.get(`${HUBSPOT_API_BASE}/crm/v3/objects/deals`, () => {
            return HttpResponse.json(mockDeals);
          })
        );

        const mcpServer = createHubSpotServer({ apiKey: 'test-api-key' });
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.hubspot_get_deals.handler({ limit: 10 });

        const content = JSON.parse(actual);
        expect(content.results).toHaveLength(1);
        expect(content.results[0].properties.dealname).toBe('Big Deal');
      });

      describe('and pagination is provided', () => {
        it('includes pagination parameters', async () => {
          const mockDeals = { results: [], paging: {} };

          let capturedUrl: URL | undefined;
          server.use(
            http.get(`${HUBSPOT_API_BASE}/crm/v3/objects/deals`, ({ request }) => {
              capturedUrl = new URL(request.url);
              return HttpResponse.json(mockDeals);
            })
          );

          const mcpServer = createHubSpotServer({ apiKey: 'test-api-key' });
          const tools = extractToolsFromServer(mcpServer);
          await tools.hubspot_get_deals.handler({ limit: 50, after: 'next-page' });

          expect(capturedUrl?.searchParams.get('limit')).toBe('50');
          expect(capturedUrl?.searchParams.get('after')).toBe('next-page');
        });
      });
    });

    describe('when API returns an error', () => {
      it('returns error message', async () => {
        server.use(
          http.get(`${HUBSPOT_API_BASE}/crm/v3/objects/deals`, () => {
            return HttpResponse.text('Forbidden', { status: 403 });
          })
        );

        const mcpServer = createHubSpotServer({ apiKey: 'test-api-key' });
        const tools = extractToolsFromServer(mcpServer);
        const result = await tools.hubspot_get_deals.handler({});

        expect(result).toContain('Failed to fetch deals');
        expect(result).toContain('403');
      });
    });
  });

  describe('.CREATE_CONTACT', () => {
    describe('when creating a contact successfully', () => {
      it('returns the created contact', async () => {
        const createdContact = {
          id: '123',
          properties: {
            email: 'new@example.com',
            firstname: 'Jane',
            lastname: 'Smith',
          },
        };

        server.use(
          http.post(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts`, () => {
            return HttpResponse.json(createdContact);
          })
        );

        const mcpServer = createHubSpotServer({ apiKey: 'test-api-key' });
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.hubspot_create_contact.handler({
          email: 'new@example.com',
          firstname: 'Jane',
          lastname: 'Smith',
        });

        const content = JSON.parse(actual);
        expect(content.id).toBe('123');
        expect(content.properties.email).toBe('new@example.com');
      });

      describe('and additional properties are provided', () => {
        it('includes all properties in the request', async () => {
          let capturedBody: Record<string, unknown> = {};
          server.use(
            http.post(
              `${HUBSPOT_API_BASE}/crm/v3/objects/contacts`,
              async ({ request }) => {
                capturedBody = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json({ id: '123', properties: {} });
              }
            )
          );

          const mcpServer = createHubSpotServer({ apiKey: 'test-api-key' });
          const tools = extractToolsFromServer(mcpServer);
          await tools.hubspot_create_contact.handler({
            email: 'test@example.com',
            company: 'Test Corp',
            phone: '555-1234',
            website: 'https://example.com',
            additionalProperties: {
              custom_field: 'value',
            },
          });

          const properties = capturedBody.properties as Record<string, unknown>;
          expect(properties.email).toBe('test@example.com');
          expect(properties.company).toBe('Test Corp');
          expect(properties.phone).toBe('555-1234');
          expect(properties.website).toBe('https://example.com');
          expect(properties.custom_field).toBe('value');
        });
      });
    });

    describe('when API returns an error', () => {
      it('returns error message', async () => {
        server.use(
          http.post(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts`, () => {
            return HttpResponse.text('Contact already exists', { status: 409 });
          })
        );

        const mcpServer = createHubSpotServer({ apiKey: 'test-api-key' });
        const tools = extractToolsFromServer(mcpServer);
        const result = await tools.hubspot_create_contact.handler({
          email: 'duplicate@example.com',
        });

        expect(result).toContain('Failed to create contact');
        expect(result).toContain('409');
      });
    });
  });

  describe('.CREATE_DEAL', () => {
    describe('when creating a deal successfully', () => {
      it('returns the created deal', async () => {
        const createdDeal = {
          id: '456',
          properties: {
            dealname: 'New Deal',
            amount: '50000',
            dealstage: 'presentationscheduled',
          },
        };

        server.use(
          http.post(`${HUBSPOT_API_BASE}/crm/v3/objects/deals`, () => {
            return HttpResponse.json(createdDeal);
          })
        );

        const mcpServer = createHubSpotServer({ apiKey: 'test-api-key' });
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.hubspot_create_deal.handler({
          dealname: 'New Deal',
          amount: '50000',
          dealstage: 'presentationscheduled',
        });

        const content = JSON.parse(actual);
        expect(content.id).toBe('456');
        expect(content.properties.dealname).toBe('New Deal');
      });

      describe('and all optional properties are provided', () => {
        it('includes all properties in the request', async () => {
          let capturedBody: Record<string, unknown> = {};
          server.use(
            http.post(`${HUBSPOT_API_BASE}/crm/v3/objects/deals`, async ({ request }) => {
              capturedBody = (await request.json()) as Record<string, unknown>;
              return HttpResponse.json({ id: '456', properties: {} });
            })
          );

          const mcpServer = createHubSpotServer({ apiKey: 'test-api-key' });
          const tools = extractToolsFromServer(mcpServer);
          await tools.hubspot_create_deal.handler({
            dealname: 'Big Deal',
            amount: '100000',
            dealstage: 'qualifiedtobuy',
            pipeline: 'default',
            closedate: '2024-12-31',
            hubspot_owner_id: 'owner123',
            additionalProperties: {
              custom_property: 'custom_value',
            },
          });

          const properties = capturedBody.properties as Record<string, unknown>;
          expect(properties.dealname).toBe('Big Deal');
          expect(properties.amount).toBe('100000');
          expect(properties.dealstage).toBe('qualifiedtobuy');
          expect(properties.pipeline).toBe('default');
          expect(properties.closedate).toBe('2024-12-31');
          expect(properties.hubspot_owner_id).toBe('owner123');
          expect(properties.custom_property).toBe('custom_value');
        });
      });
    });

    describe('when API returns an error', () => {
      it('returns error message', async () => {
        server.use(
          http.post(`${HUBSPOT_API_BASE}/crm/v3/objects/deals`, () => {
            return HttpResponse.text('Invalid pipeline', { status: 400 });
          })
        );

        const mcpServer = createHubSpotServer({ apiKey: 'test-api-key' });
        const tools = extractToolsFromServer(mcpServer);
        const result = await tools.hubspot_create_deal.handler({ dealname: 'Test Deal' });

        expect(result).toContain('Failed to create deal');
        expect(result).toContain('400');
      });
    });
  });
});

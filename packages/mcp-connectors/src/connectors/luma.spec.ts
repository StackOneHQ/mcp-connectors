import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { describe, expect, it } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { LumaConnectorConfig } from './luma';

const server = setupServer();

describe('#LumaConnector', () => {
  describe('.GET_SELF', () => {
    describe('when request is successful', () => {
      it('returns authenticated user information', async () => {
        const mockUser = {
          api_id: 'usr-abc123',
          name: 'John Doe',
          username: 'johndoe',
          email: 'john@example.com',
          avatar_url: 'https://example.com/avatar.jpg',
        };

        server.use(
          http.get('https://public-api.luma.com/v1/user/get-self', () => {
            return HttpResponse.json(mockUser);
          })
        );

        server.listen();

        const tool = LumaConnectorConfig.tools.GET_SELF as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler({}, mockContext);

        expect(actual).toContain('"api_id": "usr-abc123"');
        expect(actual).toContain('"name": "John Doe"');
        expect(actual).toContain('"email": "john@example.com"');
        expect(actual).toContain('calendar_api_id');

        server.close();
      });
    });

    describe('when API returns error', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://public-api.luma.com/v1/user/get-self', () => {
            return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
          })
        );

        server.listen();

        const tool = LumaConnectorConfig.tools.GET_SELF as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'invalid-key',
          },
        });

        const actual = await tool.handler({}, mockContext);

        expect(actual).toContain('Failed to get user info');
        expect(actual).toContain('401');

        server.close();
      });
    });
  });

  describe('.GET_EVENT', () => {
    describe('when event exists', () => {
      it('returns detailed event information', async () => {
        const mockEvent = {
          api_id: 'evt-xyz789',
          name: 'Tech Conference 2024',
          description: 'Annual tech conference',
          start_at: '2024-06-15T09:00:00Z',
          end_at: '2024-06-15T17:00:00Z',
          timezone: 'America/New_York',
          url: 'https://lu.ma/tech-conf-2024',
          cover_url: 'https://example.com/cover.jpg',
          visibility: 'public',
          capacity: 500,
          location: {
            type: 'venue',
            address: '123 Conference Center Dr, San Francisco, CA',
          },
        };

        server.use(
          http.get('https://public-api.luma.com/v1/event/get', () => {
            return HttpResponse.json(mockEvent);
          })
        );

        server.listen();

        const tool = LumaConnectorConfig.tools.GET_EVENT as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler({ eventId: 'evt-xyz789' }, mockContext);

        expect(actual).toContain('"api_id": "evt-xyz789"');
        expect(actual).toContain('"name": "Tech Conference 2024"');
        expect(actual).toContain('"capacity": 500');

        server.close();
      });
    });

    describe('when event does not exist', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://public-api.luma.com/v1/event/get', () => {
            return HttpResponse.json({ error: 'Event not found' }, { status: 404 });
          })
        );

        server.listen();

        const tool = LumaConnectorConfig.tools.GET_EVENT as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler({ eventId: 'nonexistent' }, mockContext);

        expect(actual).toContain('Failed to get event');
        expect(actual).toContain('404');

        server.close();
      });
    });
  });

  describe('.CREATE_EVENT', () => {
    describe('when creation is successful', () => {
      it('returns created event', async () => {
        const newEvent = {
          name: 'Product Launch',
          start_at: '2024-07-20T18:00:00Z',
          calendar_api_id: 'cal-123',
          description: 'Exciting new product reveal',
          end_at: '2024-07-20T20:00:00Z',
          timezone: 'America/Los_Angeles',
          visibility: 'public',
          capacity: 100,
        };

        const mockCreatedEvent = {
          ...newEvent,
          api_id: 'evt-new123',
          url: 'https://lu.ma/product-launch',
        };

        server.use(
          http.post('https://public-api.luma.com/v1/event/create', () => {
            return HttpResponse.json(mockCreatedEvent);
          })
        );

        server.listen();

        const tool = LumaConnectorConfig.tools.CREATE_EVENT as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler(newEvent, mockContext);

        expect(actual).toContain('"api_id": "evt-new123"');
        expect(actual).toContain('"name": "Product Launch"');
        expect(actual).toContain('"capacity": 100');

        server.close();
      });
    });

    describe('when creation fails due to validation', () => {
      it('returns error message', async () => {
        server.use(
          http.post('https://public-api.luma.com/v1/event/create', () => {
            return HttpResponse.json({ error: 'Invalid calendar ID' }, { status: 400 });
          })
        );

        server.listen();

        const tool = LumaConnectorConfig.tools.CREATE_EVENT as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler(
          {
            name: 'Test Event',
            start_at: '2024-07-20T18:00:00Z',
            calendar_api_id: 'invalid-cal',
          },
          mockContext
        );

        expect(actual).toContain('Failed to create event');
        expect(actual).toContain('400');

        server.close();
      });
    });
  });

  describe('.UPDATE_EVENT', () => {
    describe('when update is successful', () => {
      it('returns updated event information', async () => {
        const mockUpdatedEvent = {
          api_id: 'evt-xyz789',
          name: 'Updated Conference Name',
          description: 'Updated description',
          start_at: '2024-06-16T09:00:00Z',
          capacity: 600,
        };

        server.use(
          http.post('https://public-api.luma.com/v1/event/update', () => {
            return HttpResponse.json(mockUpdatedEvent);
          })
        );

        server.listen();

        const tool = LumaConnectorConfig.tools.UPDATE_EVENT as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler(
          {
            eventId: 'evt-xyz789',
            name: 'Updated Conference Name',
            description: 'Updated description',
            capacity: 600,
          },
          mockContext
        );

        expect(actual).toContain('"api_id": "evt-xyz789"');
        expect(actual).toContain('"name": "Updated Conference Name"');
        expect(actual).toContain('"capacity": 600');

        server.close();
      });
    });

    describe('when event does not exist', () => {
      it('returns error message', async () => {
        server.use(
          http.post('https://public-api.luma.com/v1/event/update', () => {
            return HttpResponse.json({ error: 'Event not found' }, { status: 404 });
          })
        );

        server.listen();

        const tool = LumaConnectorConfig.tools.UPDATE_EVENT as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler(
          { eventId: 'nonexistent', name: 'New Name' },
          mockContext
        );

        expect(actual).toContain('Failed to update event');
        expect(actual).toContain('404');

        server.close();
      });
    });
  });

  describe('.GET_GUESTS', () => {
    describe('when request is successful', () => {
      it('returns list of guests', async () => {
        const mockGuests = {
          entries: [
            {
              api_id: 'gst-123',
              name: 'Alice Smith',
              email: 'alice@example.com',
              avatar_url: 'https://example.com/alice.jpg',
              approval_status: 'approved',
              registration_status: 'registered',
              registered_at: '2024-05-01T10:00:00Z',
            },
            {
              api_id: 'gst-456',
              name: 'Bob Johnson',
              email: 'bob@example.com',
              approval_status: 'approved',
              registration_status: 'registered',
              registered_at: '2024-05-02T14:30:00Z',
            },
          ],
        };

        server.use(
          http.get('https://public-api.luma.com/v1/event/get-guests', () => {
            return HttpResponse.json(mockGuests);
          })
        );

        server.listen();

        const tool = LumaConnectorConfig.tools.GET_GUESTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler({ eventId: 'evt-xyz789' }, mockContext);

        expect(actual).toContain('"api_id": "gst-123"');
        expect(actual).toContain('"name": "Alice Smith"');
        expect(actual).toContain('"email": "alice@example.com"');

        server.close();
      });
    });

    describe('when filtering by approval status', () => {
      it('returns filtered guests', async () => {
        const mockGuests = {
          entries: [
            {
              api_id: 'gst-789',
              name: 'Charlie Brown',
              email: 'charlie@example.com',
              approval_status: 'pending',
              registration_status: 'registered',
            },
          ],
        };

        server.use(
          http.get('https://public-api.luma.com/v1/event/get-guests', () => {
            return HttpResponse.json(mockGuests);
          })
        );

        server.listen();

        const tool = LumaConnectorConfig.tools.GET_GUESTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler(
          { eventId: 'evt-xyz789', approval_status: 'pending' },
          mockContext
        );

        expect(actual).toContain('"approval_status": "pending"');
        expect(actual).toContain('"name": "Charlie Brown"');

        server.close();
      });
    });

    describe('when API returns error', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://public-api.luma.com/v1/event/get-guests', () => {
            return HttpResponse.json({ error: 'Event not found' }, { status: 404 });
          })
        );

        server.listen();

        const tool = LumaConnectorConfig.tools.GET_GUESTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler({ eventId: 'nonexistent' }, mockContext);

        expect(actual).toContain('Failed to get guests');
        expect(actual).toContain('404');

        server.close();
      });
    });
  });

  describe('.GET_GUEST', () => {
    describe('when guest exists', () => {
      it('returns detailed guest information', async () => {
        const mockGuest = {
          api_id: 'gst-123',
          name: 'Alice Smith',
          email: 'alice@example.com',
          avatar_url: 'https://example.com/alice.jpg',
          approval_status: 'approved',
          registration_status: 'registered',
          registered_at: '2024-05-01T10:00:00Z',
        };

        server.use(
          http.get('https://public-api.luma.com/v1/event/get-guest', () => {
            return HttpResponse.json(mockGuest);
          })
        );

        server.listen();

        const tool = LumaConnectorConfig.tools.GET_GUEST as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler(
          { eventId: 'evt-xyz789', guestId: 'gst-123' },
          mockContext
        );

        expect(actual).toContain('"api_id": "gst-123"');
        expect(actual).toContain('"name": "Alice Smith"');
        expect(actual).toContain('"email": "alice@example.com"');

        server.close();
      });
    });

    describe('when guest does not exist', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://public-api.luma.com/v1/event/get-guest', () => {
            return HttpResponse.json({ error: 'Guest not found' }, { status: 404 });
          })
        );

        server.listen();

        const tool = LumaConnectorConfig.tools.GET_GUEST as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler(
          { eventId: 'evt-xyz789', guestId: 'nonexistent' },
          mockContext
        );

        expect(actual).toContain('Failed to get guest');
        expect(actual).toContain('404');

        server.close();
      });
    });
  });

  describe('.ADD_GUESTS', () => {
    describe('when adding guests successfully', () => {
      it('returns added guests information', async () => {
        const newGuests = [
          {
            name: 'David Lee',
            email: 'david@example.com',
            approval_status: 'approved',
          },
          {
            name: 'Emma Wilson',
            email: 'emma@example.com',
            approval_status: 'approved',
          },
        ];

        const mockResponse = {
          added_guests: [
            {
              api_id: 'gst-new1',
              name: 'David Lee',
              email: 'david@example.com',
              approval_status: 'approved',
              registration_status: 'registered',
            },
            {
              api_id: 'gst-new2',
              name: 'Emma Wilson',
              email: 'emma@example.com',
              approval_status: 'approved',
              registration_status: 'registered',
            },
          ],
        };

        server.use(
          http.post('https://public-api.luma.com/v1/event/add-guests', () => {
            return HttpResponse.json(mockResponse);
          })
        );

        server.listen();

        const tool = LumaConnectorConfig.tools.ADD_GUESTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler(
          { eventId: 'evt-xyz789', guests: newGuests },
          mockContext
        );

        expect(actual).toContain('"api_id": "gst-new1"');
        expect(actual).toContain('"name": "David Lee"');
        expect(actual).toContain('"email": "david@example.com"');
        expect(actual).toContain('"name": "Emma Wilson"');

        server.close();
      });
    });

    describe('when adding guests with only email', () => {
      it('successfully adds guests with minimal information', async () => {
        const newGuests = [
          {
            email: 'frank@example.com',
          },
        ];

        const mockResponse = {
          added_guests: [
            {
              api_id: 'gst-new3',
              email: 'frank@example.com',
              approval_status: 'pending',
              registration_status: 'registered',
            },
          ],
        };

        server.use(
          http.post('https://public-api.luma.com/v1/event/add-guests', () => {
            return HttpResponse.json(mockResponse);
          })
        );

        server.listen();

        const tool = LumaConnectorConfig.tools.ADD_GUESTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler(
          { eventId: 'evt-xyz789', guests: newGuests },
          mockContext
        );

        expect(actual).toContain('"email": "frank@example.com"');
        expect(actual).toContain('"api_id": "gst-new3"');

        server.close();
      });
    });

    describe('when event is at capacity', () => {
      it('returns error message', async () => {
        server.use(
          http.post('https://public-api.luma.com/v1/event/add-guests', () => {
            return HttpResponse.json({ error: 'Event is at capacity' }, { status: 400 });
          })
        );

        server.listen();

        const tool = LumaConnectorConfig.tools.ADD_GUESTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler(
          { eventId: 'evt-xyz789', guests: [{ email: 'test@example.com' }] },
          mockContext
        );

        expect(actual).toContain('Failed to add guests');
        expect(actual).toContain('400');

        server.close();
      });
    });
  });

  describe('.UPDATE_GUEST_STATUS', () => {
    describe('when updating approval status', () => {
      it('returns updated guest information', async () => {
        const mockUpdatedGuest = {
          api_id: 'gst-123',
          name: 'Alice Smith',
          email: 'alice@example.com',
          approval_status: 'approved',
          registration_status: 'registered',
        };

        server.use(
          http.post('https://public-api.luma.com/v1/event/update-guest-status', () => {
            return HttpResponse.json(mockUpdatedGuest);
          })
        );

        server.listen();

        const tool = LumaConnectorConfig.tools.UPDATE_GUEST_STATUS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler(
          {
            eventId: 'evt-xyz789',
            guestId: 'gst-123',
            approval_status: 'approved',
          },
          mockContext
        );

        expect(actual).toContain('"approval_status": "approved"');
        expect(actual).toContain('"api_id": "gst-123"');

        server.close();
      });
    });

    describe('when updating registration status', () => {
      it('returns updated guest with new status', async () => {
        const mockUpdatedGuest = {
          api_id: 'gst-456',
          name: 'Bob Johnson',
          email: 'bob@example.com',
          approval_status: 'approved',
          registration_status: 'waitlisted',
        };

        server.use(
          http.post('https://public-api.luma.com/v1/event/update-guest-status', () => {
            return HttpResponse.json(mockUpdatedGuest);
          })
        );

        server.listen();

        const tool = LumaConnectorConfig.tools.UPDATE_GUEST_STATUS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler(
          {
            eventId: 'evt-xyz789',
            guestId: 'gst-456',
            registration_status: 'waitlisted',
          },
          mockContext
        );

        expect(actual).toContain('"registration_status": "waitlisted"');

        server.close();
      });
    });

    describe('when guest does not exist', () => {
      it('returns error message', async () => {
        server.use(
          http.post('https://public-api.luma.com/v1/event/update-guest-status', () => {
            return HttpResponse.json({ error: 'Guest not found' }, { status: 404 });
          })
        );

        server.listen();

        const tool = LumaConnectorConfig.tools.UPDATE_GUEST_STATUS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler(
          { eventId: 'evt-xyz789', guestId: 'nonexistent', approval_status: 'approved' },
          mockContext
        );

        expect(actual).toContain('Failed to update guest status');
        expect(actual).toContain('404');

        server.close();
      });
    });
  });

  describe('.SEND_INVITES', () => {
    describe('when sending invites successfully', () => {
      it('returns success response with count', async () => {
        const mockResponse = {
          success: true,
          sent_invites: 3,
        };

        server.use(
          http.post('https://public-api.luma.com/v1/event/send-invites', () => {
            return HttpResponse.json(mockResponse);
          })
        );

        server.listen();

        const tool = LumaConnectorConfig.tools.SEND_INVITES as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler(
          {
            eventId: 'evt-xyz789',
            guestIds: ['gst-123', 'gst-456', 'gst-789'],
          },
          mockContext
        );

        expect(actual).toContain('"success": true');
        expect(actual).toContain('"sent_invites": 3');

        server.close();
      });
    });

    describe('when event does not exist', () => {
      it('returns error message', async () => {
        server.use(
          http.post('https://public-api.luma.com/v1/event/send-invites', () => {
            return HttpResponse.json({ error: 'Event not found' }, { status: 404 });
          })
        );

        server.listen();

        const tool = LumaConnectorConfig.tools.SEND_INVITES as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler(
          { eventId: 'nonexistent', guestIds: ['gst-123'] },
          mockContext
        );

        expect(actual).toContain('Failed to send invites');
        expect(actual).toContain('404');

        server.close();
      });
    });
  });

  describe('.ADD_HOST', () => {
    describe('when adding host with email', () => {
      it('returns success response', async () => {
        const mockResponse = {
          success: true,
        };

        server.use(
          http.post('https://public-api.luma.com/v1/event/add-host', () => {
            return HttpResponse.json(mockResponse);
          })
        );

        server.listen();

        const tool = LumaConnectorConfig.tools.ADD_HOST as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler(
          {
            eventId: 'evt-xyz789',
            name: 'Jane Doe',
            email: 'jane@example.com',
          },
          mockContext
        );

        expect(actual).toContain('"success": true');

        server.close();
      });
    });

    describe('when adding host with only name', () => {
      it('successfully adds host', async () => {
        const mockResponse = {
          success: true,
        };

        server.use(
          http.post('https://public-api.luma.com/v1/event/add-host', () => {
            return HttpResponse.json(mockResponse);
          })
        );

        server.listen();

        const tool = LumaConnectorConfig.tools.ADD_HOST as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler(
          {
            eventId: 'evt-xyz789',
            name: 'John Smith',
          },
          mockContext
        );

        expect(actual).toContain('"success": true');

        server.close();
      });
    });

    describe('when event does not exist', () => {
      it('returns error message', async () => {
        server.use(
          http.post('https://public-api.luma.com/v1/event/add-host', () => {
            return HttpResponse.json({ error: 'Event not found' }, { status: 404 });
          })
        );

        server.listen();

        const tool = LumaConnectorConfig.tools.ADD_HOST as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler(
          { eventId: 'nonexistent', email: 'host@example.com' },
          mockContext
        );

        expect(actual).toContain('Failed to add host');
        expect(actual).toContain('404');

        server.close();
      });
    });
  });

  describe('.LIST_PEOPLE', () => {
    describe('when request is successful', () => {
      it('returns list of people in calendar', async () => {
        const mockPeople = {
          entries: [
            {
              api_id: 'per-111',
              name: 'Alice Johnson',
              email: 'alice@example.com',
              avatar_url: 'https://example.com/alice.jpg',
              tags: ['vip', 'member'],
            },
            {
              api_id: 'per-222',
              name: 'Bob Smith',
              email: 'bob@example.com',
              tags: ['member'],
            },
          ],
          has_more: false,
        };

        server.use(
          http.get('https://public-api.luma.com/v1/calendar/list-people', () => {
            return HttpResponse.json(mockPeople);
          })
        );

        server.listen();

        const tool = LumaConnectorConfig.tools.LIST_PEOPLE as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler({ calendarId: 'cal-123' }, mockContext);

        expect(actual).toContain('"api_id": "per-111"');
        expect(actual).toContain('"name": "Alice Johnson"');
        expect(actual).toContain('"tags"');
        expect(actual).toContain('"has_more": false');

        server.close();
      });
    });

    describe('when filtering by tag', () => {
      it('returns people with specified tag', async () => {
        const mockPeople = {
          entries: [
            {
              api_id: 'per-333',
              name: 'Charlie Brown',
              email: 'charlie@example.com',
              tags: ['vip'],
            },
          ],
          has_more: false,
        };

        server.use(
          http.get('https://public-api.luma.com/v1/calendar/list-people', () => {
            return HttpResponse.json(mockPeople);
          })
        );

        server.listen();

        const tool = LumaConnectorConfig.tools.LIST_PEOPLE as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler(
          { calendarId: 'cal-123', tag: 'vip' },
          mockContext
        );

        expect(actual).toContain('"tags"');
        expect(actual).toContain('"name": "Charlie Brown"');

        server.close();
      });
    });

    describe('when pagination is needed', () => {
      it('returns paginated results with cursor', async () => {
        const mockPeople = {
          entries: [
            {
              api_id: 'per-444',
              name: 'David Lee',
              email: 'david@example.com',
            },
          ],
          has_more: true,
          next_cursor: 'cursor-xyz123',
        };

        server.use(
          http.get('https://public-api.luma.com/v1/calendar/list-people', () => {
            return HttpResponse.json(mockPeople);
          })
        );

        server.listen();

        const tool = LumaConnectorConfig.tools.LIST_PEOPLE as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler(
          { calendarId: 'cal-123', pagination_limit: 1 },
          mockContext
        );

        expect(actual).toContain('"has_more": true');
        expect(actual).toContain('"next_cursor": "cursor-xyz123"');

        server.close();
      });
    });

    describe('when calendar does not exist', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://public-api.luma.com/v1/calendar/list-people', () => {
            return HttpResponse.json({ error: 'Calendar not found' }, { status: 404 });
          })
        );

        server.listen();

        const tool = LumaConnectorConfig.tools.LIST_PEOPLE as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler({ calendarId: 'nonexistent' }, mockContext);

        expect(actual).toContain('Failed to list people');
        expect(actual).toContain('404');

        server.close();
      });
    });
  });

  describe('.LIST_CALENDAR_EVENTS', () => {
    describe('when request is successful', () => {
      it('returns list of calendar events', async () => {
        const mockEvents = {
          entries: [
            {
              api_id: 'evt-111',
              name: 'Weekly Standup',
              start_at: '2024-06-10T10:00:00Z',
              end_at: '2024-06-10T10:30:00Z',
              url: 'https://lu.ma/standup',
              visibility: 'private',
            },
            {
              api_id: 'evt-222',
              name: 'Team Offsite',
              start_at: '2024-06-15T09:00:00Z',
              url: 'https://lu.ma/offsite',
              cover_url: 'https://example.com/offsite-cover.jpg',
              visibility: 'public',
            },
          ],
          has_more: false,
        };

        server.use(
          http.get('https://public-api.luma.com/v1/calendar/list-events', () => {
            return HttpResponse.json(mockEvents);
          })
        );

        server.listen();

        const tool = LumaConnectorConfig.tools.LIST_CALENDAR_EVENTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler({ calendarId: 'cal-123' }, mockContext);

        expect(actual).toContain('"api_id": "evt-111"');
        expect(actual).toContain('"name": "Weekly Standup"');
        expect(actual).toContain('"name": "Team Offsite"');
        expect(actual).toContain('"has_more": false');

        server.close();
      });
    });

    describe('when filtering by date range', () => {
      it('returns events within specified dates', async () => {
        const mockEvents = {
          entries: [
            {
              api_id: 'evt-333',
              name: 'Summer Event',
              start_at: '2024-07-01T14:00:00Z',
              url: 'https://lu.ma/summer',
              visibility: 'public',
            },
          ],
          has_more: false,
        };

        server.use(
          http.get('https://public-api.luma.com/v1/calendar/list-events', () => {
            return HttpResponse.json(mockEvents);
          })
        );

        server.listen();

        const tool = LumaConnectorConfig.tools.LIST_CALENDAR_EVENTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler(
          {
            calendarId: 'cal-123',
            start_date: '2024-07-01T00:00:00Z',
            end_date: '2024-07-31T23:59:59Z',
          },
          mockContext
        );

        expect(actual).toContain('"name": "Summer Event"');
        expect(actual).toContain('"start_at": "2024-07-01T14:00:00Z"');

        server.close();
      });
    });

    describe('when pagination is needed', () => {
      it('returns paginated results with cursor', async () => {
        const mockEvents = {
          entries: [
            {
              api_id: 'evt-444',
              name: 'Event 1',
              start_at: '2024-06-01T10:00:00Z',
              url: 'https://lu.ma/event1',
              visibility: 'public',
            },
          ],
          has_more: true,
          next_cursor: 'cursor-abc123',
        };

        server.use(
          http.get('https://public-api.luma.com/v1/calendar/list-events', () => {
            return HttpResponse.json(mockEvents);
          })
        );

        server.listen();

        const tool = LumaConnectorConfig.tools.LIST_CALENDAR_EVENTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler(
          { calendarId: 'cal-123', pagination_limit: 1 },
          mockContext
        );

        expect(actual).toContain('"has_more": true');
        expect(actual).toContain('"next_cursor": "cursor-abc123"');

        server.close();
      });
    });

    describe('when calendar does not exist', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://public-api.luma.com/v1/calendar/list-events', () => {
            return HttpResponse.json({ error: 'Calendar not found' }, { status: 404 });
          })
        );

        server.listen();

        const tool = LumaConnectorConfig.tools.LIST_CALENDAR_EVENTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
          },
        });

        const actual = await tool.handler({ calendarId: 'nonexistent' }, mockContext);

        expect(actual).toContain('Failed to list calendar events');
        expect(actual).toContain('404');

        server.close();
      });
    });
  });
});

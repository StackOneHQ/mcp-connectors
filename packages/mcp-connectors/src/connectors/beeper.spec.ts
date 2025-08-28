import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { BeeperConnectorConfig } from './beeper';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const BASE = 'https://chat.beeper.com';

describe('#BeeperConnector', () => {
  describe('.WHO_AM_I', () => {
    describe('when request is successful', () => {
      it('returns current user identity', async () => {
        server.use(
          http.get(`${BASE}/_matrix/client/v3/account/whoami`, () => {
            return HttpResponse.json({ user_id: '@test:beeper.com', device_id: 'DEV123' });
          })
        );

        const tool = BeeperConnectorConfig.tools.WHO_AM_I as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          accessToken: 'syt_test',
        });

        const actual = await tool.handler({}, mockContext);
        const parsed = JSON.parse(actual);
        expect(parsed.user_id).toBe('@test:beeper.com');
      });
    });

    describe('when unauthorized', () => {
      it('returns error message', async () => {
        server.use(
          http.get(`${BASE}/_matrix/client/v3/account/whoami`, () => {
            return HttpResponse.text('Unauthorized', { status: 401 });
          })
        );

        const tool = BeeperConnectorConfig.tools.WHO_AM_I as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          accessToken: 'bad',
        });

        const actual = await tool.handler({}, mockContext);
        expect(actual).toContain('Failed to get identity');
      });
    });
  });

  describe('.LIST_JOINED_ROOMS', () => {
    describe('when there are joined rooms', () => {
      it('returns joined room IDs', async () => {
        server.use(
          http.get(`${BASE}/_matrix/client/v3/joined_rooms`, () => {
            return HttpResponse.json({ joined_rooms: ['!abc:beeper.com', '!xyz:beeper.com'] });
          })
        );

        const tool = BeeperConnectorConfig.tools
          .LIST_JOINED_ROOMS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          accessToken: 'syt_test',
        });

        const actual = await tool.handler({}, mockContext);
        const parsed = JSON.parse(actual);
        expect(parsed.joined_rooms).toHaveLength(2);
      });
    });
  });

  describe('.SEND_MESSAGE', () => {
    describe('when message is valid', () => {
      it('sends a message to room', async () => {
        server.use(
          http.post(
            new RegExp(
              '^https://chat\\.beeper\\.com/_matrix/client/v3/rooms/!room%3Abeeper\\.com/send/m\\.room\\.message/.+'
            ),
            () => {
              return HttpResponse.json({ event_id: '$event123' });
            }
          )
        );

        const tool = BeeperConnectorConfig.tools.SEND_MESSAGE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          accessToken: 'syt_test',
        });

        const actual = await tool.handler(
          { room_id: '!room:beeper.com', body: 'Hello world' },
          mockContext
        );
        const parsed = JSON.parse(actual);
        expect(parsed.event_id).toBe('$event123');
      });
    });
  });
});



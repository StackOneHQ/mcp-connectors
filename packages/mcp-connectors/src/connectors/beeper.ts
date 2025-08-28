import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

// Beeper is built on Matrix. We use Matrix Client-Server API-compatible endpoints.
// Docs reference: https://spec.matrix.org/latest/client-server-api/

interface MatrixRoom {
  room_id: string;
  name?: string;
  canonical_alias?: string;
  avatar_url?: string;
  topic?: string;
  [key: string]: unknown;
}

interface MatrixJoinedRoomsResponse {
  joined_rooms: string[];
}

interface MatrixWhoAmIResponse {
  user_id: string;
  device_id?: string;
  [key: string]: unknown;
}

interface MatrixEventResponse {
  event_id: string;
}

class BeeperMatrixClient {
  private baseUrl: string;
  private headers: { Authorization: string; 'Content-Type': string };

  constructor(accessToken: string, baseUrl?: string) {
    // Default to local Beeper API if not provided
    this.baseUrl = (baseUrl || 'http://localhost:23373').replace(/\/$/, '');
    this.headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async get<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Beeper API error ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  private async post<T>(path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Beeper API error ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  async whoAmI(): Promise<MatrixWhoAmIResponse> {
    return this.get('/_matrix/client/v3/account/whoami');
  }

  async listJoinedRooms(): Promise<MatrixJoinedRoomsResponse> {
    return this.get('/_matrix/client/v3/joined_rooms');
  }

  async getRoomState(roomId: string): Promise<MatrixRoom> {
    // Compose lightweight room details from common state events
    const state = await this.get<{ events: Array<{ type: string; content: Record<string, unknown> }> }>(
      `/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/state`
    );
    const room: MatrixRoom = { room_id: roomId };
    for (const ev of state.events) {
      if (ev.type === 'm.room.name') room.name = ev.content?.name as string | undefined;
      if (ev.type === 'm.room.canonical_alias')
        room.canonical_alias = ev.content?.alias as string | undefined;
      if (ev.type === 'm.room.avatar') room.avatar_url = ev.content?.url as string | undefined;
      if (ev.type === 'm.room.topic') room.topic = ev.content?.topic as string | undefined;
    }
    return room;
  }

  async sendMessage(roomId: string, body: string, msgtype = 'm.text'): Promise<MatrixEventResponse> {
    // transactionId can be any unique string
    const txnId = `mcp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    return this.post(
      `/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${txnId}`,
      {
        msgtype,
        body,
      }
    );
  }

  async invite(roomId: string, userId: string): Promise<Record<string, unknown>> {
    return this.post(`/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/invite`, {
      user_id: userId,
    });
  }

  async join(roomIdOrAlias: string): Promise<{ room_id: string }> {
    return this.post(`/_matrix/client/v3/join/${encodeURIComponent(roomIdOrAlias)}`);
  }

  async leave(roomId: string): Promise<Record<string, unknown>> {
    return this.post(`/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/leave`);
  }

  async getMessages(
    roomId: string,
    opts?: { dir?: 'b' | 'f'; limit?: number; from?: string }
  ): Promise<{ chunk: unknown[]; end?: string; start?: string }> {
    const params = new URLSearchParams();
    params.set('dir', opts?.dir || 'b');
    if (opts?.limit) params.set('limit', String(opts.limit));
    if (opts?.from) params.set('from', opts.from);
    return this.get(
      `/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/messages?${params.toString()}`
    );
  }
}

// Local Beeper Desktop API (v0) - SSE-only support
class BeeperLocalClient {
  private baseUrl: string;
  private token: string;

  constructor(accessToken: string, baseUrl?: string) {
    this.baseUrl = (baseUrl || 'http://localhost:23373').replace(/\/$/, '');
    this.token = accessToken;
  }

  async listenToEvents(options?: {
    limit?: number;
    timeoutMs?: number;
    eventTypes?: string[];
  }): Promise<{ events: Array<{ event?: string; data: unknown }> }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? 5000);

    try {
      const res = await fetch(`${this.baseUrl}/v0/sse`, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          Authorization: `Bearer ${this.token}`,
        },
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => '');
        throw new Error(`Beeper SSE error ${res.status}: ${text}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const collected: Array<{ event?: string; data: unknown }> = [];
      let pending = '';
      const max = options?.limit ?? 5;
      const filters = options?.eventTypes?.map((t) => t.toLowerCase());

      // Read until limit or timeout/abort
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        pending += decoder.decode(value, { stream: true });

        // Split complete SSE events by double newline
        const parts = pending.split(/\n\n/);
        pending = parts.pop() ?? '';

        for (const chunk of parts) {
          let eventName: string | undefined;
          let dataPayload = '';
          for (const line of chunk.split(/\n/)) {
            if (line.startsWith('event:')) {
              eventName = line.replace(/^event:\s*/, '').trim();
            } else if (line.startsWith('data:')) {
              dataPayload += (dataPayload ? '\n' : '') + line.replace(/^data:\s*/, '');
            }
          }

          if (filters && eventName && !filters.includes(eventName.toLowerCase())) {
            continue;
          }

          try {
            const parsed = dataPayload ? JSON.parse(dataPayload) : null;
            collected.push({ event: eventName, data: parsed });
          } catch {
            collected.push({ event: eventName, data: dataPayload });
          }

          if (collected.length >= max) {
            clearTimeout(timeout);
            try {
              controller.abort();
            } catch {}
            return { events: collected };
          }
        }
      }

      clearTimeout(timeout);
      return { events: collected };
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === 'AbortError') {
        // Timeout case: return what we have
        return { events: [] };
      }
      throw error;
    }
  }
}

export const BeeperConnectorConfig = mcpConnectorConfig({
  name: 'Beeper',
  key: 'beeper',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/beeper/filled/svg',
  credentials: z.object({
    accessToken: z
      .string()
      .describe(
        'Beeper access token. For local Desktop API, sent as Authorization: Bearer <token>. For Matrix CS, use a valid syt_ token.'
      ),
    baseUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'Optional API base URL. Local Desktop defaults to http://localhost:23373. For Matrix CS, set https://chat.beeper.com'
      ),
  }),
  setup: z.object({}),
  examplePrompt:
    'Check my Beeper identity (Matrix), list joined rooms (Matrix), send a message (Matrix), or listen to local Beeper events via SSE.',
  tools: (tool) => ({
    // Local Desktop API (SSE)
    LISTEN_EVENTS: tool({
      name: 'beeper_listen_events',
      description:
        'Listen to local Beeper Desktop SSE stream and return a sample of events (http://localhost:23373/v0/sse).',
      schema: z.object({
        limit: z
          .number()
          .min(1)
          .max(100)
          .optional()
          .describe('Maximum number of events to collect (default 5)'),
        timeout_ms: z
          .number()
          .min(100)
          .max(60_000)
          .optional()
          .describe('How long to listen before returning (default 5000ms)'),
        event_types: z
          .array(z.string())
          .optional()
          .describe('Filter by SSE event names (case-insensitive)'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, baseUrl } = await context.getCredentials();
          const client = new BeeperLocalClient(accessToken, baseUrl);
          const result = await client.listenToEvents({
            limit: args.limit,
            timeoutMs: args.timeout_ms,
            eventTypes: args.event_types,
          });
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to listen to events: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    PING: tool({
      name: 'beeper_ping',
      description:
        'Ping local Beeper SSE by attempting to read a single event within a short timeout to verify connectivity.',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { accessToken, baseUrl } = await context.getCredentials();
          const client = new BeeperLocalClient(accessToken, baseUrl);
          const res = await client.listenToEvents({ limit: 1, timeoutMs: 1500 });
          return JSON.stringify({ ok: true, received: res.events.length }, null, 2);
        } catch (error) {
          return `Failed to ping SSE: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    WHO_AM_I: tool({
      name: 'beeper_who_am_i',
      description: 'Get the current Matrix user (whoami)',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { accessToken, baseUrl } = await context.getCredentials();
          const client = new BeeperMatrixClient(accessToken, baseUrl);
          const me = await client.whoAmI();
          return JSON.stringify(me, null, 2);
        } catch (error) {
          return `Failed to get identity: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_JOINED_ROOMS: tool({
      name: 'beeper_list_joined_rooms',
      description: 'List joined room IDs for the current user',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { accessToken, baseUrl } = await context.getCredentials();
          const client = new BeeperMatrixClient(accessToken, baseUrl);
          const rooms = await client.listJoinedRooms();
          return JSON.stringify(rooms, null, 2);
        } catch (error) {
          return `Failed to list joined rooms: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_ROOM_INFO: tool({
      name: 'beeper_get_room_info',
      description: 'Get basic room info (name, alias, avatar, topic) via state',
      schema: z.object({
        room_id: z.string().describe('Room ID to fetch state for'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, baseUrl } = await context.getCredentials();
          const client = new BeeperMatrixClient(accessToken, baseUrl);
          const room = await client.getRoomState(args.room_id);
          return JSON.stringify(room, null, 2);
        } catch (error) {
          return `Failed to get room info: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    SEND_MESSAGE: tool({
      name: 'beeper_send_message',
      description: 'Send a text message to a room',
      schema: z.object({
        room_id: z.string().describe('Room ID'),
        body: z.string().describe('Message body text'),
        msgtype: z
          .enum(['m.text', 'm.notice', 'm.emote'])
          .optional()
          .describe('Matrix message type (default m.text)'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, baseUrl } = await context.getCredentials();
          const client = new BeeperMatrixClient(accessToken, baseUrl);
          const res = await client.sendMessage(args.room_id, args.body, args.msgtype);
          return JSON.stringify(res, null, 2);
        } catch (error) {
          return `Failed to send message: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    INVITE_TO_ROOM: tool({
      name: 'beeper_invite_to_room',
      description: 'Invite a user to a room',
      schema: z.object({
        room_id: z.string().describe('Room ID'),
        user_id: z.string().describe('Matrix user ID to invite (e.g., @user:beeper.com)'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, baseUrl } = await context.getCredentials();
          const client = new BeeperMatrixClient(accessToken, baseUrl);
          const res = await client.invite(args.room_id, args.user_id);
          return JSON.stringify(res, null, 2);
        } catch (error) {
          return `Failed to invite user: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    JOIN_ROOM: tool({
      name: 'beeper_join_room',
      description: 'Join a room by ID or alias',
      schema: z.object({
        room: z
          .string()
          .describe('Room ID or alias (e.g., !abc:beeper.com or #room:beeper.com)'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, baseUrl } = await context.getCredentials();
          const client = new BeeperMatrixClient(accessToken, baseUrl);
          const res = await client.join(args.room);
          return JSON.stringify(res, null, 2);
        } catch (error) {
          return `Failed to join room: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LEAVE_ROOM: tool({
      name: 'beeper_leave_room',
      description: 'Leave a room',
      schema: z.object({
        room_id: z.string().describe('Room ID to leave'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, baseUrl } = await context.getCredentials();
          const client = new BeeperMatrixClient(accessToken, baseUrl);
          const res = await client.leave(args.room_id);
          return JSON.stringify(res, null, 2);
        } catch (error) {
          return `Failed to leave room: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_MESSAGES: tool({
      name: 'beeper_get_messages',
      description: 'Get messages in a room with pagination',
      schema: z.object({
        room_id: z.string().describe('Room ID'),
        from: z.string().optional().describe('Pagination token'),
        dir: z.enum(['b', 'f']).optional().describe('Direction: b (backward), f (forward)'),
        limit: z.number().optional().describe('Max number of events to return'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, baseUrl } = await context.getCredentials();
          const client = new BeeperMatrixClient(accessToken, baseUrl);
          const res = await client.getMessages(args.room_id, {
            from: args.from,
            dir: args.dir,
            limit: args.limit,
          });
          return JSON.stringify(res, null, 2);
        } catch (error) {
          return `Failed to get messages: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});



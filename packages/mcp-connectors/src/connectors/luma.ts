import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface LumaEvent {
  api_id: string;
  name: string;
  description?: string;
  start_at: string;
  end_at?: string;
  timezone?: string;
  url: string;
  cover_url?: string;
  location?: {
    type: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  visibility?: string;
  capacity?: number;
  registration_type?: string;
  [key: string]: unknown;
}

interface LumaGuest {
  api_id: string;
  name: string;
  email?: string;
  avatar_url?: string;
  approval_status: string;
  registration_status?: string;
  registered_at?: string;
  [key: string]: unknown;
}

interface LumaUser {
  api_id: string;
  name: string;
  username?: string;
  email?: string;
  avatar_url?: string;
  [key: string]: unknown;
}

interface LumaCalendarEvent {
  api_id: string;
  name: string;
  start_at: string;
  end_at?: string;
  url: string;
  cover_url?: string;
  visibility?: string;
  [key: string]: unknown;
}

class LumaClient {
  private headers: { 'x-luma-api-key': string; 'Content-Type': string };
  private baseUrl = 'https://public-api.luma.com/v1';

  constructor(apiKey: string) {
    this.headers = {
      'x-luma-api-key': apiKey,
      'Content-Type': 'application/json',
    };
  }

  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: unknown
  ): Promise<unknown> {
    const url = `${this.baseUrl}/${endpoint}`;
    const options: RequestInit = {
      method,
      headers: this.headers,
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Luma API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json();
  }

  // User Management
  async getSelf(): Promise<LumaUser> {
    return (await this.makeRequest('user/get-self')) as LumaUser;
  }

  // Event Management
  async getEvent(eventId: string): Promise<LumaEvent> {
    const params = new URLSearchParams({ event_api_id: eventId });
    return (await this.makeRequest(`event/get?${params.toString()}`)) as LumaEvent;
  }

  async createEvent(eventData: {
    name: string;
    start_at: string;
    calendar_api_id: string;
    description?: string;
    end_at?: string;
    timezone?: string;
    location?: {
      type: string;
      address?: string;
    };
    visibility?: string;
    capacity?: number;
  }): Promise<LumaEvent> {
    return (await this.makeRequest('event/create', 'POST', eventData)) as LumaEvent;
  }

  async updateEvent(
    eventId: string,
    updateData: {
      name?: string;
      description?: string;
      start_at?: string;
      end_at?: string;
      timezone?: string;
      location?: {
        type: string;
        address?: string;
      };
      visibility?: string;
      capacity?: number;
    }
  ): Promise<LumaEvent> {
    return (await this.makeRequest('event/update', 'POST', {
      event_api_id: eventId,
      ...updateData,
    })) as LumaEvent;
  }

  // Guest Management
  async getGuests(
    eventId: string,
    filters?: {
      approval_status?: string;
      registration_status?: string;
    }
  ): Promise<{ entries: LumaGuest[] }> {
    const params = new URLSearchParams({ event_api_id: eventId });
    if (filters?.approval_status) {
      params.set('approval_status', filters.approval_status);
    }
    if (filters?.registration_status) {
      params.set('registration_status', filters.registration_status);
    }
    return (await this.makeRequest(`event/get-guests?${params.toString()}`)) as {
      entries: LumaGuest[];
    };
  }

  async getGuest(eventId: string, guestId: string): Promise<LumaGuest> {
    const params = new URLSearchParams({
      event_api_id: eventId,
      guest_api_id: guestId,
    });
    return (await this.makeRequest(`event/get-guest?${params.toString()}`)) as LumaGuest;
  }

  async addGuests(
    eventId: string,
    guests: Array<{
      name?: string;
      email?: string;
      approval_status?: string;
    }>
  ): Promise<{ added_guests: LumaGuest[] }> {
    return (await this.makeRequest('event/add-guests', 'POST', {
      event_api_id: eventId,
      guests,
    })) as { added_guests: LumaGuest[] };
  }

  // Calendar Management
  async listCalendarEvents(
    calendarId: string,
    filters?: {
      start_date?: string;
      end_date?: string;
      pagination_limit?: number;
      pagination_cursor?: string;
    }
  ): Promise<{ entries: LumaCalendarEvent[]; has_more: boolean; next_cursor?: string }> {
    const params = new URLSearchParams({ calendar_api_id: calendarId });
    if (filters?.start_date) {
      params.set('period_start', filters.start_date);
    }
    if (filters?.end_date) {
      params.set('period_end', filters.end_date);
    }
    if (filters?.pagination_limit) {
      params.set('pagination_limit', filters.pagination_limit.toString());
    }
    if (filters?.pagination_cursor) {
      params.set('pagination_cursor', filters.pagination_cursor);
    }
    return (await this.makeRequest(`calendar/list-events?${params.toString()}`)) as {
      entries: LumaCalendarEvent[];
      has_more: boolean;
      next_cursor?: string;
    };
  }
}

export const LumaConnectorConfig = mcpConnectorConfig({
  name: 'Lu.ma',
  key: 'luma',
  version: '1.0.0',
  logo: 'https://cdn.brandfetch.io/idM0FJHHLh/theme/dark/logo.svg?c=1dxbfHSJFAPEGdCLU4o5B',
  credentials: z.object({
    apiKey: z
      .string()
      .describe(
        'Luma API Key from Settings > API (requires Luma Plus subscription) :: https://docs.luma.com/reference/getting-started-with-your-api'
      ),
  }),
  setup: z.object({}),
  examplePrompt:
    'Get information about my Luma account, list upcoming events in my calendar, create a new event, and retrieve guest information.',
  tools: (tool) => ({
    GET_SELF: tool({
      name: 'luma_get_self',
      description: 'Get information about the authenticated Luma user',
      schema: z.object({}),
      handler: async (_, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new LumaClient(apiKey);
          const result = await client.getSelf();
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to get user info: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_EVENT: tool({
      name: 'luma_get_event',
      description: 'Get detailed information about a specific event',
      schema: z.object({
        eventId: z.string().describe('Event API ID'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new LumaClient(apiKey);
          const result = await client.getEvent(args.eventId);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to get event: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    CREATE_EVENT: tool({
      name: 'luma_create_event',
      description: 'Create a new event in Luma',
      schema: z.object({
        name: z.string().describe('Event name'),
        start_at: z
          .string()
          .describe('Event start time in ISO 8601 format (e.g., 2024-03-20T19:00:00Z)'),
        calendar_api_id: z
          .string()
          .describe('Calendar API ID where event will be created'),
        description: z.string().optional().describe('Event description'),
        end_at: z
          .string()
          .optional()
          .describe('Event end time in ISO 8601 format (e.g., 2024-03-20T21:00:00Z)'),
        timezone: z.string().optional().describe('Timezone (e.g., America/New_York)'),
        location: z
          .object({
            type: z
              .string()
              .describe(
                'Location type (e.g., venue, online, tbd, address, google_meet, zoom)'
              ),
            address: z.string().optional().describe('Physical address or meeting URL'),
          })
          .optional()
          .describe('Event location details'),
        visibility: z
          .string()
          .optional()
          .describe('Event visibility (e.g., public, private, unlisted)'),
        capacity: z.number().optional().describe('Maximum number of attendees'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new LumaClient(apiKey);
          const result = await client.createEvent(args);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to create event: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    UPDATE_EVENT: tool({
      name: 'luma_update_event',
      description: 'Update an existing event in Luma',
      schema: z.object({
        eventId: z.string().describe('Event API ID'),
        name: z.string().optional().describe('Event name'),
        description: z.string().optional().describe('Event description'),
        start_at: z
          .string()
          .optional()
          .describe('Event start time in ISO 8601 format (e.g., 2024-03-20T19:00:00Z)'),
        end_at: z
          .string()
          .optional()
          .describe('Event end time in ISO 8601 format (e.g., 2024-03-20T21:00:00Z)'),
        timezone: z.string().optional().describe('Timezone (e.g., America/New_York)'),
        location: z
          .object({
            type: z
              .string()
              .describe(
                'Location type (e.g., venue, online, tbd, address, google_meet, zoom)'
              ),
            address: z.string().optional().describe('Physical address or meeting URL'),
          })
          .optional()
          .describe('Event location details'),
        visibility: z
          .string()
          .optional()
          .describe('Event visibility (e.g., public, private, unlisted)'),
        capacity: z.number().optional().describe('Maximum number of attendees'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new LumaClient(apiKey);
          const { eventId, ...updateData } = args;
          const result = await client.updateEvent(eventId, updateData);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to update event: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_GUESTS: tool({
      name: 'luma_get_guests',
      description: 'Get guests for a specific event',
      schema: z.object({
        eventId: z.string().describe('Event API ID'),
        approval_status: z
          .string()
          .optional()
          .describe('Filter by approval status (e.g., approved, pending, rejected)'),
        registration_status: z
          .string()
          .optional()
          .describe(
            'Filter by registration status (e.g., registered, waitlisted, cancelled)'
          ),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new LumaClient(apiKey);
          const result = await client.getGuests(args.eventId, {
            approval_status: args.approval_status,
            registration_status: args.registration_status,
          });
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to get guests: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_GUEST: tool({
      name: 'luma_get_guest',
      description: 'Get detailed information about a specific guest',
      schema: z.object({
        eventId: z.string().describe('Event API ID'),
        guestId: z.string().describe('Guest API ID'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new LumaClient(apiKey);
          const result = await client.getGuest(args.eventId, args.guestId);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to get guest: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    ADD_GUESTS: tool({
      name: 'luma_add_guests',
      description: 'Add guests to an event',
      schema: z.object({
        eventId: z.string().describe('Event API ID'),
        guests: z
          .array(
            z.object({
              name: z.string().optional().describe('Guest name'),
              email: z.string().email().optional().describe('Guest email address'),
              approval_status: z
                .string()
                .optional()
                .describe('Approval status (e.g., approved, pending)'),
            })
          )
          .describe('Array of guests to add'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new LumaClient(apiKey);
          const result = await client.addGuests(args.eventId, args.guests);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to add guests: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    LIST_CALENDAR_EVENTS: tool({
      name: 'luma_list_calendar_events',
      description: 'List events from a specific calendar',
      schema: z.object({
        calendarId: z.string().describe('Calendar API ID'),
        start_date: z
          .string()
          .optional()
          .describe('Filter events starting from this date (ISO 8601)'),
        end_date: z
          .string()
          .optional()
          .describe('Filter events ending before this date (ISO 8601)'),
        pagination_limit: z
          .number()
          .optional()
          .describe('Maximum number of events to return (default: 50)'),
        pagination_cursor: z
          .string()
          .optional()
          .describe('Cursor for pagination to get next page of results'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new LumaClient(apiKey);
          const result = await client.listCalendarEvents(args.calendarId, {
            start_date: args.start_date,
            end_date: args.end_date,
            pagination_limit: args.pagination_limit,
            pagination_cursor: args.pagination_cursor,
          });
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to list calendar events: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

import { z } from 'zod';
import { mcpConnectorConfig } from '@stackone/mcp-config-types';

// Calendly API interfaces
interface CalendlyUser {
  id: string;
  name: string;
  email: string;
  slug: string;
  timezone: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

interface CalendlyEventType {
  id: string;
  name: string;
  description?: string;
  duration: number;
  slug: string;
  color: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface CalendlyScheduledEvent {
  id: string;
  event_type: string;
  start_time: string;
  end_time: string;
  status: string;
  invitee: {
    name: string;
    email: string;
    timezone: string;
  };
  created_at: string;
  updated_at: string;
}

interface CalendlyInvitee {
  id: string;
  name: string;
  email: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

interface CalendlyOrganization {
  id: string;
  name: string;
  slug: string;
  uri: string;
  created_at: string;
  updated_at: string;
}

interface CalendlyWebhookSubscription {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Calendly API client
class CalendlyClient {
  private apiKey: string;
  private baseUrl = 'https://api.calendly.com';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeRequest(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };

    const options: RequestInit = {
      method,
      headers
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as any;
      throw new Error(`Calendly API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
    }

    return response.json();
  }

  // User methods
  async getCurrentUser(): Promise<CalendlyUser> {
    return this.makeRequest('/users/me');
  }

  async getUser(userId: string): Promise<CalendlyUser> {
    return this.makeRequest(`/users/${userId}`);
  }

  async listUsers(limit: number = 20): Promise<{ users: CalendlyUser[] }> {
    return this.makeRequest(`/users?count=${limit}`);
  }

  // Event type methods
  async listEventTypes(userId?: string, limit: number = 20): Promise<{ event_types: CalendlyEventType[] }> {
    const params = new URLSearchParams();
    if (userId) params.append('user', userId);
    params.append('count', String(limit));
    
    return this.makeRequest(`/event_types?${params.toString()}`);
  }

  async getEventType(eventTypeId: string): Promise<CalendlyEventType> {
    return this.makeRequest(`/event_types/${eventTypeId}`);
  }

  async createEventType(data: {
    name: string;
    description?: string;
    duration: number;
    color?: string;
    active?: boolean;
  }): Promise<CalendlyEventType> {
    return this.makeRequest('/event_types', 'POST', data);
  }

  async updateEventType(eventTypeId: string, updates: Partial<CalendlyEventType>): Promise<CalendlyEventType> {
    return this.makeRequest(`/event_types/${eventTypeId}`, 'PUT', updates);
  }

  async deleteEventType(eventTypeId: string): Promise<void> {
    return this.makeRequest(`/event_types/${eventTypeId}`, 'DELETE');
  }

  // Scheduled event methods
  async listScheduledEvents(userId?: string, limit: number = 20): Promise<{ events: CalendlyScheduledEvent[] }> {
    const params = new URLSearchParams();
    if (userId) params.append('user', userId);
    params.append('count', String(limit));
    
    return this.makeRequest(`/scheduled_events?${params.toString()}`);
  }

  async getScheduledEvent(eventId: string): Promise<CalendlyScheduledEvent> {
    return this.makeRequest(`/scheduled_events/${eventId}`);
  }

  async cancelScheduledEvent(eventId: string, reason?: string): Promise<void> {
    return this.makeRequest(`/scheduled_events/${eventId}/cancellation`, 'POST', {
      reason
    });
  }

  // Invitee methods
  async listInvitees(eventId: string, limit: number = 20): Promise<{ invitees: CalendlyInvitee[] }> {
    return this.makeRequest(`/scheduled_events/${eventId}/invitees?count=${limit}`);
  }

  async getInvitee(inviteeId: string): Promise<CalendlyInvitee> {
    return this.makeRequest(`/invitees/${inviteeId}`);
  }

  async cancelInvitee(inviteeId: string, reason?: string): Promise<void> {
    return this.makeRequest(`/invitees/${inviteeId}/cancellation`, 'POST', {
      reason
    });
  }

  // Organization methods
  async listOrganizations(limit: number = 20): Promise<{ organizations: CalendlyOrganization[] }> {
    return this.makeRequest(`/organizations?count=${limit}`);
  }

  async getOrganization(orgId: string): Promise<CalendlyOrganization> {
    return this.makeRequest(`/organizations/${orgId}`);
  }

  // Webhook methods
  async listWebhookSubscriptions(limit: number = 20): Promise<{ webhook_subscriptions: CalendlyWebhookSubscription[] }> {
    return this.makeRequest(`/webhook_subscriptions?count=${limit}`);
  }

  async createWebhookSubscription(data: {
    url: string;
    events: string[];
  }): Promise<CalendlyWebhookSubscription> {
    return this.makeRequest('/webhook_subscriptions', 'POST', data);
  }

  async deleteWebhookSubscription(webhookId: string): Promise<void> {
    return this.makeRequest(`/webhook_subscriptions/${webhookId}`, 'DELETE');
  }

  // Scheduling link methods
  async getSchedulingLinks(eventTypeId: string): Promise<any> {
    return this.makeRequest(`/event_types/${eventTypeId}/scheduling_links`);
  }

  // Availability methods
  async getAvailability(eventTypeId: string, startTime: string, endTime: string): Promise<any> {
    const params = new URLSearchParams({
      start_time: startTime,
      end_time: endTime
    });
    
    return this.makeRequest(`/event_types/${eventTypeId}/availability?${params.toString()}`);
  }
}

// Calendly connector configuration
export const CalendlyConnectorConfig = mcpConnectorConfig({
  name: 'calendly',
  description: 'Connect to Calendly for scheduling management, event types, and automation',
  credentials: {
    apiKey: {
      type: 'string',
      description: 'Your Calendly API key',
      required: true,
      secret: true,
      help: 'Get your API key from the Calendly Developer Portal'
    }
  },
  setup: {
    baseUrl: {
      type: 'string',
      description: 'Calendly API base URL (usually https://api.calendly.com)',
      required: false,
      default: 'https://api.calendly.com',
      help: 'Leave as default unless you have a custom Calendly endpoint'
    }
  },
  tools: (tool) => ({
    GET_CURRENT_USER: tool({
      name: 'get_current_user',
      description: 'Get information about the current authenticated user',
      schema: z.object({}),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CalendlyClient(credentials.apiKey);
        const user = await client.getCurrentUser();
        
        return JSON.stringify({
          success: true,
          user
        });
      }
    }),

    GET_USER: tool({
      name: 'get_user',
      description: 'Get information about a specific user',
      schema: z.object({
        userId: z.string().describe('Calendly user ID')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CalendlyClient(credentials.apiKey);
        const user = await client.getUser(args.userId);
        
        return JSON.stringify({
          success: true,
          user
        });
      }
    }),

    LIST_USERS: tool({
      name: 'list_users',
      description: 'List users from Calendly',
      schema: z.object({
        limit: z.number().min(1).max(100).default(20).describe('Number of users to return (max 100)')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CalendlyClient(credentials.apiKey);
        const result = await client.listUsers(args.limit);
        
        return JSON.stringify({
          success: true,
          users: result.users,
          total: result.users.length
        });
      }
    }),

    LIST_EVENT_TYPES: tool({
      name: 'list_event_types',
      description: 'List event types from Calendly',
      schema: z.object({
        userId: z.string().optional().describe('User ID to filter event types by'),
        limit: z.number().min(1).max(100).default(20).describe('Number of event types to return (max 100)')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CalendlyClient(credentials.apiKey);
        const result = await client.listEventTypes(args.userId, args.limit);
        
        return JSON.stringify({
          success: true,
          eventTypes: result.event_types,
          total: result.event_types.length
        });
      }
    }),

    GET_EVENT_TYPE: tool({
      name: 'get_event_type',
      description: 'Get a specific event type by ID',
      schema: z.object({
        eventTypeId: z.string().describe('Calendly event type ID')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CalendlyClient(credentials.apiKey);
        const eventType = await client.getEventType(args.eventTypeId);
        
        return JSON.stringify({
          success: true,
          eventType
        });
      }
    }),

    CREATE_EVENT_TYPE: tool({
      name: 'create_event_type',
      description: 'Create a new event type in Calendly',
      schema: z.object({
        name: z.string().min(1).describe('Event type name'),
        description: z.string().optional().describe('Event type description'),
        duration: z.number().positive().describe('Event duration in minutes'),
        color: z.string().optional().describe('Event color (hex code)'),
        active: z.boolean().default(true).describe('Whether the event type is active')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CalendlyClient(credentials.apiKey);
        const eventType = await client.createEventType({
          name: args.name,
          description: args.description,
          duration: args.duration,
          color: args.color,
          active: args.active
        });
        
        return JSON.stringify({
          success: true,
          eventType
        });
      }
    }),

    UPDATE_EVENT_TYPE: tool({
      name: 'update_event_type',
      description: 'Update an existing event type',
      schema: z.object({
        eventTypeId: z.string().describe('Calendly event type ID'),
        name: z.string().optional().describe('New event type name'),
        description: z.string().optional().describe('New event type description'),
        duration: z.number().positive().optional().describe('New event duration in minutes'),
        color: z.string().optional().describe('New event color'),
        active: z.boolean().optional().describe('New active status')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CalendlyClient(credentials.apiKey);
        
        const updates: any = {};
        if (args.name) updates.name = args.name;
        if (args.description) updates.description = args.description;
        if (args.duration) updates.duration = args.duration;
        if (args.color) updates.color = args.color;
        if (args.active !== undefined) updates.active = args.active;
        
        const eventType = await client.updateEventType(args.eventTypeId, updates);
        
        return JSON.stringify({
          success: true,
          eventType
        });
      }
    }),

    DELETE_EVENT_TYPE: tool({
      name: 'delete_event_type',
      description: 'Delete an event type from Calendly',
      schema: z.object({
        eventTypeId: z.string().describe('Calendly event type ID')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CalendlyClient(credentials.apiKey);
        await client.deleteEventType(args.eventTypeId);
        
        return JSON.stringify({
          success: true,
          message: 'Event type deleted successfully'
        });
      }
    }),

    LIST_SCHEDULED_EVENTS: tool({
      name: 'list_scheduled_events',
      description: 'List scheduled events from Calendly',
      schema: z.object({
        userId: z.string().optional().describe('User ID to filter events by'),
        limit: z.number().min(1).max(100).default(20).describe('Number of events to return (max 100)')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CalendlyClient(credentials.apiKey);
        const result = await client.listScheduledEvents(args.userId, args.limit);
        
        return JSON.stringify({
          success: true,
          events: result.events,
          total: result.events.length
        });
      }
    }),

    GET_SCHEDULED_EVENT: tool({
      name: 'get_scheduled_event',
      description: 'Get a specific scheduled event by ID',
      schema: z.object({
        eventId: z.string().describe('Calendly scheduled event ID')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CalendlyClient(credentials.apiKey);
        const event = await client.getScheduledEvent(args.eventId);
        
        return JSON.stringify({
          success: true,
          event
        });
      }
    }),

    CANCEL_SCHEDULED_EVENT: tool({
      name: 'cancel_scheduled_event',
      description: 'Cancel a scheduled event',
      schema: z.object({
        eventId: z.string().describe('Calendly scheduled event ID'),
        reason: z.string().optional().describe('Reason for cancellation')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CalendlyClient(credentials.apiKey);
        await client.cancelScheduledEvent(args.eventId, args.reason);
        
        return JSON.stringify({
          success: true,
          message: 'Event cancelled successfully'
        });
      }
    }),

    LIST_INVITEES: tool({
      name: 'list_invitees',
      description: 'List invitees for a scheduled event',
      schema: z.object({
        eventId: z.string().describe('Calendly scheduled event ID'),
        limit: z.number().min(1).max(100).default(20).describe('Number of invitees to return (max 100)')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CalendlyClient(credentials.apiKey);
        const result = await client.listInvitees(args.eventId, args.limit);
        
        return JSON.stringify({
          success: true,
          invitees: result.invitees,
          total: result.invitees.length
        });
      }
    }),

    GET_INVITEE: tool({
      name: 'get_invitee',
      description: 'Get a specific invitee by ID',
      schema: z.object({
        inviteeId: z.string().describe('Calendly invitee ID')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CalendlyClient(credentials.apiKey);
        const invitee = await client.getInvitee(args.inviteeId);
        
        return JSON.stringify({
          success: true,
          invitee
        });
      }
    }),

    CANCEL_INVITEE: tool({
      name: 'cancel_invitee',
      description: 'Cancel an invitee for an event',
      schema: z.object({
        inviteeId: z.string().describe('Calendly invitee ID'),
        reason: z.string().optional().describe('Reason for cancellation')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CalendlyClient(credentials.apiKey);
        await client.cancelInvitee(args.inviteeId, args.reason);
        
        return JSON.stringify({
          success: true,
          message: 'Invitee cancelled successfully'
        });
      }
    }),

    LIST_ORGANIZATIONS: tool({
      name: 'list_organizations',
      description: 'List organizations from Calendly',
      schema: z.object({
        limit: z.number().min(1).max(100).default(20).describe('Number of organizations to return (max 100)')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CalendlyClient(credentials.apiKey);
        const result = await client.listOrganizations(args.limit);
        
        return JSON.stringify({
          success: true,
          organizations: result.organizations,
          total: result.organizations.length
        });
      }
    }),

    GET_ORGANIZATION: tool({
      name: 'get_organization',
      description: 'Get a specific organization by ID',
      schema: z.object({
        orgId: z.string().describe('Calendly organization ID')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CalendlyClient(credentials.apiKey);
        const organization = await client.getOrganization(args.orgId);
        
        return JSON.stringify({
          success: true,
          organization
        });
      }
    }),

    LIST_WEBHOOK_SUBSCRIPTIONS: tool({
      name: 'list_webhook_subscriptions',
      description: 'List webhook subscriptions from Calendly',
      schema: z.object({
        limit: z.number().min(1).max(100).default(20).describe('Number of webhooks to return (max 100)')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CalendlyClient(credentials.apiKey);
        const result = await client.listWebhookSubscriptions(args.limit);
        
        return JSON.stringify({
          success: true,
          webhooks: result.webhook_subscriptions,
          total: result.webhook_subscriptions.length
        });
      }
    }),

    CREATE_WEBHOOK_SUBSCRIPTION: tool({
      name: 'create_webhook_subscription',
      description: 'Create a new webhook subscription',
      schema: z.object({
        url: z.string().url().describe('Webhook URL to receive events'),
        events: z.array(z.enum(['invitee.created', 'invitee.canceled', 'invitee.updated'])).describe('Events to subscribe to')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CalendlyClient(credentials.apiKey);
        const webhook = await client.createWebhookSubscription({
          url: args.url,
          events: args.events
        });
        
        return JSON.stringify({
          success: true,
          webhook
        });
      }
    }),

    DELETE_WEBHOOK_SUBSCRIPTION: tool({
      name: 'delete_webhook_subscription',
      description: 'Delete a webhook subscription',
      schema: z.object({
        webhookId: z.string().describe('Calendly webhook subscription ID')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CalendlyClient(credentials.apiKey);
        await client.deleteWebhookSubscription(args.webhookId);
        
        return JSON.stringify({
          success: true,
          message: 'Webhook subscription deleted successfully'
        });
      }
    }),

    GET_SCHEDULING_LINKS: tool({
      name: 'get_scheduling_links',
      description: 'Get scheduling links for an event type',
      schema: z.object({
        eventTypeId: z.string().describe('Calendly event type ID')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CalendlyClient(credentials.apiKey);
        const links = await client.getSchedulingLinks(args.eventTypeId);
        
        return JSON.stringify({
          success: true,
          links
        });
      }
    }),

    GET_AVAILABILITY: tool({
      name: 'get_availability',
      description: 'Get availability for an event type',
      schema: z.object({
        eventTypeId: z.string().describe('Calendly event type ID'),
        startTime: z.string().describe('Start time for availability check (ISO 8601)'),
        endTime: z.string().describe('End time for availability check (ISO 8601)')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CalendlyClient(credentials.apiKey);
        const availability = await client.getAvailability(args.eventTypeId, args.startTime, args.endTime);
        
        return JSON.stringify({
          success: true,
          availability
        });
      }
    })
  }),
  resources: (resource) => ({
    USERS: resource({
      name: 'users',
      description: 'Calendly user data',
      schema: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        slug: z.string(),
        timezone: z.string(),
        avatar_url: z.string().optional(),
        created_at: z.string(),
        updated_at: z.string()
      }),
      handler: async (context) => {
        const credentials = await context.getCredentials();
        const client = new CalendlyClient(credentials.apiKey);
        const result = await client.listUsers(100);
        
        return result.users;
      }
    }),

    EVENT_TYPES: resource({
      name: 'event_types',
      description: 'Calendly event type data',
      schema: z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional(),
        duration: z.number(),
        slug: z.string(),
        color: z.string(),
        active: z.boolean(),
        created_at: z.string(),
        updated_at: z.string()
      }),
      handler: async (context) => {
        const credentials = await context.getCredentials();
        const client = new CalendlyClient(credentials.apiKey);
        const result = await client.listEventTypes(undefined, 100);
        
        return result.event_types;
      }
    }),

    SCHEDULED_EVENTS: resource({
      name: 'scheduled_events',
      description: 'Calendly scheduled event data',
      schema: z.object({
        id: z.string(),
        event_type: z.string(),
        start_time: z.string(),
        end_time: z.string(),
        status: z.string(),
        invitee: z.object({
          name: z.string(),
          email: z.string(),
          timezone: z.string()
        }),
        created_at: z.string(),
        updated_at: z.string()
      }),
      handler: async (context) => {
        const credentials = await context.getCredentials();
        const client = new CalendlyClient(credentials.apiKey);
        const result = await client.listScheduledEvents(undefined, 100);
        
        return result.events;
      }
    }),

    INVITEES: resource({
      name: 'invitees',
      description: 'Calendly invitee data',
      schema: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        timezone: z.string(),
        created_at: z.string(),
        updated_at: z.string()
      }),
      handler: async (context) => {
        // Note: This would need an event ID to get invitees
        // For now, return empty array as this is a resource handler limitation
        return [];
      }
    }),

    ORGANIZATIONS: resource({
      name: 'organizations',
      description: 'Calendly organization data',
      schema: z.object({
        id: z.string(),
        name: z.string(),
        slug: z.string(),
        uri: z.string(),
        created_at: z.string(),
        updated_at: z.string()
      }),
      handler: async (context) => {
        const credentials = await context.getCredentials();
        const client = new CalendlyClient(credentials.apiKey);
        const result = await client.listOrganizations(100);
        
        return result.organizations;
      }
    })
  })
});

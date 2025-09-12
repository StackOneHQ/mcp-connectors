import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface CustomerIOResponse {
  ok?: boolean;
  error?: string;
  [key: string]: unknown;
}

interface Campaign {
  id: number;
  name: string;
  state: 'active' | 'draft' | 'stopped';
  created_at: number;
  updated_at: number;
  [key: string]: unknown;
}

interface CampaignListResponse extends CustomerIOResponse {
  campaigns?: Campaign[];
}

interface Broadcast {
  id: number;
  name: string;
  created_at: number;
  updated_at: number;
  [key: string]: unknown;
}

interface BroadcastListResponse extends CustomerIOResponse {
  broadcasts?: Broadcast[];
}

interface TransactionalEmailRequest {
  to: string;
  transactional_message_id?: string;
  message_data?: Record<string, unknown>;
  identifiers?: {
    id?: string;
    email?: string;
    [key: string]: unknown;
  };
  from?: string;
  reply_to?: string;
  bcc?: string;
  subject?: string;
  body?: string;
  plaintext_body?: string;
  amp_body?: string;
  fake_bcc?: boolean;
  disable_message_retention?: boolean;
  send_to_unsubscribed?: boolean;
  tracked?: boolean;
  queue_draft?: boolean;
  disable_css_preprocessing?: boolean;
}

interface TransactionalEmailResponse extends CustomerIOResponse {
  delivery_id?: string;
  queued_at?: number;
}

interface BroadcastTriggerRequest {
  broadcast_id: number;
  data?: Record<string, unknown>;
  emails?: string[];
  email_add_duplicates?: boolean;
  email_ignore_missing?: boolean;
  ids?: string[];
  id_add_duplicates?: boolean;
  id_ignore_missing?: boolean;
  segment_id?: number;
  data_file_url?: string;
  per_user_data?: Array<{
    id?: string;
    email?: string;
    data?: Record<string, unknown>;
  }>;
}

interface BroadcastTriggerResponse extends CustomerIOResponse {
  broadcast_id?: number;
  run_id?: string;
}

interface Activity {
  id: number;
  name: string;
  type: string;
  created_at: number;
  updated_at: number;
  [key: string]: unknown;
}

interface ActivitiesResponse extends CustomerIOResponse {
  activities?: Activity[];
}

interface Message {
  id: number;
  name: string;
  type: string;
  subject?: string;
  body?: string;
  created_at: number;
  updated_at: number;
  [key: string]: unknown;
}

interface MessagesResponse extends CustomerIOResponse {
  messages?: Message[];
}

interface ExportRequest {
  type: 'campaigns' | 'customers' | 'deliveries' | 'events';
  start?: number;
  end?: number;
  campaign_id?: number;
  format?: 'csv' | 'json';
  [key: string]: unknown;
}

interface ExportResponse extends CustomerIOResponse {
  export_id?: string;
  download_url?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
}

interface Customer {
  id: string;
  email?: string;
  created_at?: number;
  updated_at?: number;
  attributes?: Record<string, unknown>;
  [key: string]: unknown;
}

interface CustomerResponse extends CustomerIOResponse {
  customer?: Customer;
}

interface Segment {
  id: number;
  name: string;
  description?: string;
  created_at: number;
  updated_at: number;
  [key: string]: unknown;
}

interface SegmentListResponse extends CustomerIOResponse {
  segments?: Segment[];
}

interface Event {
  name: string;
  data?: Record<string, unknown>;
  timestamp?: number;
}

interface EventResponse extends CustomerIOResponse {
  queued_at?: number;
}

interface DeliveryMetrics {
  delivered?: number;
  clicked?: number;
  opened?: number;
  bounced?: number;
  spammed?: number;
  unsubscribed?: number;
  [key: string]: unknown;
}

interface ReportResponse extends CustomerIOResponse {
  metrics?: DeliveryMetrics;
  period?: {
    start: number;
    end: number;
  };
}

interface Newsletter {
  id: number;
  name: string;
  created_at: number;
  updated_at: number;
  [key: string]: unknown;
}

interface NewsletterListResponse extends CustomerIOResponse {
  newsletters?: Newsletter[];
}

class CustomerIOClient {
  private headers: { Authorization: string; 'Content-Type': string };
  private trackingHeaders: { Authorization: string; 'Content-Type': string };
  private baseUrl: string;
  private trackingBaseUrl: string;

  constructor(
    appApiKey: string,
    region: 'us' | 'eu' = 'us',
    siteId?: string,
    trackingApiKey?: string
  ) {
    this.headers = {
      Authorization: `Bearer ${appApiKey}`,
      'Content-Type': 'application/json',
    };

    // For tracking API, use basic auth if credentials are provided
    if (siteId && trackingApiKey) {
      const basicAuth = btoa(`${siteId}:${trackingApiKey}`);
      this.trackingHeaders = {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      };
    } else {
      // Fallback to using app API key for tracking (may not work for all endpoints)
      this.trackingHeaders = this.headers;
    }

    this.baseUrl =
      region === 'eu'
        ? 'https://api-eu.customer.io/v1/api'
        : 'https://api.customer.io/v1/api';
    this.trackingBaseUrl =
      region === 'eu'
        ? 'https://track-eu.customer.io/api/v1'
        : 'https://track.customer.io/api/v1';
  }

  async sendTransactionalEmail(
    data: TransactionalEmailRequest
  ): Promise<TransactionalEmailResponse> {
    const response = await fetch(`${this.baseUrl}/send/email`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(
        `API request failed with status ${response.status}: ${response.statusText}`
      );
    }

    return response.json() as Promise<TransactionalEmailResponse>;
  }

  async triggerBroadcast(
    data: BroadcastTriggerRequest
  ): Promise<BroadcastTriggerResponse> {
    const response = await fetch(
      `${this.baseUrl}/campaigns/${data.broadcast_id}/triggers`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      throw new Error(
        `API request failed with status ${response.status}: ${response.statusText}`
      );
    }

    return response.json() as Promise<BroadcastTriggerResponse>;
  }

  async listCampaigns(): Promise<CampaignListResponse> {
    const response = await fetch(`${this.baseUrl}/campaigns`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed with status ${response.status}: ${response.statusText}`
      );
    }

    return response.json() as Promise<CampaignListResponse>;
  }

  async getCampaign(campaignId: number): Promise<Campaign & CustomerIOResponse> {
    const response = await fetch(`${this.baseUrl}/campaigns/${campaignId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed with status ${response.status}: ${response.statusText}`
      );
    }

    return response.json() as Promise<Campaign & CustomerIOResponse>;
  }

  async listBroadcasts(): Promise<BroadcastListResponse> {
    const response = await fetch(`${this.baseUrl}/campaigns`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed with status ${response.status}: ${response.statusText}`
      );
    }

    const data = (await response.json()) as CampaignListResponse;

    return {
      ...data,
      broadcasts: data.campaigns?.filter(
        (campaign) => campaign.type === 'broadcast'
      ) as Broadcast[],
    };
  }

  async getCampaignMetrics(
    campaignId: number,
    period?: string
  ): Promise<CustomerIOResponse> {
    const url = new URL(`${this.baseUrl}/campaigns/${campaignId}/metrics`);
    if (period) {
      url.searchParams.append('period', period);
    }

    const response = await fetch(url.toString(), {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed with status ${response.status}: ${response.statusText}`
      );
    }

    return response.json() as Promise<CustomerIOResponse>;
  }

  async getCampaignActions(campaignId: number): Promise<CustomerIOResponse> {
    const response = await fetch(`${this.baseUrl}/campaigns/${campaignId}/actions`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed with status ${response.status}: ${response.statusText}`
      );
    }

    return response.json() as Promise<CustomerIOResponse>;
  }

  async getCampaignActivities(campaignId: number): Promise<ActivitiesResponse> {
    const response = await fetch(`${this.baseUrl}/campaigns/${campaignId}/activities`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed with status ${response.status}: ${response.statusText}`
      );
    }

    return response.json() as Promise<ActivitiesResponse>;
  }

  async getCampaignMessages(campaignId: number): Promise<MessagesResponse> {
    const response = await fetch(`${this.baseUrl}/campaigns/${campaignId}/messages`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed with status ${response.status}: ${response.statusText}`
      );
    }

    return response.json() as Promise<MessagesResponse>;
  }

  async getMessage(messageId: number): Promise<Message & CustomerIOResponse> {
    const response = await fetch(`${this.baseUrl}/messages/${messageId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed with status ${response.status}: ${response.statusText}`
      );
    }

    return response.json() as Promise<Message & CustomerIOResponse>;
  }

  async createExport(exportData: ExportRequest): Promise<ExportResponse> {
    const response = await fetch(`${this.baseUrl}/exports`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(exportData),
    });

    if (!response.ok) {
      throw new Error(
        `API request failed with status ${response.status}: ${response.statusText}`
      );
    }

    return response.json() as Promise<ExportResponse>;
  }

  async getExportStatus(exportId: string): Promise<ExportResponse> {
    const response = await fetch(`${this.baseUrl}/exports/${exportId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed with status ${response.status}: ${response.statusText}`
      );
    }

    return response.json() as Promise<ExportResponse>;
  }

  async downloadExport(exportId: string): Promise<CustomerIOResponse> {
    const response = await fetch(`${this.baseUrl}/exports/${exportId}/download`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed with status ${response.status}: ${response.statusText}`
      );
    }

    return {
      download_url: response.url,
      content: await response.text(),
    };
  }

  async listNewsletters(): Promise<NewsletterListResponse> {
    const response = await fetch(`${this.baseUrl}/newsletters`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed with status ${response.status}: ${response.statusText}`
      );
    }

    return response.json() as Promise<NewsletterListResponse>;
  }

  async getNewsletter(newsletterId: number): Promise<CustomerIOResponse> {
    const response = await fetch(`${this.baseUrl}/newsletters/${newsletterId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed with status ${response.status}: ${response.statusText}`
      );
    }

    return response.json() as Promise<CustomerIOResponse>;
  }

  // Customer Management
  async createOrUpdateCustomer(
    customerId: string,
    data: Record<string, unknown>
  ): Promise<CustomerIOResponse> {
    const response = await fetch(`${this.trackingBaseUrl}/customers/${customerId}`, {
      method: 'PUT',
      headers: this.trackingHeaders,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(
        `API request failed with status ${response.status}: ${response.statusText}`
      );
    }

    return response.json() as Promise<CustomerIOResponse>;
  }

  async getCustomer(customerId: string): Promise<CustomerResponse> {
    const response = await fetch(`${this.baseUrl}/customers/${customerId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed with status ${response.status}: ${response.statusText}`
      );
    }

    return response.json() as Promise<CustomerResponse>;
  }

  async deleteCustomer(customerId: string): Promise<CustomerIOResponse> {
    const response = await fetch(`${this.trackingBaseUrl}/customers/${customerId}`, {
      method: 'DELETE',
      headers: this.trackingHeaders,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed with status ${response.status}: ${response.statusText}`
      );
    }

    return response.json() as Promise<CustomerIOResponse>;
  }

  // Event Tracking
  async trackEvent(customerId: string, event: Event): Promise<EventResponse> {
    const response = await fetch(
      `${this.trackingBaseUrl}/customers/${customerId}/events`,
      {
        method: 'POST',
        headers: this.trackingHeaders,
        body: JSON.stringify({
          name: event.name,
          data: event.data,
          timestamp: event.timestamp || Math.floor(Date.now() / 1000),
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `API request failed with status ${response.status}: ${response.statusText}`
      );
    }

    return response.json() as Promise<EventResponse>;
  }

  // Segments
  async listSegments(): Promise<SegmentListResponse> {
    const response = await fetch(`${this.baseUrl}/segments`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed with status ${response.status}: ${response.statusText}`
      );
    }

    return response.json() as Promise<SegmentListResponse>;
  }

  async getSegment(segmentId: number): Promise<Segment & CustomerIOResponse> {
    const response = await fetch(`${this.baseUrl}/segments/${segmentId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed with status ${response.status}: ${response.statusText}`
      );
    }

    return response.json() as Promise<Segment & CustomerIOResponse>;
  }

  async addCustomersToSegment(
    segmentId: number,
    customerIds: string[]
  ): Promise<CustomerIOResponse> {
    const response = await fetch(`${this.baseUrl}/segments/${segmentId}/add_customers`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ ids: customerIds }),
    });

    if (!response.ok) {
      throw new Error(
        `API request failed with status ${response.status}: ${response.statusText}`
      );
    }

    return response.json() as Promise<CustomerIOResponse>;
  }

  async removeCustomersFromSegment(
    segmentId: number,
    customerIds: string[]
  ): Promise<CustomerIOResponse> {
    const response = await fetch(
      `${this.baseUrl}/segments/${segmentId}/remove_customers`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ ids: customerIds }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `API request failed with status ${response.status}: ${response.statusText}`
      );
    }

    return response.json() as Promise<CustomerIOResponse>;
  }

  // Reporting
  async getDeliveryReport(
    start: number,
    end: number,
    campaignId?: number
  ): Promise<ReportResponse> {
    const url = new URL(`${this.baseUrl}/reports/deliveries`);
    url.searchParams.append('start', start.toString());
    url.searchParams.append('end', end.toString());
    if (campaignId) {
      url.searchParams.append('campaign_id', campaignId.toString());
    }

    const response = await fetch(url.toString(), {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed with status ${response.status}: ${response.statusText}`
      );
    }

    return response.json() as Promise<ReportResponse>;
  }

  async getBounceReport(start: number, end: number): Promise<CustomerIOResponse> {
    const url = new URL(`${this.baseUrl}/reports/bounces`);
    url.searchParams.append('start', start.toString());
    url.searchParams.append('end', end.toString());

    const response = await fetch(url.toString(), {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed with status ${response.status}: ${response.statusText}`
      );
    }

    return response.json() as Promise<CustomerIOResponse>;
  }

  async getUnsubscribeReport(start: number, end: number): Promise<CustomerIOResponse> {
    const url = new URL(`${this.baseUrl}/reports/unsubscribes`);
    url.searchParams.append('start', start.toString());
    url.searchParams.append('end', end.toString());

    const response = await fetch(url.toString(), {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed with status ${response.status}: ${response.statusText}`
      );
    }

    return response.json() as Promise<CustomerIOResponse>;
  }
}

export const CustomerIOConnectorConfig = mcpConnectorConfig({
  name: 'Customer.io',
  key: 'customerio',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/customerio/filled/svg',
  credentials: z.object({
    appApiKey: z
      .string()
      .describe(
        'Customer.io App API Key :: Get from Settings > Account Settings > API Credentials'
      ),
    siteId: z
      .string()
      .optional()
      .describe(
        'Customer.io Site ID :: Required for tracking API operations (create/update customers, track events). Get from Settings > Account Settings > API Credentials > Track API Keys'
      ),
    trackingApiKey: z
      .string()
      .optional()
      .describe(
        'Customer.io Track API Key :: Required for tracking API operations (create/update customers, track events). Get from Settings > Account Settings > API Credentials > Track API Keys'
      ),
  }),
  setup: z.object({
    region: z
      .enum(['us', 'eu'])
      .default('us')
      .describe(
        'Customer.io region :: us for app.customer.io, eu for app-eu.customer.io'
      ),
  }),
  examplePrompt:
    'Send a welcome email to john@example.com, trigger a product launch broadcast, list all campaigns, get metrics for campaign 123, view campaign messages, create a data export, manage customers and segments, track events, and get delivery reports.',
  tools: (tool) => ({
    SEND_TRANSACTIONAL_EMAIL: tool({
      name: 'customerio_send_transactional_email',
      description: 'Send a transactional email through Customer.io',
      schema: z.object({
        to: z.string().email().describe('Recipient email address'),
        transactional_message_id: z
          .string()
          .optional()
          .describe('ID of transactional message template to use'),
        subject: z.string().optional().describe('Email subject line'),
        body: z.string().optional().describe('HTML email body'),
        plaintext_body: z.string().optional().describe('Plain text email body'),
        from: z.string().optional().describe('From email address'),
        reply_to: z.string().optional().describe('Reply-to email address'),
        message_data: z
          .record(z.unknown())
          .optional()
          .describe('Data to personalize the message'),
        identifiers: z
          .object({
            id: z.string().optional(),
            email: z.string().optional(),
          })
          .optional()
          .describe('Customer identifiers'),
        tracked: z.boolean().optional().describe('Enable email tracking'),
        send_to_unsubscribed: z
          .boolean()
          .optional()
          .describe('Send to unsubscribed users'),
      }),
      handler: async (args, context) => {
        try {
          const { appApiKey, siteId, trackingApiKey } = await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new CustomerIOClient(appApiKey, region, siteId, trackingApiKey);

          const response = await client.sendTransactionalEmail(args);
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to send transactional email: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    TRIGGER_BROADCAST: tool({
      name: 'customerio_trigger_broadcast',
      description: 'Trigger an API-triggered broadcast campaign',
      schema: z.object({
        broadcast_id: z.number().describe('ID of the broadcast campaign to trigger'),
        data: z.record(z.unknown()).optional().describe('Global data for the broadcast'),
        emails: z
          .array(z.string())
          .optional()
          .describe('Array of email addresses to target'),
        email_add_duplicates: z
          .boolean()
          .optional()
          .describe('Add duplicate emails to audience'),
        email_ignore_missing: z
          .boolean()
          .optional()
          .describe('Ignore missing email addresses'),
        ids: z.array(z.string()).optional().describe('Array of customer IDs to target'),
        id_add_duplicates: z
          .boolean()
          .optional()
          .describe('Add duplicate IDs to audience'),
        id_ignore_missing: z.boolean().optional().describe('Ignore missing customer IDs'),
        segment_id: z.number().optional().describe('Segment ID to target'),
        per_user_data: z
          .array(
            z.object({
              id: z.string().optional(),
              email: z.string().optional(),
              data: z.record(z.unknown()).optional(),
            })
          )
          .optional()
          .describe('Per-user data for personalization'),
      }),
      handler: async (args, context) => {
        try {
          const { appApiKey, siteId, trackingApiKey } = await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new CustomerIOClient(appApiKey, region, siteId, trackingApiKey);

          const response = await client.triggerBroadcast(args);
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to trigger broadcast: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_CAMPAIGNS: tool({
      name: 'customerio_list_campaigns',
      description: 'List all campaigns in Customer.io workspace',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { appApiKey, siteId, trackingApiKey } = await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new CustomerIOClient(appApiKey, region, siteId, trackingApiKey);

          const response = await client.listCampaigns();
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to list campaigns: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_CAMPAIGN: tool({
      name: 'customerio_get_campaign',
      description: 'Get details of a specific campaign',
      schema: z.object({
        campaign_id: z.number().describe('ID of the campaign to retrieve'),
      }),
      handler: async (args, context) => {
        try {
          const { appApiKey, siteId, trackingApiKey } = await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new CustomerIOClient(appApiKey, region, siteId, trackingApiKey);

          const response = await client.getCampaign(args.campaign_id);
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to get campaign: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_BROADCASTS: tool({
      name: 'customerio_list_broadcasts',
      description: 'List all broadcast campaigns in Customer.io workspace',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { appApiKey, siteId, trackingApiKey } = await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new CustomerIOClient(appApiKey, region, siteId, trackingApiKey);

          const response = await client.listBroadcasts();
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to list broadcasts: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_CAMPAIGN_METRICS: tool({
      name: 'customerio_get_campaign_metrics',
      description: 'Get metrics for a specific campaign',
      schema: z.object({
        campaign_id: z.number().describe('ID of the campaign'),
        period: z
          .string()
          .optional()
          .describe('Time period for metrics (e.g., "24h", "7d", "30d")'),
      }),
      handler: async (args, context) => {
        try {
          const { appApiKey, siteId, trackingApiKey } = await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new CustomerIOClient(appApiKey, region, siteId, trackingApiKey);

          const response = await client.getCampaignMetrics(args.campaign_id, args.period);
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to get campaign metrics: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_CAMPAIGN_ACTIONS: tool({
      name: 'customerio_get_campaign_actions',
      description: 'Get actions (messages, webhooks, etc.) for a specific campaign',
      schema: z.object({
        campaign_id: z.number().describe('ID of the campaign'),
      }),
      handler: async (args, context) => {
        try {
          const { appApiKey, siteId, trackingApiKey } = await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new CustomerIOClient(appApiKey, region, siteId, trackingApiKey);

          const response = await client.getCampaignActions(args.campaign_id);
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to get campaign actions: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_CAMPAIGN_ACTIVITIES: tool({
      name: 'customerio_get_campaign_activities',
      description: 'Get activities (workflow steps) for a specific campaign',
      schema: z.object({
        campaign_id: z.number().describe('ID of the campaign'),
      }),
      handler: async (args, context) => {
        try {
          const { appApiKey, siteId, trackingApiKey } = await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new CustomerIOClient(appApiKey, region, siteId, trackingApiKey);

          const response = await client.getCampaignActivities(args.campaign_id);
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to get campaign activities: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_CAMPAIGN_MESSAGES: tool({
      name: 'customerio_get_campaign_messages',
      description: 'Get all messages for a specific campaign',
      schema: z.object({
        campaign_id: z.number().describe('ID of the campaign'),
      }),
      handler: async (args, context) => {
        try {
          const { appApiKey, siteId, trackingApiKey } = await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new CustomerIOClient(appApiKey, region, siteId, trackingApiKey);

          const response = await client.getCampaignMessages(args.campaign_id);
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to get campaign messages: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_MESSAGE: tool({
      name: 'customerio_get_message',
      description: 'Get details of a specific message by ID',
      schema: z.object({
        message_id: z.number().describe('ID of the message'),
      }),
      handler: async (args, context) => {
        try {
          const { appApiKey, siteId, trackingApiKey } = await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new CustomerIOClient(appApiKey, region, siteId, trackingApiKey);

          const response = await client.getMessage(args.message_id);
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to get message: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    CREATE_EXPORT: tool({
      name: 'customerio_create_export',
      description: 'Create a data export (campaigns, customers, deliveries, or events)',
      schema: z.object({
        type: z
          .enum(['campaigns', 'customers', 'deliveries', 'events'])
          .describe('Type of data to export'),
        start: z.number().optional().describe('Start timestamp for export range'),
        end: z.number().optional().describe('End timestamp for export range'),
        campaign_id: z
          .number()
          .optional()
          .describe('Campaign ID to filter by (for campaigns export)'),
        format: z.enum(['csv', 'json']).default('csv').describe('Export format'),
      }),
      handler: async (args, context) => {
        try {
          const { appApiKey, siteId, trackingApiKey } = await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new CustomerIOClient(appApiKey, region, siteId, trackingApiKey);

          const response = await client.createExport(args);
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to create export: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_EXPORT_STATUS: tool({
      name: 'customerio_get_export_status',
      description: 'Get the status of a data export',
      schema: z.object({
        export_id: z.string().describe('ID of the export to check'),
      }),
      handler: async (args, context) => {
        try {
          const { appApiKey, siteId, trackingApiKey } = await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new CustomerIOClient(appApiKey, region, siteId, trackingApiKey);

          const response = await client.getExportStatus(args.export_id);
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to get export status: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    DOWNLOAD_EXPORT: tool({
      name: 'customerio_download_export',
      description: 'Download the results of a completed data export',
      schema: z.object({
        export_id: z.string().describe('ID of the completed export to download'),
      }),
      handler: async (args, context) => {
        try {
          const { appApiKey, siteId, trackingApiKey } = await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new CustomerIOClient(appApiKey, region, siteId, trackingApiKey);

          const response = await client.downloadExport(args.export_id);
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to download export: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_NEWSLETTERS: tool({
      name: 'customerio_list_newsletters',
      description: 'List all newsletters in Customer.io workspace',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { appApiKey, siteId, trackingApiKey } = await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new CustomerIOClient(appApiKey, region, siteId, trackingApiKey);

          const response = await client.listNewsletters();
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to list newsletters: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_NEWSLETTER: tool({
      name: 'customerio_get_newsletter',
      description: 'Get details of a specific newsletter',
      schema: z.object({
        newsletter_id: z.number().describe('ID of the newsletter'),
      }),
      handler: async (args, context) => {
        try {
          const { appApiKey, siteId, trackingApiKey } = await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new CustomerIOClient(appApiKey, region, siteId, trackingApiKey);

          const response = await client.getNewsletter(args.newsletter_id);
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to get newsletter: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    // Customer Management Tools
    CREATE_OR_UPDATE_CUSTOMER: tool({
      name: 'customerio_create_or_update_customer',
      description: 'Create or update a customer profile in Customer.io',
      schema: z.object({
        customer_id: z.string().describe('Unique customer identifier'),
        email: z.string().email().optional().describe('Customer email address'),
        attributes: z
          .record(z.unknown())
          .optional()
          .describe('Customer attributes (name, age, etc.)'),
      }),
      handler: async (args, context) => {
        try {
          const { appApiKey, siteId, trackingApiKey } = await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new CustomerIOClient(appApiKey, region, siteId, trackingApiKey);

          const data: Record<string, unknown> = {};
          if (args.email) data.email = args.email;
          if (args.attributes) Object.assign(data, args.attributes);

          const response = await client.createOrUpdateCustomer(args.customer_id, data);
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to create/update customer: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_CUSTOMER: tool({
      name: 'customerio_get_customer',
      description: 'Get details of a specific customer',
      schema: z.object({
        customer_id: z.string().describe('Customer ID to retrieve'),
      }),
      handler: async (args, context) => {
        try {
          const { appApiKey, siteId, trackingApiKey } = await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new CustomerIOClient(appApiKey, region, siteId, trackingApiKey);

          const response = await client.getCustomer(args.customer_id);
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to get customer: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    DELETE_CUSTOMER: tool({
      name: 'customerio_delete_customer',
      description: 'Delete a customer from Customer.io',
      schema: z.object({
        customer_id: z.string().describe('Customer ID to delete'),
      }),
      handler: async (args, context) => {
        try {
          const { appApiKey, siteId, trackingApiKey } = await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new CustomerIOClient(appApiKey, region, siteId, trackingApiKey);

          const response = await client.deleteCustomer(args.customer_id);
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to delete customer: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    // Event Tracking Tools
    TRACK_EVENT: tool({
      name: 'customerio_track_event',
      description: 'Track a custom event for a customer',
      schema: z.object({
        customer_id: z.string().describe('Customer ID to track event for'),
        event_name: z.string().describe('Name of the event to track'),
        event_data: z.record(z.unknown()).optional().describe('Event data/properties'),
        timestamp: z
          .number()
          .optional()
          .describe('Event timestamp (Unix timestamp, defaults to now)'),
      }),
      handler: async (args, context) => {
        try {
          const { appApiKey, siteId, trackingApiKey } = await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new CustomerIOClient(appApiKey, region, siteId, trackingApiKey);

          const response = await client.trackEvent(args.customer_id, {
            name: args.event_name,
            data: args.event_data,
            timestamp: args.timestamp,
          });
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to track event: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    // Segment Management Tools
    LIST_SEGMENTS: tool({
      name: 'customerio_list_segments',
      description: 'List all segments in Customer.io workspace',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { appApiKey, siteId, trackingApiKey } = await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new CustomerIOClient(appApiKey, region, siteId, trackingApiKey);

          const response = await client.listSegments();
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to list segments: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_SEGMENT: tool({
      name: 'customerio_get_segment',
      description: 'Get details of a specific segment',
      schema: z.object({
        segment_id: z.number().describe('ID of the segment to retrieve'),
      }),
      handler: async (args, context) => {
        try {
          const { appApiKey, siteId, trackingApiKey } = await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new CustomerIOClient(appApiKey, region, siteId, trackingApiKey);

          const response = await client.getSegment(args.segment_id);
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to get segment: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    ADD_CUSTOMERS_TO_SEGMENT: tool({
      name: 'customerio_add_customers_to_segment',
      description: 'Add customers to a specific segment',
      schema: z.object({
        segment_id: z.number().describe('ID of the segment'),
        customer_ids: z
          .array(z.string())
          .describe('Array of customer IDs to add to the segment'),
      }),
      handler: async (args, context) => {
        try {
          const { appApiKey, siteId, trackingApiKey } = await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new CustomerIOClient(appApiKey, region, siteId, trackingApiKey);

          const response = await client.addCustomersToSegment(
            args.segment_id,
            args.customer_ids
          );
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to add customers to segment: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    REMOVE_CUSTOMERS_FROM_SEGMENT: tool({
      name: 'customerio_remove_customers_from_segment',
      description: 'Remove customers from a specific segment',
      schema: z.object({
        segment_id: z.number().describe('ID of the segment'),
        customer_ids: z
          .array(z.string())
          .describe('Array of customer IDs to remove from the segment'),
      }),
      handler: async (args, context) => {
        try {
          const { appApiKey, siteId, trackingApiKey } = await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new CustomerIOClient(appApiKey, region, siteId, trackingApiKey);

          const response = await client.removeCustomersFromSegment(
            args.segment_id,
            args.customer_ids
          );
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to remove customers from segment: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    // Reporting Tools
    GET_DELIVERY_REPORT: tool({
      name: 'customerio_get_delivery_report',
      description: 'Get delivery metrics report for a time period',
      schema: z.object({
        start: z.number().describe('Start timestamp for report period (Unix timestamp)'),
        end: z.number().describe('End timestamp for report period (Unix timestamp)'),
        campaign_id: z.number().optional().describe('Filter by specific campaign ID'),
      }),
      handler: async (args, context) => {
        try {
          const { appApiKey, siteId, trackingApiKey } = await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new CustomerIOClient(appApiKey, region, siteId, trackingApiKey);

          const response = await client.getDeliveryReport(
            args.start,
            args.end,
            args.campaign_id
          );
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to get delivery report: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_BOUNCE_REPORT: tool({
      name: 'customerio_get_bounce_report',
      description: 'Get bounce report for a time period',
      schema: z.object({
        start: z.number().describe('Start timestamp for report period (Unix timestamp)'),
        end: z.number().describe('End timestamp for report period (Unix timestamp)'),
      }),
      handler: async (args, context) => {
        try {
          const { appApiKey, siteId, trackingApiKey } = await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new CustomerIOClient(appApiKey, region, siteId, trackingApiKey);

          const response = await client.getBounceReport(args.start, args.end);
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to get bounce report: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_UNSUBSCRIBE_REPORT: tool({
      name: 'customerio_get_unsubscribe_report',
      description: 'Get unsubscribe report for a time period',
      schema: z.object({
        start: z.number().describe('Start timestamp for report period (Unix timestamp)'),
        end: z.number().describe('End timestamp for report period (Unix timestamp)'),
      }),
      handler: async (args, context) => {
        try {
          const { appApiKey, siteId, trackingApiKey } = await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new CustomerIOClient(appApiKey, region, siteId, trackingApiKey);

          const response = await client.getUnsubscribeReport(args.start, args.end);
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to get unsubscribe report: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

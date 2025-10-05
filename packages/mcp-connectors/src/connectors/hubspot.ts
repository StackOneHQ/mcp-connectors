import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

class HubSpotClient {
  private baseUrl = 'https://api.hubapi.com';
  private headers: Record<string, string>;

  constructor(apiKey: string) {
    this.headers = {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    };
  }

  async getContacts(params: {
    limit?: number;
    after?: string;
    properties?: string[];
  }) {
    const searchParams = new URLSearchParams();
    if (params.limit) searchParams.append('limit', String(params.limit));
    if (params.after) searchParams.append('after', params.after);
    if (params.properties?.length) {
      for (const prop of params.properties) {
        searchParams.append('properties', prop);
      }
    }

    const response = await fetch(
      `${this.baseUrl}/crm/v3/objects/contacts?${searchParams.toString()}`,
      {
        method: 'GET',
        headers: this.headers,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HubSpot API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async getDeals(params: {
    limit?: number;
    after?: string;
    properties?: string[];
  }) {
    const searchParams = new URLSearchParams();
    if (params.limit) searchParams.append('limit', String(params.limit));
    if (params.after) searchParams.append('after', params.after);
    if (params.properties?.length) {
      for (const prop of params.properties) {
        searchParams.append('properties', prop);
      }
    }

    const response = await fetch(
      `${this.baseUrl}/crm/v3/objects/deals?${searchParams.toString()}`,
      {
        method: 'GET',
        headers: this.headers,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HubSpot API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async createContact(properties: Record<string, unknown>) {
    const response = await fetch(`${this.baseUrl}/crm/v3/objects/contacts`, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HubSpot API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async createDeal(properties: Record<string, unknown>) {
    const response = await fetch(`${this.baseUrl}/crm/v3/objects/deals`, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HubSpot API error: ${response.status} - ${error}`);
    }

    return response.json();
  }
}

export const HubSpotConnectorConfig = mcpConnectorConfig({
  name: 'HubSpot',
  key: 'hubspot',
  version: '1.0.0',
  credentials: z.object({
    apiKey: z
      .string()
      .describe('Your HubSpot API key from Settings > Integrations > API Key'),
  }),
  logo: 'https://stackone-logos.com/api/hubspot/filled/svg',
  setup: z.object({}),
  examplePrompt:
    'Get my HubSpot contacts and create a new deal for $10,000 with Acme Corp',
  tools: (tool) => ({
    GET_CONTACTS: tool({
      name: 'hubspot_get_contacts',
      description: 'Retrieve a list of contacts from HubSpot CRM',
      schema: z.object({
        limit: z.number().default(10).describe('Number of contacts to return (max 100)'),
        after: z.string().optional().describe('Pagination cursor for next page'),
        properties: z
          .array(z.string())
          .optional()
          .describe('List of contact properties to include in the response'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new HubSpotClient(apiKey);
          const data = await client.getContacts({
            limit: args.limit,
            after: args.after,
            properties: args.properties,
          });
          return JSON.stringify(data, null, 2);
        } catch (error) {
          return `Failed to fetch contacts: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_DEALS: tool({
      name: 'hubspot_get_deals',
      description: 'Retrieve a list of deals from HubSpot CRM',
      schema: z.object({
        limit: z.number().default(10).describe('Number of deals to return (max 100)'),
        after: z.string().optional().describe('Pagination cursor for next page'),
        properties: z
          .array(z.string())
          .optional()
          .describe('List of deal properties to include in the response'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new HubSpotClient(apiKey);
          const data = await client.getDeals({
            limit: args.limit,
            after: args.after,
            properties: args.properties,
          });
          return JSON.stringify(data, null, 2);
        } catch (error) {
          return `Failed to fetch deals: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    CREATE_CONTACT: tool({
      name: 'hubspot_create_contact',
      description: 'Create a new contact in HubSpot CRM',
      schema: z.object({
        email: z.string().describe('Email address of the contact'),
        firstname: z.string().optional().describe('First name of the contact'),
        lastname: z.string().optional().describe('Last name of the contact'),
        company: z.string().optional().describe('Company name'),
        phone: z.string().optional().describe('Phone number'),
        website: z.string().optional().describe('Website URL'),
        additionalProperties: z
          .record(z.any())
          .optional()
          .describe('Additional custom properties for the contact'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new HubSpotClient(apiKey);

          const properties: Record<string, unknown> = {
            email: args.email,
          };

          if (args.firstname) properties.firstname = args.firstname;
          if (args.lastname) properties.lastname = args.lastname;
          if (args.company) properties.company = args.company;
          if (args.phone) properties.phone = args.phone;
          if (args.website) properties.website = args.website;

          if (args.additionalProperties) {
            Object.assign(properties, args.additionalProperties);
          }

          const data = await client.createContact(properties);
          return JSON.stringify(data, null, 2);
        } catch (error) {
          return `Failed to create contact: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    CREATE_DEAL: tool({
      name: 'hubspot_create_deal',
      description: 'Create a new deal in HubSpot CRM',
      schema: z.object({
        dealname: z.string().describe('Name of the deal'),
        amount: z.string().optional().describe('Deal amount'),
        dealstage: z.string().optional().describe('Stage of the deal'),
        pipeline: z.string().optional().describe('Pipeline ID'),
        closedate: z
          .string()
          .optional()
          .describe('Expected close date (timestamp or ISO 8601)'),
        hubspot_owner_id: z.string().optional().describe('Owner ID for the deal'),
        additionalProperties: z
          .record(z.any())
          .optional()
          .describe('Additional custom properties for the deal'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new HubSpotClient(apiKey);

          const properties: Record<string, unknown> = {
            dealname: args.dealname,
          };

          if (args.amount) properties.amount = args.amount;
          if (args.dealstage) properties.dealstage = args.dealstage;
          if (args.pipeline) properties.pipeline = args.pipeline;
          if (args.closedate) properties.closedate = args.closedate;
          if (args.hubspot_owner_id) properties.hubspot_owner_id = args.hubspot_owner_id;

          if (args.additionalProperties) {
            Object.assign(properties, args.additionalProperties);
          }

          const data = await client.createDeal(properties);
          return JSON.stringify(data, null, 2);
        } catch (error) {
          return `Failed to create deal: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

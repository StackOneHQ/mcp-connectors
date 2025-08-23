import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface AutumnCustomer {
  autumn_id: string;
  created_at: number;
  env: string;
  id: string;
  name: string;
  email: string;
  stripe_id?: string;
  products: Array<{
    id: string;
    name: string;
    status: string;
  }>;
  features: Array<{
    feature_id: string;
    unlimited: boolean;
    balance: number;
    usage: number;
  }>;
}

interface AutumnAttachResponse {
  url?: string;
  success: boolean;
  message?: string;
}

interface AutumnCheckResponse {
  access: boolean;
  feature_id: string;
  balance?: number;
  usage?: number;
  unlimited?: boolean;
}

interface AutumnTrackResponse {
  success: boolean;
  message?: string;
  new_balance?: number;
  new_usage?: number;
}

export const AutumnConnectorConfig = mcpConnectorConfig({
  name: 'Autumn',
  key: 'autumn',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/autumn/filled/svg',
  description:
    'Open-source payment and billing platform for SaaS startups. Handles Stripe integration, usage tracking, feature access control, and subscription management.',
  examplePrompt:
    'Get customer details for user "user_123", check their access to the "api_calls" feature, and track usage of 10 API calls.',
  credentials: z.object({
    apiKey: z
      .string()
      .describe(
        'Your Autumn Secret API key from the dashboard :: autumn_sk_1234567890abcdef :: https://useautumn.com/dashboard/api-keys'
      ),
  }),
  setup: z.object({
    baseUrl: z
      .string()
      .optional()
      .describe('Autumn API base URL (defaults to https://api.useautumn.com/v1)'),
  }),
  tools: (tool) => ({
    GET_CUSTOMER: tool({
      name: 'autumn_get_customer',
      description:
        'Retrieve detailed information about a specific customer including their subscriptions, add-ons, and entitlements',
      schema: z.object({
        customer_id: z.string().describe('Your unique identifier for the customer'),
      }),
      handler: async (args, context) => {
        const { apiKey } = await context.getCredentials();
        const { baseUrl } = await context.getSetup();
        const apiBaseUrl = baseUrl || 'https://api.useautumn.com/v1';

        const response = await fetch(`${apiBaseUrl}/customers/${args.customer_id}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Autumn API error: ${response.status} ${response.statusText}`);
        }

        const customer = (await response.json()) as AutumnCustomer;
        return JSON.stringify(customer, null, 2);
      },
    }),
    CREATE_CUSTOMER: tool({
      name: 'autumn_create_customer',
      description: 'Create a new customer in Autumn',
      schema: z.object({
        customer_id: z.string().describe('Your unique identifier for the customer'),
        name: z.string().describe('Customer name'),
        email: z.string().email().describe('Customer email address'),
      }),
      handler: async (args, context) => {
        const { apiKey } = await context.getCredentials();
        const { baseUrl } = await context.getSetup();
        const apiBaseUrl = baseUrl || 'https://api.useautumn.com/v1';

        const response = await fetch(`${apiBaseUrl}/customers`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: args.customer_id,
            name: args.name,
            email: args.email,
          }),
        });

        if (!response.ok) {
          throw new Error(`Autumn API error: ${response.status} ${response.statusText}`);
        }

        const customer = (await response.json()) as AutumnCustomer;
        return `Customer created successfully:\n${JSON.stringify(customer, null, 2)}`;
      },
    }),
    ATTACH_PRODUCT: tool({
      name: 'autumn_attach_product',
      description:
        'Attach a product to a customer, handling purchase flows and upgrades/downgrades',
      schema: z.object({
        customer_id: z.string().describe('Your unique identifier for the customer'),
        product_id: z.string().describe('The product ID to attach'),
        success_url: z
          .string()
          .url()
          .optional()
          .describe('URL to redirect after successful payment'),
        cancel_url: z
          .string()
          .url()
          .optional()
          .describe('URL to redirect after cancelled payment'),
      }),
      handler: async (args, context) => {
        const { apiKey } = await context.getCredentials();
        const { baseUrl } = await context.getSetup();
        const apiBaseUrl = baseUrl || 'https://api.useautumn.com/v1';

        const response = await fetch(`${apiBaseUrl}/attach`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customer_id: args.customer_id,
            product_id: args.product_id,
            success_url: args.success_url,
            cancel_url: args.cancel_url,
          }),
        });

        if (!response.ok) {
          throw new Error(`Autumn API error: ${response.status} ${response.statusText}`);
        }

        const result = (await response.json()) as AutumnAttachResponse;
        return result.url
          ? `Payment URL generated: ${result.url}`
          : `Product attached successfully: ${result.message || 'Product enabled for customer'}`;
      },
    }),
    CHECK_ACCESS: tool({
      name: 'autumn_check_access',
      description:
        'Check whether a customer has access to a specific feature and get usage information',
      schema: z.object({
        customer_id: z.string().describe('Your unique identifier for the customer'),
        feature_id: z.string().describe('The feature ID to check access for'),
      }),
      handler: async (args, context) => {
        const { apiKey } = await context.getCredentials();
        const { baseUrl } = await context.getSetup();
        const apiBaseUrl = baseUrl || 'https://api.useautumn.com/v1';

        const response = await fetch(`${apiBaseUrl}/check`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customer_id: args.customer_id,
            feature_id: args.feature_id,
          }),
        });

        if (!response.ok) {
          throw new Error(`Autumn API error: ${response.status} ${response.statusText}`);
        }

        const result = (await response.json()) as AutumnCheckResponse;
        return `Feature Access Check:
- Feature: ${result.feature_id}
- Access: ${result.access ? 'Granted' : 'Denied'}
- Unlimited: ${result.unlimited || false}
- Balance: ${result.balance || 0}
- Usage: ${result.usage || 0}`;
      },
    }),
    TRACK_USAGE: tool({
      name: 'autumn_track_usage',
      description:
        'Track a usage event when a customer uses a feature (e.g., uses a credit, API call)',
      schema: z.object({
        customer_id: z.string().describe('Your unique identifier for the customer'),
        feature_id: z.string().describe('The feature ID being used'),
        value: z
          .number()
          .describe('The amount to track (e.g., 1 for one API call, 10 for 10 credits)'),
      }),
      handler: async (args, context) => {
        const { apiKey } = await context.getCredentials();
        const { baseUrl } = await context.getSetup();
        const apiBaseUrl = baseUrl || 'https://api.useautumn.com/v1';

        const response = await fetch(`${apiBaseUrl}/track`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customer_id: args.customer_id,
            feature_id: args.feature_id,
            value: args.value,
          }),
        });

        if (!response.ok) {
          throw new Error(`Autumn API error: ${response.status} ${response.statusText}`);
        }

        const result = (await response.json()) as AutumnTrackResponse;
        return `Usage tracked successfully:
- Feature: ${args.feature_id}
- Value: ${args.value}
- New Balance: ${result.new_balance || 'N/A'}
- New Usage: ${result.new_usage || 'N/A'}
${result.message ? `- Message: ${result.message}` : ''}`;
      },
    }),
    LIST_PRODUCTS: tool({
      name: 'autumn_list_products',
      description: 'List all available products in your Autumn account',
      schema: z.object({}),
      handler: async (_args, context) => {
        const { apiKey } = await context.getCredentials();
        const { baseUrl } = await context.getSetup();
        const apiBaseUrl = baseUrl || 'https://api.useautumn.com/v1';

        const response = await fetch(`${apiBaseUrl}/products`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Autumn API error: ${response.status} ${response.statusText}`);
        }

        const products = await response.json();
        return JSON.stringify(products, null, 2);
      },
    }),
    GET_BILLING_PORTAL: tool({
      name: 'autumn_get_billing_portal',
      description:
        'Generate a billing portal URL for a customer to manage their subscription',
      schema: z.object({
        customer_id: z.string().describe('Your unique identifier for the customer'),
        return_url: z
          .string()
          .url()
          .optional()
          .describe('URL to redirect after billing portal session'),
      }),
      handler: async (args, context) => {
        const { apiKey } = await context.getCredentials();
        const { baseUrl } = await context.getSetup();
        const apiBaseUrl = baseUrl || 'https://api.useautumn.com/v1';

        const response = await fetch(`${apiBaseUrl}/billing-portal`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customer_id: args.customer_id,
            return_url: args.return_url,
          }),
        });

        if (!response.ok) {
          throw new Error(`Autumn API error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        return `Billing portal URL: ${result.url}`;
      },
    }),
  }),
  resources: (resource) => ({
    CUSTOMER_INFO: resource({
      name: 'customer_info',
      uri: 'autumn://customer/{customer_id}',
      title: 'Customer Information',
      description: 'Get customer information and subscription status',
      handler: async (uri, context) => {
        const customerId = uri.split('/').pop();
        if (!customerId) {
          throw new Error('Customer ID is required');
        }

        const { apiKey } = await context.getCredentials();
        const { baseUrl } = await context.getSetup();
        const apiBaseUrl = baseUrl || 'https://api.useautumn.com/v1';

        const response = await fetch(`${apiBaseUrl}/customers/${customerId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Autumn API error: ${response.status} ${response.statusText}`);
        }

        const customer = (await response.json()) as AutumnCustomer;

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(customer, null, 2),
            },
          ],
        };
      },
    }),
  }),
});

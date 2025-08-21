import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';
import { createIndex, search } from '../utils/lexical-search';

interface PolarProduct {
  id: string;
  name: string;
  description?: string;
  is_archived: boolean;
  is_highlighted: boolean;
  is_recurring: boolean;
  type: 'digital' | 'saas';
  prices: Array<{
    id: string;
    type: 'one_time' | 'recurring';
    amount_currency: string;
    amount_type: 'fixed' | 'custom';
    price_amount?: number;
    price_currency?: string;
    recurring_interval?: 'month' | 'year';
  }>;
  benefits: Array<{
    id: string;
    type: string;
    description: string;
  }>;
  medias: Array<{
    id: string;
    name: string;
    path: string;
  }>;
  organization_id: string;
  created_at: string;
  modified_at?: string;
  [key: string]: unknown;
}

interface PolarCustomer {
  id: string;
  email: string;
  email_verified: boolean;
  name?: string;
  billing_address?: {
    country: string;
    line1?: string;
    line2?: string;
    postal_code?: string;
    state?: string;
    city?: string;
  };
  tax_id?: Array<{
    type: string;
    value: string;
  }>;
  organization_id: string;
  avatar_url?: string;
  metadata: Record<string, string>;
  created_at: string;
  modified_at?: string;
  [key: string]: unknown;
}

interface PolarSubscription {
  id: string;
  status: 'incomplete' | 'incomplete_expired' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  started_at?: string;
  ended_at?: string;
  trial_start?: string;
  trial_end?: string;
  customer_id: string;
  product_id: string;
  price_id: string;
  discount_id?: string;
  checkout_id?: string;
  metadata: Record<string, string>;
  organization_id: string;
  created_at: string;
  modified_at?: string;
}

interface PolarCheckout {
  id: string;
  status: 'open' | 'expired' | 'confirmed';
  client_secret: string;
  url: string;
  expires_at: string;
  success_url?: string;
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_ip_address?: string;
  customer_billing_address?: {
    line1?: string;
    line2?: string;
    postal_code?: string;
    city?: string;
    state?: string;
    country: string;
  };
  customer_tax_id?: string;
  payment_processor: 'stripe' | 'open_collective';
  metadata: Record<string, string>;
  product_id: string;
  product_price_id: string;
  discount_id?: string;
  allow_discount_codes: boolean;
  is_discount_applicable: boolean;
  is_free_product_price: boolean;
  is_payment_required: boolean;
  is_payment_setup_required: boolean;
  is_payment_form_required: boolean;
  total_amount?: number;
  tax_amount?: number;
  currency?: string;
  subtotal_amount?: number;
  discount_amount?: number;
  organization_id: string;
  created_at: string;
  modified_at?: string;
}

interface PolarOrder {
  id: string;
  amount: number;
  tax_amount: number;
  currency: string;
  billing_reason: 'purchase' | 'subscription_cycle' | 'subscription_create' | 'subscription_update';
  billing_address?: {
    country: string;
    line1?: string;
    line2?: string;
    postal_code?: string;
    state?: string;
    city?: string;
  };
  customer_id: string;
  product_id: string;
  product_price_id: string;
  discount_id?: string;
  subscription_id?: string;
  checkout_id?: string;
  metadata: Record<string, string>;
  organization_id: string;
  created_at: string;
}

interface PolarBenefit {
  id: string;
  type: 'custom' | 'articles' | 'ads' | 'discord' | 'github_repository' | 'downloadables' | 'license_keys';
  description: string;
  selectable: boolean;
  deletable: boolean;
  organization_id: string;
  properties: Record<string, unknown>;
  created_at: string;
  modified_at?: string;
}

interface PolarOrganization {
  id: string;
  name: string;
  slug: string;
  avatar_url?: string;
  bio?: string;
  company?: string;
  blog?: string;
  location?: string;
  email?: string;
  twitter_username?: string;
  pledge_minimum_amount: number;
  pledge_badge_show_amount: boolean;
  default_upfront_split_to_contributors?: number;
  account_id?: string;
  feature_settings?: Record<string, boolean>;
  created_at: string;
  modified_at?: string;
}

class PolarClient {
  private headers: { Authorization: string; Accept: string; 'Content-Type': string };
  private baseUrl: string;

  constructor(accessToken: string, server: 'production' | 'sandbox' = 'production') {
    this.baseUrl = server === 'production' 
      ? 'https://api.polar.sh/v1'
      : 'https://sandbox-api.polar.sh/v1';
    
    this.headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  async getProducts(organizationId?: string, isArchived?: boolean, limit = 50): Promise<PolarProduct[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });

    if (organizationId) {
      params.append('organization_id', organizationId);
    }
    if (isArchived !== undefined) {
      params.append('is_archived', isArchived.toString());
    }

    const response = await fetch(`${this.baseUrl}/products?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Polar API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { items: PolarProduct[] };
    return result.items;
  }

  async getProduct(productId: string): Promise<PolarProduct> {
    const response = await fetch(`${this.baseUrl}/products/${productId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Polar API error: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as PolarProduct;
  }

  async getCustomers(organizationId?: string, limit = 50): Promise<PolarCustomer[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });

    if (organizationId) {
      params.append('organization_id', organizationId);
    }

    const response = await fetch(`${this.baseUrl}/customers?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Polar API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { items: PolarCustomer[] };
    return result.items;
  }

  async getCustomer(customerId: string): Promise<PolarCustomer> {
    const response = await fetch(`${this.baseUrl}/customers/${customerId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Polar API error: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as PolarCustomer;
  }

  async createCustomer(data: {
    email: string;
    name?: string;
    billing_address?: {
      country: string;
      line1?: string;
      line2?: string;
      postal_code?: string;
      state?: string;
      city?: string;
    };
    tax_id?: Array<{
      type: string;
      value: string;
    }>;
    metadata?: Record<string, string>;
  }): Promise<PolarCustomer> {
    const response = await fetch(`${this.baseUrl}/customers`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Polar API error: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as PolarCustomer;
  }

  async getSubscriptions(
    organizationId?: string,
    customerId?: string,
    productId?: string,
    active?: boolean,
    limit = 50
  ): Promise<PolarSubscription[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });

    if (organizationId) {
      params.append('organization_id', organizationId);
    }
    if (customerId) {
      params.append('customer_id', customerId);
    }
    if (productId) {
      params.append('product_id', productId);
    }
    if (active !== undefined) {
      params.append('active', active.toString());
    }

    const response = await fetch(`${this.baseUrl}/subscriptions?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Polar API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { items: PolarSubscription[] };
    return result.items;
  }

  async getSubscription(subscriptionId: string): Promise<PolarSubscription> {
    const response = await fetch(`${this.baseUrl}/subscriptions/${subscriptionId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Polar API error: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as PolarSubscription;
  }

  async createCheckout(data: {
    product_id?: string;
    product_price_id?: string;
    success_url?: string;
    customer_id?: string;
    customer_email?: string;
    customer_name?: string;
    allow_discount_codes?: boolean;
    metadata?: Record<string, string>;
  }): Promise<PolarCheckout> {
    const response = await fetch(`${this.baseUrl}/checkouts`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Polar API error: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as PolarCheckout;
  }

  async getCheckout(checkoutId: string): Promise<PolarCheckout> {
    const response = await fetch(`${this.baseUrl}/checkouts/${checkoutId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Polar API error: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as PolarCheckout;
  }

  async getOrders(
    organizationId?: string,
    customerId?: string,
    productId?: string,
    limit = 50
  ): Promise<PolarOrder[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });

    if (organizationId) {
      params.append('organization_id', organizationId);
    }
    if (customerId) {
      params.append('customer_id', customerId);
    }
    if (productId) {
      params.append('product_id', productId);
    }

    const response = await fetch(`${this.baseUrl}/orders?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Polar API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { items: PolarOrder[] };
    return result.items;
  }

  async getBenefits(organizationId?: string, limit = 50): Promise<PolarBenefit[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });

    if (organizationId) {
      params.append('organization_id', organizationId);
    }

    const response = await fetch(`${this.baseUrl}/benefits?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Polar API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { items: PolarBenefit[] };
    return result.items;
  }

  async getOrganizations(): Promise<PolarOrganization[]> {
    const response = await fetch(`${this.baseUrl}/organizations`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Polar API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { items: PolarOrganization[] };
    return result.items;
  }
}

export const PolarConnectorConfig = mcpConnectorConfig({
  name: 'Polar',
  key: 'polar',
  version: '1.0.0',
  logo: 'https://polar.sh/favicon.ico',
  credentials: z.object({
    accessToken: z
      .string()
      .describe(
        'Polar Access Token from Settings > Access Tokens :: polar_at_...'
      ),
    server: z
      .enum(['production', 'sandbox'])
      .default('production')
      .describe('Polar server environment'),
  }),
  setup: z.object({}),
  examplePrompt:
    'List all products in my organization, search for customers by email, create a checkout for a product, and show active subscriptions.',
  tools: (tool) => ({
    LIST_PRODUCTS: tool({
      name: 'polar_list_products',
      description: 'List products with optional filtering',
      schema: z.object({
        organizationId: z.string().optional().describe('Organization ID to filter products'),
        isArchived: z.boolean().optional().describe('Filter by archived status'),
        limit: z.number().default(50).describe('Maximum number of products to return'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, server } = await context.getCredentials();
          const client = new PolarClient(accessToken, server);
          const products = await client.getProducts(
            args.organizationId,
            args.isArchived,
            args.limit
          );
          return JSON.stringify(products, null, 2);
        } catch (error) {
          return `Failed to list products: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_PRODUCT: tool({
      name: 'polar_get_product',
      description: 'Get detailed information about a specific product',
      schema: z.object({
        productId: z.string().describe('Product ID to retrieve'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, server } = await context.getCredentials();
          const client = new PolarClient(accessToken, server);
          const product = await client.getProduct(args.productId);
          return JSON.stringify(product, null, 2);
        } catch (error) {
          return `Failed to get product: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    SEARCH_PRODUCTS: tool({
      name: 'polar_search_products',
      description: 'Search through products using full-text search',
      schema: z.object({
        query: z.string().describe('Search query to find products'),
        organizationId: z.string().optional().describe('Organization ID to filter products'),
        limit: z.number().default(50).describe('Maximum number of products to return'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, server } = await context.getCredentials();
          const client = new PolarClient(accessToken, server);
          const products = await client.getProducts(args.organizationId, false, 200);
          
          const index = await createIndex(products, {
            fields: ['name', 'description'],
            maxResults: args.limit,
          });
          
          const results = await search(index, args.query);
          return JSON.stringify(
            results.map((r) => ({ ...r.item, search_score: r.score })),
            null,
            2
          );
        } catch (error) {
          return `Failed to search products: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_CUSTOMERS: tool({
      name: 'polar_list_customers',
      description: 'List customers with optional filtering',
      schema: z.object({
        organizationId: z.string().optional().describe('Organization ID to filter customers'),
        limit: z.number().default(50).describe('Maximum number of customers to return'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, server } = await context.getCredentials();
          const client = new PolarClient(accessToken, server);
          const customers = await client.getCustomers(args.organizationId, args.limit);
          return JSON.stringify(customers, null, 2);
        } catch (error) {
          return `Failed to list customers: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_CUSTOMER: tool({
      name: 'polar_get_customer',
      description: 'Get detailed information about a specific customer',
      schema: z.object({
        customerId: z.string().describe('Customer ID to retrieve'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, server } = await context.getCredentials();
          const client = new PolarClient(accessToken, server);
          const customer = await client.getCustomer(args.customerId);
          return JSON.stringify(customer, null, 2);
        } catch (error) {
          return `Failed to get customer: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    SEARCH_CUSTOMERS: tool({
      name: 'polar_search_customers',
      description: 'Search through customers using full-text search',
      schema: z.object({
        query: z.string().describe('Search query to find customers (name, email, etc.)'),
        organizationId: z.string().optional().describe('Organization ID to filter customers'),
        limit: z.number().default(50).describe('Maximum number of customers to return'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, server } = await context.getCredentials();
          const client = new PolarClient(accessToken, server);
          const customers = await client.getCustomers(args.organizationId, 200);
          
          const index = await createIndex(customers, {
            fields: ['name', 'email'],
            maxResults: args.limit,
          });
          
          const results = await search(index, args.query);
          return JSON.stringify(
            results.map((r) => ({ ...r.item, search_score: r.score })),
            null,
            2
          );
        } catch (error) {
          return `Failed to search customers: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    CREATE_CUSTOMER: tool({
      name: 'polar_create_customer',
      description: 'Create a new customer',
      schema: z.object({
        email: z.string().email().describe('Customer email address'),
        name: z.string().optional().describe('Customer name'),
        country: z.string().optional().describe('Billing address country'),
        line1: z.string().optional().describe('Billing address line 1'),
        line2: z.string().optional().describe('Billing address line 2'),
        postalCode: z.string().optional().describe('Billing address postal code'),
        state: z.string().optional().describe('Billing address state'),
        city: z.string().optional().describe('Billing address city'),
        metadata: z.record(z.string()).optional().describe('Custom metadata key-value pairs'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, server } = await context.getCredentials();
          const client = new PolarClient(accessToken, server);
          
          const billingAddress = args.country ? {
            country: args.country,
            line1: args.line1,
            line2: args.line2,
            postal_code: args.postalCode,
            state: args.state,
            city: args.city,
          } : undefined;
          
          const customer = await client.createCustomer({
            email: args.email,
            name: args.name,
            billing_address: billingAddress,
            metadata: args.metadata,
          });
          return JSON.stringify(customer, null, 2);
        } catch (error) {
          return `Failed to create customer: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_SUBSCRIPTIONS: tool({
      name: 'polar_list_subscriptions',
      description: 'List subscriptions with optional filtering',
      schema: z.object({
        organizationId: z.string().optional().describe('Organization ID to filter subscriptions'),
        customerId: z.string().optional().describe('Customer ID to filter subscriptions'),
        productId: z.string().optional().describe('Product ID to filter subscriptions'),
        active: z.boolean().optional().describe('Filter by active status'),
        limit: z.number().default(50).describe('Maximum number of subscriptions to return'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, server } = await context.getCredentials();
          const client = new PolarClient(accessToken, server);
          const subscriptions = await client.getSubscriptions(
            args.organizationId,
            args.customerId,
            args.productId,
            args.active,
            args.limit
          );
          return JSON.stringify(subscriptions, null, 2);
        } catch (error) {
          return `Failed to list subscriptions: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_SUBSCRIPTION: tool({
      name: 'polar_get_subscription',
      description: 'Get detailed information about a specific subscription',
      schema: z.object({
        subscriptionId: z.string().describe('Subscription ID to retrieve'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, server } = await context.getCredentials();
          const client = new PolarClient(accessToken, server);
          const subscription = await client.getSubscription(args.subscriptionId);
          return JSON.stringify(subscription, null, 2);
        } catch (error) {
          return `Failed to get subscription: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    CREATE_CHECKOUT: tool({
      name: 'polar_create_checkout',
      description: 'Create a new checkout session',
      schema: z.object({
        productId: z.string().optional().describe('Product ID to checkout'),
        productPriceId: z.string().optional().describe('Product price ID to checkout'),
        successUrl: z.string().optional().describe('URL to redirect after successful payment'),
        customerId: z.string().optional().describe('Customer ID'),
        customerEmail: z.string().optional().describe('Customer email'),
        customerName: z.string().optional().describe('Customer name'),
        allowDiscountCodes: z.boolean().optional().describe('Allow discount codes'),
        metadata: z.record(z.string()).optional().describe('Custom metadata key-value pairs'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, server } = await context.getCredentials();
          const client = new PolarClient(accessToken, server);
          const checkout = await client.createCheckout({
            product_id: args.productId,
            product_price_id: args.productPriceId,
            success_url: args.successUrl,
            customer_id: args.customerId,
            customer_email: args.customerEmail,
            customer_name: args.customerName,
            allow_discount_codes: args.allowDiscountCodes,
            metadata: args.metadata,
          });
          return JSON.stringify(checkout, null, 2);
        } catch (error) {
          return `Failed to create checkout: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_CHECKOUT: tool({
      name: 'polar_get_checkout',
      description: 'Get detailed information about a specific checkout',
      schema: z.object({
        checkoutId: z.string().describe('Checkout ID to retrieve'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, server } = await context.getCredentials();
          const client = new PolarClient(accessToken, server);
          const checkout = await client.getCheckout(args.checkoutId);
          return JSON.stringify(checkout, null, 2);
        } catch (error) {
          return `Failed to get checkout: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_ORDERS: tool({
      name: 'polar_list_orders',
      description: 'List orders with optional filtering',
      schema: z.object({
        organizationId: z.string().optional().describe('Organization ID to filter orders'),
        customerId: z.string().optional().describe('Customer ID to filter orders'),
        productId: z.string().optional().describe('Product ID to filter orders'),
        limit: z.number().default(50).describe('Maximum number of orders to return'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, server } = await context.getCredentials();
          const client = new PolarClient(accessToken, server);
          const orders = await client.getOrders(
            args.organizationId,
            args.customerId,
            args.productId,
            args.limit
          );
          return JSON.stringify(orders, null, 2);
        } catch (error) {
          return `Failed to list orders: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_BENEFITS: tool({
      name: 'polar_list_benefits',
      description: 'List benefits (license keys, downloads, etc.) with optional filtering',
      schema: z.object({
        organizationId: z.string().optional().describe('Organization ID to filter benefits'),
        limit: z.number().default(50).describe('Maximum number of benefits to return'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, server } = await context.getCredentials();
          const client = new PolarClient(accessToken, server);
          const benefits = await client.getBenefits(args.organizationId, args.limit);
          return JSON.stringify(benefits, null, 2);
        } catch (error) {
          return `Failed to list benefits: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_ORGANIZATIONS: tool({
      name: 'polar_list_organizations',
      description: 'List organizations you have access to',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { accessToken, server } = await context.getCredentials();
          const client = new PolarClient(accessToken, server);
          const organizations = await client.getOrganizations();
          return JSON.stringify(organizations, null, 2);
        } catch (error) {
          return `Failed to list organizations: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});
import { z } from 'zod';
import { mcpConnectorConfig } from '@stackone/mcp-config-types';

// Stripe API interfaces
interface StripeCustomer {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  created: number;
  livemode: boolean;
}

interface StripeSubscription {
  id: string;
  customer: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  created: number;
}

interface StripeInvoice {
  id: string;
  customer: string;
  amount_due: number;
  amount_paid: number;
  status: string;
  created: number;
}

interface StripeProduct {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  created: number;
}

interface StripePrice {
  id: string;
  product: string;
  unit_amount: number;
  currency: string;
  recurring?: {
    interval: string;
    interval_count: number;
  };
  created: number;
}

// Stripe API client
class StripeClient {
  private apiKey: string;
  private baseUrl = 'https://api.stripe.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async makeRequest(endpoint: string, method: 'GET' | 'POST' = 'GET', data?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2024-06-20'
    };

    const options: RequestInit = {
      method,
      headers
    };

    if (data && method === 'POST') {
      const formData = new URLSearchParams();
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      }
      options.body = formData;
    }

    const response = await fetch(url, options);
    
          if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as any;
        throw new Error(`Stripe API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
      }

    return response.json();
  }

  // Customer methods
  async createCustomer(email: string, name?: string, phone?: string): Promise<StripeCustomer> {
    const data: any = { email };
    if (name) data.name = name;
    if (phone) data.phone = phone;
    
    return this.makeRequest('/customers', 'POST', data);
  }

  async listCustomers(limit: number = 10): Promise<{ data: StripeCustomer[] }> {
    return this.makeRequest(`/customers?limit=${limit}`);
  }

  async getCustomer(customerId: string): Promise<StripeCustomer> {
    return this.makeRequest(`/customers/${customerId}`);
  }

  // Subscription methods
  async createSubscription(customerId: string, priceId: string): Promise<StripeSubscription> {
    return this.makeRequest('/subscriptions', 'POST', {
      customer: customerId,
      items: [{ price: priceId }]
    });
  }

  async listSubscriptions(limit: number = 10): Promise<{ data: StripeSubscription[] }> {
    return this.makeRequest(`/subscriptions?limit=${limit}`);
  }

  async cancelSubscription(subscriptionId: string): Promise<StripeSubscription> {
    return this.makeRequest(`/subscriptions/${subscriptionId}`, 'POST', { cancel_at_period_end: true });
  }

  // Invoice methods
  async createInvoice(customerId: string, amount: number, currency: string = 'usd'): Promise<StripeInvoice> {
    return this.makeRequest('/invoices', 'POST', {
      customer: customerId,
      collection_method: 'send_invoice',
      days_until_due: 30
    });
  }

  async listInvoices(limit: number = 10): Promise<{ data: StripeInvoice[] }> {
    return this.makeRequest(`/invoices?limit=${limit}`);
  }

  // Product methods
  async createProduct(name: string, description?: string): Promise<StripeProduct> {
    const data: any = { name };
    if (description) data.description = description;
    
    return this.makeRequest('/products', 'POST', data);
  }

  async listProducts(limit: number = 10): Promise<{ data: StripeProduct[] }> {
    return this.makeRequest(`/products?limit=${limit}`);
  }

  // Price methods
  async createPrice(productId: string, unitAmount: number, currency: string = 'usd', recurring?: { interval: string; intervalCount: number }): Promise<StripePrice> {
    const data: any = {
      product: productId,
      unit_amount: unitAmount,
      currency
    };
    
    if (recurring) {
      data.recurring = {
        interval: recurring.interval,
        interval_count: recurring.intervalCount
      };
    }
    
    return this.makeRequest('/prices', 'POST', data);
  }

  async listPrices(limit: number = 10): Promise<{ data: StripePrice[] }> {
    return this.makeRequest(`/prices?limit=${limit}`);
  }

  // Payment methods
  async listPaymentIntents(limit: number = 10): Promise<any> {
    return this.makeRequest(`/payment_intents?limit=${limit}`);
  }

  // Coupon methods
  async createCoupon(percentOff: number, duration: string = 'once'): Promise<any> {
    return this.makeRequest('/coupons', 'POST', {
      percent_off: percentOff,
      duration
    });
  }

  async listCoupons(limit: number = 10): Promise<any> {
    return this.makeRequest(`/coupons?limit=${limit}`);
  }

  // Account methods
  async getAccountInfo(): Promise<any> {
    return this.makeRequest('/account');
  }

  async getBalance(): Promise<any> {
    return this.makeRequest('/balance');
  }

  // Dispute methods
  async listDisputes(limit: number = 10): Promise<any> {
    return this.makeRequest(`/disputes?limit=${limit}`);
  }

  async updateDispute(disputeId: string, evidence: any): Promise<any> {
    return this.makeRequest(`/disputes/${disputeId}`, 'POST', evidence);
  }

  // Payment link methods
  async createPaymentLink(priceId: string, quantity: number = 1): Promise<any> {
    return this.makeRequest('/payment_links', 'POST', {
      line_items: [{ price: priceId, quantity }]
    });
  }

  // Refund methods
  async createRefund(paymentIntentId: string, amount?: number): Promise<any> {
    const data: any = { payment_intent: paymentIntentId };
    if (amount) data.amount = amount;
    
    return this.makeRequest('/refunds', 'POST', data);
  }
}

// Stripe connector configuration
export const StripeConnectorConfig = mcpConnectorConfig({
  name: 'stripe',
  description: 'Connect to Stripe for payment processing, customer management, and financial operations',
  credentials: {
    apiKey: {
      type: 'string',
      description: 'Your Stripe API key (starts with sk_test_ or sk_live_)',
      required: true,
      secret: true,
      pattern: '^sk_(test|live)_[a-zA-Z0-9]{24}$',
      placeholder: 'sk_test_...',
      help: 'Get your API key from the Stripe Dashboard under Developers > API keys'
    }
  },
  setup: {
    baseUrl: {
      type: 'string',
      description: 'Stripe API base URL (usually https://api.stripe.com)',
      required: false,
      default: 'https://api.stripe.com',
      pattern: '^https://api\\.stripe\\.com$',
      help: 'Leave as default unless you have a custom Stripe endpoint'
    }
  },
  tools: (tool) => ({
    CREATE_CUSTOMER: tool({
      name: 'create_customer',
      description: 'Create a new customer in Stripe',
      schema: z.object({
        email: z.string().email('Valid email is required'),
        name: z.string().optional().describe('Customer full name'),
        phone: z.string().optional().describe('Customer phone number')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const setup = await context.getSetup();
        
        const client = new StripeClient(credentials.apiKey);
        const customer = await client.createCustomer(args.email, args.name, args.phone);
        
        return JSON.stringify({
          success: true,
          customer: {
            id: customer.id,
            email: customer.email,
            name: customer.name,
            phone: customer.phone,
            created: new Date(customer.created * 1000).toISOString()
          }
        });
      }
    }),

    LIST_CUSTOMERS: tool({
      name: 'list_customers',
      description: 'List customers from Stripe',
      schema: z.object({
        limit: z.number().min(1).max(100).default(10).describe('Number of customers to return (max 100)')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new StripeClient(credentials.apiKey);
        const result = await client.listCustomers(args.limit);
        
        return JSON.stringify({
          success: true,
          customers: result.data.map(customer => ({
            id: customer.id,
            email: customer.email,
            name: customer.name,
            phone: customer.phone,
            created: new Date(customer.created * 1000).toISOString()
          })),
          total: result.data.length
        });
      }
    }),

    GET_CUSTOMER: tool({
      name: 'get_customer',
      description: 'Get a specific customer by ID',
      schema: z.object({
        customerId: z.string().describe('Stripe customer ID')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new StripeClient(credentials.apiKey);
        const customer = await client.getCustomer(args.customerId);
        
        return JSON.stringify({
          success: true,
          customer: {
            id: customer.id,
            email: customer.email,
            name: customer.name,
            phone: customer.phone,
            created: new Date(customer.created * 1000).toISOString()
          }
        });
      }
    }),

    CREATE_SUBSCRIPTION: tool({
      name: 'create_subscription',
      title: 'Create Subscription',
      description: 'Create a new subscription for a customer',
      inputSchema: z.object({
        customerId: z.string().describe('Stripe customer ID'),
        priceId: z.string().describe('Stripe price ID for the subscription')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new StripeClient(credentials.apiKey);
        const subscription = await client.createSubscription(args.customerId, args.priceId);
        
        return JSON.stringify({
          success: true,
          subscription: {
            id: subscription.id,
            customerId: subscription.customer,
            status: subscription.status,
            currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            created: new Date(subscription.created * 1000).toISOString()
          }
        });
      }
    }),

    LIST_SUBSCRIPTIONS: tool({
      name: 'list_subscriptions',
      title: 'List Subscriptions',
      description: 'List subscriptions from Stripe',
      inputSchema: z.object({
        limit: z.number().min(1).max(100).default(10).describe('Number of subscriptions to return (max 100)')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new StripeClient(credentials.apiKey);
        const result = await client.listSubscriptions(args.limit);
        
        return JSON.stringify({
          success: true,
          subscriptions: result.data.map(subscription => ({
            id: subscription.id,
            customerId: subscription.customer,
            status: subscription.status,
            currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            created: new Date(subscription.created * 1000).toISOString()
          })),
          total: result.data.length
        });
      }
    }),

    CANCEL_SUBSCRIPTION: tool({
      name: 'cancel_subscription',
      title: 'Cancel Subscription',
      description: 'Cancel a subscription at the end of the current period',
      inputSchema: z.object({
        subscriptionId: z.string().describe('Stripe subscription ID')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new StripeClient(credentials.apiKey);
        const subscription = await client.cancelSubscription(args.subscriptionId);
        
        return JSON.stringify({
          success: true,
          message: 'Subscription will be cancelled at the end of the current period',
          subscription: {
            id: subscription.id,
            status: subscription.status
          }
        });
      }
    }),

    CREATE_INVOICE: tool({
      name: 'create_invoice',
      title: 'Create Invoice',
      description: 'Create a new invoice for a customer',
      inputSchema: z.object({
        customerId: z.string().describe('Stripe customer ID'),
        amount: z.number().positive().describe('Invoice amount in cents'),
        currency: z.string().default('usd').describe('Currency code (default: usd)')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new StripeClient(credentials.apiKey);
        const invoice = await client.createInvoice(args.customerId, args.amount, args.currency);
        
        return JSON.stringify({
          success: true,
          invoice: {
            id: invoice.id,
            customerId: invoice.customer,
            amountDue: invoice.amount_due,
            amountPaid: invoice.amount_paid,
            status: invoice.status,
            created: new Date(invoice.created * 1000).toISOString()
          }
        });
      }
    }),

    LIST_INVOICES: tool({
      name: 'list_invoices',
      title: 'List Invoices',
      description: 'List invoices from Stripe',
      inputSchema: z.object({
        limit: z.number().min(1).max(100).default(10).describe('Number of invoices to return (max 100)')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new StripeClient(credentials.apiKey);
        const result = await client.listInvoices(args.limit);
        
        return JSON.stringify({
          success: true,
          invoices: result.data.map(invoice => ({
            id: invoice.id,
            customerId: invoice.customer,
            amountDue: invoice.amount_due,
            amountPaid: invoice.amount_paid,
            status: invoice.status,
            created: new Date(invoice.created * 1000).toISOString()
          })),
          total: result.data.length
        });
      }
    }),

    CREATE_PRODUCT: tool({
      name: 'create_product',
      title: 'Create Product',
      description: 'Create a new product in Stripe',
      inputSchema: z.object({
        name: z.string().min(1).describe('Product name'),
        description: z.string().optional().describe('Product description')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new StripeClient(credentials.apiKey);
        const product = await client.createProduct(args.name, args.description);
        
        return JSON.stringify({
          success: true,
          product: {
            id: product.id,
            name: product.name,
            description: product.description,
            active: product.active,
            created: new Date(product.created * 1000).toISOString()
          }
        });
      }
    }),

    LIST_PRODUCTS: tool({
      name: 'list_products',
      title: 'List Products',
      description: 'List products from Stripe',
      inputSchema: z.object({
        limit: z.number().min(1).max(100).default(10).describe('Number of products to return (max 100)')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new StripeClient(credentials.apiKey);
        const result = await client.listProducts(args.limit);
        
        return JSON.stringify({
          success: true,
          products: result.data.map(product => ({
            id: product.id,
            name: product.name,
            description: product.description,
            active: product.active,
            created: new Date(product.created * 1000).toISOString()
          })),
          total: result.data.length
        });
      }
    }),

    CREATE_PRICE: tool({
      name: 'create_price',
      title: 'Create Price',
      description: 'Create a new price for a product',
      inputSchema: z.object({
        productId: z.string().describe('Stripe product ID'),
        unitAmount: z.number().positive().describe('Price amount in cents'),
        currency: z.string().default('usd').describe('Currency code (default: usd)'),
        recurring: z.object({
          interval: z.enum(['day', 'week', 'month', 'year']).describe('Recurring interval'),
          intervalCount: z.number().positive().describe('Number of intervals')
        }).optional().describe('Recurring billing configuration')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new StripeClient(credentials.apiKey);
        const price = await client.createPrice(
          args.productId, 
          args.unitAmount, 
          args.currency,
          args.recurring ? {
            interval: args.recurring.interval,
            intervalCount: args.recurring.intervalCount
          } : undefined
        );
        
        return JSON.stringify({
          success: true,
          price: {
            id: price.id,
            productId: price.product,
            unitAmount: price.unit_amount,
            currency: price.currency,
            recurring: price.recurring,
            created: new Date(price.created * 1000).toISOString()
          }
        });
      }
    }),

    LIST_PRICES: tool({
      name: 'list_prices',
      title: 'List Prices',
      description: 'List prices from Stripe',
      inputSchema: z.object({
        limit: z.number().min(1).max(100).default(10).describe('Number of prices to return (max 100)')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new StripeClient(credentials.apiKey);
        const result = await client.listPrices(args.limit);
        
        return JSON.stringify({
          success: true,
          prices: result.data.map(price => ({
            id: price.id,
            productId: price.product,
            unitAmount: price.unit_amount,
            currency: price.currency,
            recurring: price.recurring,
            created: new Date(price.created * 1000).toISOString()
          })),
          total: result.data.length
        });
      }
    }),

    LIST_PAYMENT_INTENTS: tool({
      name: 'list_payment_intents',
      title: 'List Payment Intents',
      description: 'List payment intents from Stripe',
      inputSchema: z.object({
        limit: z.number().min(1).max(100).default(10).describe('Number of payment intents to return (max 100)')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new StripeClient(credentials.apiKey);
        const result = await client.listPaymentIntents(args.limit);
        
        return JSON.stringify({
          success: true,
          paymentIntents: result.data,
          total: result.data.length
        });
      }
    }),

    CREATE_PAYMENT_LINK: tool({
      name: 'create_payment_link',
      title: 'Create Payment Link',
      description: 'Create a payment link for a price',
      inputSchema: z.object({
        priceId: z.string().describe('Stripe price ID'),
        quantity: z.number().positive().default(1).describe('Quantity of items')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new StripeClient(credentials.apiKey);
        const paymentLink = await client.createPaymentLink(args.priceId, args.quantity);
        
        return JSON.stringify({
          success: true,
          paymentLink: {
            id: paymentLink.id,
            url: paymentLink.url,
            active: paymentLink.active
          }
        });
      }
    }),

    CREATE_COUPON: tool({
      name: 'create_coupon',
      title: 'Create Coupon',
      description: 'Create a new coupon in Stripe',
      inputSchema: z.object({
        percentOff: z.number().min(1).max(100).describe('Percentage discount (1-100)'),
        duration: z.enum(['once', 'repeating', 'forever']).default('once').describe('Coupon duration')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new StripeClient(credentials.apiKey);
        const coupon = await client.createCoupon(args.percentOff, args.duration);
        
        return JSON.stringify({
          success: true,
          coupon: {
            id: coupon.id,
            percentOff: coupon.percent_off,
            duration: coupon.duration,
            valid: coupon.valid
          }
        });
      }
    }),

    LIST_COUPONS: tool({
      name: 'list_coupons',
      title: 'List Coupons',
      description: 'List coupons from Stripe',
      inputSchema: z.object({
        limit: z.number().min(1).max(100).default(10).describe('Number of coupons to return (max 100)')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new StripeClient(credentials.apiKey);
        const result = await client.listCoupons(args.limit);
        
        return JSON.stringify({
          success: true,
          coupons: result.data,
          total: result.data.length
        });
      }
    }),

    GET_ACCOUNT_INFO: tool({
      name: 'get_account_info',
      title: 'Get Account Info',
      description: 'Get information about the connected Stripe account',
      inputSchema: z.object({}),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new StripeClient(credentials.apiKey);
        const account = await client.getAccountInfo();
        
        return JSON.stringify({
          success: true,
          account: {
            id: account.id,
            businessType: account.business_type,
            country: account.country,
            defaultCurrency: account.default_currency,
            email: account.email,
            name: account.business_profile?.name
          }
        });
      }
    }),

    GET_BALANCE: tool({
      name: 'get_balance',
      title: 'Get Balance',
      description: 'Get the current balance of the Stripe account',
      inputSchema: z.object({}),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new StripeClient(credentials.apiKey);
        const balance = await client.getBalance();
        
        return JSON.stringify({
          success: true,
          balance: {
            available: balance.available,
            pending: balance.pending,
            instantAvailable: balance.instant_available
          }
        });
      }
    }),

    LIST_DISPUTES: tool({
      name: 'list_disputes',
      title: 'List Disputes',
      description: 'List disputes from Stripe',
      inputSchema: z.object({
        limit: z.number().min(1).max(100).default(10).describe('Number of disputes to return (max 100)')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new StripeClient(credentials.apiKey);
        const result = await client.listDisputes(args.limit);
        
        return JSON.stringify({
          success: true,
          disputes: result.data,
          total: result.data.length
        });
      }
    }),

    UPDATE_DISPUTE: tool({
      name: 'update_dispute',
      title: 'Update Dispute',
      description: 'Update a dispute with evidence',
      inputSchema: z.object({
        disputeId: z.string().describe('Stripe dispute ID'),
        evidence: z.record(z.any()).describe('Evidence to submit for the dispute')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new StripeClient(credentials.apiKey);
        const dispute = await client.updateDispute(args.disputeId, args.evidence);
        
        return JSON.stringify({
          success: true,
          dispute: {
            id: dispute.id,
            status: dispute.status,
            evidence: dispute.evidence
          }
        });
      }
    }),

    CREATE_REFUND: tool({
      name: 'create_refund',
      title: 'Create Refund',
      description: 'Create a refund for a payment intent',
      inputSchema: z.object({
        paymentIntentId: z.string().describe('Stripe payment intent ID'),
        amount: z.number().positive().optional().describe('Refund amount in cents (optional, defaults to full amount)')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new StripeClient(credentials.apiKey);
        const refund = await client.createRefund(args.paymentIntentId, args.amount);
        
        return JSON.stringify({
          success: true,
          refund: {
            id: refund.id,
            amount: refund.amount,
            currency: refund.currency,
            status: refund.status,
            reason: refund.reason
          }
        });
      }
    })
  }),
  resources: (resource) => ({
    CUSTOMERS: resource({
      name: 'customers',
      title: 'Customers',
      description: 'Stripe customer data',
      schema: z.object({
        id: z.string(),
        email: z.string(),
        name: z.string().optional(),
        phone: z.string().optional(),
        created: z.string()
      }),
      handler: async (context) => {
        const credentials = await context.getCredentials();
        const client = new StripeClient(credentials.apiKey);
        const result = await client.listCustomers(100);
        
        return result.data.map(customer => ({
          id: customer.id,
          email: customer.email,
          name: customer.name,
          phone: customer.phone,
          created: new Date(customer.created * 1000).toISOString()
        }));
      }
    }),

    SUBSCRIPTIONS: resource({
      name: 'subscriptions',
      title: 'Subscriptions',
      description: 'Stripe subscription data',
      schema: z.object({
        id: z.string(),
        customerId: z.string(),
        status: z.string(),
        currentPeriodStart: z.string(),
        currentPeriodEnd: z.string(),
        created: z.string()
      }),
      handler: async (context) => {
        const credentials = await context.getCredentials();
        const client = new StripeClient(credentials.apiKey);
        const result = await client.listSubscriptions(100);
        
        return result.data.map(subscription => ({
          id: subscription.id,
          customerId: subscription.customer,
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
          created: new Date(subscription.created * 1000).toISOString()
        }));
      }
    }),

    PRODUCTS: resource({
      name: 'products',
      title: 'Products',
      description: 'Stripe product data',
      schema: z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional(),
        active: z.boolean(),
        created: z.string()
      }),
      handler: async (context) => {
        const credentials = await context.getCredentials();
        const client = new StripeClient(credentials.apiKey);
        const result = await client.listProducts(100);
        
        return result.data.map(product => ({
          id: product.id,
          name: product.name,
          description: product.description,
          active: product.active,
          created: new Date(product.created * 1000).toISOString()
        }));
      }
    }),

    PRICES: resource({
      name: 'prices',
      title: 'Prices',
      description: 'Stripe price data',
      schema: z.object({
        id: z.string(),
        productId: z.string(),
        unitAmount: z.number(),
        currency: z.string(),
        recurring: z.any().optional(),
        created: z.string()
      }),
      handler: async (context) => {
        const credentials = await context.getCredentials();
        const client = new StripeClient(credentials.apiKey);
        const result = await client.listPrices(100);
        
        return result.data.map(price => ({
          id: price.id,
          productId: price.product,
          unitAmount: price.unit_amount,
          currency: price.currency,
          recurring: price.recurring,
          created: new Date(price.created * 1000).toISOString()
        }));
      }
    }),

    INVOICES: resource({
      name: 'invoices',
      title: 'Invoices',
      description: 'Stripe invoice data',
      schema: z.object({
        id: z.string(),
        customerId: z.string(),
        amountDue: z.number(),
        amountPaid: z.number(),
        status: z.string(),
        created: z.string()
      }),
      handler: async (context) => {
        const credentials = await context.getCredentials();
        const client = new StripeClient(credentials.apiKey);
        const result = await client.listInvoices(100);
        
        return result.data.map(invoice => ({
          id: invoice.id,
          customerId: invoice.customer,
          amountDue: invoice.amount_due,
          amountPaid: invoice.amount_paid,
          status: invoice.status,
          created: new Date(invoice.created * 1000).toISOString()
        }));
      }
    })
  })
});

import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { AutumnConnectorConfig } from './autumn';

const mockBaseUrl = 'https://api.useautumn.com/v1';

const server = setupServer(
  http.get(`${mockBaseUrl}/customers/test-customer`, () => {
    return HttpResponse.json({
      autumn_id: 'cus_2w5dzidzFD1cESxOGnn9frVuVcm',
      created_at: 1677649423000,
      env: 'production',
      id: 'test-customer',
      name: 'John Doe',
      email: 'john@example.com',
      stripe_id: 'cus_abc123',
      products: [
        {
          id: 'pro',
          name: 'Pro Plan',
          status: 'active',
        },
      ],
      features: [
        {
          feature_id: 'api_calls',
          unlimited: false,
          balance: 1000,
          usage: 100,
        },
      ],
    });
  }),

  http.get(`${mockBaseUrl}/customers/not-found`, () => {
    return HttpResponse.json({ error: 'Customer not found' }, { status: 404 });
  }),

  http.post(`${mockBaseUrl}/customers`, async ({ request }) => {
    const body = (await request.json()) as { id: string; name: string; email: string };
    return HttpResponse.json({
      autumn_id: 'cus_new123',
      created_at: Date.now(),
      env: 'production',
      id: body.id,
      name: body.name,
      email: body.email,
      products: [],
      features: [],
    });
  }),

  http.post(`${mockBaseUrl}/attach`, async ({ request }) => {
    const body = (await request.json()) as { product_id: string };
    if (body.product_id === 'requires-payment') {
      return HttpResponse.json({
        success: true,
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      });
    }
    return HttpResponse.json({
      success: true,
      message: 'Product attached successfully',
    });
  }),

  http.post(`${mockBaseUrl}/check`, async ({ request }) => {
    const body = (await request.json()) as { feature_id: string };
    if (body.feature_id === 'premium_feature') {
      return HttpResponse.json({
        access: false,
        feature_id: 'premium_feature',
        balance: 0,
        usage: 0,
        unlimited: false,
      });
    }
    return HttpResponse.json({
      access: true,
      feature_id: body.feature_id,
      balance: 900,
      usage: 100,
      unlimited: false,
    });
  }),

  http.post(`${mockBaseUrl}/track`, async ({ request }) => {
    await request.json();
    return HttpResponse.json({
      success: true,
      message: 'Usage tracked successfully',
      new_balance: 890,
      new_usage: 110,
    });
  }),

  http.get(`${mockBaseUrl}/products`, () => {
    return HttpResponse.json([
      {
        id: 'basic',
        name: 'Basic Plan',
        price: 9.99,
      },
      {
        id: 'pro',
        name: 'Pro Plan',
        price: 29.99,
      },
    ]);
  }),

  http.post(`${mockBaseUrl}/billing-portal`, async ({ request }) => {
    await request.json();
    return HttpResponse.json({
      url: 'https://billing.stripe.com/session/abc123',
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('#AutumnConnector', () => {
  describe('.GET_CUSTOMER', () => {
    describe('when customer exists', () => {
      it('returns customer information', async () => {
        const tool = AutumnConnectorConfig.tools.GET_CUSTOMER as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiKey: 'test-api-key' },
          setup: { baseUrl: mockBaseUrl },
        });

        const actual = await tool.handler({ customer_id: 'test-customer' }, mockContext);

        const response = JSON.parse(actual);
        expect(response.id).toBe('test-customer');
        expect(response.name).toBe('John Doe');
        expect(response.email).toBe('john@example.com');
        expect(response.products).toHaveLength(1);
        expect(response.features).toHaveLength(1);
      });
    });

    describe('when customer does not exist', () => {
      it('throws an error', async () => {
        const tool = AutumnConnectorConfig.tools.GET_CUSTOMER as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiKey: 'test-api-key' },
          setup: { baseUrl: mockBaseUrl },
        });

        await expect(
          tool.handler({ customer_id: 'not-found' }, mockContext)
        ).rejects.toThrow('Autumn API error: 404 Not Found');
      });
    });
  });

  describe('.CREATE_CUSTOMER', () => {
    describe('when valid customer data is provided', () => {
      it('creates and returns new customer', async () => {
        const tool = AutumnConnectorConfig.tools.CREATE_CUSTOMER as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiKey: 'test-api-key' },
          setup: { baseUrl: mockBaseUrl },
        });

        const actual = await tool.handler(
          {
            customer_id: 'new-customer',
            name: 'Jane Smith',
            email: 'jane@example.com',
          },
          mockContext
        );

        expect(actual).toContain('Customer created successfully');
        expect(actual).toContain('new-customer');
        expect(actual).toContain('Jane Smith');
      });
    });
  });

  describe('.ATTACH_PRODUCT', () => {
    describe('when product requires payment', () => {
      it('returns checkout URL', async () => {
        const tool = AutumnConnectorConfig.tools.ATTACH_PRODUCT as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiKey: 'test-api-key' },
          setup: { baseUrl: mockBaseUrl },
        });

        const actual = await tool.handler(
          {
            customer_id: 'test-customer',
            product_id: 'requires-payment',
          },
          mockContext
        );

        expect(actual).toContain('Payment URL generated');
        expect(actual).toContain('https://checkout.stripe.com');
      });
    });

    describe('when product can be attached directly', () => {
      it('attaches product successfully', async () => {
        const tool = AutumnConnectorConfig.tools.ATTACH_PRODUCT as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiKey: 'test-api-key' },
          setup: { baseUrl: mockBaseUrl },
        });

        const actual = await tool.handler(
          {
            customer_id: 'test-customer',
            product_id: 'free-product',
          },
          mockContext
        );

        expect(actual).toContain('Product attached successfully');
      });
    });
  });

  describe('.CHECK_ACCESS', () => {
    describe('when customer has access to feature', () => {
      it('returns access granted with usage info', async () => {
        const tool = AutumnConnectorConfig.tools.CHECK_ACCESS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiKey: 'test-api-key' },
          setup: { baseUrl: mockBaseUrl },
        });

        const actual = await tool.handler(
          {
            customer_id: 'test-customer',
            feature_id: 'api_calls',
          },
          mockContext
        );

        expect(actual).toContain('Access: Granted');
        expect(actual).toContain('Balance: 900');
        expect(actual).toContain('Usage: 100');
      });
    });

    describe('when customer does not have access to feature', () => {
      it('returns access denied', async () => {
        const tool = AutumnConnectorConfig.tools.CHECK_ACCESS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiKey: 'test-api-key' },
          setup: { baseUrl: mockBaseUrl },
        });

        const actual = await tool.handler(
          {
            customer_id: 'test-customer',
            feature_id: 'premium_feature',
          },
          mockContext
        );

        expect(actual).toContain('Access: Denied');
        expect(actual).toContain('Balance: 0');
      });
    });
  });

  describe('.TRACK_USAGE', () => {
    describe('when tracking usage for a feature', () => {
      it('successfully tracks usage and returns updated balances', async () => {
        const tool = AutumnConnectorConfig.tools.TRACK_USAGE as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiKey: 'test-api-key' },
          setup: { baseUrl: mockBaseUrl },
        });

        const actual = await tool.handler(
          {
            customer_id: 'test-customer',
            feature_id: 'api_calls',
            value: 10,
          },
          mockContext
        );

        expect(actual).toContain('Usage tracked successfully');
        expect(actual).toContain('Feature: api_calls');
        expect(actual).toContain('Value: 10');
        expect(actual).toContain('New Balance: 890');
        expect(actual).toContain('New Usage: 110');
      });
    });
  });

  describe('.LIST_PRODUCTS', () => {
    describe('when requesting product list', () => {
      it('returns all available products', async () => {
        const tool = AutumnConnectorConfig.tools.LIST_PRODUCTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiKey: 'test-api-key' },
          setup: { baseUrl: mockBaseUrl },
        });

        const actual = await tool.handler({}, mockContext);

        const products = JSON.parse(actual);
        expect(Array.isArray(products)).toBe(true);
        expect(products).toHaveLength(2);
        expect(products[0].id).toBe('basic');
        expect(products[1].id).toBe('pro');
      });
    });
  });

  describe('.GET_BILLING_PORTAL', () => {
    describe('when generating billing portal URL', () => {
      it('returns portal URL', async () => {
        const tool = AutumnConnectorConfig.tools.GET_BILLING_PORTAL as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { apiKey: 'test-api-key' },
          setup: { baseUrl: mockBaseUrl },
        });

        const actual = await tool.handler(
          {
            customer_id: 'test-customer',
            return_url: 'https://example.com/dashboard',
          },
          mockContext
        );

        expect(actual).toContain('Billing portal URL:');
        expect(actual).toContain('https://billing.stripe.com');
      });
    });
  });
});

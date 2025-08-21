import { describe, expect, it } from "vitest";
import type { MCPToolDefinition } from "@stackone/mcp-config-types";
import { createMockConnectorContext } from "../__mocks__/context";
import { PolarConnectorConfig } from "./polar";

describe("#PolarConnector", () => {
  describe(".LIST_PRODUCTS", () => {
    describe("when valid credentials are provided", () => {
      describe("and no filters are specified", () => {
        it("returns list of products", async () => {
          const tool = PolarConnectorConfig.tools.LIST_PRODUCTS as MCPToolDefinition;
          const mockContext = createMockConnectorContext();
          (mockContext.getCredentials as any).mockResolvedValue({
            accessToken: "polar_at_test_token",
            server: "sandbox" as const,
          });

          global.fetch = (() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              items: [
                {
                  id: "prod_123",
                  name: "Test Product",
                  description: "A test product",
                  is_archived: false,
                  is_highlighted: false,
                  is_recurring: false,
                  type: "digital",
                  prices: [],
                  benefits: [],
                  medias: [],
                  organization_id: "org_123",
                  created_at: "2025-01-01T00:00:00Z",
                }
              ]
            }),
          })) as any;

          const actual = await tool.handler({}, mockContext);

          expect(actual).toContain("Test Product");
          expect(actual).toContain("prod_123");
        });
      });

      describe("and organization filter is specified", () => {
        it("returns filtered products", async () => {
          const tool = PolarConnectorConfig.tools.LIST_PRODUCTS as MCPToolDefinition;
          const mockContext = createMockConnectorContext();
          (mockContext.getCredentials as any).mockResolvedValue({
            accessToken: "polar_at_test_token",
            server: "production" as const,
          });

          global.fetch = (() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ items: [] }),
          })) as any;

          const actual = await tool.handler({ organizationId: "org_456" }, mockContext);

          expect(actual).toBe("[]");
        });
      });
    });

    describe("when API returns error", () => {
      it("returns error message", async () => {
        const tool = PolarConnectorConfig.tools.LIST_PRODUCTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as any).mockResolvedValue({
          accessToken: "polar_at_test_token",
          server: "sandbox" as const,
        });

        global.fetch = (() => Promise.resolve({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
        })) as any;

        const actual = await tool.handler({}, mockContext);

        expect(actual).toContain("Failed to list products");
        expect(actual).toContain("401 Unauthorized");
      });
    });
  });

  describe(".GET_PRODUCT", () => {
    describe("when valid product ID is provided", () => {
      it("returns product details", async () => {
        const tool = PolarConnectorConfig.tools.GET_PRODUCT as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as any).mockResolvedValue({
          accessToken: "polar_at_test_token",
          server: "sandbox" as const,
        });

        global.fetch = (() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: "prod_123",
            name: "Test Product",
            description: "A detailed test product",
            is_archived: false,
            is_highlighted: true,
            is_recurring: true,
            type: "saas",
            prices: [
              {
                id: "price_123",
                type: "recurring",
                amount_currency: "USD",
                amount_type: "fixed",
                price_amount: 2999,
                price_currency: "USD",
                recurring_interval: "month",
              }
            ],
            benefits: [],
            medias: [],
            organization_id: "org_123",
            created_at: "2025-01-01T00:00:00Z",
          }),
        })) as any;

        const actual = await tool.handler({ productId: "prod_123" }, mockContext);

        expect(actual).toContain("Test Product");
        expect(actual).toContain("prod_123");
        expect(actual).toContain("saas");
      });
    });

    describe("when product is not found", () => {
      it("returns error message", async () => {
        const tool = PolarConnectorConfig.tools.GET_PRODUCT as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as any).mockResolvedValue({
          accessToken: "polar_at_test_token",
          server: "sandbox" as const,
        });

        global.fetch = (() => Promise.resolve({
          ok: false,
          status: 404,
          statusText: "Not Found",
        })) as any;

        const actual = await tool.handler({ productId: "invalid_id" }, mockContext);

        expect(actual).toContain("Failed to get product");
        expect(actual).toContain("404 Not Found");
      });
    });
  });

  describe(".SEARCH_PRODUCTS", () => {
    describe("when search query is provided", () => {
      it("returns filtered products with search scores", async () => {
        const tool = PolarConnectorConfig.tools.SEARCH_PRODUCTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as any).mockResolvedValue({
          accessToken: "polar_at_test_token",
          server: "sandbox" as const,
        });

        global.fetch = (() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            items: [
              {
                id: "prod_123",
                name: "Premium Software License",
                description: "Advanced software with premium features",
                is_archived: false,
                is_highlighted: false,
                is_recurring: false,
                type: "digital",
                prices: [],
                benefits: [],
                medias: [],
                organization_id: "org_123",
                created_at: "2025-01-01T00:00:00Z",
              },
              {
                id: "prod_456",
                name: "Basic Plan",
                description: "Basic subscription plan",
                is_archived: false,
                is_highlighted: false,
                is_recurring: true,
                type: "saas",
                prices: [],
                benefits: [],
                medias: [],
                organization_id: "org_123",
                created_at: "2025-01-01T00:00:00Z",
              }
            ]
          }),
        })) as any;

        const actual = await tool.handler({ query: "premium" }, mockContext);

        expect(actual).toContain("search_score");
        expect(actual).toContain("Premium Software License");
      });
    });

    describe("when no products match search", () => {
      it("returns empty results", async () => {
        const tool = PolarConnectorConfig.tools.SEARCH_PRODUCTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as any).mockResolvedValue({
          accessToken: "polar_at_test_token",
          server: "sandbox" as const,
        });

        global.fetch = (() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: [] }),
        })) as any;

        const actual = await tool.handler({ query: "nonexistent" }, mockContext);

        expect(actual).toBe("[]");
      });
    });
  });

  describe(".LIST_CUSTOMERS", () => {
    describe("when valid credentials are provided", () => {
      it("returns list of customers", async () => {
        const tool = PolarConnectorConfig.tools.LIST_CUSTOMERS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as any).mockResolvedValue({
          accessToken: "polar_at_test_token",
          server: "sandbox" as const,
        });

        global.fetch = (() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            items: [
              {
                id: "cust_123",
                email: "test@example.com",
                email_verified: true,
                name: "Test Customer",
                organization_id: "org_123",
                metadata: {},
                created_at: "2025-01-01T00:00:00Z",
              }
            ]
          }),
        })) as any;

        const actual = await tool.handler({}, mockContext);

        expect(actual).toContain("Test Customer");
        expect(actual).toContain("test@example.com");
        expect(actual).toContain("cust_123");
      });
    });
  });

  describe(".CREATE_CUSTOMER", () => {
    describe("when valid customer data is provided", () => {
      it("creates and returns new customer", async () => {
        const tool = PolarConnectorConfig.tools.CREATE_CUSTOMER as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as any).mockResolvedValue({
          accessToken: "polar_at_test_token",
          server: "sandbox" as const,
        });

        global.fetch = (() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: "cust_new",
            email: "newcustomer@example.com",
            email_verified: false,
            name: "New Customer",
            organization_id: "org_123",
            metadata: { source: "api" },
            created_at: "2025-01-01T00:00:00Z",
          }),
        })) as any;

        const actual = await tool.handler({
          email: "newcustomer@example.com",
          name: "New Customer",
          metadata: { source: "api" }
        }, mockContext);

        expect(actual).toContain("New Customer");
        expect(actual).toContain("newcustomer@example.com");
        expect(actual).toContain("cust_new");
      });
    });

    describe("when email is invalid", () => {
      it("returns error message", async () => {
        const tool = PolarConnectorConfig.tools.CREATE_CUSTOMER as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as any).mockResolvedValue({
          accessToken: "polar_at_test_token",
          server: "sandbox" as const,
        });

        global.fetch = (() => Promise.resolve({
          ok: false,
          status: 400,
          statusText: "Bad Request",
        })) as any;

        const actual = await tool.handler({
          email: "invalid-email"
        }, mockContext);

        expect(actual).toContain("Failed to create customer");
        expect(actual).toContain("400 Bad Request");
      });
    });
  });

  describe(".LIST_SUBSCRIPTIONS", () => {
    describe("when filtering by active status", () => {
      it("returns active subscriptions", async () => {
        const tool = PolarConnectorConfig.tools.LIST_SUBSCRIPTIONS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as any).mockResolvedValue({
          accessToken: "polar_at_test_token",
          server: "sandbox" as const,
        });

        global.fetch = (() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            items: [
              {
                id: "sub_123",
                status: "active",
                current_period_start: "2025-01-01T00:00:00Z",
                current_period_end: "2025-02-01T00:00:00Z",
                cancel_at_period_end: false,
                customer_id: "cust_123",
                product_id: "prod_123",
                price_id: "price_123",
                metadata: {},
                organization_id: "org_123",
                created_at: "2025-01-01T00:00:00Z",
              }
            ]
          }),
        })) as any;

        const actual = await tool.handler({ active: true }, mockContext);

        expect(actual).toContain("active");
      });
    });
  });

  describe(".CREATE_CHECKOUT", () => {
    describe("when valid product ID is provided", () => {
      it("creates and returns checkout session", async () => {
        const tool = PolarConnectorConfig.tools.CREATE_CHECKOUT as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as any).mockResolvedValue({
          accessToken: "polar_at_test_token",
          server: "sandbox" as const,
        });

        global.fetch = (() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: "checkout_123",
            status: "open",
            client_secret: "cs_test_secret",
            url: "https://checkout.polar.sh/checkout_123",
            expires_at: "2025-01-01T01:00:00Z",
            success_url: "https://example.com/success",
            customer_email: "customer@example.com",
            payment_processor: "stripe",
            metadata: {},
            product_id: "prod_123",
            product_price_id: "price_123",
            allow_discount_codes: true,
            is_discount_applicable: false,
            is_free_product_price: false,
            is_payment_required: true,
            is_payment_setup_required: false,
            is_payment_form_required: true,
            organization_id: "org_123",
            created_at: "2025-01-01T00:00:00Z",
          }),
        })) as any;

        const actual = await tool.handler({
          productId: "prod_123",
          successUrl: "https://example.com/success",
          customerEmail: "customer@example.com"
        }, mockContext);

        expect(actual).toContain("checkout_123");
        expect(actual).toContain("https://checkout.polar.sh/checkout_123");
        expect(actual).toContain("open");
      });
    });

    describe("when product is not found", () => {
      it("returns error message", async () => {
        const tool = PolarConnectorConfig.tools.CREATE_CHECKOUT as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as any).mockResolvedValue({
          accessToken: "polar_at_test_token",
          server: "sandbox" as const,
        });

        global.fetch = (() => Promise.resolve({
          ok: false,
          status: 404,
          statusText: "Not Found",
        })) as any;

        const actual = await tool.handler({
          productId: "invalid_product"
        }, mockContext);

        expect(actual).toContain("Failed to create checkout");
        expect(actual).toContain("404 Not Found");
      });
    });
  });

  describe(".LIST_ORDERS", () => {
    describe("when filtering by customer", () => {
      it("returns customer orders", async () => {
        const tool = PolarConnectorConfig.tools.LIST_ORDERS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as any).mockResolvedValue({
          accessToken: "polar_at_test_token",
          server: "sandbox" as const,
        });

        global.fetch = (() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            items: [
              {
                id: "order_123",
                amount: 2999,
                tax_amount: 0,
                currency: "USD",
                billing_reason: "purchase",
                customer_id: "cust_123",
                product_id: "prod_123",
                product_price_id: "price_123",
                metadata: {},
                organization_id: "org_123",
                created_at: "2025-01-01T00:00:00Z",
              }
            ]
          }),
        })) as any;

        const actual = await tool.handler({ customerId: "cust_123" }, mockContext);

        expect(actual).toContain("order_123");
      });
    });
  });

  describe(".LIST_ORGANIZATIONS", () => {
    describe("when valid credentials are provided", () => {
      it("returns list of organizations", async () => {
        const tool = PolarConnectorConfig.tools.LIST_ORGANIZATIONS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as any).mockResolvedValue({
          accessToken: "polar_at_test_token",
          server: "sandbox" as const,
        });

        global.fetch = (() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            items: [
              {
                id: "org_123",
                name: "Test Organization",
                slug: "test-org",
                pledge_minimum_amount: 100,
                pledge_badge_show_amount: true,
                created_at: "2025-01-01T00:00:00Z",
              }
            ]
          }),
        })) as any;

        const actual = await tool.handler({}, mockContext);

        expect(actual).toContain("Test Organization");
        expect(actual).toContain("org_123");
        expect(actual).toContain("test-org");
      });
    });
  });
});
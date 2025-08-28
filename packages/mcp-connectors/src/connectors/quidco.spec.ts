import type { MCPToolDefinition } from "@stackone/mcp-config-types";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { describe, expect, it, vi } from "vitest";
import { createMockConnectorContext } from "../__mocks__/context";
import { QuidcoConnectorConfig } from "./quidco";

describe("#QuidcoConnectorConfig", () => {
  describe(".LOGIN", () => {
    describe("when credentials are valid", () => {
      it("returns success and caches session", async () => {
        const server = setupServer(
          http.post("https://identity-cognito.quidco.com/", () => {
            return new HttpResponse(JSON.stringify({ ok: true }), {
              status: 200,
              headers: { "Set-Cookie": "SessionId=quidco123; Path=/;" },
            });
          })
        );
        server.listen();
        const tool = QuidcoConnectorConfig.tools.LOGIN as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (
          mockContext.getCredentials as ReturnType<typeof vi.fn>
        ).mockResolvedValue({
          email: "user@example.com",
          password: "pass",
        });
        const actual = await tool.handler({}, mockContext);
        server.close();
        expect(actual).toContain("Login successful");
        expect(mockContext.writeCache).toHaveBeenCalled();
      });
    });
    describe("when credentials are invalid", () => {
      it("returns failure message", async () => {
        const server = setupServer(
          http.post("https://identity-cognito.quidco.com/", () => {
            return new HttpResponse("Unauthorized", { status: 401 });
          })
        );
        server.listen();
        const tool = QuidcoConnectorConfig.tools.LOGIN as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (
          mockContext.getCredentials as ReturnType<typeof vi.fn>
        ).mockResolvedValue({
          email: "bad@example.com",
          password: "wrong",
        });
        const actual = await tool.handler({}, mockContext);
        server.close();
        expect(actual).toContain("Login failed");
        expect(actual).toContain("Invalid credentials");
      });
    });
  });

  describe(".GET_USER", () => {
    describe("when session is valid", () => {
      it("returns user data JSON", async () => {
        const server = setupServer(
          http.get("https://www.quidco.com/ajax/user/user_header_data", () => {
            return HttpResponse.json({
              user_id: 1,
              first_name: "Alice",
              user_type: 4,
              total_earned: 10.5,
              total_tracked: 2.3,
              payable_cashback: 1.1,
            });
          })
        );
        server.listen();
        const tool = QuidcoConnectorConfig.tools.GET_USER as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.readCache as ReturnType<typeof vi.fn>).mockResolvedValue({
          value: { cookies: "SessionId=quidco123" },
        });
        const actual = await tool.handler({}, mockContext);
        server.close();
        expect(actual).toContain("Alice");
        expect(actual).toContain("totalEarned");
      });
    });
    describe("when session missing", () => {
      it("instructs to login", async () => {
        const tool = QuidcoConnectorConfig.tools.GET_USER as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.readCache as ReturnType<typeof vi.fn>).mockResolvedValue(
          null
        );
        const actual = await tool.handler({}, mockContext);
        expect(actual).toContain("login first");
      });
    });
    describe("when unauthorized", () => {
      it("returns error message", async () => {
        const server = setupServer(
          http.get("https://www.quidco.com/ajax/user/user_header_data", () => {
            return new HttpResponse("Forbidden", { status: 403 });
          })
        );
        server.listen();
        const tool = QuidcoConnectorConfig.tools.GET_USER as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.readCache as ReturnType<typeof vi.fn>).mockResolvedValue({
          value: { cookies: "SessionId=quidco123" },
        });
        const actual = await tool.handler({}, mockContext);
        server.close();
        expect(actual).toContain("Failed to fetch user");
        expect(actual).toContain("Unauthorized");
      });
    });
  });

  describe(".SEARCH_MERCHANTS", () => {
    describe("when session is valid", () => {
      it("returns suggestions list", async () => {
        const server = setupServer(
          http.get(
            "https://www.quidco.com/ajax/search/suggestions",
            ({ request }) => {
              const url = new URL(request.url);
              if (url.searchParams.get("search_term") === "ebay") {
                return HttpResponse.json({
                  suggestions: [{ id: "1", name: "EBay" }],
                });
              }
              return HttpResponse.json({ suggestions: [] });
            }
          )
        );
        server.listen();
        const tool = QuidcoConnectorConfig.tools
          .SEARCH_MERCHANTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.readCache as ReturnType<typeof vi.fn>).mockResolvedValue({
          value: { cookies: "SessionId=quidco123" },
        });
        const actual = await tool.handler({ query: "ebay" }, mockContext);
        server.close();
        expect(actual).toContain("EBay");
      });
    });
    describe("when no results", () => {
      it("returns no merchants found", async () => {
        const server = setupServer(
          http.get("https://www.quidco.com/ajax/search/suggestions", () => {
            return HttpResponse.json({ suggestions: [] });
          })
        );
        server.listen();
        const tool = QuidcoConnectorConfig.tools
          .SEARCH_MERCHANTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.readCache as ReturnType<typeof vi.fn>).mockResolvedValue({
          value: { cookies: "SessionId=quidco123" },
        });
        const actual = await tool.handler({ query: "zzz" }, mockContext);
        server.close();
        expect(actual).toContain("No merchants found");
      });
    });
    describe("when session missing", () => {
      it("instructs to login first", async () => {
        const tool = QuidcoConnectorConfig.tools
          .SEARCH_MERCHANTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.readCache as ReturnType<typeof vi.fn>).mockResolvedValue(
          null
        );
        const actual = await tool.handler({ query: "ebay" }, mockContext);
        expect(actual).toContain("login first");
      });
    });
    describe("when API returns error", () => {
      it("returns error message", async () => {
        const server = setupServer(
          http.get("https://www.quidco.com/ajax/search/suggestions", () => {
            return new HttpResponse("Server error", { status: 500 });
          })
        );
        server.listen();
        const tool = QuidcoConnectorConfig.tools
          .SEARCH_MERCHANTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.readCache as ReturnType<typeof vi.fn>).mockResolvedValue({
          value: { cookies: "SessionId=quidco123" },
        });
        const actual = await tool.handler({ query: "ebay" }, mockContext);
        server.close();
        expect(actual).toContain("Merchant search failed");
        expect(actual).toContain("500");
      });
    });
  });

  describe(".GET_CASHBACK_OFFER", () => {
    describe("when offer exists", () => {
      it("returns formatted offer", async () => {
        const server = setupServer(
          http.get("https://www.quidco.com/ebay/", () => {
            return HttpResponse.text(
              '<html><span class="offer-value">5% cashback</span></html>'
            );
          })
        );
        server.listen();
        const tool = QuidcoConnectorConfig.tools
          .GET_CASHBACK_OFFER as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.readCache as ReturnType<typeof vi.fn>).mockResolvedValue({
          value: { cookies: "SessionId=quidco123" },
        });
        const actual = await tool.handler(
          { merchantSlug: "ebay" },
          mockContext
        );
        server.close();
        expect(actual).toContain("Offer: 5% cashback");
        expect(actual).toContain("Normalized");
      });
    });
    describe("when offer missing", () => {
      it("returns not found message", async () => {
        const server = setupServer(
          http.get("https://www.quidco.com/unknown/", () => {
            return HttpResponse.text("<html><body>No offer</body></html>");
          })
        );
        server.listen();
        const tool = QuidcoConnectorConfig.tools
          .GET_CASHBACK_OFFER as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.readCache as ReturnType<typeof vi.fn>).mockResolvedValue({
          value: { cookies: "SessionId=quidco123" },
        });
        const actual = await tool.handler(
          { merchantSlug: "unknown" },
          mockContext
        );
        server.close();
        expect(actual).toContain("Offer value not found");
      });
    });
    describe("when fetch fails", () => {
      it("returns error message with status", async () => {
        const server = setupServer(
          http.get("https://www.quidco.com/failing/", () => {
            return new HttpResponse("Not Found", { status: 404 });
          })
        );
        server.listen();
        const tool = QuidcoConnectorConfig.tools
          .GET_CASHBACK_OFFER as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.readCache as ReturnType<typeof vi.fn>).mockResolvedValue({
          value: { cookies: "SessionId=quidco123" },
        });
        const actual = await tool.handler(
          { merchantSlug: "failing" },
          mockContext
        );
        server.close();
        expect(actual).toContain("Failed to get cashback offer");
        expect(actual).toContain("404");
      });
    });
  });

  describe(".GET_CASHBACK_OFFER_BEST_MATCH", () => {
    describe("when suggestions and offer exist", () => {
      it("returns best match with normalized output", async () => {
        const server = setupServer(
          http.get("https://www.quidco.com/ajax/search/suggestions", () => {
            return HttpResponse.json({
              suggestions: [
                { id: "1", name: "EBay" },
                { id: "2", name: "Ebuyer" },
              ],
            });
          }),
          http.get("https://www.quidco.com/ebay/", () => {
            return HttpResponse.text(
              '<html><span class="offer-value">Up to 6% cashback</span></html>'
            );
          })
        );
        server.listen();
        const tool = QuidcoConnectorConfig.tools
          .GET_CASHBACK_OFFER_BEST_MATCH as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.readCache as ReturnType<typeof vi.fn>).mockImplementation(
          async (key) =>
            key === "quidco:session" ? "SessionId=quidco123" : null
        );
        const actual = await tool.handler({ query: "ebay" }, mockContext);
        server.close();
        expect(actual).toContain("Best Match: EBay");
        expect(actual).toContain("Normalized");
        expect(actual).toContain("6%");
      });
    });
    describe("when no session", () => {
      it("asks to login", async () => {
        const tool = QuidcoConnectorConfig.tools
          .GET_CASHBACK_OFFER_BEST_MATCH as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.readCache as ReturnType<typeof vi.fn>).mockImplementation(
          async () => null
        );
        const actual = await tool.handler({ query: "ebay" }, mockContext);
        expect(actual).toContain("login first");
      });
    });
    describe("when no merchants found", () => {
      it("returns no merchants message", async () => {
        const server = setupServer(
          http.get("https://www.quidco.com/ajax/search/suggestions", () => {
            return HttpResponse.json({ suggestions: [] });
          })
        );
        server.listen();
        const tool = QuidcoConnectorConfig.tools
          .GET_CASHBACK_OFFER_BEST_MATCH as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.readCache as ReturnType<typeof vi.fn>).mockImplementation(
          async (key) =>
            key === "quidco:session" ? "SessionId=quidco123" : null
        );
        const actual = await tool.handler({ query: "zzz" }, mockContext);
        server.close();
        expect(actual).toContain("No merchants found");
      });
    });
  });
});

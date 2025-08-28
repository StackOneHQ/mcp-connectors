import type { MCPToolDefinition } from "@stackone/mcp-config-types";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { describe, expect, it, vi } from "vitest";
import { createMockConnectorContext } from "../__mocks__/context";
import { TopCashbackConnectorConfig } from "./topcashback";

describe("#TopCashbackConnectorConfig", () => {
  describe(".LOGIN", () => {
    describe("when credentials are valid", () => {
      it("returns success and writes cache", async () => {
        const server = setupServer(
          http.get("https://www.topcashback.co.uk/logon/", () => {
            return new HttpResponse(
              '<html><input name="__RequestVerificationToken" type="hidden" value="token123" /></html>',
              {
                status: 200,
                headers: {
                  "Set-Cookie": "__RequestVerificationToken=token123; Path=/;",
                },
              }
            );
          }),
          http.post("https://www.topcashback.co.uk/logon/", () => {
            return new HttpResponse("OK", {
              status: 302,
              headers: { "Set-Cookie": "SessionId=abc123; Path=/;" },
            });
          })
        );
        server.listen();

        const tool = TopCashbackConnectorConfig.tools
          .LOGIN as MCPToolDefinition;
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
          http.get("https://www.topcashback.co.uk/logon/", () => {
            return new HttpResponse("<html></html>", { status: 200 });
          }),
          http.post("https://www.topcashback.co.uk/logon/", () => {
            return new HttpResponse("Unauthorized", { status: 401 });
          })
        );
        server.listen();

        const tool = TopCashbackConnectorConfig.tools
          .LOGIN as MCPToolDefinition;
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

  describe(".SEARCH_MERCHANTS", () => {
    describe("when session is valid", () => {
      it("returns merchants list", async () => {
        const xml =
          "<?xml version=\"1.0\" encoding=\"utf-8\"?><ArrayOfString><string>&lt;div&gt;SUGGESTED SEARCHES&lt;/div&gt;</string><string>&lt;span class='ac_name'&gt;eBay&lt;/span&gt;</string><string>&lt;span class='ac_name'&gt;Ebuyer&lt;/span&gt;</string></ArrayOfString>";
        const server = setupServer(
          http.post(
            "https://www.topcashback.co.uk/Ajax.asmx/GetAutocompleteMerchants",
            () => {
              return new HttpResponse(xml, { status: 200 });
            }
          )
        );
        server.listen();

        const tool = TopCashbackConnectorConfig.tools
          .SEARCH_MERCHANTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.readCache as ReturnType<typeof vi.fn>).mockImplementation(
          async (key) =>
            key === "topcashback:session" ? "SessionId=abc123" : null
        );

        const actual = await tool.handler(
          { query: "ebay", limit: 5 },
          mockContext
        );
        server.close();

        expect(actual).toContain("eBay");
        expect(actual).toContain("Ebuyer");
      });
    });

    describe("when no session is present", () => {
      it("returns instruction to login", async () => {
        const tool = TopCashbackConnectorConfig.tools
          .SEARCH_MERCHANTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.readCache as ReturnType<typeof vi.fn>).mockResolvedValue(
          null
        );

        const actual = await tool.handler({ query: "ebay" }, mockContext);

        expect(actual).toContain("Please run the login tool first");
      });
    });

    describe("when API returns an error status", () => {
      it("returns error message", async () => {
        const server = setupServer(
          http.post(
            "https://www.topcashback.co.uk/Ajax.asmx/GetAutocompleteMerchants",
            () => new HttpResponse("Server error", { status: 500 })
          )
        );
        server.listen();

        const tool = TopCashbackConnectorConfig.tools
          .SEARCH_MERCHANTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.readCache as ReturnType<typeof vi.fn>).mockResolvedValue({
          value: { cookies: "SessionId=abc123" },
        });

        const actual = await tool.handler({ query: "ebay" }, mockContext);
        server.close();

        expect(actual).toContain("Merchant search failed");
        expect(actual).toContain("500");
      });
    });
  });

  describe(".GET_CASHBACK_RATE", () => {
    describe("when rate element exists", () => {
      it("returns formatted rate", async () => {
        const server = setupServer(
          http.get("https://www.topcashback.co.uk/ebay/", () => {
            return HttpResponse.text(
              '<html><span class="merch-cat__rate">Up to 5% cashback</span></html>'
            );
          })
        );
        server.listen();

        const tool = TopCashbackConnectorConfig.tools
          .GET_CASHBACK_RATE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.readCache as ReturnType<typeof vi.fn>).mockResolvedValue({
          value: { cookies: "SessionId=abc123" },
        });

        const actual = await tool.handler(
          { merchantSlug: "ebay" },
          mockContext
        );
        server.close();

        expect(actual).toContain("Cashback Rate: Up to 5% cashback");
        expect(actual).toContain("Normalized");
      });
    });

    describe("when rate element is missing", () => {
      it("returns not found message", async () => {
        const server = setupServer(
          http.get("https://www.topcashback.co.uk/unknown/", () => {
            return HttpResponse.text("<html><body>No rate here</body></html>");
          })
        );
        server.listen();

        const tool = TopCashbackConnectorConfig.tools
          .GET_CASHBACK_RATE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.readCache as ReturnType<typeof vi.fn>).mockImplementation(
          async (key) =>
            key === "topcashback:session" ? "SessionId=abc123" : null
        );

        const actual = await tool.handler(
          { merchantSlug: "unknown" },
          mockContext
        );
        server.close();

        expect(actual).toContain("Cashback rate element not found");
      });
    });

    describe("when page fetch fails", () => {
      it("returns error message with status", async () => {
        const server = setupServer(
          http.get("https://www.topcashback.co.uk/failing/", () => {
            return new HttpResponse("Not Found", { status: 404 });
          })
        );
        server.listen();

        const tool = TopCashbackConnectorConfig.tools
          .GET_CASHBACK_RATE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.readCache as ReturnType<typeof vi.fn>).mockImplementation(
          async (key) =>
            key === "topcashback:session" ? "SessionId=abc123" : null
        );

        const actual = await tool.handler(
          { merchantSlug: "failing" },
          mockContext
        );
        server.close();

        expect(actual).toContain("Failed to get cashback rate");
        expect(actual).toContain("404");
      });
    });
  });

  describe(".GET_CASHBACK_RATE_BEST_MATCH", () => {
    describe("when merchants and rate exist", () => {
      it("returns best match with normalized data", async () => {
        const xml =
          "<?xml version=\"1.0\"?><ArrayOfString><string>&lt;div&gt;SUGGESTED SEARCHES&lt;/div&gt;</string><string>&lt;span class='ac_name'&gt;eBay&lt;/span&gt;</string><string>&lt;span class='ac_name'&gt;Ebuyer&lt;/span&gt;</string></ArrayOfString>";
        const server = setupServer(
          http.post(
            "https://www.topcashback.co.uk/Ajax.asmx/GetAutocompleteMerchants",
            () => {
              return new HttpResponse(xml, { status: 200 });
            }
          ),
          http.get("https://www.topcashback.co.uk/ebay/", () => {
            return HttpResponse.text(
              '<html><span class="merch-cat__rate">Up to 5% cashback</span></html>'
            );
          })
        );
        server.listen();
        const tool = TopCashbackConnectorConfig.tools
          .GET_CASHBACK_RATE_BEST_MATCH as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.readCache as ReturnType<typeof vi.fn>).mockResolvedValue({
          value: { cookies: "SessionId=abc123" },
        });
        // adapt to new cache key usage
        (mockContext.readCache as ReturnType<typeof vi.fn>).mockImplementation(
          async (key) =>
            key === "topcashback:session" ? "SessionId=abc123" : null
        );
        const actual = await tool.handler({ query: "ebay" }, mockContext);
        server.close();
        expect(actual).toContain("Best Match: eBay");
        expect(actual).toContain("Normalized");
        expect(actual).toContain("5");
      });
    });

    describe("when no session", () => {
      it("instructs login first", async () => {
        const tool = TopCashbackConnectorConfig.tools
          .GET_CASHBACK_RATE_BEST_MATCH as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.readCache as ReturnType<typeof vi.fn>).mockImplementation(
          async () => null
        );
        const actual = await tool.handler({ query: "ebay" }, mockContext);
        expect(actual).toContain("login tool first");
      });
    });

    describe("when no merchants found", () => {
      it("returns no merchants message", async () => {
        const server = setupServer(
          http.post(
            "https://www.topcashback.co.uk/Ajax.asmx/GetAutocompleteMerchants",
            () => {
              return new HttpResponse(
                '<?xml version="1.0"?><ArrayOfString><string>&lt;div&gt;SUGGESTED SEARCHES&lt;/div&gt;</string></ArrayOfString>',
                { status: 200 }
              );
            }
          )
        );
        server.listen();
        const tool = TopCashbackConnectorConfig.tools
          .GET_CASHBACK_RATE_BEST_MATCH as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.readCache as ReturnType<typeof vi.fn>).mockImplementation(
          async (key) =>
            key === "topcashback:session" ? "SessionId=abc123" : null
        );
        const actual = await tool.handler({ query: "unknown" }, mockContext);
        server.close();
        expect(actual).toContain("No merchants found");
      });
    });
  });
});

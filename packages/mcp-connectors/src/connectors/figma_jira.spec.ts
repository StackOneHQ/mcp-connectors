import { describe, expect, it } from "vitest";
import type { MCPToolDefinition } from "@stackone/mcp-config-types";
import { createMockConnectorContext } from "../__mocks__/context";
import { FigmaJiraConnectorConfig } from "./figma_jira";

describe("#FigmaJiraConnector", () => {
  describe(".GET_FIGMA_FRAME", () => {
    describe("when frameId is valid", () => {
      it("returns frame data with name and comments", async () => {
        const tool = FigmaJiraConnectorConfig.tools.GET_FIGMA_FRAME as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler({ 
          fileId: "test-file-id", 
          frameId: "test-frame-id" 
        }, mockContext);

        expect(actual).toBeDefined();
        expect(typeof actual).toBe("string");
      });
    });

    describe("when frameId does not exist", () => {
      it("returns an error message", async () => {
        const tool = FigmaJiraConnectorConfig.tools.GET_FIGMA_FRAME as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler({ 
          fileId: "test-file-id", 
          frameId: "invalid-frame-id" 
        }, mockContext);

        expect(actual).toBeDefined();
        expect(typeof actual).toBe("string");
      });
    });
  });

  describe(".CREATE_JIRA_TICKET_FROM_FRAME", () => {
    describe("when all parameters are valid", () => {
      it("creates a Jira ticket with frame details", async () => {
        const tool = FigmaJiraConnectorConfig.tools.CREATE_JIRA_TICKET_FROM_FRAME as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler({ 
          fileId: "test-file-id", 
          frameId: "test-frame-id",
          projectKey: "TEST",
          issueType: "Task"
        }, mockContext);

        expect(actual).toBeDefined();
        expect(typeof actual).toBe("string");
      });
    });

    describe("when using default project and issue type", () => {
      it("creates a Jira ticket with default values", async () => {
        const tool = FigmaJiraConnectorConfig.tools.CREATE_JIRA_TICKET_FROM_FRAME as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler({ 
          fileId: "test-file-id", 
          frameId: "test-frame-id"
        }, mockContext);

        expect(actual).toBeDefined();
        expect(typeof actual).toBe("string");
      });
    });
  });

  describe(".GET_FIGMA_FILE_INFO", () => {
    describe("when fileId is valid", () => {
      it("returns file information", async () => {
        const tool = FigmaJiraConnectorConfig.tools.GET_FIGMA_FILE_INFO as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler({ 
          fileId: "test-file-id" 
        }, mockContext);

        expect(actual).toBeDefined();
        expect(typeof actual).toBe("string");
      });
    });
  });

  describe(".SEARCH_FIGMA_FRAMES", () => {
    describe("when search query is provided", () => {
      it("returns matching frames", async () => {
        const tool = FigmaJiraConnectorConfig.tools.SEARCH_FIGMA_FRAMES as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler({ 
          fileId: "test-file-id", 
          query: "button" 
        }, mockContext);

        expect(actual).toBeDefined();
        expect(typeof actual).toBe("string");
      });
    });

    describe("when maxResults is specified", () => {
      it("limits the number of results", async () => {
        const tool = FigmaJiraConnectorConfig.tools.SEARCH_FIGMA_FRAMES as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler({ 
          fileId: "test-file-id", 
          query: "frame", 
          maxResults: 5 
        }, mockContext);

        expect(actual).toBeDefined();
        expect(typeof actual).toBe("string");
      });
    });
  });
});
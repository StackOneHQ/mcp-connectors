import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface BrowserMCPToolResponse {
  content?: Array<{ type: string; text?: string; data?: string }>;
}

class BrowserMCPClient {
  private baseUrl: string;

  constructor(serverUrl = 'http://localhost:3001') {
    this.baseUrl = serverUrl;
  }

  private async makeRequest(
    tool: string,
    params: Record<string, unknown> = {}
  ): Promise<BrowserMCPToolResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/tools/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: 'tools/call',
          params: {
            name: tool,
            arguments: params,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Browser MCP server error: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(`Browser MCP error: ${result.error.message || result.error}`);
      }

      return result.result;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to communicate with Browser MCP server: ${error.message}`
        );
      }
      throw new Error('Failed to communicate with Browser MCP server');
    }
  }

  async navigate(url: string): Promise<string> {
    const result = await this.makeRequest('browser_navigate', { url });
    return result.content?.[0]?.text || 'Navigation completed';
  }

  async click(selector: string): Promise<string> {
    const result = await this.makeRequest('browser_click', { selector });
    return result.content?.[0]?.text || 'Click completed';
  }

  async type(text: string, selector?: string): Promise<string> {
    const result = await this.makeRequest('browser_type', { text, selector });
    return result.content?.[0]?.text || 'Text input completed';
  }

  async hover(selector: string): Promise<string> {
    const result = await this.makeRequest('browser_hover', { selector });
    return result.content?.[0]?.text || 'Hover completed';
  }

  async drag(startSelector: string, endSelector: string): Promise<string> {
    const result = await this.makeRequest('browser_drag', {
      startSelector,
      endSelector,
    });
    return result.content?.[0]?.text || 'Drag completed';
  }

  async selectOption(selector: string, value: string): Promise<string> {
    const result = await this.makeRequest('browser_select_option', {
      selector,
      value,
    });
    return result.content?.[0]?.text || 'Option selected';
  }

  async snapshot(): Promise<string> {
    const result = await this.makeRequest('browser_snapshot');
    return result.content?.[0]?.text || 'Snapshot captured';
  }

  async screenshot(): Promise<BrowserMCPToolResponse> {
    const result = await this.makeRequest('browser_screenshot');
    return result;
  }

  async getConsoleLogs(): Promise<string> {
    const result = await this.makeRequest('browser_get_console_logs');
    return result.content?.[0]?.text || 'Console logs retrieved';
  }

  async goBack(): Promise<string> {
    const result = await this.makeRequest('browser_go_back');
    return result.content?.[0]?.text || 'Navigated back';
  }

  async goForward(): Promise<string> {
    const result = await this.makeRequest('browser_go_forward');
    return result.content?.[0]?.text || 'Navigated forward';
  }

  async pressKey(key: string): Promise<string> {
    const result = await this.makeRequest('browser_press_key', { key });
    return result.content?.[0]?.text || 'Key pressed';
  }

  async wait(milliseconds: number): Promise<string> {
    const result = await this.makeRequest('browser_wait', { milliseconds });
    return result.content?.[0]?.text || 'Wait completed';
  }
}

export const BrowserMCPConnectorConfig = mcpConnectorConfig({
  name: 'Browser MCP',
  key: 'browser-mcp',
  version: '1.0.0',
  logo: 'https://raw.githubusercontent.com/BrowserMCP/mcp/main/assets/icon.png',
  credentials: z.object({}),
  setup: z.object({
    serverUrl: z
      .string()
      .default('http://localhost:3001')
      .describe(
        'Browser MCP server URL :: http://localhost:3001 :: The URL where your Browser MCP server is running'
      ),
  }),
  examplePrompt:
    'Navigate to https://example.com, take a screenshot, click on the first link, and capture the page content.',
  tools: (tool) => ({
    NAVIGATE: tool({
      name: 'browser_mcp_navigate',
      description: 'Navigate to a specific URL in the browser',
      schema: z.object({
        url: z.string().describe('The URL to navigate to'),
      }),
      handler: async (args, context) => {
        try {
          const { serverUrl } = await context.getSetup();
          const client = new BrowserMCPClient(serverUrl);
          const result = await client.navigate(args.url);
          return result;
        } catch (error) {
          return `Failed to navigate: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    CLICK: tool({
      name: 'browser_mcp_click',
      description: 'Click on an element identified by CSS selector',
      schema: z.object({
        selector: z.string().describe('CSS selector of the element to click'),
      }),
      handler: async (args, context) => {
        try {
          const { serverUrl } = await context.getSetup();
          const client = new BrowserMCPClient(serverUrl);
          const result = await client.click(args.selector);
          return result;
        } catch (error) {
          return `Failed to click: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    TYPE: tool({
      name: 'browser_mcp_type',
      description: 'Type text into an input field or focused element',
      schema: z.object({
        text: z.string().describe('Text to type'),
        selector: z
          .string()
          .optional()
          .describe('CSS selector of the element to type into (optional)'),
      }),
      handler: async (args, context) => {
        try {
          const { serverUrl } = await context.getSetup();
          const client = new BrowserMCPClient(serverUrl);
          const result = await client.type(args.text, args.selector);
          return result;
        } catch (error) {
          return `Failed to type: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    HOVER: tool({
      name: 'browser_mcp_hover',
      description: 'Hover over an element identified by CSS selector',
      schema: z.object({
        selector: z.string().describe('CSS selector of the element to hover over'),
      }),
      handler: async (args, context) => {
        try {
          const { serverUrl } = await context.getSetup();
          const client = new BrowserMCPClient(serverUrl);
          const result = await client.hover(args.selector);
          return result;
        } catch (error) {
          return `Failed to hover: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    DRAG: tool({
      name: 'browser_mcp_drag',
      description: 'Drag an element from one location to another',
      schema: z.object({
        startSelector: z.string().describe('CSS selector of the element to drag'),
        endSelector: z.string().describe('CSS selector of the target location'),
      }),
      handler: async (args, context) => {
        try {
          const { serverUrl } = await context.getSetup();
          const client = new BrowserMCPClient(serverUrl);
          const result = await client.drag(args.startSelector, args.endSelector);
          return result;
        } catch (error) {
          return `Failed to drag: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    SELECT_OPTION: tool({
      name: 'browser_mcp_select_option',
      description: 'Select an option from a dropdown or select element',
      schema: z.object({
        selector: z.string().describe('CSS selector of the select element'),
        value: z.string().describe('Value or text of the option to select'),
      }),
      handler: async (args, context) => {
        try {
          const { serverUrl } = await context.getSetup();
          const client = new BrowserMCPClient(serverUrl);
          const result = await client.selectOption(args.selector, args.value);
          return result;
        } catch (error) {
          return `Failed to select option: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    SNAPSHOT: tool({
      name: 'browser_mcp_snapshot',
      description: 'Capture an accessibility snapshot of the current page',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { serverUrl } = await context.getSetup();
          const client = new BrowserMCPClient(serverUrl);
          const result = await client.snapshot();
          return result;
        } catch (error) {
          return `Failed to capture snapshot: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    SCREENSHOT: tool({
      name: 'browser_mcp_screenshot',
      description: 'Take a screenshot of the current page',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { serverUrl } = await context.getSetup();
          const client = new BrowserMCPClient(serverUrl);
          const result = await client.screenshot();

          if (result.content?.[0]?.type === 'image') {
            return 'Screenshot captured successfully';
          }

          return result.content?.[0]?.text || 'Screenshot captured';
        } catch (error) {
          return `Failed to take screenshot: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_CONSOLE_LOGS: tool({
      name: 'browser_mcp_get_console_logs',
      description: 'Retrieve console logs from the browser',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { serverUrl } = await context.getSetup();
          const client = new BrowserMCPClient(serverUrl);
          const result = await client.getConsoleLogs();
          return result;
        } catch (error) {
          return `Failed to get console logs: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GO_BACK: tool({
      name: 'browser_mcp_go_back',
      description: 'Navigate back in browser history',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { serverUrl } = await context.getSetup();
          const client = new BrowserMCPClient(serverUrl);
          const result = await client.goBack();
          return result;
        } catch (error) {
          return `Failed to go back: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GO_FORWARD: tool({
      name: 'browser_mcp_go_forward',
      description: 'Navigate forward in browser history',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { serverUrl } = await context.getSetup();
          const client = new BrowserMCPClient(serverUrl);
          const result = await client.goForward();
          return result;
        } catch (error) {
          return `Failed to go forward: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    PRESS_KEY: tool({
      name: 'browser_mcp_press_key',
      description: 'Press a keyboard key',
      schema: z.object({
        key: z.string().describe('Key to press (e.g., Enter, Tab, Escape, ArrowDown)'),
      }),
      handler: async (args, context) => {
        try {
          const { serverUrl } = await context.getSetup();
          const client = new BrowserMCPClient(serverUrl);
          const result = await client.pressKey(args.key);
          return result;
        } catch (error) {
          return `Failed to press key: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    WAIT: tool({
      name: 'browser_mcp_wait',
      description: 'Wait for a specified number of milliseconds',
      schema: z.object({
        milliseconds: z.number().describe('Number of milliseconds to wait'),
      }),
      handler: async (args, context) => {
        try {
          const { serverUrl } = await context.getSetup();
          const client = new BrowserMCPClient(serverUrl);
          const result = await client.wait(args.milliseconds);
          return result;
        } catch (error) {
          return `Failed to wait: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

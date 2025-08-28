import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface BrowserbaseSession {
  id: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMED_OUT';
  startedAt: string;
  endedAt?: string;
  logs?: string[];
  recording?: string;
  [key: string]: unknown;
}

interface BrowserbasePageContent {
  url: string;
  title: string;
  content: string;
  screenshot?: string;
  [key: string]: unknown;
}

interface BrowserbaseScreenshot {
  url: string;
  screenshot: string;
  [key: string]: unknown;
}

interface BrowserbaseNavigateResponse {
  success: boolean;
  url: string;
  title: string;
  [key: string]: unknown;
}

interface BrowserbaseClickResponse {
  success: boolean;
  message: string;
  [key: string]: unknown;
}

interface BrowserbaseTypeResponse {
  success: boolean;
  message: string;
  [key: string]: unknown;
}

class BrowserbaseClient {
  private apiKey: string;
  private projectId: string;
  private baseUrl = 'https://api.browserbase.com';

  constructor(apiKey: string, projectId: string) {
    this.apiKey = apiKey;
    this.projectId = projectId;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Browserbase API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  async createSession(): Promise<BrowserbaseSession> {
    const response = await this.makeRequest('/v1/sessions', {
      method: 'POST',
      body: JSON.stringify({
        projectId: this.projectId,
      }),
    });
    return response;
  }

  async getSession(sessionId: string): Promise<BrowserbaseSession> {
    return this.makeRequest(`/v1/sessions/${sessionId}`);
  }

  async listSessions(limit = 10): Promise<BrowserbaseSession[]> {
    const response = await this.makeRequest(`/v1/sessions?limit=${limit}`);
    return response.sessions || [];
  }

  async navigate(sessionId: string, url: string): Promise<BrowserbaseNavigateResponse> {
    return this.makeRequest(`/v1/sessions/${sessionId}/navigate`, {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  async getPageContent(sessionId: string): Promise<BrowserbasePageContent> {
    return this.makeRequest(`/v1/sessions/${sessionId}/page`);
  }

  async takeScreenshot(sessionId: string): Promise<BrowserbaseScreenshot> {
    return this.makeRequest(`/v1/sessions/${sessionId}/screenshot`);
  }

  async clickElement(sessionId: string, selector: string): Promise<BrowserbaseClickResponse> {
    return this.makeRequest(`/v1/sessions/${sessionId}/click`, {
      method: 'POST',
      body: JSON.stringify({ selector }),
    });
  }

  async typeText(sessionId: string, selector: string, text: string): Promise<BrowserbaseTypeResponse> {
    return this.makeRequest(`/v1/sessions/${sessionId}/type`, {
      method: 'POST',
      body: JSON.stringify({ selector, text }),
    });
  }

  async executeScript(sessionId: string, script: string): Promise<any> {
    return this.makeRequest(`/v1/sessions/${sessionId}/execute`, {
      method: 'POST',
      body: JSON.stringify({ script }),
    });
  }

  async completeSession(sessionId: string): Promise<BrowserbaseSession> {
    return this.makeRequest(`/v1/sessions/${sessionId}/complete`, {
      method: 'POST',
    });
  }
}

export const BrowserbaseConnectorConfig = mcpConnectorConfig({
  name: 'Browserbase',
  key: 'browserbase',
  version: '1.0.0',
  logo: 'https://docs.browserbase.com/img/logo.png',
  credentials: z.object({
    apiKey: z
      .string()
      .describe(
        'Browserbase API Key :: bb_1234567890abcdef1234567890abcdef :: https://docs.browserbase.com/getting-started'
      ),
    projectId: z
      .string()
      .describe(
        'Browserbase Project ID :: proj_1234567890abcdef :: https://docs.browserbase.com/projects'
      ),
  }),
  setup: z.object({}),
  examplePrompt:
    'Create a browser session, navigate to a website, take a screenshot, extract page content, and complete the session.',
  tools: (tool) => ({
    CREATE_SESSION: tool({
      name: 'browserbase_create_session',
      description: 'Create a new browser session for web automation',
      schema: z.object({}),
      handler: async (args, context) => {
        try {
          const { apiKey, projectId } = await context.getCredentials();
          const client = new BrowserbaseClient(apiKey, projectId);
          const session = await client.createSession();
          return JSON.stringify({
            sessionId: session.id,
            status: session.status,
            startedAt: session.startedAt,
            message: 'Browser session created successfully'
          }, null, 2);
        } catch (error) {
          return `Failed to create session: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_SESSION: tool({
      name: 'browserbase_get_session',
      description: 'Get information about a specific browser session',
      schema: z.object({
        sessionId: z.string().describe('The ID of the browser session'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, projectId } = await context.getCredentials();
          const client = new BrowserbaseClient(apiKey, projectId);
          const session = await client.getSession(args.sessionId);
          return JSON.stringify(session, null, 2);
        } catch (error) {
          return `Failed to get session: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    LIST_SESSIONS: tool({
      name: 'browserbase_list_sessions',
      description: 'List recent browser sessions',
      schema: z.object({
        limit: z
          .number()
          .default(10)
          .describe('Maximum number of sessions to return'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, projectId } = await context.getCredentials();
          const client = new BrowserbaseClient(apiKey, projectId);
          const sessions = await client.listSessions(args.limit);
          return JSON.stringify(sessions, null, 2);
        } catch (error) {
          return `Failed to list sessions: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    NAVIGATE: tool({
      name: 'browserbase_navigate',
      description: 'Navigate to a URL in a browser session',
      schema: z.object({
        sessionId: z.string().describe('The ID of the browser session'),
        url: z.string().describe('The URL to navigate to'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, projectId } = await context.getCredentials();
          const client = new BrowserbaseClient(apiKey, projectId);
          const response = await client.navigate(args.sessionId, args.url);
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return `Failed to navigate: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_PAGE_CONTENT: tool({
      name: 'browserbase_get_page_content',
      description: 'Get the content of the current page in a browser session',
      schema: z.object({
        sessionId: z.string().describe('The ID of the browser session'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, projectId } = await context.getCredentials();
          const client = new BrowserbaseClient(apiKey, projectId);
          const pageContent = await client.getPageContent(args.sessionId);
          return JSON.stringify({
            url: pageContent.url,
            title: pageContent.title,
            contentLength: pageContent.content.length,
            contentPreview: pageContent.content.substring(0, 500) + '...',
            hasScreenshot: !!pageContent.screenshot
          }, null, 2);
        } catch (error) {
          return `Failed to get page content: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    TAKE_SCREENSHOT: tool({
      name: 'browserbase_take_screenshot',
      description: 'Take a screenshot of the current page in a browser session',
      schema: z.object({
        sessionId: z.string().describe('The ID of the browser session'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, projectId } = await context.getCredentials();
          const client = new BrowserbaseClient(apiKey, projectId);
          const screenshot = await client.takeScreenshot(args.sessionId);
          return JSON.stringify({
            url: screenshot.url,
            screenshotSize: screenshot.screenshot.length,
            message: 'Screenshot captured successfully'
          }, null, 2);
        } catch (error) {
          return `Failed to take screenshot: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    CLICK_ELEMENT: tool({
      name: 'browserbase_click_element',
      description: 'Click on an element in a browser session using a CSS selector',
      schema: z.object({
        sessionId: z.string().describe('The ID of the browser session'),
        selector: z.string().describe('CSS selector for the element to click'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, projectId } = await context.getCredentials();
          const client = new BrowserbaseClient(apiKey, projectId);
          const response = await client.clickElement(args.sessionId, args.selector);
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return `Failed to click element: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    TYPE_TEXT: tool({
      name: 'browserbase_type_text',
      description: 'Type text into an input element in a browser session',
      schema: z.object({
        sessionId: z.string().describe('The ID of the browser session'),
        selector: z.string().describe('CSS selector for the input element'),
        text: z.string().describe('The text to type'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, projectId } = await context.getCredentials();
          const client = new BrowserbaseClient(apiKey, projectId);
          const response = await client.typeText(args.sessionId, args.selector, args.text);
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return `Failed to type text: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    EXECUTE_SCRIPT: tool({
      name: 'browserbase_execute_script',
      description: 'Execute JavaScript code in a browser session',
      schema: z.object({
        sessionId: z.string().describe('The ID of the browser session'),
        script: z.string().describe('JavaScript code to execute'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, projectId } = await context.getCredentials();
          const client = new BrowserbaseClient(apiKey, projectId);
          const result = await client.executeScript(args.sessionId, args.script);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to execute script: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    COMPLETE_SESSION: tool({
      name: 'browserbase_complete_session',
      description: 'Complete and close a browser session',
      schema: z.object({
        sessionId: z.string().describe('The ID of the browser session to complete'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, projectId } = await context.getCredentials();
          const client = new BrowserbaseClient(apiKey, projectId);
          const session = await client.completeSession(args.sessionId);
          return JSON.stringify({
            sessionId: session.id,
            status: session.status,
            endedAt: session.endedAt,
            message: 'Session completed successfully'
          }, null, 2);
        } catch (error) {
          return `Failed to complete session: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});


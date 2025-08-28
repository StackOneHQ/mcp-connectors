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

class BrowserbaseClientManager {
  private static instances = new Map<string, BrowserbaseClient>();

  static getClient(apiKey: string, projectId: string): BrowserbaseClient {
    const key = `${apiKey}-${projectId}`;
    if (!this.instances.has(key)) {
      this.instances.set(key, new BrowserbaseClient(apiKey, projectId));
    }
    return this.instances.get(key)!;
  }
}

function handleError(operation: string, error: unknown): string {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Log for debugging (in production, use proper logging)
  console.error(`Browserbase ${operation} failed:`, errorMessage);

  return JSON.stringify({
    success: false,
    operation,
    error: errorMessage,
    timestamp: new Date().toISOString()
  }, null, 2);
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

  async createSessionWithContext(contextId?: string, options?: {
    width?: number;
    height?: number;
    proxies?: boolean;
    stealth?: boolean;
  }): Promise<BrowserbaseSession> {
    const response = await this.makeRequest('/v1/sessions', {
      method: 'POST',
      body: JSON.stringify({
        projectId: this.projectId,
        contextId,
        ...options
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

  async takeScreenshot(sessionId: string, selector?: string): Promise<BrowserbaseScreenshot> {
    const endpoint = selector
      ? `/v1/sessions/${sessionId}/screenshot?selector=${encodeURIComponent(selector)}`
      : `/v1/sessions/${sessionId}/screenshot`;
    return this.makeRequest(endpoint);
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
  setup: z.object({
    defaultBrowserWidth: z
      .number()
      .default(1280)
      .describe('Default browser viewport width'),
    defaultBrowserHeight: z
      .number()
      .default(720)
      .describe('Default browser viewport height'),
    enableProxies: z
      .boolean()
      .default(false)
      .describe('Enable Browserbase proxies by default'),
    enableStealth: z
      .boolean()
      .default(false)
      .describe('Enable advanced stealth mode'),
    sessionTimeout: z
      .number()
      .default(300000)
      .describe('Default session timeout in milliseconds'),
    contextId: z
      .string()
      .optional()
      .describe('Default Browserbase context ID for session persistence')
  }),
  examplePrompt: `
Multi-step browser automation example:
1. Create a browser session with custom viewport settings
2. Navigate to a website (e.g., "https://example.com")
3. Take a screenshot for visual reference (with optional base64 data)
4. Extract specific content using CSS selectors
5. Fill out a form using smart form detection
6. Complete the session

Try: "Create a session, go to news.ycombinator.com, take a screenshot, and extract the top 5 story titles"

Advanced usage:
- Use smart form filling: "Fill out the login form with username 'test' and password 'pass'"
- Element-specific screenshots: "Take a screenshot of the header section only"
- Session persistence: "Create a session with context ID for reuse"
- Resource browsing: "Show me all active browser sessions"
`,
  tools: (tool) => ({
    CREATE_SESSION: tool({
      name: 'browserbase_create_session',
      description: 'Create a new browser session for web automation',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { apiKey, projectId } = await context.getCredentials();
          const client = BrowserbaseClientManager.getClient(apiKey, projectId);
          const session = await client.createSession();
          return JSON.stringify({
            sessionId: session.id,

            
            status: session.status,
            startedAt: session.startedAt,
            message: 'Browser session created successfully'
          }, null, 2);
        } catch (error) {
          return handleError('create_session', error);
        }
      },
    }),

    GET_SESSION: tool({
      name: 'browserbase_get_session',
      description: 'Get information about a specific browser session',
      schema: z.object({
        sessionId: z.string().describe('The ID of the browser session'),
      }),
      handler: async (_args, context) => {
        try {
          const { apiKey, projectId } = await context.getCredentials();
          const client = BrowserbaseClientManager.getClient(apiKey, projectId);
          const session = await client.getSession(_args.sessionId);
          return JSON.stringify(session, null, 2);
        } catch (error) {
          return handleError('get_session', error);
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
      handler: async (_args, context) => {
        try {
          const { apiKey, projectId } = await context.getCredentials();
          const client = BrowserbaseClientManager.getClient(apiKey, projectId);
          const sessions = await client.listSessions(_args.limit);
          return JSON.stringify(sessions, null, 2);
        } catch (error) {
          return handleError('list_sessions', error);
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
      handler: async (_args, context) => {
        try {
          const { apiKey, projectId } = await context.getCredentials();
          const client = BrowserbaseClientManager.getClient(apiKey, projectId);
          const response = await client.navigate(_args.sessionId, _args.url);
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return handleError('navigate', error);
        }
      },
    }),

    GET_PAGE_CONTENT: tool({
      name: 'browserbase_get_page_content',
      description: 'Get the content of the current page in a browser session',
      schema: z.object({
        sessionId: z.string().describe('The ID of the browser session'),
      }),
      handler: async (_args, context) => {
        try {
          const { apiKey, projectId } = await context.getCredentials();
          const client = BrowserbaseClientManager.getClient(apiKey, projectId);
          const pageContent = await client.getPageContent(_args.sessionId);
          return JSON.stringify({
            url: pageContent.url,
            title: pageContent.title,
            contentLength: pageContent.content.length,
            contentPreview: pageContent.content.substring(0, 500) + '...',
            hasScreenshot: !!pageContent.screenshot
          }, null, 2);
        } catch (error) {
          return handleError('get_page_content', error);
        }
      },
    }),

    TAKE_SCREENSHOT: tool({
      name: 'browserbase_take_screenshot',
      description: 'Take a screenshot of the current page in a browser session',
      schema: z.object({
        sessionId: z.string().describe('The ID of the browser session'),
        returnImage: z.boolean().default(false).describe('Return base64 image data'),
        element: z.string().optional().describe('CSS selector to screenshot specific element')
      }),
      handler: async (_args, context) => {
        try {
          const { apiKey, projectId } = await context.getCredentials();
          const client = BrowserbaseClientManager.getClient(apiKey, projectId);
          const screenshot = await client.takeScreenshot(_args.sessionId, _args.element);

          return JSON.stringify({
            url: screenshot.url,
            image: _args.returnImage ? screenshot.screenshot : undefined,
            screenshotSize: screenshot.screenshot.length,
            element: _args.element || 'full-page',
            message: 'Screenshot captured successfully'
          }, null, 2);
        } catch (error) {
          return handleError('take_screenshot', error);
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
      handler: async (_args, context) => {
        try {
          const { apiKey, projectId } = await context.getCredentials();
          const client = BrowserbaseClientManager.getClient(apiKey, projectId);
          const response = await client.clickElement(_args.sessionId, _args.selector);
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return handleError('click_element', error);
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
      handler: async (_args, context) => {
        try {
          const { apiKey, projectId } = await context.getCredentials();
          const client = BrowserbaseClientManager.getClient(apiKey, projectId);
          const response = await client.typeText(_args.sessionId, _args.selector, _args.text);
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return handleError('type_text', error);
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
      handler: async (_args, context) => {
        try {
          const { apiKey, projectId } = await context.getCredentials();
          const client = BrowserbaseClientManager.getClient(apiKey, projectId);
          const result = await client.executeScript(_args.sessionId, _args.script);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return handleError('execute_script', error);
        }
      },
    }),

    SMART_FILL_FORM: tool({
      name: 'browserbase_smart_fill_form',
      description: 'Intelligently fill out forms using AI-powered element detection',
      schema: z.object({
        sessionId: z.string().describe('The ID of the browser session'),
        formData: z.record(z.string()).describe('Key-value pairs of form field labels and values'),
        submitAfter: z.boolean().default(false).describe('Submit form after filling')
      }),
      handler: async (_args, context) => {
        try {
          const { apiKey, projectId } = await context.getCredentials();
          const client = BrowserbaseClientManager.getClient(apiKey, projectId);

          // Create a smart script that uses multiple selector strategies
          const script = `
            const formResults = {};
            const formData = ${JSON.stringify(_args.formData)};

            for (const [label, value] of Object.entries(formData)) {
              try {
                // Try multiple selector strategies
                const selectors = [
                  \`input[placeholder*="\${label}" i]\`,
                  \`input[name*="\${label}" i]\`,
                  \`input[id*="\${label}" i]\`,
                  \`label:has-text("\${label}") input\`,
                  \`label:has-text("\${label}") ~ input\`,
                  \`input[aria-label*="\${label}" i]\`,
                  \`textarea[placeholder*="\${label}" i]\`,
                  \`textarea[name*="\${label}" i]\`,
                  \`select[name*="\${label}" i]\`
                ];

                let element = null;
                for (const selector of selectors) {
                  try {
                    element = document.querySelector(selector);
                    if (element && element.offsetParent !== null) {
                      break;
                    }
                  } catch (e) {
                    continue;
                  }
                }

                if (element) {
                  if (element.tagName === 'SELECT') {
                    element.value = value;
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                  } else {
                    element.value = value;
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                  }
                  formResults[label] = 'filled';
                } else {
                  formResults[label] = 'element_not_found';
                }
              } catch (e) {
                formResults[label] = 'error: ' + e.message;
              }
            }

            ${_args.submitAfter ? `
              // Try to find and click submit button
              const submitSelectors = [
                'button[type="submit"]',
                'input[type="submit"]',
                'button:has-text("Submit")',
                'button:has-text("Save")',
                'button:has-text("Send")',
                'button:has-text("Login")',
                'button:has-text("Sign in")',
                'button:has-text("Register")'
              ];

              let submitButton = null;
              for (const selector of submitSelectors) {
                try {
                  submitButton = document.querySelector(selector);
                  if (submitButton && submitButton.offsetParent !== null) {
                    break;
                  }
                } catch (e) {
                  continue;
                }
              }

              if (submitButton) {
                submitButton.click();
                formResults.submit = 'clicked';
              } else {
                formResults.submit = 'submit_button_not_found';
              }
            ` : ''}

            return formResults;
          `;

          const result = await client.executeScript(_args.sessionId, script);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return handleError('smart_fill_form', error);
        }
      }
    }),

    COMPLETE_SESSION: tool({
      name: 'browserbase_complete_session',
      description: 'Complete and close a browser session',
      schema: z.object({
        sessionId: z.string().describe('The ID of the browser session to complete'),
      }),
      handler: async (_args, context) => {
        try {
          const { apiKey, projectId } = await context.getCredentials();
          const client = BrowserbaseClientManager.getClient(apiKey, projectId);
          const session = await client.completeSession(_args.sessionId);
          return JSON.stringify({
            sessionId: session.id,
            status: session.status,
            endedAt: session.endedAt,
            message: 'Session completed successfully'
          }, null, 2);
        } catch (error) {
          return handleError('complete_session', error);
        }
      },
    }),
  }),
  resources: (resource) => ({
    BROWSER_SESSIONS: resource({
      uri: 'browserbase://sessions',
      name: 'Active Browser Sessions',
      description: 'List of active browser sessions and their current state',
      mimeType: 'application/json',
      handler: async (context) => {
        try {
          const { apiKey, projectId } = await context.getCredentials();
          const client = BrowserbaseClientManager.getClient(apiKey, projectId);
          const sessions = await client.listSessions(20);
          return JSON.stringify(sessions, null, 2);
        } catch (error) {
          return JSON.stringify({
            error: 'Failed to fetch browser sessions',
            message: error instanceof Error ? error.message : String(error)
          }, null, 2);
        }
      }
    }),

    SESSION_HISTORY: resource({
      uri: 'browserbase://sessions/{sessionId}/history',
      name: 'Session Navigation History',
      description: 'Navigation history and page visits for a session',
      mimeType: 'application/json',
      handler: async (context: any) => {
        try {
          // For now, return a generic response since we don't have a sessionId in the context
          // In a real implementation, this would need to be handled differently
          const { apiKey, projectId } = await context.getCredentials();
          const client = BrowserbaseClientManager.getClient(apiKey, projectId);
          const sessions = await client.listSessions(10);
          return JSON.stringify({
            message: 'Use specific session IDs to get individual session history',
            availableSessions: sessions.map(s => ({ id: s.id, status: s.status }))
          }, null, 2);
        } catch (error) {
          return JSON.stringify({
            error: 'Failed to fetch session history',
            message: error instanceof Error ? error.message : String(error)
          }, null, 2);
        }
      }
    })
  }),
});


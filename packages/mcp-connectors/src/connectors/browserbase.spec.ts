
import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { describe, expect, it, type vi } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { BrowserbaseConnectorConfig } from './browserbase';

// Mock Browserbase API responses
const mockSessionResponse = {
  id: 'session-123',
  status: 'RUNNING',
  startedAt: '2024-01-01T10:00:00Z',
  url: 'https://example.com',
  logs: ['Navigated to https://example.com', 'Page loaded successfully']
};

const mockSessionsListResponse = {
  sessions: [
    {
      id: 'session-123',
      status: 'RUNNING',
      startedAt: '2024-01-01T10:00:00Z',
      url: 'https://example.com'
    },
    {
      id: 'session-456',
      status: 'COMPLETED',
      startedAt: '2024-01-01T09:00:00Z',
      endedAt: '2024-01-01T09:30:00Z',
      url: 'https://google.com'
    }
  ]
};

const mockPageContentResponse = {
  url: 'https://example.com',
  title: 'Example Domain',
  content: 'This is the content of the example page. It contains various information about the domain.',
  screenshot: 'base64imagedata'
};

const mockScreenshotResponse = {
  url: 'https://example.com',
  screenshot: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77yQAAAABJRU5ErkJggg=='
};

const mockClickResponse = {
  success: true,
  message: 'Element clicked successfully'
};

const mockTypeResponse = {
  success: true,
  message: 'Text typed successfully'
};

const mockScriptResult = {
  result: 'Script executed successfully',
  value: 'Hello from browser!'
};

describe('#BrowserbaseConnectorConfig', () => {
  describe('.CREATE_SESSION', () => {
    describe('when session creation is successful', () => {
      it('returns formatted session information', async () => {
        const server = setupServer(
          http.post('https://api.browserbase.com/v1/sessions', () => {
            return HttpResponse.json(mockSessionResponse);
          })
        );
        server.listen();

        const tool = BrowserbaseConnectorConfig.tools.CREATE_SESSION as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'bb_test_key',
          projectId: 'proj_test_id'
        });

        const actual = await tool.handler({}, mockContext);

        server.close();

        expect(actual).toContain('sessionId');
        expect(actual).toContain('session-123');
        expect(actual).toContain('RUNNING');
        expect(actual).toContain('Browser session created successfully');
      });
    });

    describe('when API returns error', () => {
      it('returns error message', async () => {
        const server = setupServer(
          http.post('https://api.browserbase.com/v1/sessions', () => {
            return new HttpResponse('Invalid API key', { status: 401 });
          })
        );
        server.listen();

        const tool = BrowserbaseConnectorConfig.tools.CREATE_SESSION as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'invalid_key',
          projectId: 'invalid_project'
        });

        const actual = await tool.handler({}, mockContext);

        server.close();

        expect(actual).toContain('success');
        expect(actual).toContain('false');
        expect(actual).toContain('create_session');
        expect(actual).toContain('Browserbase API error (401)');
      });
    });
  });

  describe('.GET_SESSION', () => {
    describe('when session retrieval is successful', () => {
      it('returns formatted session data', async () => {
        const server = setupServer(
          http.get('https://api.browserbase.com/v1/sessions/session-123', () => {
            return HttpResponse.json(mockSessionResponse);
          })
        );
        server.listen();

        const tool = BrowserbaseConnectorConfig.tools.GET_SESSION as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'bb_test_key',
          projectId: 'proj_test_id'
        });

        const actual = await tool.handler({ sessionId: 'session-123' }, mockContext);

        server.close();

        expect(actual).toContain('session-123');
        expect(actual).toContain('RUNNING');
        expect(actual).toContain('https://example.com');
      });
    });

    describe('when session not found', () => {
      it('returns error message', async () => {
        const server = setupServer(
          http.get('https://api.browserbase.com/v1/sessions/session-999', () => {
            return new HttpResponse('Session not found', { status: 404 });
          })
        );
        server.listen();

        const tool = BrowserbaseConnectorConfig.tools.GET_SESSION as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'bb_test_key',
          projectId: 'proj_test_id'
        });

        const actual = await tool.handler({ sessionId: 'session-999' }, mockContext);

        server.close();

        expect(actual).toContain('get_session');
        expect(actual).toContain('Browserbase API error (404)');
      });
    });
  });

  describe('.LIST_SESSIONS', () => {
    describe('when sessions retrieval is successful', () => {
      it('returns formatted sessions list', async () => {
        const server = setupServer(
          http.get('https://api.browserbase.com/v1/sessions?limit=10', () => {
            return HttpResponse.json(mockSessionsListResponse);
          })
        );
        server.listen();

        const tool = BrowserbaseConnectorConfig.tools.LIST_SESSIONS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'bb_test_key',
          projectId: 'proj_test_id'
        });

        const actual = await tool.handler({ limit: 10 }, mockContext);

        server.close();

        expect(actual).toContain('session-123');
        expect(actual).toContain('session-456');
        expect(actual).toContain('RUNNING');
        expect(actual).toContain('COMPLETED');
      });
    });

    describe('when custom limit is provided', () => {
      it('uses the specified limit in request', async () => {
        const server = setupServer(
          http.get('https://api.browserbase.com/v1/sessions', ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get('limit')).toBe('5');
            return HttpResponse.json(mockSessionsListResponse);
          })
        );
        server.listen();

        const tool = BrowserbaseConnectorConfig.tools.LIST_SESSIONS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'bb_test_key',
          projectId: 'proj_test_id'
        });

        await tool.handler({ limit: 5 }, mockContext);

        server.close();
      });
    });
  });

  describe('.NAVIGATE', () => {
    describe('when navigation is successful', () => {
      it('returns formatted navigation response', async () => {
        const mockNavigateResponse = {
          success: true,
          url: 'https://google.com',
          title: 'Google'
        };

        const server = setupServer(
          http.post('https://api.browserbase.com/v1/sessions/session-123/navigate', () => {
            return HttpResponse.json(mockNavigateResponse);
          })
        );
        server.listen();

        const tool = BrowserbaseConnectorConfig.tools.NAVIGATE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'bb_test_key',
          projectId: 'proj_test_id'
        });

        const actual = await tool.handler({
          sessionId: 'session-123',
          url: 'https://google.com'
        }, mockContext);

        server.close();

        expect(actual).toContain('success');
        expect(actual).toContain('true');
        expect(actual).toContain('https://google.com');
        expect(actual).toContain('Google');
      });
    });

    describe('when navigation fails', () => {
      it('returns error message', async () => {
        const server = setupServer(
          http.post('https://api.browserbase.com/v1/sessions/session-123/navigate', () => {
            return new HttpResponse('Navigation timeout', { status: 408 });
          })
        );
        server.listen();

        const tool = BrowserbaseConnectorConfig.tools.NAVIGATE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'bb_test_key',
          projectId: 'proj_test_id'
        });

        const actual = await tool.handler({
          sessionId: 'session-123',
          url: 'https://invalid-url.com'
        }, mockContext);

        server.close();

        expect(actual).toContain('navigate');
        expect(actual).toContain('Browserbase API error (408)');
      });
    });
  });

  describe('.GET_PAGE_CONTENT', () => {
    describe('when content retrieval is successful', () => {
      it('returns formatted page content', async () => {
        const server = setupServer(
          http.get('https://api.browserbase.com/v1/sessions/session-123/page', () => {
            return HttpResponse.json(mockPageContentResponse);
          })
        );
        server.listen();

        const tool = BrowserbaseConnectorConfig.tools.GET_PAGE_CONTENT as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'bb_test_key',
          projectId: 'proj_test_id'
        });

        const actual = await tool.handler({ sessionId: 'session-123' }, mockContext);

        server.close();

        expect(actual).toContain('https://example.com');
        expect(actual).toContain('Example Domain');
        expect(actual).toContain('contentLength');
        expect(actual).toContain('contentPreview');
        expect(actual).toContain('hasScreenshot');
      });
    });

    describe('when page content retrieval fails', () => {
      it('returns error message', async () => {
        const server = setupServer(
          http.get('https://api.browserbase.com/v1/sessions/session-123/page', () => {
            return new HttpResponse('Session expired', { status: 410 });
          })
        );
        server.listen();

        const tool = BrowserbaseConnectorConfig.tools.GET_PAGE_CONTENT as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'bb_test_key',
          projectId: 'proj_test_id'
        });

        const actual = await tool.handler({ sessionId: 'session-123' }, mockContext);

        server.close();

        expect(actual).toContain('get_page_content');
        expect(actual).toContain('Browserbase API error (410)');
      });
    });
  });

  describe('.TAKE_SCREENSHOT', () => {
    describe('when screenshot is successful', () => {
      it('returns formatted screenshot data without image', async () => {
        const server = setupServer(
          http.get('https://api.browserbase.com/v1/sessions/session-123/screenshot', () => {
            return HttpResponse.json(mockScreenshotResponse);
          })
        );
        server.listen();

        const tool = BrowserbaseConnectorConfig.tools.TAKE_SCREENSHOT as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'bb_test_key',
          projectId: 'proj_test_id'
        });

        const actual = await tool.handler({
          sessionId: 'session-123'
        }, mockContext);

        server.close();

        expect(actual).toContain('https://example.com');
        expect(actual).toContain('screenshotSize');
        expect(actual).toContain('full-page');
        expect(actual).toBeDefined();
      });
    });

    describe('when returnImage is true', () => {
      it('includes base64 image data in response', async () => {
        const server = setupServer(
          http.get('https://api.browserbase.com/v1/sessions/session-123/screenshot', () => {
            return HttpResponse.json(mockScreenshotResponse);
          })
        );
        server.listen();

        const tool = BrowserbaseConnectorConfig.tools.TAKE_SCREENSHOT as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'bb_test_key',
          projectId: 'proj_test_id'
        });

        const actual = await tool.handler({
          sessionId: 'session-123',
          returnImage: true
        }, mockContext);

        server.close();

        expect(actual).toContain('image');
        expect(actual).toContain('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77yQAAAABJRU5ErkJggg==');
      });
    });

    describe('when element selector is provided', () => {
      it('uses element-specific screenshot endpoint', async () => {
        const server = setupServer(
          http.get('https://api.browserbase.com/v1/sessions/session-123/screenshot', ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get('selector')).toBe('.header');
            return HttpResponse.json(mockScreenshotResponse);
          })
        );
        server.listen();

        const tool = BrowserbaseConnectorConfig.tools.TAKE_SCREENSHOT as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'bb_test_key',
          projectId: 'proj_test_id'
        });

        await tool.handler({
          sessionId: 'session-123',
          element: '.header'
        }, mockContext);

        server.close();
      });
    });

    describe('when screenshot fails', () => {
      it('returns error message', async () => {
        const server = setupServer(
          http.get('https://api.browserbase.com/v1/sessions/session-123/screenshot', () => {
            return new HttpResponse('Screenshot failed', { status: 500 });
          })
        );
        server.listen();

        const tool = BrowserbaseConnectorConfig.tools.TAKE_SCREENSHOT as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'bb_test_key',
          projectId: 'proj_test_id'
        });

        const actual = await tool.handler({
          sessionId: 'session-123'
        }, mockContext);

        server.close();

        expect(actual).toContain('take_screenshot');
        expect(actual).toContain('Browserbase API error (500)');
      });
    });
  });

  describe('.SMART_FILL_FORM', () => {
    describe('when form filling is successful', () => {
      it('returns formatted form results', async () => {
        const mockFormResult = {
          'username': 'filled',
          'password': 'filled',
          'submit': 'clicked'
        };

        const server = setupServer(
          http.post('https://api.browserbase.com/v1/sessions/session-123/execute', () => {
            return HttpResponse.json(mockFormResult);
          })
        );
        server.listen();

        const tool = BrowserbaseConnectorConfig.tools.SMART_FILL_FORM as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'bb_test_key',
          projectId: 'proj_test_id'
        });

        const actual = await tool.handler({
          sessionId: 'session-123',
          formData: {
            username: 'testuser',
            password: 'testpass'
          },
          submitAfter: true
        }, mockContext);

        server.close();

        expect(actual).toContain('username');
        expect(actual).toContain('password');
        expect(actual).toContain('filled');
      });
    });

    describe('when form filling fails', () => {
      it('returns error message', async () => {
        const server = setupServer(
          http.post('https://api.browserbase.com/v1/sessions/session-123/execute', () => {
            return new HttpResponse('Script execution failed', { status: 400 });
          })
        );
        server.listen();

        const tool = BrowserbaseConnectorConfig.tools.SMART_FILL_FORM as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'bb_test_key',
          projectId: 'proj_test_id'
        });

        const actual = await tool.handler({
          sessionId: 'session-123',
          formData: {
            username: 'testuser'
          }
        }, mockContext);

        server.close();

        expect(actual).toContain('smart_fill_form');
        expect(actual).toContain('Browserbase API error (400)');
      });
    });
  });

  describe('.CLICK_ELEMENT', () => {
    describe('when element click is successful', () => {
      it('returns formatted click response', async () => {
        const server = setupServer(
          http.post('https://api.browserbase.com/v1/sessions/session-123/click', () => {
            return HttpResponse.json(mockClickResponse);
          })
        );
        server.listen();

        const tool = BrowserbaseConnectorConfig.tools.CLICK_ELEMENT as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'bb_test_key',
          projectId: 'proj_test_id'
        });

        const actual = await tool.handler({
          sessionId: 'session-123',
          selector: '.submit-button'
        }, mockContext);

        server.close();

        expect(actual).toContain('success');
        expect(actual).toContain('true');
        expect(actual).toContain('Element clicked successfully');
      });
    });

    describe('when element not found', () => {
      it('returns error message', async () => {
        const server = setupServer(
          http.post('https://api.browserbase.com/v1/sessions/session-123/click', () => {
            return new HttpResponse('Element not found', { status: 404 });
          })
        );
        server.listen();

        const tool = BrowserbaseConnectorConfig.tools.CLICK_ELEMENT as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'bb_test_key',
          projectId: 'proj_test_id'
        });

        const actual = await tool.handler({
          sessionId: 'session-123',
          selector: '.nonexistent'
        }, mockContext);

        server.close();

        expect(actual).toContain('click_element');
        expect(actual).toContain('Browserbase API error (404)');
      });
    });
  });

  describe('.TYPE_TEXT', () => {
    describe('when text typing is successful', () => {
      it('returns formatted type response', async () => {
        const server = setupServer(
          http.post('https://api.browserbase.com/v1/sessions/session-123/type', () => {
            return HttpResponse.json(mockTypeResponse);
          })
        );
        server.listen();

        const tool = BrowserbaseConnectorConfig.tools.TYPE_TEXT as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'bb_test_key',
          projectId: 'proj_test_id'
        });

        const actual = await tool.handler({
          sessionId: 'session-123',
          selector: '#username',
          text: 'testuser'
        }, mockContext);

        server.close();

        expect(actual).toContain('success');
        expect(actual).toContain('true');
        expect(actual).toContain('Text typed successfully');
      });
    });

    describe('when element not found', () => {
      it('returns error message', async () => {
        const server = setupServer(
          http.post('https://api.browserbase.com/v1/sessions/session-123/type', () => {
            return new HttpResponse('Input element not found', { status: 404 });
          })
        );
        server.listen();

        const tool = BrowserbaseConnectorConfig.tools.TYPE_TEXT as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'bb_test_key',
          projectId: 'proj_test_id'
        });

        const actual = await tool.handler({
          sessionId: 'session-123',
          selector: '#nonexistent',
          text: 'test'
        }, mockContext);

        server.close();

        expect(actual).toContain('type_text');
        expect(actual).toContain('Browserbase API error (404)');
      });
    });
  });

  describe('.EXECUTE_SCRIPT', () => {
    describe('when script execution is successful', () => {
      it('returns formatted script result', async () => {
        const server = setupServer(
          http.post('https://api.browserbase.com/v1/sessions/session-123/execute', () => {
            return HttpResponse.json(mockScriptResult);
          })
        );
        server.listen();

        const tool = BrowserbaseConnectorConfig.tools.EXECUTE_SCRIPT as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'bb_test_key',
          projectId: 'proj_test_id'
        });

        const actual = await tool.handler({
          sessionId: 'session-123',
          script: 'return document.title;'
        }, mockContext);

        server.close();

        expect(actual).toContain('Script executed successfully');
        expect(actual).toContain('Hello from browser!');
      });
    });

    describe('when script execution fails', () => {
      it('returns error message', async () => {
        const server = setupServer(
          http.post('https://api.browserbase.com/v1/sessions/session-123/execute', () => {
            return new HttpResponse('Script syntax error', { status: 400 });
          })
        );
        server.listen();

        const tool = BrowserbaseConnectorConfig.tools.EXECUTE_SCRIPT as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'bb_test_key',
          projectId: 'proj_test_id'
        });

        const actual = await tool.handler({
          sessionId: 'session-123',
          script: 'invalid syntax {{{'
        }, mockContext);

        server.close();

        expect(actual).toContain('execute_script');
        expect(actual).toContain('Browserbase API error (400)');
      });
    });
  });

  describe('.COMPLETE_SESSION', () => {
    describe('when session completion is successful', () => {
      it('returns formatted completion response', async () => {
        const mockCompleteResponse = {
          id: 'session-123',
          status: 'COMPLETED',
          endedAt: '2024-01-01T11:00:00Z'
        };

        const server = setupServer(
          http.post('https://api.browserbase.com/v1/sessions/session-123/complete', () => {
            return HttpResponse.json(mockCompleteResponse);
          })
        );
        server.listen();

        const tool = BrowserbaseConnectorConfig.tools.COMPLETE_SESSION as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'bb_test_key',
          projectId: 'proj_test_id'
        });

        const actual = await tool.handler({
          sessionId: 'session-123'
        }, mockContext);

        server.close();

        expect(actual).toContain('session-123');
        expect(actual).toContain('COMPLETED');
        expect(actual).toContain('Session completed successfully');
      });
    });

    describe('when session completion fails', () => {
      it('returns error message', async () => {
        const server = setupServer(
          http.post('https://api.browserbase.com/v1/sessions/session-123/complete', () => {
            return new HttpResponse('Session already completed', { status: 409 });
          })
        );
        server.listen();

        const tool = BrowserbaseConnectorConfig.tools.COMPLETE_SESSION as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'bb_test_key',
          projectId: 'proj_test_id'
        });

        const actual = await tool.handler({
          sessionId: 'session-123'
        }, mockContext);

        server.close();

        expect(actual).toContain('complete_session');
        expect(actual).toContain('Browserbase API error (409)');
      });
    });
  });
});

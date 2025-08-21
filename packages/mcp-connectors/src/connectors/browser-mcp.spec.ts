import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { describe, expect, it } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { BrowserMCPConnectorConfig } from './browser-mcp';

const server = setupServer(
  http.post('http://localhost:3001/tools/call', () => {
    return HttpResponse.json({
      result: {
        content: [{ type: 'text', text: 'Operation completed successfully' }],
      },
    });
  })
);

describe('#BrowserMCPConnector', () => {
  describe('.NAVIGATE', () => {
    describe('when navigating to a valid URL', () => {
      it('returns success message', async () => {
        server.listen();

        const tool = BrowserMCPConnectorConfig.tools.NAVIGATE as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          setup: { serverUrl: 'http://localhost:3001' },
        });

        const actual = await tool.handler({ url: 'https://example.com' }, mockContext);

        expect(actual).toBe('Operation completed successfully');

        server.close();
      });
    });

    describe('when server is unreachable', () => {
      it('returns error message', async () => {
        const tool = BrowserMCPConnectorConfig.tools.NAVIGATE as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          setup: { serverUrl: 'http://localhost:9999' },
        });

        const actual = await tool.handler({ url: 'https://example.com' }, mockContext);

        expect(actual).toContain('Failed to navigate');
      });
    });
  });

  describe('.CLICK', () => {
    describe('when clicking on a valid selector', () => {
      it('returns success message', async () => {
        server.listen();

        const tool = BrowserMCPConnectorConfig.tools.CLICK as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          setup: { serverUrl: 'http://localhost:3001' },
        });

        const actual = await tool.handler({ selector: '#submit-button' }, mockContext);

        expect(actual).toBe('Operation completed successfully');

        server.close();
      });
    });

    describe('when server returns error', () => {
      it('returns error message', async () => {
        const errorServer = setupServer(
          http.post('http://localhost:3001/tools/call', () => {
            return HttpResponse.json(
              { error: { message: 'Element not found' } },
              { status: 400 }
            );
          })
        );
        errorServer.listen();

        const tool = BrowserMCPConnectorConfig.tools.CLICK as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          setup: { serverUrl: 'http://localhost:3001' },
        });

        const actual = await tool.handler({ selector: '#invalid-selector' }, mockContext);

        expect(actual).toContain('Failed to click');

        errorServer.close();
      });
    });
  });

  describe('.TYPE', () => {
    describe('when typing text with selector', () => {
      it('returns success message', async () => {
        server.listen();

        const tool = BrowserMCPConnectorConfig.tools.TYPE as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          setup: { serverUrl: 'http://localhost:3001' },
        });

        const actual = await tool.handler(
          {
            text: 'hello world',
            selector: '#input-field',
          },
          mockContext
        );

        expect(actual).toBe('Operation completed successfully');

        server.close();
      });
    });

    describe('when typing text without selector', () => {
      it('returns success message', async () => {
        server.listen();

        const tool = BrowserMCPConnectorConfig.tools.TYPE as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          setup: { serverUrl: 'http://localhost:3001' },
        });

        const actual = await tool.handler({ text: 'hello world' }, mockContext);

        expect(actual).toBe('Operation completed successfully');

        server.close();
      });
    });
  });

  describe('.HOVER', () => {
    describe('when hovering over a valid selector', () => {
      it('returns success message', async () => {
        server.listen();

        const tool = BrowserMCPConnectorConfig.tools.HOVER as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          setup: { serverUrl: 'http://localhost:3001' },
        });

        const actual = await tool.handler({ selector: '.hover-element' }, mockContext);

        expect(actual).toBe('Operation completed successfully');

        server.close();
      });
    });
  });

  describe('.DRAG', () => {
    describe('when dragging from one element to another', () => {
      it('returns success message', async () => {
        server.listen();

        const tool = BrowserMCPConnectorConfig.tools.DRAG as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          setup: { serverUrl: 'http://localhost:3001' },
        });

        const actual = await tool.handler(
          {
            startSelector: '#draggable',
            endSelector: '#dropzone',
          },
          mockContext
        );

        expect(actual).toBe('Operation completed successfully');

        server.close();
      });
    });
  });

  describe('.SELECT_OPTION', () => {
    describe('when selecting a valid option', () => {
      it('returns success message', async () => {
        server.listen();

        const tool = BrowserMCPConnectorConfig.tools.SELECT_OPTION as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          setup: { serverUrl: 'http://localhost:3001' },
        });

        const actual = await tool.handler(
          {
            selector: '#dropdown',
            value: 'option1',
          },
          mockContext
        );

        expect(actual).toBe('Operation completed successfully');

        server.close();
      });
    });
  });

  describe('.SNAPSHOT', () => {
    describe('when capturing page snapshot', () => {
      it('returns success message', async () => {
        server.listen();

        const tool = BrowserMCPConnectorConfig.tools.SNAPSHOT as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          setup: { serverUrl: 'http://localhost:3001' },
        });

        const actual = await tool.handler({}, mockContext);

        expect(actual).toBe('Operation completed successfully');

        server.close();
      });
    });
  });

  describe('.SCREENSHOT', () => {
    describe('when taking a screenshot successfully', () => {
      it('returns success message', async () => {
        const screenshotServer = setupServer(
          http.post('http://localhost:3001/tools/call', () => {
            return HttpResponse.json({
              result: {
                content: [{ type: 'image', data: 'base64-image-data' }],
              },
            });
          })
        );
        screenshotServer.listen();

        const tool = BrowserMCPConnectorConfig.tools.SCREENSHOT as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          setup: { serverUrl: 'http://localhost:3001' },
        });

        const actual = await tool.handler({}, mockContext);

        expect(actual).toBe('Screenshot captured successfully');

        screenshotServer.close();
      });
    });

    describe('when screenshot returns text content', () => {
      it('returns the text content', async () => {
        server.listen();

        const tool = BrowserMCPConnectorConfig.tools.SCREENSHOT as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          setup: { serverUrl: 'http://localhost:3001' },
        });

        const actual = await tool.handler({}, mockContext);

        expect(actual).toBe('Operation completed successfully');

        server.close();
      });
    });
  });

  describe('.GET_CONSOLE_LOGS', () => {
    describe('when retrieving console logs', () => {
      it('returns console logs', async () => {
        const logsServer = setupServer(
          http.post('http://localhost:3001/tools/call', () => {
            return HttpResponse.json({
              result: {
                content: [{ type: 'text', text: 'console.log messages here' }],
              },
            });
          })
        );
        logsServer.listen();

        const tool = BrowserMCPConnectorConfig.tools
          .GET_CONSOLE_LOGS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          setup: { serverUrl: 'http://localhost:3001' },
        });

        const actual = await tool.handler({}, mockContext);

        expect(actual).toBe('console.log messages here');

        logsServer.close();
      });
    });
  });

  describe('.GO_BACK', () => {
    describe('when navigating back in history', () => {
      it('returns success message', async () => {
        server.listen();

        const tool = BrowserMCPConnectorConfig.tools.GO_BACK as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          setup: { serverUrl: 'http://localhost:3001' },
        });

        const actual = await tool.handler({}, mockContext);

        expect(actual).toBe('Operation completed successfully');

        server.close();
      });
    });
  });

  describe('.GO_FORWARD', () => {
    describe('when navigating forward in history', () => {
      it('returns success message', async () => {
        server.listen();

        const tool = BrowserMCPConnectorConfig.tools.GO_FORWARD as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          setup: { serverUrl: 'http://localhost:3001' },
        });

        const actual = await tool.handler({}, mockContext);

        expect(actual).toBe('Operation completed successfully');

        server.close();
      });
    });
  });

  describe('.PRESS_KEY', () => {
    describe('when pressing a valid key', () => {
      it('returns success message', async () => {
        server.listen();

        const tool = BrowserMCPConnectorConfig.tools.PRESS_KEY as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          setup: { serverUrl: 'http://localhost:3001' },
        });

        const actual = await tool.handler({ key: 'Enter' }, mockContext);

        expect(actual).toBe('Operation completed successfully');

        server.close();
      });
    });

    describe('when pressing special keys', () => {
      it('returns success message for Tab key', async () => {
        server.listen();

        const tool = BrowserMCPConnectorConfig.tools.PRESS_KEY as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          setup: { serverUrl: 'http://localhost:3001' },
        });

        const actual = await tool.handler({ key: 'Tab' }, mockContext);

        expect(actual).toBe('Operation completed successfully');

        server.close();
      });
    });
  });

  describe('.WAIT', () => {
    describe('when waiting for specified time', () => {
      it('returns success message', async () => {
        server.listen();

        const tool = BrowserMCPConnectorConfig.tools.WAIT as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          setup: { serverUrl: 'http://localhost:3001' },
        });

        const actual = await tool.handler({ milliseconds: 1000 }, mockContext);

        expect(actual).toBe('Operation completed successfully');

        server.close();
      });
    });

    describe('when waiting with zero milliseconds', () => {
      it('returns success message', async () => {
        server.listen();

        const tool = BrowserMCPConnectorConfig.tools.WAIT as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          setup: { serverUrl: 'http://localhost:3001' },
        });

        const actual = await tool.handler({ milliseconds: 0 }, mockContext);

        expect(actual).toBe('Operation completed successfully');

        server.close();
      });
    });
  });
});

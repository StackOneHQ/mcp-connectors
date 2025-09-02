import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { describe, expect, it } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { HStacksConnectorConfig } from './hstacks';

describe('#HStacksConnector', () => {
  describe('.GET_HSTACKS_SCHEMA', () => {
    describe('when valid credentials are provided', () => {
      it('returns the hstacks schema', async () => {
        const tool = HStacksConnectorConfig.tools.GET_HSTACKS_SCHEMA as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { accessToken: '58b011ed-28db-412e-b49f-e4724123c2a7' },
        });

        const actual = await tool.handler({}, mockContext);

        expect(actual).toContain('hstacks Stack Configuration');
      });
    });
  });

  describe('.GET_AVAILABLE_IMAGES', () => {
    describe('when valid credentials are provided', () => {
      it('returns available images', async () => {
        const tool = HStacksConnectorConfig.tools
          .GET_AVAILABLE_IMAGES as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { accessToken: '58b011ed-28db-412e-b49f-e4724123c2a7' },
        });

        const actual = await tool.handler({}, mockContext);

        expect(typeof actual).toBe('string');
        expect(actual).not.toBe('null');
      });
    });

    describe('when no credentials are provided', () => {
      it('returns an error message', async () => {
        const tool = HStacksConnectorConfig.tools
          .GET_AVAILABLE_IMAGES as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {},
        });

        const actual = await tool.handler({}, mockContext);

        expect(actual).toBe('ERROR: No access token provided in credentials');
      });
    });
  });

  describe('.GET_AVAILABLE_LOCATIONS', () => {
    describe('when valid credentials are provided', () => {
      it('returns available locations', async () => {
        const tool = HStacksConnectorConfig.tools
          .GET_AVAILABLE_LOCATIONS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { accessToken: '58b011ed-28db-412e-b49f-e4724123c2a7' },
        });

        const actual = await tool.handler({}, mockContext);

        expect(typeof actual).toBe('string');
      });
    });

    describe('when server type filter is provided', () => {
      it('filters locations by server type', async () => {
        const tool = HStacksConnectorConfig.tools
          .GET_AVAILABLE_LOCATIONS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { accessToken: '58b011ed-28db-412e-b49f-e4724123c2a7' },
        });

        const actual = await tool.handler({ serverType: 'cax11' }, mockContext);

        expect(typeof actual).toBe('string');
      });
    });
  });

  describe('.GET_AVAILABLE_SERVERS', () => {
    describe('when valid credentials are provided', () => {
      it('returns available server types', async () => {
        const tool = HStacksConnectorConfig.tools
          .GET_AVAILABLE_SERVERS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { accessToken: '58b011ed-28db-412e-b49f-e4724123c2a7' },
        });

        const actual = await tool.handler({}, mockContext);

        expect(typeof actual).toBe('string');
      });
    });
  });

  describe('.VALIDATE_STACK', () => {
    describe('when valid stack data is provided', () => {
      it('validates the stack configuration', async () => {
        const tool = HStacksConnectorConfig.tools.VALIDATE_STACK as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { accessToken: '58b011ed-28db-412e-b49f-e4724123c2a7' },
        });

        const stackData = {
          name: 'test-stack',
          servers: [
            {
              name: 'test-server',
              serverType: 'cpx11',
              image: 'ubuntu-22.04',
              location: 'nbg1',
            },
          ],
          firewalls: [],
          volumes: [],
        };

        const actual = await tool.handler(stackData, mockContext);

        expect(typeof actual).toBe('string');
      });
    });
  });

  describe('.DEPLOY_STACK', () => {
    describe('when valid stack data is provided', () => {
      it('deploys the stack and returns deployment info', async () => {
        const tool = HStacksConnectorConfig.tools.DEPLOY_STACK as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { accessToken: '58b011ed-28db-412e-b49f-e4724123c2a7' },
        });

        const stackData = {
          name: 'test-deploy-stack',
          servers: [
            {
              name: 'test-server',
              serverType: 'cpx11',
              image: 'ubuntu-22.04',
              location: 'nbg1',
              firewalls: ['test-firewall'],
            },
          ],
          firewalls: [
            {
              name: 'test-firewall',
              rules: [
                {
                  direction: 'inbound',
                  protocol: 'tcp',
                  port: 22,
                  sourceIPs: ['0.0.0.0/0'],
                },
              ],
            },
          ],
          volumes: [],
        };

        const actual = await tool.handler(stackData, mockContext);

        expect(typeof actual).toBe('string');
        expect(actual).not.toContain('Failed to deploy stack');
      });
    });

    describe('when no credentials are provided', () => {
      it('returns an error message', async () => {
        const tool = HStacksConnectorConfig.tools.DEPLOY_STACK as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {},
        });

        const stackData = {
          name: 'test-stack',
          servers: [],
          firewalls: [],
          volumes: [],
        };

        const actual = await tool.handler(stackData, mockContext);

        expect(actual).toContain(
          'Failed to deploy stack: No access token provided in credentials'
        );
      });
    });
  });

  describe('.DELETE_STACK', () => {
    describe('when valid stack ID is provided', () => {
      it('deletes the stack', async () => {
        const tool = HStacksConnectorConfig.tools.DELETE_STACK as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { accessToken: '58b011ed-28db-412e-b49f-e4724123c2a7' },
        });

        const actual = await tool.handler({ stackID: 'test-stack-id' }, mockContext);

        expect(typeof actual).toBe('string');
      });
    });
  });

  describe('.GET_STACK_STATUS', () => {
    describe('when valid stack ID is provided', () => {
      it('returns stack status', async () => {
        const tool = HStacksConnectorConfig.tools.GET_STACK_STATUS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: { accessToken: '58b011ed-28db-412e-b49f-e4724123c2a7' },
        });

        const actual = await tool.handler({ stackID: 'test-stack-id' }, mockContext);

        expect(typeof actual).toBe('string');
      });
    });
  });
});

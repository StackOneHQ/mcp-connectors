import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { describe, expect, it } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { MCPCreatorConnectorConfig } from './mcp-creator';

describe('#MCPCreatorConnector', () => {
  describe('.GENERATE_CONNECTOR_TEMPLATE', () => {
    describe('when valid arguments are provided', () => {
      it('returns a valid connector template', async () => {
        const tool = MCPCreatorConnectorConfig.tools
          .GENERATE_CONNECTOR_TEMPLATE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler(
          {
            name: 'Test Service',
            description: 'A test service connector',
            apiType: 'rest-api',
            tools: ['Get Data', 'Send Message'],
          },
          mockContext
        );

        const parsed = JSON.parse(actual);
        expect(parsed.name).toBe('Test Service');
        expect(parsed.key).toBe('test-service');
        expect(parsed.description).toBe('A test service connector');
        expect(parsed.tools).toHaveLength(2);
        expect(parsed.tools[0].name).toBe('get_data');
        expect(parsed.tools[1].name).toBe('send_message');
      });
    });

    describe('when oauth api type is specified', () => {
      it('includes oauth credentials in template', async () => {
        const tool = MCPCreatorConnectorConfig.tools
          .GENERATE_CONNECTOR_TEMPLATE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler(
          {
            name: 'OAuth Service',
            description: 'OAuth-based service',
            apiType: 'oauth',
            tools: ['Authenticate'],
          },
          mockContext
        );

        const parsed = JSON.parse(actual);
        expect(parsed.credentials).toHaveProperty('clientId');
        expect(parsed.credentials).toHaveProperty('clientSecret');
        expect(parsed.credentials).toHaveProperty('redirectUri');
      });
    });

    describe('when basic-auth api type is specified', () => {
      it('includes basic auth credentials in template', async () => {
        const tool = MCPCreatorConnectorConfig.tools
          .GENERATE_CONNECTOR_TEMPLATE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler(
          {
            name: 'Basic Auth Service',
            description: 'Basic auth service',
            apiType: 'basic-auth',
            tools: ['Login'],
          },
          mockContext
        );

        const parsed = JSON.parse(actual);
        expect(parsed.credentials).toHaveProperty('username');
        expect(parsed.credentials).toHaveProperty('password');
      });
    });

    describe('when no auth is required', () => {
      it('includes empty credentials object', async () => {
        const tool = MCPCreatorConnectorConfig.tools
          .GENERATE_CONNECTOR_TEMPLATE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler(
          {
            name: 'No Auth Service',
            description: 'Service without auth',
            apiType: 'none',
            tools: ['Public Data'],
          },
          mockContext
        );

        const parsed = JSON.parse(actual);
        expect(Object.keys(parsed.credentials)).toHaveLength(0);
      });
    });
  });

  describe('.GENERATE_CONNECTOR_CODE', () => {
    describe('when valid template is provided', () => {
      it('returns properly formatted TypeScript code', async () => {
        const tool = MCPCreatorConnectorConfig.tools
          .GENERATE_CONNECTOR_CODE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const template = {
          name: 'Test Connector',
          key: 'test-connector',
          description: 'Test description',
          tools: [
            {
              name: 'test_tool',
              description: 'Test tool',
              schema: {},
              implementation:
                'TEST_TOOL: tool({ name: "test", description: "test", schema: z.object({}), handler: async () => "test" })',
            },
          ],
          credentials: { apiKey: 'z.string().describe("API Key")' },
          setup: { env: 'z.string().describe("Environment")' },
        };

        const actual = await tool.handler(
          {
            template: JSON.stringify(template),
          },
          mockContext
        );

        expect(actual).toContain('import { mcpConnectorConfig }');
        expect(actual).toContain("import { z } from 'zod'");
        expect(actual).toContain('TestConnectorConnectorConfig');
        expect(actual).toContain("name: 'Test Connector'");
        expect(actual).toContain("key: 'test-connector'");
        expect(actual).toContain('apiKey: z.string().describe("API Key")');
      });
    });

    describe('when invalid template JSON is provided', () => {
      it('returns error message', async () => {
        const tool = MCPCreatorConnectorConfig.tools
          .GENERATE_CONNECTOR_CODE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler(
          {
            template: 'invalid json',
          },
          mockContext
        );

        expect(actual).toContain('Failed to generate connector code');
      });
    });
  });

  describe('.GENERATE_TEST_CODE', () => {
    describe('when valid template is provided', () => {
      it('returns properly formatted test code', async () => {
        const tool = MCPCreatorConnectorConfig.tools
          .GENERATE_TEST_CODE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const template = {
          name: 'Test Connector',
          key: 'test-connector',
          description: 'Test description',
          tools: [
            {
              name: 'test_tool',
              description: 'Test tool',
              schema: {},
            },
          ],
          credentials: {},
          setup: {},
        };

        const actual = await tool.handler(
          {
            template: JSON.stringify(template),
          },
          mockContext
        );

        expect(actual).toContain('import { describe, expect, it }');
        expect(actual).toContain('import type { MCPToolDefinition }');
        expect(actual).toContain('import { createMockConnectorContext }');
        expect(actual).toContain('#TestConnectorConnector');
        expect(actual).toContain('.TEST_TOOL');
        expect(actual).toContain('when valid arguments are provided');
        expect(actual).toContain('when API request fails');
      });
    });

    describe('when multiple tools are in template', () => {
      it('generates test cases for all tools', async () => {
        const tool = MCPCreatorConnectorConfig.tools
          .GENERATE_TEST_CODE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const template = {
          name: 'Multi Tool Connector',
          key: 'multi-tool',
          description: 'Test description',
          tools: [
            { name: 'first_tool', description: 'First tool', schema: {} },
            { name: 'second_tool', description: 'Second tool', schema: {} },
          ],
          credentials: {},
          setup: {},
        };

        const actual = await tool.handler(
          {
            template: JSON.stringify(template),
          },
          mockContext
        );

        expect(actual).toContain('.FIRST_TOOL');
        expect(actual).toContain('.SECOND_TOOL');
      });
    });

    describe('when invalid template JSON is provided', () => {
      it('returns error message', async () => {
        const tool = MCPCreatorConnectorConfig.tools
          .GENERATE_TEST_CODE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler(
          {
            template: 'invalid json',
          },
          mockContext
        );

        expect(actual).toContain('Failed to generate test code');
      });
    });
  });

  describe('.ANALYZE_CODE_PATTERNS', () => {
    describe('when TypeScript code with MCP patterns is provided', () => {
      it('identifies MCP connector patterns', async () => {
        const tool = MCPCreatorConnectorConfig.tools
          .ANALYZE_CODE_PATTERNS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const code = `
          import { mcpConnectorConfig } from '@stackone/mcp-config-types';
          import { z } from 'zod';
          
          export const TestConfig = mcpConnectorConfig({
            tools: (tool) => ({
              TEST: tool({
                handler: async (args) => {
                  try {
                    return 'success';
                  } catch (error) {
                    return 'error';
                  }
                }
              })
            })
          });
        `;

        const actual = await tool.handler({ code }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.patterns).toContain('MCP Connector Configuration Pattern');
        expect(parsed.patterns).toContain('Zod Schema Validation');
        expect(parsed.patterns).toContain('Error Handling Pattern');
        expect(parsed.imports).toContain(
          "import { mcpConnectorConfig } from '@stackone/mcp-config-types'"
        );
        expect(parsed.imports).toContain("import { z } from 'zod'");
      });
    });

    describe('when code lacks error handling', () => {
      it('recommends adding error handling', async () => {
        const tool = MCPCreatorConnectorConfig.tools
          .ANALYZE_CODE_PATTERNS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const code = `
          function simpleFunction() {
            return 'no error handling';
          }
        `;

        const actual = await tool.handler({ code }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.recommendations).toContain(
          'Add error handling with try/catch blocks'
        );
      });
    });

    describe('when code lacks Zod schemas', () => {
      it('recommends adding Zod validation', async () => {
        const tool = MCPCreatorConnectorConfig.tools
          .ANALYZE_CODE_PATTERNS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const code = `
          function basicFunction() {
            return 'basic code';
          }
        `;

        const actual = await tool.handler({ code }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.recommendations).toContain('Use Zod schemas for input validation');
      });
    });

    describe('when invalid code causes analysis error', () => {
      it('returns error message', async () => {
        const tool = MCPCreatorConnectorConfig.tools
          .ANALYZE_CODE_PATTERNS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        // Simulate an error by passing null which will cause JSON parsing issues
        // biome-ignore lint/suspicious/noExplicitAny: Intentionally testing error case
        const actual = await tool.handler({ code: null as any }, mockContext);

        expect(actual).toContain('Failed to analyze code patterns');
      });
    });
  });

  describe('.GET_CONNECTOR_BEST_PRACTICES', () => {
    describe('when called', () => {
      it('returns comprehensive best practices', async () => {
        const tool = MCPCreatorConnectorConfig.tools
          .GET_CONNECTOR_BEST_PRACTICES as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler({}, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed).toHaveProperty('structure');
        expect(parsed).toHaveProperty('authentication');
        expect(parsed).toHaveProperty('tools');
        expect(parsed).toHaveProperty('api_calls');
        expect(parsed).toHaveProperty('testing');
        expect(parsed).toHaveProperty('development');

        expect(parsed.structure).toContain(
          'Use mcpConnectorConfig function to create connector configuration'
        );
        expect(parsed.authentication).toContain(
          'Use Zod schemas for credential validation'
        );
        expect(parsed.tools).toContain('Use Zod schemas for input validation');
        expect(parsed.api_calls).toContain(
          'Use native fetch() for HTTP requests - avoid external libraries'
        );
        expect(parsed.testing).toContain('Write tests for every tool using vitest');
        expect(parsed.development).toContain('Use bun as the package manager');
      });
    });
  });

  describe('.GENERATE_PROJECT_SETUP', () => {
    describe('when connector name is provided', () => {
      it('returns project setup instructions', async () => {
        const tool = MCPCreatorConnectorConfig.tools
          .GENERATE_PROJECT_SETUP as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler(
          {
            connectorName: 'MyConnector',
          },
          mockContext
        );
        const parsed = JSON.parse(actual);

        expect(parsed).toHaveProperty('repository_setup');
        expect(parsed).toHaveProperty('development_workflow');
        expect(parsed).toHaveProperty('file_structure');
        expect(parsed).toHaveProperty('commands');

        expect(parsed.file_structure.connector_file).toContain('myconnector.ts');
        expect(parsed.file_structure.test_file).toContain('myconnector.spec.ts');
        expect(parsed.commands.test_connector).toContain('myconnector');
      });
    });
  });

  describe('.GET_CLAUDE_AGENT_PATTERNS', () => {
    describe('when called', () => {
      it('returns Claude agent patterns and best practices', async () => {
        const tool = MCPCreatorConnectorConfig.tools
          .GET_CLAUDE_AGENT_PATTERNS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler({}, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed).toHaveProperty('planning_patterns');
        expect(parsed).toHaveProperty('code_analysis_patterns');
        expect(parsed).toHaveProperty('implementation_patterns');
        expect(parsed).toHaveProperty('testing_patterns');
        expect(parsed).toHaveProperty('git_workflow_patterns');
        expect(parsed).toHaveProperty('communication_patterns');

        expect(parsed.planning_patterns).toContain(
          'Break complex tasks into structured todo lists'
        );
        expect(parsed.code_analysis_patterns).toContain(
          'Read existing code patterns before implementing new features'
        );
        expect(parsed.implementation_patterns).toContain(
          'Start with the simplest working implementation'
        );
        expect(parsed.testing_patterns).toContain(
          'Write tests that cover happy path, error cases, and edge cases'
        );
        expect(parsed.git_workflow_patterns).toContain(
          'Create descriptive commit messages that explain the "why"'
        );
        expect(parsed.communication_patterns).toContain(
          'Provide clear progress updates in GitHub comments'
        );
      });
    });
  });
});

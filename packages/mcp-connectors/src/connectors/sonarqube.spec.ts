import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { SonarQubeConnectorConfig } from './sonarqube';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('#SonarQubeConnector', () => {
  describe('.LIST_PROJECTS', () => {
    describe('when API returns projects', () => {
      describe('and response is successful', () => {
        it('returns list of projects', async () => {
          server.use(
            http.get('https://sonarcloud.io/api/projects/search', () => {
              return HttpResponse.json({
                components: [
                  {
                    key: 'test-project',
                    name: 'Test Project',
                    qualifier: 'TRK',
                    visibility: 'public',
                    lastAnalysisDate: '2024-01-01T00:00:00Z',
                    revision: 'abc123',
                  },
                ],
              });
            })
          );

          const tool = SonarQubeConnectorConfig.tools.LIST_PROJECTS as MCPToolDefinition;
          const mockContext = createMockConnectorContext({
            credentials: {
              token: 'test-token',
              organization: 'test-org',
            },
          });

          const actual = await tool.handler({ limit: 100 }, mockContext);

          expect(JSON.parse(actual)).toEqual([
            {
              key: 'test-project',
              name: 'Test Project',
              qualifier: 'TRK',
              visibility: 'public',
              lastAnalysisDate: '2024-01-01T00:00:00Z',
              revision: 'abc123',
            },
          ]);
        });
      });
    });

    describe('when API returns error', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://sonarcloud.io/api/projects/search', () => {
            return new HttpResponse(null, { status: 401 });
          })
        );

        const tool = SonarQubeConnectorConfig.tools.LIST_PROJECTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            token: 'invalid-token',
          },
        });

        const actual = await tool.handler({ limit: 100 }, mockContext);

        expect(actual).toBe(
          'Failed to list projects: SonarQube API error: 401 Unauthorized'
        );
      });
    });
  });

  describe('.GET_PROJECT', () => {
    describe('when project exists', () => {
      describe('and API returns valid data', () => {
        it('returns project details', async () => {
          server.use(
            http.get('https://sonarcloud.io/api/projects/search', () => {
              return HttpResponse.json({
                components: [
                  {
                    key: 'test-project',
                    name: 'Test Project',
                    qualifier: 'TRK',
                    visibility: 'public',
                    lastAnalysisDate: '2024-01-01T00:00:00Z',
                  },
                ],
              });
            })
          );

          const tool = SonarQubeConnectorConfig.tools.GET_PROJECT as MCPToolDefinition;
          const mockContext = createMockConnectorContext({
            credentials: {
              token: 'test-token',
              organization: 'test-org',
            },
          });

          const actual = await tool.handler({ projectKey: 'test-project' }, mockContext);

          expect(JSON.parse(actual)).toEqual({
            key: 'test-project',
            name: 'Test Project',
            qualifier: 'TRK',
            visibility: 'public',
            lastAnalysisDate: '2024-01-01T00:00:00Z',
          });
        });
      });
    });

    describe('when project does not exist', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://sonarcloud.io/api/projects/search', () => {
            return HttpResponse.json({
              components: [],
            });
          })
        );

        const tool = SonarQubeConnectorConfig.tools.GET_PROJECT as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            token: 'test-token',
          },
        });

        const actual = await tool.handler({ projectKey: 'nonexistent' }, mockContext);

        expect(actual).toBe('Failed to get project: Project nonexistent not found');
      });
    });
  });

  describe('.SEARCH_ISSUES', () => {
    describe('when issues exist', () => {
      describe('and API returns valid data', () => {
        it('returns list of issues', async () => {
          server.use(
            http.get('https://sonarcloud.io/api/issues/search', () => {
              return HttpResponse.json({
                issues: [
                  {
                    key: 'issue-123',
                    rule: 'javascript:S1234',
                    severity: 'MAJOR',
                    component: 'test-project:src/file.js',
                    project: 'test-project',
                    line: 42,
                    status: 'OPEN',
                    message: 'This is a test issue',
                    tags: ['bug'],
                    creationDate: '2024-01-01T00:00:00Z',
                    updateDate: '2024-01-01T00:00:00Z',
                    type: 'BUG',
                  },
                ],
              });
            })
          );

          const tool = SonarQubeConnectorConfig.tools.SEARCH_ISSUES as MCPToolDefinition;
          const mockContext = createMockConnectorContext({
            credentials: {
              token: 'test-token',
              organization: 'test-org',
            },
          });

          const actual = await tool.handler(
            {
              projectKey: 'test-project',
              severity: 'MAJOR',
              types: 'BUG',
              statuses: 'OPEN',
              limit: 100,
            },
            mockContext
          );

          expect(JSON.parse(actual)).toEqual([
            {
              key: 'issue-123',
              rule: 'javascript:S1234',
              severity: 'MAJOR',
              component: 'test-project:src/file.js',
              project: 'test-project',
              line: 42,
              status: 'OPEN',
              message: 'This is a test issue',
              tags: ['bug'],
              creationDate: '2024-01-01T00:00:00Z',
              updateDate: '2024-01-01T00:00:00Z',
              type: 'BUG',
            },
          ]);
        });
      });
    });

    describe('when no issues found', () => {
      it('returns empty array', async () => {
        server.use(
          http.get('https://sonarcloud.io/api/issues/search', () => {
            return HttpResponse.json({
              issues: [],
            });
          })
        );

        const tool = SonarQubeConnectorConfig.tools.SEARCH_ISSUES as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            token: 'test-token',
          },
        });

        const actual = await tool.handler({ projectKey: 'test-project' }, mockContext);

        expect(JSON.parse(actual)).toEqual([]);
      });
    });
  });

  describe('.GET_MEASURES', () => {
    describe('when measures exist', () => {
      describe('and API returns valid data', () => {
        it('returns component measures', async () => {
          server.use(
            http.get('https://sonarcloud.io/api/measures/component', () => {
              return HttpResponse.json({
                component: {
                  key: 'test-project',
                  name: 'Test Project',
                  qualifier: 'TRK',
                  measures: [
                    {
                      metric: 'ncloc',
                      value: '1000',
                    },
                    {
                      metric: 'bugs',
                      value: '5',
                    },
                    {
                      metric: 'coverage',
                      value: '85.2',
                    },
                  ],
                },
              });
            })
          );

          const tool = SonarQubeConnectorConfig.tools.GET_MEASURES as MCPToolDefinition;
          const mockContext = createMockConnectorContext({
            credentials: {
              token: 'test-token',
              organization: 'test-org',
            },
          });

          const actual = await tool.handler(
            {
              componentKey: 'test-project',
              metrics: 'ncloc,bugs,coverage',
            },
            mockContext
          );

          expect(JSON.parse(actual)).toEqual({
            key: 'test-project',
            name: 'Test Project',
            qualifier: 'TRK',
            measures: [
              {
                metric: 'ncloc',
                value: '1000',
              },
              {
                metric: 'bugs',
                value: '5',
              },
              {
                metric: 'coverage',
                value: '85.2',
              },
            ],
          });
        });
      });
    });

    describe('when API returns error', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://sonarcloud.io/api/measures/component', () => {
            return new HttpResponse(null, { status: 404 });
          })
        );

        const tool = SonarQubeConnectorConfig.tools.GET_MEASURES as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            token: 'test-token',
          },
        });

        const actual = await tool.handler(
          {
            componentKey: 'nonexistent',
            metrics: 'ncloc',
          },
          mockContext
        );

        expect(actual).toBe('Failed to get measures: SonarQube API error: 404 Not Found');
      });
    });
  });

  describe('.GET_QUALITY_GATE_STATUS', () => {
    describe('when quality gate status exists', () => {
      describe('and API returns valid data', () => {
        it('returns quality gate status', async () => {
          server.use(
            http.get('https://sonarcloud.io/api/qualitygates/project_status', () => {
              return HttpResponse.json({
                projectStatus: {
                  status: 'OK',
                  conditions: [
                    {
                      status: 'OK',
                      metricKey: 'new_bugs',
                      comparator: 'GT',
                      errorThreshold: '0',
                      actualValue: '0',
                    },
                  ],
                },
              });
            })
          );

          const tool = SonarQubeConnectorConfig.tools
            .GET_QUALITY_GATE_STATUS as MCPToolDefinition;
          const mockContext = createMockConnectorContext({
            credentials: {
              token: 'test-token',
              organization: 'test-org',
            },
          });

          const actual = await tool.handler({ projectKey: 'test-project' }, mockContext);

          expect(JSON.parse(actual)).toEqual({
            projectStatus: {
              status: 'OK',
              conditions: [
                {
                  status: 'OK',
                  metricKey: 'new_bugs',
                  comparator: 'GT',
                  errorThreshold: '0',
                  actualValue: '0',
                },
              ],
            },
          });
        });
      });
    });

    describe('when project does not exist', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://sonarcloud.io/api/qualitygates/project_status', () => {
            return new HttpResponse(null, { status: 404 });
          })
        );

        const tool = SonarQubeConnectorConfig.tools
          .GET_QUALITY_GATE_STATUS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            token: 'test-token',
          },
        });

        const actual = await tool.handler({ projectKey: 'nonexistent' }, mockContext);

        expect(actual).toBe(
          'Failed to get quality gate status: SonarQube API error: 404 Not Found'
        );
      });
    });
  });

  describe('.LIST_QUALITY_GATES', () => {
    describe('when quality gates exist', () => {
      describe('and API returns valid data', () => {
        it('returns list of quality gates', async () => {
          server.use(
            http.get('https://sonarcloud.io/api/qualitygates/list', () => {
              return HttpResponse.json({
                qualitygates: [
                  {
                    id: '1',
                    name: 'Default',
                    isDefault: true,
                  },
                  {
                    id: '2',
                    name: 'Strict',
                    isDefault: false,
                  },
                ],
              });
            })
          );

          const tool = SonarQubeConnectorConfig.tools
            .LIST_QUALITY_GATES as MCPToolDefinition;
          const mockContext = createMockConnectorContext({
            credentials: {
              token: 'test-token',
              organization: 'test-org',
            },
          });

          const actual = await tool.handler({}, mockContext);

          expect(JSON.parse(actual)).toEqual([
            {
              id: '1',
              name: 'Default',
              isDefault: true,
            },
            {
              id: '2',
              name: 'Strict',
              isDefault: false,
            },
          ]);
        });
      });
    });

    describe('when API returns error', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://sonarcloud.io/api/qualitygates/list', () => {
            return new HttpResponse(null, { status: 403 });
          })
        );

        const tool = SonarQubeConnectorConfig.tools
          .LIST_QUALITY_GATES as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            token: 'invalid-token',
          },
        });

        const actual = await tool.handler({}, mockContext);

        expect(actual).toBe(
          'Failed to list quality gates: SonarQube API error: 403 Forbidden'
        );
      });
    });
  });

  describe('.GET_SYSTEM_HEALTH', () => {
    describe('when system is healthy', () => {
      describe('and API returns valid data', () => {
        it('returns system health status', async () => {
          server.use(
            http.get('https://sonarcloud.io/api/system/health', () => {
              return HttpResponse.json({
                health: 'GREEN',
              });
            })
          );

          const tool = SonarQubeConnectorConfig.tools
            .GET_SYSTEM_HEALTH as MCPToolDefinition;
          const mockContext = createMockConnectorContext({
            credentials: {
              token: 'test-token',
            },
          });

          const actual = await tool.handler({}, mockContext);

          expect(JSON.parse(actual)).toEqual({
            health: 'GREEN',
          });
        });
      });
    });

    describe('when system has issues', () => {
      it('returns system health with causes', async () => {
        server.use(
          http.get('https://sonarcloud.io/api/system/health', () => {
            return HttpResponse.json({
              health: 'YELLOW',
              causes: ['Database connectivity issues'],
            });
          })
        );

        const tool = SonarQubeConnectorConfig.tools
          .GET_SYSTEM_HEALTH as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            token: 'test-token',
          },
        });

        const actual = await tool.handler({}, mockContext);

        expect(JSON.parse(actual)).toEqual({
          health: 'YELLOW',
          causes: ['Database connectivity issues'],
        });
      });
    });
  });
});

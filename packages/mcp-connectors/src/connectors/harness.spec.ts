import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { describe, expect, it } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { HarnessConnectorConfig } from './harness';

const server = setupServer();

describe('#HarnessConnector', () => {
  describe('.GET_FEATURE_FLAGS', () => {
    describe('when request is successful', () => {
      it('returns feature flags list', async () => {
        const mockFeatureFlags = {
          features: [
            {
              identifier: 'beta_features',
              name: 'Beta Features Toggle',
              description: 'Enable beta features for testing',
              kind: 'boolean',
              permanent: false,
              tags: ['beta', 'testing'],
              defaultServe: {
                variation: 'true',
              },
              offVariation: 'false',
              variations: [
                {
                  identifier: 'true',
                  name: 'Enabled',
                  value: true,
                  description: 'Beta features enabled',
                },
                {
                  identifier: 'false',
                  name: 'Disabled',
                  value: false,
                  description: 'Beta features disabled',
                },
              ],
              state: 'on',
              createdAt: 1640995200000,
              modifiedAt: 1640995200000,
              version: 1,
            },
          ],
        };

        server.use(
          http.get('https://app.harness.io/gateway/cf/admin/features', () => {
            return HttpResponse.json(mockFeatureFlags);
          })
        );

        server.listen();

        const tool = HarnessConnectorConfig.tools.GET_FEATURE_FLAGS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
            accountId: 'test-account',
            orgId: 'test-org',
            projectId: 'test-project',
          },
        });

        const actual = await tool.handler({ environmentId: 'production' }, mockContext);

        expect(actual).toContain('"identifier": "beta_features"');
        expect(actual).toContain('"name": "Beta Features Toggle"');
        expect(actual).toContain('"kind": "boolean"');
        expect(actual).toContain('"state": "on"');

        server.close();
      });
    });

    describe('when API returns error', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://app.harness.io/gateway/cf/admin/features', () => {
            return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
          })
        );

        server.listen();

        const tool = HarnessConnectorConfig.tools.GET_FEATURE_FLAGS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'invalid-key',
            accountId: 'test-account',
            orgId: 'test-org',
            projectId: 'test-project',
          },
        });

        const actual = await tool.handler({ environmentId: 'production' }, mockContext);

        expect(actual).toContain('Failed to get feature flags');
        expect(actual).toContain('401');

        server.close();
      });
    });
  });

  describe('.GET_FEATURE_FLAG', () => {
    describe('when feature flag exists', () => {
      it('returns detailed feature flag information', async () => {
        const mockFeatureFlag = {
          identifier: 'user_dashboard_v2',
          name: 'User Dashboard V2',
          description: 'New user dashboard design',
          kind: 'boolean',
          permanent: false,
          tags: ['ui', 'dashboard'],
          defaultServe: {
            variation: 'false',
          },
          offVariation: 'false',
          variations: [
            {
              identifier: 'true',
              name: 'V2 Enabled',
              value: true,
              description: 'Show new dashboard',
            },
            {
              identifier: 'false',
              name: 'V2 Disabled',
              value: false,
              description: 'Show old dashboard',
            },
          ],
          state: 'off',
          envProperties: {
            environment: 'production',
            state: 'off',
            defaultServe: {
              variation: 'false',
            },
            offVariation: 'false',
            modifiedAt: 1640995200000,
            version: 3,
          },
          createdAt: 1640995200000,
          modifiedAt: 1640995200000,
          version: 3,
        };

        server.use(
          http.get(
            'https://app.harness.io/gateway/cf/admin/features/user_dashboard_v2',
            () => {
              return HttpResponse.json(mockFeatureFlag);
            }
          )
        );

        server.listen();

        const tool = HarnessConnectorConfig.tools.GET_FEATURE_FLAG as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
            accountId: 'test-account',
            orgId: 'test-org',
            projectId: 'test-project',
          },
        });

        const actual = await tool.handler(
          { flagIdentifier: 'user_dashboard_v2', environmentId: 'production' },
          mockContext
        );

        expect(actual).toContain('"identifier": "user_dashboard_v2"');
        expect(actual).toContain('"name": "User Dashboard V2"');
        expect(actual).toContain('"envProperties"');
        expect(actual).toContain('"version": 3');

        server.close();
      });
    });

    describe('when feature flag does not exist', () => {
      it('returns error message', async () => {
        server.use(
          http.get(
            'https://app.harness.io/gateway/cf/admin/features/nonexistent_flag',
            () => {
              return HttpResponse.json(
                { error: 'Feature flag not found' },
                { status: 404 }
              );
            }
          )
        );

        server.listen();

        const tool = HarnessConnectorConfig.tools.GET_FEATURE_FLAG as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
            accountId: 'test-account',
            orgId: 'test-org',
            projectId: 'test-project',
          },
        });

        const actual = await tool.handler(
          { flagIdentifier: 'nonexistent_flag', environmentId: 'production' },
          mockContext
        );

        expect(actual).toContain('Failed to get feature flag');
        expect(actual).toContain('404');

        server.close();
      });
    });
  });

  describe('.CREATE_FEATURE_FLAG', () => {
    describe('when creation is successful', () => {
      it('returns created feature flag', async () => {
        const newFlag = {
          identifier: 'mobile_dark_mode',
          name: 'Mobile Dark Mode',
          description: 'Dark mode toggle for mobile app',
          kind: 'boolean',
          permanent: false,
          tags: ['mobile', 'ui'],
          variations: [
            {
              identifier: 'enabled',
              name: 'Dark Mode On',
              value: true,
              description: 'Dark mode is enabled',
            },
            {
              identifier: 'disabled',
              name: 'Dark Mode Off',
              value: false,
              description: 'Dark mode is disabled',
            },
          ],
          defaultOnVariation: 'enabled',
          defaultOffVariation: 'disabled',
        };

        const mockCreatedFlag = {
          ...newFlag,
          defaultServe: {
            variation: 'disabled',
          },
          offVariation: 'disabled',
          state: 'off',
          createdAt: 1640995200000,
          modifiedAt: 1640995200000,
          version: 1,
        };

        server.use(
          http.post('https://app.harness.io/gateway/cf/admin/features', () => {
            return HttpResponse.json(mockCreatedFlag);
          })
        );

        server.listen();

        const tool = HarnessConnectorConfig.tools
          .CREATE_FEATURE_FLAG as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
            accountId: 'test-account',
            orgId: 'test-org',
            projectId: 'test-project',
          },
        });

        const actual = await tool.handler(newFlag, mockContext);

        expect(actual).toContain('"identifier": "mobile_dark_mode"');
        expect(actual).toContain('"name": "Mobile Dark Mode"');
        expect(actual).toContain('"kind": "boolean"');
        expect(actual).toContain('"version": 1');

        server.close();
      });
    });

    describe('when creation fails due to validation', () => {
      it('returns error message', async () => {
        server.use(
          http.post('https://app.harness.io/gateway/cf/admin/features', () => {
            return HttpResponse.json(
              { error: 'Invalid flag identifier', details: 'Identifier already exists' },
              { status: 400 }
            );
          })
        );

        server.listen();

        const tool = HarnessConnectorConfig.tools
          .CREATE_FEATURE_FLAG as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
            accountId: 'test-account',
            orgId: 'test-org',
            projectId: 'test-project',
          },
        });

        const actual = await tool.handler(
          {
            identifier: 'existing_flag',
            name: 'Existing Flag',
            kind: 'boolean',
            variations: [],
            defaultOnVariation: 'on',
            defaultOffVariation: 'off',
          },
          mockContext
        );

        expect(actual).toContain('Failed to create feature flag');
        expect(actual).toContain('400');

        server.close();
      });
    });
  });

  describe('.TOGGLE_FEATURE_FLAG', () => {
    describe('when toggling to on', () => {
      it('successfully enables the feature flag', async () => {
        const mockUpdatedFlag = {
          identifier: 'beta_features',
          name: 'Beta Features Toggle',
          state: 'on',
          envProperties: {
            environment: 'production',
            state: 'on',
            modifiedAt: 1640995200000,
            version: 2,
          },
          version: 2,
        };

        server.use(
          http.patch(
            'https://app.harness.io/gateway/cf/admin/features/beta_features',
            () => {
              return HttpResponse.json(mockUpdatedFlag);
            }
          )
        );

        server.listen();

        const tool = HarnessConnectorConfig.tools
          .TOGGLE_FEATURE_FLAG as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
            accountId: 'test-account',
            orgId: 'test-org',
            projectId: 'test-project',
          },
        });

        const actual = await tool.handler(
          { flagIdentifier: 'beta_features', environmentId: 'production', state: 'on' },
          mockContext
        );

        expect(actual).toContain('"identifier": "beta_features"');
        expect(actual).toContain('"state": "on"');
        expect(actual).toContain('"version": 2');

        server.close();
      });
    });

    describe('when toggling to off', () => {
      it('successfully disables the feature flag', async () => {
        const mockUpdatedFlag = {
          identifier: 'beta_features',
          name: 'Beta Features Toggle',
          state: 'off',
          envProperties: {
            environment: 'production',
            state: 'off',
            modifiedAt: 1640995200000,
            version: 3,
          },
          version: 3,
        };

        server.use(
          http.patch(
            'https://app.harness.io/gateway/cf/admin/features/beta_features',
            () => {
              return HttpResponse.json(mockUpdatedFlag);
            }
          )
        );

        server.listen();

        const tool = HarnessConnectorConfig.tools
          .TOGGLE_FEATURE_FLAG as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
            accountId: 'test-account',
            orgId: 'test-org',
            projectId: 'test-project',
          },
        });

        const actual = await tool.handler(
          { flagIdentifier: 'beta_features', environmentId: 'production', state: 'off' },
          mockContext
        );

        expect(actual).toContain('"state": "off"');
        expect(actual).toContain('"version": 3');

        server.close();
      });
    });
  });

  describe('.UPDATE_FEATURE_FLAG', () => {
    describe('when update is successful', () => {
      it('returns updated feature flag with custom instructions', async () => {
        const mockUpdatedFlag = {
          identifier: 'user_dashboard_v2',
          name: 'User Dashboard V2',
          defaultServe: {
            variation: 'true',
          },
          version: 4,
        };

        server.use(
          http.patch(
            'https://app.harness.io/gateway/cf/admin/features/user_dashboard_v2',
            () => {
              return HttpResponse.json(mockUpdatedFlag);
            }
          )
        );

        server.listen();

        const tool = HarnessConnectorConfig.tools
          .UPDATE_FEATURE_FLAG as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
            accountId: 'test-account',
            orgId: 'test-org',
            projectId: 'test-project',
          },
        });

        const actual = await tool.handler(
          {
            flagIdentifier: 'user_dashboard_v2',
            environmentId: 'production',
            instructions: [
              {
                kind: 'updateDefaultServe',
                parameters: {
                  variation: 'true',
                },
              },
            ],
          },
          mockContext
        );

        expect(actual).toContain('"identifier": "user_dashboard_v2"');
        expect(actual).toContain('"version": 4');

        server.close();
      });
    });

    describe('when update fails', () => {
      it('returns error message', async () => {
        server.use(
          http.patch(
            'https://app.harness.io/gateway/cf/admin/features/invalid_flag',
            () => {
              return HttpResponse.json({ error: 'Invalid instruction' }, { status: 400 });
            }
          )
        );

        server.listen();

        const tool = HarnessConnectorConfig.tools
          .UPDATE_FEATURE_FLAG as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
            accountId: 'test-account',
            orgId: 'test-org',
            projectId: 'test-project',
          },
        });

        const actual = await tool.handler(
          {
            flagIdentifier: 'invalid_flag',
            environmentId: 'production',
            instructions: [{ kind: 'invalidInstruction' }],
          },
          mockContext
        );

        expect(actual).toContain('Failed to update feature flag');
        expect(actual).toContain('400');

        server.close();
      });
    });
  });

  describe('.DELETE_FEATURE_FLAG', () => {
    describe('when deletion is successful', () => {
      it('returns success message', async () => {
        server.use(
          http.delete(
            'https://app.harness.io/gateway/cf/admin/features/old_feature',
            () => {
              return HttpResponse.json({}, { status: 204 });
            }
          )
        );

        server.listen();

        const tool = HarnessConnectorConfig.tools
          .DELETE_FEATURE_FLAG as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
            accountId: 'test-account',
            orgId: 'test-org',
            projectId: 'test-project',
          },
        });

        const actual = await tool.handler({ flagIdentifier: 'old_feature' }, mockContext);

        expect(actual).toContain('Feature flag old_feature deleted successfully');

        server.close();
      });
    });

    describe('when flag does not exist', () => {
      it('returns error message', async () => {
        server.use(
          http.delete(
            'https://app.harness.io/gateway/cf/admin/features/nonexistent_flag',
            () => {
              return HttpResponse.json(
                { error: 'Feature flag not found' },
                { status: 404 }
              );
            }
          )
        );

        server.listen();

        const tool = HarnessConnectorConfig.tools
          .DELETE_FEATURE_FLAG as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
            accountId: 'test-account',
            orgId: 'test-org',
            projectId: 'test-project',
          },
        });

        const actual = await tool.handler(
          { flagIdentifier: 'nonexistent_flag' },
          mockContext
        );

        expect(actual).toContain('Failed to delete feature flag');
        expect(actual).toContain('404');

        server.close();
      });
    });
  });

  describe('.GET_TARGETS', () => {
    describe('when request is successful', () => {
      it('returns targets list', async () => {
        const mockTargets = {
          targets: [
            {
              identifier: 'user_123',
              account: 'test-account',
              org: 'test-org',
              environment: 'production',
              project: 'test-project',
              name: 'John Doe',
              anonymous: false,
              attributes: {
                email: 'john@example.com',
                plan: 'premium',
                region: 'us-east-1',
              },
              createdAt: 1640995200000,
            },
          ],
        };

        server.use(
          http.get('https://app.harness.io/gateway/cf/admin/targets', () => {
            return HttpResponse.json(mockTargets);
          })
        );

        server.listen();

        const tool = HarnessConnectorConfig.tools.GET_TARGETS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
            accountId: 'test-account',
            orgId: 'test-org',
            projectId: 'test-project',
          },
        });

        const actual = await tool.handler({ environmentId: 'production' }, mockContext);

        expect(actual).toContain('"identifier": "user_123"');
        expect(actual).toContain('"name": "John Doe"');
        expect(actual).toContain('"email": "john@example.com"');
        expect(actual).toContain('"plan": "premium"');

        server.close();
      });
    });

    describe('when API returns empty results', () => {
      it('returns empty targets array', async () => {
        const mockTargets = {
          targets: [],
        };

        server.use(
          http.get('https://app.harness.io/gateway/cf/admin/targets', () => {
            return HttpResponse.json(mockTargets);
          })
        );

        server.listen();

        const tool = HarnessConnectorConfig.tools.GET_TARGETS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
            accountId: 'test-account',
            orgId: 'test-org',
            projectId: 'test-project',
          },
        });

        const actual = await tool.handler({ environmentId: 'production' }, mockContext);

        expect(actual).toContain('"targets": []');

        server.close();
      });
    });
  });

  describe('.GET_TARGET_GROUPS', () => {
    describe('when request is successful', () => {
      it('returns target groups list', async () => {
        const mockTargetGroups = {
          targetGroups: [
            {
              identifier: 'premium_users',
              name: 'Premium Users',
              environment: 'production',
              project: 'test-project',
              account: 'test-account',
              org: 'test-org',
              description: 'Users with premium subscriptions',
              tags: ['premium', 'subscription'],
              rules: [
                {
                  attribute: 'plan',
                  op: 'equal',
                  values: ['premium', 'enterprise'],
                },
              ],
              createdAt: 1640995200000,
              modifiedAt: 1640995200000,
              version: 1,
            },
          ],
        };

        server.use(
          http.get('https://app.harness.io/gateway/cf/admin/target-groups', () => {
            return HttpResponse.json(mockTargetGroups);
          })
        );

        server.listen();

        const tool = HarnessConnectorConfig.tools.GET_TARGET_GROUPS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
            accountId: 'test-account',
            orgId: 'test-org',
            projectId: 'test-project',
          },
        });

        const actual = await tool.handler({ environmentId: 'production' }, mockContext);

        expect(actual).toContain('"identifier": "premium_users"');
        expect(actual).toContain('"name": "Premium Users"');
        expect(actual).toContain('"description": "Users with premium subscriptions"');
        expect(actual).toContain('"rules"');

        server.close();
      });
    });
  });

  describe('.GET_FEATURE_FLAG_METRICS', () => {
    describe('when request is successful', () => {
      it('returns feature flag metrics and analytics', async () => {
        const mockMetrics = {
          flagIdentifier: 'user_dashboard_v2',
          environment: 'production',
          variationMetrics: [
            {
              variation: 'true',
              count: 15420,
              percentage: 23.5,
            },
            {
              variation: 'false',
              count: 50180,
              percentage: 76.5,
            },
          ],
          totalEvaluations: 65600,
        };

        server.use(
          http.get(
            'https://app.harness.io/gateway/cf/admin/metrics/flags/user_dashboard_v2',
            () => {
              return HttpResponse.json(mockMetrics);
            }
          )
        );

        server.listen();

        const tool = HarnessConnectorConfig.tools
          .GET_FEATURE_FLAG_METRICS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
            accountId: 'test-account',
            orgId: 'test-org',
            projectId: 'test-project',
          },
        });

        const actual = await tool.handler(
          {
            flagIdentifier: 'user_dashboard_v2',
            environmentId: 'production',
            fromTimestamp: 1640995200000,
            toTimestamp: 1641081600000,
          },
          mockContext
        );

        expect(actual).toContain('"flagIdentifier": "user_dashboard_v2"');
        expect(actual).toContain('"totalEvaluations": 65600');
        expect(actual).toContain('"variationMetrics"');
        expect(actual).toContain('"percentage": 23.5');

        server.close();
      });
    });

    describe('when flag has no metrics', () => {
      it('returns empty metrics', async () => {
        const mockMetrics = {
          flagIdentifier: 'new_feature',
          environment: 'production',
          variationMetrics: [],
          totalEvaluations: 0,
        };

        server.use(
          http.get(
            'https://app.harness.io/gateway/cf/admin/metrics/flags/new_feature',
            () => {
              return HttpResponse.json(mockMetrics);
            }
          )
        );

        server.listen();

        const tool = HarnessConnectorConfig.tools
          .GET_FEATURE_FLAG_METRICS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          credentials: {
            apiKey: 'test-api-key',
            accountId: 'test-account',
            orgId: 'test-org',
            projectId: 'test-project',
          },
        });

        const actual = await tool.handler(
          { flagIdentifier: 'new_feature', environmentId: 'production' },
          mockContext
        );

        expect(actual).toContain('"totalEvaluations": 0');
        expect(actual).toContain('"variationMetrics": []');

        server.close();
      });
    });
  });
});

import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { extractToolsFromServer } from '../__mocks__/server-tools';
import { createPostHogServer } from './posthog';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('#PostHogConnector', () => {
  describe('.CAPTURE_EVENT', () => {
    describe('when capturing a valid event', () => {
      describe('and API responds successfully', () => {
        it('returns success status', async () => {
          server.use(
            http.post('https://us.posthog.com/capture/', () => {
              return HttpResponse.json({ status: 'success' }, { status: 200 });
            })
          );

          const mcpServer = createPostHogServer({
            apiKey: 'test-api-key',
            projectApiKey: 'test-project-key',
            host: 'https://us.posthog.com',
          });
          const tools = extractToolsFromServer(mcpServer);
          const actual = await tools.posthog_capture_event.handler({
            event: 'user_signup',
            distinctId: 'user123',
            properties: { plan: 'free' },
          });

          expect(actual).toContain('success');
        });
      });
    });

    describe('when projectApiKey is missing', () => {
      it('returns error message about missing project API key', async () => {
        const mcpServer = createPostHogServer({
          apiKey: 'test-api-key',
          host: 'https://us.posthog.com',
        });
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.posthog_capture_event.handler({
          event: 'test_event',
          distinctId: 'user123',
          properties: {},
        });

        expect(actual).toContain('Project API Key is required for event capture');
      });
    });

    describe('when API returns an error', () => {
      it('returns error message', async () => {
        server.use(
          http.post('https://us.posthog.com/capture/', () => {
            return HttpResponse.json({ error: 'Invalid API key' }, { status: 401 });
          })
        );

        const mcpServer = createPostHogServer({
          apiKey: 'invalid-key',
          projectApiKey: 'test-project-key',
          host: 'https://us.posthog.com',
        });
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.posthog_capture_event.handler({
          event: 'test_event',
          distinctId: 'user123',
          properties: {},
        });

        expect(actual).toContain('Failed to capture event');
      });
    });
  });

  describe('.CAPTURE_BATCH_EVENTS', () => {
    describe('when capturing multiple valid events', () => {
      describe('and API responds successfully', () => {
        it('returns success status', async () => {
          server.use(
            http.post('https://us.posthog.com/batch/', () => {
              return HttpResponse.json({ status: 'success' }, { status: 200 });
            })
          );

          const mcpServer = createPostHogServer({
            apiKey: 'test-api-key',
            projectApiKey: 'test-project-key',
            host: 'https://us.posthog.com',
          });
          const tools = extractToolsFromServer(mcpServer);
          const actual = await tools.posthog_capture_batch_events.handler({
            events: [
              {
                event: 'user_signup',
                distinctId: 'user123',
                properties: { plan: 'free' },
              },
              {
                event: 'page_view',
                distinctId: 'user123',
                properties: { page: '/dashboard' },
              },
            ],
          });

          expect(actual).toContain('success');
        });
      });
    });

    describe('when projectApiKey is missing', () => {
      it('returns error message about missing project API key', async () => {
        const mcpServer = createPostHogServer({
          apiKey: 'test-api-key',
          host: 'https://us.posthog.com',
        });
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.posthog_capture_batch_events.handler({
          events: [
            {
              event: 'test_event',
              distinctId: 'user123',
              properties: {},
            },
          ],
        });

        expect(actual).toContain('Project API Key is required for batch event capture');
      });
    });

    describe('when API returns an error', () => {
      it('returns error message', async () => {
        server.use(
          http.post('https://us.posthog.com/batch/', () => {
            return HttpResponse.json({ error: 'Invalid request' }, { status: 400 });
          })
        );

        const mcpServer = createPostHogServer({
          apiKey: 'test-api-key',
          projectApiKey: 'test-project-key',
          host: 'https://us.posthog.com',
        });
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.posthog_capture_batch_events.handler({
          events: [
            {
              event: 'invalid_event',
              distinctId: 'user123',
              properties: {},
            },
          ],
        });

        expect(actual).toContain('Failed to capture batch events');
      });
    });
  });

  describe('.GET_EVENTS', () => {
    describe('when retrieving events successfully', () => {
      describe('and events exist', () => {
        it('returns events data', async () => {
          const mockEvents = {
            results: [
              {
                event: 'user_signup',
                properties: { distinct_id: 'user123', plan: 'free' },
                timestamp: '2023-10-27T10:00:00Z',
                uuid: 'event-uuid-1',
              },
            ],
            count: 1,
          };

          server.use(
            http.get('https://us.posthog.com/api/projects/@current/events/', () => {
              return HttpResponse.json(mockEvents, { status: 200 });
            })
          );

          const mcpServer = createPostHogServer({
            apiKey: 'test-api-key',
            host: 'https://us.posthog.com',
          });
          const tools = extractToolsFromServer(mcpServer);
          const actual = await tools.posthog_get_events.handler({ limit: 50, offset: 0 });

          expect(actual).toContain('user_signup');
          expect(actual).toContain('user123');
        });
      });
    });

    describe('when apiKey is missing', () => {
      it('returns error message about missing personal API key', async () => {
        const mcpServer = createPostHogServer({
          projectApiKey: 'test-project-key',
          host: 'https://us.posthog.com',
        });
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.posthog_get_events.handler({ limit: 10 });

        expect(actual).toContain('Personal API Key is required for getting events');
      });
    });

    describe('when API returns unauthorized', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://us.posthog.com/api/projects/@current/events/', () => {
            return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
          })
        );

        const mcpServer = createPostHogServer({
          apiKey: 'invalid-key',
          host: 'https://us.posthog.com',
        });
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.posthog_get_events.handler({ limit: 10 });

        expect(actual).toContain('Failed to get events');
      });
    });
  });

  describe('.IDENTIFY_USER', () => {
    describe('when identifying a user successfully', () => {
      describe('and API responds with success', () => {
        it('returns success status', async () => {
          server.use(
            http.post('https://us.posthog.com/identify/', () => {
              return HttpResponse.json({ status: 'success' }, { status: 200 });
            })
          );

          const mcpServer = createPostHogServer({
            apiKey: 'test-api-key',
            projectApiKey: 'test-project-key',
            host: 'https://us.posthog.com',
          });
          const tools = extractToolsFromServer(mcpServer);
          const actual = await tools.posthog_identify_user.handler({
            distinctId: 'user123',
            properties: { email: 'user@example.com', name: 'Test User' },
          });

          expect(actual).toContain('success');
        });
      });
    });

    describe('when projectApiKey is missing', () => {
      it('returns error message about missing project API key', async () => {
        const mcpServer = createPostHogServer({
          apiKey: 'test-api-key',
          host: 'https://us.posthog.com',
        });
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.posthog_identify_user.handler({
          distinctId: 'user123',
          properties: {},
        });

        expect(actual).toContain('Project API Key is required for user identification');
      });
    });

    describe('when API returns an error', () => {
      it('returns error message', async () => {
        server.use(
          http.post('https://us.posthog.com/identify/', () => {
            return HttpResponse.json({ error: 'Bad request' }, { status: 400 });
          })
        );

        const mcpServer = createPostHogServer({
          apiKey: 'test-api-key',
          projectApiKey: 'test-project-key',
          host: 'https://us.posthog.com',
        });
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.posthog_identify_user.handler({
          distinctId: 'user123',
          properties: {},
        });

        expect(actual).toContain('Failed to identify user');
      });
    });
  });

  describe('.GET_FEATURE_FLAGS', () => {
    describe('when retrieving feature flags successfully', () => {
      describe('and feature flags exist', () => {
        it('returns feature flags data', async () => {
          const mockFlags = {
            results: [
              {
                id: 1,
                name: 'Beta Feature',
                key: 'beta-feature',
                active: true,
                filters: { groups: [{ rollout_percentage: 50 }] },
                created_at: '2023-10-27T10:00:00Z',
              },
            ],
          };

          server.use(
            http.get(
              'https://us.posthog.com/api/projects/@current/feature_flags/',
              () => {
                return HttpResponse.json(mockFlags, { status: 200 });
              }
            )
          );

          const mcpServer = createPostHogServer({
            apiKey: 'test-api-key',
            host: 'https://us.posthog.com',
          });
          const tools = extractToolsFromServer(mcpServer);
          const actual = await tools.posthog_get_feature_flags.handler({});

          expect(actual).toContain('Beta Feature');
          expect(actual).toContain('beta-feature');
        });
      });
    });

    describe('when apiKey is missing', () => {
      it('returns error message about missing personal API key', async () => {
        const mcpServer = createPostHogServer({
          projectApiKey: 'test-project-key',
          host: 'https://us.posthog.com',
        });
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.posthog_get_feature_flags.handler({});

        expect(actual).toContain(
          'Personal API Key is required for getting feature flags'
        );
      });
    });

    describe('when API returns an error', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://us.posthog.com/api/projects/@current/feature_flags/', () => {
            return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
          })
        );

        const mcpServer = createPostHogServer({
          apiKey: 'test-api-key',
          host: 'https://us.posthog.com',
        });
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.posthog_get_feature_flags.handler({});

        expect(actual).toContain('Failed to get feature flags');
      });
    });
  });

  describe('.CREATE_FEATURE_FLAG', () => {
    describe('when creating a feature flag successfully', () => {
      describe('and API responds with created flag', () => {
        it('returns feature flag data', async () => {
          const mockFlag = {
            id: 2,
            name: 'New Feature',
            key: 'new-feature',
            active: false,
            filters: {},
            created_at: '2023-10-27T10:00:00Z',
          };

          server.use(
            http.post(
              'https://us.posthog.com/api/projects/@current/feature_flags/',
              () => {
                return HttpResponse.json(mockFlag, { status: 201 });
              }
            )
          );

          const mcpServer = createPostHogServer({
            apiKey: 'test-api-key',
            host: 'https://us.posthog.com',
          });
          const tools = extractToolsFromServer(mcpServer);
          const actual = await tools.posthog_create_feature_flag.handler({
            name: 'New Feature',
            key: 'new-feature',
            active: false,
            filters: {},
          });

          expect(actual).toContain('New Feature');
          expect(actual).toContain('new-feature');
        });
      });
    });

    describe('when API returns validation error', () => {
      it('returns error message', async () => {
        server.use(
          http.post('https://us.posthog.com/api/projects/@current/feature_flags/', () => {
            return HttpResponse.json({ error: 'Key already exists' }, { status: 400 });
          })
        );

        const mcpServer = createPostHogServer({
          apiKey: 'test-api-key',
          host: 'https://us.posthog.com',
        });
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.posthog_create_feature_flag.handler({
          name: 'Duplicate Feature',
          key: 'existing-key',
          active: true,
        });

        expect(actual).toContain('Failed to create feature flag');
      });
    });
  });

  describe('.EVALUATE_FEATURE_FLAG', () => {
    describe('when evaluating a feature flag successfully', () => {
      describe('and flag is enabled for user', () => {
        it('returns flag evaluation result', async () => {
          const mockResponse = {
            featureFlags: {
              'beta-feature': true,
            },
          };

          server.use(
            http.post('https://us.posthog.com/decide/', () => {
              return HttpResponse.json(mockResponse, { status: 200 });
            })
          );

          const mcpServer = createPostHogServer({
            apiKey: 'test-api-key',
            projectApiKey: 'test-project-key',
            host: 'https://us.posthog.com',
          });
          const tools = extractToolsFromServer(mcpServer);
          const actual = await tools.posthog_evaluate_feature_flag.handler({
            key: 'beta-feature',
            distinctId: 'user123',
            groups: {},
          });

          expect(actual).toContain('true');
        });
      });
    });

    describe('when projectApiKey is missing', () => {
      it('returns error message about missing project API key', async () => {
        const mcpServer = createPostHogServer({
          apiKey: 'test-api-key',
          host: 'https://us.posthog.com',
        });
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.posthog_evaluate_feature_flag.handler({
          key: 'test-flag',
          distinctId: 'user123',
        });

        expect(actual).toContain(
          'Project API Key is required for feature flag evaluation'
        );
      });
    });

    describe('when API returns an error', () => {
      it('returns error message', async () => {
        server.use(
          http.post('https://us.posthog.com/decide/', () => {
            return HttpResponse.json({ error: 'Invalid request' }, { status: 400 });
          })
        );

        const mcpServer = createPostHogServer({
          apiKey: 'test-api-key',
          projectApiKey: 'test-project-key',
          host: 'https://us.posthog.com',
        });
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.posthog_evaluate_feature_flag.handler({
          key: 'nonexistent-flag',
          distinctId: 'user123',
        });

        expect(actual).toContain('Failed to evaluate feature flag');
      });
    });
  });

  describe('.GET_INSIGHTS', () => {
    describe('when retrieving insights successfully', () => {
      describe('and insights exist', () => {
        it('returns insights data', async () => {
          const mockInsights = {
            results: [
              {
                id: 1,
                name: 'User Signups',
                filters: { events: [{ id: 'user_signup' }] },
                created_at: '2023-10-27T10:00:00Z',
              },
            ],
          };

          server.use(
            http.get('https://us.posthog.com/api/projects/@current/insights/', () => {
              return HttpResponse.json(mockInsights, { status: 200 });
            })
          );

          const mcpServer = createPostHogServer({
            apiKey: 'test-api-key',
            host: 'https://us.posthog.com',
          });
          const tools = extractToolsFromServer(mcpServer);
          const actual = await tools.posthog_get_insights.handler({
            limit: 25,
            offset: 0,
          });

          expect(actual).toContain('User Signups');
        });
      });
    });

    describe('when apiKey is missing', () => {
      it('returns error message about missing personal API key', async () => {
        const mcpServer = createPostHogServer({
          projectApiKey: 'test-project-key',
          host: 'https://us.posthog.com',
        });
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.posthog_get_insights.handler({ limit: 10 });

        expect(actual).toContain('Personal API Key is required for getting insights');
      });
    });

    describe('when API returns an error', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://us.posthog.com/api/projects/@current/insights/', () => {
            return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
          })
        );

        const mcpServer = createPostHogServer({
          apiKey: 'test-api-key',
          host: 'https://us.posthog.com',
        });
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.posthog_get_insights.handler({ limit: 10 });

        expect(actual).toContain('Failed to get insights');
      });
    });
  });

  describe('.CREATE_INSIGHT', () => {
    describe('when creating an insight successfully', () => {
      describe('and API responds with created insight', () => {
        it('returns insight data', async () => {
          const mockInsight = {
            id: 2,
            name: 'New Insight',
            filters: { events: [{ id: 'page_view' }] },
            created_at: '2023-10-27T10:00:00Z',
          };

          server.use(
            http.post('https://us.posthog.com/api/projects/@current/insights/', () => {
              return HttpResponse.json(mockInsight, { status: 201 });
            })
          );

          const mcpServer = createPostHogServer({
            apiKey: 'test-api-key',
            host: 'https://us.posthog.com',
          });
          const tools = extractToolsFromServer(mcpServer);
          const actual = await tools.posthog_create_insight.handler({
            name: 'New Insight',
            filters: { events: [{ id: 'page_view' }] },
          });

          expect(actual).toContain('New Insight');
        });
      });
    });

    describe('when API returns validation error', () => {
      it('returns error message', async () => {
        server.use(
          http.post('https://us.posthog.com/api/projects/@current/insights/', () => {
            return HttpResponse.json({ error: 'Invalid filters' }, { status: 400 });
          })
        );

        const mcpServer = createPostHogServer({
          apiKey: 'test-api-key',
          host: 'https://us.posthog.com',
        });
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.posthog_create_insight.handler({
          name: 'Invalid Insight',
          filters: {},
        });

        expect(actual).toContain('Failed to create insight');
      });
    });
  });

  describe('.GET_COHORTS', () => {
    describe('when retrieving cohorts successfully', () => {
      describe('and cohorts exist', () => {
        it('returns cohorts data', async () => {
          const mockCohorts = {
            results: [
              {
                id: 1,
                name: 'Premium Users',
                description: 'Users with premium plan',
                groups: [{ properties: [{ key: 'plan', value: 'premium' }] }],
                count: 150,
                is_calculating: false,
                created_at: '2023-10-27T10:00:00Z',
              },
            ],
          };

          server.use(
            http.get('https://us.posthog.com/api/projects/@current/cohorts/', () => {
              return HttpResponse.json(mockCohorts, { status: 200 });
            })
          );

          const mcpServer = createPostHogServer({
            apiKey: 'test-api-key',
            host: 'https://us.posthog.com',
          });
          const tools = extractToolsFromServer(mcpServer);
          const actual = await tools.posthog_get_cohorts.handler({});

          expect(actual).toContain('Premium Users');
          expect(actual).toContain('150');
        });
      });
    });

    describe('when API returns an error', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://us.posthog.com/api/projects/@current/cohorts/', () => {
            return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
          })
        );

        const mcpServer = createPostHogServer({
          apiKey: 'invalid-key',
          host: 'https://us.posthog.com',
        });
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.posthog_get_cohorts.handler({});

        expect(actual).toContain('Failed to get cohorts');
      });
    });
  });

  describe('.CREATE_COHORT', () => {
    describe('when creating a cohort successfully', () => {
      describe('and API responds with created cohort', () => {
        it('returns cohort data', async () => {
          const mockCohort = {
            id: 2,
            name: 'Active Users',
            description: 'Users active in last 30 days',
            groups: [
              { properties: [{ key: 'last_seen', operator: 'gt', value: '30d' }] },
            ],
            count: 0,
            is_calculating: true,
            created_at: '2023-10-27T10:00:00Z',
          };

          server.use(
            http.post('https://us.posthog.com/api/projects/@current/cohorts/', () => {
              return HttpResponse.json(mockCohort, { status: 201 });
            })
          );

          const mcpServer = createPostHogServer({
            apiKey: 'test-api-key',
            host: 'https://us.posthog.com',
          });
          const tools = extractToolsFromServer(mcpServer);
          const actual = await tools.posthog_create_cohort.handler({
            name: 'Active Users',
            groups: [
              { properties: [{ key: 'last_seen', operator: 'gt', value: '30d' }] },
            ],
            description: 'Users active in last 30 days',
          });

          expect(actual).toContain('Active Users');
          expect(actual).toContain('is_calculating');
        });
      });
    });

    describe('when API returns validation error', () => {
      it('returns error message', async () => {
        server.use(
          http.post('https://us.posthog.com/api/projects/@current/cohorts/', () => {
            return HttpResponse.json(
              { error: 'Invalid cohort definition' },
              { status: 400 }
            );
          })
        );

        const mcpServer = createPostHogServer({
          apiKey: 'test-api-key',
          host: 'https://us.posthog.com',
        });
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.posthog_create_cohort.handler({
          name: 'Invalid Cohort',
          groups: [],
        });

        expect(actual).toContain('Failed to create cohort');
      });
    });
  });

  describe('.GET_DASHBOARDS', () => {
    describe('when retrieving dashboards successfully', () => {
      describe('and dashboards exist', () => {
        it('returns dashboards data', async () => {
          const mockDashboards = {
            results: [
              {
                id: 1,
                name: 'Product Analytics',
                description: 'Key product metrics',
                items: [{ id: 1, insight: { name: 'User Signups' } }],
                created_at: '2023-10-27T10:00:00Z',
              },
            ],
          };

          server.use(
            http.get('https://us.posthog.com/api/projects/@current/dashboards/', () => {
              return HttpResponse.json(mockDashboards, { status: 200 });
            })
          );

          const mcpServer = createPostHogServer({
            apiKey: 'test-api-key',
            host: 'https://us.posthog.com',
          });
          const tools = extractToolsFromServer(mcpServer);
          const actual = await tools.posthog_get_dashboards.handler({});

          expect(actual).toContain('Product Analytics');
          expect(actual).toContain('Key product metrics');
        });
      });
    });

    describe('when API returns an error', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://us.posthog.com/api/projects/@current/dashboards/', () => {
            return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
          })
        );

        const mcpServer = createPostHogServer({
          apiKey: 'test-api-key',
          host: 'https://us.posthog.com',
        });
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.posthog_get_dashboards.handler({});

        expect(actual).toContain('Failed to get dashboards');
      });
    });
  });

  describe('.CREATE_DASHBOARD', () => {
    describe('when creating a dashboard successfully', () => {
      describe('and API responds with created dashboard', () => {
        it('returns dashboard data', async () => {
          const mockDashboard = {
            id: 2,
            name: 'New Dashboard',
            description: 'Dashboard description',
            items: [],
            created_at: '2023-10-27T10:00:00Z',
          };

          server.use(
            http.post('https://us.posthog.com/api/projects/@current/dashboards/', () => {
              return HttpResponse.json(mockDashboard, { status: 201 });
            })
          );

          const mcpServer = createPostHogServer({
            apiKey: 'test-api-key',
            host: 'https://us.posthog.com',
          });
          const tools = extractToolsFromServer(mcpServer);
          const actual = await tools.posthog_create_dashboard.handler({
            name: 'New Dashboard',
            description: 'Dashboard description',
          });

          expect(actual).toContain('New Dashboard');
          expect(actual).toContain('Dashboard description');
        });
      });
    });

    describe('when API returns validation error', () => {
      it('returns error message', async () => {
        server.use(
          http.post('https://us.posthog.com/api/projects/@current/dashboards/', () => {
            return HttpResponse.json({ error: 'Name is required' }, { status: 400 });
          })
        );

        const mcpServer = createPostHogServer({
          apiKey: 'test-api-key',
          host: 'https://us.posthog.com',
        });
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.posthog_create_dashboard.handler({
          name: '',
        });

        expect(actual).toContain('Failed to create dashboard');
      });
    });
  });

  describe('.GET_PERSONS', () => {
    describe('when retrieving persons successfully', () => {
      describe('and persons exist', () => {
        it('returns persons data', async () => {
          const mockPersons = {
            results: [
              {
                id: 'person-uuid-1',
                name: 'John Doe',
                distinct_ids: ['user123', 'session456'],
                properties: { email: 'john@example.com', plan: 'premium' },
                created_at: '2023-10-27T10:00:00Z',
                uuid: 'person-uuid-1',
              },
            ],
          };

          server.use(
            http.get('https://us.posthog.com/api/projects/@current/persons/', () => {
              return HttpResponse.json(mockPersons, { status: 200 });
            })
          );

          const mcpServer = createPostHogServer({
            apiKey: 'test-api-key',
            host: 'https://us.posthog.com',
          });
          const tools = extractToolsFromServer(mcpServer);
          const actual = await tools.posthog_get_persons.handler({
            limit: 100,
            offset: 0,
          });

          expect(actual).toContain('John Doe');
          expect(actual).toContain('john@example.com');
        });
      });
    });

    describe('when API returns an error', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://us.posthog.com/api/projects/@current/persons/', () => {
            return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
          })
        );

        const mcpServer = createPostHogServer({
          apiKey: 'invalid-key',
          host: 'https://us.posthog.com',
        });
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.posthog_get_persons.handler({ limit: 10 });

        expect(actual).toContain('Failed to get persons');
      });
    });
  });

  describe('.GET_PROJECT_INFO', () => {
    describe('when retrieving project info successfully', () => {
      describe('and project exists', () => {
        it('returns project data', async () => {
          const mockProject = {
            id: 123,
            name: 'My Project',
            organization: { id: 456, name: 'My Org' },
            api_token: 'project-token',
            created_at: '2023-10-27T10:00:00Z',
          };

          server.use(
            http.get('https://us.posthog.com/api/projects/@current/', () => {
              return HttpResponse.json(mockProject, { status: 200 });
            })
          );

          const mcpServer = createPostHogServer({
            apiKey: 'test-api-key',
            host: 'https://us.posthog.com',
          });
          const tools = extractToolsFromServer(mcpServer);
          const actual = await tools.posthog_get_project_info.handler({});

          expect(actual).toContain('My Project');
          expect(actual).toContain('My Org');
        });
      });
    });

    describe('when API returns an error', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://us.posthog.com/api/projects/@current/', () => {
            return HttpResponse.json({ error: 'Not found' }, { status: 404 });
          })
        );

        const mcpServer = createPostHogServer({
          apiKey: 'test-api-key',
          host: 'https://us.posthog.com',
        });
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.posthog_get_project_info.handler({});

        expect(actual).toContain('Failed to get project info');
      });
    });
  });
});

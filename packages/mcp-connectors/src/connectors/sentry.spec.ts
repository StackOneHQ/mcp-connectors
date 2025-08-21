import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, type vi } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { SentryConnectorConfig } from './sentry';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const mockOrganization = {
  id: '123456789',
  slug: 'test-org',
  name: 'Test Organization',
  dateCreated: '2023-01-01T00:00:00Z',
  status: {
    id: 'active',
    name: 'Active',
  },
};

const mockProject = {
  id: '987654321',
  slug: 'test-project',
  name: 'Test Project',
  platform: 'javascript',
  status: 'active',
  dateCreated: '2023-01-01T00:00:00Z',
  firstEvent: '2023-01-01T12:00:00Z',
  hasAccess: true,
  isBookmarked: false,
  isMember: true,
};

const _mockTeam = {
  id: '456789123',
  slug: 'test-team',
  name: 'Test Team',
  dateCreated: '2023-01-01T00:00:00Z',
  isMember: true,
  hasAccess: true,
  memberCount: 5,
};

const mockIssue = {
  id: '789123456',
  shortId: 'TEST-1',
  title: 'TypeError: Cannot read property',
  culprit: 'app.js in handleError',
  level: 'error',
  status: 'unresolved',
  statusDetails: {},
  count: '42',
  userCount: 15,
  firstSeen: '2023-01-01T10:00:00Z',
  lastSeen: '2023-01-02T15:30:00Z',
  metadata: {
    type: 'TypeError',
    value: "Cannot read property 'foo' of undefined",
  },
  project: {
    id: '987654321',
    slug: 'test-project',
    name: 'Test Project',
  },
};

const mockEvent = {
  id: '123789456',
  eventID: 'abc123def456',
  title: 'TypeError: Cannot read property',
  message: "Cannot read property 'foo' of undefined",
  datetime: '2023-01-02T15:30:00Z',
  platform: 'javascript',
  type: 'error',
  user: {
    id: 'user123',
    email: 'test@example.com',
  },
  tags: [
    { key: 'browser', value: 'Chrome' },
    { key: 'os', value: 'Windows' },
  ],
  contexts: {
    browser: {
      name: 'Chrome',
      version: '98.0.4758.102',
    },
  },
};

const _mockRelease = {
  version: '1.2.3',
  shortVersion: '1.2',
  dateCreated: '2023-01-01T08:00:00Z',
  dateReleased: '2023-01-01T10:00:00Z',
  newGroups: 5,
  commitCount: 25,
  deployCount: 1,
  authors: [
    {
      name: 'John Doe',
      email: 'john@example.com',
    },
  ],
  projects: [
    {
      slug: 'test-project',
      name: 'Test Project',
    },
  ],
};

const mockProjectKey = {
  id: 'key123456',
  name: 'Default',
  label: 'Default',
  public: 'abc123def456ghi789',
  secret: 'secret456def789ghi123',
  projectId: '987654321',
  isActive: true,
  dateCreated: '2023-01-01T00:00:00Z',
  dsn: {
    secret:
      'https://abc123def456ghi789:secret456def789ghi123@o123.ingest.sentry.io/987654321',
    public: 'https://abc123def456ghi789@o123.ingest.sentry.io/987654321',
    csp: 'https://o123.ingest.sentry.io/api/987654321/csp-report/?sentry_key=abc123def456ghi789',
    security:
      'https://o123.ingest.sentry.io/api/987654321/security-report/?sentry_key=abc123def456ghi789',
    minidump:
      'https://o123.ingest.sentry.io/api/987654321/minidump/?sentry_key=abc123def456ghi789',
    nel: 'https://o123.ingest.sentry.io/api/987654321/nel/?sentry_key=abc123def456ghi789',
    unreal: 'https://o123.ingest.sentry.io/api/987654321/unreal/abc123def456ghi789/',
  },
};

describe('#SentryConnector', () => {
  describe('.LIST_ORGANIZATIONS', () => {
    describe('when request is successful', () => {
      it('returns list of organizations', async () => {
        server.use(
          http.get('https://sentry.io/api/0/organizations/', () => {
            return HttpResponse.json([mockOrganization]);
          })
        );

        const tool = SentryConnectorConfig.tools.LIST_ORGANIZATIONS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          authToken: 'test_token',
        });

        const actual = await tool.handler({}, mockContext);

        expect(actual).toContain('Found 1 organizations:');
        expect(actual).toContain('Test Organization (test-org)');
        expect(actual).toContain('Status: Active');
      });
    });

    describe('when request fails', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://sentry.io/api/0/organizations/', () => {
            return HttpResponse.json(
              { detail: 'Authentication failed' },
              { status: 401 }
            );
          })
        );

        const tool = SentryConnectorConfig.tools.LIST_ORGANIZATIONS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          authToken: 'invalid_token',
        });

        const actual = await tool.handler({}, mockContext);

        expect(actual).toContain('Failed to list organizations');
      });
    });
  });

  describe('.LIST_PROJECTS', () => {
    describe('when request is successful', () => {
      it('returns list of projects', async () => {
        server.use(
          http.get('https://sentry.io/api/0/organizations/test-org/projects/', () => {
            return HttpResponse.json([mockProject]);
          })
        );

        const tool = SentryConnectorConfig.tools.LIST_PROJECTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          authToken: 'test_token',
        });

        const actual = await tool.handler({ orgSlug: 'test-org' }, mockContext);

        expect(actual).toContain('Found 1 projects:');
        expect(actual).toContain('Test Project (test-project)');
        expect(actual).toContain('Platform: javascript');
      });
    });
  });

  describe('.LIST_ISSUES', () => {
    describe('when request is successful', () => {
      it('returns list of issues', async () => {
        server.use(
          http.get('https://sentry.io/api/0/organizations/test-org/issues/', () => {
            return HttpResponse.json([mockIssue]);
          })
        );

        const tool = SentryConnectorConfig.tools.LIST_ISSUES as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          authToken: 'test_token',
        });

        const actual = await tool.handler({ orgSlug: 'test-org' }, mockContext);

        expect(actual).toContain('Found 1 issues:');
        expect(actual).toContain('TEST-1: TypeError: Cannot read property');
        expect(actual).toContain('Level: error');
        expect(actual).toContain('Project: Test Project');
      });
    });

    describe('when filtering by project', () => {
      it('uses project-specific endpoint', async () => {
        server.use(
          http.get(
            'https://sentry.io/api/0/projects/test-org/test-project/issues/',
            () => {
              return HttpResponse.json([mockIssue]);
            }
          )
        );

        const tool = SentryConnectorConfig.tools.LIST_ISSUES as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          authToken: 'test_token',
        });

        const actual = await tool.handler(
          { orgSlug: 'test-org', projectSlug: 'test-project' },
          mockContext
        );

        expect(actual).toContain('Found 1 issues:');
      });
    });
  });

  describe('.GET_ISSUE_EVENTS', () => {
    describe('when request is successful', () => {
      it('returns events for the issue', async () => {
        server.use(
          http.get(
            'https://sentry.io/api/0/organizations/test-org/issues/789123456/events/',
            () => {
              return HttpResponse.json([mockEvent]);
            }
          )
        );

        const tool = SentryConnectorConfig.tools.GET_ISSUE_EVENTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          authToken: 'test_token',
        });

        const actual = await tool.handler(
          { orgSlug: 'test-org', issueId: '789123456' },
          mockContext
        );

        expect(actual).toContain('Found 1 events for issue 789123456:');
        expect(actual).toContain('abc123def456: TypeError: Cannot read property');
        expect(actual).toContain('Platform: javascript');
      });
    });
  });

  describe('.SEARCH_EVENTS', () => {
    describe('when request is successful', () => {
      it('returns search results', async () => {
        const mockSearchResult = {
          data: [mockEvent],
          meta: {
            fields: {
              'event.type': 'string',
              timestamp: 'date',
            },
          },
        };

        server.use(
          http.get('https://sentry.io/api/0/organizations/test-org/events/', () => {
            return HttpResponse.json(mockSearchResult);
          })
        );

        const tool = SentryConnectorConfig.tools.SEARCH_EVENTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          authToken: 'test_token',
        });

        const actual = await tool.handler(
          { orgSlug: 'test-org', query: 'event.type:error' },
          mockContext
        );

        expect(actual).toContain('Found 1 events:');
        expect(actual).toContain('abc123def456: TypeError: Cannot read property');
      });
    });
  });

  describe('.CREATE_PROJECT', () => {
    describe('when request is successful', () => {
      it('creates and returns new project', async () => {
        server.use(
          http.post('https://sentry.io/api/0/organizations/test-org/projects/', () => {
            return HttpResponse.json(mockProject);
          })
        );

        const tool = SentryConnectorConfig.tools.CREATE_PROJECT as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          authToken: 'test_token',
        });

        const actual = await tool.handler(
          {
            orgSlug: 'test-org',
            name: 'Test Project',
            platform: 'javascript',
          },
          mockContext
        );

        expect(actual).toContain('Created project: Test Project (test-project)');
        expect(actual).toContain('Platform: javascript');
      });
    });
  });

  describe('.LIST_PROJECT_KEYS', () => {
    describe('when request is successful', () => {
      it('returns project DSN keys', async () => {
        server.use(
          http.get('https://sentry.io/api/0/projects/test-org/test-project/keys/', () => {
            return HttpResponse.json([mockProjectKey]);
          })
        );

        const tool = SentryConnectorConfig.tools.LIST_PROJECT_KEYS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          authToken: 'test_token',
        });

        const actual = await tool.handler(
          { orgSlug: 'test-org', projectSlug: 'test-project' },
          mockContext
        );

        expect(actual).toContain('Found 1 project keys:');
        expect(actual).toContain('Default (Default)');
        expect(actual).toContain('Active: true');
        expect(actual).toContain(
          'DSN: https://abc123def456ghi789@o123.ingest.sentry.io/987654321'
        );
      });
    });
  });
});

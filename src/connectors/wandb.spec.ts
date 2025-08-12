import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterEach, beforeEach, describe, expect, it, type vi } from 'vitest';
import type { ConnectorContext } from '../config-types/types';
import { createMockConnectorContext } from './__mocks__/context';
import { WandbConnectorConfig } from './wandb';

const mockApiUrl = 'https://api.wandb.ai';

const server = setupServer(
  // Mock get user endpoint
  http.get(`${mockApiUrl}/api/v1/viewer`, () => {
    return HttpResponse.json({
      username: 'testuser',
      email: 'test@example.com',
      teams: ['team1', 'team2'],
    });
  }),

  // Mock list projects endpoint
  http.get(`${mockApiUrl}/api/v1/projects`, () => {
    return HttpResponse.json({
      projects: [
        {
          id: 'proj_123',
          name: 'test-project',
          entity: 'testuser',
          description: 'A test project',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          default_access: 'private',
        },
      ],
    });
  }),

  // Mock get specific project
  http.get(`${mockApiUrl}/api/v1/projects/testuser/test-project`, () => {
    return HttpResponse.json({
      id: 'proj_123',
      name: 'test-project',
      entity: 'testuser',
      description: 'A test project',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      default_access: 'private',
    });
  }),

  // Mock create project
  http.post(`${mockApiUrl}/api/v1/projects/testuser`, async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      description?: string;
      default_access?: string;
    };
    return HttpResponse.json({
      id: 'proj_456',
      name: body.name,
      entity: 'testuser',
      description: body.description,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      default_access: body.default_access,
    });
  }),

  // Mock list runs
  http.get(`${mockApiUrl}/api/v1/runs/testuser/test-project`, ({ request }) => {
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit') || '50';
    const state = url.searchParams.get('state');

    let runs = [
      {
        id: 'run_123',
        name: 'test-run-1',
        display_name: 'Test Run 1',
        state: 'finished',
        project: 'test-project',
        entity: 'testuser',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        config: { learning_rate: 0.001 },
        summary: { accuracy: 0.95 },
        tags: ['experiment'],
        url: 'https://wandb.ai/testuser/test-project/runs/run_123',
      },
      {
        id: 'run_456',
        name: 'test-run-2',
        state: 'running',
        project: 'test-project',
        entity: 'testuser',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        config: { learning_rate: 0.01 },
        summary: {},
        tags: [],
        url: 'https://wandb.ai/testuser/test-project/runs/run_456',
      },
    ];

    if (state) {
      runs = runs.filter((run) => run.state === state);
    }

    return HttpResponse.json({
      runs: runs.slice(0, Number.parseInt(limit)),
      total: runs.length,
    });
  }),

  // Mock get specific run
  http.get(`${mockApiUrl}/api/v1/runs/testuser/test-project/run_123`, () => {
    return HttpResponse.json({
      id: 'run_123',
      name: 'test-run-1',
      display_name: 'Test Run 1',
      state: 'finished',
      project: 'test-project',
      entity: 'testuser',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      config: { learning_rate: 0.001 },
      summary: { accuracy: 0.95 },
      tags: ['experiment'],
      url: 'https://wandb.ai/testuser/test-project/runs/run_123',
    });
  }),

  // Mock create run
  http.post(`${mockApiUrl}/api/v1/runs/testuser/test-project`, async ({ request }) => {
    const body = (await request.json()) as {
      name?: string;
      display_name?: string;
      notes?: string;
      tags?: string[];
      config?: Record<string, unknown>;
      group?: string;
      job_type?: string;
    };
    return HttpResponse.json({
      id: 'run_789',
      name: body.name || 'generated-name-123',
      display_name: body.display_name,
      state: 'running',
      project: 'test-project',
      entity: 'testuser',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      config: body.config || {},
      summary: {},
      notes: body.notes,
      tags: body.tags || [],
      group: body.group,
      job_type: body.job_type,
      url: 'https://wandb.ai/testuser/test-project/runs/run_789',
    });
  }),

  // Mock update run
  http.put(
    `${mockApiUrl}/api/v1/runs/testuser/test-project/run_123`,
    async ({ request }) => {
      const body = (await request.json()) as {
        display_name?: string;
        notes?: string;
        tags?: string[];
        summary?: Record<string, unknown>;
      };
      return HttpResponse.json({
        id: 'run_123',
        name: 'test-run-1',
        display_name: body.display_name || 'Test Run 1',
        state: 'finished',
        project: 'test-project',
        entity: 'testuser',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        config: { learning_rate: 0.001 },
        summary: body.summary || { accuracy: 0.95 },
        notes: body.notes,
        tags: body.tags || ['experiment'],
        url: 'https://wandb.ai/testuser/test-project/runs/run_123',
      });
    }
  ),

  // Mock delete run
  http.delete(`${mockApiUrl}/api/v1/runs/testuser/test-project/run_123`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Mock log metrics
  http.post(`${mockApiUrl}/api/v1/runs/testuser/test-project/run_123/history`, () => {
    return new HttpResponse(null, { status: 200 });
  }),

  // Mock get run history
  http.get(
    `${mockApiUrl}/api/v1/runs/testuser/test-project/run_123/history`,
    ({ request }) => {
      const url = new URL(request.url);
      // Keys parameter can be used for filtering, but not implemented in this mock
      const _keys = url.searchParams.get('keys')?.split(',');

      return HttpResponse.json({
        history: [
          {
            timestamp: Date.now() / 1000,
            step: 0,
            values: { loss: 0.5, accuracy: 0.8 },
          },
          {
            timestamp: Date.now() / 1000 + 1,
            step: 1,
            values: { loss: 0.3, accuracy: 0.9 },
          },
        ],
      });
    }
  ),

  // Mock list artifacts
  http.get(`${mockApiUrl}/api/v1/artifacts/testuser/test-project`, ({ request }) => {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');

    let artifacts = [
      {
        id: 'artifact_123',
        name: 'model',
        type: 'model',
        description: 'Training model',
        size: 1024,
        digest: 'abc123',
        state: 'COMMITTED',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        version: 'v0',
        aliases: ['latest'],
        tags: [],
        url: 'https://wandb.ai/testuser/test-project/artifacts/model/v0',
      },
      {
        id: 'artifact_456',
        name: 'dataset',
        type: 'dataset',
        size: 2048,
        digest: 'def456',
        state: 'COMMITTED',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        version: 'v1',
        aliases: ['latest'],
        tags: ['train'],
        url: 'https://wandb.ai/testuser/test-project/artifacts/dataset/v1',
      },
    ];

    if (type) {
      artifacts = artifacts.filter((artifact) => artifact.type === type);
    }

    return HttpResponse.json({
      artifacts,
      total: artifacts.length,
    });
  }),

  // Mock get specific artifact
  http.get(`${mockApiUrl}/api/v1/artifacts/testuser/test-project/model:latest`, () => {
    return HttpResponse.json({
      id: 'artifact_123',
      name: 'model',
      type: 'model',
      description: 'Training model',
      size: 1024,
      digest: 'abc123',
      state: 'COMMITTED',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      version: 'v0',
      aliases: ['latest'],
      tags: [],
      url: 'https://wandb.ai/testuser/test-project/artifacts/model/v0',
    });
  }),

  // Mock error cases
  http.get(`${mockApiUrl}/api/v1/runs/testuser/test-project/nonexistent`, () => {
    return new HttpResponse('Run not found', { status: 404 });
  }),

  // Mock delete non-existent run
  http.delete(`${mockApiUrl}/api/v1/runs/testuser/test-project/nonexistent`, () => {
    return new HttpResponse('Run not found', { status: 404 });
  })
);

describe('#WandbConnector', () => {
  let mockContext: ConnectorContext;

  beforeEach(() => {
    server.listen({ onUnhandledRequest: 'error' });
    mockContext = createMockConnectorContext();
    (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
      api_key: 'test-api-key',
      base_url: mockApiUrl,
    });
  });

  afterEach(() => {
    server.resetHandlers();
    server.close();
  });

  describe('.wandb_get_me', () => {
    describe('when credentials are valid', () => {
      it('returns user information', async () => {
        const result = await WandbConnectorConfig.tools.GET_ME.handler({}, mockContext);

        expect(result).toContain('testuser');
        expect(result).toContain('test@example.com');
        expect(result).toContain('team1');
      });
    });

    describe('when API key is invalid', () => {
      it('handles authentication error', async () => {
        server.use(
          http.get(`${mockApiUrl}/api/v1/viewer`, () => {
            return new HttpResponse('Unauthorized', { status: 401 });
          })
        );

        const result = await WandbConnectorConfig.tools.GET_ME.handler({}, mockContext);

        expect(result).toContain('Error:');
        expect(result).toContain('401');
      });
    });
  });

  describe('.wandb_list_projects', () => {
    describe('when projects exist', () => {
      it('returns list of projects', async () => {
        const result = await WandbConnectorConfig.tools.LIST_PROJECTS.handler(
          {},
          mockContext
        );

        expect(result).toContain('test-project');
        expect(result).toContain('testuser');
        expect(result).toContain('A test project');
      });
    });

    describe('when no projects exist', () => {
      it('returns empty list', async () => {
        server.use(
          http.get(`${mockApiUrl}/api/v1/projects`, () => {
            return HttpResponse.json({ projects: [] });
          })
        );

        const result = await WandbConnectorConfig.tools.LIST_PROJECTS.handler(
          {},
          mockContext
        );

        expect(result).toContain('[]');
      });
    });
  });

  describe('.wandb_get_project', () => {
    describe('when project exists', () => {
      it('returns project details', async () => {
        const result = await WandbConnectorConfig.tools.GET_PROJECT.handler(
          { entity: 'testuser', project: 'test-project' },
          mockContext
        );

        expect(result).toContain('test-project');
        expect(result).toContain('proj_123');
        expect(result).toContain('A test project');
      });
    });

    describe('when project does not exist', () => {
      it('handles not found error', async () => {
        server.use(
          http.get(`${mockApiUrl}/api/v1/projects/testuser/nonexistent`, () => {
            return new HttpResponse('Project not found', { status: 404 });
          })
        );

        const result = await WandbConnectorConfig.tools.GET_PROJECT.handler(
          { entity: 'testuser', project: 'nonexistent' },
          mockContext
        );

        expect(result).toContain('Error:');
        expect(result).toContain('404');
      });
    });
  });

  describe('.wandb_create_project', () => {
    describe('when creating a new project', () => {
      it('creates project successfully', async () => {
        const result = await WandbConnectorConfig.tools.CREATE_PROJECT.handler(
          {
            entity: 'testuser',
            name: 'new-project',
            description: 'A new project',
            visibility: 'private',
          },
          mockContext
        );

        expect(result).toContain('new-project');
        expect(result).toContain('A new project');
        expect(result).toContain('private');
      });
    });

    describe('when project name already exists', () => {
      it('handles conflict error', async () => {
        server.use(
          http.post(`${mockApiUrl}/api/v1/projects/testuser`, () => {
            return new HttpResponse('Project already exists', { status: 409 });
          })
        );

        const result = await WandbConnectorConfig.tools.CREATE_PROJECT.handler(
          {
            entity: 'testuser',
            name: 'existing-project',
          },
          mockContext
        );

        expect(result).toContain('Error:');
        expect(result).toContain('409');
      });
    });
  });

  describe('.wandb_list_runs', () => {
    describe('when runs exist', () => {
      it('returns list of runs', async () => {
        const result = await WandbConnectorConfig.tools.LIST_RUNS.handler(
          { entity: 'testuser', project: 'test-project' },
          mockContext
        );

        expect(result).toContain('test-run-1');
        expect(result).toContain('finished');
        expect(result).toContain('running');
      });
    });

    describe('when filtering by state', () => {
      it('returns only runs with specified state', async () => {
        const result = await WandbConnectorConfig.tools.LIST_RUNS.handler(
          { entity: 'testuser', project: 'test-project', state: 'finished' },
          mockContext
        );

        expect(result).toContain('test-run-1');
        expect(result).toContain('finished');
        expect(result).not.toContain('running');
      });
    });

    describe('when limiting results', () => {
      it('respects limit parameter', async () => {
        const result = await WandbConnectorConfig.tools.LIST_RUNS.handler(
          { entity: 'testuser', project: 'test-project', limit: 1 },
          mockContext
        );

        const parsed = JSON.parse(result);
        expect(parsed.runs).toHaveLength(1);
      });
    });
  });

  describe('.wandb_create_run', () => {
    describe('when creating a new run', () => {
      it('creates run successfully', async () => {
        const result = await WandbConnectorConfig.tools.CREATE_RUN.handler(
          {
            entity: 'testuser',
            project: 'test-project',
            display_name: 'New Test Run',
            notes: 'This is a test run',
            tags: ['test'],
            config: { batch_size: 32 },
            job_type: 'train',
          },
          mockContext
        );

        expect(result).toContain('New Test Run');
        expect(result).toContain('This is a test run');
        expect(result).toContain('test');
        expect(result).toContain('train');
      });
    });
  });

  describe('.wandb_log_metrics', () => {
    describe('when logging metrics', () => {
      it('logs metrics successfully', async () => {
        const result = await WandbConnectorConfig.tools.LOG_METRICS.handler(
          {
            entity: 'testuser',
            project: 'test-project',
            run_id: 'run_123',
            metrics: { loss: 0.1, accuracy: 0.99 },
            step: 5,
          },
          mockContext
        );

        expect(result).toBe('Metrics logged successfully');
      });
    });

    describe('when run does not exist', () => {
      it('handles error gracefully', async () => {
        server.use(
          http.post(
            `${mockApiUrl}/api/v1/runs/testuser/test-project/nonexistent/history`,
            () => {
              return new HttpResponse('Run not found', { status: 404 });
            }
          )
        );

        const result = await WandbConnectorConfig.tools.LOG_METRICS.handler(
          {
            entity: 'testuser',
            project: 'test-project',
            run_id: 'nonexistent',
            metrics: { loss: 0.1 },
          },
          mockContext
        );

        expect(result).toContain('Error:');
        expect(result).toContain('404');
      });
    });
  });

  describe('.wandb_get_run_history', () => {
    describe('when run has history', () => {
      it('returns metrics history', async () => {
        const result = await WandbConnectorConfig.tools.GET_RUN_HISTORY.handler(
          {
            entity: 'testuser',
            project: 'test-project',
            run_id: 'run_123',
          },
          mockContext
        );

        expect(result).toContain('loss');
        expect(result).toContain('accuracy');
        expect(result).toContain('0.5');
        expect(result).toContain('0.8');
      });
    });

    describe('when filtering by keys', () => {
      it('respects keys parameter', async () => {
        const result = await WandbConnectorConfig.tools.GET_RUN_HISTORY.handler(
          {
            entity: 'testuser',
            project: 'test-project',
            run_id: 'run_123',
            keys: ['loss'],
          },
          mockContext
        );

        expect(result).toContain('loss');
      });
    });
  });

  describe('.wandb_list_artifacts', () => {
    describe('when artifacts exist', () => {
      it('returns list of artifacts', async () => {
        const result = await WandbConnectorConfig.tools.LIST_ARTIFACTS.handler(
          { entity: 'testuser', project: 'test-project' },
          mockContext
        );

        expect(result).toContain('model');
        expect(result).toContain('dataset');
        expect(result).toContain('artifact_123');
      });
    });

    describe('when filtering by type', () => {
      it('returns only artifacts of specified type', async () => {
        const result = await WandbConnectorConfig.tools.LIST_ARTIFACTS.handler(
          { entity: 'testuser', project: 'test-project', type: 'model' },
          mockContext
        );

        expect(result).toContain('model');
        expect(result).not.toContain('dataset');
      });
    });
  });

  describe('.wandb_get_artifact', () => {
    describe('when artifact exists', () => {
      it('returns artifact details', async () => {
        const result = await WandbConnectorConfig.tools.GET_ARTIFACT.handler(
          {
            entity: 'testuser',
            project: 'test-project',
            artifact_name: 'model',
            version: 'latest',
          },
          mockContext
        );

        expect(result).toContain('model');
        expect(result).toContain('artifact_123');
        expect(result).toContain('Training model');
      });
    });

    describe('when artifact does not exist', () => {
      it('handles not found error', async () => {
        server.use(
          http.get(
            `${mockApiUrl}/api/v1/artifacts/testuser/test-project/nonexistent:latest`,
            () => {
              return new HttpResponse('Artifact not found', { status: 404 });
            }
          )
        );

        const result = await WandbConnectorConfig.tools.GET_ARTIFACT.handler(
          {
            entity: 'testuser',
            project: 'test-project',
            artifact_name: 'nonexistent',
          },
          mockContext
        );

        expect(result).toContain('Error:');
        expect(result).toContain('404');
      });
    });
  });

  describe('.wandb_delete_run', () => {
    describe('when run exists', () => {
      it('deletes run successfully', async () => {
        const result = await WandbConnectorConfig.tools.DELETE_RUN.handler(
          {
            entity: 'testuser',
            project: 'test-project',
            run_id: 'run_123',
          },
          mockContext
        );

        expect(result).toBe('Run deleted successfully');
      });
    });

    describe('when run does not exist', () => {
      it('handles not found error', async () => {
        const result = await WandbConnectorConfig.tools.DELETE_RUN.handler(
          {
            entity: 'testuser',
            project: 'test-project',
            run_id: 'nonexistent',
          },
          mockContext
        );

        expect(result).toContain('Error:');
        expect(result).toContain('404');
      });
    });
  });
});

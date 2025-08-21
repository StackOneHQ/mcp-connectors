import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { MakeConnectorConfig } from './make';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Make Connector', () => {
  const mockContext = createMockConnectorContext();

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext.getCredentials = vi.fn().mockResolvedValue({
      apiToken: 'test-token-123',
      region: 'eu1' as const,
    });
  });

  describe('LIST_SCENARIOS', () => {
    it('should list scenarios successfully', async () => {
      const mockResponse = {
        scenarios: [
          {
            id: 1,
            name: 'Test Scenario',
            description: 'A test scenario',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            team_id: 1,
            concept: false,
            scheduling: { type: 'on-demand' },
            status: 'active',
          },
          {
            id: 2,
            name: 'Another Scenario',
            description: 'Another test scenario',
            created_at: '2024-01-02T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z',
            team_id: 1,
            concept: false,
            scheduling: { type: 'immediately' },
            status: 'inactive',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const result = await MakeConnectorConfig.tools.LIST_SCENARIOS.handler(
        {},
        mockContext
      );
      const parsedResult = JSON.parse(result);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://eu1.make.com/api/v2/scenarios?',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Token test-token-123',
            Accept: 'application/json',
          }),
        })
      );
      expect(parsedResult).toHaveLength(2);
      expect(parsedResult[0].name).toBe('Test Scenario');
      expect(parsedResult[1].name).toBe('Another Scenario');
    });

    it('should filter scenarios by team and folder', async () => {
      const mockResponse = {
        scenarios: [
          {
            id: 1,
            name: 'Filtered Scenario',
            team_id: 123,
            folder_id: 456,
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const result = await MakeConnectorConfig.tools.LIST_SCENARIOS.handler(
        { teamId: 123, folderId: 456 },
        mockContext
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://eu1.make.com/api/v2/scenarios?team_id=123&folder_id=456',
        expect.any(Object)
      );
      expect(JSON.parse(result)).toHaveLength(1);
    });
  });

  describe('GET_SCENARIO', () => {
    it('should get a scenario successfully', async () => {
      const mockResponse = {
        scenario: {
          id: 1,
          name: 'Test Scenario',
          description: 'A detailed test scenario',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          team_id: 1,
          concept: false,
          scheduling: { type: 'on-demand' },
          status: 'active',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const result = await MakeConnectorConfig.tools.GET_SCENARIO.handler(
        { scenarioId: 1 },
        mockContext
      );
      const parsedResult = JSON.parse(result);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://eu1.make.com/api/v2/scenarios/1',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Token test-token-123',
          }),
        })
      );
      expect(parsedResult.id).toBe(1);
      expect(parsedResult.name).toBe('Test Scenario');
    });
  });

  describe('GET_SCENARIO_BLUEPRINT', () => {
    it('should get scenario blueprint successfully', async () => {
      const mockResponse = {
        blueprint: {
          flow: [
            {
              id: 1,
              module: 'http',
              version: 1,
              parameters: {
                url: 'https://api.example.com',
                method: 'GET',
              },
              metadata: {
                designer: { x: 0, y: 0 },
              },
            },
          ],
          metadata: {
            version: 1,
            scenario: {
              name: 'Test Scenario',
              description: 'A test scenario blueprint',
            },
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const result = await MakeConnectorConfig.tools.GET_SCENARIO_BLUEPRINT.handler(
        { scenarioId: 1 },
        mockContext
      );
      const parsedResult = JSON.parse(result);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://eu1.make.com/api/v2/scenarios/1/blueprint',
        expect.any(Object)
      );
      expect(parsedResult.flow).toHaveLength(1);
      expect(parsedResult.flow[0].module).toBe('http');
    });
  });

  describe('CREATE_SCENARIO', () => {
    it('should create a scenario successfully', async () => {
      const mockResponse = {
        scenario: {
          id: 123,
          name: 'New Scenario',
          description: 'A newly created scenario',
          team_id: 1,
          scheduling: { type: 'on-demand' },
          settings: {
            incomplete_execution_policy: 'break',
            sequential_processing: true,
            auto_commit: true,
          },
          status: 'draft',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const result = await MakeConnectorConfig.tools.CREATE_SCENARIO.handler(
        {
          name: 'New Scenario',
          description: 'A newly created scenario',
          teamId: 1,
        },
        mockContext
      );
      const parsedResult = JSON.parse(result);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://eu1.make.com/api/v2/scenarios',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('"name":"New Scenario"'),
        })
      );
      expect(parsedResult.id).toBe(123);
      expect(parsedResult.name).toBe('New Scenario');
    });
  });

  describe('CLONE_SCENARIO', () => {
    it('should clone a scenario successfully', async () => {
      const mockResponse = {
        scenario: {
          id: 124,
          name: 'Cloned Scenario',
          description: 'A cloned scenario',
          team_id: 1,
          status: 'draft',
          created_at: '2024-01-01T00:00:00Z',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const result = await MakeConnectorConfig.tools.CLONE_SCENARIO.handler(
        {
          scenarioId: 1,
          name: 'Cloned Scenario',
          teamId: 1,
        },
        mockContext
      );
      const parsedResult = JSON.parse(result);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://eu1.make.com/api/v2/scenarios/1/clone',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(parsedResult.id).toBe(124);
      expect(parsedResult.name).toBe('Cloned Scenario');
    });
  });

  describe('RUN_SCENARIO', () => {
    it('should run a scenario successfully', async () => {
      const mockResponse = {
        execution: {
          id: 456,
          scenario_id: 1,
          status: 'success',
          started_at: '2024-01-01T10:00:00Z',
          finished_at: '2024-01-01T10:01:00Z',
          operations_count: 5,
          data_transfer: 1024,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const result = await MakeConnectorConfig.tools.RUN_SCENARIO.handler(
        { scenarioId: 1 },
        mockContext
      );
      const parsedResult = JSON.parse(result);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://eu1.make.com/api/v2/scenarios/1/run',
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(parsedResult.id).toBe(456);
      expect(parsedResult.status).toBe('success');
    });
  });

  describe('Error handling', () => {
    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const result = await MakeConnectorConfig.tools.LIST_SCENARIOS.handler(
        {},
        mockContext
      );

      expect(result).toContain('Failed to list scenarios');
      expect(result).toContain('Make.com API error: 401 Unauthorized');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await MakeConnectorConfig.tools.LIST_SCENARIOS.handler(
        {},
        mockContext
      );

      expect(result).toContain('Failed to list scenarios');
      expect(result).toContain('Network error');
    });
  });

  describe('LIST_ORGANIZATIONS', () => {
    it('should list organizations successfully', async () => {
      const mockResponse = {
        organizations: [
          {
            id: 1,
            name: 'Test Organization',
            timezone: 'UTC',
            plan: 'pro',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const result = await MakeConnectorConfig.tools.LIST_ORGANIZATIONS.handler(
        {},
        mockContext
      );
      const parsedResult = JSON.parse(result);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://eu1.make.com/api/v2/organizations',
        expect.any(Object)
      );
      expect(parsedResult).toHaveLength(1);
      expect(parsedResult[0].name).toBe('Test Organization');
    });
  });

  describe('LIST_TEAMS', () => {
    it('should list teams successfully', async () => {
      const mockResponse = {
        teams: [
          {
            id: 1,
            name: 'Development Team',
            organization_id: 1,
          },
          {
            id: 2,
            name: 'Marketing Team',
            organization_id: 1,
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const result = await MakeConnectorConfig.tools.LIST_TEAMS.handler({}, mockContext);
      const parsedResult = JSON.parse(result);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://eu1.make.com/api/v2/teams',
        expect.any(Object)
      );
      expect(parsedResult).toHaveLength(2);
      expect(parsedResult[0].name).toBe('Development Team');
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockConnectorContext } from './__mocks__/context';
import { FPLConnectorConfig } from './fpl';

// Mock fetch globally for tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockBootstrapData = {
  elements: [
    {
      id: 1,
      first_name: 'Mohamed',
      second_name: 'Salah',
      web_name: 'Salah',
      team: 12,
      element_type: 3,
      now_cost: 130,
      total_points: 150,
      points_per_game: 8.5,
      selected_by_percent: 45.2,
      form: 7.8,
      minutes: 1200,
      goals_scored: 15,
      assists: 8,
      clean_sheets: 0,
      goals_conceded: 0,
      yellow_cards: 2,
      red_cards: 0,
      saves: 0,
      bonus: 12,
      bps: 456,
      influence: 789.5,
      creativity: 654.2,
      threat: 1234.7,
      ict_index: 2678.4,
      expected_goals: 12.5,
      expected_assists: 6.8,
      expected_goal_involvements: 19.3,
      expected_goals_conceded: 0,
    },
    {
      id: 2,
      first_name: 'Virgil',
      second_name: 'van Dijk',
      web_name: 'van Dijk',
      team: 12,
      element_type: 2,
      now_cost: 65,
      total_points: 85,
      points_per_game: 4.8,
      selected_by_percent: 25.1,
      form: 5.2,
      minutes: 1350,
      goals_scored: 3,
      assists: 1,
      clean_sheets: 8,
      goals_conceded: 15,
      yellow_cards: 1,
      red_cards: 0,
      saves: 0,
      bonus: 8,
      bps: 234,
      influence: 456.2,
      creativity: 123.4,
      threat: 234.1,
      ict_index: 813.7,
      expected_goals: 2.1,
      expected_assists: 1.2,
      expected_goal_involvements: 3.3,
      expected_goals_conceded: 12.5,
    },
  ],
  teams: [
    {
      id: 12,
      name: 'Liverpool',
      short_name: 'LIV',
      strength: 5,
      strength_overall_home: 1400,
      strength_overall_away: 1350,
      strength_attack_home: 1450,
      strength_attack_away: 1400,
      strength_defence_home: 1350,
      strength_defence_away: 1300,
    },
  ],
  events: [
    {
      id: 18,
      name: 'Gameweek 18',
      deadline_time: '2024-12-30T11:30:00Z',
      finished: false,
      is_current: true,
      is_next: false,
      most_selected: 1,
      most_transferred_in: 1,
      top_element: 1,
      most_captained: 1,
      most_vice_captained: 2,
    },
    {
      id: 19,
      name: 'Gameweek 19',
      deadline_time: '2025-01-05T11:30:00Z',
      finished: false,
      is_current: false,
      is_next: true,
      most_selected: null,
      most_transferred_in: null,
      top_element: null,
      most_captained: null,
      most_vice_captained: null,
    },
  ],
  element_types: [
    { id: 1, plural_name: 'Goalkeepers', singular_name: 'Goalkeeper' },
    { id: 2, plural_name: 'Defenders', singular_name: 'Defender' },
    { id: 3, plural_name: 'Midfielders', singular_name: 'Midfielder' },
    { id: 4, plural_name: 'Forwards', singular_name: 'Forward' },
  ],
  total_players: 2,
};

describe('#FPLConnector', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('.GET_BOOTSTRAP_DATA', () => {
    describe('when called successfully', () => {
      it('returns bootstrap data with players, teams, and gameweeks', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockBootstrapData),
        });

        const mockContext = createMockConnectorContext();
        const result = await FPLConnectorConfig.tools.GET_BOOTSTRAP_DATA.handler(
          {},
          mockContext
        );

        expect(result).toEqual({
          players: mockBootstrapData.elements,
          teams: mockBootstrapData.teams,
          gameweeks: mockBootstrapData.events,
          element_types: mockBootstrapData.element_types,
          total_players: mockBootstrapData.total_players,
        });
      });
    });

    describe('when API request fails', () => {
      it('throws error with status information', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        });

        const mockContext = createMockConnectorContext();
        await expect(
          FPLConnectorConfig.tools.GET_BOOTSTRAP_DATA.handler({}, mockContext)
        ).rejects.toThrow('Failed to fetch FPL data: 500 Internal Server Error');
      });
    });
  });

  describe('.ANALYZE_PLAYERS', () => {
    describe('when filtering by position', () => {
      it('returns only midfielders when position is MID', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockBootstrapData),
        });

        const mockContext = createMockConnectorContext();
        const result = await FPLConnectorConfig.tools.ANALYZE_PLAYERS.handler(
          { position: 'MID', limit: 10 },
          mockContext
        );

        expect(result.players).toHaveLength(1);
        expect(result.players[0].name).toBe('Mohamed Salah');
        expect(result.players[0].position).toBe(3);
      });
    });
  });

  describe('.GET_GAMEWEEK_STATUS', () => {
    describe('when getting current gameweek status', () => {
      it('returns current and next gameweek information', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockBootstrapData),
        });

        const mockContext = createMockConnectorContext();
        const result = await FPLConnectorConfig.tools.GET_GAMEWEEK_STATUS.handler(
          {},
          mockContext
        );

        expect(result.current_gameweek?.id).toBe(18);
        expect(result.current_gameweek?.name).toBe('Gameweek 18');
        expect(result.next_gameweek?.id).toBe(19);
        expect(result.next_gameweek?.name).toBe('Gameweek 19');
        expect(result.total_gameweeks).toBe(2);
      });
    });
  });
});

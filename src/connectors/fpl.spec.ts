import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockConnectorContext } from './__mocks__/context';
import { FPLConnectorConfig } from './fpl';

// Mock FPL API data
const mockBootstrapData = {
  elements: [
    {
      id: 1,
      first_name: 'Mohamed',
      second_name: 'Salah',
      web_name: 'Salah',
      team: 1,
      element_type: 3,
      now_cost: 130,
      total_points: 180,
      points_per_game: 6.5,
      selected_by_percent: '45.2',
      form: '5.8',
      transfers_in_event: 15000,
      transfers_out_event: 8000,
      value_form: '8.9',
      value_season: '13.8',
      minutes: 2500,
      goals_scored: 15,
      assists: 8,
      clean_sheets: 0,
      goals_conceded: 0,
      own_goals: 0,
      penalties_saved: 0,
      penalties_missed: 0,
      yellow_cards: 2,
      red_cards: 0,
      saves: 0,
      bonus: 25,
      bps: 450,
      influence: '850.2',
      creativity: '650.8',
      threat: '920.4',
      ict_index: '242.1',
      starts: 28,
      expected_goals: '12.5',
      expected_assists: '6.8',
      expected_goal_involvements: '19.3',
      expected_goals_conceded: '0.0',
      influence_rank: 5,
      influence_rank_type: 1,
      creativity_rank: 15,
      creativity_rank_type: 1,
      threat_rank: 3,
      threat_rank_type: 1,
      ict_index_rank: 2,
      ict_index_rank_type: 1,
      corners_and_indirect_freekicks_order: 1,
      corners_and_indirect_freekicks_text: 'Takes some',
      direct_freekicks_order: null,
      direct_freekicks_text: '',
      penalties_order: 1,
      penalties_text: 'Takes',
      expected_goals_per_90: 0.45,
      saves_per_90: 0.0,
      expected_assists_per_90: 0.24,
      expected_goal_involvements_per_90: 0.69,
      expected_goals_conceded_per_90: 0.0,
      goals_conceded_per_90: 0.0,
      now_cost_rank: 1,
      now_cost_rank_type: 1,
      form_rank: 8,
      form_rank_type: 1,
      points_per_game_rank: 3,
      points_per_game_rank_type: 1,
      selected_rank: 2,
      selected_rank_type: 1,
      starts_per_90: 1.0,
      clean_sheets_per_90: 0.0,
    },
    {
      id: 2,
      first_name: 'Erling',
      second_name: 'Haaland',
      web_name: 'Haaland',
      team: 2,
      element_type: 4,
      now_cost: 150,
      total_points: 200,
      points_per_game: 7.2,
      selected_by_percent: '55.8',
      form: '6.2',
      transfers_in_event: 20000,
      transfers_out_event: 5000,
      value_form: '9.2',
      value_season: '14.5',
      minutes: 2400,
      goals_scored: 22,
      assists: 5,
      clean_sheets: 0,
      goals_conceded: 0,
      own_goals: 0,
      penalties_saved: 0,
      penalties_missed: 0,
      yellow_cards: 1,
      red_cards: 0,
      saves: 0,
      bonus: 30,
      bps: 520,
      influence: '920.4',
      creativity: '450.2',
      threat: '1050.8',
      ict_index: '265.3',
      starts: 26,
      expected_goals: '18.2',
      expected_assists: '4.5',
      expected_goal_involvements: '22.7',
      expected_goals_conceded: '0.0',
      influence_rank: 3,
      influence_rank_type: 1,
      creativity_rank: 25,
      creativity_rank_type: 1,
      threat_rank: 1,
      threat_rank_type: 1,
      ict_index_rank: 1,
      ict_index_rank_type: 1,
      corners_and_indirect_freekicks_order: null,
      corners_and_indirect_freekicks_text: '',
      direct_freekicks_order: null,
      direct_freekicks_text: '',
      penalties_order: null,
      penalties_text: '',
      expected_goals_per_90: 0.68,
      saves_per_90: 0.0,
      expected_assists_per_90: 0.17,
      expected_goal_involvements_per_90: 0.85,
      expected_goals_conceded_per_90: 0.0,
      goals_conceded_per_90: 0.0,
      now_cost_rank: 1,
      now_cost_rank_type: 1,
      form_rank: 5,
      form_rank_type: 1,
      points_per_game_rank: 1,
      points_per_game_rank_type: 1,
      selected_rank: 1,
      selected_rank_type: 1,
      starts_per_90: 0.98,
      clean_sheets_per_90: 0.0,
    },
  ],
  teams: [
    {
      id: 1,
      name: 'Liverpool',
      short_name: 'LIV',
      strength: 5,
      strength_overall_home: 1350,
      strength_overall_away: 1300,
      strength_attack_home: 1400,
      strength_attack_away: 1350,
      strength_defence_home: 1300,
      strength_defence_away: 1250,
      pulse_id: 26,
    },
    {
      id: 2,
      name: 'Manchester City',
      short_name: 'MCI',
      strength: 5,
      strength_overall_home: 1400,
      strength_overall_away: 1350,
      strength_attack_home: 1450,
      strength_attack_away: 1400,
      strength_defence_home: 1350,
      strength_defence_away: 1300,
      pulse_id: 43,
    },
  ],
  events: [
    {
      id: 1,
      name: 'Gameweek 1',
      deadline_time: '2024-08-16T17:30:00Z',
      deadline_time_epoch: 1723826400,
      deadline_time_game_offset: 0,
      deadline_time_formatted: '16 Aug 18:30',
      release_time: null,
      average_entry_score: 45,
      finished: true,
      data_checked: true,
      highest_scoring_entry: 123456,
      highest_score: 89,
      is_previous: true,
      is_current: false,
      is_next: false,
      cup_leagues_created: false,
      h2h_ko_matches_created: false,
      chip_plays: [
        { chip_name: 'wildcard', num_played: 150000 },
        { chip_name: 'freehit', num_played: 25000 },
      ],
      most_selected: 1,
      most_transferred_in: 2,
      top_element: 2,
      top_element_info: { id: 2, points: 18 },
      transfers_made: 2500000,
      most_captained: 2,
      most_vice_captained: 1,
    },
    {
      id: 2,
      name: 'Gameweek 2',
      deadline_time: '2024-08-23T17:30:00Z',
      deadline_time_epoch: 1724431200,
      deadline_time_game_offset: 0,
      deadline_time_formatted: '23 Aug 18:30',
      release_time: null,
      average_entry_score: 52,
      finished: false,
      data_checked: false,
      highest_scoring_entry: null,
      highest_score: null,
      is_previous: false,
      is_current: true,
      is_next: false,
      cup_leagues_created: false,
      h2h_ko_matches_created: false,
      chip_plays: [],
      most_selected: null,
      most_transferred_in: null,
      top_element: null,
      top_element_info: null,
      transfers_made: 0,
      most_captained: null,
      most_vice_captained: null,
    },
    {
      id: 3,
      name: 'Gameweek 3',
      deadline_time: '2024-08-30T17:30:00Z',
      deadline_time_epoch: 1725036000,
      deadline_time_game_offset: 0,
      deadline_time_formatted: '30 Aug 18:30',
      release_time: null,
      average_entry_score: 0,
      finished: false,
      data_checked: false,
      highest_scoring_entry: null,
      highest_score: null,
      is_previous: false,
      is_current: false,
      is_next: true,
      cup_leagues_created: false,
      h2h_ko_matches_created: false,
      chip_plays: [],
      most_selected: null,
      most_transferred_in: null,
      top_element: null,
      top_element_info: null,
      transfers_made: 0,
      most_captained: null,
      most_vice_captained: null,
    },
  ],
  element_types: [
    {
      id: 1,
      plural_name: 'Goalkeepers',
      singular_name: 'Goalkeeper',
      singular_name_short: 'GKP',
      element_count: 60,
    },
    {
      id: 2,
      plural_name: 'Defenders',
      singular_name: 'Defender',
      singular_name_short: 'DEF',
      element_count: 180,
    },
    {
      id: 3,
      plural_name: 'Midfielders',
      singular_name: 'Midfielder',
      singular_name_short: 'MID',
      element_count: 240,
    },
    {
      id: 4,
      plural_name: 'Forwards',
      singular_name: 'Forward',
      singular_name_short: 'FWD',
      element_count: 120,
    },
  ],
};

const mockFixtures = [
  {
    id: 1,
    code: 2465854,
    event: 2,
    finished: false,
    finished_provisional: false,
    kickoff_time: '2024-08-24T14:00:00Z',
    minutes: 0,
    provisional_start_time: false,
    started: null,
    team_a: 2,
    team_a_score: null,
    team_h: 1,
    team_h_score: null,
    stats: [],
    team_h_difficulty: 4,
    team_a_difficulty: 5,
    pulse_id: 78932,
  },
  {
    id: 2,
    code: 2465855,
    event: 3,
    finished: false,
    finished_provisional: false,
    kickoff_time: '2024-08-31T14:00:00Z',
    minutes: 0,
    provisional_start_time: false,
    started: null,
    team_a: 1,
    team_a_score: null,
    team_h: 2,
    team_h_score: null,
    stats: [],
    team_h_difficulty: 3,
    team_a_difficulty: 4,
    pulse_id: 78933,
  },
];

const mockManagerInfo = {
  id: 123456,
  joined_time: '2024-08-01T10:00:00Z',
  started_event: 1,
  favourite_team: 1,
  player_first_name: 'John',
  player_last_name: 'Doe',
  player_region_id: 1,
  player_region_name: 'England',
  player_region_iso_code_short: 'EN',
  player_region_iso_code_long: 'ENG',
  summary_overall_points: 1250,
  summary_overall_rank: 85000,
  summary_event_points: 65,
  summary_event_rank: 125000,
  current_event: 2,
  leagues: {
    classic: [
      {
        id: 1,
        name: 'Overall',
        short_name: 'Overall',
        created: '2024-08-01T00:00:00Z',
        closed: false,
        max_entries: null,
        league_type: 'x',
        scoring: 'c',
        admin_entry: null,
        start_event: 1,
        entry_rank: 85000,
        entry_last_rank: 90000,
        entry_can_leave: false,
        entry_can_admin: false,
        entry_can_invite: false,
        has_cup: false,
        cup_league: null,
        cup_qualified: null,
      },
    ],
    h2h: [],
    cup: null,
    cup_matches: [],
  },
  name: 'John Doe',
  name_change_blocked: false,
  entered_events: [1, 2],
  kit: null,
  last_deadline_bank: 5,
  last_deadline_value: 1000,
  last_deadline_total_transfers: 2,
};

const mockMyTeam = {
  picks: [
    { element: 1, position: 1, multiplier: 2, is_captain: true, is_vice_captain: false },
    { element: 2, position: 2, multiplier: 1, is_captain: false, is_vice_captain: true },
  ],
  chips: [
    {
      status_for_entry: 'available',
      played_by_entry: [],
      name: 'wildcard',
      number: 1,
      start_event: 1,
      stop_event: 38,
    },
  ],
  transfers: {
    cost: 0,
    status: 'unlimited',
    limit: null,
    made: 0,
    bank: 5,
    value: 1000,
  },
};

// Setup MSW server
const server = setupServer(
  http.get('https://fantasy.premierleague.com/api/bootstrap-static/', () => {
    return HttpResponse.json(mockBootstrapData);
  }),
  http.get('https://fantasy.premierleague.com/api/fixtures/', () => {
    return HttpResponse.json(mockFixtures);
  }),
  http.get('https://fantasy.premierleague.com/api/fixtures/*', () => {
    return HttpResponse.json(mockFixtures.filter((f) => f.event === 2));
  }),
  http.get('https://fantasy.premierleague.com/api/entry/:id/', ({ params }) => {
    return HttpResponse.json({ ...mockManagerInfo, id: Number(params.id) });
  }),
  http.get('https://fantasy.premierleague.com/api/my-team/:id/', () => {
    return HttpResponse.json(mockMyTeam);
  })
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

describe('#FPLConnector', () => {
  describe('.GET_GAMEWEEK_STATUS', () => {
    describe('when getting current gameweek status', () => {
      it('returns current and next gameweek information', async () => {
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ session: 'test-session' });
        const result = await FPLConnectorConfig.tools.GET_GAMEWEEK_STATUS.handler(
          {},
          mockContext
        );

        const response = JSON.parse(result);
        expect(response.current_gameweek.name).toBe('Gameweek 2');
        expect(response.next_gameweek.name).toBe('Gameweek 3');
        expect(response.total_gameweeks).toBe(3);
      });
    });
  });

  describe('.ANALYZE_PLAYER_FIXTURES', () => {
    describe('when analyzing player fixtures', () => {
      it('returns fixture difficulty analysis for specified players', async () => {
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ session: 'test-session' });
        const result = await FPLConnectorConfig.tools.ANALYZE_PLAYER_FIXTURES.handler(
          {
            player_ids: [1, 2],
            gameweeks_ahead: 2,
          },
          mockContext
        );

        const response = JSON.parse(result);
        expect(response).toBeInstanceOf(Array);
        expect(response[0].player.name).toBe('Mohamed Salah');
        expect(response[0].fixtures).toBeInstanceOf(Array);
        expect(response[0].average_difficulty).toBeTypeOf('number');
      });
    });
  });

  describe('.ANALYZE_PLAYERS', () => {
    describe('when analyzing players with filters', () => {
      it('returns filtered and sorted players', async () => {
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ session: 'test-session' });
        const result = await FPLConnectorConfig.tools.ANALYZE_PLAYERS.handler(
          {
            position: 'MID',
            max_cost: 15,
            limit: 10,
          },
          mockContext
        );

        const response = JSON.parse(result);
        expect(response.players).toBeInstanceOf(Array);
        expect(response.players[0].position).toBe('Midfielder');
        expect(response.total_found).toBeTypeOf('number');
      });
    });

    describe('when no filters are provided', () => {
      it('returns all players sorted by total points', async () => {
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ session: 'test-session' });
        const result = await FPLConnectorConfig.tools.ANALYZE_PLAYERS.handler(
          {},
          mockContext
        );

        const response = JSON.parse(result);
        expect(response.players).toBeInstanceOf(Array);
        expect(response.players.length).toBeLessThanOrEqual(20);
      });
    });
  });

  describe('.COMPARE_PLAYERS', () => {
    describe('when comparing players with basic metrics', () => {
      it('returns side-by-side player comparison', async () => {
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ session: 'test-session' });
        const result = await FPLConnectorConfig.tools.COMPARE_PLAYERS.handler(
          {
            player_ids: [1, 2],
            metrics: ['basic', 'attacking'],
          },
          mockContext
        );

        const response = JSON.parse(result);
        expect(response.players).toBeInstanceOf(Array);
        expect(response.players.length).toBe(2);
        expect(response.players[0].basic).toBeDefined();
        expect(response.players[0].attacking).toBeDefined();
      });
    });
  });

  describe('.GET_BLANK_GAMEWEEKS', () => {
    describe('when getting blank gameweeks', () => {
      it('returns gameweeks where teams have no fixtures', async () => {
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ session: 'test-session' });
        const result = await FPLConnectorConfig.tools.GET_BLANK_GAMEWEEKS.handler(
          {
            gameweeks_ahead: 5,
          },
          mockContext
        );

        const response = JSON.parse(result);
        expect(response.blank_gameweeks).toBeInstanceOf(Array);
        expect(response.total_blank_gameweeks).toBeTypeOf('number');
      });
    });
  });

  describe('.GET_DOUBLE_GAMEWEEKS', () => {
    describe('when getting double gameweeks', () => {
      it('returns gameweeks where teams have multiple fixtures', async () => {
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ session: 'test-session' });
        const result = await FPLConnectorConfig.tools.GET_DOUBLE_GAMEWEEKS.handler(
          {
            gameweeks_ahead: 5,
          },
          mockContext
        );

        const response = JSON.parse(result);
        expect(response.double_gameweeks).toBeInstanceOf(Array);
        expect(response.total_double_gameweeks).toBeTypeOf('number');
      });
    });
  });

  describe('.GET_MY_TEAM', () => {
    describe('when user is authenticated', () => {
      it('returns current team selection and formation', async () => {
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ session: 'test-session' });
        const result = await FPLConnectorConfig.tools.GET_MY_TEAM.handler(
          {
            manager_id: 123456,
          },
          mockContext
        );

        const response = JSON.parse(result);
        expect(response.manager).toBeDefined();
        expect(response.team_value).toBeTypeOf('number');
        expect(response.starting_eleven).toBeInstanceOf(Array);
        expect(response.bench).toBeInstanceOf(Array);
        expect(response.captain).toBeDefined();
        expect(response.vice_captain).toBeDefined();
      });
    });

    describe('when user is not authenticated', () => {
      it('returns authentication required message', async () => {
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi.fn().mockResolvedValue({});
        const result = await FPLConnectorConfig.tools.GET_MY_TEAM.handler(
          {
            manager_id: 123456,
          },
          mockContext
        );

        expect(result).toContain('Authentication required');
      });
    });
  });

  describe('.GET_MANAGER_INFO', () => {
    describe('when getting manager information', () => {
      it('returns manager details and league standings', async () => {
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ session: 'test-session' });
        const result = await FPLConnectorConfig.tools.GET_MANAGER_INFO.handler(
          {
            manager_id: 123456,
          },
          mockContext
        );

        const response = JSON.parse(result);
        expect(response.manager.name).toBe('John Doe');
        expect(response.performance).toBeDefined();
        expect(response.leagues.classic).toBeInstanceOf(Array);
      });
    });
  });

  describe('Resources', () => {
    describe('PLAYERS resource', () => {
      it('returns all FPL players with stats', async () => {
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ session: 'test-session' });
        const result = await FPLConnectorConfig.resources.PLAYERS.handler(mockContext);

        const response = JSON.parse(result);
        expect(response.players).toBeInstanceOf(Array);
        expect(response.total_players).toBe(2);
        expect(response.players[0]).toHaveProperty('id');
        expect(response.players[0]).toHaveProperty('name');
        expect(response.players[0]).toHaveProperty('team');
      });
    });

    describe('TEAMS resource', () => {
      it('returns all Premier League teams with strength ratings', async () => {
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ session: 'test-session' });
        const result = await FPLConnectorConfig.resources.TEAMS.handler(mockContext);

        const response = JSON.parse(result);
        expect(response.teams).toBeInstanceOf(Array);
        expect(response.total_teams).toBe(2);
        expect(response.teams[0]).toHaveProperty('strength_ratings');
      });
    });

    describe('FIXTURES resource', () => {
      it('returns all season fixtures with difficulty ratings', async () => {
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ session: 'test-session' });
        const result = await FPLConnectorConfig.resources.FIXTURES.handler(mockContext);

        const response = JSON.parse(result);
        expect(response.fixtures).toBeInstanceOf(Array);
        expect(response.total_fixtures).toBe(2);
        expect(response.fixtures[0]).toHaveProperty('home_team');
        expect(response.fixtures[0]).toHaveProperty('away_team');
      });
    });

    describe('GAMEWEEKS resource', () => {
      it('returns all gameweeks with status and deadlines', async () => {
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ session: 'test-session' });
        const result = await FPLConnectorConfig.resources.GAMEWEEKS.handler(mockContext);

        const response = JSON.parse(result);
        expect(response.gameweeks).toBeInstanceOf(Array);
        expect(response.total_gameweeks).toBe(3);
        expect(response.current_gameweek).toBeDefined();
        expect(response.next_gameweek).toBeDefined();
      });
    });
  });

  describe('Error handling', () => {
    describe('when API returns error', () => {
      it('handles and returns error message', async () => {
        server.use(
          http.get('https://fantasy.premierleague.com/api/bootstrap-static/', () => {
            return new HttpResponse(null, { status: 500 });
          })
        );

        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ session: 'test-session' });
        const result = await FPLConnectorConfig.tools.GET_GAMEWEEK_STATUS.handler(
          {},
          mockContext
        );

        expect(result).toContain('Failed to get gameweek status');
      });
    });
  });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

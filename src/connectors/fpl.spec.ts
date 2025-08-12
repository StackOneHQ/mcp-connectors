import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMockConnectorContext } from './__mocks__/context';
import { FPLConnectorConfig } from './fpl';

const mockBootstrapData = {
  elements: [
    {
      id: 1,
      web_name: 'Salah',
      first_name: 'Mohamed',
      second_name: 'Salah',
      team: 1,
      element_type: 3,
      now_cost: 130,
      total_points: 250,
      points_per_game: 8.5,
      form: 5.2,
      selected_by_percent: 45.6,
      transfers_in_event: 100000,
      transfers_out_event: 50000,
      chance_of_playing_this_round: 100,
      chance_of_playing_next_round: 100,
      news: '',
      news_added: null,
    },
    {
      id: 2,
      web_name: 'Kane',
      first_name: 'Harry',
      second_name: 'Kane',
      team: 2,
      element_type: 4,
      now_cost: 120,
      total_points: 220,
      points_per_game: 7.8,
      form: 4.8,
      selected_by_percent: 35.2,
      transfers_in_event: 80000,
      transfers_out_event: 30000,
      chance_of_playing_this_round: 75,
      chance_of_playing_next_round: 100,
      news: 'Minor knock',
      news_added: '2024-01-15T10:00:00Z',
    },
  ],
  teams: [
    {
      id: 1,
      name: 'Liverpool',
      short_name: 'LIV',
      code: 14,
      strength: 5,
      strength_overall_home: 1350,
      strength_overall_away: 1300,
      strength_attack_home: 1400,
      strength_attack_away: 1350,
      strength_defence_home: 1300,
      strength_defence_away: 1250,
    },
    {
      id: 2,
      name: 'Tottenham',
      short_name: 'TOT',
      code: 6,
      strength: 4,
      strength_overall_home: 1250,
      strength_overall_away: 1200,
      strength_attack_home: 1300,
      strength_attack_away: 1250,
      strength_defence_home: 1200,
      strength_defence_away: 1150,
    },
  ],
  events: [
    {
      id: 1,
      name: 'Gameweek 1',
      deadline_time: '2024-08-16T17:30:00Z',
      deadline_time_epoch: 1723828200,
      finished: true,
      is_current: false,
      is_next: false,
      is_previous: true,
    },
    {
      id: 2,
      name: 'Gameweek 2',
      deadline_time: '2024-08-23T17:30:00Z',
      deadline_time_epoch: 1724433000,
      finished: false,
      is_current: true,
      is_next: false,
      is_previous: false,
    },
    {
      id: 3,
      name: 'Gameweek 3',
      deadline_time: '2024-08-30T17:30:00Z',
      deadline_time_epoch: 1725037800,
      finished: false,
      is_current: false,
      is_next: true,
      is_previous: false,
    },
  ],
};

const mockFixtures = [
  {
    id: 1,
    code: 2489,
    event: 2,
    finished: false,
    finished_provisional: false,
    kickoff_time: '2024-08-24T14:00:00Z',
    team_a: 2,
    team_h: 1,
    team_a_score: null,
    team_h_score: null,
    team_a_difficulty: 4,
    team_h_difficulty: 3,
  },
  {
    id: 2,
    code: 2490,
    event: 3,
    finished: false,
    finished_provisional: false,
    kickoff_time: '2024-08-31T14:00:00Z',
    team_a: 1,
    team_h: 2,
    team_a_score: null,
    team_h_score: null,
    team_a_difficulty: 3,
    team_h_difficulty: 4,
  },
];

const mockMyTeam = {
  picks: [
    {
      element: 1,
      position: 1,
      multiplier: 2,
      is_captain: true,
      is_vice_captain: false,
    },
    {
      element: 2,
      position: 2,
      multiplier: 1,
      is_captain: false,
      is_vice_captain: true,
    },
  ],
  chips: [],
  transfers: {
    cost: 0,
    status: 'active',
    limit: 1,
    made: 0,
    bank: 5,
    value: 1000,
  },
};

const server = setupServer(
  http.get('https://fantasy.premierleague.com/api/bootstrap-static/', () => {
    return HttpResponse.json(mockBootstrapData);
  }),

  http.get('https://fantasy.premierleague.com/api/fixtures/', ({ request }) => {
    const url = new URL(request.url);
    const event = url.searchParams.get('event');

    if (event) {
      return HttpResponse.json(
        mockFixtures.filter((f) => f.event === Number.parseInt(event))
      );
    }
    return HttpResponse.json(mockFixtures);
  }),

  http.post('https://users.premierleague.com/accounts/login/', () => {
    return new HttpResponse(null, {
      status: 200,
      headers: {
        'Set-Cookie': 'sessionid=mock-session-id; Path=/; HttpOnly',
      },
    });
  }),

  http.get('https://fantasy.premierleague.com/api/my-team/123456/', () => {
    return HttpResponse.json(mockMyTeam);
  }),

  http.post('https://fantasy.premierleague.com/api/transfers/', () => {
    return HttpResponse.json({ success: true });
  }),

  http.post('https://fantasy.premierleague.com/api/my-team/123456/', () => {
    return HttpResponse.json({ success: true });
  })
);

describe('#FPLConnector', () => {
  beforeEach(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe('.get_gameweek_status', () => {
    describe('when bootstrap data is available', () => {
      it('returns current and next gameweek information', async () => {
        const mockContext = createMockConnectorContext();
        const actual = await FPLConnectorConfig.tools.GET_GAMEWEEK_STATUS.handler(
          {},
          mockContext
        );

        expect(actual.current_gameweek).toEqual({
          id: 2,
          name: 'Gameweek 2',
          deadline_time: '2024-08-23T17:30:00Z',
          deadline_time_epoch: 1724433000,
          finished: false,
          is_current: true,
          is_next: false,
          is_previous: false,
        });

        expect(actual.next_gameweek).toEqual({
          id: 3,
          name: 'Gameweek 3',
          deadline_time: '2024-08-30T17:30:00Z',
          deadline_time_epoch: 1725037800,
          finished: false,
          is_current: false,
          is_next: true,
          is_previous: false,
        });

        expect(actual.deadline_info).toBeDefined();
        expect(actual.deadline_info.deadline).toBe('2024-08-30T17:30:00Z');
      });
    });

    describe('when API fails', () => {
      it('throws an error', async () => {
        server.use(
          http.get('https://fantasy.premierleague.com/api/bootstrap-static/', () => {
            return new HttpResponse(null, { status: 500 });
          })
        );

        const mockContext = createMockConnectorContext();

        await expect(
          FPLConnectorConfig.tools.GET_GAMEWEEK_STATUS.handler({}, mockContext)
        ).rejects.toThrow('Failed to fetch bootstrap data: 500');
      });
    });
  });

  describe('.analyze_player_fixtures', () => {
    describe('when valid player IDs are provided', () => {
      it('returns fixture analysis for players', async () => {
        const mockContext = createMockConnectorContext();
        const actual = await FPLConnectorConfig.tools.ANALYZE_PLAYER_FIXTURES.handler(
          { player_ids: [1, 2], num_gameweeks: 3 },
          mockContext
        );

        expect(actual).toHaveLength(2);
        expect(actual[0]).toMatchObject({
          player_id: 1,
          player_name: 'Mohamed Salah',
          team: 'Liverpool',
        });

        expect(actual[0].fixtures).toBeDefined();
        expect(actual[0].average_difficulty).toBeTypeOf('number');
      });
    });

    describe('when player ID does not exist', () => {
      it('returns error for invalid player', async () => {
        const mockContext = createMockConnectorContext();
        const actual = await FPLConnectorConfig.tools.ANALYZE_PLAYER_FIXTURES.handler(
          { player_ids: [999], num_gameweeks: 3 },
          mockContext
        );

        expect(actual[0]).toMatchObject({
          player_id: 999,
          error: 'Player not found',
        });
      });
    });
  });

  describe('.compare_players', () => {
    describe('when comparing multiple players', () => {
      it('returns comparison data with requested metrics', async () => {
        const mockContext = createMockConnectorContext();
        const actual = await FPLConnectorConfig.tools.COMPARE_PLAYERS.handler(
          { player_ids: [1, 2], metrics: ['points', 'form', 'cost'] },
          mockContext
        );

        expect(actual.comparison).toHaveLength(2);
        expect(actual.comparison[0]).toMatchObject({
          player_id: 1,
          name: 'Mohamed Salah',
          team: 'Liverpool',
          total_points: 250,
          form: 5.2,
          cost: 13.0,
        });

        expect(actual.summary.best_value).toBeDefined();
        expect(actual.summary.best_form).toBeDefined();
      });
    });

    describe('when ownership metric is requested', () => {
      it('includes ownership percentage', async () => {
        const mockContext = createMockConnectorContext();
        const actual = await FPLConnectorConfig.tools.COMPARE_PLAYERS.handler(
          { player_ids: [1], metrics: ['ownership'] },
          mockContext
        );

        expect(actual.comparison[0].ownership_percentage).toBe(45.6);
      });
    });
  });

  describe('.get_blank_gameweeks', () => {
    describe('when fixtures are available', () => {
      it('identifies teams without fixtures', async () => {
        // Mock fixtures where only some teams play
        server.use(
          http.get('https://fantasy.premierleague.com/api/fixtures/', () => {
            return HttpResponse.json([
              {
                id: 1,
                event: 2,
                team_a: 1,
                team_h: 2,
                finished: false,
                finished_provisional: false,
                kickoff_time: '2024-08-24T14:00:00Z',
                team_a_score: null,
                team_h_score: null,
                team_a_difficulty: 3,
                team_h_difficulty: 3,
              },
              // Gameweek 3 has no fixtures
            ]);
          })
        );

        const mockContext = createMockConnectorContext();
        const actual = await FPLConnectorConfig.tools.GET_BLANK_GAMEWEEKS.handler(
          { num_gameweeks: 3 },
          mockContext
        );

        expect(actual.blank_gameweeks).toBeDefined();
        expect(actual.summary).toContain('blank gameweeks');
      });
    });
  });

  describe('.get_my_team', () => {
    describe('when authenticated', () => {
      it('returns team details with player information', async () => {
        const mockContext = createMockConnectorContext({
          email: 'test@example.com',
          password: 'password123',
          userId: '123456',
        });

        const actual = await FPLConnectorConfig.tools.GET_MY_TEAM.handler(
          {},
          mockContext
        );

        expect(actual.team).toHaveLength(2);
        expect(actual.team[0]).toMatchObject({
          element: 1,
          position: 1,
          is_captain: true,
          player_name: 'Mohamed Salah',
        });

        expect(actual.transfers).toBeDefined();
        expect(actual.bank_balance).toBe(0.5); // 5 / 10
        expect(actual.team_value).toBe(100.0); // 1000 / 10
      });
    });

    describe('when not authenticated', () => {
      it('throws authentication error', async () => {
        const mockContext = createMockConnectorContext();

        await expect(
          FPLConnectorConfig.tools.GET_MY_TEAM.handler({}, mockContext)
        ).rejects.toThrow('Email, password, and userId are required');
      });
    });
  });

  describe('.make_transfer', () => {
    describe('when authenticated with valid players', () => {
      it('makes transfer successfully', async () => {
        const mockContext = createMockConnectorContext({
          email: 'test@example.com',
          password: 'password123',
          userId: '123456',
        });

        const actual = await FPLConnectorConfig.tools.MAKE_TRANSFER.handler(
          {
            player_in_id: 2,
            player_out_id: 1,
            gameweek: 2,
          },
          mockContext
        );

        expect(actual.success).toBe(true);
        expect(actual.transfer.player_in).toBe('Harry Kane');
        expect(actual.transfer.player_out).toBe('Mohamed Salah');
        expect(actual.transfer.cost).toBe(-1.0); // (120 - 130) / 10
      });
    });

    describe('when player not found', () => {
      it('throws error for invalid player', async () => {
        const mockContext = createMockConnectorContext({
          email: 'test@example.com',
          password: 'password123',
          userId: '123456',
        });

        await expect(
          FPLConnectorConfig.tools.MAKE_TRANSFER.handler(
            {
              player_in_id: 999,
              player_out_id: 1,
              gameweek: 2,
            },
            mockContext
          )
        ).rejects.toThrow('One or both players not found');
      });
    });
  });

  describe('.set_team_lineup', () => {
    describe('when lineup is valid', () => {
      it('sets team lineup successfully', async () => {
        const mockContext = createMockConnectorContext({
          email: 'test@example.com',
          password: 'password123',
          userId: '123456',
        });

        const picks = Array.from({ length: 15 }, (_, i) => ({
          player_id: i + 1,
          position: i + 1,
          is_captain: i === 0,
          is_vice_captain: i === 1,
        }));

        const actual = await FPLConnectorConfig.tools.SET_TEAM_LINEUP.handler(
          { picks },
          mockContext
        );

        expect(actual.success).toBe(true);
        expect(actual.lineup).toEqual(picks);
      });
    });

    describe('when captain selection is invalid', () => {
      it('throws error for multiple captains', async () => {
        const mockContext = createMockConnectorContext({
          email: 'test@example.com',
          password: 'password123',
          userId: '123456',
        });

        const picks = Array.from({ length: 15 }, (_, i) => ({
          player_id: i + 1,
          position: i + 1,
          is_captain: i < 2, // Two captains
          is_vice_captain: i === 2,
        }));

        await expect(
          FPLConnectorConfig.tools.SET_TEAM_LINEUP.handler({ picks }, mockContext)
        ).rejects.toThrow('Exactly one captain must be selected');
      });

      it('throws error for no captain', async () => {
        const mockContext = createMockConnectorContext({
          email: 'test@example.com',
          password: 'password123',
          userId: '123456',
        });

        const picks = Array.from({ length: 15 }, (_, i) => ({
          player_id: i + 1,
          position: i + 1,
          is_captain: false,
          is_vice_captain: i === 0,
        }));

        await expect(
          FPLConnectorConfig.tools.SET_TEAM_LINEUP.handler({ picks }, mockContext)
        ).rejects.toThrow('Exactly one captain must be selected');
      });
    });

    describe('when vice-captain selection is invalid', () => {
      it('throws error for multiple vice-captains', async () => {
        const mockContext = createMockConnectorContext({
          email: 'test@example.com',
          password: 'password123',
          userId: '123456',
        });

        const picks = Array.from({ length: 15 }, (_, i) => ({
          player_id: i + 1,
          position: i + 1,
          is_captain: i === 0,
          is_vice_captain: i > 0 && i < 3, // Two vice-captains
        }));

        await expect(
          FPLConnectorConfig.tools.SET_TEAM_LINEUP.handler({ picks }, mockContext)
        ).rejects.toThrow('Exactly one vice-captain must be selected');
      });
    });
  });

  describe('authentication flow', () => {
    describe('when login fails', () => {
      it('throws authentication error', async () => {
        server.use(
          http.post('https://users.premierleague.com/accounts/login/', () => {
            return new HttpResponse(null, { status: 401 });
          })
        );

        const mockContext = createMockConnectorContext({
          email: 'wrong@example.com',
          password: 'wrongpassword',
          userId: '123456',
        });

        await expect(
          FPLConnectorConfig.tools.GET_MY_TEAM.handler({}, mockContext)
        ).rejects.toThrow('Failed to login to FPL');
      });
    });
  });

  describe('API error handling', () => {
    describe('when FPL API returns error', () => {
      it('throws meaningful error message', async () => {
        server.use(
          http.get('https://fantasy.premierleague.com/api/fixtures/', () => {
            return new HttpResponse(null, { status: 503 });
          })
        );

        const mockContext = createMockConnectorContext();

        await expect(
          FPLConnectorConfig.tools.ANALYZE_PLAYER_FIXTURES.handler(
            { player_ids: [1], num_gameweeks: 3 },
            mockContext
          )
        ).rejects.toThrow('Failed to fetch fixtures: 503');
      });
    });
  });
});

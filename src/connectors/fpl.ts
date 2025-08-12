import { z } from 'zod';
import { mcpConnectorConfig } from '../config-types';

// FPL API Interfaces
interface FPLPlayer {
  id: number;
  first_name: string;
  second_name: string;
  web_name: string;
  team: number;
  element_type: number;
  now_cost: number;
  total_points: number;
  points_per_game: string;
  selected_by_percent: string;
  form: string;
  transfers_in_event: number;
  transfers_out_event: number;
  value_form: string;
  value_season: string;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  own_goals: number;
  penalties_saved: number;
  penalties_missed: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  bps: number;
  influence: string;
  creativity: string;
  threat: string;
  ict_index: string;
  starts: number;
  expected_goals: string;
  expected_assists: string;
  expected_goal_involvements: string;
  expected_goals_conceded: string;
  influence_rank: number;
  influence_rank_type: number;
  creativity_rank: number;
  creativity_rank_type: number;
  threat_rank: number;
  threat_rank_type: number;
  ict_index_rank: number;
  ict_index_rank_type: number;
  corners_and_indirect_freekicks_order: number | null;
  corners_and_indirect_freekicks_text: string;
  direct_freekicks_order: number | null;
  direct_freekicks_text: string;
  penalties_order: number | null;
  penalties_text: string;
  expected_goals_per_90: number;
  saves_per_90: number;
  expected_assists_per_90: number;
  expected_goal_involvements_per_90: number;
  expected_goals_conceded_per_90: number;
  goals_conceded_per_90: number;
  now_cost_rank: number;
  now_cost_rank_type: number;
  form_rank: number;
  form_rank_type: number;
  points_per_game_rank: number;
  points_per_game_rank_type: number;
  selected_rank: number;
  selected_rank_type: number;
  starts_per_90: number;
  clean_sheets_per_90: number;
}

interface FPLTeam {
  id: number;
  name: string;
  short_name: string;
  strength: number;
  strength_overall_home: number;
  strength_overall_away: number;
  strength_attack_home: number;
  strength_attack_away: number;
  strength_defence_home: number;
  strength_defence_away: number;
  pulse_id: number;
}

interface FPLFixtureStat {
  identifier: string;
  a: Array<{
    value: number;
    element: number;
  }>;
  h: Array<{
    value: number;
    element: number;
  }>;
}

interface FPLFixture {
  id: number;
  code: number;
  event: number | null;
  finished: boolean;
  finished_provisional: boolean;
  kickoff_time: string | null;
  minutes: number;
  provisional_start_time: boolean;
  started: boolean | null;
  team_a: number;
  team_a_score: number | null;
  team_h: number;
  team_h_score: number | null;
  stats: FPLFixtureStat[];
  team_h_difficulty: number;
  team_a_difficulty: number;
  pulse_id: number;
}

interface FPLGameweek {
  id: number;
  name: string;
  deadline_time: string;
  deadline_time_epoch: number;
  deadline_time_game_offset: number;
  deadline_time_formatted: string;
  release_time: string | null;
  average_entry_score: number;
  finished: boolean;
  data_checked: boolean;
  highest_scoring_entry: number | null;
  highest_score: number | null;
  is_previous: boolean;
  is_current: boolean;
  is_next: boolean;
  cup_leagues_created: boolean;
  h2h_ko_matches_created: boolean;
  chip_plays: Array<{
    chip_name: string;
    num_played: number;
  }>;
  most_selected: number | null;
  most_transferred_in: number | null;
  top_element: number | null;
  top_element_info: {
    id: number;
    points: number;
  } | null;
  transfers_made: number;
  most_captained: number | null;
  most_vice_captained: number | null;
}

interface FPLManagerInfo {
  id: number;
  joined_time: string;
  started_event: number;
  favourite_team: number;
  player_first_name: string;
  player_last_name: string;
  player_region_id: number;
  player_region_name: string;
  player_region_iso_code_short: string;
  player_region_iso_code_long: string;
  summary_overall_points: number;
  summary_overall_rank: number;
  summary_event_points: number;
  summary_event_rank: number;
  current_event: number;
  leagues: {
    classic: Array<{
      id: number;
      name: string;
      short_name: string;
      created: string;
      closed: boolean;
      max_entries: number | null;
      league_type: string;
      scoring: string;
      admin_entry: number | null;
      start_event: number;
      entry_rank: number;
      entry_last_rank: number;
      entry_can_leave: boolean;
      entry_can_admin: boolean;
      entry_can_invite: boolean;
      has_cup: boolean;
      cup_league: number | null;
      cup_qualified: boolean | null;
    }>;
    h2h: FPLH2HLeague[];
    cup: Record<string, unknown> | null;
    cup_matches: FPLCupMatch[];
  };
  name: string;
  name_change_blocked: boolean;
  entered_events: number[];
  kit: string | null;
  last_deadline_bank: number;
  last_deadline_value: number;
  last_deadline_total_transfers: number;
}

interface FPLMyTeam {
  picks: Array<{
    element: number;
    position: number;
    multiplier: number;
    is_captain: boolean;
    is_vice_captain: boolean;
  }>;
  chips: Array<{
    status_for_entry: string;
    played_by_entry: PlayedByEntry[];
    name: string;
    number: number;
    start_event: number;
    stop_event: number;
  }>;
  transfers: {
    cost: number;
    status: string;
    limit: number | null;
    made: number;
    bank: number;
    value: number;
  };
}

interface FPLH2HLeague {
  id: number;
  name: string;
  short_name: string;
  created: string;
  closed: boolean;
  max_entries: number | null;
  league_type: string;
}

interface FPLCupMatch {
  id: number;
  entry_1_entry: number;
  entry_1_name: string;
  entry_1_player_name: string;
  entry_1_points: number;
  entry_1_win: number;
  entry_1_draw: number;
  entry_1_loss: number;
  entry_1_total: number;
  entry_2_entry: number;
  entry_2_name: string;
  entry_2_player_name: string;
  entry_2_points: number;
  entry_2_win: number;
  entry_2_draw: number;
  entry_2_loss: number;
  entry_2_total: number;
  is_knockout: boolean;
  winner: number | null;
  seed_value: number | null;
  event: number;
  tiebreak: number | null;
}

interface PlayedByEntry {
  entry: number;
  entry_name: string;
  entry_short_name: string;
  played_time_formatted: string;
}

interface FPLTransferResponse {
  id: number;
  element_in: number;
  element_out: number;
  entry: number;
  event: number;
  time: string;
}

interface FPLSetTeamLineupResponse {
  picks: Array<{
    element: number;
    position: number;
    multiplier: number;
    is_captain: boolean;
    is_vice_captain: boolean;
  }>;
  chip: string | null;
  entry: number;
}

interface PlayerComparisonData {
  id: number;
  name: string;
  web_name: string;
  team: string;
  position?: string;
  [key: string]: unknown;
}

class FPLClient {
  private baseUrl = 'https://fantasy.premierleague.com/api';
  private session?: string;

  constructor(session?: string) {
    this.session = session;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      'User-Agent': 'MCP-FPL-Connector/1.0.0',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.session) {
      headers.Cookie = `sessionid=${this.session}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`FPL API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getBootstrapData(): Promise<{
    elements: FPLPlayer[];
    teams: FPLTeam[];
    events: FPLGameweek[];
    element_types: Array<{
      id: number;
      plural_name: string;
      singular_name: string;
      singular_name_short: string;
      element_count: number;
    }>;
  }> {
    return this.makeRequest('/bootstrap-static/');
  }

  async getFixtures(gameweek?: number): Promise<FPLFixture[]> {
    const endpoint = gameweek ? `/fixtures/?event=${gameweek}` : '/fixtures/';
    return this.makeRequest(endpoint);
  }

  async getManagerInfo(managerId: number): Promise<FPLManagerInfo> {
    return this.makeRequest(`/entry/${managerId}/`);
  }

  async getMyTeam(managerId: number): Promise<FPLMyTeam> {
    if (!this.session) {
      throw new Error('Authentication required for my team data');
    }
    return this.makeRequest(`/my-team/${managerId}/`);
  }

  async makeTransfer(
    managerId: number,
    transferData: {
      transfers: Array<{
        element_in: number;
        element_out: number;
        purchase_price: number;
        selling_price: number;
      }>;
      chip?: string;
      event: number;
    }
  ): Promise<FPLTransferResponse> {
    if (!this.session) {
      throw new Error('Authentication required for transfers');
    }

    return this.makeRequest('/transfers/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Referer: 'https://fantasy.premierleague.com/transfers',
        Origin: 'https://fantasy.premierleague.com',
      },
      body: JSON.stringify({
        ...transferData,
        entry: managerId,
      }),
    });
  }

  async setTeamLineup(
    managerId: number,
    lineupData: {
      picks: Array<{
        element: number;
        position: number;
        is_captain: boolean;
        is_vice_captain: boolean;
      }>;
      chip?: string;
    }
  ): Promise<FPLSetTeamLineupResponse> {
    if (!this.session) {
      throw new Error('Authentication required for team lineup');
    }

    return this.makeRequest(`/my-team/${managerId}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Referer: 'https://fantasy.premierleague.com/my-team',
        Origin: 'https://fantasy.premierleague.com',
      },
      body: JSON.stringify(lineupData),
    });
  }
}

export const FPLConnectorConfig = mcpConnectorConfig({
  name: 'Fantasy Premier League',
  key: 'fpl',
  version: '1.0.0',
  logo: 'https://resources.premierleague.com/premierleague/badges/pl-logo.svg',
  credentials: z.object({
    session: z
      .string()
      .optional()
      .describe(
        'FPL session token (optional, required for write operations) :: Extract sessionid cookie value after logging into fantasy.premierleague.com'
      ),
  }),
  setup: z.object({}),
  examplePrompt:
    'Get the current gameweek status, analyze fixture difficulty for top midfielders, compare Salah and Haaland, and show me players from teams with double gameweeks.',
  tools: (tool) => ({
    GET_GAMEWEEK_STATUS: tool({
      name: 'fpl_get_gameweek_status',
      description: 'Get current gameweek information and deadline status',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { session } = await context.getCredentials();
          const client = new FPLClient(session);
          const data = await client.getBootstrapData();

          const currentGameweek = data.events.find((event) => event.is_current);
          const nextGameweek = data.events.find((event) => event.is_next);

          return JSON.stringify(
            {
              current_gameweek: currentGameweek,
              next_gameweek: nextGameweek,
              total_gameweeks: data.events.length,
            },
            null,
            2
          );
        } catch (error) {
          return `Failed to get gameweek status: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    ANALYZE_PLAYER_FIXTURES: tool({
      name: 'fpl_analyze_player_fixtures',
      description: 'Analyze fixture difficulty for players over upcoming gameweeks',
      schema: z.object({
        player_ids: z.array(z.number()).describe('Array of FPL player IDs to analyze'),
        gameweeks_ahead: z
          .number()
          .default(5)
          .describe('Number of gameweeks to look ahead'),
      }),
      handler: async (args, context) => {
        try {
          const { session } = await context.getCredentials();
          const client = new FPLClient(session);
          const data = await client.getBootstrapData();
          const fixtures = await client.getFixtures();

          const players = data.elements.filter((p) => args.player_ids.includes(p.id));
          const teams = data.teams.reduce(
            (acc, team) => {
              acc[team.id] = team;
              return acc;
            },
            {} as Record<number, FPLTeam>
          );

          const currentGameweek = data.events.find((event) => event.is_current)?.id || 1;
          const targetGameweeks = Array.from(
            { length: args.gameweeks_ahead },
            (_, i) => currentGameweek + i
          );

          const analysis = players.map((player) => {
            const playerTeam = teams[player.team];
            const playerFixtures = fixtures.filter(
              (fixture) =>
                targetGameweeks.includes(fixture.event || 0) &&
                (fixture.team_h === player.team || fixture.team_a === player.team)
            );

            const fixtureAnalysis = playerFixtures.map((fixture) => {
              const isHome = fixture.team_h === player.team;
              const difficulty = isHome
                ? fixture.team_h_difficulty
                : fixture.team_a_difficulty;
              const opponent = teams[isHome ? fixture.team_a : fixture.team_h];

              return {
                gameweek: fixture.event,
                opponent: opponent.name,
                venue: isHome ? 'Home' : 'Away',
                difficulty: difficulty,
                kickoff: fixture.kickoff_time,
              };
            });

            const avgDifficulty =
              fixtureAnalysis.length > 0
                ? fixtureAnalysis.reduce((sum, f) => sum + f.difficulty, 0) /
                  fixtureAnalysis.length
                : 0;

            return {
              player: {
                id: player.id,
                name: `${player.first_name} ${player.second_name}`,
                web_name: player.web_name,
                team: playerTeam.name,
                position: data.element_types.find((t) => t.id === player.element_type)
                  ?.singular_name,
                cost: player.now_cost / 10,
                form: Number.parseFloat(player.form),
                total_points: player.total_points,
              },
              fixtures: fixtureAnalysis,
              average_difficulty: Math.round(avgDifficulty * 100) / 100,
            };
          });

          return JSON.stringify(analysis, null, 2);
        } catch (error) {
          return `Failed to analyze player fixtures: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    ANALYZE_PLAYERS: tool({
      name: 'fpl_analyze_players',
      description:
        'Filter and analyze players by position, cost, points, team, or other criteria',
      schema: z.object({
        position: z
          .enum(['GK', 'DEF', 'MID', 'FWD'])
          .optional()
          .describe('Player position'),
        max_cost: z.number().optional().describe('Maximum cost in millions (e.g., 12.5)'),
        min_cost: z.number().optional().describe('Minimum cost in millions'),
        min_points: z.number().optional().describe('Minimum total points'),
        min_form: z.number().optional().describe('Minimum form rating'),
        team_id: z.number().optional().describe('Filter by specific team ID'),
        limit: z.number().default(20).describe('Maximum number of players to return'),
        sort_by: z
          .enum([
            'total_points',
            'form',
            'points_per_game',
            'now_cost',
            'selected_by_percent',
          ])
          .default('total_points')
          .describe('Field to sort by'),
      }),
      handler: async (args, context) => {
        try {
          const { session } = await context.getCredentials();
          const client = new FPLClient(session);
          const data = await client.getBootstrapData();

          const positionMap: Record<string, number> = {
            GK: 1,
            DEF: 2,
            MID: 3,
            FWD: 4,
          };

          let filteredPlayers = data.elements.filter((player) => {
            if (args.position && player.element_type !== positionMap[args.position])
              return false;
            if (args.max_cost && player.now_cost > args.max_cost * 10) return false;
            if (args.min_cost && player.now_cost < args.min_cost * 10) return false;
            if (args.min_points && player.total_points < args.min_points) return false;
            if (args.min_form && Number.parseFloat(player.form) < args.min_form)
              return false;
            if (args.team_id && player.team !== args.team_id) return false;
            return true;
          });

          // Sort players using a type-safe accessor function
          function getSortValue(player: FPLPlayer, sortBy: string): number {
            switch (sortBy) {
              case 'now_cost':
                return player.now_cost;
              case 'total_points':
                return player.total_points;
              case 'points_per_game':
                return Number.parseFloat(player.points_per_game);
              case 'form':
                return Number.parseFloat(player.form);
              case 'selected_by_percent':
                return Number.parseFloat(player.selected_by_percent);
              case 'transfers_in_event':
                return player.transfers_in_event;
              case 'transfers_out_event':
                return player.transfers_out_event;
              case 'goals_scored':
                return player.goals_scored;
              case 'assists':
                return player.assists;
              case 'clean_sheets':
                return player.clean_sheets;
              case 'bonus':
                return player.bonus;
              case 'ict_index':
                return Number.parseFloat(player.ict_index);
              default:
                return 0;
            }
          }

          // Sort players
          filteredPlayers.sort((a, b) => {
            const aValue = getSortValue(a, args.sort_by);
            const bValue = getSortValue(b, args.sort_by);
            return args.sort_by === 'now_cost' ? aValue - bValue : bValue - aValue;
          });

          // Limit results
          filteredPlayers = filteredPlayers.slice(0, args.limit);

          const teams = data.teams.reduce(
            (acc, team) => {
              acc[team.id] = team;
              return acc;
            },
            {} as Record<number, FPLTeam>
          );

          const analysis = filteredPlayers.map((player) => ({
            id: player.id,
            name: `${player.first_name} ${player.second_name}`,
            web_name: player.web_name,
            team: teams[player.team].name,
            position: data.element_types.find((t) => t.id === player.element_type)
              ?.singular_name,
            cost: player.now_cost / 10,
            total_points: player.total_points,
            points_per_game: player.points_per_game,
            form: Number.parseFloat(player.form),
            selected_by_percent: Number.parseFloat(player.selected_by_percent),
            transfers_in: player.transfers_in_event,
            transfers_out: player.transfers_out_event,
            goals_scored: player.goals_scored,
            assists: player.assists,
            clean_sheets: player.clean_sheets,
            bonus: player.bonus,
            ict_index: Number.parseFloat(player.ict_index),
          }));

          return JSON.stringify(
            {
              filters_applied: args,
              total_found: analysis.length,
              players: analysis,
            },
            null,
            2
          );
        } catch (error) {
          return `Failed to analyze players: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    COMPARE_PLAYERS: tool({
      name: 'fpl_compare_players',
      description: 'Compare multiple players side by side with detailed statistics',
      schema: z.object({
        player_ids: z.array(z.number()).describe('Array of FPL player IDs to compare'),
        metrics: z
          .array(z.enum(['basic', 'attacking', 'defensive', 'creativity', 'value']))
          .default(['basic'])
          .describe('Metrics to include in comparison'),
      }),
      handler: async (args, context) => {
        try {
          const { session } = await context.getCredentials();
          const client = new FPLClient(session);
          const data = await client.getBootstrapData();

          const players = data.elements.filter((p) => args.player_ids.includes(p.id));
          const teams = data.teams.reduce(
            (acc, team) => {
              acc[team.id] = team;
              return acc;
            },
            {} as Record<number, FPLTeam>
          );

          const comparison = players.map((player) => {
            const playerData: PlayerComparisonData = {
              id: player.id,
              name: `${player.first_name} ${player.second_name}`,
              web_name: player.web_name,
              team: teams[player.team].name,
              position: data.element_types.find((t) => t.id === player.element_type)
                ?.singular_name,
            };

            if (args.metrics.includes('basic')) {
              playerData.basic = {
                cost: player.now_cost / 10,
                total_points: player.total_points,
                points_per_game: player.points_per_game,
                form: Number.parseFloat(player.form),
                selected_by_percent: Number.parseFloat(player.selected_by_percent),
                minutes: player.minutes,
                starts: player.starts,
              };
            }

            if (args.metrics.includes('attacking')) {
              playerData.attacking = {
                goals_scored: player.goals_scored,
                assists: player.assists,
                expected_goals: Number.parseFloat(player.expected_goals),
                expected_assists: Number.parseFloat(player.expected_assists),
                expected_goal_involvements: Number.parseFloat(
                  player.expected_goal_involvements
                ),
                bonus: player.bonus,
                bps: player.bps,
              };
            }

            if (args.metrics.includes('defensive')) {
              playerData.defensive = {
                clean_sheets: player.clean_sheets,
                goals_conceded: player.goals_conceded,
                expected_goals_conceded: Number.parseFloat(
                  player.expected_goals_conceded
                ),
                saves: player.saves,
                penalties_saved: player.penalties_saved,
                yellow_cards: player.yellow_cards,
                red_cards: player.red_cards,
              };
            }

            if (args.metrics.includes('creativity')) {
              playerData.creativity = {
                influence: Number.parseFloat(player.influence),
                creativity: Number.parseFloat(player.creativity),
                threat: Number.parseFloat(player.threat),
                ict_index: Number.parseFloat(player.ict_index),
                influence_rank: player.influence_rank,
                creativity_rank: player.creativity_rank,
                threat_rank: player.threat_rank,
                ict_index_rank: player.ict_index_rank,
              };
            }

            if (args.metrics.includes('value')) {
              playerData.value = {
                value_form: player.value_form,
                value_season: player.value_season,
                cost_change_start: 'N/A', // Would need additional API call
                transfers_in_event: player.transfers_in_event,
                transfers_out_event: player.transfers_out_event,
                selected_rank: player.selected_rank,
              };
            }

            return playerData;
          });

          return JSON.stringify(
            {
              comparison_date: new Date().toISOString(),
              metrics_included: args.metrics,
              players: comparison,
            },
            null,
            2
          );
        } catch (error) {
          return `Failed to compare players: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_BLANK_GAMEWEEKS: tool({
      name: 'fpl_get_blank_gameweeks',
      description:
        'Find upcoming gameweeks where teams have no fixtures (blank gameweeks)',
      schema: z.object({
        gameweeks_ahead: z
          .number()
          .default(10)
          .describe('Number of gameweeks to analyze ahead'),
      }),
      handler: async (args, context) => {
        try {
          const { session } = await context.getCredentials();
          const client = new FPLClient(session);
          const data = await client.getBootstrapData();
          const fixtures = await client.getFixtures();

          const currentGameweek = data.events.find((event) => event.is_current)?.id || 1;
          const targetGameweeks = Array.from(
            { length: args.gameweeks_ahead },
            (_, i) => currentGameweek + i
          );

          const blankGameweeks = targetGameweeks
            .map((gw) => {
              const gameweekFixtures = fixtures.filter((fixture) => fixture.event === gw);
              const teamsWithFixtures = new Set<number>();

              for (const fixture of gameweekFixtures) {
                teamsWithFixtures.add(fixture.team_h);
                teamsWithFixtures.add(fixture.team_a);
              }

              const blankTeams = data.teams.filter(
                (team) => !teamsWithFixtures.has(team.id)
              );
              const gameweekInfo = data.events.find((event) => event.id === gw);

              return {
                gameweek: gw,
                gameweek_name: gameweekInfo?.name || `Gameweek ${gw}`,
                deadline: gameweekInfo?.deadline_time,
                fixtures_count: gameweekFixtures.length,
                blank_teams: blankTeams.map((team) => ({
                  id: team.id,
                  name: team.name,
                  short_name: team.short_name,
                })),
                blank_teams_count: blankTeams.length,
              };
            })
            .filter((gw) => gw.blank_teams_count > 0);

          return JSON.stringify(
            {
              analysis_period: `Gameweeks ${currentGameweek} to ${currentGameweek + args.gameweeks_ahead - 1}`,
              blank_gameweeks: blankGameweeks,
              total_blank_gameweeks: blankGameweeks.length,
            },
            null,
            2
          );
        } catch (error) {
          return `Failed to get blank gameweeks: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_DOUBLE_GAMEWEEKS: tool({
      name: 'fpl_get_double_gameweeks',
      description:
        'Find upcoming gameweeks where teams have multiple fixtures (double gameweeks)',
      schema: z.object({
        gameweeks_ahead: z
          .number()
          .default(10)
          .describe('Number of gameweeks to analyze ahead'),
      }),
      handler: async (args, context) => {
        try {
          const { session } = await context.getCredentials();
          const client = new FPLClient(session);
          const data = await client.getBootstrapData();
          const fixtures = await client.getFixtures();

          const currentGameweek = data.events.find((event) => event.is_current)?.id || 1;
          const targetGameweeks = Array.from(
            { length: args.gameweeks_ahead },
            (_, i) => currentGameweek + i
          );

          const doubleGameweeks = targetGameweeks
            .map((gw) => {
              const gameweekFixtures = fixtures.filter((fixture) => fixture.event === gw);
              const teamFixtureCounts = new Map<number, number>();

              for (const fixture of gameweekFixtures) {
                teamFixtureCounts.set(
                  fixture.team_h,
                  (teamFixtureCounts.get(fixture.team_h) || 0) + 1
                );
                teamFixtureCounts.set(
                  fixture.team_a,
                  (teamFixtureCounts.get(fixture.team_a) || 0) + 1
                );
              }

              const doubleTeams = Array.from(teamFixtureCounts.entries())
                .filter(([, count]) => count >= 2)
                .map(([teamId, count]) => {
                  const team = data.teams.find((t) => t.id === teamId);
                  const teamFixtures = gameweekFixtures.filter(
                    (f) => f.team_h === teamId || f.team_a === teamId
                  );

                  return {
                    id: teamId,
                    name: team?.name || 'Unknown',
                    short_name: team?.short_name || 'UNK',
                    fixture_count: count,
                    fixtures: teamFixtures.map((f) => ({
                      opponent_id: f.team_h === teamId ? f.team_a : f.team_h,
                      opponent_name: data.teams.find(
                        (t) => t.id === (f.team_h === teamId ? f.team_a : f.team_h)
                      )?.name,
                      venue: f.team_h === teamId ? 'Home' : 'Away',
                      difficulty:
                        f.team_h === teamId ? f.team_h_difficulty : f.team_a_difficulty,
                      kickoff: f.kickoff_time,
                    })),
                  };
                });

              const gameweekInfo = data.events.find((event) => event.id === gw);

              return {
                gameweek: gw,
                gameweek_name: gameweekInfo?.name || `Gameweek ${gw}`,
                deadline: gameweekInfo?.deadline_time,
                total_fixtures: gameweekFixtures.length,
                double_teams: doubleTeams,
                double_teams_count: doubleTeams.length,
              };
            })
            .filter((gw) => gw.double_teams_count > 0);

          return JSON.stringify(
            {
              analysis_period: `Gameweeks ${currentGameweek} to ${currentGameweek + args.gameweeks_ahead - 1}`,
              double_gameweeks: doubleGameweeks,
              total_double_gameweeks: doubleGameweeks.length,
            },
            null,
            2
          );
        } catch (error) {
          return `Failed to get double gameweeks: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_MY_TEAM: tool({
      name: 'fpl_get_my_team',
      description:
        'Get your current FPL team selection, formation, and transfer information (requires authentication)',
      schema: z.object({
        manager_id: z.number().describe('Your FPL manager ID'),
      }),
      handler: async (args, context) => {
        try {
          const { session } = await context.getCredentials();
          if (!session) {
            return 'Authentication required: Please provide your FPL session token to access your team data.';
          }

          const client = new FPLClient(session);
          const [teamData, bootstrapData, managerInfo] = await Promise.all([
            client.getMyTeam(args.manager_id),
            client.getBootstrapData(),
            client.getManagerInfo(args.manager_id),
          ]);

          const teams = bootstrapData.teams.reduce(
            (acc, team) => {
              acc[team.id] = team;
              return acc;
            },
            {} as Record<number, FPLTeam>
          );
          const playersMap = bootstrapData.elements.reduce(
            (acc, player) => {
              acc[player.id] = player;
              return acc;
            },
            {} as Record<number, FPLPlayer>
          );

          const squad = teamData.picks.map((pick) => {
            const player = playersMap[pick.element];
            return {
              position: pick.position,
              player: {
                id: player.id,
                name: `${player.first_name} ${player.second_name}`,
                web_name: player.web_name,
                team: teams[player.team].name,
                position_type: bootstrapData.element_types.find(
                  (t) => t.id === player.element_type
                )?.singular_name,
                cost: player.now_cost / 10,
                total_points: player.total_points,
                form: Number.parseFloat(player.form),
              },
              multiplier: pick.multiplier,
              is_captain: pick.is_captain,
              is_vice_captain: pick.is_vice_captain,
              is_starter: pick.position <= 11,
            };
          });

          const starters = squad.filter((p) => p.is_starter);
          const bench = squad.filter((p) => !p.is_starter);
          const captain = squad.find((p) => p.is_captain);
          const viceCaptain = squad.find((p) => p.is_vice_captain);

          return JSON.stringify(
            {
              manager: {
                id: managerInfo.id,
                name: managerInfo.name,
                team_name: `${managerInfo.player_first_name} ${managerInfo.player_last_name}`,
                overall_points: managerInfo.summary_overall_points,
                overall_rank: managerInfo.summary_overall_rank,
                gameweek_points: managerInfo.summary_event_points,
                gameweek_rank: managerInfo.summary_event_rank,
              },
              team_value: teamData.transfers.value / 10,
              bank: teamData.transfers.bank / 10,
              transfers: {
                made: teamData.transfers.made,
                cost: teamData.transfers.cost,
                limit: teamData.transfers.limit,
                status: teamData.transfers.status,
              },
              formation: {
                goalkeeper: starters.filter(
                  (p) => p.player.position_type === 'Goalkeeper'
                ).length,
                defenders: starters.filter((p) => p.player.position_type === 'Defender')
                  .length,
                midfielders: starters.filter(
                  (p) => p.player.position_type === 'Midfielder'
                ).length,
                forwards: starters.filter((p) => p.player.position_type === 'Forward')
                  .length,
              },
              captain: captain?.player,
              vice_captain: viceCaptain?.player,
              starting_eleven: starters.sort((a, b) => a.position - b.position),
              bench: bench.sort((a, b) => a.position - b.position),
              available_chips: teamData.chips
                .filter((chip) => chip.status_for_entry === 'available')
                .map((chip) => chip.name),
            },
            null,
            2
          );
        } catch (error) {
          return `Failed to get team data: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_MANAGER_INFO: tool({
      name: 'fpl_get_manager_info',
      description:
        'Get information about an FPL manager including league standings and performance',
      schema: z.object({
        manager_id: z.number().describe('FPL manager ID to get information for'),
      }),
      handler: async (args, context) => {
        try {
          const { session } = await context.getCredentials();
          const client = new FPLClient(session);
          const managerInfo = await client.getManagerInfo(args.manager_id);

          const result = {
            manager: {
              id: managerInfo.id,
              name: managerInfo.name,
              team_name: `${managerInfo.player_first_name} ${managerInfo.player_last_name}`,
              region: managerInfo.player_region_name,
              joined: managerInfo.joined_time,
              favourite_team: managerInfo.favourite_team,
            },
            performance: {
              overall_points: managerInfo.summary_overall_points,
              overall_rank: managerInfo.summary_overall_rank,
              current_gameweek_points: managerInfo.summary_event_points,
              current_gameweek_rank: managerInfo.summary_event_rank,
              started_event: managerInfo.started_event,
              current_event: managerInfo.current_event,
            },
            team_value: {
              last_deadline_value: managerInfo.last_deadline_value / 10,
              last_deadline_bank: managerInfo.last_deadline_bank / 10,
              total_transfers: managerInfo.last_deadline_total_transfers,
            },
            leagues: {
              classic: managerInfo.leagues.classic.map((league) => ({
                id: league.id,
                name: league.name,
                rank: league.entry_rank,
                last_rank: league.entry_last_rank,
                league_type: league.league_type,
                can_leave: league.entry_can_leave,
                has_cup: league.has_cup,
              })),
              h2h_leagues: managerInfo.leagues.h2h.length,
              cup_status: managerInfo.leagues.cup,
            },
          };

          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to get manager info: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
  resources: (resource) => ({
    PLAYERS: resource({
      name: 'players',
      uri: 'fpl://players',
      title: 'FPL Players',
      description:
        'All Fantasy Premier League players with current stats and information',
      mimeType: 'application/json',
      handler: async (context) => {
        try {
          const { session } = await context.getCredentials();
          const client = new FPLClient(session);
          const data = await client.getBootstrapData();

          const teams = data.teams.reduce(
            (acc, team) => {
              acc[team.id] = team;
              return acc;
            },
            {} as Record<number, FPLTeam>
          );

          const players = data.elements.map((player) => ({
            id: player.id,
            name: `${player.first_name} ${player.second_name}`,
            web_name: player.web_name,
            team: {
              id: player.team,
              name: teams[player.team].name,
              short_name: teams[player.team].short_name,
            },
            position: data.element_types.find((t) => t.id === player.element_type)
              ?.singular_name,
            cost: player.now_cost / 10,
            total_points: player.total_points,
            points_per_game: player.points_per_game,
            form: Number.parseFloat(player.form),
            selected_by_percent: Number.parseFloat(player.selected_by_percent),
            goals_scored: player.goals_scored,
            assists: player.assists,
            clean_sheets: player.clean_sheets,
            minutes: player.minutes,
            transfers_in: player.transfers_in_event,
            transfers_out: player.transfers_out_event,
            expected_goals: Number.parseFloat(player.expected_goals),
            expected_assists: Number.parseFloat(player.expected_assists),
            ict_index: Number.parseFloat(player.ict_index),
            influence: Number.parseFloat(player.influence),
            creativity: Number.parseFloat(player.creativity),
            threat: Number.parseFloat(player.threat),
          }));

          return JSON.stringify(
            {
              last_updated: new Date().toISOString(),
              total_players: players.length,
              players: players,
            },
            null,
            2
          );
        } catch (error) {
          return JSON.stringify(
            {
              error: `Failed to fetch players: ${error instanceof Error ? error.message : String(error)}`,
            },
            null,
            2
          );
        }
      },
    }),
    TEAMS: resource({
      name: 'teams',
      uri: 'fpl://teams',
      title: 'Premier League Teams',
      description: 'All Premier League teams with strength ratings and information',
      mimeType: 'application/json',
      handler: async (context) => {
        try {
          const { session } = await context.getCredentials();
          const client = new FPLClient(session);
          const data = await client.getBootstrapData();

          const teams = data.teams.map((team) => ({
            id: team.id,
            name: team.name,
            short_name: team.short_name,
            strength: team.strength,
            strength_ratings: {
              overall_home: team.strength_overall_home,
              overall_away: team.strength_overall_away,
              attack_home: team.strength_attack_home,
              attack_away: team.strength_attack_away,
              defence_home: team.strength_defence_home,
              defence_away: team.strength_defence_away,
            },
          }));

          return JSON.stringify(
            {
              last_updated: new Date().toISOString(),
              total_teams: teams.length,
              teams: teams,
            },
            null,
            2
          );
        } catch (error) {
          return JSON.stringify(
            {
              error: `Failed to fetch teams: ${error instanceof Error ? error.message : String(error)}`,
            },
            null,
            2
          );
        }
      },
    }),
    FIXTURES: resource({
      name: 'fixtures',
      uri: 'fpl://fixtures',
      title: 'Premier League Fixtures',
      description: 'All season fixtures with difficulty ratings and status',
      mimeType: 'application/json',
      handler: async (context) => {
        try {
          const { session } = await context.getCredentials();
          const client = new FPLClient(session);
          const [fixtures, bootstrapData] = await Promise.all([
            client.getFixtures(),
            client.getBootstrapData(),
          ]);

          const teams = bootstrapData.teams.reduce(
            (acc, team) => {
              acc[team.id] = team;
              return acc;
            },
            {} as Record<number, FPLTeam>
          );

          const fixturesWithNames = fixtures.map((fixture) => ({
            id: fixture.id,
            gameweek: fixture.event,
            kickoff_time: fixture.kickoff_time,
            home_team: {
              id: fixture.team_h,
              name: teams[fixture.team_h].name,
              short_name: teams[fixture.team_h].short_name,
              difficulty: fixture.team_h_difficulty,
              score: fixture.team_h_score,
            },
            away_team: {
              id: fixture.team_a,
              name: teams[fixture.team_a].name,
              short_name: teams[fixture.team_a].short_name,
              difficulty: fixture.team_a_difficulty,
              score: fixture.team_a_score,
            },
            finished: fixture.finished,
            started: fixture.started,
            minutes: fixture.minutes,
          }));

          return JSON.stringify(
            {
              last_updated: new Date().toISOString(),
              total_fixtures: fixturesWithNames.length,
              fixtures: fixturesWithNames,
            },
            null,
            2
          );
        } catch (error) {
          return JSON.stringify(
            {
              error: `Failed to fetch fixtures: ${error instanceof Error ? error.message : String(error)}`,
            },
            null,
            2
          );
        }
      },
    }),
    GAMEWEEKS: resource({
      name: 'gameweeks',
      uri: 'fpl://gameweeks',
      title: 'FPL Gameweeks',
      description: 'All gameweeks with status, deadlines, and key information',
      mimeType: 'application/json',
      handler: async (context) => {
        try {
          const { session } = await context.getCredentials();
          const client = new FPLClient(session);
          const data = await client.getBootstrapData();

          const gameweeks = data.events.map((event) => ({
            id: event.id,
            name: event.name,
            deadline_time: event.deadline_time,
            deadline_epoch: event.deadline_time_epoch,
            average_score: event.average_entry_score,
            highest_score: event.highest_score,
            finished: event.finished,
            is_current: event.is_current,
            is_next: event.is_next,
            is_previous: event.is_previous,
            transfers_made: event.transfers_made,
            chip_plays: event.chip_plays,
            most_captained: event.most_captained,
            most_vice_captained: event.most_vice_captained,
            most_selected: event.most_selected,
            most_transferred_in: event.most_transferred_in,
            top_element: event.top_element_info,
          }));

          const currentGameweek = gameweeks.find((gw) => gw.is_current);
          const nextGameweek = gameweeks.find((gw) => gw.is_next);

          return JSON.stringify(
            {
              last_updated: new Date().toISOString(),
              total_gameweeks: gameweeks.length,
              current_gameweek: currentGameweek,
              next_gameweek: nextGameweek,
              gameweeks: gameweeks,
            },
            null,
            2
          );
        } catch (error) {
          return JSON.stringify(
            {
              error: `Failed to fetch gameweeks: ${error instanceof Error ? error.message : String(error)}`,
            },
            null,
            2
          );
        }
      },
    }),
  }),
});

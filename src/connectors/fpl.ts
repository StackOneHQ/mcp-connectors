import { z } from 'zod';
import { mcpConnectorConfig } from '../config-types';

// FPL Data Interfaces
interface FPLPlayer {
  id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  team: number;
  element_type: number;
  now_cost: number;
  total_points: number;
  points_per_game: string;
  form: string;
  selected_by_percent: string;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  saves: number;
  yellow_cards: number;
  red_cards: number;
  bonus: number;
  bps: number;
  minutes: number;
  transfers_in: number;
  transfers_out: number;
  transfers_in_event: number;
  transfers_out_event: number;
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
}

interface FPLFixture {
  id: number;
  code: number;
  event: number;
  finished: boolean;
  kickoff_time: string;
  team_h: number;
  team_a: number;
  team_h_score: number | null;
  team_a_score: number | null;
  team_h_difficulty: number;
  team_a_difficulty: number;
}

interface FPLGameweek {
  id: number;
  name: string;
  deadline_time: string;
  average_entry_score: number | null;
  finished: boolean;
  data_checked: boolean;
  highest_scoring_entry: number | null;
  deadline_time_epoch: number;
  deadline_time_game_offset: number;
  highest_score: number | null;
  is_previous: boolean;
  is_current: boolean;
  is_next: boolean;
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

interface FPLManager {
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
      rank: number | null;
      max_entries: number | null;
      league_type: string;
      scoring: string;
      admin_entry: number | null;
      start_event: number;
      entry_can_leave: boolean;
      entry_can_admin: boolean;
      entry_can_invite: boolean;
      has_cup: boolean;
      cup_league: number | null;
      cup_qualified: boolean | null;
    }>;
  };
}

class FPLClient {
  private baseUrl = 'https://fantasy.premierleague.com/api';
  private session?: string;

  constructor(session?: string) {
    this.session = session;
  }

  private async makeRequest(endpoint: string): Promise<unknown> {
    const headers: HeadersInit = {
      'User-Agent': 'FPL-MCP-Connector/1.0',
    };

    if (this.session) {
      headers.Cookie = this.session;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`FPL API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getBootstrapStatic() {
    return this.makeRequest('/bootstrap-static/');
  }

  async getFixtures() {
    return this.makeRequest('/fixtures/');
  }

  async getGameweeks() {
    const data = await this.getBootstrapStatic();
    return data.events;
  }

  async getCurrentGameweek(): Promise<FPLGameweek> {
    const gameweeks = await this.getGameweeks();
    return gameweeks.find((gw: FPLGameweek) => gw.is_current) || gameweeks[0];
  }

  async getPlayers(): Promise<FPLPlayer[]> {
    const data = await this.getBootstrapStatic();
    return data.elements;
  }

  async getTeams(): Promise<FPLTeam[]> {
    const data = await this.getBootstrapStatic();
    return data.teams;
  }

  async getPlayerFixtures(playerId: number) {
    return this.makeRequest(`/element-summary/${playerId}/`);
  }

  async getManagerTeam(managerId: number) {
    if (!this.session) {
      throw new Error('Authentication required for manager team data');
    }
    return this.makeRequest(`/entry/${managerId}/`);
  }

  async getManagerInfo(managerId: number): Promise<FPLManager> {
    if (!this.session) {
      throw new Error('Authentication required for manager info');
    }
    return this.makeRequest(`/entry/${managerId}/`);
  }

  async getMyTeam() {
    if (!this.session) {
      throw new Error('Authentication required for my team data');
    }
    return this.makeRequest('/me/');
  }

  async getManagerPicks(managerId: number, gameweek: number) {
    return this.makeRequest(`/entry/${managerId}/event/${gameweek}/picks/`);
  }

  async getLeaderboard(leagueId: number, pageStandings?: number) {
    const standings = pageStandings ? `&page_standings=${pageStandings}` : '';
    return this.makeRequest(
      `/leagues-classic/${leagueId}/standings/?page_new_entries=1${standings}`
    );
  }
}

export const FplConnectorConfig = mcpConnectorConfig({
  name: 'FPL',
  key: 'fpl',
  logo: 'https://resources.premierleague.com/premierleague/photos/players/110x140/Photo-Missing.png',
  version: '1.0.0',
  credentials: z.object({
    session: z
      .string()
      .optional()
      .describe('FPL session cookie for authenticated requests'),
  }),
  setup: z.object({}),
  examplePrompt:
    'Get the current gameweek status and analyze player fixtures for the next 5 gameweeks.',
  tools: (tool) => ({
    GET_GAMEWEEK_STATUS: tool({
      name: 'fpl_get_gameweek_status',
      description: 'Get current gameweek information and status',
      schema: z.object({}),
      handler: async (_, context) => {
        try {
          const credentials = await context.getCredentials();
          const client = new FPLClient(credentials?.session);
          const gameweek = await client.getCurrentGameweek();
          return JSON.stringify(gameweek, null, 2);
        } catch (error) {
          return `Failed to get gameweek status: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    ANALYZE_PLAYER_FIXTURES: tool({
      name: 'fpl_analyze_player_fixtures',
      description: 'Analyze fixture difficulty for a specific player',
      schema: z.object({
        player_id: z.number().describe('Player ID to analyze'),
        upcoming_gameweeks: z
          .number()
          .default(5)
          .describe('Number of upcoming gameweeks to analyze'),
      }),
      handler: async (args, context) => {
        try {
          const credentials = await context.getCredentials();
          const client = new FPLClient(credentials?.session);

          const [playerData, fixtures, teams] = await Promise.all([
            client.getPlayerFixtures(args.player_id),
            client.getFixtures(),
            client.getTeams(),
          ]);

          const upcomingFixtures = fixtures
            .filter(
              (fixture: FPLFixture) =>
                !fixture.finished &&
                fixture.event &&
                fixture.event <= (fixtures[0]?.event || 1) + args.upcoming_gameweeks &&
                (fixture.team_h === playerData.element_type ||
                  fixture.team_a === playerData.element_type)
            )
            .slice(0, args.upcoming_gameweeks);

          const analysis = upcomingFixtures.map((fixture: FPLFixture) => {
            const isHome = fixture.team_h === playerData.element_type;
            const opponent = teams.find(
              (team: FPLTeam) => team.id === (isHome ? fixture.team_a : fixture.team_h)
            );

            return {
              gameweek: fixture.event,
              opponent: opponent?.name,
              home: isHome,
              difficulty: isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty,
              kickoff_time: fixture.kickoff_time,
            };
          });

          return JSON.stringify(
            { player_id: args.player_id, fixtures: analysis },
            null,
            2
          );
        } catch (error) {
          return `Failed to analyze player fixtures: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    ANALYZE_PLAYERS: tool({
      name: 'fpl_analyze_players',
      description: 'Filter and analyze players by multiple criteria',
      schema: z.object({
        position: z
          .number()
          .optional()
          .describe('Position filter (1=GK, 2=DEF, 3=MID, 4=FWD)'),
        max_cost: z.number().optional().describe('Maximum player cost in millions'),
        min_points: z.number().optional().describe('Minimum total points'),
        team_id: z.number().optional().describe('Specific team ID'),
        limit: z.number().default(20).describe('Maximum number of players to return'),
      }),
      handler: async (args, context) => {
        try {
          const credentials = await context.getCredentials();
          const client = new FPLClient(credentials?.session);
          const players = await client.getPlayers();

          let filteredPlayers = players.filter((player: FPLPlayer) => {
            if (args.position && player.element_type !== args.position) return false;
            if (args.max_cost && player.now_cost / 10 > args.max_cost) return false;
            if (args.min_points && player.total_points < args.min_points) return false;
            if (args.team_id && player.team !== args.team_id) return false;
            return true;
          });

          // Sort by total points descending
          filteredPlayers = filteredPlayers
            .sort((a, b) => b.total_points - a.total_points)
            .slice(0, args.limit);

          return JSON.stringify(filteredPlayers, null, 2);
        } catch (error) {
          return `Failed to analyze players: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    COMPARE_PLAYERS: tool({
      name: 'fpl_compare_players',
      description: 'Compare metrics between multiple players',
      schema: z.object({
        player_ids: z.array(z.number()).describe('Array of player IDs to compare'),
      }),
      handler: async (args, context) => {
        try {
          const credentials = await context.getCredentials();
          const client = new FPLClient(credentials?.session);
          const [players, teams] = await Promise.all([
            client.getPlayers(),
            client.getTeams(),
          ]);

          const comparisonData = args.player_ids
            .map((playerId) => {
              const player = players.find((p: FPLPlayer) => p.id === playerId);
              if (!player) return null;

              const team = teams.find((t: FPLTeam) => t.id === player.team);

              return {
                id: player.id,
                name: `${player.first_name} ${player.second_name}`,
                web_name: player.web_name,
                team: team?.name,
                position: player.element_type,
                cost: player.now_cost / 10,
                total_points: player.total_points,
                points_per_game: Number.parseFloat(player.points_per_game),
                form: Number.parseFloat(player.form),
                selected_by_percent: Number.parseFloat(player.selected_by_percent),
                goals_scored: player.goals_scored,
                assists: player.assists,
                clean_sheets: player.clean_sheets,
                minutes: player.minutes,
              };
            })
            .filter(Boolean);

          return JSON.stringify(comparisonData, null, 2);
        } catch (error) {
          return `Failed to compare players: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_BLANK_GAMEWEEKS: tool({
      name: 'fpl_get_blank_gameweeks',
      description:
        'Get upcoming gameweeks where teams have no fixtures (blank gameweeks)',
      schema: z.object({
        upcoming_gameweeks: z
          .number()
          .default(10)
          .describe('Number of upcoming gameweeks to check'),
      }),
      handler: async (args, context) => {
        try {
          const credentials = await context.getCredentials();
          const client = new FPLClient(credentials?.session);
          const [fixtures, teams, gameweeks] = await Promise.all([
            client.getFixtures(),
            client.getTeams(),
            client.getGameweeks(),
          ]);

          const currentGameweek =
            gameweeks.find((gw: FPLGameweek) => gw.is_current)?.id || 1;
          const upcomingGameweeks = gameweeks.filter(
            (gw: FPLGameweek) =>
              gw.id > currentGameweek &&
              gw.id <= currentGameweek + args.upcoming_gameweeks
          );

          const blankGameweeks = upcomingGameweeks
            .map((gw: FPLGameweek) => {
              const gameweekFixtures = fixtures.filter(
                (fixture: FPLFixture) => fixture.event === gw.id
              );
              const teamsWithFixtures = new Set([
                ...gameweekFixtures.map((f: FPLFixture) => f.team_h),
                ...gameweekFixtures.map((f: FPLFixture) => f.team_a),
              ]);

              const blankTeams = teams
                .filter((team: FPLTeam) => !teamsWithFixtures.has(team.id))
                .map((team: FPLTeam) => ({
                  id: team.id,
                  name: team.name,
                  short_name: team.short_name,
                }));

              return {
                gameweek: gw.id,
                name: gw.name,
                deadline: gw.deadline_time,
                blank_teams: blankTeams,
                blank_count: blankTeams.length,
              };
            })
            .filter((gw) => gw.blank_count > 0);

          return JSON.stringify(blankGameweeks, null, 2);
        } catch (error) {
          return `Failed to get blank gameweeks: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_DOUBLE_GAMEWEEKS: tool({
      name: 'fpl_get_double_gameweeks',
      description:
        'Get upcoming gameweeks where teams have multiple fixtures (double gameweeks)',
      schema: z.object({
        upcoming_gameweeks: z
          .number()
          .default(10)
          .describe('Number of upcoming gameweeks to check'),
      }),
      handler: async (args, context) => {
        try {
          const credentials = await context.getCredentials();
          const client = new FPLClient(credentials?.session);
          const [fixtures, teams, gameweeks] = await Promise.all([
            client.getFixtures(),
            client.getTeams(),
            client.getGameweeks(),
          ]);

          const currentGameweek =
            gameweeks.find((gw: FPLGameweek) => gw.is_current)?.id || 1;
          const upcomingGameweeks = gameweeks.filter(
            (gw: FPLGameweek) =>
              gw.id > currentGameweek &&
              gw.id <= currentGameweek + args.upcoming_gameweeks
          );

          const doubleGameweeks = upcomingGameweeks
            .map((gw: FPLGameweek) => {
              const gameweekFixtures = fixtures.filter(
                (fixture: FPLFixture) => fixture.event === gw.id
              );
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
                .filter(([, count]) => count > 1)
                .map(([teamId]) => {
                  const team = teams.find((t: FPLTeam) => t.id === teamId);
                  return team
                    ? {
                        id: team.id,
                        name: team.name,
                        short_name: team.short_name,
                        fixture_count: teamFixtureCounts.get(teamId),
                      }
                    : null;
                })
                .filter(Boolean);

              return {
                gameweek: gw.id,
                name: gw.name,
                deadline: gw.deadline_time,
                double_teams: doubleTeams,
                double_count: doubleTeams.length,
              };
            })
            .filter((gw) => gw.double_count > 0);

          return JSON.stringify(doubleGameweeks, null, 2);
        } catch (error) {
          return `Failed to get double gameweeks: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_MY_TEAM: tool({
      name: 'fpl_get_my_team',
      description: 'Get your FPL team details (requires authentication)',
      schema: z.object({}),
      handler: async (_, context) => {
        try {
          const credentials = await context.getCredentials();
          if (!credentials?.session) {
            return 'Authentication required. Please provide your FPL session cookie in the credentials.';
          }

          const client = new FPLClient(credentials.session);
          const teamData = await client.getMyTeam();
          return JSON.stringify(teamData, null, 2);
        } catch (error) {
          return `Failed to get team data: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_MANAGER_INFO: tool({
      name: 'fpl_get_manager_info',
      description: 'Get manager information and league standings',
      schema: z.object({
        manager_id: z.number().describe('Manager ID to get information for'),
      }),
      handler: async (args, context) => {
        try {
          const credentials = await context.getCredentials();
          const client = new FPLClient(credentials?.session);
          const managerInfo = await client.getManagerInfo(args.manager_id);
          return JSON.stringify(managerInfo, null, 2);
        } catch (error) {
          return `Failed to get manager info: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
  resources: (resource) => ({
    PLAYERS: resource({
      name: 'fpl_players',
      uri: 'fpl://players',
      description: 'All FPL players with their current stats',
      handler: async (context) => {
        try {
          const credentials = await context.getCredentials();
          const client = new FPLClient(credentials?.session);
          const players = await client.getPlayers();
          return JSON.stringify(players, null, 2);
        } catch (error) {
          return `Failed to fetch players: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    TEAMS: resource({
      name: 'fpl_teams',
      uri: 'fpl://teams',
      description: 'All Premier League teams with their strength ratings',
      handler: async (context) => {
        try {
          const credentials = await context.getCredentials();
          const client = new FPLClient(credentials?.session);
          const teams = await client.getTeams();
          return JSON.stringify(teams, null, 2);
        } catch (error) {
          return `Failed to fetch teams: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    FIXTURES: resource({
      name: 'fpl_fixtures',
      uri: 'fpl://fixtures',
      description: 'All season fixtures with difficulty ratings',
      handler: async (context) => {
        try {
          const credentials = await context.getCredentials();
          const client = new FPLClient(credentials?.session);
          const fixtures = await client.getFixtures();
          return JSON.stringify(fixtures, null, 2);
        } catch (error) {
          return `Failed to fetch fixtures: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GAMEWEEKS: resource({
      name: 'fpl_gameweeks',
      uri: 'fpl://gameweeks',
      description: 'All gameweeks with status and deadline information',
      handler: async (context) => {
        try {
          const credentials = await context.getCredentials();
          const client = new FPLClient(credentials?.session);
          const gameweeks = await client.getGameweeks();
          return JSON.stringify(gameweeks, null, 2);
        } catch (error) {
          return `Failed to fetch gameweeks: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

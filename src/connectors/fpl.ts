import { z } from 'zod';
import { mcpConnectorConfig } from '../config-types';

interface FPLPlayer {
  id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  team: number;
  team_name?: string;
  element_type: number;
  now_cost: number;
  total_points: number;
  points_per_game: number;
  form: number;
  selected_by_percent: number;
  transfers_in_event: number;
  transfers_out_event: number;
  chance_of_playing_this_round: number | null;
  chance_of_playing_next_round: number | null;
  news: string;
  news_added: string | null;
}

interface FPLTeam {
  id: number;
  name: string;
  short_name: string;
  code: number;
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
  finished_provisional: boolean;
  kickoff_time: string | null;
  team_a: number;
  team_h: number;
  team_a_score: number | null;
  team_h_score: number | null;
  team_a_difficulty: number;
  team_h_difficulty: number;
}

interface FPLGameweek {
  id: number;
  name: string;
  deadline_time: string;
  deadline_time_epoch: number;
  finished: boolean;
  is_current: boolean;
  is_next: boolean;
  is_previous: boolean;
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
    name: string;
    time: string;
    event: number;
  }>;
  transfers: {
    cost: number;
    status: string;
    limit: number;
    made: number;
    bank: number;
    value: number;
  };
}

interface FPLTransferData {
  element_in: number;
  element_out: number;
  purchase_price: number;
  selling_price: number;
}

interface FPLTransferResponse {
  success: boolean;
  message?: string;
}

interface FPLTeamSelectionResponse {
  success: boolean;
  message?: string;
}

interface FPLPlayerComparison {
  player_id: number;
  name: string;
  team: string;
  total_points?: number;
  points_per_game?: number;
  form?: number;
  cost?: number;
  ownership_percentage?: number;
  transfers_in?: number;
  transfers_out?: number;
  net_transfers?: number;
  error?: string;
}

class FPLClient {
  private baseURL = 'https://fantasy.premierleague.com/api';
  private session?: string;
  private userId?: string;

  async login(email: string, password: string, userId: string): Promise<void> {
    const loginResponse = await fetch('https://users.premierleague.com/accounts/login/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: new URLSearchParams({
        login: email,
        password: password,
        app: 'plfpl-web',
        redirect_uri: 'https://fantasy.premierleague.com/',
      }),
    });

    if (!loginResponse.ok) {
      throw new Error('Failed to login to FPL');
    }

    const setCookieHeader = loginResponse.headers.get('Set-Cookie');
    this.session = setCookieHeader || '';
    this.userId = userId;
  }

  private async fetchWithAuth(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ...(options.headers as Record<string, string>),
    };

    if (this.session) {
      headers.Cookie = this.session;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `FPL API request failed: ${response.status} ${response.statusText}`
      );
    }

    return response;
  }

  async getBootstrapStatic(): Promise<{
    elements: FPLPlayer[];
    teams: FPLTeam[];
    events: FPLGameweek[];
  }> {
    const response = await fetch(`${this.baseURL}/bootstrap-static/`);
    if (!response.ok) {
      throw new Error(`Failed to fetch bootstrap data: ${response.status}`);
    }
    return response.json();
  }

  async getFixtures(gameweek?: number): Promise<FPLFixture[]> {
    const endpoint = gameweek ? `/fixtures/?event=${gameweek}` : '/fixtures/';
    const response = await fetch(`${this.baseURL}${endpoint}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch fixtures: ${response.status}`);
    }
    return response.json();
  }

  async getMyTeam(): Promise<FPLMyTeam> {
    if (!this.userId) {
      throw new Error('User ID is required. Please login first.');
    }

    const response = await this.fetchWithAuth(`/my-team/${this.userId}/`);
    return response.json();
  }

  async makeTransfer(
    transfers: FPLTransferData[],
    gameweek: number,
    chip?: string
  ): Promise<FPLTransferResponse> {
    if (!this.userId) {
      throw new Error('User ID is required. Please login first.');
    }

    const payload = {
      transfers,
      chip: chip || null,
      entry: Number.parseInt(this.userId),
      event: gameweek,
    };

    const response = await this.fetchWithAuth('/transfers/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://fantasy.premierleague.com',
        Referer: 'https://fantasy.premierleague.com/transfers',
      },
      body: JSON.stringify(payload),
    });

    return response.json();
  }

  async setTeamSelection(
    picks: Array<{
      element: number;
      position: number;
      is_captain: boolean;
      is_vice_captain: boolean;
    }>,
    chip?: string
  ): Promise<FPLTeamSelectionResponse> {
    if (!this.userId) {
      throw new Error('User ID is required. Please login first.');
    }

    const payload = {
      picks,
      chip: chip || null,
    };

    const response = await this.fetchWithAuth(`/my-team/${this.userId}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://fantasy.premierleague.com',
        Referer: 'https://fantasy.premierleague.com/my-team',
      },
      body: JSON.stringify(payload),
    });

    return response.json();
  }
}

export const FPLConnectorConfig = mcpConnectorConfig({
  name: 'Fantasy Premier League',
  key: 'fpl',
  version: '1.0.0',
  credentials: z.object({
    email: z
      .string()
      .describe('FPL account email (required for write operations)')
      .optional(),
    password: z
      .string()
      .describe('FPL account password (required for write operations)')
      .optional(),
    userId: z
      .string()
      .describe('FPL user ID (found in URL when viewing your team)')
      .optional(),
  }),
  setup: z.object({}),
  logo: 'https://resources.premierleague.com/premierleague/photo/2023/04/28/c8a5e514-2c52-467c-9a9a-e0dc10da5fa8/FPL_badge_logo.png',
  examplePrompt:
    'Analyze the current gameweek fixtures, compare top midfielders, and suggest transfers for my FPL team.',
  tools: (tool) => ({
    GET_GAMEWEEK_STATUS: tool({
      name: 'get_gameweek_status',
      description: 'Get the current gameweek status and deadline information',
      schema: z.object({}),
      handler: async (_args, _context) => {
        const client = new FPLClient();
        const data = await client.getBootstrapStatic();

        const currentGameweek = data.events.find((event) => event.is_current);
        const nextGameweek = data.events.find((event) => event.is_next);

        return {
          current_gameweek: currentGameweek,
          next_gameweek: nextGameweek,
          deadline_info: nextGameweek
            ? {
                deadline: nextGameweek.deadline_time,
                hours_until_deadline: Math.round(
                  (nextGameweek.deadline_time_epoch * 1000 - Date.now()) /
                    (1000 * 60 * 60)
                ),
              }
            : null,
        };
      },
    }),

    ANALYZE_PLAYER_FIXTURES: tool({
      name: 'analyze_player_fixtures',
      description:
        'Analyze fixture difficulty for specific players over the next few gameweeks',
      schema: z.object({
        player_ids: z.array(z.number()).describe('Array of player IDs to analyze'),
        num_gameweeks: z.number().default(5).describe('Number of gameweeks to analyze'),
      }),
      handler: async (args, _context) => {
        const client = new FPLClient();
        const [data, fixtures] = await Promise.all([
          client.getBootstrapStatic(),
          client.getFixtures(),
        ]);

        const teamsMap = new Map(data.teams.map((team) => [team.id, team]));
        const playersMap = new Map(data.elements.map((player) => [player.id, player]));

        const currentGameweek = data.events.find((event) => event.is_current)?.id || 1;
        const upcomingFixtures = fixtures.filter(
          (fixture) =>
            fixture.event >= currentGameweek &&
            fixture.event < currentGameweek + args.num_gameweeks
        );

        const playerAnalysis = args.player_ids.map((playerId) => {
          const player = playersMap.get(playerId);
          if (!player) return { player_id: playerId, error: 'Player not found' };

          const playerTeam = teamsMap.get(player.team);
          const playerFixtures = upcomingFixtures.filter(
            (fixture) => fixture.team_a === player.team || fixture.team_h === player.team
          );

          const fixtureAnalysis = playerFixtures.map((fixture) => {
            const isHome = fixture.team_h === player.team;
            const opponent = teamsMap.get(isHome ? fixture.team_a : fixture.team_h);
            const difficulty = isHome
              ? fixture.team_h_difficulty
              : fixture.team_a_difficulty;

            return {
              gameweek: fixture.event,
              opponent: opponent?.name || 'Unknown',
              is_home: isHome,
              difficulty_rating: difficulty,
              kickoff_time: fixture.kickoff_time,
            };
          });

          return {
            player_id: playerId,
            player_name: `${player.first_name} ${player.second_name}`,
            team: playerTeam?.name || 'Unknown',
            fixtures: fixtureAnalysis,
            average_difficulty:
              fixtureAnalysis.reduce((sum, f) => sum + f.difficulty_rating, 0) /
              fixtureAnalysis.length,
          };
        });

        return playerAnalysis;
      },
    }),

    COMPARE_PLAYERS: tool({
      name: 'compare_players',
      description: 'Compare statistics and form between multiple players',
      schema: z.object({
        player_ids: z.array(z.number()).describe('Array of player IDs to compare'),
        metrics: z
          .array(z.enum(['points', 'form', 'cost', 'ownership', 'transfers', 'fixtures']))
          .default(['points', 'form', 'cost'])
          .describe('Metrics to compare'),
      }),
      handler: async (args, _context) => {
        const client = new FPLClient();
        const data = await client.getBootstrapStatic();

        const playersMap = new Map(data.elements.map((player) => [player.id, player]));
        const teamsMap = new Map(data.teams.map((team) => [team.id, team]));

        const playerComparisons = args.player_ids.map((playerId) => {
          const player = playersMap.get(playerId);
          if (!player) return { player_id: playerId, error: 'Player not found' };

          const team = teamsMap.get(player.team);
          const comparison: FPLPlayerComparison = {
            player_id: playerId,
            name: `${player.first_name} ${player.second_name}`,
            team: team?.name || 'Unknown',
          };

          if (args.metrics.includes('points')) {
            comparison.total_points = player.total_points;
            comparison.points_per_game = player.points_per_game;
          }

          if (args.metrics.includes('form')) {
            comparison.form = player.form;
          }

          if (args.metrics.includes('cost')) {
            comparison.cost = player.now_cost / 10; // Convert to actual price format
          }

          if (args.metrics.includes('ownership')) {
            comparison.ownership_percentage = player.selected_by_percent;
          }

          if (args.metrics.includes('transfers')) {
            comparison.transfers_in = player.transfers_in_event;
            comparison.transfers_out = player.transfers_out_event;
            comparison.net_transfers =
              player.transfers_in_event - player.transfers_out_event;
          }

          return comparison;
        });

        return {
          comparison: playerComparisons,
          summary: {
            best_value: playerComparisons.reduce((best, player) =>
              (player.points_per_game || 0) / (player.cost || 1) >
              (best.points_per_game || 0) / (best.cost || 1)
                ? player
                : best
            ),
            best_form: playerComparisons.reduce((best, player) =>
              (player.form || 0) > (best.form || 0) ? player : best
            ),
          },
        };
      },
    }),

    GET_BLANK_GAMEWEEKS: tool({
      name: 'get_blank_gameweeks',
      description: 'Find gameweeks where teams have no fixtures (blank gameweeks)',
      schema: z.object({
        num_gameweeks: z.number().default(10).describe('Number of gameweeks to analyze'),
      }),
      handler: async (args, _context) => {
        const client = new FPLClient();
        const [data, fixtures] = await Promise.all([
          client.getBootstrapStatic(),
          client.getFixtures(),
        ]);

        const currentGameweek = data.events.find((event) => event.is_current)?.id || 1;
        const endGameweek = Math.min(
          currentGameweek + args.num_gameweeks,
          data.events.length
        );

        const blankGameweeks: Record<number, string[]> = {};

        for (let gw = currentGameweek; gw <= endGameweek; gw++) {
          const gameweekFixtures = fixtures.filter((fixture) => fixture.event === gw);
          const teamsWithFixtures = new Set();

          for (const fixture of gameweekFixtures) {
            teamsWithFixtures.add(fixture.team_a);
            teamsWithFixtures.add(fixture.team_h);
          }

          const teamsWithoutFixtures = data.teams
            .filter((team) => !teamsWithFixtures.has(team.id))
            .map((team) => team.name);

          if (teamsWithoutFixtures.length > 0) {
            blankGameweeks[gw] = teamsWithoutFixtures;
          }
        }

        return {
          blank_gameweeks: blankGameweeks,
          summary: `Found ${Object.keys(blankGameweeks).length} blank gameweeks in the next ${args.num_gameweeks} rounds`,
        };
      },
    }),

    GET_MY_TEAM: tool({
      name: 'get_my_team',
      description:
        'Get current team selection, transfers, and bank balance (requires authentication)',
      schema: z.object({}),
      handler: async (_args, context) => {
        const credentials = await context.getCredentials();
        if (!credentials.email || !credentials.password || !credentials.userId) {
          throw new Error('Email, password, and userId are required for this operation');
        }

        const client = new FPLClient();
        await client.login(credentials.email, credentials.password, credentials.userId);

        const [myTeam, data] = await Promise.all([
          client.getMyTeam(),
          client.getBootstrapStatic(),
        ]);

        const playersMap = new Map(data.elements.map((player) => [player.id, player]));

        const teamWithDetails = myTeam.picks.map((pick) => {
          const player = playersMap.get(pick.element);
          return {
            ...pick,
            player_name: player
              ? `${player.first_name} ${player.second_name}`
              : 'Unknown',
            player_cost: player ? player.now_cost / 10 : 0,
            player_points: player ? player.total_points : 0,
          };
        });

        return {
          team: teamWithDetails,
          transfers: myTeam.transfers,
          chips: myTeam.chips,
          bank_balance: myTeam.transfers.bank / 10,
          team_value: myTeam.transfers.value / 10,
        };
      },
    }),

    MAKE_TRANSFER: tool({
      name: 'make_transfer',
      description: 'Make a player transfer (requires authentication)',
      schema: z.object({
        player_in_id: z.number().describe('ID of player to transfer in'),
        player_out_id: z.number().describe('ID of player to transfer out'),
        gameweek: z.number().describe('Current gameweek number'),
        chip: z
          .string()
          .optional()
          .describe('Chip to play (e.g., "wildcard", "freehit")'),
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        if (!credentials.email || !credentials.password || !credentials.userId) {
          throw new Error('Email, password, and userId are required for this operation');
        }

        const client = new FPLClient();
        await client.login(credentials.email, credentials.password, credentials.userId);

        const data = await client.getBootstrapStatic();
        const playersMap = new Map(data.elements.map((player) => [player.id, player]));

        const playerIn = playersMap.get(args.player_in_id);
        const playerOut = playersMap.get(args.player_out_id);

        if (!playerIn || !playerOut) {
          throw new Error('One or both players not found');
        }

        const transferData: FPLTransferData = {
          element_in: args.player_in_id,
          element_out: args.player_out_id,
          purchase_price: playerIn.now_cost,
          selling_price: playerOut.now_cost,
        };

        const result = await client.makeTransfer(
          [transferData],
          args.gameweek,
          args.chip
        );

        return {
          success: true,
          transfer: {
            player_in: `${playerIn.first_name} ${playerIn.second_name}`,
            player_out: `${playerOut.first_name} ${playerOut.second_name}`,
            cost: (playerIn.now_cost - playerOut.now_cost) / 10,
          },
          result,
        };
      },
    }),

    SET_TEAM_LINEUP: tool({
      name: 'set_team_lineup',
      description:
        'Set team lineup including captain, vice-captain, and formation (requires authentication)',
      schema: z.object({
        picks: z
          .array(
            z.object({
              player_id: z.number(),
              position: z.number().min(1).max(15),
              is_captain: z.boolean().default(false),
              is_vice_captain: z.boolean().default(false),
            })
          )
          .length(15)
          .describe('Array of 15 picks with positions 1-15'),
        chip: z.string().optional().describe('Chip to play'),
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        if (!credentials.email || !credentials.password || !credentials.userId) {
          throw new Error('Email, password, and userId are required for this operation');
        }

        const client = new FPLClient();
        await client.login(credentials.email, credentials.password, credentials.userId);

        // Validate lineup
        const captains = args.picks.filter((p) => p.is_captain);
        const viceCaptains = args.picks.filter((p) => p.is_vice_captain);

        if (captains.length !== 1) {
          throw new Error('Exactly one captain must be selected');
        }

        if (viceCaptains.length !== 1) {
          throw new Error('Exactly one vice-captain must be selected');
        }

        const picks = args.picks.map((pick) => ({
          element: pick.player_id,
          position: pick.position,
          is_captain: pick.is_captain,
          is_vice_captain: pick.is_vice_captain,
        }));

        const result = await client.setTeamSelection(picks, args.chip);

        return {
          success: true,
          lineup: args.picks,
          result,
        };
      },
    }),
  }),
});

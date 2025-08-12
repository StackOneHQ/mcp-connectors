import { z } from 'zod';
import { mcpConnectorConfig } from '../config-types';

interface FPLPlayer {
  id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  team: number;
  element_type: number;
  now_cost: number;
  total_points: number;
  points_per_game: number;
  selected_by_percent: number;
  form: number;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  bps: number;
  influence: number;
  creativity: number;
  threat: number;
  ict_index: number;
  expected_goals: number;
  expected_assists: number;
  expected_goal_involvements: number;
  expected_goals_conceded: number;
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

interface FPLGameweek {
  id: number;
  name: string;
  deadline_time: string;
  finished: boolean;
  is_current: boolean;
  is_next: boolean;
  most_selected: number | null;
  most_transferred_in: number | null;
  top_element: number | null;
  most_captained: number | null;
  most_vice_captained: number | null;
}

interface FPLFixture {
  id: number;
  code: number;
  team_h: number;
  team_a: number;
  team_h_score: number | null;
  team_a_score: number | null;
  event: number | null;
  finished: boolean;
  minutes: number;
  provisional_start_time: boolean;
  kickoff_time: string;
  difficulty: number;
}

export const FPLConnectorConfig = mcpConnectorConfig({
  name: 'Fantasy Premier League',
  key: 'fpl',
  version: '1.0.0',
  credentials: z.object({}).optional(),
  setup: z.object({}).optional(),
  logo: 'https://resources.premierleague.com/premierleague/badges/25/t3.png',
  examplePrompt:
    'Analyze the top scoring midfielders this season, compare fixture difficulty for the next 5 gameweeks, and suggest captain options.',

  tools: (tool) => ({
    GET_BOOTSTRAP_DATA: tool({
      name: 'get_bootstrap_data',
      description:
        'Get core Fantasy Premier League data including all players, teams, gameweeks, and basic fixture information',
      schema: z.object({}),
      handler: async (_args, _context) => {
        const response = await fetch(
          'https://fantasy.premierleague.com/api/bootstrap-static/',
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; MCP-FPL-Connector/1.0)',
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch FPL data: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();

        return {
          players: data.elements || [],
          teams: data.teams || [],
          gameweeks: data.events || [],
          element_types: data.element_types || [],
          total_players: data.total_players || 0,
        };
      },
    }),

    ANALYZE_PLAYERS: tool({
      name: 'analyze_players',
      description:
        'Filter and analyze players based on various criteria like position, price, form, points',
      schema: z.object({
        position: z
          .enum(['GK', 'DEF', 'MID', 'FWD'])
          .optional()
          .describe('Filter by position (GK, DEF, MID, FWD)'),
        max_price: z
          .number()
          .optional()
          .describe('Maximum price in millions (e.g., 10.5)'),
        min_price: z.number().optional().describe('Minimum price in millions'),
        min_total_points: z.number().optional().describe('Minimum total points scored'),
        min_form: z.number().optional().describe('Minimum form rating'),
        team_id: z.number().optional().describe('Filter by specific team ID'),
        limit: z
          .number()
          .default(20)
          .describe('Maximum number of players to return (default: 20)'),
      }),
      handler: async (args, _context) => {
        const response = await fetch(
          'https://fantasy.premierleague.com/api/bootstrap-static/',
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; MCP-FPL-Connector/1.0)',
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch FPL data: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        let players = data.elements || [];

        // Apply filters
        if (args.position) {
          const positionMap = { GK: 1, DEF: 2, MID: 3, FWD: 4 };
          players = players.filter(
            (p: FPLPlayer) => p.element_type === positionMap[args.position]
          );
        }

        if (args.max_price) {
          players = players.filter((p: FPLPlayer) => p.now_cost <= args.max_price * 10);
        }

        if (args.min_price) {
          players = players.filter((p: FPLPlayer) => p.now_cost >= args.min_price * 10);
        }

        if (args.min_total_points) {
          players = players.filter(
            (p: FPLPlayer) => p.total_points >= args.min_total_points
          );
        }

        if (args.min_form) {
          players = players.filter(
            (p: FPLPlayer) => Number.parseFloat(p.form.toString()) >= args.min_form
          );
        }

        if (args.team_id) {
          players = players.filter((p: FPLPlayer) => p.team === args.team_id);
        }

        // Sort by total points descending
        players.sort((a: FPLPlayer, b: FPLPlayer) => b.total_points - a.total_points);

        // Limit results
        players = players.slice(0, args.limit);

        return {
          players: players.map((p: FPLPlayer) => ({
            id: p.id,
            name: `${p.first_name} ${p.second_name}`,
            web_name: p.web_name,
            team: p.team,
            position: p.element_type,
            price: p.now_cost / 10,
            total_points: p.total_points,
            points_per_game: p.points_per_game,
            form: Number.parseFloat(p.form.toString()),
            selected_by_percent: p.selected_by_percent,
            minutes: p.minutes,
            goals_scored: p.goals_scored,
            assists: p.assists,
            clean_sheets: p.clean_sheets,
            bonus: p.bonus,
            ict_index: Number.parseFloat(p.ict_index.toString()),
          })),
          total_found: players.length,
        };
      },
    }),

    COMPARE_PLAYERS: tool({
      name: 'compare_players',
      description: 'Compare specific players side by side with detailed statistics',
      schema: z.object({
        player_ids: z
          .array(z.number())
          .min(2)
          .max(5)
          .describe('Array of player IDs to compare (2-5 players)'),
      }),
      handler: async (args, _context) => {
        const response = await fetch(
          'https://fantasy.premierleague.com/api/bootstrap-static/',
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; MCP-FPL-Connector/1.0)',
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch FPL data: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        const players = data.elements || [];
        const teams = data.teams || [];

        const selectedPlayers = players.filter((p: FPLPlayer) =>
          args.player_ids.includes(p.id)
        );

        if (selectedPlayers.length !== args.player_ids.length) {
          const found = selectedPlayers.map((p: FPLPlayer) => p.id);
          const missing = args.player_ids.filter((id) => !found.includes(id));
          throw new Error(`Players not found: ${missing.join(', ')}`);
        }

        return {
          comparison: selectedPlayers.map((p: FPLPlayer) => {
            const team = teams.find((t: FPLTeam) => t.id === p.team);
            return {
              id: p.id,
              name: `${p.first_name} ${p.second_name}`,
              web_name: p.web_name,
              team_name: team?.name || 'Unknown',
              team_short_name: team?.short_name || 'UNK',
              position: p.element_type,
              price: p.now_cost / 10,
              total_points: p.total_points,
              points_per_game: p.points_per_game,
              form: Number.parseFloat(p.form.toString()),
              selected_by_percent: p.selected_by_percent,
              minutes: p.minutes,
              goals_scored: p.goals_scored,
              assists: p.assists,
              clean_sheets: p.clean_sheets,
              goals_conceded: p.goals_conceded,
              yellow_cards: p.yellow_cards,
              red_cards: p.red_cards,
              saves: p.saves,
              bonus: p.bonus,
              bps: p.bps,
              influence: Number.parseFloat(p.influence.toString()),
              creativity: Number.parseFloat(p.creativity.toString()),
              threat: Number.parseFloat(p.threat.toString()),
              ict_index: Number.parseFloat(p.ict_index.toString()),
              expected_goals: p.expected_goals,
              expected_assists: p.expected_assists,
              expected_goal_involvements: p.expected_goal_involvements,
              expected_goals_conceded: p.expected_goals_conceded,
            };
          }),
        };
      },
    }),

    GET_FIXTURES: tool({
      name: 'get_fixtures',
      description: 'Get upcoming fixtures with optional filtering by gameweek or team',
      schema: z.object({
        gameweek: z.number().optional().describe('Filter by specific gameweek number'),
        team_id: z.number().optional().describe('Filter by specific team ID'),
        next_n_gameweeks: z
          .number()
          .optional()
          .describe('Get fixtures for the next N gameweeks from current'),
      }),
      handler: async (args, _context) => {
        const response = await fetch('https://fantasy.premierleague.com/api/fixtures/', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; MCP-FPL-Connector/1.0)',
          },
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch FPL fixtures: ${response.status} ${response.statusText}`
          );
        }

        const fixtures = await response.json();
        const teamsResponse = await fetch(
          'https://fantasy.premierleague.com/api/bootstrap-static/',
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; MCP-FPL-Connector/1.0)',
            },
          }
        );

        const bootstrapData = await teamsResponse.json();
        const teams = bootstrapData.teams || [];
        const events = bootstrapData.events || [];

        let filteredFixtures = fixtures;

        if (args.gameweek) {
          filteredFixtures = filteredFixtures.filter(
            (f: FPLFixture) => f.event === args.gameweek
          );
        }

        if (args.team_id) {
          filteredFixtures = filteredFixtures.filter(
            (f: FPLFixture) => f.team_h === args.team_id || f.team_a === args.team_id
          );
        }

        if (args.next_n_gameweeks) {
          const currentGameweek = events.find((e: FPLGameweek) => e.is_current);
          const currentGwId = currentGameweek ? currentGameweek.id : 1;
          const maxGwId = currentGwId + args.next_n_gameweeks - 1;

          filteredFixtures = filteredFixtures.filter(
            (f: FPLFixture) =>
              f.event !== null && f.event >= currentGwId && f.event <= maxGwId
          );
        }

        return {
          fixtures: filteredFixtures.map((f: FPLFixture) => {
            const homeTeam = teams.find((t: FPLTeam) => t.id === f.team_h);
            const awayTeam = teams.find((t: FPLTeam) => t.id === f.team_a);

            return {
              id: f.id,
              gameweek: f.event,
              home_team: homeTeam?.name || 'Unknown',
              away_team: awayTeam?.name || 'Unknown',
              home_team_short: homeTeam?.short_name || 'UNK',
              away_team_short: awayTeam?.short_name || 'UNK',
              kickoff_time: f.kickoff_time,
              finished: f.finished,
              home_score: f.team_h_score,
              away_score: f.team_a_score,
              minutes: f.minutes,
              home_difficulty: f.difficulty,
            };
          }),
          total_fixtures: filteredFixtures.length,
        };
      },
    }),

    GET_GAMEWEEK_STATUS: tool({
      name: 'get_gameweek_status',
      description: 'Get current gameweek information and status',
      schema: z.object({}),
      handler: async (_args, _context) => {
        const response = await fetch(
          'https://fantasy.premierleague.com/api/bootstrap-static/',
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; MCP-FPL-Connector/1.0)',
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch FPL data: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        const events = data.events || [];

        const current = events.find((e: FPLGameweek) => e.is_current);
        const next = events.find((e: FPLGameweek) => e.is_next);

        return {
          current_gameweek: current
            ? {
                id: current.id,
                name: current.name,
                deadline_time: current.deadline_time,
                finished: current.finished,
                most_selected: current.most_selected,
                most_transferred_in: current.most_transferred_in,
                top_element: current.top_element,
                most_captained: current.most_captained,
                most_vice_captained: current.most_vice_captained,
              }
            : null,
          next_gameweek: next
            ? {
                id: next.id,
                name: next.name,
                deadline_time: next.deadline_time,
              }
            : null,
          total_gameweeks: events.length,
        };
      },
    }),

    GET_PLAYER_DETAILS: tool({
      name: 'get_player_details',
      description:
        'Get detailed information for a specific player including season history',
      schema: z.object({
        player_id: z.number().describe('FPL player ID'),
      }),
      handler: async (args, _context) => {
        const response = await fetch(
          `https://fantasy.premierleague.com/api/element-summary/${args.player_id}/`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; MCP-FPL-Connector/1.0)',
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch player details: ${response.status} ${response.statusText}`
          );
        }

        const playerData = await response.json();

        // Also get basic player info from bootstrap
        const bootstrapResponse = await fetch(
          'https://fantasy.premierleague.com/api/bootstrap-static/',
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; MCP-FPL-Connector/1.0)',
            },
          }
        );

        const bootstrapData = await bootstrapResponse.json();
        const player = bootstrapData.elements.find(
          (p: FPLPlayer) => p.id === args.player_id
        );
        const team = bootstrapData.teams.find((t: FPLTeam) => t.id === player?.team);

        if (!player) {
          throw new Error(`Player with ID ${args.player_id} not found`);
        }

        return {
          player_info: {
            id: player.id,
            name: `${player.first_name} ${player.second_name}`,
            web_name: player.web_name,
            team_name: team?.name || 'Unknown',
            position: player.element_type,
            price: player.now_cost / 10,
            total_points: player.total_points,
            points_per_game: player.points_per_game,
            form: Number.parseFloat(player.form.toString()),
            selected_by_percent: player.selected_by_percent,
          },
          fixtures: playerData.fixtures || [],
          history: playerData.history || [],
          history_past: playerData.history_past || [],
        };
      },
    }),
  }),
});

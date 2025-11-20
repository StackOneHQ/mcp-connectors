import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ConnectorMetadata } from '../types/metadata';

interface StravaTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type?: string;
}

interface StravaAthlete {
  id: number;
  firstname: string;
  lastname: string;
  profile_medium: string;
  profile: string;
  city: string;
  state: string;
  country: string;
  sex: string;
  premium: boolean;
  summit: boolean;
  created_at: string;
  updated_at: string;
  follower_count: number;
  friend_count: number;
  ftp: number;
  weight: number;
  clubs: Array<{
    id: number;
    name: string;
    profile_medium: string;
  }>;
}

interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  type: string;
  start_date: string;
  start_date_local: string;
  timezone: string;
  start_latlng: [number, number] | null;
  end_latlng: [number, number] | null;
  location_city: string;
  location_state: string;
  location_country: string;
  achievement_count: number;
  kudos_count: number;
  comment_count: number;
  athlete_count: number;
  photo_count: number;
  trainer: boolean;
  commute: boolean;
  manual: boolean;
  private: boolean;
  flagged: boolean;
  gear_id: string;
  average_speed: number;
  max_speed: number;
  has_heartrate: boolean;
  average_heartrate?: number;
  max_heartrate?: number;
  heartrate_opt_out: boolean;
  display_hide_heartrate_option: boolean;
  elev_high: number;
  elev_low: number;
  upload_id: number;
  external_id: string;
  from_accepted_tag: boolean;
  pr_count: number;
  total_photo_count: number;
  has_kudoed: boolean;
}

interface StravaSegment {
  id: number;
  name: string;
  activity_type: string;
  distance: number;
  average_grade: number;
  maximum_grade: number;
  elevation_high: number;
  elevation_low: number;
  start_latlng: [number, number];
  end_latlng: [number, number];
  climb_category: number;
  city: string;
  state: string;
  country: string;
  private: boolean;
  hazardous: boolean;
  starred: boolean;
  pr_time?: number;
  effort_count: number;
  athlete_count: number;
  star_count: number;
}

interface StravaActivityStreams {
  [key: string]: {
    data: (number | number[] | null)[];
    series_type: 'time' | 'distance';
    original_size: number;
    resolution: 'low' | 'medium' | 'high';
  };
}

interface StravaRoute {
  id: number;
  name: string;
  description: string;
  distance: number;
  elevation_gain: number;
  type: number;
  sub_type: number;
  private: boolean;
  starred: boolean;
  timestamp: number;
  segments: StravaSegment[];
}

interface StravaAthleteStats {
  biggest_ride_distance: number;
  biggest_climb_elevation_gain: number;
  recent_ride_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    elevation_gain: number;
    achievement_count: number;
  };
  recent_run_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    elevation_gain: number;
    achievement_count: number;
  };
  recent_swim_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    elevation_gain: number;
    achievement_count: number;
  };
  ytd_ride_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    elevation_gain: number;
  };
  ytd_run_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    elevation_gain: number;
  };
  ytd_swim_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    elevation_gain: number;
  };
  all_ride_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    elevation_gain: number;
  };
  all_run_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    elevation_gain: number;
  };
  all_swim_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    elevation_gain: number;
  };
}

class StravaClient {
  private credentials: StravaCredentials;
  private baseUrl = 'https://www.strava.com/api/v3';

  constructor(oauth2Credentials: StravaCredentials) {
    this.credentials = oauth2Credentials;
  }

  private async ensureValidToken(): Promise<void> {
    const expiresAt = new Date(this.credentials.expiresAt);
    const now = new Date();

    // Refresh if token expires in the next 5 minutes or if expiresAt is invalid
    if (
      !Number.isFinite(expiresAt.getTime()) ||
      expiresAt.getTime() - now.getTime() < 5 * 60 * 1000
    ) {
      await this.refreshAccessToken();
    }
  }

  private async refreshAccessToken(): Promise<void> {
    const response = await fetch(STRAVA_OAUTH2_CONFIG.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: this.credentials.refreshToken,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Strava token refresh failed: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const tokenData = (await response.json()) as StravaTokenResponse;

    // Update credentials with new token data
    this.credentials.accessToken = tokenData.access_token;
    this.credentials.refreshToken =
      tokenData.refresh_token || this.credentials.refreshToken;
    this.credentials.expiresAt = new Date(
      Date.now() + tokenData.expires_in * 1000
    ).toISOString();
    this.credentials.tokenType = tokenData.token_type || this.credentials.tokenType;
  }

  private getHeaders(): { Authorization: string; Accept: string } {
    return {
      Authorization: `${this.credentials.tokenType ?? 'Bearer'} ${this.credentials.accessToken}`,
      Accept: 'application/json',
    };
  }

  async getAthlete(): Promise<StravaAthlete> {
    await this.ensureValidToken();
    const response = await fetch(`${this.baseUrl}/athlete`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Strava API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<StravaAthlete>;
  }

  async getAthleteStats(athleteId: number): Promise<StravaAthleteStats> {
    await this.ensureValidToken();
    const response = await fetch(`${this.baseUrl}/athletes/${athleteId}/stats`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Strava API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<StravaAthleteStats>;
  }

  async getActivities(
    before?: number,
    after?: number,
    page = 1,
    perPage = 30
  ): Promise<StravaActivity[]> {
    await this.ensureValidToken();
    const params = new URLSearchParams();

    if (page !== 1) params.set('page', page.toString());
    if (perPage !== 30) params.set('per_page', perPage.toString());
    if (before) params.set('before', before.toString());
    if (after) params.set('after', after.toString());

    const queryString = params.toString();
    const url = queryString
      ? `${this.baseUrl}/athlete/activities?${queryString}`
      : `${this.baseUrl}/athlete/activities`;

    const response = await fetch(url, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Strava API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<StravaActivity[]>;
  }

  async getActivity(activityId: number): Promise<StravaActivity> {
    await this.ensureValidToken();
    const response = await fetch(`${this.baseUrl}/activities/${activityId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Strava API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<StravaActivity>;
  }

  async getActivityStreams(
    activityId: number,
    keys: string[] = ['time', 'distance', 'latlng', 'altitude', 'heartrate', 'watts']
  ): Promise<StravaActivityStreams> {
    await this.ensureValidToken();
    const keysString = keys.join(',');

    const response = await fetch(
      `${this.baseUrl}/activities/${activityId}/streams?keys=${keysString}&key_by_type=true`,
      {
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Strava API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<StravaActivityStreams>;
  }

  async getSegment(segmentId: number): Promise<StravaSegment> {
    await this.ensureValidToken();
    const response = await fetch(`${this.baseUrl}/segments/${segmentId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Strava API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<StravaSegment>;
  }

  async exploreSegments(
    bounds: { sw: [number, number]; ne: [number, number] },
    activityType: 'running' | 'riding' = 'riding',
    minCategory = 0,
    maxCategory = 5
  ): Promise<{ segments: StravaSegment[] }> {
    await this.ensureValidToken();
    const boundsString = `${bounds.sw[0]},${bounds.sw[1]},${bounds.ne[0]},${bounds.ne[1]}`;

    const response = await fetch(
      `${this.baseUrl}/segments/explore?bounds=${boundsString}&activity_type=${activityType}&min_cat=${minCategory}&max_cat=${maxCategory}`,
      {
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Strava API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<{ segments: StravaSegment[] }>;
  }

  async getAthleteRoutes(
    athleteId?: number,
    page = 1,
    perPage = 30
  ): Promise<StravaRoute[]> {
    await this.ensureValidToken();
    let id = athleteId;
    if (!id) {
      const athlete = await this.getAthlete();
      id = athlete.id;
    }

    const response = await fetch(
      `${this.baseUrl}/athletes/${id}/routes?page=${page}&per_page=${perPage}`,
      {
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Strava API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<StravaRoute[]>;
  }

  async getRoute(routeId: number): Promise<StravaRoute> {
    await this.ensureValidToken();
    const response = await fetch(`${this.baseUrl}/routes/${routeId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Strava API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<StravaRoute>;
  }

  async getStarredSegments(page = 1, perPage = 30): Promise<StravaSegment[]> {
    await this.ensureValidToken();
    const response = await fetch(
      `${this.baseUrl}/segments/starred?page=${page}&per_page=${perPage}`,
      {
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Strava API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<StravaSegment[]>;
  }
}

// Strava OAuth2 Configuration
const STRAVA_OAUTH2_CONFIG = {
  tokenUrl: 'https://www.strava.com/oauth/token',
};

// OAuth2 credentials interface for Strava

export interface StravaCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  tokenType: string;
  clientId: string;
  clientSecret: string;
}

export const StravaCredentialsSchema = z.object({
  accessToken: z.string().describe('OAuth access token'),
  refreshToken: z.string().describe('refreshToken value'),
  expiresAt: z.string().describe('expiresAt value'),
  tokenType: z.string().describe('tokenType value'),
  clientId: z.string().describe('OAuth client ID'),
  clientSecret: z.string().describe('OAuth client secret'),
});

export const StravaConnectorMetadata = {
  key: 'strava',
  name: 'Strava',
  description: 'Fitness tracking and social network',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/strava/filled/svg',
  examplePrompt: 'Get my Strava activities',
  categories: ['fitness', 'social'],
  credentialsSchema: StravaCredentialsSchema,
} as const satisfies ConnectorMetadata;

export function createStravaServer(credentials: StravaCredentials): McpServer {
  const server = new McpServer({
    name: 'Strava',
    version: '1.0.0',
  });

  server.tool(
    'strava_get_athlete',
    'Get the authenticated athlete profile information',
    {},
    async (_args) => {
      try {
        const client = new StravaClient(credentials);
        const athlete = await client.getAthlete();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(athlete, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get athlete profile: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'strava_get_athlete_stats',
    'Get statistics for the authenticated athlete',
    {
      athleteId: z
        .number()
        .optional()
        .describe('Athlete ID (defaults to authenticated athlete)'),
    },
    async (args) => {
      try {
        const client = new StravaClient(credentials);

        let athleteId = args.athleteId;
        if (!athleteId) {
          const athlete = await client.getAthlete();
          athleteId = athlete.id;
        }

        const stats = await client.getAthleteStats(athleteId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get athlete stats: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'strava_get_activities',
    'Get recent activities for the authenticated athlete',
    {
      before: z
        .number()
        .optional()
        .describe('Unix timestamp to retrieve activities before'),
      after: z
        .number()
        .optional()
        .describe('Unix timestamp to retrieve activities after'),
      page: z.number().default(1).describe('Page number for pagination'),
      perPage: z.number().default(30).describe('Number of activities per page (max 200)'),
    },
    async (args) => {
      try {
        const client = new StravaClient(credentials);
        const activities = await client.getActivities(
          args.before,
          args.after,
          args.page,
          args.perPage
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(activities, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get activities: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'strava_get_activity',
    'Get detailed information about a specific activity',
    {
      activityId: z.number().describe('The ID of the activity'),
    },
    async (args) => {
      try {
        const client = new StravaClient(credentials);
        const activity = await client.getActivity(args.activityId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(activity, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get activity: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'strava_get_activity_streams',
    'Get detailed stream data for an activity (GPS, heart rate, power, etc.)',
    {
      activityId: z.number().describe('The ID of the activity'),
      keys: z
        .array(z.string())
        .optional()
        .describe(
          'Stream types to retrieve: time, distance, latlng, altitude, heartrate, watts, etc.'
        ),
    },
    async (args) => {
      try {
        const client = new StravaClient(credentials);
        const streams = await client.getActivityStreams(args.activityId, args.keys);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(streams, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get activity streams: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'strava_get_segment',
    'Get information about a specific segment',
    {
      segmentId: z.number().describe('The ID of the segment'),
    },
    async (args) => {
      try {
        const client = new StravaClient(credentials);
        const segment = await client.getSegment(args.segmentId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(segment, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get segment: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'strava_explore_segments',
    'Find popular segments in a geographic area',
    {
      bounds: z
        .object({
          sw: z.tuple([z.number(), z.number()]).describe('Southwest corner [lat, lng]'),
          ne: z.tuple([z.number(), z.number()]).describe('Northeast corner [lat, lng]'),
        })
        .describe('Bounding box for the search area'),
      activityType: z
        .enum(['running', 'riding'])
        .default('riding')
        .describe('Type of activity to search for'),
      minCategory: z
        .number()
        .min(0)
        .max(5)
        .default(0)
        .describe('Minimum climb category (0-5)'),
      maxCategory: z
        .number()
        .min(0)
        .max(5)
        .default(5)
        .describe('Maximum climb category (0-5)'),
    },
    async (args) => {
      try {
        const client = new StravaClient(credentials);
        const result = await client.exploreSegments(
          args.bounds,
          args.activityType,
          args.minCategory,
          args.maxCategory
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to explore segments: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'strava_get_athlete_routes',
    'Get routes created by the authenticated athlete',
    {
      athleteId: z
        .number()
        .optional()
        .describe('Athlete ID (defaults to authenticated athlete)'),
      page: z.number().default(1).describe('Page number for pagination'),
      perPage: z.number().default(30).describe('Number of routes per page'),
    },
    async (args) => {
      try {
        const client = new StravaClient(credentials);
        const routes = await client.getAthleteRoutes(
          args.athleteId,
          args.page,
          args.perPage
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(routes, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get athlete routes: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'strava_get_route',
    'Get detailed information about a specific route',
    {
      routeId: z.number().describe('The ID of the route'),
    },
    async (args) => {
      try {
        const client = new StravaClient(credentials);
        const route = await client.getRoute(args.routeId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(route, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get route: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'strava_get_starred_segments',
    'Get segments that the authenticated athlete has starred',
    {
      page: z.number().default(1).describe('Page number for pagination'),
      perPage: z.number().default(30).describe('Number of segments per page'),
    },
    async (args) => {
      try {
        const client = new StravaClient(credentials);
        const segments = await client.getStarredSegments(args.page, args.perPage);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(segments, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get starred segments: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  return server;
}

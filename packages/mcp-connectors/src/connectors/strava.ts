import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

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
  private credentials: StravaOAuth2Credentials;
  private baseUrl = 'https://www.strava.com/api/v3';

  constructor(oauth2Credentials: StravaOAuth2Credentials) {
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

    const tokenData = await response.json();

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

// OAuth2 credentials schema for Strava
const stravaOAuth2Schema = z.object({
  accessToken: z.string().describe('OAuth2 access token'),
  refreshToken: z.string().describe('OAuth2 refresh token'),
  expiresAt: z.string().describe('Token expiration timestamp'),
  tokenType: z.string().describe('Token type'),
  clientId: z.string().describe('OAuth2 client ID'),
  clientSecret: z.string().describe('OAuth2 client secret'),
});

type StravaOAuth2Credentials = z.infer<typeof stravaOAuth2Schema>;

export const StravaConnectorConfig = mcpConnectorConfig({
  name: 'Strava',
  key: 'strava',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/strava/filled/svg',
  credentials: z.object({
    clientId: z.string().describe('Strava OAuth2 Client ID'),
    clientSecret: z.string().describe('Strava OAuth2 Client Secret'),
  }),
  setup: z.object({}),
  oauth2: {
    schema: stravaOAuth2Schema,
    token: async (_credentials) => {
      // This would be called during initial OAuth2 authorization
      // In practice, this might not be used as Strava tokens are typically obtained through web flow
      throw new Error(
        'Initial token acquisition should be done through Strava OAuth2 web flow'
      );
    },
    refresh: async (credentials, oauth2) => {
      // Parse the OAuth2 credentials to ensure they match our schema
      const parsedOAuth2 = stravaOAuth2Schema.parse(oauth2);
      const response = await fetch(STRAVA_OAUTH2_CONFIG.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: parsedOAuth2.refreshToken,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Strava token refresh failed: ${response.status} ${response.statusText}. ${errorText}`
        );
      }

      const tokenData = (await response.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
        token_type: string;
      };

      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || parsedOAuth2.refreshToken,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        tokenType: tokenData.token_type || 'Bearer',
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
      };
    },
  },
  examplePrompt:
    'Get my recent activities from Strava, show my athlete profile and statistics, and find popular cycling segments in my area.',
  tools: (tool) => ({
    GET_ATHLETE: tool({
      name: 'strava_get_athlete',
      description: 'Get the authenticated athlete profile information',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const oauth2Raw = await context.getOauth2Credentials?.();
          if (!oauth2Raw) {
            throw new Error('OAuth2 credentials not available');
          }

          const oauth2 = stravaOAuth2Schema.parse(oauth2Raw);
          const client = new StravaClient(oauth2);
          const athlete = await client.getAthlete();
          return JSON.stringify(athlete, null, 2);
        } catch (error) {
          return `Failed to get athlete profile: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_ATHLETE_STATS: tool({
      name: 'strava_get_athlete_stats',
      description: 'Get statistics for the authenticated athlete',
      schema: z.object({
        athleteId: z
          .number()
          .optional()
          .describe('Athlete ID (defaults to authenticated athlete)'),
      }),
      handler: async (args, context) => {
        try {
          const oauth2Raw = await context.getOauth2Credentials?.();
          if (!oauth2Raw) {
            throw new Error('OAuth2 credentials not available');
          }

          const oauth2 = stravaOAuth2Schema.parse(oauth2Raw);
          const client = new StravaClient(oauth2);

          let athleteId = args.athleteId;
          if (!athleteId) {
            const athlete = await client.getAthlete();
            athleteId = athlete.id;
          }

          const stats = await client.getAthleteStats(athleteId);
          return JSON.stringify(stats, null, 2);
        } catch (error) {
          return `Failed to get athlete stats: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_ACTIVITIES: tool({
      name: 'strava_get_activities',
      description: 'Get recent activities for the authenticated athlete',
      schema: z.object({
        before: z
          .number()
          .optional()
          .describe('Unix timestamp to retrieve activities before'),
        after: z
          .number()
          .optional()
          .describe('Unix timestamp to retrieve activities after'),
        page: z.number().default(1).describe('Page number for pagination'),
        perPage: z
          .number()
          .default(30)
          .describe('Number of activities per page (max 200)'),
      }),
      handler: async (args, context) => {
        try {
          const oauth2Raw = await context.getOauth2Credentials?.();
          if (!oauth2Raw) {
            throw new Error('OAuth2 credentials not available');
          }

          const oauth2 = stravaOAuth2Schema.parse(oauth2Raw);
          const client = new StravaClient(oauth2);
          const activities = await client.getActivities(
            args.before,
            args.after,
            args.page,
            args.perPage
          );
          return JSON.stringify(activities, null, 2);
        } catch (error) {
          return `Failed to get activities: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_ACTIVITY: tool({
      name: 'strava_get_activity',
      description: 'Get detailed information about a specific activity',
      schema: z.object({
        activityId: z.number().describe('The ID of the activity'),
      }),
      handler: async (args, context) => {
        try {
          const oauth2Raw = await context.getOauth2Credentials?.();
          if (!oauth2Raw) {
            throw new Error('OAuth2 credentials not available');
          }

          const oauth2 = stravaOAuth2Schema.parse(oauth2Raw);
          const client = new StravaClient(oauth2);
          const activity = await client.getActivity(args.activityId);
          return JSON.stringify(activity, null, 2);
        } catch (error) {
          return `Failed to get activity: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_ACTIVITY_STREAMS: tool({
      name: 'strava_get_activity_streams',
      description:
        'Get detailed stream data for an activity (GPS, heart rate, power, etc.)',
      schema: z.object({
        activityId: z.number().describe('The ID of the activity'),
        keys: z
          .array(z.string())
          .optional()
          .describe(
            'Stream types to retrieve: time, distance, latlng, altitude, heartrate, watts, etc.'
          ),
      }),
      handler: async (args, context) => {
        try {
          const oauth2Raw = await context.getOauth2Credentials?.();
          if (!oauth2Raw) {
            throw new Error('OAuth2 credentials not available');
          }

          const oauth2 = stravaOAuth2Schema.parse(oauth2Raw);
          const client = new StravaClient(oauth2);
          const streams = await client.getActivityStreams(args.activityId, args.keys);
          return JSON.stringify(streams, null, 2);
        } catch (error) {
          return `Failed to get activity streams: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_SEGMENT: tool({
      name: 'strava_get_segment',
      description: 'Get information about a specific segment',
      schema: z.object({
        segmentId: z.number().describe('The ID of the segment'),
      }),
      handler: async (args, context) => {
        try {
          const oauth2Raw = await context.getOauth2Credentials?.();
          if (!oauth2Raw) {
            throw new Error('OAuth2 credentials not available');
          }

          const oauth2 = stravaOAuth2Schema.parse(oauth2Raw);
          const client = new StravaClient(oauth2);
          const segment = await client.getSegment(args.segmentId);
          return JSON.stringify(segment, null, 2);
        } catch (error) {
          return `Failed to get segment: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    EXPLORE_SEGMENTS: tool({
      name: 'strava_explore_segments',
      description: 'Find popular segments in a geographic area',
      schema: z.object({
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
      }),
      handler: async (args, context) => {
        try {
          const oauth2Raw = await context.getOauth2Credentials?.();
          if (!oauth2Raw) {
            throw new Error('OAuth2 credentials not available');
          }

          const oauth2 = stravaOAuth2Schema.parse(oauth2Raw);
          const client = new StravaClient(oauth2);
          const result = await client.exploreSegments(
            args.bounds,
            args.activityType,
            args.minCategory,
            args.maxCategory
          );
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to explore segments: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_ATHLETE_ROUTES: tool({
      name: 'strava_get_athlete_routes',
      description: 'Get routes created by the authenticated athlete',
      schema: z.object({
        athleteId: z
          .number()
          .optional()
          .describe('Athlete ID (defaults to authenticated athlete)'),
        page: z.number().default(1).describe('Page number for pagination'),
        perPage: z.number().default(30).describe('Number of routes per page'),
      }),
      handler: async (args, context) => {
        try {
          const oauth2Raw = await context.getOauth2Credentials?.();
          if (!oauth2Raw) {
            throw new Error('OAuth2 credentials not available');
          }

          const oauth2 = stravaOAuth2Schema.parse(oauth2Raw);
          const client = new StravaClient(oauth2);
          const routes = await client.getAthleteRoutes(
            args.athleteId,
            args.page,
            args.perPage
          );
          return JSON.stringify(routes, null, 2);
        } catch (error) {
          return `Failed to get athlete routes: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_ROUTE: tool({
      name: 'strava_get_route',
      description: 'Get detailed information about a specific route',
      schema: z.object({
        routeId: z.number().describe('The ID of the route'),
      }),
      handler: async (args, context) => {
        try {
          const oauth2Raw = await context.getOauth2Credentials?.();
          if (!oauth2Raw) {
            throw new Error('OAuth2 credentials not available');
          }

          const oauth2 = stravaOAuth2Schema.parse(oauth2Raw);
          const client = new StravaClient(oauth2);
          const route = await client.getRoute(args.routeId);
          return JSON.stringify(route, null, 2);
        } catch (error) {
          return `Failed to get route: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_STARRED_SEGMENTS: tool({
      name: 'strava_get_starred_segments',
      description: 'Get segments that the authenticated athlete has starred',
      schema: z.object({
        page: z.number().default(1).describe('Page number for pagination'),
        perPage: z.number().default(30).describe('Number of segments per page'),
      }),
      handler: async (args, context) => {
        try {
          const oauth2Raw = await context.getOauth2Credentials?.();
          if (!oauth2Raw) {
            throw new Error('OAuth2 credentials not available');
          }

          const oauth2 = stravaOAuth2Schema.parse(oauth2Raw);
          const client = new StravaClient(oauth2);
          const segments = await client.getStarredSegments(args.page, args.perPage);
          return JSON.stringify(segments, null, 2);
        } catch (error) {
          return `Failed to get starred segments: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

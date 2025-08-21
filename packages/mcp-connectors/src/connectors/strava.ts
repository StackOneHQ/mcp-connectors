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
  private headers: { Authorization: string; Accept: string };
  private baseUrl = 'https://www.strava.com/api/v3';

  constructor(accessToken: string) {
    this.headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    };
  }

  async getAthlete(): Promise<StravaAthlete> {
    const response = await fetch(`${this.baseUrl}/athlete`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Strava API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<StravaAthlete>;
  }

  async getAthleteStats(athleteId: number): Promise<StravaAthleteStats> {
    const response = await fetch(`${this.baseUrl}/athletes/${athleteId}/stats`, {
      headers: this.headers,
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
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });

    if (before) params.set('before', before.toString());
    if (after) params.set('after', after.toString());

    const response = await fetch(`${this.baseUrl}/athlete/activities?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Strava API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<StravaActivity[]>;
  }

  async getActivity(activityId: number): Promise<StravaActivity> {
    const response = await fetch(`${this.baseUrl}/activities/${activityId}`, {
      headers: this.headers,
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
    const keysString = keys.join(',');
    const response = await fetch(
      `${this.baseUrl}/activities/${activityId}/streams?keys=${keysString}&key_by_type=true`,
      {
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(`Strava API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<StravaActivityStreams>;
  }

  async getSegment(segmentId: number): Promise<StravaSegment> {
    const response = await fetch(`${this.baseUrl}/segments/${segmentId}`, {
      headers: this.headers,
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
    const boundsString = `${bounds.sw[0]},${bounds.sw[1]},${bounds.ne[0]},${bounds.ne[1]}`;
    const response = await fetch(
      `${this.baseUrl}/segments/explore?bounds=${boundsString}&activity_type=${activityType}&min_cat=${minCategory}&max_cat=${maxCategory}`,
      {
        headers: this.headers,
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
    let id = athleteId;
    if (!id) {
      const athlete = await this.getAthlete();
      id = athlete.id;
    }

    const response = await fetch(
      `${this.baseUrl}/athletes/${id}/routes?page=${page}&per_page=${perPage}`,
      {
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(`Strava API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<StravaRoute[]>;
  }

  async getRoute(routeId: number): Promise<StravaRoute> {
    const response = await fetch(`${this.baseUrl}/routes/${routeId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Strava API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<StravaRoute>;
  }

  async getStarredSegments(page = 1, perPage = 30): Promise<StravaSegment[]> {
    const response = await fetch(
      `${this.baseUrl}/segments/starred?page=${page}&per_page=${perPage}`,
      {
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(`Strava API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<StravaSegment[]>;
  }
}

export const StravaConnectorConfig = mcpConnectorConfig({
  name: 'Strava',
  key: 'strava',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/strava/filled/svg',
  credentials: z.object({
    accessToken: z
      .string()
      .describe(
        'Strava Access Token obtained through OAuth 2.0 flow :: 1234567890abcdef :: https://developers.strava.com/docs/getting-started'
      ),
  }),
  setup: z.object({}),
  examplePrompt:
    'Get my recent activities from Strava, show my athlete profile and statistics, and find popular cycling segments in my area.',
  tools: (tool) => ({
    GET_ATHLETE: tool({
      name: 'strava_get_athlete',
      description: 'Get the authenticated athlete profile information',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new StravaClient(accessToken);
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
          const { accessToken } = await context.getCredentials();
          const client = new StravaClient(accessToken);

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
          const { accessToken } = await context.getCredentials();
          const client = new StravaClient(accessToken);
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
          const { accessToken } = await context.getCredentials();
          const client = new StravaClient(accessToken);
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
          const { accessToken } = await context.getCredentials();
          const client = new StravaClient(accessToken);
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
          const { accessToken } = await context.getCredentials();
          const client = new StravaClient(accessToken);
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
          const { accessToken } = await context.getCredentials();
          const client = new StravaClient(accessToken);
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
          const { accessToken } = await context.getCredentials();
          const client = new StravaClient(accessToken);
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
          const { accessToken } = await context.getCredentials();
          const client = new StravaClient(accessToken);
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
          const { accessToken } = await context.getCredentials();
          const client = new StravaClient(accessToken);
          const segments = await client.getStarredSegments(args.page, args.perPage);
          return JSON.stringify(segments, null, 2);
        } catch (error) {
          return `Failed to get starred segments: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

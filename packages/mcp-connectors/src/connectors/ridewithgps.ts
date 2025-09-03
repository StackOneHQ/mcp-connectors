import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface RideWithGPSUser {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  username: string;
  email?: string;
  created_at: string;
  updated_at: string;
  description?: string;
  locality?: string;
  administrative_area?: string;
  country_code?: string;
  time_zone: string;
  privacy: string;
  total_trip_distance: number;
  total_trip_duration: number;
  total_trip_elevation_gain: number;
  total_routes: number;
  total_trips: number;
  highlighted_photo_id?: number;
  interests?: string[];
  bike_shops?: string[];
}

interface RideWithGPSRoute {
  id: number;
  name?: string;
  description?: string;
  distance: number;
  elevation_gain: number;
  elevation_loss: number;
  maximum_elevation: number;
  minimum_elevation: number;
  created_at: string;
  updated_at: string;
  visibility: number;
  pavement_type: number;
  pavement_type_id: number;
  recreation_type: number;
  recreation_type_id: number;
  route_type: string;
  user_id: number;
  sw_lat: number;
  sw_lng: number;
  ne_lat: number;
  ne_lng: number;
  locality?: string;
  administrative_area?: string;
  country_code?: string;
  postal_code?: string;
  first_lat: number;
  first_lng: number;
  last_lat: number;
  last_lng: number;
  highlighted_photo_id?: number;
  track_points?: Array<{
    x: number; // longitude
    y: number; // latitude
    e?: number; // elevation
    t?: number; // time offset
  }>;
}

interface RideWithGPSTrip {
  id: number;
  name?: string;
  description?: string;
  distance: number;
  elevation_gain: number;
  elevation_loss: number;
  maximum_elevation: number;
  minimum_elevation: number;
  duration: number;
  moving_time?: number;
  created_at: string;
  updated_at: string;
  departed_at: string;
  visibility: number;
  is_gps: boolean;
  user_id: number;
  route_id?: number;
  sw_lat: number;
  sw_lng: number;
  ne_lat: number;
  ne_lng: number;
  locality?: string;
  administrative_area?: string;
  country_code?: string;
  postal_code?: string;
  first_lat: number;
  first_lng: number;
  last_lat: number;
  last_lng: number;
  maximum_speed?: number;
  average_speed?: number;
  maximum_hr?: number;
  average_hr?: number;
  maximum_watts?: number;
  average_watts?: number;
  maximum_cad?: number;
  average_cad?: number;
  calories?: number;
  highlighted_photo_id?: number;
  track_points?: Array<{
    x: number; // longitude
    y: number; // latitude
    e?: number; // elevation
    t?: number; // time offset
  }>;
}

interface RideWithGPSEvent {
  id: number;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
  visibility: number;
  user_id: number;
  locality?: string;
  administrative_area?: string;
  country_code?: string;
  event_type: string;
  registration_opens_at?: string;
  registration_closes_at?: string;
  max_participants?: number;
  current_participants?: number;
  highlighted_photo_id?: number;
}

class RideWithGPSClient {
  private baseUrl = 'https://ridewithgps.com';
  private apiKey: string;
  private authToken: string;

  constructor(apiKey: string, authToken: string) {
    this.apiKey = apiKey;
    this.authToken = authToken;
  }

  private async makeRequest<T>(
    endpoint: string,
    params?: Record<string, string>
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    // Add API key and auth token to all requests
    url.searchParams.set('apikey', this.apiKey);
    url.searchParams.set('auth_token', this.authToken);

    // Add additional parameters
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'MCP-Connectors-RideWithGPS/1.0.0',
      },
    });

    if (!response.ok) {
      throw new Error(`RideWithGPS API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  async getCurrentUser(): Promise<RideWithGPSUser> {
    const response = await this.makeRequest<{ user: RideWithGPSUser }>(
      '/users/current.json'
    );
    return response.user;
  }

  async getRoutes(userId?: number, offset = 0, limit = 20): Promise<RideWithGPSRoute[]> {
    let endpoint: string;
    if (userId) {
      endpoint = `/users/${userId}/routes.json`;
    } else {
      // Get current user ID first since "current" doesn't work for routes endpoint
      const user = await this.getCurrentUser();
      endpoint = `/users/${user.id}/routes.json`;
    }

    const params = {
      offset: offset.toString(),
      limit: limit.toString(),
    };

    const response = await this.makeRequest<{ results: RideWithGPSRoute[] }>(
      endpoint,
      params
    );
    return response.results;
  }

  async getRouteDetails(routeId: number): Promise<RideWithGPSRoute> {
    const response = await this.makeRequest<{ route: RideWithGPSRoute }>(
      `/routes/${routeId}.json`
    );
    return response.route;
  }

  async getTrips(userId?: number, offset = 0, limit = 20): Promise<RideWithGPSTrip[]> {
    let endpoint: string;
    if (userId) {
      endpoint = `/users/${userId}/trips.json`;
    } else {
      // Get current user ID first since "current" doesn't work for trips endpoint
      const user = await this.getCurrentUser();
      endpoint = `/users/${user.id}/trips.json`;
    }

    const params = {
      offset: offset.toString(),
      limit: limit.toString(),
    };

    const response = await this.makeRequest<{ results: RideWithGPSTrip[] }>(
      endpoint,
      params
    );
    return response.results;
  }

  async getTripDetails(tripId: number): Promise<RideWithGPSTrip> {
    const response = await this.makeRequest<{ trip: RideWithGPSTrip }>(
      `/trips/${tripId}.json`
    );
    return response.trip;
  }

  async getEvents(userId?: number): Promise<RideWithGPSEvent[]> {
    let endpoint: string;
    if (userId) {
      endpoint = `/users/${userId}/events.json`;
    } else {
      // Get current user ID first since "current" doesn't work for events endpoint
      const user = await this.getCurrentUser();
      endpoint = `/users/${user.id}/events.json`;
    }

    const response = await this.makeRequest<{ results: RideWithGPSEvent[] }>(endpoint);
    return response.results;
  }
}

export const RideWithGPSConnectorConfig = mcpConnectorConfig({
  name: 'RideWithGPS',
  key: 'ridewithgps',
  version: '1.0.0',
  logo: 'https://d2t78mz16qmt2u.cloudfront.net/static/images/ridewithgps_icon_114.png',
  credentials: z.object({
    apiKey: z
      .string()
      .describe('RideWithGPS API Key :: testkey1 :: From RideWithGPS API documentation'),
    authToken: z
      .string()
      .describe(
        'RideWithGPS Authentication Token obtained through login :: your-auth-token :: Login to your account and retrieve from API documentation'
      ),
  }),
  setup: z.object({}),
  examplePrompt:
    'Show me my recent cycling trips from RideWithGPS, get my user profile, and list my created routes with detailed information.',
  tools: (tool) => ({
    GET_CURRENT_USER: tool({
      name: 'ridewithgps_get_current_user',
      description: 'Get the authenticated user profile and cycling statistics',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { apiKey, authToken } = await context.getCredentials();
          const client = new RideWithGPSClient(apiKey, authToken);
          const user = await client.getCurrentUser();
          return JSON.stringify(user, null, 2);
        } catch (error) {
          return `Failed to get current user: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_ROUTES: tool({
      name: 'ridewithgps_get_routes',
      description: 'Get user-owned cycling routes with basic information',
      schema: z.object({
        userId: z
          .number()
          .optional()
          .describe('User ID (defaults to authenticated user)'),
        offset: z.number().default(0).describe('Offset for pagination'),
        limit: z.number().default(20).describe('Number of routes to retrieve (max 50)'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, authToken } = await context.getCredentials();
          const client = new RideWithGPSClient(apiKey, authToken);
          const routes = await client.getRoutes(args.userId, args.offset, args.limit);
          return JSON.stringify(routes, null, 2);
        } catch (error) {
          return `Failed to get routes: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_ROUTE_DETAILS: tool({
      name: 'ridewithgps_get_route_details',
      description:
        'Get comprehensive information about a specific route including track points',
      schema: z.object({
        routeId: z.number().describe('The ID of the route'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, authToken } = await context.getCredentials();
          const client = new RideWithGPSClient(apiKey, authToken);
          const route = await client.getRouteDetails(args.routeId);
          return JSON.stringify(route, null, 2);
        } catch (error) {
          return `Failed to get route details: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_TRIPS: tool({
      name: 'ridewithgps_get_trips',
      description: 'Get cycling trips/activities with performance metrics',
      schema: z.object({
        userId: z
          .number()
          .optional()
          .describe('User ID (defaults to authenticated user)'),
        offset: z.number().default(0).describe('Offset for pagination'),
        limit: z.number().default(20).describe('Number of trips to retrieve (max 50)'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, authToken } = await context.getCredentials();
          const client = new RideWithGPSClient(apiKey, authToken);
          const trips = await client.getTrips(args.userId, args.offset, args.limit);
          return JSON.stringify(trips, null, 2);
        } catch (error) {
          return `Failed to get trips: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_TRIP_DETAILS: tool({
      name: 'ridewithgps_get_trip_details',
      description:
        'Get detailed performance data for a specific trip including track points',
      schema: z.object({
        tripId: z.number().describe('The ID of the trip'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, authToken } = await context.getCredentials();
          const client = new RideWithGPSClient(apiKey, authToken);
          const trip = await client.getTripDetails(args.tripId);
          return JSON.stringify(trip, null, 2);
        } catch (error) {
          return `Failed to get trip details: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_EVENTS: tool({
      name: 'ridewithgps_get_events',
      description: 'Get cycling events the user has participated in or created',
      schema: z.object({
        userId: z
          .number()
          .optional()
          .describe('User ID (defaults to authenticated user)'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, authToken } = await context.getCredentials();
          const client = new RideWithGPSClient(apiKey, authToken);
          const events = await client.getEvents(args.userId);
          return JSON.stringify(events, null, 2);
        } catch (error) {
          return `Failed to get events: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

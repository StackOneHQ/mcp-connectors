import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

interface RideWithGPSSearchResult {
  type?: string;
  route?: RideWithGPSRoute;
  trip?: RideWithGPSTrip;
  [key: string]: unknown;
}

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

  async makeRequest<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
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

export interface RideWithGPSCredentials {
  apiKey: string;
  authToken: string;
}

export function createRideWithGPSServer(credentials: RideWithGPSCredentials): McpServer {
  const server = new McpServer({
    name: 'RideWithGPS',
    version: '1.0.0',
  });

  const client = new RideWithGPSClient(credentials.apiKey, credentials.authToken);

  server.tool(
    'ridewithgps_get_current_user',
    "Get cyclist profile with total distance, trips, routes, location, and cycling preferences. Essential first step to understand the rider's cycling background and stats.",
    {},
    async () => {
      try {
        const user = await client.getCurrentUser();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(user, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to get current user: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'ridewithgps_get_routes',
    "List user's planned cycling routes. These are pre-built routes that the user created for future bike rides, showing distance, elevation, and location details.",
    {
      userId: z
        .number()
        .optional()
        .describe('User ID (defaults to authenticated user)'),
      offset: z.number().default(0).describe('Offset for pagination'),
      limit: z.number().default(20).describe('Number of routes to retrieve (max 50)'),
    },
    async (args) => {
      try {
        const routes = await client.getRoutes(args.userId, args.offset, args.limit);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(routes, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to get routes: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'ridewithgps_get_route_details',
    'Get complete route analysis with GPS coordinates, elevation profile, turn-by-turn directions, and points of interest. Use when you need detailed navigation or route analysis.',
    {
      routeId: z.number().describe('The ID of the route'),
    },
    async (args) => {
      try {
        const route = await client.getRouteDetails(args.routeId);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(route, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to get route details: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'ridewithgps_get_rides',
    'View completed cycling activities with speed, power, heart rate, and performance analytics. Perfect for tracking fitness progress and analyzing ride history.',
    {
      userId: z
        .number()
        .optional()
        .describe('User ID (defaults to authenticated user)'),
      offset: z.number().default(0).describe('Offset for pagination'),
      limit: z.number().default(20).describe('Number of rides to retrieve (max 50)'),
    },
    async (args) => {
      try {
        const rides = await client.getTrips(args.userId, args.offset, args.limit);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(rides, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to get rides: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'ridewithgps_get_ride_details',
    'Deep dive into ride performance with GPS tracking, elevation changes, speed zones, power analysis, and heart rate data. Essential for detailed workout analysis.',
    {
      rideId: z.number().describe('The ID of the ride'),
    },
    async (args) => {
      try {
        const ride = await client.getTripDetails(args.rideId);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(ride, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to get ride details: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'ridewithgps_search_routes',
    'Search for cycling routes by location, keywords, or criteria. Use this when you want to FIND routes in a specific area or with certain characteristics. Examples: "mountain routes near Portland", "gravel rides under 50km", "scenic coastal routes in California". Returns clickable URLs to open routes in RideWithGPS. Use this tool any time someone wants to discover or find cycling routes.',
    {
      keywords: z
        .string()
        .optional()
        .describe(
          'Search terms: "mountain", "gravel", "scenic", "coastal", "challenging", "beginner-friendly", etc.'
        ),
      startLocation: z
        .string()
        .optional()
        .describe(
          'Geographic search center: "Portland, OR", "London, UK", "Paris, France", "California", etc.'
        ),
      startDistance: z
        .number()
        .optional()
        .describe(
          'Search radius in miles from location (try 15, 25, 50, or 100 miles)'
        ),
      minLength: z
        .number()
        .optional()
        .describe('Minimum distance in km (e.g., 20 for routes 20km+)'),
      maxLength: z
        .number()
        .optional()
        .describe('Maximum distance in km (e.g., 100 for routes under 100km)'),
      minElevation: z
        .number()
        .optional()
        .describe('Minimum climbing in meters (e.g., 500 for hilly routes)'),
      maxElevation: z
        .number()
        .optional()
        .describe('Maximum climbing in meters (e.g., 1000 for moderate routes)'),
      sortBy: z
        .enum([
          'length asc',
          'length desc',
          'elevation_gain asc',
          'elevation_gain desc',
          'created_at desc',
        ])
        .optional()
        .describe(
          'Sort by: "length asc" (shortest first), "length desc" (longest first), "elevation_gain asc" (easiest climbs), "elevation_gain desc" (hardest climbs), "created_at desc" (newest routes)'
        ),
      limit: z
        .number()
        .default(20)
        .describe('Number of routes to return (max 100, default 20)'),
    },
    async (args) => {
      try {
        // Build search parameters
        const searchParams = new URLSearchParams();

        if (args.keywords) searchParams.set('search[keywords]', args.keywords);
        if (args.startLocation)
          searchParams.set('search[start_location]', args.startLocation);
        if (args.startDistance)
          searchParams.set('search[start_distance]', args.startDistance.toString());
        if (args.minLength)
          searchParams.set('search[length_min]', args.minLength.toString());
        if (args.maxLength)
          searchParams.set('search[length_max]', args.maxLength.toString());
        if (args.minElevation)
          searchParams.set('search[elevation_min]', args.minElevation.toString());
        if (args.maxElevation)
          searchParams.set('search[elevation_max]', args.maxElevation.toString());
        if (args.sortBy) searchParams.set('search[sort_by]', args.sortBy);

        searchParams.set('search[offset]', '0');
        searchParams.set('search[limit]', Math.min(args.limit, 100).toString());

        // Make search request
        const searchUrl = `/find/search.json?${searchParams.toString()}`;

        const response = await client.makeRequest<{
          results: RideWithGPSSearchResult[];
        }>(searchUrl);

        // Enhance routes with URLs and formatted data
        const enhancedRoutes = response.results.map((item) => {
          // Handle both routes and trips from search results
          const data = item.type === 'trip' ? item.trip : item.route || item;
          if (!data) {
            return item;
          }

          const id = data.id;
          const itemType = item.type || 'route';
          const distance = typeof data.distance === 'number' ? data.distance : 0;
          const elevationGain =
            typeof data.elevation_gain === 'number' ? data.elevation_gain : 0;

          return {
            ...item,
            ridewithgps_url:
              itemType === 'trip'
                ? `https://ridewithgps.com/trips/${id}`
                : `https://ridewithgps.com/routes/${id}`,
            distance_km: distance ? Math.round((distance / 1000) * 10) / 10 : null,
            distance_miles: distance
              ? Math.round((distance / 1609.34) * 10) / 10
              : null,
            elevation_gain_ft: elevationGain
              ? Math.round(elevationGain * 3.28084)
              : null,
            quick_stats:
              distance && elevationGain
                ? `${Math.round(distance / 1000)}km, ${Math.round(elevationGain)}m climb`
                : null,
            location_summary: [
              data.locality,
              data.administrative_area,
              data.country_code,
            ]
              .filter(Boolean)
              .join(', '),
            result_type: itemType,
            name: data.name,
          };
        });

        // Create search summary
        const summary = {
          total_found: enhancedRoutes.length,
          search_tip:
            "Click the 'ridewithgps_url' links to open routes directly in RideWithGPS!",
          search_parameters: {
            keywords: args.keywords || null,
            start_location: args.startLocation || null,
            search_radius_miles: args.startDistance || null,
            length_range_km:
              args.minLength || args.maxLength
                ? `${args.minLength || 0} - ${args.maxLength || '∞'}`
                : null,
            elevation_range_m:
              args.minElevation || args.maxElevation
                ? `${args.minElevation || 0} - ${args.maxElevation || '∞'}`
                : null,
            sort_by: args.sortBy || 'relevance',
          },
        };

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ summary, routes: enhancedRoutes }, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to search routes: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'ridewithgps_get_events',
    'Find cycling events, group rides, races, and challenges. Discover local cycling community activities, organized rides, and competitive events to join.',
    {
      userId: z
        .number()
        .optional()
        .describe('User ID (defaults to authenticated user)'),
    },
    async (args) => {
      try {
        const events = await client.getEvents(args.userId);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(events, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to get events: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  return server;
}

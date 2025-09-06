import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

const GOOGLE_MAPS_API_BASE = 'https://maps.googleapis.com/maps/api';

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  price_level?: number;
  types: string[];
  vicinity?: string;
  opening_hours?: {
    open_now: boolean;
  };
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
}

interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  international_phone_number?: string;
  website?: string;
  url: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  types: string[];
  opening_hours?: {
    open_now: boolean;
    periods: Array<{
      close: { day: number; time: string };
      open: { day: number; time: string };
    }>;
    weekday_text: string[];
  };
  reviews?: Array<{
    author_name: string;
    rating: number;
    text: string;
    time: number;
  }>;
}

interface GeocodeResult {
  place_id: string;
  formatted_address: string;
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
    location_type: string;
  };
  types: string[];
}

interface DirectionsResult {
  routes: Array<{
    summary: string;
    legs: Array<{
      start_address: string;
      end_address: string;
      distance: {
        text: string;
        value: number;
      };
      duration: {
        text: string;
        value: number;
      };
      steps: Array<{
        html_instructions: string;
        distance: {
          text: string;
          value: number;
        };
        duration: {
          text: string;
          value: number;
        };
        start_location: {
          lat: number;
          lng: number;
        };
        end_location: {
          lat: number;
          lng: number;
        };
      }>;
    }>;
    overview_polyline: {
      points: string;
    };
  }>;
}

interface DistanceMatrixResult {
  rows: Array<{
    elements: Array<{
      status: string;
      distance?: {
        text: string;
        value: number;
      };
      duration?: {
        text: string;
        value: number;
      };
    }>;
  }>;
  origin_addresses: string[];
  destination_addresses: string[];
}

interface ElevationResult {
  results: Array<{
    elevation: number;
    location: {
      lat: number;
      lng: number;
    };
    resolution: number;
  }>;
}

class GoogleMapsClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeRequest(endpoint: string, params: Record<string, string>) {
    const url = new URL(`${GOOGLE_MAPS_API_BASE}${endpoint}`);
    url.searchParams.set('key', this.apiKey);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Google Maps API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;

    if (data.status && data.status !== 'OK') {
      throw new Error(
        `Google Maps API error: ${data.status} - ${data.error_message || 'Unknown error'}`
      );
    }

    return data;
  }

  async searchNearby(
    location: string,
    radius: number,
    type?: string,
    keyword?: string
  ): Promise<PlaceResult[]> {
    const params: Record<string, string> = {
      location,
      radius: radius.toString(),
    };

    if (type) params.type = type;
    if (keyword) params.keyword = keyword;

    const data = await this.makeRequest('/place/nearbysearch/json', params);
    return data.results || [];
  }

  async getPlaceDetails(placeId: string, fields?: string[]): Promise<PlaceDetails> {
    const params: Record<string, string> = {
      place_id: placeId,
    };

    if (fields && fields.length > 0) {
      params.fields = fields.join(',');
    } else {
      params.fields =
        'place_id,name,formatted_address,international_phone_number,website,url,geometry,rating,user_ratings_total,price_level,types,opening_hours,reviews';
    }

    const data = await this.makeRequest('/place/details/json', params);
    return data.result;
  }

  async geocode(address: string): Promise<GeocodeResult[]> {
    const params = {
      address,
    };

    const data = await this.makeRequest('/geocode/json', params);
    return data.results || [];
  }

  async reverseGeocode(lat: number, lng: number): Promise<GeocodeResult[]> {
    const params = {
      latlng: `${lat},${lng}`,
    };

    const data = await this.makeRequest('/geocode/json', params);
    return data.results || [];
  }

  async getDirections(
    origin: string,
    destination: string,
    mode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'driving',
    waypoints?: string[],
    avoidTolls?: boolean,
    avoidHighways?: boolean
  ): Promise<DirectionsResult> {
    const params: Record<string, string> = {
      origin,
      destination,
      mode,
    };

    if (waypoints && waypoints.length > 0) {
      params.waypoints = waypoints.join('|');
    }

    const avoid = [];
    if (avoidTolls) avoid.push('tolls');
    if (avoidHighways) avoid.push('highways');
    if (avoid.length > 0) {
      params.avoid = avoid.join('|');
    }

    return await this.makeRequest('/directions/json', params) as DirectionsResult;
  }

  async getDistanceMatrix(
    origins: string[],
    destinations: string[],
    mode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'driving'
  ): Promise<DistanceMatrixResult> {
    const params = {
      origins: origins.join('|'),
      destinations: destinations.join('|'),
      mode,
    };

    return await this.makeRequest('/distancematrix/json', params) as DistanceMatrixResult;
  }

  async getElevation(
    locations: Array<{ lat: number; lng: number }>
  ): Promise<ElevationResult> {
    const params = {
      locations: locations.map((loc) => `${loc.lat},${loc.lng}`).join('|'),
    };

    return await this.makeRequest('/elevation/json', params) as ElevationResult;
  }
}

export const googleMapsConnector = mcpConnectorConfig({
  name: 'Google Maps',
  key: 'google-maps',
  logo: 'https://stackone-logos.com/api/google-maps/filled/svg',
  version: '1.0.0',
  credentials: z.object({
    apiKey: z.string().min(1, 'Google Maps API key is required'),
  }),
  setup: z.object({}),
  examplePrompt: 'Find restaurants near Times Square in New York City and get directions from Central Park to the top-rated restaurant.',
  tools: (tool) => ({
    SEARCH_NEARBY: tool({
      name: 'search_nearby',
      description: 'Search for nearby places using Google Places API',
      schema: z.object({
        location: z
          .string()
          .describe(
            'Location as latitude,longitude (e.g., "40.7128,-74.0060") or place name'
          ),
        radius: z
          .number()
          .min(1)
          .max(50000)
          .default(1000)
          .describe('Search radius in meters (max 50000)'),
        type: z
          .string()
          .optional()
          .describe('Place type (e.g., restaurant, gas_station, hospital)'),
        keyword: z
          .string()
          .optional()
          .describe('Keyword to match against place names and types'),
      }),
      handler: async (args, context) => {
        const { apiKey } = await context.getCredentials();
        const client = new GoogleMapsClient(apiKey);
        const results = await client.searchNearby(
          args.location,
          args.radius,
          args.type,
          args.keyword
        );

        return JSON.stringify({ results }, null, 2);
      },
    }),
    GET_PLACE_DETAILS: tool({
      name: 'get_place_details',
      description: 'Get detailed information about a specific place',
      schema: z.object({
        placeId: z.string().describe('Place ID from Google Places API'),
        fields: z
          .array(z.string())
          .optional()
          .describe('Specific fields to retrieve (optional)'),
      }),
      handler: async (args, context) => {
        const { apiKey } = await context.getCredentials();
        const client = new GoogleMapsClient(apiKey);
        const result = await client.getPlaceDetails(args.placeId, args.fields);

        return JSON.stringify(result, null, 2);
      },
    }),
    GEOCODE: tool({
      name: 'maps_geocode',
      description: 'Convert addresses to coordinates using Google Geocoding API',
      schema: z.object({
        address: z.string().describe('Address to geocode'),
      }),
      handler: async (args, context) => {
        const { apiKey } = await context.getCredentials();
        const client = new GoogleMapsClient(apiKey);
        const results = await client.geocode(args.address);

        return JSON.stringify({ results }, null, 2);
      },
    }),
    REVERSE_GEOCODE: tool({
      name: 'maps_reverse_geocode',
      description: 'Convert coordinates to addresses using Google Reverse Geocoding API',
      schema: z.object({
        lat: z.number().describe('Latitude'),
        lng: z.number().describe('Longitude'),
      }),
      handler: async (args, context) => {
        const { apiKey } = await context.getCredentials();
        const client = new GoogleMapsClient(apiKey);
        const results = await client.reverseGeocode(args.lat, args.lng);

        return JSON.stringify({ results }, null, 2);
      },
    }),
    DIRECTIONS: tool({
      name: 'maps_directions',
      description: 'Get directions between two locations using Google Directions API',
      schema: z.object({
        origin: z.string().describe('Starting location (address or lat,lng)'),
        destination: z.string().describe('Destination location (address or lat,lng)'),
        mode: z
          .enum(['driving', 'walking', 'bicycling', 'transit'])
          .default('driving')
          .describe('Travel mode'),
        waypoints: z.array(z.string()).optional().describe('Waypoints to route through'),
        avoidTolls: z.boolean().optional().describe('Avoid tolls'),
        avoidHighways: z.boolean().optional().describe('Avoid highways'),
      }),
      handler: async (args, context) => {
        const { apiKey } = await context.getCredentials();
        const client = new GoogleMapsClient(apiKey);
        const result = await client.getDirections(
          args.origin,
          args.destination,
          args.mode,
          args.waypoints,
          args.avoidTolls,
          args.avoidHighways
        );

        return JSON.stringify(result, null, 2);
      },
    }),
    DISTANCE_MATRIX: tool({
      name: 'maps_distance_matrix',
      description:
        'Calculate distances and travel times between multiple origins and destinations',
      schema: z.object({
        origins: z.array(z.string()).describe('Array of origin locations'),
        destinations: z.array(z.string()).describe('Array of destination locations'),
        mode: z
          .enum(['driving', 'walking', 'bicycling', 'transit'])
          .default('driving')
          .describe('Travel mode'),
      }),
      handler: async (args, context) => {
        const { apiKey } = await context.getCredentials();
        const client = new GoogleMapsClient(apiKey);
        const result = await client.getDistanceMatrix(
          args.origins,
          args.destinations,
          args.mode
        );

        return JSON.stringify(result, null, 2);
      },
    }),
    ELEVATION: tool({
      name: 'maps_elevation',
      description: 'Get elevation data for locations using Google Elevation API',
      schema: z.object({
        locations: z
          .array(
            z.object({
              lat: z.number(),
              lng: z.number(),
            })
          )
          .describe('Array of locations to get elevation for'),
      }),
      handler: async (args, context) => {
        const { apiKey } = await context.getCredentials();
        const client = new GoogleMapsClient(apiKey);
        const result = await client.getElevation(args.locations);

        return JSON.stringify(result, null, 2);
      },
    }),
  }),
});

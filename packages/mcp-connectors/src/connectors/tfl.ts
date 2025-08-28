import { create, insertMultiple, search } from '@orama/orama';
import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface TFLLine {
  id: string;
  name: string;
  modeName: string;
  created: string;
  modified: string;
  lineStatuses: Array<{
    id: number;
    statusSeverity: number;
    statusSeverityDescription: string;
    reason?: string;
    disruption?: {
      categoryDescription: string;
      description: string;
    };
  }>;
}

interface TFLStopPoint {
  naptanId: string;
  indicator?: string;
  stopLetter?: string;
  modes: string[];
  icsCode?: string;
  smsCode?: string;
  stopType: string;
  stationNaptan?: string;
  accessibilitySummary?: string;
  hubNaptanCode?: string;
  lines: Array<{
    id: string;
    name: string;
    uri: string;
  }>;
  lineGroup: Array<{
    stationAtcoCode: string;
    lineIdentifier: string[];
  }>;
  lineModeGroups: Array<{
    modeName: string;
    lineIdentifier: string[];
  }>;
  fullName?: string;
  naptanMode?: string;
  status?: boolean;
  id: string;
  url: string;
  commonName: string;
  distance?: number;
  placeType: string;
  additionalProperties: Array<{
    category: string;
    key: string;
    sourceSystemKey: string;
    value: string;
    modified: string;
  }>;
  children: unknown[];
  childrenUrls: unknown[];
  lat: number;
  lon: number;
}

interface TFLJourneyPlan {
  $type: string;
  journeys: Array<{
    startDateTime: string;
    duration: number;
    arrivalDateTime: string;
    legs: Array<{
      duration: number;
      speed?: string;
      instruction: {
        summary: string;
        detailed: string;
      };
      path: {
        lineString: string;
        stopPoints: Array<{
          id: string;
          name: string;
          lat: number;
          lon: number;
        }>;
      };
      mode: {
        id: string;
        name: string;
        type: string;
      };
      disruptions: unknown[];
    }>;
    fare?: {
      totalCost: number;
      fares: Array<{
        chargeLevel: string;
        cost: number;
        chargeType: string;
      }>;
    };
  }>;
  lines: Array<{
    id: string;
    name: string;
    modeName: string;
    disruptions: unknown[];
    created: string;
    modified: string;
    lineStatuses: Array<{
      id: number;
      lineId: string;
      statusSeverity: number;
      statusSeverityDescription: string;
      reason?: string;
      created: string;
      modified: string;
    }>;
  }>;
  stopPoints: TFLStopPoint[];
  searchCriteria: {
    dateTime: string;
    dateTimeType: string;
  };
  journeyVector: {
    from: string;
    to: string;
  };
}

interface TFLDisambiguationResult {
  $type: string;
  toLocationDisambiguation?: {
    disambiguationOptions: Array<{
      parameterValue: string;
      place: {
        commonName: string;
        placeType: string;
        lat: number;
        lon: number;
      };
      matchQuality: number;
    }>;
    matchStatus: string;
  };
  fromLocationDisambiguation?: {
    disambiguationOptions: Array<{
      parameterValue: string;
      place: {
        commonName: string;
        placeType: string;
        lat: number;
        lon: number;
      };
      matchQuality: number;
    }>;
    matchStatus: string;
  };
  journeyVector: {
    from: string;
    to: string;
  };
}

interface TFLMode {
  isTflService: boolean;
  isFarePaying: boolean;
  isScheduledService: boolean;
  modeName: string;
}

interface TFLArrivalPrediction {
  id: string;
  operationType: number;
  vehicleId: string;
  naptanId: string;
  stationName: string;
  lineId: string;
  lineName: string;
  platformName: string;
  direction: string;
  bearing?: string;
  destinationNaptanId?: string;
  destinationName: string;
  timestamp: string;
  timeToStation: number;
  currentLocation?: string;
  towards: string;
  expectedArrival: string;
  timeToLive: string;
  modeName: string;
}

interface TFLAirQuality {
  $type: string;
  updatePeriod: string;
  updateFrequency: string;
  forecastURL: string;
  disclaimerText: string;
  currentForecast: Array<{
    $type: string;
    forecastType: string;
    forecastID: string;
    forecastBand: string;
    forecastSummary: string;
    nO2Band: string;
    o3Band: string;
    pM10Band: string;
    pM25Band: string;
    sO2Band: string;
    forecastText: string;
  }>;
}

// Helper function to filter and summarize TfL responses using Orama
async function filterTflResponse<T>(
  data: T[],
  schema: Record<string, 'string' | 'number' | 'boolean'>,
  query?: string,
  limit = 10
): Promise<T[]> {
  if (!data.length) return [];

  try {
    const db = await create({
      schema: schema,
    });

    await insertMultiple(db, data as Record<string, string | number | boolean>[]);

    if (query) {
      const results = await search(db, {
        term: query,
        limit,
        threshold: 0.5,
      });
      return results.hits.map((hit) => hit.document as unknown as T);
    }

    // If no query, return first N items
    return data.slice(0, limit);
  } catch (error) {
    // Fallback to simple truncation if Orama fails
    console.warn('Orama search failed, falling back to simple truncation:', error);
    return data.slice(0, limit);
  }
}

// Filter functions for different TfL data types
async function filterLineStatus(lines: TFLLine[], query?: string): Promise<TFLLine[]> {
  // Extract relevant fields from lineStatuses for indexing
  const flattenedLines = lines.map((line) => ({
    ...line,
    statusSeverity: line.lineStatuses?.[0]?.statusSeverity || 10,
    statusSeverityDescription:
      line.lineStatuses?.[0]?.statusSeverityDescription || 'Good Service',
    reason: line.lineStatuses?.[0]?.reason || '',
  }));

  return filterTflResponse(
    flattenedLines,
    {
      id: 'string',
      name: 'string',
      modeName: 'string',
      statusSeverityDescription: 'string',
      reason: 'string',
    },
    query,
    20
  );
}

async function filterStopPoints(
  stopPoints: TFLStopPoint[],
  query?: string
): Promise<TFLStopPoint[]> {
  // Flatten modes array for better searching
  const flattenedStopPoints = stopPoints.map((stop) => ({
    ...stop,
    modesString: stop.modes?.join(' ') || '',
  }));

  return filterTflResponse(
    flattenedStopPoints,
    {
      id: 'string',
      commonName: 'string',
      modesString: 'string',
      lat: 'number',
      lon: 'number',
    },
    query,
    15
  );
}

async function filterArrivals(
  arrivals: TFLArrivalPrediction[],
  query?: string
): Promise<TFLArrivalPrediction[]> {
  // Sort by arrival time and limit to next few arrivals
  const sortedArrivals = arrivals
    .sort((a, b) => a.timeToStation - b.timeToStation)
    .slice(0, 10);

  return filterTflResponse(
    sortedArrivals,
    {
      id: 'string',
      lineName: 'string',
      platformName: 'string',
      destinationName: 'string',
      towards: 'string',
      timeToStation: 'number',
    },
    query,
    8
  );
}

async function filterJourneyPlan(
  journeyPlan: TFLJourneyPlan | TFLDisambiguationResult
): Promise<
  | TFLJourneyPlan
  | TFLDisambiguationResult
  | {
      error: string;
      message: string;
      originalQuery: { from: string; to: string };
      suggestions: {
        from?: {
          name: string;
          id: string;
          type: string;
          coordinates: string;
          matchQuality: number;
        }[];
        to?: {
          name: string;
          id: string;
          type: string;
          coordinates: string;
          matchQuality: number;
        }[];
      };
      tip: string;
    }
  | {
      journeys: {
        startDateTime: string;
        duration: number;
        arrivalDateTime: string;
        legs: {
          duration: number;
          instruction: { summary: string; detailed: string };
          mode: { id: string; name: string; type: string };
        }[];
        fare?: {
          totalCost: number;
          fares: { chargeLevel: string; cost: number; chargeType: string }[];
        };
      }[];
      journeyVector: { from: string; to: string };
      searchCriteria: { dateTime: string; dateTimeType: string };
    }
> {
  // If it's a disambiguation result, return the top options for each location
  if (
    'toLocationDisambiguation' in journeyPlan ||
    'fromLocationDisambiguation' in journeyPlan
  ) {
    const disambiguation = journeyPlan as TFLDisambiguationResult;

    const fromSuggestions =
      disambiguation.fromLocationDisambiguation?.disambiguationOptions
        ?.slice(0, 3)
        .map((option) => ({
          name: option.place.commonName,
          id: option.parameterValue,
          type: option.place.placeType,
          coordinates: `${option.place.lat}, ${option.place.lon}`,
          matchQuality: option.matchQuality,
        }));

    const toSuggestions = disambiguation.toLocationDisambiguation?.disambiguationOptions
      ?.slice(0, 3)
      .map((option) => ({
        name: option.place.commonName,
        id: option.parameterValue,
        type: option.place.placeType,
        coordinates: `${option.place.lat}, ${option.place.lon}`,
        matchQuality: option.matchQuality,
      }));

    return {
      error: 'Location ambiguous',
      message:
        'Multiple locations found. Please use one of the suggested location names or IDs below:',
      originalQuery: {
        from: disambiguation.journeyVector.from,
        to: disambiguation.journeyVector.to,
      },
      suggestions: {
        from: fromSuggestions,
        to: toSuggestions,
      },
      tip: 'Try using the full station name (e.g., "Waterloo Underground Station") or the ID from suggestions above.',
    };
  }

  // Handle regular journey plan results
  const plan = journeyPlan as TFLJourneyPlan;
  const filteredJourneys = plan.journeys
    .sort((a, b) => a.duration - b.duration)
    .slice(0, 3)
    .map((journey) => ({
      startDateTime: journey.startDateTime,
      duration: journey.duration,
      arrivalDateTime: journey.arrivalDateTime,
      legs: journey.legs.map((leg) => ({
        duration: leg.duration,
        instruction: leg.instruction,
        mode: leg.mode,
      })),
      fare: journey.fare,
    }));

  return {
    journeys: filteredJourneys,
    journeyVector: plan.journeyVector,
    searchCriteria: plan.searchCriteria,
  };
}

class TFLClient {
  private headers: { Accept: string; app_key?: string };
  private baseUrl = 'https://api.tfl.gov.uk';

  constructor(appKey?: string) {
    this.headers = {
      Accept: 'application/json',
    };
    if (appKey) {
      this.headers.app_key = appKey;
    }
  }

  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    return url.toString();
  }

  async getLines(): Promise<TFLLine[]> {
    const response = await fetch(
      this.buildUrl('/Line/Mode/tube,bus,dlr,overground,tflrail'),
      {
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(`TFL API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<TFLLine[]>;
  }

  async getLineStatus(lineIds: string[]): Promise<TFLLine[]> {
    const response = await fetch(this.buildUrl(`/Line/${lineIds.join(',')}/Status`), {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`TFL API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<TFLLine[]>;
  }

  async getStopPointsByMode(mode: string): Promise<TFLStopPoint[]> {
    const response = await fetch(this.buildUrl(`/StopPoint/Mode/${mode}`), {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`TFL API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<TFLStopPoint[]>;
  }

  async getStopPoint(id: string): Promise<TFLStopPoint> {
    const response = await fetch(this.buildUrl(`/StopPoint/${id}`), {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`TFL API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<TFLStopPoint>;
  }

  async searchStopPoints(query: string): Promise<TFLStopPoint[]> {
    const response = await fetch(this.buildUrl('/StopPoint/Search', { query }), {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`TFL API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { matches: TFLStopPoint[] };
    return result.matches;
  }

  async planJourney(
    from: string,
    to: string,
    options?: {
      date?: string;
      time?: string;
      timeIs?: 'Departing' | 'Arriving';
      journeyPreference?: 'LeastInterchange' | 'LeastTime' | 'LeastWalking';
      mode?: string[];
      accessibilityPreference?: string[];
    }
  ): Promise<TFLJourneyPlan | TFLDisambiguationResult> {
    const params: Record<string, string> = {};

    if (options?.date) params.date = options.date;
    if (options?.time) params.time = options.time;
    if (options?.timeIs) params.timeIs = options.timeIs;
    if (options?.journeyPreference) params.journeyPreference = options.journeyPreference;
    if (options?.mode) params.mode = options.mode.join(',');
    if (options?.accessibilityPreference) {
      params.accessibilityPreference = options.accessibilityPreference.join(',');
    }

    const response = await fetch(
      this.buildUrl(
        `/Journey/JourneyResults/${encodeURIComponent(from)}/to/${encodeURIComponent(to)}`,
        params
      ),
      { headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`TFL API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as TFLJourneyPlan | TFLDisambiguationResult;

    // If we get a disambiguation result, try to automatically resolve it using the best matches
    if (result.$type?.includes('DisambiguationResult')) {
      const disambiguation = result as TFLDisambiguationResult;

      // Get the best matching station IDs for from and to locations
      const fromId =
        disambiguation.fromLocationDisambiguation?.disambiguationOptions?.[0]
          ?.parameterValue || from;
      const toId =
        disambiguation.toLocationDisambiguation?.disambiguationOptions?.[0]
          ?.parameterValue || to;

      // Only retry if we have at least one resolved ID that's different from the original
      if ((fromId !== from || toId !== to) && fromId && toId) {
        try {
          // Retry with the specific station IDs
          const retryResponse = await fetch(
            this.buildUrl(
              `/Journey/JourneyResults/${encodeURIComponent(fromId)}/to/${encodeURIComponent(toId)}`,
              params
            ),
            { headers: this.headers }
          );

          if (retryResponse.ok) {
            const retryResult = (await retryResponse.json()) as
              | TFLJourneyPlan
              | TFLDisambiguationResult;
            if (
              retryResult.$type?.includes('ItineraryResult') ||
              'journeys' in retryResult
            ) {
              return retryResult as TFLJourneyPlan;
            }
          }
        } catch (retryError) {
          // If retry fails, continue to return disambiguation result
          console.warn('Auto-resolution retry failed:', retryError);
        }
      }

      // If auto-resolution fails or isn't applicable, return the disambiguation result
      return disambiguation;
    }

    return result as TFLJourneyPlan;
  }

  async getModes(): Promise<TFLMode[]> {
    const response = await fetch(this.buildUrl('/Mode'), {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`TFL API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<TFLMode[]>;
  }

  async getArrivals(stopPointId: string): Promise<TFLArrivalPrediction[]> {
    const response = await fetch(this.buildUrl(`/StopPoint/${stopPointId}/Arrivals`), {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`TFL API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<TFLArrivalPrediction[]>;
  }

  async getLineArrivals(
    lineId: string,
    stopPointId: string
  ): Promise<TFLArrivalPrediction[]> {
    const response = await fetch(
      this.buildUrl(`/Line/${lineId}/Arrivals/${stopPointId}`),
      { headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`TFL API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<TFLArrivalPrediction[]>;
  }

  async getAirQuality(): Promise<TFLAirQuality> {
    const response = await fetch(this.buildUrl('/AirQuality'), {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`TFL API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<TFLAirQuality>;
  }
}

export const TFLConnectorConfig = mcpConnectorConfig({
  name: 'TFL (Transport for London)',
  key: 'tfl',
  version: '1.0.0',
  logo: 'https://upload.wikimedia.org/wikipedia/commons/4/41/TfL_Roundel.svg',
  credentials: z.object({
    appKey: z
      .string()
      .optional()
      .describe(
        'TFL API Application Key (optional but recommended) :: your-app-key :: https://api-portal.tfl.gov.uk/'
      ),
  }),
  setup: z.object({}),
  description:
    'Transport for London (TfL) provides comprehensive public transport data for London including tube, bus, DLR, overground, and more. This connector allows you to access journey planning, live arrivals, line status, stop information, and service disruptions.',
  examplePrompt:
    "Plan a journey from King's Cross to Heathrow Airport, check the current status of the Piccadilly line, find the nearest tube stations to my location, and get live arrival times for bus stops near me.",
  tools: (tool) => ({
    GET_LINES: tool({
      name: 'tfl_get_lines',
      description: 'Get all lines for tube, bus, DLR, overground, and TfL Rail',
      schema: z.object({}),
      handler: async (_, context) => {
        try {
          const { appKey } = await context.getCredentials();
          const client = new TFLClient(appKey);
          const lines = await client.getLines();
          const filtered = await filterLineStatus(lines);
          return JSON.stringify(filtered, null, 2);
        } catch (error) {
          return `Failed to get lines: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_LINE_STATUS: tool({
      name: 'tfl_get_line_status',
      description: 'Get the current service status for specific transport lines',
      schema: z.object({
        lineIds: z
          .array(z.string())
          .describe('Array of line IDs (e.g., ["piccadilly", "central", "northern"])'),
      }),
      handler: async (args, context) => {
        try {
          const { appKey } = await context.getCredentials();
          const client = new TFLClient(appKey);
          const status = await client.getLineStatus(args.lineIds);
          const filtered = await filterLineStatus(status);
          return JSON.stringify(filtered, null, 2);
        } catch (error) {
          return `Failed to get line status: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_STOP_POINTS_BY_MODE: tool({
      name: 'tfl_get_stop_points_by_mode',
      description: 'Get all stop points for a specific transport mode',
      schema: z.object({
        mode: z
          .string()
          .describe(
            'Transport mode (e.g., "tube", "bus", "dlr", "overground", "tflrail")'
          ),
      }),
      handler: async (args, context) => {
        try {
          const { appKey } = await context.getCredentials();
          const client = new TFLClient(appKey);
          const stopPoints = await client.getStopPointsByMode(args.mode);
          const filtered = await filterStopPoints(stopPoints);
          return JSON.stringify(filtered, null, 2);
        } catch (error) {
          return `Failed to get stop points: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_STOP_POINT: tool({
      name: 'tfl_get_stop_point',
      description: 'Get detailed information about a specific stop point',
      schema: z.object({
        id: z.string().describe('Stop point ID or NaPTAN ID'),
      }),
      handler: async (args, context) => {
        try {
          const { appKey } = await context.getCredentials();
          const client = new TFLClient(appKey);
          const stopPoint = await client.getStopPoint(args.id);
          return JSON.stringify(stopPoint, null, 2);
        } catch (error) {
          return `Failed to get stop point: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    SEARCH_STOP_POINTS: tool({
      name: 'tfl_search_stop_points',
      description: 'Search for stop points by name or location',
      schema: z.object({
        query: z.string().describe('Search query (station/stop name or area)'),
      }),
      handler: async (args, context) => {
        try {
          const { appKey } = await context.getCredentials();
          const client = new TFLClient(appKey);
          const results = await client.searchStopPoints(args.query);
          const filtered = await filterStopPoints(results, args.query);
          return JSON.stringify(filtered, null, 2);
        } catch (error) {
          return `Failed to search stop points: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    PLAN_JOURNEY: tool({
      name: 'tfl_plan_journey',
      description: 'Plan a journey between two locations using TfL transport network',
      schema: z.object({
        from: z
          .string()
          .describe('Starting location (postcode, station name, or coordinates)'),
        to: z
          .string()
          .describe('Destination location (postcode, station name, or coordinates)'),
        date: z
          .string()
          .optional()
          .describe('Journey date in YYYYMMDD format (defaults to today)'),
        time: z
          .string()
          .optional()
          .describe('Journey time in HHMM format (defaults to now)'),
        timeIs: z
          .enum(['Departing', 'Arriving'])
          .optional()
          .describe('Whether time is departure or arrival time'),
        journeyPreference: z
          .enum(['LeastInterchange', 'LeastTime', 'LeastWalking'])
          .optional()
          .describe('Journey optimization preference'),
        mode: z
          .array(z.string())
          .optional()
          .describe('Transport modes to include (e.g., ["tube", "bus", "walking"])'),
        accessibilityPreference: z
          .array(z.string())
          .optional()
          .describe('Accessibility requirements'),
      }),
      handler: async (args, context) => {
        try {
          const { appKey } = await context.getCredentials();
          const client = new TFLClient(appKey);
          const { from, to, ...options } = args;
          const journey = await client.planJourney(from, to, options);
          const filtered = await filterJourneyPlan(journey);
          return JSON.stringify(filtered, null, 2);
        } catch (error) {
          return `Failed to plan journey: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_MODES: tool({
      name: 'tfl_get_modes',
      description: 'Get all available transport modes',
      schema: z.object({}),
      handler: async (_, context) => {
        try {
          const { appKey } = await context.getCredentials();
          const client = new TFLClient(appKey);
          const modes = await client.getModes();
          return JSON.stringify(modes, null, 2);
        } catch (error) {
          return `Failed to get modes: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_ARRIVALS: tool({
      name: 'tfl_get_arrivals',
      description: 'Get live arrival predictions for a specific stop point',
      schema: z.object({
        stopPointId: z.string().describe('Stop point ID to get arrivals for'),
      }),
      handler: async (args, context) => {
        try {
          const { appKey } = await context.getCredentials();
          const client = new TFLClient(appKey);
          const arrivals = await client.getArrivals(args.stopPointId);
          const filtered = await filterArrivals(arrivals);
          return JSON.stringify(filtered, null, 2);
        } catch (error) {
          return `Failed to get arrivals: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_LINE_ARRIVALS: tool({
      name: 'tfl_get_line_arrivals',
      description: 'Get live arrival predictions for a specific line at a stop point',
      schema: z.object({
        lineId: z.string().describe('Line ID (e.g., "piccadilly", "central")'),
        stopPointId: z.string().describe('Stop point ID'),
      }),
      handler: async (args, context) => {
        try {
          const { appKey } = await context.getCredentials();
          const client = new TFLClient(appKey);
          const arrivals = await client.getLineArrivals(args.lineId, args.stopPointId);
          const filtered = await filterArrivals(arrivals);
          return JSON.stringify(filtered, null, 2);
        } catch (error) {
          return `Failed to get line arrivals: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_AIR_QUALITY: tool({
      name: 'tfl_get_air_quality',
      description: 'Get current air quality forecast and information for London',
      schema: z.object({}),
      handler: async (_, context) => {
        try {
          const { appKey } = await context.getCredentials();
          const client = new TFLClient(appKey);
          const airQuality = await client.getAirQuality();
          return JSON.stringify(airQuality, null, 2);
        } catch (error) {
          return `Failed to get air quality: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

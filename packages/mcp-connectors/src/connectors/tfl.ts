import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ConnectorMetadata } from '../types/metadata';
import { type AnySearchableObject, createIndex, search } from '../utils/lexical-search';

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

interface TFLAccidentDetail {
  id: number;
  latitude: number;
  longitude: number;
  location: string;
  date: string;
  severity: string;
  borough: string;
  casualties: number;
  vehicles: number;
}

interface TFLBikePoint {
  id: string;
  url: string;
  commonName: string;
  placeType: string;
  lat: number;
  lon: number;
  additionalProperties: Array<{
    category: string;
    key: string;
    sourceSystemKey: string;
    value: string;
    modified: string;
  }>;
  children: unknown[];
  childrenUrls: unknown[];
}

interface TFLPlace {
  id: string;
  url: string;
  commonName: string;
  placeType: string;
  lat: number;
  lon: number;
  additionalProperties: Array<{
    category: string;
    key: string;
    sourceSystemKey: string;
    value: string;
    modified: string;
  }>;
  children?: TFLPlace[];
  childrenUrls?: string[];
}

interface TFLPlaceCategory {
  category: string;
  availableKeys: string[];
}

interface TFLPlaceType {
  type: string;
}

// Helper function to search and filter TfL responses
async function searchTflData<T>(
  data: T[],
  query?: string,
  options: {
    fields?: string[];
    maxResults?: number;
    boost?: Record<string, number>;
  } = {}
): Promise<T[]> {
  if (!data.length) return [];

  try {
    const { fields, maxResults = 50, boost } = options;

    if (!query || query.trim() === '') {
      return data.slice(0, maxResults);
    }

    const index = await createIndex(data as AnySearchableObject[], {
      fields,
      maxResults,
      boost,
      threshold: 0.3,
    });

    const results = await search(index, query);
    return results.map((result) => result.item) as T[];
  } catch (error) {
    console.warn('Search failed, falling back to simple truncation:', error);
    return data.slice(0, options.maxResults || 50);
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

  return searchTflData(flattenedLines, query, {
    fields: ['id', 'name', 'modeName', 'statusSeverityDescription', 'reason'],
    maxResults: 20,
    boost: {
      name: 2.0,
      statusSeverityDescription: 1.5,
      reason: 1.2,
    },
  });
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

  return searchTflData(flattenedStopPoints, query, {
    fields: ['id', 'commonName', 'modesString'],
    maxResults: 15,
    boost: {
      commonName: 2.0,
      modesString: 1.3,
    },
  });
}

async function filterArrivals(
  arrivals: TFLArrivalPrediction[],
  query?: string
): Promise<TFLArrivalPrediction[]> {
  // Sort by arrival time and limit to next few arrivals
  const sortedArrivals = arrivals
    .sort((a, b) => a.timeToStation - b.timeToStation)
    .slice(0, 10);

  return searchTflData(sortedArrivals, query, {
    fields: ['lineName', 'platformName', 'destinationName', 'towards'],
    maxResults: 8,
    boost: {
      lineName: 2.0,
      destinationName: 1.8,
      towards: 1.5,
      platformName: 1.2,
    },
  });
}

async function filterAccidentStats(
  accidents: TFLAccidentDetail[],
  query?: string
): Promise<TFLAccidentDetail[]> {
  return searchTflData(accidents, query, {
    fields: ['location', 'severity', 'borough'],
    maxResults: 50,
    boost: {
      location: 2.0,
      severity: 1.5,
      borough: 1.3,
    },
  });
}

async function filterBikePoints(
  bikePoints: TFLBikePoint[],
  query?: string
): Promise<TFLBikePoint[]> {
  return searchTflData(bikePoints, query, {
    fields: ['id', 'commonName', 'placeType'],
    maxResults: 30,
    boost: {
      commonName: 2.0,
      id: 1.3,
    },
  });
}

async function filterPlaces(places: TFLPlace[], query?: string): Promise<TFLPlace[]> {
  return searchTflData(places, query, {
    fields: ['id', 'commonName', 'placeType'],
    maxResults: 50,
    boost: {
      commonName: 2.0,
      placeType: 1.5,
      id: 1.2,
    },
  });
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

  async getAccidentStats(year: number): Promise<TFLAccidentDetail[]> {
    const response = await fetch(this.buildUrl(`/AccidentStats/${year}`), {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`TFL API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<TFLAccidentDetail[]>;
  }

  async getBikePoints(): Promise<TFLBikePoint[]> {
    const response = await fetch(this.buildUrl('/BikePoint'), {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`TFL API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<TFLBikePoint[]>;
  }

  async getBikePoint(id: string): Promise<TFLBikePoint> {
    const response = await fetch(this.buildUrl(`/BikePoint/${id}`), {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`TFL API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<TFLBikePoint>;
  }

  async searchBikePoints(query: string): Promise<TFLBikePoint[]> {
    const response = await fetch(this.buildUrl('/BikePoint/Search', { query }), {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`TFL API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<TFLBikePoint[]>;
  }

  async getPlaceCategories(): Promise<TFLPlaceCategory[]> {
    const response = await fetch(this.buildUrl('/Place/Meta/Categories'), {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`TFL API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<TFLPlaceCategory[]>;
  }

  async getPlaceTypes(): Promise<TFLPlaceType[]> {
    const response = await fetch(this.buildUrl('/Place/Meta/PlaceTypes'), {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`TFL API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<TFLPlaceType[]>;
  }

  async getPlace(id: string, includeChildren = false): Promise<TFLPlace> {
    const params: Record<string, string> = {};
    if (includeChildren) {
      params.includeChildren = 'true';
    }

    const response = await fetch(this.buildUrl(`/Place/${id}`, params), {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`TFL API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<TFLPlace>;
  }

  async searchPlaces(name: string, types?: string[]): Promise<TFLPlace[]> {
    const params: Record<string, string> = { name };
    if (types && types.length > 0) {
      params.types = types.join(',');
    }

    const response = await fetch(this.buildUrl('/Place/Search', params), {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`TFL API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<TFLPlace[]>;
  }

  async getPlacesByType(types: string[], activeOnly = false): Promise<TFLPlace[]> {
    const params: Record<string, string> = {};
    if (activeOnly) {
      params.activeOnly = 'true';
    }

    const response = await fetch(
      this.buildUrl(`/Place/Type/${types.join(',')}`, params),
      {
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(`TFL API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<TFLPlace[]>;
  }

  async getPlacesAt(type: string, lat: number, lon: number): Promise<TFLPlace[]> {
    const response = await fetch(this.buildUrl(`/Place/${type}/At/${lat}/${lon}`), {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`TFL API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<TFLPlace[]>;
  }
}

export interface TFLCredentials {
  appKey?: string;
}

export const TFLCredentialsSchema = z.object({
  appKey: z.string().describe('Application key').optional(),
});

export const TflConnectorMetadata = {
  key: 'tfl',
  name: 'TfL',
  description: 'Transport for London',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/tfl/filled/svg',
  examplePrompt: 'Check London transport status',
  categories: ['transport', 'travel'],
  credentialsSchema: TFLCredentialsSchema,
} as const satisfies ConnectorMetadata;

export function createTFLServer(credentials: TFLCredentials): McpServer {
  const server = new McpServer({
    name: 'TFL (Transport for London)',
    version: '1.0.0',
  });

  server.tool(
    'tfl_get_lines',
    'Get all lines for tube, bus, DLR, overground, and TfL Rail',
    {},
    async () => {
      try {
        const client = new TFLClient(credentials.appKey);
        const lines = await client.getLines();
        const filtered = await filterLineStatus(lines);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(filtered, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get lines: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'tfl_get_line_status',
    'Get the current service status for specific transport lines',
    {
      lineIds: z
        .array(z.string())
        .describe('Array of line IDs (e.g., ["piccadilly", "central", "northern"])'),
    },
    async (args) => {
      try {
        const client = new TFLClient(credentials.appKey);
        const status = await client.getLineStatus(args.lineIds);
        const filtered = await filterLineStatus(status);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(filtered, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get line status: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'tfl_get_stop_points_by_mode',
    'Get all stop points for a specific transport mode',
    {
      mode: z
        .string()
        .describe('Transport mode (e.g., "tube", "bus", "dlr", "overground", "tflrail")'),
    },
    async (args) => {
      try {
        const client = new TFLClient(credentials.appKey);
        const stopPoints = await client.getStopPointsByMode(args.mode);
        const filtered = await filterStopPoints(stopPoints);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(filtered, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get stop points: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'tfl_get_stop_point',
    'Get detailed information about a specific stop point',
    {
      id: z.string().describe('Stop point ID or NaPTAN ID'),
    },
    async (args) => {
      try {
        const client = new TFLClient(credentials.appKey);
        const stopPoint = await client.getStopPoint(args.id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(stopPoint, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get stop point: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'tfl_search_stop_points',
    'Search for stop points by name or location',
    {
      query: z.string().describe('Search query (station/stop name or area)'),
    },
    async (args) => {
      try {
        const client = new TFLClient(credentials.appKey);
        const results = await client.searchStopPoints(args.query);
        const filtered = await filterStopPoints(results, args.query);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(filtered, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to search stop points: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'tfl_plan_journey',
    'Plan a journey between two locations using TfL transport network',
    {
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
    },
    async (args) => {
      try {
        const client = new TFLClient(credentials.appKey);
        const { from, to, ...options } = args;
        const journey = await client.planJourney(from, to, options);
        const filtered = await filterJourneyPlan(journey);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(filtered, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to plan journey: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool('tfl_get_modes', 'Get all available transport modes', {}, async () => {
    try {
      const client = new TFLClient(credentials.appKey);
      const modes = await client.getModes();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(modes, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to get modes: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  });

  server.tool(
    'tfl_get_arrivals',
    'Get live arrival predictions for a specific stop point',
    {
      stopPointId: z.string().describe('Stop point ID to get arrivals for'),
    },
    async (args) => {
      try {
        const client = new TFLClient(credentials.appKey);
        const arrivals = await client.getArrivals(args.stopPointId);
        const filtered = await filterArrivals(arrivals);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(filtered, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get arrivals: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'tfl_get_line_arrivals',
    'Get live arrival predictions for a specific line at a stop point',
    {
      lineId: z.string().describe('Line ID (e.g., "piccadilly", "central")'),
      stopPointId: z.string().describe('Stop point ID'),
    },
    async (args) => {
      try {
        const client = new TFLClient(credentials.appKey);
        const arrivals = await client.getLineArrivals(args.lineId, args.stopPointId);
        const filtered = await filterArrivals(arrivals);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(filtered, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get line arrivals: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'tfl_get_air_quality',
    'Get current air quality forecast and information for London',
    {},
    async () => {
      try {
        const client = new TFLClient(credentials.appKey);
        const airQuality = await client.getAirQuality();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(airQuality, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get air quality: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'tfl_get_accident_stats',
    'Get accident statistics for a specific year in London',
    {
      year: z.number().describe('Year to get accident statistics for (e.g., 2023)'),
    },
    async (args) => {
      try {
        const client = new TFLClient(credentials.appKey);
        const accidents = await client.getAccidentStats(args.year);
        const filtered = await filterAccidentStats(accidents);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(filtered, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get accident stats: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'tfl_get_bike_points',
    'Get all bike point locations (cycle hire stations) in London',
    {},
    async () => {
      try {
        const client = new TFLClient(credentials.appKey);
        const bikePoints = await client.getBikePoints();
        const filtered = await filterBikePoints(bikePoints);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(filtered, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get bike points: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'tfl_get_bike_point',
    'Get detailed information about a specific bike point (cycle hire station)',
    {
      id: z.string().describe('Bike point ID (e.g., "BikePoints_1")'),
    },
    async (args) => {
      try {
        const client = new TFLClient(credentials.appKey);
        const bikePoint = await client.getBikePoint(args.id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(bikePoint, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get bike point: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'tfl_search_bike_points',
    'Search for bike points (cycle hire stations) by name or location',
    {
      query: z
        .string()
        .describe('Search query (station name or area, e.g., "Hyde Park")'),
    },
    async (args) => {
      try {
        const client = new TFLClient(credentials.appKey);
        const results = await client.searchBikePoints(args.query);
        const filtered = await filterBikePoints(results, args.query);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(filtered, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to search bike points: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'tfl_get_place_categories',
    'Get all available place property categories and keys',
    {},
    async () => {
      try {
        const client = new TFLClient(credentials.appKey);
        const categories = await client.getPlaceCategories();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(categories, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get place categories: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool('tfl_get_place_types', 'Get all available place types', {}, async () => {
    try {
      const client = new TFLClient(credentials.appKey);
      const types = await client.getPlaceTypes();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(types, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to get place types: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  });

  server.tool(
    'tfl_get_place',
    'Get detailed information about a specific place',
    {
      id: z.string().describe('Place ID'),
      includeChildren: z
        .boolean()
        .optional()
        .describe('Include child places in response'),
    },
    async (args) => {
      try {
        const client = new TFLClient(credentials.appKey);
        const place = await client.getPlace(args.id, args.includeChildren);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(place, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get place: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'tfl_search_places',
    'Search for places by name, optionally filtered by place types',
    {
      name: z.string().describe('Place name to search for'),
      types: z
        .array(z.string())
        .optional()
        .describe('Place types to filter by (e.g., ["StopPoint", "BikePoint"])'),
    },
    async (args) => {
      try {
        const client = new TFLClient(credentials.appKey);
        const results = await client.searchPlaces(args.name, args.types);
        const filtered = await filterPlaces(results, args.name);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(filtered, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to search places: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'tfl_get_places_by_type',
    'Get places of specific type(s)',
    {
      types: z
        .array(z.string())
        .describe('Place types to retrieve (e.g., ["StopPoint", "BikePoint"])'),
      activeOnly: z.boolean().optional().describe('Only return active places'),
    },
    async (args) => {
      try {
        const client = new TFLClient(credentials.appKey);
        const places = await client.getPlacesByType(args.types, args.activeOnly);
        const filtered = await filterPlaces(places);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(filtered, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get places by type: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'tfl_get_places_at_location',
    'Find places of a specific type at geographic coordinates',
    {
      type: z.string().describe('Place type to search for'),
      lat: z.number().describe('Latitude coordinate'),
      lon: z.number().describe('Longitude coordinate'),
    },
    async (args) => {
      try {
        const client = new TFLClient(credentials.appKey);
        const places = await client.getPlacesAt(args.type, args.lat, args.lon);
        const filtered = await filterPlaces(places);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(filtered, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get places at location: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  return server;
}

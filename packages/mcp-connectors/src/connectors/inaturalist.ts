import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

// iNaturalist API interfaces for type safety
interface iNaturalistObservation {
  id: number;
  species_guess: string;
  taxon?: {
    id: number;
    name: string;
    preferred_common_name?: string;
    rank: string;
    conservation_status?: {
      status: string;
      authority: string;
    };
  };
  user: {
    id: number;
    login: string;
    name?: string;
  };
  place?: {
    id: number;
    name: string;
    display_name: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    positional_accuracy?: number;
  };
  observed_on: string;
  quality_grade: 'research' | 'needs_id' | 'casual';
  identifications_count: number;
  comments_count: number;
  photos: Array<{
    id: number;
    url: string;
    attribution: string;
  }>;
  sounds: Array<{
    id: number;
    file_url: string;
  }>;
  uri: string;
  description?: string;
}

interface iNaturalistTaxon {
  id: number;
  name: string;
  preferred_common_name?: string;
  rank: string;
  ancestry?: string;
  is_active: boolean;
  threatened?: boolean;
  endemic?: boolean;
  introduced?: boolean;
  native?: boolean;
  conservation_status?: {
    status: string;
    authority: string;
    iucn: number;
  };
  conservation_statuses: Array<{
    status: string;
    authority: string;
    place?: {
      id: number;
      name: string;
    };
  }>;
  wikipedia_url?: string;
  default_photo?: {
    id: number;
    url: string;
    attribution: string;
  };
  observations_count: number;
  listed_taxa_count: number;
}

interface iNaturalistProject {
  id: number;
  title: string;
  description: string;
  project_type: string;
  admins: Array<{
    user: {
      id: number;
      login: string;
      name?: string;
    };
  }>;
  user_ids: number[];
  place_id?: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  terms?: string;
  prefers_user_trust?: boolean;
  project_observation_rules: Array<{
    operand_type: string;
    operand_id?: number;
    operator: string;
  }>;
  observations_count: number;
  species_count: number;
  identifiers_count: number;
  observers_count: number;
  created_at: string;
  updated_at: string;
  icon?: string;
  banner_color?: string;
  header_image_url?: string;
}

interface iNaturalistPlace {
  id: number;
  name: string;
  display_name: string;
  admin_level?: number;
  ancestry?: string;
  bbox_area?: number;
  place_type: number;
  geometry_geojson?: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
  location?: {
    latitude: number;
    longitude: number;
  };
}

interface iNaturalistUser {
  id: number;
  login: string;
  name?: string;
  icon?: string;
  observations_count: number;
  identifications_count: number;
  journal_posts_count: number;
  activity_count: number;
  species_count: number;
  universal_search_rank: number;
  roles: string[];
  site_id: number;
  created_at: string;
  updated_at: string;
}

interface iNaturalistSpeciesCount {
  count: number;
  taxon: iNaturalistTaxon;
}

class iNaturalistClient {
  private headers: { Accept: string; 'User-Agent': string; Authorization?: string };
  private baseUrl = 'https://api.inaturalist.org/v1';

  constructor(apiToken?: string) {
    this.headers = {
      Accept: 'application/json',
      'User-Agent': 'MCP-iNaturalist-Connector/1.0.0',
    };
    if (apiToken) {
      this.headers.Authorization = `Bearer ${apiToken}`;
    }
  }

  async getObservations(params: {
    taxon_id?: number;
    user_id?: string;
    user_login?: string;
    place_id?: number;
    lat?: number;
    lng?: number;
    radius?: number;
    d1?: string; // date from (YYYY-MM-DD)
    d2?: string; // date to (YYYY-MM-DD)
    quality_grade?: 'research' | 'needs_id' | 'casual';
    iconic_taxa?: string;
    threatened?: boolean;
    endemic?: boolean;
    introduced?: boolean;
    native?: boolean;
    order_by?: 'observed_on' | 'created_at' | 'votes' | 'id';
    order?: 'desc' | 'asc';
    per_page?: number;
    page?: number;
  }): Promise<{ results: iNaturalistObservation[]; total_results: number }> {
    const url = new URL(`${this.baseUrl}/observations`);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    }

    const response = await fetch(url.toString(), { headers: this.headers });

    if (!response.ok) {
      throw new Error(`iNaturalist API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<{
      results: iNaturalistObservation[];
      total_results: number;
    }>;
  }

  async getObservation(id: number): Promise<{ results: iNaturalistObservation[] }> {
    const response = await fetch(`${this.baseUrl}/observations/${id}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`iNaturalist API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<{ results: iNaturalistObservation[] }>;
  }

  async getSpeciesCounts(params: {
    taxon_id?: number;
    user_id?: string;
    place_id?: number;
    lat?: number;
    lng?: number;
    radius?: number;
    d1?: string;
    d2?: string;
    quality_grade?: 'research' | 'needs_id' | 'casual';
    rank?: 'species' | 'genus' | 'family' | 'order' | 'class' | 'phylum' | 'kingdom';
    per_page?: number;
  }): Promise<{ results: iNaturalistSpeciesCount[]; total_results: number }> {
    const url = new URL(`${this.baseUrl}/observations/species_counts`);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    }

    const response = await fetch(url.toString(), { headers: this.headers });

    if (!response.ok) {
      throw new Error(`iNaturalist API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<{
      results: iNaturalistSpeciesCount[];
      total_results: number;
    }>;
  }

  async searchTaxa(params: {
    q?: string;
    is_active?: boolean;
    taxon_id?: number;
    rank?: string;
    rank_level?: number;
    per_page?: number;
    all_names?: boolean;
  }): Promise<{ results: iNaturalistTaxon[]; total_results: number }> {
    const url = new URL(`${this.baseUrl}/taxa`);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    }

    const response = await fetch(url.toString(), { headers: this.headers });

    if (!response.ok) {
      throw new Error(`iNaturalist API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<{
      results: iNaturalistTaxon[];
      total_results: number;
    }>;
  }

  async getTaxon(id: number): Promise<{ results: iNaturalistTaxon[] }> {
    const response = await fetch(`${this.baseUrl}/taxa/${id}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`iNaturalist API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<{ results: iNaturalistTaxon[] }>;
  }

  async getProjects(params: {
    q?: string;
    lat?: number;
    lng?: number;
    radius?: number;
    featured?: boolean;
    noteworthy?: boolean;
    place_id?: number;
    user_id?: string;
    type?: 'collection' | 'umbrella' | 'assessment';
    member_id?: number;
    per_page?: number;
  }): Promise<{ results: iNaturalistProject[]; total_results: number }> {
    const url = new URL(`${this.baseUrl}/projects`);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    }

    const response = await fetch(url.toString(), { headers: this.headers });

    if (!response.ok) {
      throw new Error(`iNaturalist API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<{
      results: iNaturalistProject[];
      total_results: number;
    }>;
  }

  async getProject(id: number): Promise<{ results: iNaturalistProject[] }> {
    const response = await fetch(`${this.baseUrl}/projects/${id}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`iNaturalist API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<{ results: iNaturalistProject[] }>;
  }

  async searchPlaces(params: {
    q?: string;
    lat?: number;
    lng?: number;
    swlat?: number;
    swlng?: number;
    nelat?: number;
    nelng?: number;
    per_page?: number;
  }): Promise<{ results: iNaturalistPlace[]; total_results: number }> {
    const url = new URL(`${this.baseUrl}/places`);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    }

    const response = await fetch(url.toString(), { headers: this.headers });

    if (!response.ok) {
      throw new Error(`iNaturalist API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<{
      results: iNaturalistPlace[];
      total_results: number;
    }>;
  }

  async getPlace(id: number): Promise<{ results: iNaturalistPlace[] }> {
    const response = await fetch(`${this.baseUrl}/places/${id}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`iNaturalist API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<{ results: iNaturalistPlace[] }>;
  }

  async getUser(id: string): Promise<{ results: iNaturalistUser[] }> {
    const response = await fetch(`${this.baseUrl}/users/${id}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`iNaturalist API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<{ results: iNaturalistUser[] }>;
  }

  async getCurrentUser(): Promise<iNaturalistUser> {
    const response = await fetch(`${this.baseUrl}/users/me`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`iNaturalist API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<iNaturalistUser>;
  }

  async createObservation(observation: {
    species_guess?: string;
    taxon_id?: number;
    observed_on_string?: string;
    time_zone?: string;
    description?: string;
    latitude?: number;
    longitude?: number;
    positional_accuracy?: number;
    geoprivacy?: 'open' | 'obscured' | 'private';
    place_id?: number;
  }): Promise<iNaturalistObservation> {
    const response = await fetch(`${this.baseUrl}/observations`, {
      method: 'POST',
      headers: { ...this.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ observation }),
    });

    if (!response.ok) {
      throw new Error(`iNaturalist API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<iNaturalistObservation>;
  }
}

export const iNaturalistConnectorConfig = mcpConnectorConfig({
  name: 'iNaturalist',
  key: 'inaturalist',
  version: '1.0.0',
  logo: 'https://static.inaturalist.org/sites/1-logo.png',
  description:
    'Access iNaturalist citizen science data for biodiversity research and conservation',
  credentials: z.object({
    apiToken: z
      .string()
      .optional()
      .describe(
        'iNaturalist API JWT Token (optional, get from https://www.inaturalist.org/users/api_token)'
      ),
  }),
  setup: z.object({}),
  examplePrompt:
    'Find recent research-grade bird observations in Yellowstone National Park, get species counts for endangered taxa in California, and search for projects focused on butterfly conservation.',
  tools: (tool) => ({
    GET_OBSERVATIONS: tool({
      name: 'inaturalist_get_observations',
      description:
        'Search and filter observations with extensive parameters for biodiversity research',
      schema: z.object({
        taxon_id: z
          .number()
          .optional()
          .describe('Filter by taxon ID (includes descendants)'),
        user_login: z.string().optional().describe('Filter by observer username'),
        place_id: z.number().optional().describe('Filter by place ID'),
        lat: z.number().optional().describe('Latitude for geographic search'),
        lng: z.number().optional().describe('Longitude for geographic search'),
        radius: z.number().optional().describe('Search radius in kilometers (max 50)'),
        d1: z.string().optional().describe('Start date (YYYY-MM-DD)'),
        d2: z.string().optional().describe('End date (YYYY-MM-DD)'),
        quality_grade: z
          .enum(['research', 'needs_id', 'casual'])
          .optional()
          .describe('Quality grade filter'),
        iconic_taxa: z
          .string()
          .optional()
          .describe('Iconic taxon name (e.g., "Aves", "Mammalia")'),
        threatened: z.boolean().optional().describe('Filter for threatened species'),
        endemic: z.boolean().optional().describe('Filter for endemic species'),
        introduced: z.boolean().optional().describe('Filter for introduced species'),
        native: z.boolean().optional().describe('Filter for native species'),
        order_by: z
          .enum(['observed_on', 'created_at', 'votes', 'id'])
          .default('observed_on')
          .describe('Sort order'),
        order: z.enum(['desc', 'asc']).default('desc').describe('Sort direction'),
        per_page: z.number().min(1).max(200).default(30).describe('Results per page'),
        page: z.number().min(1).default(1).describe('Page number'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new iNaturalistClient(apiToken);
          const observations = await client.getObservations(args);
          return JSON.stringify(observations, null, 2);
        } catch (error) {
          return `Failed to get observations: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_OBSERVATION: tool({
      name: 'inaturalist_get_observation',
      description: 'Get detailed information about a specific observation',
      schema: z.object({
        id: z.number().describe('Observation ID'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new iNaturalistClient(apiToken);
          const observation = await client.getObservation(args.id);
          return JSON.stringify(observation, null, 2);
        } catch (error) {
          return `Failed to get observation: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_SPECIES_COUNTS: tool({
      name: 'inaturalist_get_species_counts',
      description:
        'Get species counts for biodiversity analysis and conservation research',
      schema: z.object({
        taxon_id: z
          .number()
          .optional()
          .describe('Parent taxon ID to count species within'),
        user_login: z.string().optional().describe('Count species observed by this user'),
        place_id: z.number().optional().describe('Place ID to count species within'),
        lat: z.number().optional().describe('Latitude for geographic search'),
        lng: z.number().optional().describe('Longitude for geographic search'),
        radius: z.number().optional().describe('Search radius in kilometers'),
        d1: z.string().optional().describe('Start date (YYYY-MM-DD)'),
        d2: z.string().optional().describe('End date (YYYY-MM-DD)'),
        quality_grade: z
          .enum(['research', 'needs_id', 'casual'])
          .default('research')
          .describe('Quality grade filter'),
        rank: z
          .enum(['species', 'genus', 'family', 'order', 'class', 'phylum', 'kingdom'])
          .default('species')
          .describe('Taxonomic rank to count'),
        per_page: z.number().min(1).max(500).default(100).describe('Results per page'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new iNaturalistClient(apiToken);
          const counts = await client.getSpeciesCounts(args);
          return JSON.stringify(counts, null, 2);
        } catch (error) {
          return `Failed to get species counts: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    SEARCH_TAXA: tool({
      name: 'inaturalist_search_taxa',
      description: 'Search for taxa/species with conservation status information',
      schema: z.object({
        q: z.string().optional().describe('Search query for taxon name'),
        is_active: z.boolean().default(true).describe('Only active taxa'),
        taxon_id: z.number().optional().describe('Parent taxon ID to search within'),
        rank: z
          .string()
          .optional()
          .describe('Taxonomic rank (species, genus, family, etc.)'),
        rank_level: z
          .number()
          .optional()
          .describe('Numeric rank level (10=species, 20=genus, etc.)'),
        per_page: z.number().min(1).max(200).default(30).describe('Results per page'),
        all_names: z
          .boolean()
          .default(false)
          .describe('Include all names, not just preferred'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new iNaturalistClient(apiToken);
          const taxa = await client.searchTaxa(args);
          return JSON.stringify(taxa, null, 2);
        } catch (error) {
          return `Failed to search taxa: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_TAXON: tool({
      name: 'inaturalist_get_taxon',
      description:
        'Get detailed information about a specific taxon including conservation status',
      schema: z.object({
        id: z.number().describe('Taxon ID'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new iNaturalistClient(apiToken);
          const taxon = await client.getTaxon(args.id);
          return JSON.stringify(taxon, null, 2);
        } catch (error) {
          return `Failed to get taxon: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_PROJECTS: tool({
      name: 'inaturalist_get_projects',
      description: 'Search for citizen science and conservation projects',
      schema: z.object({
        q: z.string().optional().describe('Search query for project name/description'),
        lat: z.number().optional().describe('Latitude for geographic search'),
        lng: z.number().optional().describe('Longitude for geographic search'),
        radius: z.number().optional().describe('Search radius in kilometers'),
        featured: z.boolean().optional().describe('Only featured projects'),
        noteworthy: z.boolean().optional().describe('Only noteworthy projects'),
        place_id: z.number().optional().describe('Projects associated with this place'),
        user_login: z.string().optional().describe('Projects created by this user'),
        type: z
          .enum(['collection', 'umbrella', 'assessment'])
          .optional()
          .describe('Project type'),
        member_id: z.number().optional().describe('Projects this user is a member of'),
        per_page: z.number().min(1).max(200).default(30).describe('Results per page'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new iNaturalistClient(apiToken);
          const projects = await client.getProjects(args);
          return JSON.stringify(projects, null, 2);
        } catch (error) {
          return `Failed to get projects: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_PROJECT: tool({
      name: 'inaturalist_get_project',
      description: 'Get detailed information about a specific citizen science project',
      schema: z.object({
        id: z.number().describe('Project ID'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new iNaturalistClient(apiToken);
          const project = await client.getProject(args.id);
          return JSON.stringify(project, null, 2);
        } catch (error) {
          return `Failed to get project: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    SEARCH_PLACES: tool({
      name: 'inaturalist_search_places',
      description: 'Search for geographic places for conservation area analysis',
      schema: z.object({
        q: z.string().optional().describe('Search query for place name'),
        lat: z.number().optional().describe('Latitude for nearby places search'),
        lng: z.number().optional().describe('Longitude for nearby places search'),
        swlat: z.number().optional().describe('Southwest latitude for bounding box'),
        swlng: z.number().optional().describe('Southwest longitude for bounding box'),
        nelat: z.number().optional().describe('Northeast latitude for bounding box'),
        nelng: z.number().optional().describe('Northeast longitude for bounding box'),
        per_page: z.number().min(1).max(200).default(30).describe('Results per page'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new iNaturalistClient(apiToken);
          const places = await client.searchPlaces(args);
          return JSON.stringify(places, null, 2);
        } catch (error) {
          return `Failed to search places: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_PLACE: tool({
      name: 'inaturalist_get_place',
      description: 'Get detailed information about a specific place',
      schema: z.object({
        id: z.number().describe('Place ID'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new iNaturalistClient(apiToken);
          const place = await client.getPlace(args.id);
          return JSON.stringify(place, null, 2);
        } catch (error) {
          return `Failed to get place: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_USER: tool({
      name: 'inaturalist_get_user',
      description: 'Get information about a specific user/observer',
      schema: z.object({
        id: z.string().describe('User ID or login name'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new iNaturalistClient(apiToken);
          const user = await client.getUser(args.id);
          return JSON.stringify(user, null, 2);
        } catch (error) {
          return `Failed to get user: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_CURRENT_USER: tool({
      name: 'inaturalist_get_current_user',
      description: 'Get information about the authenticated user (requires API token)',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          if (!apiToken) {
            return 'API token required for this operation. Get one from https://www.inaturalist.org/users/api_token';
          }
          const client = new iNaturalistClient(apiToken);
          const user = await client.getCurrentUser();
          return JSON.stringify(user, null, 2);
        } catch (error) {
          return `Failed to get current user: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    CREATE_OBSERVATION: tool({
      name: 'inaturalist_create_observation',
      description: 'Create a new observation (requires API token and authentication)',
      schema: z.object({
        species_guess: z
          .string()
          .optional()
          .describe('Initial species identification guess'),
        taxon_id: z.number().optional().describe('Taxon ID if known'),
        observed_on_string: z
          .string()
          .optional()
          .describe('Date observed (YYYY-MM-DD or natural language)'),
        time_zone: z.string().optional().describe('Time zone (e.g., "America/New_York")'),
        description: z.string().optional().describe('Observation notes and description'),
        latitude: z.number().optional().describe('Latitude coordinate'),
        longitude: z.number().optional().describe('Longitude coordinate'),
        positional_accuracy: z.number().optional().describe('GPS accuracy in meters'),
        geoprivacy: z
          .enum(['open', 'obscured', 'private'])
          .default('open')
          .describe('Location privacy setting'),
        place_id: z.number().optional().describe('Place ID where observed'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          if (!apiToken) {
            return 'API token required for creating observations. Get one from https://www.inaturalist.org/users/api_token';
          }
          const client = new iNaturalistClient(apiToken);
          const observation = await client.createObservation(args);
          return JSON.stringify(observation, null, 2);
        } catch (error) {
          return `Failed to create observation: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

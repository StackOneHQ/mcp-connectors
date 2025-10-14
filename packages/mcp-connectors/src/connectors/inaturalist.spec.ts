import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, type vi } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { iNaturalistConnectorConfig } from './inaturalist';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const mockObservation = {
  id: 123456789,
  species_guess: 'Red-tailed Hawk',
  taxon: {
    id: 5212,
    name: 'Buteo jamaicensis',
    preferred_common_name: 'Red-tailed Hawk',
    rank: 'species',
    conservation_status: {
      status: 'least_concern',
      authority: 'iucn',
    },
  },
  user: {
    id: 12345,
    login: 'naturalist_user',
    name: 'John Naturalist',
  },
  place: {
    id: 6789,
    name: 'Yellowstone National Park',
    display_name: 'Yellowstone National Park, US',
  },
  location: {
    latitude: 44.428,
    longitude: -110.5885,
    positional_accuracy: 10,
  },
  observed_on: '2023-12-25',
  quality_grade: 'research',
  identifications_count: 3,
  comments_count: 1,
  photos: [
    {
      id: 98765,
      url: 'https://inaturalist-open-data.s3.amazonaws.com/photos/98765/medium.jpg',
      attribution: 'John Naturalist',
    },
  ],
  sounds: [],
  uri: 'https://www.inaturalist.org/observations/123456789',
  description: 'Seen soaring over the valley',
};

const mockTaxon = {
  id: 5212,
  name: 'Buteo jamaicensis',
  preferred_common_name: 'Red-tailed Hawk',
  rank: 'species',
  ancestry: '48460/1/2/355675/3/26036/7251/9647',
  is_active: true,
  threatened: false,
  endemic: false,
  introduced: false,
  native: true,
  conservation_status: {
    status: 'least_concern',
    authority: 'iucn',
    iucn: 10,
  },
  conservation_statuses: [
    {
      status: 'least_concern',
      authority: 'iucn',
      place: {
        id: 97394,
        name: 'North America',
      },
    },
  ],
  wikipedia_url: 'https://en.wikipedia.org/wiki/Red-tailed_hawk',
  default_photo: {
    id: 12345,
    url: 'https://inaturalist-open-data.s3.amazonaws.com/photos/12345/medium.jpg',
    attribution: 'iNaturalist User',
  },
  observations_count: 156789,
  listed_taxa_count: 45,
};

const mockProject = {
  id: 456789,
  title: 'Birds of Yellowstone',
  description: 'A project to document bird species in Yellowstone National Park',
  project_type: 'collection',
  admins: [
    {
      user: {
        id: 12345,
        login: 'yellowstone_admin',
        name: 'Park Ranger',
      },
    },
  ],
  user_ids: [12345, 67890],
  place_id: 6789,
  location: {
    latitude: 44.428,
    longitude: -110.5885,
  },
  terms: 'Please only submit observations from within park boundaries',
  prefers_user_trust: true,
  project_observation_rules: [
    {
      operand_type: 'Place',
      operand_id: 6789,
      operator: 'observed_in_place?',
    },
  ],
  observations_count: 15678,
  species_count: 234,
  identifiers_count: 89,
  observers_count: 456,
  created_at: '2020-01-01T00:00:00Z',
  updated_at: '2023-12-31T23:59:59Z',
  icon: 'https://static.inaturalist.org/projects/456789-icon.png',
  banner_color: '#28a745',
  header_image_url: 'https://static.inaturalist.org/projects/456789-header.jpg',
};

const mockUser = {
  id: 12345,
  login: 'naturalist_user',
  name: 'John Naturalist',
  icon: 'https://static.inaturalist.org/attachments/users/icons/12345/thumb.jpg',
  observations_count: 1234,
  identifications_count: 567,
  journal_posts_count: 12,
  activity_count: 1813,
  species_count: 456,
  universal_search_rank: 890,
  roles: ['curator'],
  site_id: 1,
  created_at: '2018-03-15T10:30:00Z',
  updated_at: '2023-12-31T15:45:30Z',
};

const mockSpeciesCount = {
  count: 42,
  taxon: mockTaxon,
};

const mockPlace = {
  id: 6789,
  name: 'Yellowstone National Park',
  display_name: 'Yellowstone National Park, Wyoming, US',
  admin_level: null,
  ancestry: '97394/6930',
  bbox_area: 8991.6789,
  place_type: 100,
  geometry_geojson: {
    type: 'MultiPolygon',
    coordinates: [
      [
        [
          [-110.5885, 44.428],
          [-110.5885, 45.1234],
          [-109.1234, 45.1234],
          [-109.1234, 44.428],
          [-110.5885, 44.428],
        ],
      ],
    ],
  },
  location: {
    latitude: 44.428,
    longitude: -110.5885,
  },
};

describe('#iNaturalistConnectorConfig', () => {
  it('should have the correct basic properties', () => {
    expect(iNaturalistConnectorConfig.name).toBe('iNaturalist');
    expect(iNaturalistConnectorConfig.key).toBe('inaturalist');
    expect(iNaturalistConnectorConfig.version).toBe('1.0.0');
    expect(iNaturalistConnectorConfig.description).toContain('biodiversity research');
  });

  it('should have tools object with expected tools', () => {
    expect(typeof iNaturalistConnectorConfig.tools).toBe('object');
    expect(iNaturalistConnectorConfig.tools).toBeDefined();

    const expectedTools = [
      'GET_OBSERVATIONS',
      'GET_OBSERVATION',
      'GET_SPECIES_COUNTS',
      'SEARCH_TAXA',
      'GET_TAXON',
      'GET_PROJECTS',
      'GET_PROJECT',
      'SEARCH_PLACES',
      'GET_PLACE',
      'GET_USER',
      'GET_CURRENT_USER',
      'CREATE_OBSERVATION',
    ];

    for (const toolName of expectedTools) {
      expect(iNaturalistConnectorConfig.tools[toolName]).toBeDefined();
    }
  });

  it('should have correct credential schema', () => {
    const credentialsSchema = iNaturalistConnectorConfig.credentials;
    const parsedCredentials = credentialsSchema.safeParse({
      apiToken: 'test-jwt-token',
    });

    expect(parsedCredentials.success).toBe(true);
  });

  it('should work without API token for read operations', () => {
    const credentialsSchema = iNaturalistConnectorConfig.credentials;
    const parsedCredentials = credentialsSchema.safeParse({});

    expect(parsedCredentials.success).toBe(true);
  });

  it('should have empty setup schema', () => {
    const setupSchema = iNaturalistConnectorConfig.setup;
    const parsedSetup = setupSchema.safeParse({});

    expect(parsedSetup.success).toBe(true);
  });

  it('should have a meaningful example prompt for scientists', () => {
    expect(iNaturalistConnectorConfig.examplePrompt).toContain('research-grade');
    expect(iNaturalistConnectorConfig.examplePrompt).toContain('species counts');
    expect(iNaturalistConnectorConfig.examplePrompt).toContain('conservation');
  });

  it('should have proper logo URL', () => {
    expect(iNaturalistConnectorConfig.logo).toBe(
      'https://static.inaturalist.org/sites/1-logo.png'
    );
  });

  describe('.GET_OBSERVATIONS', () => {
    describe('when API request is successful', () => {
      it('returns formatted observations data', async () => {
        const mockResponse = {
          results: [mockObservation],
          total_results: 1,
        };

        server.use(
          http.get('https://api.inaturalist.org/v1/observations', () => {
            return HttpResponse.json(mockResponse);
          })
        );

        const tool = iNaturalistConnectorConfig.tools
          .GET_OBSERVATIONS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiToken: 'test_token',
        });

        const actual = await tool.handler(
          {
            quality_grade: 'research',
            iconic_taxa: 'Aves',
            per_page: 10,
          },
          mockContext
        );

        expect(actual).toBe(JSON.stringify(mockResponse, null, 2));
      });
    });

    describe('when API request fails', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://api.inaturalist.org/v1/observations', () => {
            return HttpResponse.json({ error: 'API Error' }, { status: 500 });
          })
        );

        const tool = iNaturalistConnectorConfig.tools
          .GET_OBSERVATIONS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({});

        const actual = await tool.handler({}, mockContext);

        expect(actual).toContain('Failed to get observations');
        expect(actual).toContain('iNaturalist API error: 500');
      });
    });
  });

  describe('.GET_OBSERVATION', () => {
    describe('when observation exists', () => {
      it('returns detailed observation data', async () => {
        const mockResponse = {
          results: [mockObservation],
        };

        server.use(
          http.get('https://api.inaturalist.org/v1/observations/123456789', () => {
            return HttpResponse.json(mockResponse);
          })
        );

        const tool = iNaturalistConnectorConfig.tools
          .GET_OBSERVATION as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler({ id: 123456789 }, mockContext);

        expect(actual).toBe(JSON.stringify(mockResponse, null, 2));
      });
    });
  });

  describe('.GET_SPECIES_COUNTS', () => {
    describe('when requesting species counts', () => {
      it('returns species count data', async () => {
        const mockResponse = {
          results: [mockSpeciesCount],
          total_results: 1,
        };

        server.use(
          http.get('https://api.inaturalist.org/v1/observations/species_counts', () => {
            return HttpResponse.json(mockResponse);
          })
        );

        const tool = iNaturalistConnectorConfig.tools
          .GET_SPECIES_COUNTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler(
          {
            place_id: 6789,
            quality_grade: 'research',
            rank: 'species',
          },
          mockContext
        );

        expect(actual).toBe(JSON.stringify(mockResponse, null, 2));
      });
    });
  });

  describe('.SEARCH_TAXA', () => {
    describe('when searching for taxa', () => {
      it('returns matching taxa', async () => {
        const mockResponse = {
          results: [mockTaxon],
          total_results: 1,
        };

        server.use(
          http.get('https://api.inaturalist.org/v1/taxa', () => {
            return HttpResponse.json(mockResponse);
          })
        );

        const tool = iNaturalistConnectorConfig.tools.SEARCH_TAXA as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler(
          {
            q: 'Red-tailed Hawk',
            rank: 'species',
            is_active: true,
          },
          mockContext
        );

        expect(actual).toBe(JSON.stringify(mockResponse, null, 2));
      });
    });
  });

  describe('.GET_TAXON', () => {
    describe('when taxon exists', () => {
      it('returns detailed taxon data', async () => {
        const mockResponse = {
          results: [mockTaxon],
        };

        server.use(
          http.get('https://api.inaturalist.org/v1/taxa/5212', () => {
            return HttpResponse.json(mockResponse);
          })
        );

        const tool = iNaturalistConnectorConfig.tools.GET_TAXON as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler({ id: 5212 }, mockContext);

        expect(actual).toBe(JSON.stringify(mockResponse, null, 2));
      });
    });
  });

  describe('.GET_PROJECTS', () => {
    describe('when searching for projects', () => {
      it('returns matching projects', async () => {
        const mockResponse = {
          results: [mockProject],
          total_results: 1,
        };

        server.use(
          http.get('https://api.inaturalist.org/v1/projects', () => {
            return HttpResponse.json(mockResponse);
          })
        );

        const tool = iNaturalistConnectorConfig.tools.GET_PROJECTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler(
          {
            q: 'Yellowstone',
            featured: true,
          },
          mockContext
        );

        expect(actual).toBe(JSON.stringify(mockResponse, null, 2));
      });
    });
  });

  describe('.GET_PROJECT', () => {
    describe('when project exists', () => {
      it('returns detailed project data', async () => {
        const mockResponse = {
          results: [mockProject],
        };

        server.use(
          http.get('https://api.inaturalist.org/v1/projects/456789', () => {
            return HttpResponse.json(mockResponse);
          })
        );

        const tool = iNaturalistConnectorConfig.tools.GET_PROJECT as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler({ id: 456789 }, mockContext);

        expect(actual).toBe(JSON.stringify(mockResponse, null, 2));
      });
    });
  });

  describe('.SEARCH_PLACES', () => {
    describe('when searching for places', () => {
      it('returns matching places', async () => {
        const mockResponse = {
          results: [mockPlace],
          total_results: 1,
        };

        server.use(
          http.get('https://api.inaturalist.org/v1/places', () => {
            return HttpResponse.json(mockResponse);
          })
        );

        const tool = iNaturalistConnectorConfig.tools.SEARCH_PLACES as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler(
          {
            q: 'Yellowstone',
          },
          mockContext
        );

        expect(actual).toBe(JSON.stringify(mockResponse, null, 2));
      });
    });
  });

  describe('.GET_PLACE', () => {
    describe('when place exists', () => {
      it('returns detailed place data', async () => {
        const mockResponse = {
          results: [mockPlace],
        };

        server.use(
          http.get('https://api.inaturalist.org/v1/places/6789', () => {
            return HttpResponse.json(mockResponse);
          })
        );

        const tool = iNaturalistConnectorConfig.tools.GET_PLACE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler({ id: 6789 }, mockContext);

        expect(actual).toBe(JSON.stringify(mockResponse, null, 2));
      });
    });
  });

  describe('.GET_USER', () => {
    describe('when user exists', () => {
      it('returns user data', async () => {
        const mockResponse = {
          results: [mockUser],
        };

        server.use(
          http.get('https://api.inaturalist.org/v1/users/naturalist_user', () => {
            return HttpResponse.json(mockResponse);
          })
        );

        const tool = iNaturalistConnectorConfig.tools.GET_USER as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler({ id: 'naturalist_user' }, mockContext);

        expect(actual).toBe(JSON.stringify(mockResponse, null, 2));
      });
    });
  });

  describe('.GET_CURRENT_USER', () => {
    describe('when authenticated with valid token', () => {
      it('returns current user data', async () => {
        server.use(
          http.get('https://api.inaturalist.org/v1/users/me', () => {
            return HttpResponse.json(mockUser);
          })
        );

        const tool = iNaturalistConnectorConfig.tools
          .GET_CURRENT_USER as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiToken: 'valid_jwt_token',
        });

        const actual = await tool.handler({}, mockContext);

        expect(actual).toBe(JSON.stringify(mockUser, null, 2));
      });
    });

    describe('when no API token provided', () => {
      it('returns token required message', async () => {
        const tool = iNaturalistConnectorConfig.tools
          .GET_CURRENT_USER as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({});

        const actual = await tool.handler({}, mockContext);

        expect(actual).toContain('API token required for this operation');
        expect(actual).toContain('https://www.inaturalist.org/users/api_token');
      });
    });
  });

  describe('.CREATE_OBSERVATION', () => {
    describe('when authenticated with valid token', () => {
      it('creates new observation', async () => {
        server.use(
          http.post('https://api.inaturalist.org/v1/observations', () => {
            return HttpResponse.json(mockObservation);
          })
        );

        const tool = iNaturalistConnectorConfig.tools
          .CREATE_OBSERVATION as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiToken: 'valid_jwt_token',
        });

        const actual = await tool.handler(
          {
            species_guess: 'Red-tailed Hawk',
            observed_on_string: '2023-12-25',
            latitude: 44.428,
            longitude: -110.5885,
            description: 'Soaring over Yellowstone',
          },
          mockContext
        );

        expect(actual).toBe(JSON.stringify(mockObservation, null, 2));
      });
    });

    describe('when no API token provided', () => {
      it('returns token required message', async () => {
        const tool = iNaturalistConnectorConfig.tools
          .CREATE_OBSERVATION as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({});

        const actual = await tool.handler(
          {
            species_guess: 'Red-tailed Hawk',
          },
          mockContext
        );

        expect(actual).toContain('API token required for creating observations');
        expect(actual).toContain('https://www.inaturalist.org/users/api_token');
      });
    });
  });
});

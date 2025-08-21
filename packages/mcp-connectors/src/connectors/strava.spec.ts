import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, type vi } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { StravaConnectorConfig } from './strava';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const mockAthlete = {
  id: 123456,
  firstname: 'John',
  lastname: 'Doe',
  profile_medium: 'https://example.com/profile.jpg',
  profile: 'https://example.com/profile_large.jpg',
  city: 'San Francisco',
  state: 'CA',
  country: 'US',
  sex: 'M',
  premium: true,
  summit: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-12-31T23:59:59Z',
  follower_count: 100,
  friend_count: 50,
  ftp: 250,
  weight: 75.0,
  clubs: [],
};

const mockActivity = {
  id: 987654321,
  name: 'Morning Ride',
  distance: 32186.8,
  moving_time: 4567,
  elapsed_time: 4800,
  total_elevation_gain: 314.2,
  type: 'Ride',
  start_date: '2023-12-25T08:00:00Z',
  start_date_local: '2023-12-25T08:00:00',
  timezone: 'America/Los_Angeles',
  start_latlng: [37.7749, -122.4194],
  end_latlng: [37.7849, -122.4094],
  location_city: 'San Francisco',
  location_state: 'CA',
  location_country: 'US',
  achievement_count: 2,
  kudos_count: 15,
  comment_count: 3,
  athlete_count: 1,
  photo_count: 2,
  trainer: false,
  commute: false,
  manual: false,
  private: false,
  flagged: false,
  gear_id: 'bike123',
  average_speed: 7.05,
  max_speed: 15.2,
  has_heartrate: true,
  average_heartrate: 145.5,
  max_heartrate: 178,
  heartrate_opt_out: false,
  display_hide_heartrate_option: false,
  elev_high: 52.3,
  elev_low: 8.1,
  upload_id: 111222333,
  external_id: 'garmin_12345.fit',
  from_accepted_tag: false,
  pr_count: 1,
  total_photo_count: 2,
  has_kudoed: false,
};

const mockSegment = {
  id: 654321,
  name: 'Lombard St Climb',
  activity_type: 'Ride',
  distance: 804.7,
  average_grade: 8.3,
  maximum_grade: 20.0,
  elevation_high: 91.4,
  elevation_low: 24.6,
  start_latlng: [37.8021, -122.4194],
  end_latlng: [37.8095, -122.4184],
  climb_category: 4,
  city: 'San Francisco',
  state: 'CA',
  country: 'US',
  private: false,
  hazardous: false,
  starred: true,
  effort_count: 50345,
  athlete_count: 7453,
  star_count: 632,
};

describe('#StravaConnector', () => {
  describe('.GET_ATHLETE', () => {
    describe('when request is successful', () => {
      it('returns athlete profile data', async () => {
        server.use(
          http.get('https://www.strava.com/api/v3/athlete', () => {
            return HttpResponse.json(mockAthlete);
          })
        );

        const tool = StravaConnectorConfig.tools.GET_ATHLETE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          accessToken: 'test_token',
        });

        const actual = await tool.handler({}, mockContext);

        expect(actual).toBe(JSON.stringify(mockAthlete, null, 2));
      });
    });

    describe('when request fails', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://www.strava.com/api/v3/athlete', () => {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
          })
        );

        const tool = StravaConnectorConfig.tools.GET_ATHLETE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          accessToken: 'invalid_token',
        });

        const actual = await tool.handler({}, mockContext);

        expect(actual).toContain('Failed to get athlete profile');
      });
    });
  });

  describe('.GET_ATHLETE_STATS', () => {
    describe('when athlete ID is provided', () => {
      it('returns athlete stats for specified ID', async () => {
        const mockStats = {
          recent_ride_totals: { count: 5, distance: 150000.0 },
          ytd_ride_totals: { count: 150, distance: 5000000.0 },
        };

        server.use(
          http.get('https://www.strava.com/api/v3/athletes/123456/stats', () => {
            return HttpResponse.json(mockStats);
          })
        );

        const tool = StravaConnectorConfig.tools.GET_ATHLETE_STATS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          accessToken: 'test_token',
        });

        const actual = await tool.handler({ athleteId: 123456 }, mockContext);

        expect(actual).toBe(JSON.stringify(mockStats, null, 2));
      });
    });

    describe('when no athlete ID is provided', () => {
      it('fetches current athlete ID and returns stats', async () => {
        const mockStats = {
          recent_ride_totals: { count: 5, distance: 150000.0 },
          ytd_ride_totals: { count: 150, distance: 5000000.0 },
        };

        server.use(
          http.get('https://www.strava.com/api/v3/athlete', () => {
            return HttpResponse.json(mockAthlete);
          }),
          http.get('https://www.strava.com/api/v3/athletes/123456/stats', () => {
            return HttpResponse.json(mockStats);
          })
        );

        const tool = StravaConnectorConfig.tools.GET_ATHLETE_STATS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          accessToken: 'test_token',
        });

        const actual = await tool.handler({}, mockContext);

        expect(actual).toBe(JSON.stringify(mockStats, null, 2));
      });
    });
  });

  describe('.GET_ACTIVITIES', () => {
    describe('when request is successful', () => {
      it('returns list of activities', async () => {
        const mockActivities = [mockActivity];

        server.use(
          http.get('https://www.strava.com/api/v3/athlete/activities', () => {
            return HttpResponse.json(mockActivities);
          })
        );

        const tool = StravaConnectorConfig.tools.GET_ACTIVITIES as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          accessToken: 'test_token',
        });

        const actual = await tool.handler({}, mockContext);

        expect(actual).toBe(JSON.stringify(mockActivities, null, 2));
      });
    });

    describe('when pagination parameters are provided', () => {
      it('includes pagination parameters in request', async () => {
        server.use(
          http.get('https://www.strava.com/api/v3/athlete/activities', ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get('page')).toBe('2');
            expect(url.searchParams.get('per_page')).toBe('10');
            return HttpResponse.json([]);
          })
        );

        const tool = StravaConnectorConfig.tools.GET_ACTIVITIES as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          accessToken: 'test_token',
        });

        await tool.handler({ page: 2, perPage: 10 }, mockContext);
      });
    });
  });

  describe('.GET_ACTIVITY', () => {
    describe('when activity exists', () => {
      it('returns detailed activity information', async () => {
        server.use(
          http.get('https://www.strava.com/api/v3/activities/987654321', () => {
            return HttpResponse.json(mockActivity);
          })
        );

        const tool = StravaConnectorConfig.tools.GET_ACTIVITY as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          accessToken: 'test_token',
        });

        const actual = await tool.handler({ activityId: 987654321 }, mockContext);

        expect(actual).toBe(JSON.stringify(mockActivity, null, 2));
      });
    });

    describe('when activity does not exist', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://www.strava.com/api/v3/activities/999999', () => {
            return HttpResponse.json({ message: 'Resource Not Found' }, { status: 404 });
          })
        );

        const tool = StravaConnectorConfig.tools.GET_ACTIVITY as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          accessToken: 'test_token',
        });

        const actual = await tool.handler({ activityId: 999999 }, mockContext);

        expect(actual).toContain('Failed to get activity');
      });
    });
  });

  describe('.GET_ACTIVITY_STREAMS', () => {
    describe('when activity has streams', () => {
      it('returns stream data', async () => {
        const mockStreams = {
          time: { data: [0, 10, 20, 30] },
          distance: { data: [0.0, 100.0, 200.0, 300.0] },
          latlng: {
            data: [
              [37.7749, -122.4194],
              [37.775, -122.4195],
            ],
          },
        };

        server.use(
          http.get('https://www.strava.com/api/v3/activities/987654321/streams', () => {
            return HttpResponse.json(mockStreams);
          })
        );

        const tool = StravaConnectorConfig.tools
          .GET_ACTIVITY_STREAMS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          accessToken: 'test_token',
        });

        const actual = await tool.handler({ activityId: 987654321 }, mockContext);

        expect(actual).toBe(JSON.stringify(mockStreams, null, 2));
      });
    });

    describe('when custom keys are provided', () => {
      it('includes custom keys in request', async () => {
        server.use(
          http.get(
            'https://www.strava.com/api/v3/activities/987654321/streams',
            ({ request }) => {
              const url = new URL(request.url);
              expect(url.searchParams.get('keys')).toBe('heartrate,watts');
              return HttpResponse.json({});
            }
          )
        );

        const tool = StravaConnectorConfig.tools
          .GET_ACTIVITY_STREAMS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          accessToken: 'test_token',
        });

        await tool.handler(
          { activityId: 987654321, keys: ['heartrate', 'watts'] },
          mockContext
        );
      });
    });
  });

  describe('.GET_SEGMENT', () => {
    describe('when segment exists', () => {
      it('returns segment information', async () => {
        server.use(
          http.get('https://www.strava.com/api/v3/segments/654321', () => {
            return HttpResponse.json(mockSegment);
          })
        );

        const tool = StravaConnectorConfig.tools.GET_SEGMENT as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          accessToken: 'test_token',
        });

        const actual = await tool.handler({ segmentId: 654321 }, mockContext);

        expect(actual).toBe(JSON.stringify(mockSegment, null, 2));
      });
    });
  });

  describe('.EXPLORE_SEGMENTS', () => {
    describe('when bounds are provided', () => {
      it('returns segments in the area', async () => {
        const mockExploreResult = {
          segments: [mockSegment],
        };

        server.use(
          http.get('https://www.strava.com/api/v3/segments/explore', ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get('bounds')).toBe('37.7,-122.5,37.8,-122.4');
            expect(url.searchParams.get('activity_type')).toBe('riding');
            return HttpResponse.json(mockExploreResult);
          })
        );

        const tool = StravaConnectorConfig.tools.EXPLORE_SEGMENTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          accessToken: 'test_token',
        });

        const actual = await tool.handler(
          {
            bounds: {
              sw: [37.7, -122.5],
              ne: [37.8, -122.4],
            },
          },
          mockContext
        );

        expect(actual).toBe(JSON.stringify(mockExploreResult, null, 2));
      });
    });

    describe('when activity type is running', () => {
      it('sets activity_type parameter to running', async () => {
        server.use(
          http.get('https://www.strava.com/api/v3/segments/explore', ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get('activity_type')).toBe('running');
            return HttpResponse.json({ segments: [] });
          })
        );

        const tool = StravaConnectorConfig.tools.EXPLORE_SEGMENTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          accessToken: 'test_token',
        });

        await tool.handler(
          {
            bounds: {
              sw: [37.7, -122.5],
              ne: [37.8, -122.4],
            },
            activityType: 'running',
          },
          mockContext
        );
      });
    });
  });

  describe('.GET_ATHLETE_ROUTES', () => {
    describe('when request is successful', () => {
      it('returns list of routes', async () => {
        const mockRoutes = [
          {
            id: 456789,
            name: 'Golden Gate Loop',
            description: 'Beautiful route around the Golden Gate',
            distance: 25000.0,
            elevation_gain: 500.0,
            type: 1,
            sub_type: 1,
            private: false,
            starred: true,
            timestamp: 1640995200,
            segments: [],
          },
        ];

        server.use(
          http.get('https://www.strava.com/api/v3/athlete', () => {
            return HttpResponse.json(mockAthlete);
          }),
          http.get('https://www.strava.com/api/v3/athletes/123456/routes', () => {
            return HttpResponse.json(mockRoutes);
          })
        );

        const tool = StravaConnectorConfig.tools.GET_ATHLETE_ROUTES as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          accessToken: 'test_token',
        });

        const actual = await tool.handler({}, mockContext);

        expect(actual).toBe(JSON.stringify(mockRoutes, null, 2));
      });
    });
  });

  describe('.GET_ROUTE', () => {
    describe('when route exists', () => {
      it('returns route information', async () => {
        const mockRoute = {
          id: 456789,
          name: 'Golden Gate Loop',
          description: 'Beautiful route around the Golden Gate',
          distance: 25000.0,
          elevation_gain: 500.0,
          type: 1,
          sub_type: 1,
          private: false,
          starred: true,
          timestamp: 1640995200,
          segments: [],
        };

        server.use(
          http.get('https://www.strava.com/api/v3/routes/456789', () => {
            return HttpResponse.json(mockRoute);
          })
        );

        const tool = StravaConnectorConfig.tools.GET_ROUTE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          accessToken: 'test_token',
        });

        const actual = await tool.handler({ routeId: 456789 }, mockContext);

        expect(actual).toBe(JSON.stringify(mockRoute, null, 2));
      });
    });
  });

  describe('.GET_STARRED_SEGMENTS', () => {
    describe('when request is successful', () => {
      it('returns list of starred segments', async () => {
        const mockStarredSegments = [mockSegment];

        server.use(
          http.get('https://www.strava.com/api/v3/segments/starred', () => {
            return HttpResponse.json(mockStarredSegments);
          })
        );

        const tool = StravaConnectorConfig.tools
          .GET_STARRED_SEGMENTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          accessToken: 'test_token',
        });

        const actual = await tool.handler({}, mockContext);

        expect(actual).toBe(JSON.stringify(mockStarredSegments, null, 2));
      });
    });
  });
});

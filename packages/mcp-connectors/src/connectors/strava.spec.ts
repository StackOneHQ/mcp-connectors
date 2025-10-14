import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { extractToolsFromServer } from '../__mocks__/server-tools';
import { createStravaServer } from './strava';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const mockOAuth2Credentials = {
  accessToken: 'test_access_token',
  refreshToken: 'test_refresh_token',
  expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour from now
  tokenType: 'Bearer',
  clientId: 'test_client_id',
  clientSecret: 'test_client_secret',
};

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

        const mcpServer = createStravaServer(mockOAuth2Credentials);
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.strava_get_athlete.handler({});

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

        const mcpServer = createStravaServer({
          ...mockOAuth2Credentials,
          accessToken: 'invalid_token',
        });
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.strava_get_athlete.handler({});

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

        const mcpServer = createStravaServer(mockOAuth2Credentials);
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.strava_get_athlete_stats.handler({
          athleteId: 123456,
        });

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

        const mcpServer = createStravaServer(mockOAuth2Credentials);
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.strava_get_athlete_stats.handler({});

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

        const mcpServer = createStravaServer(mockOAuth2Credentials);
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.strava_get_activities.handler({});

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

        const mcpServer = createStravaServer(mockOAuth2Credentials);
        const tools = extractToolsFromServer(mcpServer);

        await tools.strava_get_activities.handler({ page: 2, perPage: 10 });
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

        const mcpServer = createStravaServer(mockOAuth2Credentials);
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.strava_get_activity.handler({ activityId: 987654321 });

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

        const mcpServer = createStravaServer(mockOAuth2Credentials);
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.strava_get_activity.handler({ activityId: 999999 });

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

        const mcpServer = createStravaServer(mockOAuth2Credentials);
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.strava_get_activity_streams.handler({
          activityId: 987654321,
        });

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

        const mcpServer = createStravaServer(mockOAuth2Credentials);
        const tools = extractToolsFromServer(mcpServer);

        await tools.strava_get_activity_streams.handler({
          activityId: 987654321,
          keys: ['heartrate', 'watts'],
        });
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

        const mcpServer = createStravaServer(mockOAuth2Credentials);
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.strava_get_segment.handler({ segmentId: 654321 });

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

        const mcpServer = createStravaServer(mockOAuth2Credentials);
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.strava_explore_segments.handler({
          bounds: {
            sw: [37.7, -122.5],
            ne: [37.8, -122.4],
          },
        });

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

        const mcpServer = createStravaServer(mockOAuth2Credentials);
        const tools = extractToolsFromServer(mcpServer);

        await tools.strava_explore_segments.handler({
          bounds: {
            sw: [37.7, -122.5],
            ne: [37.8, -122.4],
          },
          activityType: 'running',
        });
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

        const mcpServer = createStravaServer(mockOAuth2Credentials);
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.strava_get_athlete_routes.handler({});

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

        const mcpServer = createStravaServer(mockOAuth2Credentials);
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.strava_get_route.handler({ routeId: 456789 });

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

        const mcpServer = createStravaServer(mockOAuth2Credentials);
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.strava_get_starred_segments.handler({});

        expect(actual).toBe(JSON.stringify(mockStarredSegments, null, 2));
      });
    });
  });
});

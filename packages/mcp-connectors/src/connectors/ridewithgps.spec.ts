import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { describe, expect, it } from 'vitest';
import { extractToolsFromServer } from '../__mocks__/server-tools';
import { createRideWithGPSServer } from './ridewithgps';

const server = setupServer();

describe('#RideWithGPSConnector', () => {
  describe('.GET_CURRENT_USER', () => {
    describe('when request is successful', () => {
      it('returns user profile data', async () => {
        const mockUser = {
          user: {
            id: 123,
            name: 'John Doe',
            first_name: 'John',
            last_name: 'Doe',
            username: 'johndoe',
            email: 'john@example.com',
            created_at: '2020-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
            time_zone: 'America/New_York',
            privacy: 'public',
            total_trip_distance: 25000.5,
            total_trip_duration: 36000,
            total_trip_elevation_gain: 5000.2,
            total_routes: 15,
            total_trips: 45,
          },
        };

        server.use(
          http.get('https://ridewithgps.com/users/current.json', () => {
            return HttpResponse.json(mockUser);
          })
        );

        server.listen();

        const mcpServer = createRideWithGPSServer({
          apiKey: 'test-api-key',
          authToken: 'test-auth-token',
        });
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.ridewithgps_get_current_user.handler({});

        expect(actual).toContain('"id": 123');
        expect(actual).toContain('"name": "John Doe"');
        expect(actual).toContain('"total_trips": 45');

        server.close();
      });
    });

    describe('when API returns error', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://ridewithgps.com/users/current.json', () => {
            return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
          })
        );

        server.listen();

        const mcpServer = createRideWithGPSServer({
          apiKey: 'invalid-key',
          authToken: 'invalid-token',
        });
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.ridewithgps_get_current_user.handler({});

        expect(actual).toContain('Failed to get current user');
        expect(actual).toContain('401');

        server.close();
      });
    });
  });

  describe('.GET_ROUTES', () => {
    describe('when request is successful', () => {
      it('returns user routes list', async () => {
        const mockRoutes = {
          results: [
            {
              id: 456,
              name: 'Morning Commute',
              description: 'Daily ride to work',
              distance: 15000.0,
              elevation_gain: 200.5,
              elevation_loss: 180.2,
              created_at: '2023-01-15T08:00:00Z',
              visibility: 1,
              user_id: 123,
            },
          ],
        };

        server.use(
          http.get('https://ridewithgps.com/users/current.json', () => {
            return HttpResponse.json({ user: { id: 123, name: 'Test User' } });
          }),
          http.get('https://ridewithgps.com/users/123/routes.json', () => {
            return HttpResponse.json(mockRoutes);
          })
        );

        server.listen();

        const mcpServer = createRideWithGPSServer({
          apiKey: 'test-api-key',
          authToken: 'test-auth-token',
        });
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.ridewithgps_get_routes.handler({ offset: 0, limit: 20 });

        expect(actual).toContain('"id": 456');
        expect(actual).toContain('"name": "Morning Commute"');
        expect(actual).toContain('"distance": 15000');

        server.close();
      });
    });

    describe('when userId is provided', () => {
      it('requests specific user routes', async () => {
        const mockRoutes = {
          results: [
            {
              id: 789,
              name: 'Friend Route',
              distance: 25000.0,
              user_id: 456,
            },
          ],
        };

        server.use(
          http.get('https://ridewithgps.com/users/456/routes.json', () => {
            return HttpResponse.json(mockRoutes);
          })
        );

        server.listen();

        const mcpServer = createRideWithGPSServer({
          apiKey: 'test-api-key',
          authToken: 'test-auth-token',
        });
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.ridewithgps_get_routes.handler({
          userId: 456,
          offset: 0,
          limit: 10,
        });

        expect(actual).toContain('"id": 789');
        expect(actual).toContain('"user_id": 456');

        server.close();
      });
    });
  });

  describe('.GET_ROUTE_DETAILS', () => {
    describe('when route exists', () => {
      it('returns detailed route information', async () => {
        const mockRoute = {
          route: {
            id: 456,
            name: 'Mountain Loop',
            description: 'Challenging mountain ride',
            distance: 50000.0,
            elevation_gain: 1200.5,
            maximum_elevation: 2500.0,
            minimum_elevation: 800.0,
            track_points: [
              { x: -122.4194, y: 37.7749, e: 850.0 },
              { x: -122.4184, y: 37.7759, e: 855.5 },
            ],
          },
        };

        server.use(
          http.get('https://ridewithgps.com/routes/456.json', () => {
            return HttpResponse.json(mockRoute);
          })
        );

        server.listen();

        const mcpServer = createRideWithGPSServer({
          apiKey: 'test-api-key',
          authToken: 'test-auth-token',
        });
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.ridewithgps_get_route_details.handler({ routeId: 456 });

        expect(actual).toContain('"id": 456');
        expect(actual).toContain('"name": "Mountain Loop"');
        expect(actual).toContain('"track_points"');
        expect(actual).toContain('-122.4194');

        server.close();
      });
    });

    describe('when route does not exist', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://ridewithgps.com/routes/999.json', () => {
            return HttpResponse.json({ error: 'Route not found' }, { status: 404 });
          })
        );

        server.listen();

        const mcpServer = createRideWithGPSServer({
          apiKey: 'test-api-key',
          authToken: 'test-auth-token',
        });
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.ridewithgps_get_route_details.handler({ routeId: 999 });

        expect(actual).toContain('Failed to get route details');
        expect(actual).toContain('404');

        server.close();
      });
    });
  });

  describe('.GET_RIDES', () => {
    describe('when request is successful', () => {
      it('returns user rides list', async () => {
        const mockTrips = {
          results: [
            {
              id: 789,
              name: 'Weekend Ride',
              distance: 30000.0,
              duration: 7200,
              departed_at: '2023-06-15T09:00:00Z',
              is_gps: true,
              average_speed: 25.5,
              maximum_speed: 45.2,
              calories: 1200,
            },
          ],
        };

        server.use(
          http.get('https://ridewithgps.com/users/current.json', () => {
            return HttpResponse.json({ user: { id: 123, name: 'Test User' } });
          }),
          http.get('https://ridewithgps.com/users/123/trips.json', () => {
            return HttpResponse.json(mockTrips);
          })
        );

        server.listen();

        const mcpServer = createRideWithGPSServer({
          apiKey: 'test-api-key',
          authToken: 'test-auth-token',
        });
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.ridewithgps_get_rides.handler({ offset: 0, limit: 20 });

        expect(actual).toContain('"id": 789');
        expect(actual).toContain('"name": "Weekend Ride"');
        expect(actual).toContain('"is_gps": true');
        expect(actual).toContain('"calories": 1200');

        server.close();
      });
    });
  });

  describe('.GET_RIDE_DETAILS', () => {
    describe('when ride exists', () => {
      it('returns detailed ride information with performance data', async () => {
        const mockTrip = {
          trip: {
            id: 789,
            name: 'Epic Mountain Ride',
            distance: 75000.0,
            duration: 14400,
            moving_time: 12600,
            departed_at: '2023-07-20T06:30:00Z',
            is_gps: true,
            average_speed: 22.5,
            maximum_speed: 52.8,
            average_hr: 155,
            maximum_hr: 185,
            average_watts: 250,
            maximum_watts: 450,
            calories: 2800,
            track_points: [
              { x: -121.5, y: 38.5, e: 1200.0, t: 0, hr: 145, watts: 230 },
              { x: -121.501, y: 38.501, e: 1205.0, t: 60, hr: 148, watts: 245 },
            ],
          },
        };

        server.use(
          http.get('https://ridewithgps.com/trips/789.json', () => {
            return HttpResponse.json(mockTrip);
          })
        );

        server.listen();

        const mcpServer = createRideWithGPSServer({
          apiKey: 'test-api-key',
          authToken: 'test-auth-token',
        });
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.ridewithgps_get_ride_details.handler({ rideId: 789 });

        expect(actual).toContain('"id": 789');
        expect(actual).toContain('"name": "Epic Mountain Ride"');
        expect(actual).toContain('"average_hr": 155');
        expect(actual).toContain('"track_points"');
        expect(actual).toContain('"watts": 230');

        server.close();
      });
    });

    describe('when ride does not exist', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://ridewithgps.com/trips/999.json', () => {
            return HttpResponse.json({ error: 'Trip not found' }, { status: 404 });
          })
        );

        server.listen();

        const mcpServer = createRideWithGPSServer({
          apiKey: 'test-api-key',
          authToken: 'test-auth-token',
        });
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.ridewithgps_get_ride_details.handler({ rideId: 999 });

        expect(actual).toContain('Failed to get ride details');
        expect(actual).toContain('404');

        server.close();
      });
    });
  });

  describe('.GET_EVENTS', () => {
    describe('when request is successful', () => {
      it('returns user events list', async () => {
        const mockEvents = {
          results: [
            {
              id: 101,
              name: 'Annual Century Ride',
              description: 'Community 100-mile cycling event',
              start_date: '2023-09-15T08:00:00Z',
              end_date: '2023-09-15T17:00:00Z',
              event_type: 'ride',
              max_participants: 200,
              current_participants: 156,
              visibility: 1,
              user_id: 123,
            },
          ],
        };

        server.use(
          http.get('https://ridewithgps.com/users/current.json', () => {
            return HttpResponse.json({ user: { id: 123, name: 'Test User' } });
          }),
          http.get('https://ridewithgps.com/users/123/events.json', () => {
            return HttpResponse.json(mockEvents);
          })
        );

        server.listen();

        const mcpServer = createRideWithGPSServer({
          apiKey: 'test-api-key',
          authToken: 'test-auth-token',
        });
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.ridewithgps_get_events.handler({});

        expect(actual).toContain('"id": 101');
        expect(actual).toContain('"name": "Annual Century Ride"');
        expect(actual).toContain('"event_type": "ride"');
        expect(actual).toContain('"current_participants": 156');

        server.close();
      });
    });

    describe('when API returns empty results', () => {
      it('returns empty events array', async () => {
        const mockEvents = {
          results: [],
        };

        server.use(
          http.get('https://ridewithgps.com/users/current.json', () => {
            return HttpResponse.json({ user: { id: 123, name: 'Test User' } });
          }),
          http.get('https://ridewithgps.com/users/123/events.json', () => {
            return HttpResponse.json(mockEvents);
          })
        );

        server.listen();

        const mcpServer = createRideWithGPSServer({
          apiKey: 'test-api-key',
          authToken: 'test-auth-token',
        });
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.ridewithgps_get_events.handler({});

        expect(actual).toContain('[]');

        server.close();
      });
    });
  });
});

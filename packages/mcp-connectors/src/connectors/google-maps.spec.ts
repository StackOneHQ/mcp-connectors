import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { extractToolsFromServer } from '../__mocks__/server-tools';
import { createGoogleMapsServer } from './google-maps';

const GOOGLE_MAPS_API_BASE = 'https://maps.googleapis.com/maps/api';

describe('#GoogleMapsConnector', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterAll(() => server.close());
  afterEach(() => server.resetHandlers());

  describe('.search_nearby', () => {
    describe('when searching for nearby places successfully', () => {
      it('returns a list of nearby places', async () => {
        const mockPlaces = {
          results: [
            {
              place_id: 'ChIJ1234567890abcdef',
              name: 'Test Restaurant',
              formatted_address: '123 Main St, Test City, TC 12345',
              geometry: {
                location: {
                  lat: 40.7128,
                  lng: -74.006,
                },
              },
              rating: 4.5,
              types: ['restaurant', 'food', 'establishment'],
              vicinity: 'Test City',
            },
          ],
          status: 'OK',
        };

        server.use(
          http.get(`${GOOGLE_MAPS_API_BASE}/place/nearbysearch/json`, () => {
            return HttpResponse.json(mockPlaces);
          })
        );

        const mcpServer = createGoogleMapsServer({ apiKey: 'test-api-key' });
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.search_nearby?.handler({
          location: '40.7128,-74.0060',
          radius: 1000,
          type: 'restaurant',
        });

        expect(actual).toContain('Test Restaurant');
        expect(actual).toContain('restaurant');
      });
    });

    describe('when API returns an error', () => {
      it('throws an error', async () => {
        server.use(
          http.get(`${GOOGLE_MAPS_API_BASE}/place/nearbysearch/json`, () => {
            return HttpResponse.json(
              {
                status: 'INVALID_REQUEST',
                error_message: 'Missing required parameter',
              },
              { status: 400 }
            );
          })
        );

        const mcpServer = createGoogleMapsServer({ apiKey: 'test-api-key' });
        const tools = extractToolsFromServer(mcpServer);

        await expect(
          tools.search_nearby?.handler({
            location: 'invalid',
            radius: 1000,
          })
        ).rejects.toThrow('Google Maps API error');
      });
    });
  });

  describe('.get_place_details', () => {
    describe('when fetching place details successfully', () => {
      it('returns detailed place information', async () => {
        const mockPlaceDetails = {
          result: {
            place_id: 'ChIJ1234567890abcdef',
            name: 'Test Restaurant',
            formatted_address: '123 Main St, Test City, TC 12345',
            international_phone_number: '+1 555-123-4567',
            website: 'https://testrestaurant.com',
            url: 'https://maps.google.com/place/ChIJ1234567890abcdef',
            geometry: {
              location: {
                lat: 40.7128,
                lng: -74.006,
              },
            },
            rating: 4.5,
            user_ratings_total: 123,
            types: ['restaurant', 'food', 'establishment'],
          },
          status: 'OK',
        };

        server.use(
          http.get(`${GOOGLE_MAPS_API_BASE}/place/details/json`, () => {
            return HttpResponse.json(mockPlaceDetails);
          })
        );

        const mcpServer = createGoogleMapsServer({ apiKey: 'test-api-key' });
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.get_place_details?.handler({
          placeId: 'ChIJ1234567890abcdef',
        });

        expect(actual).toContain('Test Restaurant');
        expect(actual).toContain('+1 555-123-4567');
        expect(actual).toContain('https://testrestaurant.com');
      });
    });
  });

  describe('.maps_geocode', () => {
    describe('when geocoding an address successfully', () => {
      it('returns geocoded location', async () => {
        const mockGeocodeResult = {
          results: [
            {
              place_id: 'ChIJ1234567890abcdef',
              formatted_address:
                '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
              address_components: [
                {
                  long_name: '1600',
                  short_name: '1600',
                  types: ['street_number'],
                },
                {
                  long_name: 'Amphitheatre Parkway',
                  short_name: 'Amphitheatre Pkwy',
                  types: ['route'],
                },
              ],
              geometry: {
                location: {
                  lat: 37.4224764,
                  lng: -122.0842499,
                },
                location_type: 'ROOFTOP',
              },
              types: ['street_address'],
            },
          ],
          status: 'OK',
        };

        server.use(
          http.get(`${GOOGLE_MAPS_API_BASE}/geocode/json`, () => {
            return HttpResponse.json(mockGeocodeResult);
          })
        );

        const mcpServer = createGoogleMapsServer({ apiKey: 'test-api-key' });
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.maps_geocode?.handler({
          address: '1600 Amphitheatre Parkway, Mountain View, CA',
        });

        expect(actual).toContain('1600 Amphitheatre Parkway');
        expect(actual).toContain('37.4224764');
        expect(actual).toContain('-122.0842499');
      });
    });
  });

  describe('.maps_directions', () => {
    describe('when getting directions successfully', () => {
      it('returns route information', async () => {
        const mockDirectionsResult = {
          routes: [
            {
              summary: 'I-280 S',
              legs: [
                {
                  start_address: 'San Francisco, CA, USA',
                  end_address: 'Mountain View, CA, USA',
                  distance: {
                    text: '42.0 mi',
                    value: 67593,
                  },
                  duration: {
                    text: '45 mins',
                    value: 2700,
                  },
                  steps: [
                    {
                      html_instructions: 'Head <b>south</b> on <b>US-101 S</b>',
                      distance: {
                        text: '2.0 mi',
                        value: 3219,
                      },
                      duration: {
                        text: '3 mins',
                        value: 180,
                      },
                      start_location: {
                        lat: 37.7749,
                        lng: -122.4194,
                      },
                      end_location: {
                        lat: 37.7649,
                        lng: -122.4094,
                      },
                    },
                  ],
                },
              ],
              overview_polyline: {
                points: 'test_polyline_data',
              },
            },
          ],
          status: 'OK',
        };

        server.use(
          http.get(`${GOOGLE_MAPS_API_BASE}/directions/json`, () => {
            return HttpResponse.json(mockDirectionsResult);
          })
        );

        const mcpServer = createGoogleMapsServer({ apiKey: 'test-api-key' });
        const tools = extractToolsFromServer(mcpServer);

        const actual = await tools.maps_directions?.handler({
          origin: 'San Francisco, CA',
          destination: 'Mountain View, CA',
          mode: 'driving',
        });

        expect(actual).toContain('San Francisco, CA, USA');
        expect(actual).toContain('Mountain View, CA, USA');
        expect(actual).toContain('42.0 mi');
        expect(actual).toContain('45 mins');
      });
    });
  });
});

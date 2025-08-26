import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { DuffelConnectorConfig } from './duffel';

const server = setupServer(
  // Mock search airports
  http.get('https://api.duffel.com/air/airports', ({ request }) => {
    const url = new URL(request.url);
    const iataCode = url.searchParams.get('iata_code');

    if (iataCode === 'LHR') {
      return HttpResponse.json({
        data: [
          {
            id: 'arp_lhr_gb',
            name: 'Heathrow',
            iata_code: 'LHR',
            icao_code: 'EGLL',
            city_name: 'London',
            country_code: 'GB',
            latitude: 51.4775,
            longitude: -0.461389,
            time_zone: 'Europe/London',
          },
        ],
      });
    }

    return HttpResponse.json({ data: [] });
  }),

  // Mock list airlines
  http.get('https://api.duffel.com/air/airlines', () => {
    return HttpResponse.json({
      data: [
        {
          id: 'aln_00009VME7DBKeMags5CliQ',
          name: 'British Airways',
          iata_code: 'BA',
          logo_symbol_url:
            'https://assets.duffel.com/img/airlines/for-light-background/full-color-logo/BA.svg',
          logo_lockup_url:
            'https://assets.duffel.com/img/airlines/for-light-background/full-color-lockup/BA.svg',
        },
      ],
    });
  }),

  // Mock create offer request
  http.post('https://api.duffel.com/air/offer_requests', async ({ request }) => {
    const body = (await request.json()) as {
      data: {
        slices: unknown;
        passengers: unknown;
        cabin_class: unknown;
        return_offers: unknown;
      };
    };

    return HttpResponse.json({
      data: {
        id: 'orq_0000A3vUda8dKpkfGF4U39',
        slices: body.data.slices,
        passengers: body.data.passengers,
        cabin_class: body.data.cabin_class,
        return_offers: body.data.return_offers,
      },
    });
  }),

  // Mock list offers
  http.get('https://api.duffel.com/air/offers', ({ request }) => {
    const url = new URL(request.url);
    const offerRequestId = url.searchParams.get('offer_request_id');

    if (offerRequestId) {
      return HttpResponse.json({
        data: [
          {
            id: 'off_0000A3vUda8dKpkfGF4U40',
            total_amount: '460.00',
            total_currency: 'GBP',
            tax_amount: '92.00',
            tax_currency: 'GBP',
            base_amount: '368.00',
            base_currency: 'GBP',
            slices: [
              {
                id: 'sli_0000A3vUda8dKpkfGF4U41',
                segments: [
                  {
                    id: 'seg_0000A3vUda8dKpkfGF4U42',
                    origin: {
                      id: 'arp_lhr_gb',
                      name: 'Heathrow',
                      iata_code: 'LHR',
                      icao_code: 'EGLL',
                      city_name: 'London',
                      country_code: 'GB',
                      latitude: 51.4775,
                      longitude: -0.461389,
                      time_zone: 'Europe/London',
                    },
                    destination: {
                      id: 'arp_jfk_us',
                      name: 'John F Kennedy International',
                      iata_code: 'JFK',
                      icao_code: 'KJFK',
                      city_name: 'New York',
                      country_code: 'US',
                      latitude: 40.6413,
                      longitude: -73.7781,
                      time_zone: 'America/New_York',
                    },
                    departure_datetime: '2024-09-15T10:30:00',
                    arrival_datetime: '2024-09-15T14:25:00',
                    duration: 'PT7H55M',
                    marketing_carrier: {
                      id: 'aln_00009VME7DBKeMags5CliQ',
                      name: 'British Airways',
                      iata_code: 'BA',
                    },
                    operating_carrier: {
                      id: 'aln_00009VME7DBKeMags5CliQ',
                      name: 'British Airways',
                      iata_code: 'BA',
                    },
                    marketing_carrier_flight_number: '175',
                    operating_carrier_flight_number: '175',
                  },
                ],
              },
            ],
            owner: {
              id: 'aln_00009VME7DBKeMags5CliQ',
              name: 'British Airways',
              iata_code: 'BA',
            },
            expires_at: '2024-09-14T10:30:00',
            updated_at: '2024-09-13T10:30:00',
          },
        ],
      });
    }

    return HttpResponse.json({ data: [] });
  }),

  // Mock get offer
  http.get('https://api.duffel.com/air/offers/:offerId', ({ params }) => {
    const { offerId } = params;

    if (offerId === 'off_0000A3vUda8dKpkfGF4U40') {
      return HttpResponse.json({
        data: {
          id: 'off_0000A3vUda8dKpkfGF4U40',
          total_amount: '460.00',
          total_currency: 'GBP',
          slices: [],
          owner: {
            id: 'aln_00009VME7DBKeMags5CliQ',
            name: 'British Airways',
            iata_code: 'BA',
          },
          expires_at: '2024-09-14T10:30:00',
          updated_at: '2024-09-13T10:30:00',
        },
      });
    }

    return HttpResponse.json({ error: 'Not found' }, { status: 404 });
  }),

  // Mock create order
  http.post('https://api.duffel.com/air/orders', async ({ request }) => {
    const body = (await request.json()) as { data: { passengers: unknown } };

    return HttpResponse.json({
      data: {
        id: 'ord_0000A3vUda8dKpkfGF4U50',
        booking_reference: 'ABC123',
        total_amount: '460.00',
        total_currency: 'GBP',
        passengers: body.data.passengers,
        slices: [
          {
            id: 'sli_0000A3vUda8dKpkfGF4U41',
            segments: [
              {
                id: 'seg_0000A3vUda8dKpkfGF4U42',
                origin: {
                  id: 'arp_lhr_gb',
                  name: 'Heathrow',
                  iata_code: 'LHR',
                  icao_code: 'EGLL',
                  city_name: 'London',
                  country_code: 'GB',
                  latitude: 51.4775,
                  longitude: -0.461389,
                  time_zone: 'Europe/London',
                },
                destination: {
                  id: 'arp_jfk_us',
                  name: 'John F Kennedy International',
                  iata_code: 'JFK',
                  icao_code: 'KJFK',
                  city_name: 'New York',
                  country_code: 'US',
                  latitude: 40.6413,
                  longitude: -73.7781,
                  time_zone: 'America/New_York',
                },
                departure_datetime: '2024-09-15T10:30:00',
                arrival_datetime: '2024-09-15T14:25:00',
                marketing_carrier: {
                  id: 'aln_00009VME7DBKeMags5CliQ',
                  name: 'British Airways',
                  iata_code: 'BA',
                },
                marketing_carrier_flight_number: '175',
              },
            ],
          },
        ],
        created_at: '2024-09-13T10:30:00',
        updated_at: '2024-09-13T10:30:00',
      },
    });
  }),

  // Mock get order
  http.get('https://api.duffel.com/air/orders/:orderId', ({ params }) => {
    const { orderId } = params;

    if (orderId === 'ord_0000A3vUda8dKpkfGF4U50') {
      return HttpResponse.json({
        data: {
          id: 'ord_0000A3vUda8dKpkfGF4U50',
          booking_reference: 'ABC123',
          total_amount: '460.00',
          total_currency: 'GBP',
          passengers: [
            {
              id: 'pas_0000A3vUda8dKpkfGF4U51',
              given_name: 'John',
              family_name: 'Doe',
              email: 'john@example.com',
              type: 'adult',
            },
          ],
          slices: [],
          created_at: '2024-09-13T10:30:00',
          updated_at: '2024-09-13T10:30:00',
        },
      });
    }

    return HttpResponse.json({ error: 'Not found' }, { status: 404 });
  }),

  // Mock list orders
  http.get('https://api.duffel.com/air/orders', () => {
    return HttpResponse.json({
      data: [
        {
          id: 'ord_0000A3vUda8dKpkfGF4U50',
          booking_reference: 'ABC123',
          total_amount: '460.00',
          total_currency: 'GBP',
          passengers: [
            {
              id: 'pas_0000A3vUda8dKpkfGF4U51',
              given_name: 'John',
              family_name: 'Doe',
              email: 'john@example.com',
              type: 'adult',
            },
          ],
          slices: [],
          created_at: '2024-09-13T10:30:00',
          updated_at: '2024-09-13T10:30:00',
        },
      ],
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('#DuffelConnector', () => {
  describe('.SEARCH_AIRPORTS', () => {
    describe('when valid IATA code is provided', () => {
      it('returns matching airports', async () => {
        const tool = DuffelConnectorConfig.tools.SEARCH_AIRPORTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials.mockResolvedValue({ token: 'test-token' });

        const actual = await tool.handler({ query: 'LHR' }, mockContext);

        expect(actual).toEqual({
          airports: [
            {
              id: 'arp_lhr_gb',
              name: 'Heathrow',
              iata_code: 'LHR',
              icao_code: 'EGLL',
              city_name: 'London',
              country_code: 'GB',
              latitude: 51.4775,
              longitude: -0.461389,
              time_zone: 'Europe/London',
            },
          ],
          count: 1,
          query: 'LHR',
        });
      });
    });

    describe('when invalid IATA code is provided', () => {
      it('returns empty results', async () => {
        const tool = DuffelConnectorConfig.tools.SEARCH_AIRPORTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials.mockResolvedValue({ token: 'test-token' });

        const actual = await tool.handler({ query: 'XXX' }, mockContext);

        expect(actual).toEqual({
          airports: [],
          count: 0,
          query: 'XXX',
        });
      });
    });
  });

  describe('.LIST_AIRLINES', () => {
    describe('when called', () => {
      it('returns list of available airlines', async () => {
        const tool = DuffelConnectorConfig.tools.LIST_AIRLINES as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials.mockResolvedValue({ token: 'test-token' });

        const actual = await tool.handler({}, mockContext);

        expect(actual).toEqual({
          airlines: [
            {
              id: 'aln_00009VME7DBKeMags5CliQ',
              name: 'British Airways',
              iata_code: 'BA',
              logo_symbol_url:
                'https://assets.duffel.com/img/airlines/for-light-background/full-color-logo/BA.svg',
              logo_lockup_url:
                'https://assets.duffel.com/img/airlines/for-light-background/full-color-lockup/BA.svg',
            },
          ],
          count: 1,
        });
      });
    });
  });

  describe('.SEARCH_FLIGHTS', () => {
    describe('when valid flight search parameters are provided', () => {
      it('creates offer request and returns offers', async () => {
        const tool = DuffelConnectorConfig.tools.SEARCH_FLIGHTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials.mockResolvedValue({ token: 'test-token' });

        const actual = await tool.handler(
          {
            slices: [
              {
                origin: 'LHR',
                destination: 'JFK',
                departure_date: '2024-09-15',
              },
            ],
            passengers: [{ type: 'adult' }, { type: 'adult' }],
            cabin_class: 'economy',
            return_offers: true,
          },
          mockContext
        );

        expect(actual.offer_request).toEqual({
          id: 'orq_0000A3vUda8dKpkfGF4U39',
          slices: [
            {
              origin: 'LHR',
              destination: 'JFK',
              departure_date: '2024-09-15',
            },
          ],
          passengers: [{ type: 'adult' }, { type: 'adult' }],
          cabin_class: 'economy',
          return_offers: true,
        });
        expect(actual.offers).toBeDefined();
        expect(actual.offers_count).toBeGreaterThanOrEqual(0);
      });
    });

    describe('when return_offers is false', () => {
      it('creates offer request without returning offers', async () => {
        const tool = DuffelConnectorConfig.tools.SEARCH_FLIGHTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials.mockResolvedValue({ token: 'test-token' });

        const actual = await tool.handler(
          {
            slices: [
              {
                origin: 'LHR',
                destination: 'JFK',
                departure_date: '2024-09-15',
              },
            ],
            passengers: [{ type: 'adult' }],
            return_offers: false,
          },
          mockContext
        );

        expect(actual.offers).toEqual([]);
        expect(actual.offers_count).toBe(0);
      });
    });
  });

  describe('.GET_OFFERS', () => {
    describe('when valid offer request ID is provided', () => {
      it('returns flight offers', async () => {
        const tool = DuffelConnectorConfig.tools.GET_OFFERS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials.mockResolvedValue({ token: 'test-token' });

        const actual = await tool.handler(
          {
            offer_request_id: 'orq_0000A3vUda8dKpkfGF4U39',
            limit: 20,
          },
          mockContext
        );

        expect(actual.offers).toHaveLength(1);
        expect(actual.offers[0]).toEqual({
          id: 'off_0000A3vUda8dKpkfGF4U40',
          total_amount: '460.00',
          total_currency: 'GBP',
          tax_amount: '92.00',
          tax_currency: 'GBP',
          base_amount: '368.00',
          base_currency: 'GBP',
          slices: expect.any(Array),
          owner: expect.objectContaining({
            name: 'British Airways',
            iata_code: 'BA',
          }),
          expires_at: '2024-09-14T10:30:00',
          updated_at: '2024-09-13T10:30:00',
        });
        expect(actual.count).toBe(1);
      });
    });
  });

  describe('.GET_OFFER', () => {
    describe('when valid offer ID is provided', () => {
      it('returns offer details', async () => {
        const tool = DuffelConnectorConfig.tools.GET_OFFER as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials.mockResolvedValue({ token: 'test-token' });

        const actual = await tool.handler(
          {
            offer_id: 'off_0000A3vUda8dKpkfGF4U40',
          },
          mockContext
        );

        expect(actual).toEqual({
          id: 'off_0000A3vUda8dKpkfGF4U40',
          total_amount: '460.00',
          total_currency: 'GBP',
          slices: [],
          owner: {
            id: 'aln_00009VME7DBKeMags5CliQ',
            name: 'British Airways',
            iata_code: 'BA',
          },
          expires_at: '2024-09-14T10:30:00',
          updated_at: '2024-09-13T10:30:00',
        });
      });
    });

    describe('when invalid offer ID is provided', () => {
      it('throws error', async () => {
        const tool = DuffelConnectorConfig.tools.GET_OFFER as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials.mockResolvedValue({ token: 'test-token' });

        await expect(
          tool.handler(
            {
              offer_id: 'invalid-offer-id',
            },
            mockContext
          )
        ).rejects.toThrow('Failed to get offer');
      });
    });
  });

  describe('.CREATE_ORDER', () => {
    describe('when valid order parameters are provided', () => {
      it('creates and returns order', async () => {
        const tool = DuffelConnectorConfig.tools.CREATE_ORDER as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials.mockResolvedValue({ token: 'test-token' });

        const actual = await tool.handler(
          {
            selected_offers: ['off_0000A3vUda8dKpkfGF4U40'],
            passengers: [
              {
                given_name: 'John',
                family_name: 'Doe',
                email: 'john@example.com',
                type: 'adult',
              },
            ],
          },
          mockContext
        );

        expect(actual).toEqual({
          id: 'ord_0000A3vUda8dKpkfGF4U50',
          booking_reference: 'ABC123',
          total_amount: '460.00',
          total_currency: 'GBP',
          passengers: [
            {
              given_name: 'John',
              family_name: 'Doe',
              email: 'john@example.com',
              type: 'adult',
            },
          ],
          slices: expect.any(Array),
          created_at: '2024-09-13T10:30:00',
          updated_at: '2024-09-13T10:30:00',
        });
      });
    });
  });

  describe('.GET_ORDER', () => {
    describe('when valid order ID is provided', () => {
      it('returns order details', async () => {
        const tool = DuffelConnectorConfig.tools.GET_ORDER as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials.mockResolvedValue({ token: 'test-token' });

        const actual = await tool.handler(
          {
            order_id: 'ord_0000A3vUda8dKpkfGF4U50',
          },
          mockContext
        );

        expect(actual).toEqual({
          id: 'ord_0000A3vUda8dKpkfGF4U50',
          booking_reference: 'ABC123',
          total_amount: '460.00',
          total_currency: 'GBP',
          passengers: [
            {
              id: 'pas_0000A3vUda8dKpkfGF4U51',
              given_name: 'John',
              family_name: 'Doe',
              email: 'john@example.com',
              type: 'adult',
            },
          ],
          slices: [],
          created_at: '2024-09-13T10:30:00',
          updated_at: '2024-09-13T10:30:00',
        });
      });
    });

    describe('when invalid order ID is provided', () => {
      it('throws error', async () => {
        const tool = DuffelConnectorConfig.tools.GET_ORDER as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials.mockResolvedValue({ token: 'test-token' });

        await expect(
          tool.handler(
            {
              order_id: 'invalid-order-id',
            },
            mockContext
          )
        ).rejects.toThrow('Failed to get order');
      });
    });
  });

  describe('.LIST_ORDERS', () => {
    describe('when called', () => {
      it('returns list of orders', async () => {
        const tool = DuffelConnectorConfig.tools.LIST_ORDERS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials.mockResolvedValue({ token: 'test-token' });

        const actual = await tool.handler(
          {
            limit: 20,
          },
          mockContext
        );

        expect(actual.orders).toHaveLength(1);
        expect(actual.orders[0]).toEqual({
          id: 'ord_0000A3vUda8dKpkfGF4U50',
          booking_reference: 'ABC123',
          total_amount: '460.00',
          total_currency: 'GBP',
          passengers: [
            {
              id: 'pas_0000A3vUda8dKpkfGF4U51',
              given_name: 'John',
              family_name: 'Doe',
              email: 'john@example.com',
              type: 'adult',
            },
          ],
          slices: [],
          created_at: '2024-09-13T10:30:00',
          updated_at: '2024-09-13T10:30:00',
        });
        expect(actual.count).toBe(1);
      });
    });
  });
});

import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

// Base API URL
const DUFFEL_BASE_URL = 'https://api.duffel.com';

// Core interfaces based on Duffel's API
interface DuffelAirport {
  id: string;
  name: string;
  iata_code: string;
  icao_code: string;
  city_name: string;
  country_code: string;
  latitude: number;
  longitude: number;
  time_zone: string;
}

interface DuffelAirline {
  id: string;
  name: string;
  iata_code: string;
  conditions_of_carriage_url?: string;
  logo_lockup_url?: string;
  logo_symbol_url?: string;
}

interface DuffelOfferRequest {
  id: string;
  slices: Array<{
    origin: string;
    destination: string;
    departure_date: string;
    departure_time?: string;
  }>;
  passengers: Array<{
    type: 'adult' | 'child' | 'infant_without_seat';
  }>;
  cabin_class?: 'first' | 'business' | 'premium_economy' | 'economy';
  return_offers?: boolean;
}

interface DuffelOffer {
  id: string;
  total_amount: string;
  total_currency: string;
  tax_amount?: string;
  tax_currency?: string;
  base_amount?: string;
  base_currency?: string;
  slices: Array<{
    id: string;
    segments: Array<{
      id: string;
      origin: DuffelAirport;
      destination: DuffelAirport;
      departure_datetime: string;
      arrival_datetime: string;
      duration: string;
      marketing_carrier: DuffelAirline;
      operating_carrier: DuffelAirline;
      marketing_carrier_flight_number: string;
      operating_carrier_flight_number: string;
    }>;
  }>;
  owner: DuffelAirline;
  expires_at: string;
  updated_at: string;
}

interface DuffelOrder {
  id: string;
  booking_reference: string;
  total_amount: string;
  total_currency: string;
  passengers: Array<{
    id: string;
    given_name: string;
    family_name: string;
    email: string;
    phone_number?: string;
    born_on?: string;
    type: 'adult' | 'child' | 'infant_without_seat';
  }>;
  slices: Array<{
    id: string;
    segments: Array<{
      id: string;
      origin: DuffelAirport;
      destination: DuffelAirport;
      departure_datetime: string;
      arrival_datetime: string;
      marketing_carrier: DuffelAirline;
      marketing_carrier_flight_number: string;
    }>;
  }>;
  created_at: string;
  updated_at: string;
}

class DuffelClient {
  private token: string;
  private baseUrl: string;

  constructor(token: string, baseUrl = DUFFEL_BASE_URL) {
    this.token = token;
    this.baseUrl = baseUrl;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'MCP-Duffel-Connector/1.0.0',
      'Duffel-Version': 'v1',
    };
  }

  async searchAirports(query: string): Promise<DuffelAirport[]> {
    const url = new URL(`${this.baseUrl}/air/airports`);
    url.searchParams.append('iata_code', query.toUpperCase());

    const response = await fetch(url.toString(), {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Duffel API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  }

  async listAirlines(): Promise<DuffelAirline[]> {
    const response = await fetch(`${this.baseUrl}/air/airlines`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Duffel API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  }

  async createOfferRequest(params: {
    slices: Array<{
      origin: string;
      destination: string;
      departure_date: string;
      departure_time?: string;
    }>;
    passengers: Array<{
      type: 'adult' | 'child' | 'infant_without_seat';
    }>;
    cabin_class?: 'first' | 'business' | 'premium_economy' | 'economy';
    return_offers?: boolean;
  }): Promise<DuffelOfferRequest> {
    const response = await fetch(`${this.baseUrl}/air/offer_requests`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ data: params }),
    });

    if (!response.ok) {
      throw new Error(`Duffel API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  async listOffers(offerRequestId: string, limit = 20): Promise<DuffelOffer[]> {
    const url = new URL(`${this.baseUrl}/air/offers`);
    url.searchParams.append('offer_request_id', offerRequestId);
    url.searchParams.append('limit', limit.toString());

    const response = await fetch(url.toString(), {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Duffel API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  }

  async getOffer(offerId: string): Promise<DuffelOffer> {
    const response = await fetch(`${this.baseUrl}/air/offers/${offerId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Duffel API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  async createOrder(params: {
    selected_offers: string[];
    passengers: Array<{
      given_name: string;
      family_name: string;
      email: string;
      phone_number?: string;
      born_on?: string;
      type: 'adult' | 'child' | 'infant_without_seat';
    }>;
    payments?: Array<{
      type: 'balance';
      amount: string;
      currency: string;
    }>;
  }): Promise<DuffelOrder> {
    const response = await fetch(`${this.baseUrl}/air/orders`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ data: params }),
    });

    if (!response.ok) {
      throw new Error(`Duffel API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  async getOrder(orderId: string): Promise<DuffelOrder> {
    const response = await fetch(`${this.baseUrl}/air/orders/${orderId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Duffel API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  async listOrders(limit = 20): Promise<DuffelOrder[]> {
    const url = new URL(`${this.baseUrl}/air/orders`);
    url.searchParams.append('limit', limit.toString());

    const response = await fetch(url.toString(), {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Duffel API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  }
}

export const DuffelConnectorConfig = mcpConnectorConfig({
  name: 'Duffel',
  key: 'duffel',
  version: '1.0.0',
  credentials: z.object({
    token: z.string().describe('Your Duffel API token (get from https://app.duffel.com)'),
  }),
  setup: z.object({
    environment: z
      .enum(['test', 'live'])
      .default('test')
      .describe('API environment (test for sandbox, live for production)'),
  }),
  logo: 'https://assets.duffel.com/img/logos/duffel-logo-lockup-black.svg',
  examplePrompt:
    'Search for flights from LHR to JFK on 2024-09-15 for 2 adults, then show me the cheapest options',
  tools: (tool) => ({
    SEARCH_AIRPORTS: tool({
      name: 'search_airports',
      description: 'Search for airports by IATA code, city, or airport name',
      schema: z.object({
        query: z
          .string()
          .describe('Search query (IATA code, city name, or airport name)'),
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new DuffelClient(credentials.token);

        try {
          const airports = await client.searchAirports(args.query);
          return {
            airports,
            count: airports.length,
            query: args.query,
          };
        } catch (error) {
          throw new Error(
            `Failed to search airports: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      },
    }),

    LIST_AIRLINES: tool({
      name: 'list_airlines',
      description: 'Get list of available airlines',
      schema: z.object({}),
      handler: async (_args, context) => {
        const credentials = await context.getCredentials();
        const client = new DuffelClient(credentials.token);

        try {
          const airlines = await client.listAirlines();
          return {
            airlines,
            count: airlines.length,
          };
        } catch (error) {
          throw new Error(
            `Failed to list airlines: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      },
    }),

    SEARCH_FLIGHTS: tool({
      name: 'search_flights',
      description: 'Search for flight offers by creating an offer request',
      schema: z.object({
        slices: z
          .array(
            z.object({
              origin: z.string().describe('Origin airport IATA code (e.g., "LHR")'),
              destination: z
                .string()
                .describe('Destination airport IATA code (e.g., "JFK")'),
              departure_date: z.string().describe('Departure date in YYYY-MM-DD format'),
              departure_time: z
                .string()
                .optional()
                .describe('Preferred departure time in HH:MM format (optional)'),
            })
          )
          .min(1)
          .describe('Flight slices (outbound and optionally return)'),
        passengers: z
          .array(
            z.object({
              type: z
                .enum(['adult', 'child', 'infant_without_seat'])
                .describe('Passenger type'),
            })
          )
          .min(1)
          .describe('Passengers for the booking'),
        cabin_class: z
          .enum(['first', 'business', 'premium_economy', 'economy'])
          .optional()
          .describe('Preferred cabin class'),
        return_offers: z
          .boolean()
          .default(true)
          .describe('Whether to return offers immediately'),
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new DuffelClient(credentials.token);

        try {
          const offerRequest = await client.createOfferRequest(args);
          let offers: DuffelOffer[] = [];

          if (args.return_offers) {
            offers = await client.listOffers(offerRequest.id);
          }

          return {
            offer_request: offerRequest,
            offers,
            offers_count: offers.length,
          };
        } catch (error) {
          throw new Error(
            `Failed to search flights: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      },
    }),

    GET_OFFERS: tool({
      name: 'get_offers',
      description: 'Get flight offers for a specific offer request',
      schema: z.object({
        offer_request_id: z.string().describe('ID of the offer request'),
        limit: z
          .number()
          .min(1)
          .max(200)
          .default(20)
          .describe('Maximum number of offers to return'),
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new DuffelClient(credentials.token);

        try {
          const offers = await client.listOffers(args.offer_request_id, args.limit);
          return {
            offers,
            count: offers.length,
            offer_request_id: args.offer_request_id,
          };
        } catch (error) {
          throw new Error(
            `Failed to get offers: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      },
    }),

    GET_OFFER: tool({
      name: 'get_offer',
      description: 'Get detailed information about a specific flight offer',
      schema: z.object({
        offer_id: z.string().describe('ID of the flight offer'),
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new DuffelClient(credentials.token);

        try {
          const offer = await client.getOffer(args.offer_id);
          return offer;
        } catch (error) {
          throw new Error(
            `Failed to get offer: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      },
    }),

    CREATE_ORDER: tool({
      name: 'create_order',
      description: 'Create a flight booking order from selected offers',
      schema: z.object({
        selected_offers: z.array(z.string()).min(1).describe('List of offer IDs to book'),
        passengers: z
          .array(
            z.object({
              given_name: z.string().describe('Passenger first name'),
              family_name: z.string().describe('Passenger last name'),
              email: z.string().email().describe('Passenger email address'),
              phone_number: z.string().optional().describe('Passenger phone number'),
              born_on: z
                .string()
                .optional()
                .describe('Passenger birth date in YYYY-MM-DD format'),
              type: z
                .enum(['adult', 'child', 'infant_without_seat'])
                .describe('Passenger type'),
            })
          )
          .min(1)
          .describe('Passenger information'),
        payments: z
          .array(
            z.object({
              type: z.literal('balance').describe('Payment type'),
              amount: z.string().describe('Payment amount'),
              currency: z.string().describe('Payment currency'),
            })
          )
          .optional()
          .describe('Payment information (optional for some bookings)'),
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new DuffelClient(credentials.token);

        try {
          const order = await client.createOrder(args);
          return order;
        } catch (error) {
          throw new Error(
            `Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      },
    }),

    GET_ORDER: tool({
      name: 'get_order',
      description: 'Get details of a specific flight booking order',
      schema: z.object({
        order_id: z.string().describe('ID of the order'),
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new DuffelClient(credentials.token);

        try {
          const order = await client.getOrder(args.order_id);
          return order;
        } catch (error) {
          throw new Error(
            `Failed to get order: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      },
    }),

    LIST_ORDERS: tool({
      name: 'list_orders',
      description: 'List all flight booking orders',
      schema: z.object({
        limit: z
          .number()
          .min(1)
          .max(200)
          .default(20)
          .describe('Maximum number of orders to return'),
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new DuffelClient(credentials.token);

        try {
          const orders = await client.listOrders(args.limit);
          return {
            orders,
            count: orders.length,
          };
        } catch (error) {
          throw new Error(
            `Failed to list orders: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      },
    }),
  }),
});

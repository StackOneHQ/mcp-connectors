import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { createMockConnectorContext } from '../__mocks__/context';
import { PolymarketConnectorConfig } from './polymarket';

// Setup MSW server for API mocking
const server = setupServer(
  http.get('https://gamma-api.polymarket.com/markets', () => {
    return HttpResponse.json({
      data: [
        {
          id: 'market-1',
          question: 'Will Bitcoin reach $100k by end of 2024?',
          outcomes: [
            { id: 'yes', name: 'Yes', probability: 0.65 },
            { id: 'no', name: 'No', probability: 0.35 },
          ],
          liquidity: 50000,
          status: 'open',
        },
      ],
    });
  }),
  http.get('https://gamma-api.polymarket.com/markets/market-1', () => {
    return HttpResponse.json({
      data: {
        id: 'market-1',
        question: 'Will Bitcoin reach $100k by end of 2024?',
        outcomes: [
          { id: 'yes', name: 'Yes', probability: 0.65 },
          { id: 'no', name: 'No', probability: 0.35 },
        ],
        liquidity: 50000,
        status: 'open',
        category: 'crypto',
      },
    });
  }),
  http.get('https://gamma-api.polymarket.com/markets/search', () => {
    return HttpResponse.json({
      data: [
        {
          id: 'market-1',
          question: 'Bitcoin price prediction',
          outcomes: [
            { id: 'yes', name: 'Yes', probability: 0.65 },
            { id: 'no', name: 'No', probability: 0.35 },
          ],
          liquidity: 50000,
          status: 'open',
        },
      ],
    });
  }),
  http.get('https://gamma-api.polymarket.com/markets/trending', () => {
    return HttpResponse.json({
      data: [
        {
          id: 'trending-1',
          question: 'Trending market question',
          outcomes: [
            { id: 'yes', name: 'Yes', probability: 0.75 },
            { id: 'no', name: 'No', probability: 0.25 },
          ],
          liquidity: 100000,
          status: 'open',
        },
      ],
    });
  }),
  http.get('https://gamma-api.polymarket.com/user/profile', () => {
    return HttpResponse.json({
      data: {
        id: 'user-1',
        username: 'testuser',
        balance: 1000,
        totalPnL: 250,
        positions: [],
      },
    });
  }),
  http.get('https://gamma-api.polymarket.com/user/positions', () => {
    return HttpResponse.json({
      data: [
        {
          marketId: 'market-1',
          outcomeId: 'yes',
          amount: 100,
          averagePrice: 0.65,
          unrealizedPnL: 50,
        },
      ],
    });
  }),
  http.get('https://gamma-api.polymarket.com/user/trades', () => {
    return HttpResponse.json({
      data: [
        {
          id: 'trade-1',
          marketId: 'market-1',
          outcomeId: 'yes',
          side: 'buy',
          amount: 100,
          price: 0.65,
          timestamp: '2024-01-01T12:00:00Z',
          status: 'filled',
        },
      ],
    });
  })
);

describe('#PolymarketConnector', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe('.GET_MARKETS', () => {
    describe('when API call succeeds', () => {
      describe('and markets are returned', () => {
        it('returns formatted markets list', async () => {
          const tool = PolymarketConnectorConfig.tools.GET_MARKETS as MCPToolDefinition;
          const mockContext = createMockConnectorContext({
            apiKey: 'test-api-key',
          });

          const actual = await tool.handler({ limit: 10 }, mockContext);

          expect(actual).toContain('Found 1 markets:');
          expect(actual).toContain('Will Bitcoin reach $100k by end of 2024?');
          expect(actual).toContain('Yes (65.0%)');
        });
      });

      describe('and no markets are returned', () => {
        it('returns no markets message', async () => {
          server.use(
            http.get('https://gamma-api.polymarket.com/markets', () => {
              return HttpResponse.json({ data: [] });
            })
          );

          const tool = PolymarketConnectorConfig.tools.GET_MARKETS as MCPToolDefinition;
          const mockContext = createMockConnectorContext({
            apiKey: 'test-api-key',
          });

          const actual = await tool.handler({ limit: 10 }, mockContext);

          expect(actual).toBe('No markets found matching your criteria.');
        });
      });
    });

    describe('when API call fails', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://gamma-api.polymarket.com/markets', () => {
            return new HttpResponse(null, { status: 500 });
          })
        );

        const tool = PolymarketConnectorConfig.tools.GET_MARKETS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          apiKey: 'test-api-key',
        });

        const actual = await tool.handler({ limit: 10 }, mockContext);

        expect(actual).toContain('Failed to get markets:');
        expect(actual).toContain('500');
      });
    });
  });

  describe('.GET_MARKET', () => {
    describe('when API call succeeds', () => {
      it('returns formatted market details', async () => {
        const tool = PolymarketConnectorConfig.tools.GET_MARKET as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          apiKey: 'test-api-key',
        });

        const actual = await tool.handler({ marketId: 'market-1' }, mockContext);

        expect(actual).toContain('Market: Will Bitcoin reach $100k by end of 2024?');
        expect(actual).toContain('ID: market-1');
        expect(actual).toContain('Status: open');
        expect(actual).toContain('Liquidity: $50,000');
        expect(actual).toContain('Category: crypto');
        expect(actual).toContain('• Yes: 65.0%');
        expect(actual).toContain('• No: 35.0%');
      });
    });

    describe('when API call fails', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://gamma-api.polymarket.com/markets/market-1', () => {
            return new HttpResponse(null, { status: 404 });
          })
        );

        const tool = PolymarketConnectorConfig.tools.GET_MARKET as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          apiKey: 'test-api-key',
        });

        const actual = await tool.handler({ marketId: 'market-1' }, mockContext);

        expect(actual).toContain('Failed to get market:');
        expect(actual).toContain('404');
      });
    });
  });

  describe('.SEARCH_MARKETS', () => {
    describe('when API call succeeds', () => {
      it('returns formatted search results', async () => {
        const tool = PolymarketConnectorConfig.tools.SEARCH_MARKETS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          apiKey: 'test-api-key',
        });

        const actual = await tool.handler({ query: 'bitcoin', limit: 5 }, mockContext);

        expect(actual).toContain('Found 1 markets:');
        expect(actual).toContain('Bitcoin price prediction');
      });
    });
  });

  describe('.GET_TRENDING_MARKETS', () => {
    describe('when API call succeeds', () => {
      it('returns formatted trending markets', async () => {
        const tool = PolymarketConnectorConfig.tools.GET_TRENDING_MARKETS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          apiKey: 'test-api-key',
        });

        const actual = await tool.handler({ limit: 5 }, mockContext);

        expect(actual).toContain('Found 1 markets:');
        expect(actual).toContain('Trending market question');
        expect(actual).toContain('Yes (75.0%)');
      });
    });
  });

  describe('.GET_USER_PROFILE', () => {
    describe('when API key is provided', () => {
      describe('and API call succeeds', () => {
        it('returns formatted user profile', async () => {
          const tool = PolymarketConnectorConfig.tools.GET_USER_PROFILE as MCPToolDefinition;
          const mockContext = createMockConnectorContext({
            apiKey: 'test-api-key',
          });

          const actual = await tool.handler({}, mockContext);

          expect(actual).toContain('User Profile:');
          expect(actual).toContain('Username: testuser');
          expect(actual).toContain('Balance: $1,000');
          expect(actual).toContain('Total P&L: $250');
          expect(actual).toContain('Active Positions: 0');
        });
      });

      describe('and API call fails', () => {
        it('returns error message', async () => {
          server.use(
            http.get('https://gamma-api.polymarket.com/user/profile', () => {
              return new HttpResponse(null, { status: 401 });
            })
          );

          const tool = PolymarketConnectorConfig.tools.GET_USER_PROFILE as MCPToolDefinition;
          const mockContext = createMockConnectorContext({
            apiKey: 'test-api-key',
          });

          const actual = await tool.handler({}, mockContext);

          expect(actual).toContain('Failed to get user profile:');
          expect(actual).toContain('401');
        });
      });
    });

    describe('when API key is not provided', () => {
      it('returns API key required message', async () => {
        const tool = PolymarketConnectorConfig.tools.GET_USER_PROFILE as MCPToolDefinition;
        const mockContext = createMockConnectorContext({});

        const actual = await tool.handler({}, mockContext);

        expect(actual).toBe('API key required to access user profile. Please provide your Polymarket API key in the credentials.');
      });
    });
  });

  describe('.GET_USER_POSITIONS', () => {
    describe('when API key is provided', () => {
      describe('and user has positions', () => {
        it('returns formatted positions list', async () => {
          const tool = PolymarketConnectorConfig.tools.GET_USER_POSITIONS as MCPToolDefinition;
          const mockContext = createMockConnectorContext({
            apiKey: 'test-api-key',
          });

          const actual = await tool.handler({}, mockContext);

          expect(actual).toContain('Active Positions (1):');
          expect(actual).toContain('Market ID: market-1');
          expect(actual).toContain('Outcome ID: yes');
          expect(actual).toContain('Amount: 100');
          expect(actual).toContain('Average Price: $0.65');
          expect(actual).toContain('Unrealized P&L: $50');
        });
      });

      describe('and user has no positions', () => {
        it('returns no positions message', async () => {
          server.use(
            http.get('https://gamma-api.polymarket.com/user/positions', () => {
              return HttpResponse.json({ data: [] });
            })
          );

          const tool = PolymarketConnectorConfig.tools.GET_USER_POSITIONS as MCPToolDefinition;
          const mockContext = createMockConnectorContext({
            apiKey: 'test-api-key',
          });

          const actual = await tool.handler({}, mockContext);

          expect(actual).toBe('No active positions found.');
        });
      });
    });

    describe('when API key is not provided', () => {
      it('returns API key required message', async () => {
        const tool = PolymarketConnectorConfig.tools.GET_USER_POSITIONS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({});

        const actual = await tool.handler({}, mockContext);

        expect(actual).toBe('API key required to access user positions. Please provide your Polymarket API key in the credentials.');
      });
    });
  });

  describe('.GET_TRADE_HISTORY', () => {
    describe('when API key is provided', () => {
      describe('and user has trade history', () => {
        it('returns formatted trade history', async () => {
          const tool = PolymarketConnectorConfig.tools.GET_TRADE_HISTORY as MCPToolDefinition;
          const mockContext = createMockConnectorContext({
            apiKey: 'test-api-key',
          });

          const actual = await tool.handler({ limit: 10 }, mockContext);

          expect(actual).toContain('Recent Trades (1):');
          expect(actual).toContain('BUY 100 @ $0.65');
          expect(actual).toContain('Market: market-1');
          expect(actual).toContain('Outcome: yes');
          expect(actual).toContain('Status: filled');
        });
      });

      describe('and user has no trade history', () => {
        it('returns no trade history message', async () => {
          server.use(
            http.get('https://gamma-api.polymarket.com/user/trades', () => {
              return HttpResponse.json({ data: [] });
            })
          );

          const tool = PolymarketConnectorConfig.tools.GET_TRADE_HISTORY as MCPToolDefinition;
          const mockContext = createMockConnectorContext({
            apiKey: 'test-api-key',
          });

          const actual = await tool.handler({ limit: 10 }, mockContext);

          expect(actual).toBe('No trade history found.');
        });
      });
    });

    describe('when API key is not provided', () => {
      it('returns API key required message', async () => {
        const tool = PolymarketConnectorConfig.tools.GET_TRADE_HISTORY as MCPToolDefinition;
        const mockContext = createMockConnectorContext({});

        const actual = await tool.handler({ limit: 10 }, mockContext);

        expect(actual).toBe('API key required to access trade history. Please provide your Polymarket API key in the credentials.');
      });
    });
  });
}); 
import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

// Polymarket Gamma API Types
interface PolymarketMarket {
  id: string;
  question: string;
  description?: string;
  outcomes: PolymarketOutcome[];
  endDate?: string;
  liquidity: number;
  volume24h?: number;
  status: 'open' | 'closed' | 'settled';
  category?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  // Gamma API specific fields
  slug?: string;
  closeDate?: string;
  totalVolume?: number;
  totalLiquidity?: number;
}

interface PolymarketOutcome {
  id: string;
  name: string;
  probability: number; // Current probability (0-1)
  lastPrice?: number;
  volume24h?: number;
  liquidity?: number;
  // Gamma API specific fields
  slug?: string;
  totalVolume?: number;
  totalLiquidity?: number;
}

interface PolymarketPosition {
  marketId: string;
  outcomeId: string;
  amount: number;
  averagePrice: number;
  unrealizedPnL?: number;
  realizedPnL?: number;
}

interface PolymarketTrade {
  id: string;
  marketId: string;
  outcomeId: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: string;
  status: 'pending' | 'filled' | 'cancelled';
}

interface PolymarketUser {
  id: string;
  username?: string;
  balance: number;
  totalPnL?: number;
  positions: PolymarketPosition[];
}

// Polymarket API Client
class PolymarketClient {
  private headers: { Authorization?: string; 'Content-Type': string };
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.headers = {
      'Content-Type': 'application/json',
    };
    
    if (apiKey) {
      this.headers.Authorization = `Bearer ${apiKey}`;
    }
    
    this.baseUrl = 'https://gamma-api.polymarket.com';
  }

  async getMarkets(limit = 20, category?: string): Promise<PolymarketMarket[]> {
    let url = `${this.baseUrl}/markets?limit=${limit}`;
    if (category) {
      url += `&category=${encodeURIComponent(category)}`;
    }

    const response = await fetch(url, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Polymarket Gamma API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result.data || result;
  }

  async getMarket(marketId: string): Promise<PolymarketMarket> {
    const response = await fetch(`${this.baseUrl}/markets/${marketId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Polymarket Gamma API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result.data || result;
  }

  async searchMarkets(query: string, limit = 10): Promise<PolymarketMarket[]> {
    const response = await fetch(`${this.baseUrl}/markets/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Polymarket Gamma API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result.data || result;
  }

  async getTrendingMarkets(limit = 10): Promise<PolymarketMarket[]> {
    const response = await fetch(`${this.baseUrl}/markets/trending?limit=${limit}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Polymarket Gamma API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result.data || result;
  }

  async getUserProfile(): Promise<PolymarketUser> {
    if (!this.headers.Authorization) {
      throw new Error('API key required for user profile access');
    }

    const response = await fetch(`${this.baseUrl}/user/profile`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Polymarket Gamma API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result.data || result;
  }

  async getUserPositions(): Promise<PolymarketPosition[]> {
    if (!this.headers.Authorization) {
      throw new Error('API key required for user positions access');
    }

    const response = await fetch(`${this.baseUrl}/user/positions`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Polymarket Gamma API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result.data || result;
  }

  async getTradeHistory(limit = 20): Promise<PolymarketTrade[]> {
    if (!this.headers.Authorization) {
      throw new Error('API key required for trade history access');
    }

    const response = await fetch(`${this.baseUrl}/user/trades?limit=${limit}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Polymarket Gamma API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result.data || result;
  }
}

// Helper function to format market data for LLM consumption
const formatMarketForLLM = (market: PolymarketMarket): string => {
  const outcomes = market.outcomes
    .map(outcome => `  • ${outcome.name}: ${(outcome.probability * 100).toFixed(1)}%`)
    .join('\n');

  return `Market: ${market.question}
ID: ${market.id}
Status: ${market.status}
Liquidity: $${market.liquidity.toLocaleString()}
${market.volume24h ? `24h Volume: $${market.volume24h.toLocaleString()}` : ''}
${market.endDate ? `End Date: ${new Date(market.endDate).toLocaleDateString()}` : ''}
${market.category ? `Category: ${market.category}` : ''}

Outcomes:
${outcomes}`;
};

const formatMarketsList = (markets: PolymarketMarket[]): string => {
  if (markets.length === 0) {
    return 'No markets found matching your criteria.';
  }

  const formatted = markets.map((market, index) => {
    const topOutcome = market.outcomes.reduce((prev, current) => 
      current.probability > prev.probability ? current : prev
    );
    
    return `${index + 1}. ${market.question}
   ID: ${market.id}
   Top Outcome: ${topOutcome.name} (${(topOutcome.probability * 100).toFixed(1)}%)
   Liquidity: $${market.liquidity.toLocaleString()}
   Status: ${market.status}`;
  }).join('\n\n');

  return `Found ${markets.length} markets:\n\n${formatted}`;
};

export const PolymarketConnectorConfig = mcpConnectorConfig({
  name: 'Polymarket',
  key: 'polymarket',
  logo: 'https://stackone-logos.com/api/polymarket/filled/svg',
  version: '1.0.0',
  credentials: z.object({
    apiKey: z
      .string()
      .optional()
      .describe(
        'Polymarket Gamma API Key (optional for public data, required for user-specific data) :: https://gamma-api.polymarket.com'
      ),
  }),
  setup: z.object({}),
  examplePrompt:
    'Show me trending prediction markets and get detailed information about the market with the highest liquidity.',
  tools: (tool) => ({
    GET_MARKETS: tool({
      name: 'polymarket_get_markets',
      description: 'Get a list of prediction markets from Polymarket',
      schema: z.object({
        limit: z
          .number()
          .min(1)
          .max(100)
          .default(20)
          .describe('Maximum number of markets to return (1-100)'),
        category: z
          .string()
          .optional()
          .describe('Filter markets by category (e.g., "politics", "sports", "crypto")'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new PolymarketClient(apiKey);
          const markets = await client.getMarkets(args.limit, args.category);
          return formatMarketsList(markets);
        } catch (error) {
          return `Failed to get markets: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_MARKET: tool({
      name: 'polymarket_get_market',
      description: 'Get detailed information about a specific prediction market',
      schema: z.object({
        marketId: z.string().describe('The ID of the market to retrieve'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new PolymarketClient(apiKey);
          const market = await client.getMarket(args.marketId);
          return formatMarketForLLM(market);
        } catch (error) {
          return `Failed to get market: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    SEARCH_MARKETS: tool({
      name: 'polymarket_search_markets',
      description: 'Search for prediction markets by keyword or topic',
      schema: z.object({
        query: z.string().describe('Search query for markets'),
        limit: z
          .number()
          .min(1)
          .max(50)
          .default(10)
          .describe('Maximum number of results to return (1-50)'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new PolymarketClient(apiKey);
          const markets = await client.searchMarkets(args.query, args.limit);
          return formatMarketsList(markets);
        } catch (error) {
          return `Failed to search markets: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_TRENDING_MARKETS: tool({
      name: 'polymarket_get_trending_markets',
      description: 'Get currently trending prediction markets',
      schema: z.object({
        limit: z
          .number()
          .min(1)
          .max(50)
          .default(10)
          .describe('Maximum number of trending markets to return (1-50)'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new PolymarketClient(apiKey);
          const markets = await client.getTrendingMarkets(args.limit);
          return formatMarketsList(markets);
        } catch (error) {
          return `Failed to get trending markets: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_USER_PROFILE: tool({
      name: 'polymarket_get_user_profile',
      description: 'Get user profile information including balance and portfolio summary',
      schema: z.object({}),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          if (!apiKey) {
            return 'API key required to access user profile. Please provide your Polymarket API key in the credentials.';
          }
          
          const client = new PolymarketClient(apiKey);
          const user = await client.getUserProfile();
          
          return `User Profile:
Username: ${user.username || 'N/A'}
Balance: $${user.balance.toLocaleString()}
${user.totalPnL ? `Total P&L: $${user.totalPnL.toLocaleString()}` : ''}
Active Positions: ${user.positions.length}`;
        } catch (error) {
          return `Failed to get user profile: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_USER_POSITIONS: tool({
      name: 'polymarket_get_user_positions',
      description: 'Get user\'s current positions across all markets',
      schema: z.object({}),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          if (!apiKey) {
            return 'API key required to access user positions. Please provide your Polymarket API key in the credentials.';
          }
          
          const client = new PolymarketClient(apiKey);
          const positions = await client.getUserPositions();
          
          if (positions.length === 0) {
            return 'No active positions found.';
          }
          
          const formatted = positions.map((pos, index) => 
            `${index + 1}. Market ID: ${pos.marketId}
   Outcome ID: ${pos.outcomeId}
   Amount: ${pos.amount}
   Average Price: $${pos.averagePrice}
   ${pos.unrealizedPnL ? `Unrealized P&L: $${pos.unrealizedPnL.toLocaleString()}` : ''}`
          ).join('\n\n');
          
          return `Active Positions (${positions.length}):\n\n${formatted}`;
        } catch (error) {
          return `Failed to get user positions: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_TRADE_HISTORY: tool({
      name: 'polymarket_get_trade_history',
      description: 'Get user\'s recent trading history',
      schema: z.object({
        limit: z
          .number()
          .min(1)
          .max(100)
          .default(20)
          .describe('Maximum number of trades to return (1-100)'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          if (!apiKey) {
            return 'API key required to access trade history. Please provide your Polymarket API key in the credentials.';
          }
          
          const client = new PolymarketClient(apiKey);
          const trades = await client.getTradeHistory(args.limit);
          
          if (trades.length === 0) {
            return 'No trade history found.';
          }
          
          const formatted = trades.map((trade, index) => 
            `${index + 1}. ${trade.side.toUpperCase()} ${trade.amount} @ $${trade.price}
   Market: ${trade.marketId}
   Outcome: ${trade.outcomeId}
   Status: ${trade.status}
   Date: ${new Date(trade.timestamp).toLocaleString()}`
          ).join('\n\n');
          
          return `Recent Trades (${trades.length}):\n\n${formatted}`;
        } catch (error) {
          return `Failed to get trade history: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
}); 
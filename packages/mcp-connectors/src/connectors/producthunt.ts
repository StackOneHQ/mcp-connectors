import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

// Product Hunt API types - simplified to single interface
interface ProductHuntProduct {
  id: string;
  name: string;
  tagline: string;
  description: string;
  website?: string;
  slug: string;
  votesCount: number;
  commentsCount: number;
  featured: boolean;
  url: string;
  screenshotUrl?: string;
  logoUrl?: string;
  createdAt: string;
  featuredAt?: string;
}

// GraphQL response types
interface GraphQLError {
  message: string;
  [key: string]: unknown;
}

interface GraphQLResponse<T> {
  data: T;
  errors?: GraphQLError[];
}

// Raw GraphQL node types (matches API response exactly)
interface GraphQLPostNode {
  id: string;
  name: string;
  tagline: string;
  description: string;
  website?: string;
  slug: string;
  votesCount: number;
  commentsCount: number;
  featured: boolean;
  url: string;
  thumbnail?: { url: string };
  logo?: { url: string };
  createdAt: string;
  featuredAt?: string;
}

interface GraphQLCommentNode {
  id: string;
  body: string;
  createdAt: string;
  votesCount: number;
  user: {
    name: string;
    username: string;
    profileImage?: string;
  };
}

interface GraphQLCollectionNode {
  id: string;
  name: string;
  description: string;
  slug: string;
  url: string;
  postsCount: number; // Note: API returns postsCount, not productsCount
  followersCount: number;
  createdAt: string;
}

interface ProductHuntUser {
  id: string;
  name: string;
  username: string;
  headline?: string;
  profileImage?: string;
  url: string;
  followersCount: number;
  followingCount: number;
  makerOfCount: number;
}

interface ProductHuntComment {
  id: string;
  body: string;
  createdAt: string;
  votesCount: number;
  user: {
    name: string;
    username: string;
    profileImage?: string;
  };
}

interface ProductHuntCollection {
  id: string;
  name: string;
  description: string;
  slug: string;
  url: string;
  productsCount: number;
  followersCount: number;
  createdAt: string;
}

// GraphQL API response interfaces
interface GetProductResponse {
  post: GraphQLPostNode;
}

interface SearchPostsResponse {
  posts: {
    edges: Array<{ node: GraphQLPostNode }>;
  };
}

interface GetUserResponse {
  user: {
    id: string;
    name: string;
    username: string;
    headline?: string;
    profileImage?: string;
    url: string;
    followersCount: number;
    followingCount: number;
    makerOfCount: number;
  };
}

interface GetCommentsResponse {
  post: {
    comments: {
      edges: Array<{ node: GraphQLCommentNode }>;
    };
  };
}

interface GetCollectionsResponse {
  collections: {
    edges: Array<{ node: GraphQLCollectionNode }>;
  };
}

// Helper function to transform GraphQL post node to ProductHunt product
function transformPostNode(node: GraphQLPostNode): ProductHuntProduct {
  return {
    id: node.id,
    name: node.name,
    tagline: node.tagline,
    description: node.description,
    website: node.website,
    slug: node.slug,
    votesCount: node.votesCount,
    commentsCount: node.commentsCount,
    featured: node.featured,
    url: node.url,
    screenshotUrl: node.thumbnail?.url,
    logoUrl: node.logo?.url,
    createdAt: node.createdAt,
    featuredAt: node.featuredAt,
  };
}

// Input validation schemas
const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9-]+$/);
const usernameSchema = z
  .string()
  .min(1)
  .max(50)
  .regex(/^[a-zA-Z0-9_-]+$/);
const querySchema = z.string().min(1).max(200);
const limitSchema = z.number().int().min(1).max(100);

class ProductHuntAPI {
  private baseUrl = 'https://api.producthunt.com/v2/api/graphql';
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async makeRequest<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Product Hunt API error: ${response.status} ${response.statusText}`
      );
    }

    const result = (await response.json()) as GraphQLResponse<T>;

    if (result.errors && result.errors.length > 0) {
      const errorMessage = result.errors[0]?.message || 'Unknown GraphQL error';
      throw new Error(`GraphQL error: ${errorMessage}`);
    }

    return result.data;
  }

  async getProduct(slug: string): Promise<ProductHuntProduct> {
    // Validate input
    slugSchema.parse(slug);

    const query = `
      query getProduct($slug: String!) {
        post(slug: $slug) {
          id
          name
          tagline
          description
          website
          slug
          votesCount
          commentsCount
          featured
          url
          thumbnail {
            url
          }
          logo {
            url
          }
          createdAt
          featuredAt
        }
      }
    `;

    const data = await this.makeRequest<GetProductResponse>(query, { slug });
    return transformPostNode(data.post);
  }

  async searchProducts(query: string, limit = 10): Promise<ProductHuntProduct[]> {
    // Validate inputs
    querySchema.parse(query);
    limitSchema.parse(limit);

    const searchQuery = `
      query searchPosts($query: String!, $first: Int!) {
        posts(query: $query, first: $first) {
          edges {
            node {
              id
              name
              tagline
              description
              website
              slug
              votesCount
              commentsCount
              featured
              url
              thumbnail {
                url
              }
              logo {
                url
              }
              createdAt
              featuredAt
            }
          }
        }
      }
    `;

    const data = await this.makeRequest<SearchPostsResponse>(searchQuery, {
      query,
      first: limit,
    });

    return data.posts.edges.map((edge) => transformPostNode(edge.node));
  }

  async getFeaturedProducts(date?: string, limit = 10): Promise<ProductHuntProduct[]> {
    // Validate inputs
    limitSchema.parse(limit);
    if (date) {
      z.string().datetime().parse(date); // Validate ISO date format
    }

    const query = `
      query getFeaturedPosts($postedAfter: DateTime, $first: Int!) {
        posts(postedAfter: $postedAfter, first: $first, featured: true, order: VOTES_COUNT) {
          edges {
            node {
              id
              name
              tagline
              description
              website
              slug
              votesCount
              commentsCount
              featured
              url
              thumbnail {
                url
              }
              logo {
                url
              }
              createdAt
              featuredAt
            }
          }
        }
      }
    `;

    const variables: Record<string, unknown> = { first: limit };
    if (date) {
      variables.postedAfter = date;
    }

    const data = await this.makeRequest<SearchPostsResponse>(query, variables);
    return data.posts.edges.map((edge) => transformPostNode(edge.node));
  }

  async getUser(username: string): Promise<ProductHuntUser> {
    // Validate input
    usernameSchema.parse(username);

    const query = `
      query getUser($username: String!) {
        user(username: $username) {
          id
          name
          username
          headline
          profileImage
          url
          followersCount
          followingCount
          makerOfCount
        }
      }
    `;

    const data = await this.makeRequest<GetUserResponse>(query, { username });
    return data.user;
  }

  async getProductComments(slug: string, limit = 10): Promise<ProductHuntComment[]> {
    // Validate inputs
    slugSchema.parse(slug);
    limitSchema.parse(limit);

    const query = `
      query getPostComments($slug: String!, $first: Int!) {
        post(slug: $slug) {
          comments(first: $first) {
            edges {
              node {
                id
                body
                createdAt
                votesCount
                user {
                  name
                  username
                  profileImage
                }
              }
            }
          }
        }
      }
    `;

    const data = await this.makeRequest<GetCommentsResponse>(query, {
      slug,
      first: limit,
    });

    return data.post.comments.edges.map((edge) => edge.node);
  }

  async getCollections(limit = 10): Promise<ProductHuntCollection[]> {
    // Validate input
    limitSchema.parse(limit);

    const query = `
      query getCollections($first: Int!) {
        collections(first: $first) {
          edges {
            node {
              id
              name
              description
              slug
              url
              postsCount
              followersCount
              createdAt
            }
          }
        }
      }
    `;

    const data = await this.makeRequest<GetCollectionsResponse>(query, { first: limit });

    return data.collections.edges.map((edge) => ({
      ...edge.node,
      productsCount: edge.node.postsCount, // Transform API field name to external interface
    }));
  }
}

export const ProducthuntConnectorConfig = mcpConnectorConfig({
  name: 'Product Hunt',
  key: 'producthunt',
  version: '1.0.0',
  description:
    'Connect to Product Hunt to discover, search, and analyze products, makers, and trends',
  credentials: z.object({
    access_token: z
      .string()
      .describe(
        'Product Hunt API access token (get from https://api.producthunt.com/v2/oauth/applications)'
      ),
  }),
  setup: z.object({}),
  examplePrompt:
    'Search for AI products, get detailed information about trending products today, and find popular collections in the design space.',
  tools: (tool) => ({
    PRODUCTHUNT_GET_PRODUCT: tool({
      name: 'producthunt_get_product',
      description: 'Get detailed information about a specific product on Product Hunt',
      schema: z.object({
        slug: z
          .string()
          .describe('Product slug (from URL, e.g., "claude" for claude.ai)'),
      }),
      handler: async ({ slug }, context) => {
        try {
          const { access_token } = await context.getCredentials();
          const api = new ProductHuntAPI(access_token);
          const product = await api.getProduct(slug);
          return JSON.stringify(product, null, 2);
        } catch (error) {
          if (error instanceof z.ZodError) {
            return `Invalid input: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
          }
          return `Failed to get product: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    PRODUCTHUNT_SEARCH_PRODUCTS: tool({
      name: 'producthunt_search_products',
      description: 'Search for products on Product Hunt by name, tagline, or description',
      schema: z.object({
        query: z.string().describe('Search query (product name, keywords, etc.)'),
        limit: z
          .number()
          .optional()
          .default(10)
          .describe('Maximum number of results to return (default: 10)'),
      }),
      handler: async ({ query, limit = 10 }, context) => {
        try {
          const { access_token } = await context.getCredentials();
          const api = new ProductHuntAPI(access_token);
          const products = await api.searchProducts(query, limit);
          return JSON.stringify(products, null, 2);
        } catch (error) {
          if (error instanceof z.ZodError) {
            return `Invalid input: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
          }
          return `Failed to search products: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    PRODUCTHUNT_GET_FEATURED: tool({
      name: 'producthunt_get_featured',
      description: 'Get featured products from Product Hunt, optionally filtered by date',
      schema: z.object({
        date: z
          .string()
          .optional()
          .describe(
            'Filter products after this date (ISO format, e.g., "2024-01-01T00:00:00Z")'
          ),
        limit: z
          .number()
          .optional()
          .default(10)
          .describe('Maximum number of results to return (default: 10)'),
      }),
      handler: async ({ date, limit = 10 }, context) => {
        try {
          const { access_token } = await context.getCredentials();
          const api = new ProductHuntAPI(access_token);
          const products = await api.getFeaturedProducts(date, limit);
          return JSON.stringify(products, null, 2);
        } catch (error) {
          if (error instanceof z.ZodError) {
            return `Invalid input: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
          }
          return `Failed to get featured products: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    PRODUCTHUNT_GET_USER: tool({
      name: 'producthunt_get_user',
      description: 'Get information about a Product Hunt user or maker',
      schema: z.object({
        username: z.string().describe('Product Hunt username (without @ symbol)'),
      }),
      handler: async ({ username }, context) => {
        try {
          const { access_token } = await context.getCredentials();
          const api = new ProductHuntAPI(access_token);
          const user = await api.getUser(username);
          return JSON.stringify(user, null, 2);
        } catch (error) {
          if (error instanceof z.ZodError) {
            return `Invalid input: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
          }
          return `Failed to get user: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    PRODUCTHUNT_GET_COMMENTS: tool({
      name: 'producthunt_get_comments',
      description: 'Get comments for a specific product on Product Hunt',
      schema: z.object({
        slug: z
          .string()
          .describe('Product slug (from URL, e.g., "claude" for claude.ai)'),
        limit: z
          .number()
          .optional()
          .default(10)
          .describe('Maximum number of comments to return (default: 10)'),
      }),
      handler: async ({ slug, limit = 10 }, context) => {
        try {
          const { access_token } = await context.getCredentials();
          const api = new ProductHuntAPI(access_token);
          const comments = await api.getProductComments(slug, limit);
          return JSON.stringify(comments, null, 2);
        } catch (error) {
          if (error instanceof z.ZodError) {
            return `Invalid input: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
          }
          return `Failed to get comments: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    PRODUCTHUNT_GET_COLLECTIONS: tool({
      name: 'producthunt_get_collections',
      description: 'Get popular collections on Product Hunt',
      schema: z.object({
        limit: z
          .number()
          .optional()
          .default(10)
          .describe('Maximum number of collections to return (default: 10)'),
      }),
      handler: async ({ limit = 10 }, context) => {
        try {
          const { access_token } = await context.getCredentials();
          const api = new ProductHuntAPI(access_token);
          const collections = await api.getCollections(limit);
          return JSON.stringify(collections, null, 2);
        } catch (error) {
          if (error instanceof z.ZodError) {
            return `Invalid input: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
          }
          return `Failed to get collections: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),

  resources: (resource) => ({
    PRODUCTHUNT_TRENDING_TODAY: resource({
      name: 'producthunt_trending_today',
      uri: 'producthunt://trending/today',
      description: 'Current trending products on Product Hunt today',
      mimeType: 'application/json',
      handler: async (context) => {
        try {
          const { access_token } = await context.getCredentials();
          const api = new ProductHuntAPI(access_token);
          const today = `${new Date().toISOString().split('T')[0]}T00:00:00Z`;
          const products = await api.getFeaturedProducts(today, 20);
          return JSON.stringify(products, null, 2);
        } catch (error) {
          if (error instanceof z.ZodError) {
            return `Invalid input: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
          }
          return `Failed to get trending products: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    PRODUCTHUNT_TOP_COLLECTIONS: resource({
      name: 'producthunt_top_collections',
      uri: 'producthunt://collections/top',
      description: 'Top collections on Product Hunt',
      mimeType: 'application/json',
      handler: async (context) => {
        try {
          const { access_token } = await context.getCredentials();
          const api = new ProductHuntAPI(access_token);
          const collections = await api.getCollections(20);
          return JSON.stringify(collections, null, 2);
        } catch (error) {
          if (error instanceof z.ZodError) {
            return `Invalid input: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
          }
          return `Failed to get top collections: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

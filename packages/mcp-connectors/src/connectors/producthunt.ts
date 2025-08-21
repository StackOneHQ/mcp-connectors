import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

// Product Hunt API types
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
  postsCount: number;
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

class ProductHuntAPI {
  private baseUrl = 'https://api.producthunt.com/v2/api/graphql';
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async makeRequest(query: string, variables?: Record<string, unknown>) {
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

    const result = await response.json() as any;

    if (result.errors) {
      const errorMessage =
        Array.isArray(result.errors) && result.errors.length > 0 && result.errors[0] && typeof result.errors[0].message === 'string'
          ? result.errors[0].message
          : JSON.stringify(result.errors);
      throw new Error(`GraphQL error: ${errorMessage}`);
    }

    return result.data;
  }

  async getProduct(slug: string): Promise<ProductHuntProduct> {
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

    const data = await this.makeRequest(query, { slug });
    const post = data.post;

    return {
      id: post.id,
      name: post.name,
      tagline: post.tagline,
      description: post.description,
      website: post.website,
      slug: post.slug,
      votesCount: post.votesCount,
      commentsCount: post.commentsCount,
      featured: post.featured,
      url: post.url,
      screenshotUrl: post.thumbnail?.url,
      logoUrl: post.logo?.url,
      createdAt: post.createdAt,
      featuredAt: post.featuredAt,
    };
  }

  async searchProducts(query: string, limit = 10): Promise<ProductHuntProduct[]> {
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

    const data = await this.makeRequest(searchQuery, { query, first: limit });

    return data.posts.edges.map((edge: { node: GraphQLPostNode }) => ({
      id: edge.node.id,
      name: edge.node.name,
      tagline: edge.node.tagline,
      description: edge.node.description,
      website: edge.node.website,
      slug: edge.node.slug,
      votesCount: edge.node.votesCount,
      commentsCount: edge.node.commentsCount,
      featured: edge.node.featured,
      url: edge.node.url,
      screenshotUrl: edge.node.thumbnail?.url,
      logoUrl: edge.node.logo?.url,
      createdAt: edge.node.createdAt,
      featuredAt: edge.node.featuredAt,
    }));
  }

  async getFeaturedProducts(date?: string, limit = 10): Promise<ProductHuntProduct[]> {
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

    const data = await this.makeRequest(query, variables);

    return data.posts.edges.map((edge: { node: GraphQLPostNode }) => ({
      id: edge.node.id,
      name: edge.node.name,
      tagline: edge.node.tagline,
      description: edge.node.description,
      website: edge.node.website,
      slug: edge.node.slug,
      votesCount: edge.node.votesCount,
      commentsCount: edge.node.commentsCount,
      featured: edge.node.featured,
      url: edge.node.url,
      screenshotUrl: edge.node.thumbnail?.url,
      logoUrl: edge.node.logo?.url,
      createdAt: edge.node.createdAt,
      featuredAt: edge.node.featuredAt,
    }));
  }

  async getUser(username: string): Promise<ProductHuntUser> {
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

    const data = await this.makeRequest(query, { username });
    const user = data.user;

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      headline: user.headline,
      profileImage: user.profileImage,
      url: user.url,
      followersCount: user.followersCount,
      followingCount: user.followingCount,
      makerOfCount: user.makerOfCount,
    };
  }

  async getProductComments(slug: string, limit = 10): Promise<ProductHuntComment[]> {
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

    const data = await this.makeRequest(query, { slug, first: limit });

    return data.post.comments.edges.map((edge: { node: GraphQLCommentNode }) => ({
      id: edge.node.id,
      body: edge.node.body,
      createdAt: edge.node.createdAt,
      votesCount: edge.node.votesCount,
      user: {
        name: edge.node.user.name,
        username: edge.node.user.username,
        profileImage: edge.node.user.profileImage,
      },
    }));
  }

  async getCollections(limit = 10): Promise<ProductHuntCollection[]> {
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

    const data = await this.makeRequest(query, { first: limit });

    return data.collections.edges.map((edge: { node: GraphQLCollectionNode }) => ({
      id: edge.node.id,
      name: edge.node.name,
      description: edge.node.description,
      slug: edge.node.slug,
      url: edge.node.url,
      productsCount: edge.node.postsCount,
      followersCount: edge.node.followersCount,
      createdAt: edge.node.createdAt,
    }));
  }
}

export const ProductHuntConfig = mcpConnectorConfig({
  name: 'Product Hunt',
  description:
    'Connect to Product Hunt to discover, search, and analyze products, makers, and trends',
  credentials: {
    access_token: z
      .string()
      .describe(
        'Product Hunt API access token (get from https://api.producthunt.com/v2/oauth/applications)'
      ),
  },
  tools: {
    PRODUCTHUNT_GET_PRODUCT: {
      description: 'Get detailed information about a specific product on Product Hunt',
      parameters: z.object({
        slug: z
          .string()
          .describe('Product slug (from URL, e.g., "claude" for claude.ai)'),
      }),
      handler: async ({ slug }, { credentials }) => {
        const api = new ProductHuntAPI(credentials.access_token);
        const product = await api.getProduct(slug);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(product, null, 2),
            },
          ],
        };
      },
    },

    PRODUCTHUNT_SEARCH_PRODUCTS: {
      description: 'Search for products on Product Hunt by name, tagline, or description',
      parameters: z.object({
        query: z.string().describe('Search query (product name, keywords, etc.)'),
        limit: z
          .number()
          .optional()
          .default(10)
          .describe('Maximum number of results to return (default: 10)'),
      }),
      handler: async ({ query, limit = 10 }, { credentials }) => {
        const api = new ProductHuntAPI(credentials.access_token);
        const products = await api.searchProducts(query, limit);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(products, null, 2),
            },
          ],
        };
      },
    },

    PRODUCTHUNT_GET_FEATURED: {
      description: 'Get featured products from Product Hunt, optionally filtered by date',
      parameters: z.object({
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
      handler: async ({ date, limit = 10 }, { credentials }) => {
        const api = new ProductHuntAPI(credentials.access_token);
        const products = await api.getFeaturedProducts(date, limit);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(products, null, 2),
            },
          ],
        };
      },
    },

    PRODUCTHUNT_GET_USER: {
      description: 'Get information about a Product Hunt user or maker',
      parameters: z.object({
        username: z.string().describe('Product Hunt username (without @ symbol)'),
      }),
      handler: async ({ username }, { credentials }) => {
        const api = new ProductHuntAPI(credentials.access_token);
        const user = await api.getUser(username);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(user, null, 2),
            },
          ],
        };
      },
    },

    PRODUCTHUNT_GET_COMMENTS: {
      description: 'Get comments for a specific product on Product Hunt',
      parameters: z.object({
        slug: z
          .string()
          .describe('Product slug (from URL, e.g., "claude" for claude.ai)'),
        limit: z
          .number()
          .optional()
          .default(10)
          .describe('Maximum number of comments to return (default: 10)'),
      }),
      handler: async ({ slug, limit = 10 }, { credentials }) => {
        const api = new ProductHuntAPI(credentials.access_token);
        const comments = await api.getProductComments(slug, limit);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(comments, null, 2),
            },
          ],
        };
      },
    },

    PRODUCTHUNT_GET_COLLECTIONS: {
      description: 'Get popular collections on Product Hunt',
      parameters: z.object({
        limit: z
          .number()
          .optional()
          .default(10)
          .describe('Maximum number of collections to return (default: 10)'),
      }),
      handler: async ({ limit = 10 }, { credentials }) => {
        const api = new ProductHuntAPI(credentials.access_token);
        const collections = await api.getCollections(limit);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(collections, null, 2),
            },
          ],
        };
      },
    },
  },

  resources: {
    PRODUCTHUNT_TRENDING_TODAY: {
      description: 'Current trending products on Product Hunt today',
      uri: 'producthunt://trending/today',
      mimeType: 'application/json',
      handler: async (_, { credentials }) => {
        const api = new ProductHuntAPI(credentials.access_token);
        const today = `${new Date().toISOString().split('T')[0]}T00:00:00Z`;
        const products = await api.getFeaturedProducts(today, 20);

        return {
          contents: [
            {
              type: 'text',
              text: JSON.stringify(products, null, 2),
            },
          ],
        };
      },
    },

    PRODUCTHUNT_TOP_COLLECTIONS: {
      description: 'Top collections on Product Hunt',
      uri: 'producthunt://collections/top',
      mimeType: 'application/json',
      handler: async (_, { credentials }) => {
        const api = new ProductHuntAPI(credentials.access_token);
        const collections = await api.getCollections(20);

        return {
          contents: [
            {
              type: 'text',
              text: JSON.stringify(collections, null, 2),
            },
          ],
        };
      },
    },
  },
});

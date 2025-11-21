import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, type vi } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { ProducthuntConnectorConfig } from './producthunt';

// Type for GraphQL request body
interface GraphQLRequestBody {
  query: string;
  variables?: {
    first?: number;
    postedAfter?: string;
    [key: string]: unknown;
  };
}

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('#ProductHuntConnector', () => {
  describe('.PRODUCTHUNT_GET_PRODUCT', () => {
    describe('when product exists', () => {
      describe('and API returns valid data', () => {
        it('returns product details', async () => {
          server.use(
            http.post('https://api.producthunt.com/v2/api/graphql', () => {
              return HttpResponse.json({
                data: {
                  post: {
                    id: '123',
                    name: 'Test Product',
                    tagline: 'A great test product',
                    description: 'This is a test product description',
                    website: 'https://test.com',
                    slug: 'test-product',
                    votesCount: 150,
                    commentsCount: 25,
                    featured: true,
                    url: 'https://producthunt.com/posts/test-product',
                    thumbnail: { url: 'https://test.com/screenshot.png' },
                    logo: { url: 'https://test.com/logo.png' },
                    createdAt: '2024-01-01T00:00:00Z',
                    featuredAt: '2024-01-01T10:00:00Z',
                  },
                },
              });
            })
          );

          const tool = ProducthuntConnectorConfig.tools
            .PRODUCTHUNT_GET_PRODUCT as MCPToolDefinition;
          const mockContext = createMockConnectorContext();
          (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
            access_token: 'test-token',
          });

          const actual = await tool.handler({ slug: 'test-product' }, mockContext);

          const productData = JSON.parse(actual as string);
          expect(productData.name).toBe('Test Product');
          expect(productData.slug).toBe('test-product');
          expect(productData.votesCount).toBe(150);
        });
      });
    });

    describe('when API returns error', () => {
      describe('and response is not ok', () => {
        it('throws API error', async () => {
          server.use(
            http.post('https://api.producthunt.com/v2/api/graphql', () => {
              return new HttpResponse(null, { status: 401 });
            })
          );

          const tool = ProducthuntConnectorConfig.tools
            .PRODUCTHUNT_GET_PRODUCT as MCPToolDefinition;
          const mockContext = createMockConnectorContext();
          (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
            access_token: 'invalid-token',
          });

          const actual = await tool.handler({ slug: 'test-product' }, mockContext);

          expect(actual).toContain('Failed to get product:');
          expect(actual).toContain('Product Hunt API error: 401 Unauthorized');
        });
      });

      describe('and GraphQL returns errors', () => {
        it('throws GraphQL error', async () => {
          server.use(
            http.post('https://api.producthunt.com/v2/api/graphql', () => {
              return HttpResponse.json({
                errors: [{ message: 'Post not found' }],
              });
            })
          );

          const tool = ProducthuntConnectorConfig.tools
            .PRODUCTHUNT_GET_PRODUCT as MCPToolDefinition;
          const mockContext = createMockConnectorContext();
          (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
            access_token: 'test-token',
          });

          const actual = await tool.handler({ slug: 'nonexistent' }, mockContext);

          expect(actual).toContain('Failed to get product:');
          expect(actual).toContain('GraphQL error: Post not found');
        });
      });
    });
  });

  describe('.PRODUCTHUNT_SEARCH_PRODUCTS', () => {
    describe('when search query is valid', () => {
      describe('and API returns results', () => {
        it('returns matching products', async () => {
          server.use(
            http.post('https://api.producthunt.com/v2/api/graphql', () => {
              return HttpResponse.json({
                data: {
                  posts: {
                    edges: [
                      {
                        node: {
                          id: '123',
                          name: 'AI Tool',
                          tagline: 'Revolutionary AI assistant',
                          description: 'An amazing AI tool',
                          website: 'https://aitool.com',
                          slug: 'ai-tool',
                          votesCount: 250,
                          commentsCount: 50,
                          featured: true,
                          url: 'https://producthunt.com/posts/ai-tool',
                          thumbnail: { url: 'https://aitool.com/screenshot.png' },
                          logo: { url: 'https://aitool.com/logo.png' },
                          createdAt: '2024-01-01T00:00:00Z',
                          featuredAt: '2024-01-01T10:00:00Z',
                        },
                      },
                    ],
                  },
                },
              });
            })
          );

          const tool = ProducthuntConnectorConfig.tools
            .PRODUCTHUNT_SEARCH_PRODUCTS as MCPToolDefinition;
          const mockContext = createMockConnectorContext();
          (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
            access_token: 'test-token',
          });

          const actual = await tool.handler({ query: 'AI', limit: 10 }, mockContext);

          const products = JSON.parse(actual as string);
          expect(products).toHaveLength(1);
          expect(products[0].name).toBe('AI Tool');
        });
      });
    });

    describe('when limit parameter is provided', () => {
      describe('and limit is set to 5', () => {
        it('requests only 5 results', async () => {
          let requestBody: GraphQLRequestBody = { query: '' };
          server.use(
            http.post(
              'https://api.producthunt.com/v2/api/graphql',
              async ({ request }) => {
                requestBody = (await request.json()) as GraphQLRequestBody;
                return HttpResponse.json({
                  data: { posts: { edges: [] } },
                });
              }
            )
          );

          const tool = ProducthuntConnectorConfig.tools
            .PRODUCTHUNT_SEARCH_PRODUCTS as MCPToolDefinition;
          const mockContext = createMockConnectorContext();
          (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
            access_token: 'test-token',
          });

          await tool.handler({ query: 'test', limit: 5 }, mockContext);

          expect(requestBody.variables?.first).toBe(5);
        });
      });
    });
  });

  describe('.PRODUCTHUNT_GET_FEATURED', () => {
    describe('when no date filter is provided', () => {
      describe('and API returns featured products', () => {
        it('returns featured products without date filter', async () => {
          server.use(
            http.post('https://api.producthunt.com/v2/api/graphql', () => {
              return HttpResponse.json({
                data: {
                  posts: {
                    edges: [
                      {
                        node: {
                          id: '456',
                          name: 'Featured Product',
                          tagline: "Today's featured product",
                          description: 'This product is featured today',
                          slug: 'featured-product',
                          votesCount: 500,
                          commentsCount: 100,
                          featured: true,
                          url: 'https://producthunt.com/posts/featured-product',
                          createdAt: '2024-01-01T00:00:00Z',
                          featuredAt: '2024-01-01T08:00:00Z',
                        },
                      },
                    ],
                  },
                },
              });
            })
          );

          const tool = ProducthuntConnectorConfig.tools
            .PRODUCTHUNT_GET_FEATURED as MCPToolDefinition;
          const mockContext = createMockConnectorContext();
          (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
            access_token: 'test-token',
          });

          const actual = await tool.handler({ limit: 10 }, mockContext);

          const products = JSON.parse(actual as string);
          expect(products).toHaveLength(1);
          expect(products[0].featured).toBe(true);
        });
      });
    });

    describe('when date filter is provided', () => {
      describe('and date is valid ISO string', () => {
        it('includes date filter in request', async () => {
          let requestBody: GraphQLRequestBody = { query: '' };
          server.use(
            http.post(
              'https://api.producthunt.com/v2/api/graphql',
              async ({ request }) => {
                requestBody = (await request.json()) as GraphQLRequestBody;
                return HttpResponse.json({
                  data: { posts: { edges: [] } },
                });
              }
            )
          );

          const tool = ProducthuntConnectorConfig.tools
            .PRODUCTHUNT_GET_FEATURED as MCPToolDefinition;
          const mockContext = createMockConnectorContext();
          (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
            access_token: 'test-token',
          });

          await tool.handler(
            {
              date: '2024-01-01T00:00:00Z',
              limit: 10,
            },
            mockContext
          );

          expect(requestBody.variables?.postedAfter).toBe('2024-01-01T00:00:00Z');
        });
      });
    });
  });

  describe('.PRODUCTHUNT_GET_USER', () => {
    describe('when user exists', () => {
      describe('and API returns user data', () => {
        it('returns user information', async () => {
          server.use(
            http.post('https://api.producthunt.com/v2/api/graphql', () => {
              return HttpResponse.json({
                data: {
                  user: {
                    id: 'user123',
                    name: 'John Doe',
                    username: 'johndoe',
                    headline: 'Product Manager',
                    profileImage: 'https://example.com/profile.jpg',
                    url: 'https://producthunt.com/@johndoe',
                    followersCount: 1000,
                    followingCount: 500,
                    makerOfCount: 3,
                  },
                },
              });
            })
          );

          const tool = ProducthuntConnectorConfig.tools
            .PRODUCTHUNT_GET_USER as MCPToolDefinition;
          const mockContext = createMockConnectorContext();
          (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
            access_token: 'test-token',
          });

          const actual = await tool.handler({ username: 'johndoe' }, mockContext);

          const userData = JSON.parse(actual as string);
          expect(userData.username).toBe('johndoe');
          expect(userData.name).toBe('John Doe');
          expect(userData.followersCount).toBe(1000);
        });
      });
    });
  });

  describe('.PRODUCTHUNT_GET_COMMENTS', () => {
    describe('when product has comments', () => {
      describe('and API returns comment data', () => {
        it('returns product comments', async () => {
          server.use(
            http.post('https://api.producthunt.com/v2/api/graphql', () => {
              return HttpResponse.json({
                data: {
                  post: {
                    comments: {
                      edges: [
                        {
                          node: {
                            id: 'comment123',
                            body: 'Great product!',
                            createdAt: '2024-01-01T12:00:00Z',
                            votesCount: 5,
                            user: {
                              name: 'Jane Smith',
                              username: 'janesmith',
                              profileImage: 'https://example.com/jane.jpg',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              });
            })
          );

          const tool = ProducthuntConnectorConfig.tools
            .PRODUCTHUNT_GET_COMMENTS as MCPToolDefinition;
          const mockContext = createMockConnectorContext();
          (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
            access_token: 'test-token',
          });

          const actual = await tool.handler(
            { slug: 'test-product', limit: 10 },
            mockContext
          );

          const comments = JSON.parse(actual as string);
          expect(comments).toHaveLength(1);
          expect(comments[0].body).toBe('Great product!');
          expect(comments[0].user.username).toBe('janesmith');
        });
      });
    });
  });

  describe('.PRODUCTHUNT_GET_COLLECTIONS', () => {
    describe('when collections exist', () => {
      describe('and API returns collection data', () => {
        it('returns collection information', async () => {
          server.use(
            http.post('https://api.producthunt.com/v2/api/graphql', () => {
              return HttpResponse.json({
                data: {
                  collections: {
                    edges: [
                      {
                        node: {
                          id: 'collection123',
                          name: 'AI Tools',
                          description: 'Best AI tools collection',
                          slug: 'ai-tools',
                          url: 'https://producthunt.com/collections/ai-tools',
                          postsCount: 25,
                          followersCount: 500,
                          createdAt: '2024-01-01T00:00:00Z',
                        },
                      },
                    ],
                  },
                },
              });
            })
          );

          const tool = ProducthuntConnectorConfig.tools
            .PRODUCTHUNT_GET_COLLECTIONS as MCPToolDefinition;
          const mockContext = createMockConnectorContext();
          (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
            access_token: 'test-token',
          });

          const actual = await tool.handler({ limit: 10 }, mockContext);

          const collections = JSON.parse(actual as string);
          expect(collections).toHaveLength(1);
          expect(collections[0].name).toBe('AI Tools');
          expect(collections[0].productsCount).toBe(25);
        });
      });
    });
  });

  describe('resources', () => {
    describe('.PRODUCTHUNT_TRENDING_TODAY', () => {
      describe('when resource is accessed', () => {
        describe('and API returns trending products', () => {
          it("returns today's trending products", async () => {
            server.use(
              http.post('https://api.producthunt.com/v2/api/graphql', () => {
                return HttpResponse.json({
                  data: {
                    posts: {
                      edges: [
                        {
                          node: {
                            id: 'trending123',
                            name: 'Trending Product',
                            tagline: 'Hot product today',
                            description: 'This is trending',
                            slug: 'trending-product',
                            votesCount: 300,
                            commentsCount: 60,
                            featured: true,
                            url: 'https://producthunt.com/posts/trending-product',
                            createdAt: '2024-01-01T00:00:00Z',
                            featuredAt: '2024-01-01T09:00:00Z',
                          },
                        },
                      ],
                    },
                  },
                });
              })
            );

            const resource =
              ProducthuntConnectorConfig.resources.PRODUCTHUNT_TRENDING_TODAY;
            if (!resource) {
              throw new Error('Resource PRODUCTHUNT_TRENDING_TODAY not found');
            }
            const mockContext = createMockConnectorContext();
            (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
              access_token: 'test-token',
            });

            const actual = await resource.handler(mockContext);

            const products = JSON.parse(actual as string);
            expect(products).toHaveLength(1);
            expect(products[0].name).toBe('Trending Product');
          });
        });
      });
    });

    describe('.PRODUCTHUNT_TOP_COLLECTIONS', () => {
      describe('when resource is accessed', () => {
        describe('and API returns collections', () => {
          it('returns top collections', async () => {
            server.use(
              http.post('https://api.producthunt.com/v2/api/graphql', () => {
                return HttpResponse.json({
                  data: {
                    collections: {
                      edges: [
                        {
                          node: {
                            id: 'topcollection123',
                            name: 'Top Collection',
                            description: 'Most popular collection',
                            slug: 'top-collection',
                            url: 'https://producthunt.com/collections/top-collection',
                            postsCount: 50,
                            followersCount: 1000,
                            createdAt: '2024-01-01T00:00:00Z',
                          },
                        },
                      ],
                    },
                  },
                });
              })
            );

            const resource =
              ProducthuntConnectorConfig.resources.PRODUCTHUNT_TOP_COLLECTIONS;
            if (!resource) {
              throw new Error('Resource PRODUCTHUNT_TOP_COLLECTIONS not found');
            }
            const mockContext = createMockConnectorContext();
            (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
              access_token: 'test-token',
            });

            const actual = await resource.handler(mockContext);

            const collections = JSON.parse(actual as string);
            expect(collections).toHaveLength(1);
            expect(collections[0].name).toBe('Top Collection');
          });
        });
      });
    });
  });
});

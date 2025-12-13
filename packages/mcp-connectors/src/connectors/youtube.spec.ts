import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, type vi } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { YouTubeConnectorConfig } from './youtube';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const mockVideoSearchResult = {
  kind: 'youtube#searchResult',
  etag: 'test-etag',
  id: {
    kind: 'youtube#video',
    videoId: 'dQw4w9WgXcQ',
  },
  snippet: {
    publishedAt: '2023-12-25T10:00:00Z',
    channelId: 'UCuAXFkgsw1L7xaCfnd5JJOw',
    title: 'Never Gonna Give You Up',
    description: 'The official video for Rick Astley - Never Gonna Give You Up',
    thumbnails: {
      default: {
        url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg',
        width: 120,
        height: 90,
      },
      medium: {
        url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
        width: 320,
        height: 180,
      },
      high: {
        url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        width: 480,
        height: 360,
      },
    },
    channelTitle: 'Rick Astley',
    liveBroadcastContent: 'none',
  },
};

const mockChannelSearchResult = {
  kind: 'youtube#searchResult',
  etag: 'test-etag',
  id: {
    kind: 'youtube#channel',
    channelId: 'UCuAXFkgsw1L7xaCfnd5JJOw',
  },
  snippet: {
    publishedAt: '2006-05-16T10:00:00Z',
    channelId: 'UCuAXFkgsw1L7xaCfnd5JJOw',
    title: 'Rick Astley',
    description: 'Official YouTube channel for Rick Astley',
    thumbnails: {
      default: { url: 'https://yt3.ggpht.com/default.jpg', width: 88, height: 88 },
      medium: { url: 'https://yt3.ggpht.com/medium.jpg', width: 240, height: 240 },
      high: { url: 'https://yt3.ggpht.com/high.jpg', width: 800, height: 800 },
    },
    channelTitle: 'Rick Astley',
    liveBroadcastContent: 'none',
  },
};

const mockVideo = {
  kind: 'youtube#video',
  etag: 'test-etag',
  id: 'dQw4w9WgXcQ',
  snippet: {
    publishedAt: '2009-10-25T06:57:33Z',
    channelId: 'UCuAXFkgsw1L7xaCfnd5JJOw',
    title: 'Rick Astley - Never Gonna Give You Up (Official Video)',
    description: 'The official video for Rick Astley - Never Gonna Give You Up',
    thumbnails: {
      default: {
        url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg',
        width: 120,
        height: 90,
      },
      medium: {
        url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
        width: 320,
        height: 180,
      },
      high: {
        url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        width: 480,
        height: 360,
      },
    },
    channelTitle: 'Rick Astley',
    tags: ['Rick Astley', '80s', 'music', 'pop'],
    categoryId: '10',
    liveBroadcastContent: 'none',
    defaultLanguage: 'en',
  },
  statistics: {
    viewCount: '1500000000',
    likeCount: '15000000',
    dislikeCount: '500000',
    favoriteCount: '0',
    commentCount: '2500000',
  },
  contentDetails: {
    duration: 'PT3M33S',
    dimension: '2d',
    definition: 'hd',
    caption: 'false',
    licensedContent: true,
  },
  status: {
    uploadStatus: 'processed',
    privacyStatus: 'public',
    license: 'youtube',
    embeddable: true,
    publicStatsViewable: true,
    madeForKids: false,
  },
};

const mockChannel = {
  kind: 'youtube#channel',
  etag: 'test-etag',
  id: 'UCuAXFkgsw1L7xaCfnd5JJOw',
  snippet: {
    title: 'Rick Astley',
    description: 'Official YouTube channel for Rick Astley',
    customUrl: '@RickAstleyYT',
    publishedAt: '2006-05-16T10:00:00Z',
    thumbnails: {
      default: { url: 'https://yt3.ggpht.com/default.jpg', width: 88, height: 88 },
      medium: { url: 'https://yt3.ggpht.com/medium.jpg', width: 240, height: 240 },
      high: { url: 'https://yt3.ggpht.com/high.jpg', width: 800, height: 800 },
    },
    country: 'GB',
  },
  statistics: {
    viewCount: '1000000000',
    subscriberCount: '3500000',
    hiddenSubscriberCount: false,
    videoCount: '25',
  },
  contentDetails: {
    relatedPlaylists: {
      uploads: 'UUuAXFkgsw1L7xaCfnd5JJOw',
      likes: 'LLuAXFkgsw1L7xaCfnd5JJOw',
    },
  },
};

const mockPlaylist = {
  kind: 'youtube#playlist',
  etag: 'test-etag',
  id: 'PLuAXFkgsw1L7xaCfnd5JJOw',
  snippet: {
    publishedAt: '2020-01-01T10:00:00Z',
    channelId: 'UCuAXFkgsw1L7xaCfnd5JJOw',
    title: 'Greatest Hits',
    description: 'The best of Rick Astley',
    thumbnails: {
      default: {
        url: 'https://i.ytimg.com/vi/playlist/default.jpg',
        width: 120,
        height: 90,
      },
      medium: {
        url: 'https://i.ytimg.com/vi/playlist/mqdefault.jpg',
        width: 320,
        height: 180,
      },
      high: {
        url: 'https://i.ytimg.com/vi/playlist/hqdefault.jpg',
        width: 480,
        height: 360,
      },
    },
    channelTitle: 'Rick Astley',
    defaultLanguage: 'en',
  },
  status: {
    privacyStatus: 'public',
  },
  contentDetails: {
    itemCount: 15,
  },
};

const mockPlaylistItem = {
  kind: 'youtube#playlistItem',
  etag: 'test-etag',
  id: 'PLuAXFkgsw1L7xaCfnd5JJOw_dQw4w9WgXcQ',
  snippet: {
    publishedAt: '2020-01-01T10:00:00Z',
    channelId: 'UCuAXFkgsw1L7xaCfnd5JJOw',
    title: 'Never Gonna Give You Up',
    description: 'Classic hit from Rick Astley',
    thumbnails: {
      default: {
        url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg',
        width: 120,
        height: 90,
      },
    },
    channelTitle: 'Rick Astley',
    playlistId: 'PLuAXFkgsw1L7xaCfnd5JJOw',
    position: 0,
    resourceId: {
      kind: 'youtube#video',
      videoId: 'dQw4w9WgXcQ',
    },
  },
  contentDetails: {
    videoId: 'dQw4w9WgXcQ',
  },
};

describe('#YouTubeConnectorConfig', () => {
  it('should have the correct basic properties', () => {
    expect(YouTubeConnectorConfig.name).toBe('YouTube');
    expect(YouTubeConnectorConfig.key).toBe('youtube');
    expect(YouTubeConnectorConfig.version).toBe('1.0.0');
    expect(YouTubeConnectorConfig.description).toContain('YouTube content');
  });

  it('should have tools object with expected tools', () => {
    expect(typeof YouTubeConnectorConfig.tools).toBe('object');
    expect(YouTubeConnectorConfig.tools).toBeDefined();

    const expectedTools = [
      'SEARCH_VIDEOS',
      'SEARCH_CHANNELS',
      'GET_VIDEO_DETAILS',
      'GET_CHANNEL_DETAILS',
      'GET_PLAYLIST_DETAILS',
      'GET_PLAYLIST_ITEMS',
      'GET_POPULAR_VIDEOS',
    ];

    for (const toolName of expectedTools) {
      expect(YouTubeConnectorConfig.tools[toolName]).toBeDefined();
    }
  });

  it('should have correct credential schema', () => {
    const credentialsSchema = YouTubeConnectorConfig.credentials;
    const parsedCredentials = credentialsSchema.safeParse({
      apiKey: 'test-api-key',
    });

    expect(parsedCredentials.success).toBe(true);
  });

  it('should have empty setup schema', () => {
    const setupSchema = YouTubeConnectorConfig.setup;
    const parsedSetup = setupSchema.safeParse({});

    expect(parsedSetup.success).toBe(true);
  });

  it('should have a meaningful example prompt', () => {
    expect(YouTubeConnectorConfig.examplePrompt).toContain('machine learning');
    expect(YouTubeConnectorConfig.examplePrompt).toContain('channel');
    expect(YouTubeConnectorConfig.examplePrompt).toContain('popular');
  });

  it('should have proper logo URL', () => {
    expect(YouTubeConnectorConfig.logo).toContain('youtube.com');
  });

  describe('.SEARCH_VIDEOS', () => {
    describe('when API request is successful', () => {
      it('returns formatted video search results', async () => {
        const mockResponse = {
          kind: 'youtube#searchListResponse',
          etag: 'test-etag',
          nextPageToken: 'CAUQAA',
          regionCode: 'US',
          pageInfo: {
            totalResults: 1000000,
            resultsPerPage: 10,
          },
          items: [mockVideoSearchResult],
        };

        server.use(
          http.get('https://www.googleapis.com/youtube/v3/search', ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get('q')).toBe('machine learning');
            expect(url.searchParams.get('type')).toBe('video');
            expect(url.searchParams.get('part')).toBe('snippet');
            expect(url.searchParams.get('key')).toBe('test-api-key');
            return HttpResponse.json(mockResponse);
          })
        );

        const tool = YouTubeConnectorConfig.tools.SEARCH_VIDEOS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'test-api-key',
        });

        const actual = await tool.handler(
          {
            q: 'machine learning',
            maxResults: 10,
            order: 'relevance',
          },
          mockContext
        );

        expect(actual).toBe(JSON.stringify(mockResponse, null, 2));
      });
    });

    describe('when API request fails', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://www.googleapis.com/youtube/v3/search', () => {
            return HttpResponse.json(
              { error: { message: 'API key not valid' } },
              { status: 400 }
            );
          })
        );

        const tool = YouTubeConnectorConfig.tools.SEARCH_VIDEOS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'invalid-key',
        });

        const actual = await tool.handler({ q: 'test' }, mockContext);

        expect(actual).toContain('Failed to search videos');
        expect(actual).toContain('YouTube API error: 400');
      });
    });

    describe('when advanced filters are used', () => {
      it('includes filter parameters in request', async () => {
        server.use(
          http.get('https://www.googleapis.com/youtube/v3/search', ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get('videoDuration')).toBe('medium');
            expect(url.searchParams.get('videoDefinition')).toBe('high');
            expect(url.searchParams.get('order')).toBe('viewCount');
            return HttpResponse.json({ items: [] });
          })
        );

        const tool = YouTubeConnectorConfig.tools.SEARCH_VIDEOS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'test-api-key',
        });

        await tool.handler(
          {
            q: 'test',
            videoDuration: 'medium',
            videoDefinition: 'high',
            order: 'viewCount',
          },
          mockContext
        );
      });
    });
  });

  describe('.SEARCH_CHANNELS', () => {
    describe('when searching for channels', () => {
      it('returns channel search results', async () => {
        const mockResponse = {
          kind: 'youtube#searchListResponse',
          etag: 'test-etag',
          pageInfo: {
            totalResults: 100,
            resultsPerPage: 10,
          },
          items: [mockChannelSearchResult],
        };

        server.use(
          http.get('https://www.googleapis.com/youtube/v3/search', ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get('q')).toBe('Rick Astley');
            expect(url.searchParams.get('type')).toBe('channel');
            return HttpResponse.json(mockResponse);
          })
        );

        const tool = YouTubeConnectorConfig.tools.SEARCH_CHANNELS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'test-api-key',
        });

        const actual = await tool.handler({ q: 'Rick Astley' }, mockContext);

        expect(actual).toBe(JSON.stringify(mockResponse, null, 2));
      });
    });
  });

  describe('.GET_VIDEO_DETAILS', () => {
    describe('when video exists', () => {
      it('returns detailed video information', async () => {
        const mockResponse = {
          kind: 'youtube#videoListResponse',
          etag: 'test-etag',
          pageInfo: {
            totalResults: 1,
            resultsPerPage: 1,
          },
          items: [mockVideo],
        };

        server.use(
          http.get('https://www.googleapis.com/youtube/v3/videos', ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get('id')).toBe('dQw4w9WgXcQ');
            expect(url.searchParams.get('part')).toBe(
              'snippet,statistics,contentDetails'
            );
            return HttpResponse.json(mockResponse);
          })
        );

        const tool = YouTubeConnectorConfig.tools.GET_VIDEO_DETAILS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'test-api-key',
        });

        const actual = await tool.handler({ videoIds: ['dQw4w9WgXcQ'] }, mockContext);

        expect(actual).toBe(JSON.stringify(mockResponse, null, 2));
      });
    });

    describe('when multiple videos are requested', () => {
      it('includes all video IDs in request', async () => {
        server.use(
          http.get('https://www.googleapis.com/youtube/v3/videos', ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get('id')).toBe('dQw4w9WgXcQ,eBGIQ7ZuuiU');
            return HttpResponse.json({ items: [] });
          })
        );

        const tool = YouTubeConnectorConfig.tools.GET_VIDEO_DETAILS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'test-api-key',
        });

        await tool.handler({ videoIds: ['dQw4w9WgXcQ', 'eBGIQ7ZuuiU'] }, mockContext);
      });
    });
  });

  describe('.GET_CHANNEL_DETAILS', () => {
    describe('when channel exists by ID', () => {
      it('returns detailed channel information', async () => {
        const mockResponse = {
          kind: 'youtube#channelListResponse',
          etag: 'test-etag',
          pageInfo: {
            totalResults: 1,
            resultsPerPage: 1,
          },
          items: [mockChannel],
        };

        server.use(
          http.get('https://www.googleapis.com/youtube/v3/channels', ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get('id')).toBe('UCuAXFkgsw1L7xaCfnd5JJOw');
            expect(url.searchParams.get('part')).toBe(
              'snippet,statistics,contentDetails'
            );
            return HttpResponse.json(mockResponse);
          })
        );

        const tool = YouTubeConnectorConfig.tools
          .GET_CHANNEL_DETAILS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'test-api-key',
        });

        const actual = await tool.handler(
          { channelIds: ['UCuAXFkgsw1L7xaCfnd5JJOw'] },
          mockContext
        );

        expect(actual).toBe(JSON.stringify(mockResponse, null, 2));
      });
    });

    describe('when channel exists by username', () => {
      it('uses forUsername parameter', async () => {
        server.use(
          http.get('https://www.googleapis.com/youtube/v3/channels', ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get('forUsername')).toBe('rickastley');
            expect(url.searchParams.has('id')).toBe(false);
            return HttpResponse.json({ items: [mockChannel] });
          })
        );

        const tool = YouTubeConnectorConfig.tools
          .GET_CHANNEL_DETAILS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'test-api-key',
        });

        await tool.handler({ username: 'rickastley' }, mockContext);
      });
    });
  });

  describe('.GET_PLAYLIST_DETAILS', () => {
    describe('when playlist exists', () => {
      it('returns playlist information', async () => {
        const mockResponse = {
          kind: 'youtube#playlistListResponse',
          etag: 'test-etag',
          pageInfo: {
            totalResults: 1,
            resultsPerPage: 1,
          },
          items: [mockPlaylist],
        };

        server.use(
          http.get('https://www.googleapis.com/youtube/v3/playlists', ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get('id')).toBe('PLuAXFkgsw1L7xaCfnd5JJOw');
            expect(url.searchParams.get('part')).toBe('snippet,status,contentDetails');
            return HttpResponse.json(mockResponse);
          })
        );

        const tool = YouTubeConnectorConfig.tools
          .GET_PLAYLIST_DETAILS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'test-api-key',
        });

        const actual = await tool.handler(
          { playlistIds: ['PLuAXFkgsw1L7xaCfnd5JJOw'] },
          mockContext
        );

        expect(actual).toBe(JSON.stringify(mockResponse, null, 2));
      });
    });
  });

  describe('.GET_PLAYLIST_ITEMS', () => {
    describe('when playlist has items', () => {
      it('returns playlist videos', async () => {
        const mockResponse = {
          kind: 'youtube#playlistItemListResponse',
          etag: 'test-etag',
          nextPageToken: 'CAUQAA',
          pageInfo: {
            totalResults: 15,
            resultsPerPage: 25,
          },
          items: [mockPlaylistItem],
        };

        server.use(
          http.get(
            'https://www.googleapis.com/youtube/v3/playlistItems',
            ({ request }) => {
              const url = new URL(request.url);
              expect(url.searchParams.get('playlistId')).toBe('PLuAXFkgsw1L7xaCfnd5JJOw');
              expect(url.searchParams.get('part')).toBe('snippet,contentDetails');
              expect(url.searchParams.get('maxResults')).toBe('25');
              return HttpResponse.json(mockResponse);
            }
          )
        );

        const tool = YouTubeConnectorConfig.tools.GET_PLAYLIST_ITEMS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'test-api-key',
        });

        const actual = await tool.handler(
          { playlistId: 'PLuAXFkgsw1L7xaCfnd5JJOw' },
          mockContext
        );

        expect(actual).toBe(JSON.stringify(mockResponse, null, 2));
      });
    });

    describe('when pagination is used', () => {
      it('includes pageToken in request', async () => {
        server.use(
          http.get(
            'https://www.googleapis.com/youtube/v3/playlistItems',
            ({ request }) => {
              const url = new URL(request.url);
              expect(url.searchParams.get('pageToken')).toBe('CAUQAA');
              return HttpResponse.json({ items: [] });
            }
          )
        );

        const tool = YouTubeConnectorConfig.tools.GET_PLAYLIST_ITEMS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'test-api-key',
        });

        await tool.handler(
          {
            playlistId: 'PLuAXFkgsw1L7xaCfnd5JJOw',
            pageToken: 'CAUQAA',
          },
          mockContext
        );
      });
    });
  });

  describe('.GET_POPULAR_VIDEOS', () => {
    describe('when requesting popular videos', () => {
      it('returns trending videos for region', async () => {
        const mockResponse = {
          kind: 'youtube#videoListResponse',
          etag: 'test-etag',
          nextPageToken: 'CAUQAA',
          pageInfo: {
            totalResults: 200,
            resultsPerPage: 25,
          },
          items: [mockVideo],
        };

        server.use(
          http.get('https://www.googleapis.com/youtube/v3/videos', ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get('chart')).toBe('mostPopular');
            expect(url.searchParams.get('regionCode')).toBe('US');
            expect(url.searchParams.get('part')).toBe(
              'snippet,statistics,contentDetails'
            );
            return HttpResponse.json(mockResponse);
          })
        );

        const tool = YouTubeConnectorConfig.tools.GET_POPULAR_VIDEOS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'test-api-key',
        });

        const actual = await tool.handler({ regionCode: 'US' }, mockContext);

        expect(actual).toBe(JSON.stringify(mockResponse, null, 2));
      });
    });

    describe('when category filter is applied', () => {
      it('includes category ID in request', async () => {
        server.use(
          http.get('https://www.googleapis.com/youtube/v3/videos', ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get('videoCategoryId')).toBe('10');
            return HttpResponse.json({ items: [] });
          })
        );

        const tool = YouTubeConnectorConfig.tools.GET_POPULAR_VIDEOS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
          apiKey: 'test-api-key',
        });

        await tool.handler({ categoryId: '10' }, mockContext);
      });
    });
  });
});

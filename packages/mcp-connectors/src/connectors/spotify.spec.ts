import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { SpotifyConnectorConfig } from './spotify';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const mockOAuth2Credentials = {
  accessToken: 'test_access_token',
  refreshToken: 'test_refresh_token',
  expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour from now
  tokenType: 'Bearer',
  clientId: 'test_client_id',
  clientSecret: 'test_client_secret',
};

const mockTrack = {
  id: '4iV5W9uYEdYUVa79Axb7Rh',
  name: 'Bohemian Rhapsody',
  artists: [
    {
      id: '1dfeR4HaWDbWqFHLkxsg1d',
      name: 'Queen',
      external_urls: {
        spotify: 'https://open.spotify.com/artist/1dfeR4HaWDbWqFHLkxsg1d',
      },
    },
  ],
  album: {
    id: '6i6folBtxKV28WX3ZgUIzS',
    name: 'A Night At The Opera',
    images: [
      {
        url: 'https://i.scdn.co/image/ab67616d0000b273e319baafd16e84f0408af2a0',
        height: 640,
        width: 640,
      },
    ],
    release_date: '1975-11-21',
  },
  duration_ms: 354947,
  explicit: false,
  external_urls: {
    spotify: 'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh',
  },
  popularity: 89,
  preview_url: 'https://p.scdn.co/mp3-preview/c7c7ad59be1b15ec9f2e...',
};

const mockArtist = {
  id: '1dfeR4HaWDbWqFHLkxsg1d',
  name: 'Queen',
  genres: ['classic rock', 'glam rock', 'rock'],
  popularity: 89,
  followers: {
    total: 45234567,
  },
  images: [
    {
      url: 'https://i.scdn.co/image/ab6761610000e5ebe03a98785f3658f0b6461ec4',
      height: 640,
      width: 640,
    },
  ],
  external_urls: {
    spotify: 'https://open.spotify.com/artist/1dfeR4HaWDbWqFHLkxsg1d',
  },
};

const mockAlbum = {
  id: '6i6folBtxKV28WX3ZgUIzS',
  name: 'A Night At The Opera',
  artists: [
    {
      id: '1dfeR4HaWDbWqFHLkxsg1d',
      name: 'Queen',
    },
  ],
  images: [
    {
      url: 'https://i.scdn.co/image/ab67616d0000b273e319baafd16e84f0408af2a0',
      height: 640,
      width: 640,
    },
  ],
  release_date: '1975-11-21',
  total_tracks: 12,
  external_urls: {
    spotify: 'https://open.spotify.com/album/6i6folBtxKV28WX3ZgUIzS',
  },
};

const mockPlaylist = {
  id: '37i9dQZF1DX0XUsuxWHRQd',
  name: 'RapCaviar',
  description: 'New music and big rap hits.',
  public: true,
  collaborative: false,
  owner: {
    id: 'spotify',
    display_name: 'Spotify',
  },
  tracks: {
    total: 75,
  },
  images: [
    {
      url: 'https://i.scdn.co/image/ab67706f00000003ca5a7517156021292e5663a6',
      height: 640,
      width: 640,
    },
  ],
  external_urls: {
    spotify: 'https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd',
  },
};

const mockUser = {
  id: 'testuser123',
  display_name: 'Test User',
  email: 'test@example.com',
  followers: {
    total: 342,
  },
  images: [
    {
      url: 'https://i.scdn.co/image/ab67757000003b82d5149e7f8e84a3e9e7d6b5d5',
      height: 640,
      width: 640,
    },
  ],
  country: 'US',
  external_urls: {
    spotify: 'https://open.spotify.com/user/testuser123',
  },
};

const mockCurrentlyPlaying = {
  is_playing: true,
  progress_ms: 45000,
  item: mockTrack,
  device: {
    id: 'device123',
    name: 'My Phone',
    type: 'Smartphone',
    volume_percent: 75,
  },
  shuffle_state: false,
  repeat_state: 'off' as const,
  context: {
    type: 'playlist',
    uri: 'spotify:playlist:37i9dQZF1DX0XUsuxWHRQd',
  },
};

describe('#SpotifyConnectorConfig', () => {
  it('should have the correct basic properties', () => {
    expect(SpotifyConnectorConfig.key).toBe('spotify');
    expect(SpotifyConnectorConfig.name).toBe('Spotify');
    expect(SpotifyConnectorConfig.version).toBe('1.0.0');
  });

  it('should have tools object with expected tools', () => {
    const toolNames = Object.keys(SpotifyConnectorConfig.tools);
    expect(toolNames).toContain('SEARCH_TRACKS');
    expect(toolNames).toContain('SEARCH_ARTISTS');
    expect(toolNames).toContain('SEARCH_ALBUMS');
    expect(toolNames).toContain('SEARCH_PLAYLISTS');
    expect(toolNames).toContain('GET_USER_PROFILE');
    expect(toolNames).toContain('GET_USER_PLAYLISTS');
    expect(toolNames).toContain('GET_USER_SAVED_TRACKS');
    expect(toolNames).toContain('GET_CURRENT_PLAYING');
    expect(toolNames).toContain('PAUSE_PLAYBACK');
    expect(toolNames).toContain('RESUME_PLAYBACK');
    expect(toolNames).toContain('SKIP_TO_NEXT');
    expect(toolNames).toContain('SKIP_TO_PREVIOUS');
    expect(toolNames).toHaveLength(12);
  });

  it('should have correct OAuth2 configuration', () => {
    expect(SpotifyConnectorConfig.oauth2?.schema).toBeDefined();
    expect(SpotifyConnectorConfig.oauth2?.token).toBeTypeOf('function');
    expect(SpotifyConnectorConfig.oauth2?.refresh).toBeTypeOf('function');
  });

  it('should have empty setup schema', () => {
    const setupSchema = SpotifyConnectorConfig.setup;
    expect(setupSchema.parse({})).toEqual({});
  });

  it('should have a meaningful example prompt', () => {
    expect(SpotifyConnectorConfig.examplePrompt).toContain('Beatles');
    expect(SpotifyConnectorConfig.examplePrompt).toContain('saved tracks');
    expect(SpotifyConnectorConfig.examplePrompt).toContain('playback');
  });

  it('should have proper logo URL', () => {
    expect(SpotifyConnectorConfig.logo).toContain('spotify.com');
    expect(SpotifyConnectorConfig.logo).toContain('icon');
  });

  describe('.SEARCH_TRACKS', () => {
    describe('when searching for tracks', () => {
      it('returns track search results', async () => {
        server.use(
          http.get('https://api.spotify.com/v1/search', ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get('q')).toBe('Queen Bohemian Rhapsody');
            expect(url.searchParams.get('type')).toBe('track');
            expect(url.searchParams.get('limit')).toBe('20');
            return HttpResponse.json({
              tracks: {
                items: [mockTrack],
                total: 1,
                limit: 20,
                offset: 0,
                next: null,
                previous: null,
              },
            });
          })
        );

        const tool = SpotifyConnectorConfig.tools.SEARCH_TRACKS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          oauth2Credentials: mockOAuth2Credentials,
        });

        const result = await tool.handler({ q: 'Queen Bohemian Rhapsody' }, mockContext);
        expect(result).toContain('Bohemian Rhapsody');
        expect(result).toContain('Queen');
      });

      it('includes market and pagination parameters in request', async () => {
        server.use(
          http.get('https://api.spotify.com/v1/search', ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get('market')).toBe('US');
            expect(url.searchParams.get('limit')).toBe('10');
            expect(url.searchParams.get('offset')).toBe('5');
            return HttpResponse.json({
              tracks: {
                items: [mockTrack],
                total: 1,
                limit: 10,
                offset: 5,
                next: null,
                previous: null,
              },
            });
          })
        );

        const tool = SpotifyConnectorConfig.tools.SEARCH_TRACKS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          oauth2Credentials: mockOAuth2Credentials,
        });

        await tool.handler(
          { q: 'test', market: 'US', limit: 10, offset: 5 },
          mockContext
        );
      });
    });

    describe('when API request fails', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://api.spotify.com/v1/search', () => {
            return HttpResponse.json({ error: 'Bad Request' }, { status: 400 });
          })
        );

        const tool = SpotifyConnectorConfig.tools.SEARCH_TRACKS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          oauth2Credentials: mockOAuth2Credentials,
        });

        const result = await tool.handler({ q: 'test' }, mockContext);
        expect(result).toContain('Failed to search tracks');
      });
    });
  });

  describe('.SEARCH_ARTISTS', () => {
    describe('when searching for artists', () => {
      it('returns artist search results', async () => {
        server.use(
          http.get('https://api.spotify.com/v1/search', ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get('q')).toBe('Queen');
            expect(url.searchParams.get('type')).toBe('artist');
            return HttpResponse.json({
              artists: {
                items: [mockArtist],
                total: 1,
                limit: 20,
                offset: 0,
                next: null,
                previous: null,
              },
            });
          })
        );

        const tool = SpotifyConnectorConfig.tools.SEARCH_ARTISTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          oauth2Credentials: mockOAuth2Credentials,
        });

        const result = await tool.handler({ q: 'Queen' }, mockContext);
        expect(result).toContain('Queen');
        expect(result).toContain('classic rock');
      });
    });
  });

  describe('.SEARCH_ALBUMS', () => {
    describe('when searching for albums', () => {
      it('returns album search results', async () => {
        server.use(
          http.get('https://api.spotify.com/v1/search', ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get('type')).toBe('album');
            return HttpResponse.json({
              albums: {
                items: [mockAlbum],
                total: 1,
                limit: 20,
                offset: 0,
                next: null,
                previous: null,
              },
            });
          })
        );

        const tool = SpotifyConnectorConfig.tools.SEARCH_ALBUMS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          oauth2Credentials: mockOAuth2Credentials,
        });

        const result = await tool.handler({ q: 'A Night At The Opera' }, mockContext);
        expect(result).toContain('A Night At The Opera');
        expect(result).toContain('Queen');
      });
    });
  });

  describe('.SEARCH_PLAYLISTS', () => {
    describe('when searching for playlists', () => {
      it('returns playlist search results', async () => {
        server.use(
          http.get('https://api.spotify.com/v1/search', ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get('type')).toBe('playlist');
            return HttpResponse.json({
              playlists: {
                items: [mockPlaylist],
                total: 1,
                limit: 20,
                offset: 0,
                next: null,
                previous: null,
              },
            });
          })
        );

        const tool = SpotifyConnectorConfig.tools.SEARCH_PLAYLISTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          oauth2Credentials: mockOAuth2Credentials,
        });

        const result = await tool.handler({ q: 'RapCaviar' }, mockContext);
        expect(result).toContain('RapCaviar');
        expect(result).toContain('New music and big rap hits');
      });
    });
  });

  describe('.GET_USER_PROFILE', () => {
    describe('when user is authenticated', () => {
      it('returns user profile information', async () => {
        server.use(
          http.get('https://api.spotify.com/v1/me', ({ request }) => {
            expect(request.headers.get('Authorization')).toBe('Bearer test_access_token');
            return HttpResponse.json(mockUser);
          })
        );

        const tool = SpotifyConnectorConfig.tools.GET_USER_PROFILE as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          oauth2Credentials: mockOAuth2Credentials,
        });

        const result = await tool.handler({}, mockContext);
        expect(result).toContain('testuser123');
        expect(result).toContain('Test User');
        expect(result).toContain('test@example.com');
      });
    });
  });

  describe('.GET_USER_PLAYLISTS', () => {
    describe('when user has playlists', () => {
      it('returns user playlists', async () => {
        server.use(
          http.get('https://api.spotify.com/v1/me/playlists', ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get('limit')).toBe('20');
            expect(url.searchParams.get('offset')).toBe('0');
            return HttpResponse.json({
              items: [mockPlaylist],
              total: 1,
              limit: 20,
              offset: 0,
              next: null,
              previous: null,
            });
          })
        );

        const tool = SpotifyConnectorConfig.tools.GET_USER_PLAYLISTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          oauth2Credentials: mockOAuth2Credentials,
        });

        const result = await tool.handler({}, mockContext);
        expect(result).toContain('RapCaviar');
        expect(result).toContain('New music and big rap hits');
      });
    });
  });

  describe('.GET_USER_SAVED_TRACKS', () => {
    describe('when user has saved tracks', () => {
      it('returns user saved tracks', async () => {
        server.use(
          http.get('https://api.spotify.com/v1/me/tracks', ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get('limit')).toBe('20');
            return HttpResponse.json({
              items: [
                {
                  added_at: '2023-01-01T12:00:00Z',
                  track: mockTrack,
                },
              ],
              total: 1,
              limit: 20,
              offset: 0,
              next: null,
              previous: null,
            });
          })
        );

        const tool = SpotifyConnectorConfig.tools
          .GET_USER_SAVED_TRACKS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          oauth2Credentials: mockOAuth2Credentials,
        });

        const result = await tool.handler({}, mockContext);
        expect(result).toContain('Bohemian Rhapsody');
        expect(result).toContain('added_at');
      });
    });
  });

  describe('.GET_CURRENT_PLAYING', () => {
    describe('when track is playing', () => {
      it('returns currently playing track information', async () => {
        server.use(
          http.get('https://api.spotify.com/v1/me/player/currently-playing', () => {
            return HttpResponse.json(mockCurrentlyPlaying);
          })
        );

        const tool = SpotifyConnectorConfig.tools
          .GET_CURRENT_PLAYING as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          oauth2Credentials: mockOAuth2Credentials,
        });

        const result = await tool.handler({}, mockContext);
        expect(result).toContain('Bohemian Rhapsody');
        expect(result).toContain('is_playing');
        expect(result).toContain('My Phone');
      });
    });

    describe('when nothing is playing', () => {
      it('returns no content message', async () => {
        server.use(
          http.get('https://api.spotify.com/v1/me/player/currently-playing', () => {
            return new HttpResponse(null, { status: 204 });
          })
        );

        const tool = SpotifyConnectorConfig.tools
          .GET_CURRENT_PLAYING as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          oauth2Credentials: mockOAuth2Credentials,
        });

        const result = await tool.handler({}, mockContext);
        expect(result).toBe('No track currently playing');
      });
    });
  });

  describe('.PAUSE_PLAYBACK', () => {
    describe('when pausing playback', () => {
      it('sends pause request successfully', async () => {
        server.use(
          http.put('https://api.spotify.com/v1/me/player/pause', () => {
            return new HttpResponse(null, { status: 204 });
          })
        );

        const tool = SpotifyConnectorConfig.tools.PAUSE_PLAYBACK as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          oauth2Credentials: mockOAuth2Credentials,
        });

        const result = await tool.handler({}, mockContext);
        expect(result).toBe('Playback paused successfully');
      });
    });
  });

  describe('.RESUME_PLAYBACK', () => {
    describe('when resuming playback', () => {
      it('sends play request successfully', async () => {
        server.use(
          http.put('https://api.spotify.com/v1/me/player/play', () => {
            return new HttpResponse(null, { status: 204 });
          })
        );

        const tool = SpotifyConnectorConfig.tools.RESUME_PLAYBACK as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          oauth2Credentials: mockOAuth2Credentials,
        });

        const result = await tool.handler({}, mockContext);
        expect(result).toBe('Playback resumed successfully');
      });
    });
  });

  describe('.SKIP_TO_NEXT', () => {
    describe('when skipping to next track', () => {
      it('sends skip next request successfully', async () => {
        server.use(
          http.post('https://api.spotify.com/v1/me/player/next', () => {
            return new HttpResponse(null, { status: 204 });
          })
        );

        const tool = SpotifyConnectorConfig.tools.SKIP_TO_NEXT as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          oauth2Credentials: mockOAuth2Credentials,
        });

        const result = await tool.handler({}, mockContext);
        expect(result).toBe('Skipped to next track successfully');
      });
    });
  });

  describe('.SKIP_TO_PREVIOUS', () => {
    describe('when skipping to previous track', () => {
      it('sends skip previous request successfully', async () => {
        server.use(
          http.post('https://api.spotify.com/v1/me/player/previous', () => {
            return new HttpResponse(null, { status: 204 });
          })
        );

        const tool = SpotifyConnectorConfig.tools.SKIP_TO_PREVIOUS as MCPToolDefinition;
        const mockContext = createMockConnectorContext({
          oauth2Credentials: mockOAuth2Credentials,
        });

        const result = await tool.handler({}, mockContext);
        expect(result).toBe('Skipped to previous track successfully');
      });
    });
  });
});

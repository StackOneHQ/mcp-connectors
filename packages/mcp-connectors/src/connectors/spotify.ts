import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

// Spotify API interfaces for type safety
interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{
    id: string;
    name: string;
    external_urls: {
      spotify: string;
    };
  }>;
  album: {
    id: string;
    name: string;
    images: Array<{
      url: string;
      height: number;
      width: number;
    }>;
    release_date: string;
  };
  duration_ms: number;
  explicit: boolean;
  external_urls: {
    spotify: string;
  };
  popularity: number;
  preview_url: string | null;
}

interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  followers: {
    total: number;
  };
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
  external_urls: {
    spotify: string;
  };
}

interface SpotifyAlbum {
  id: string;
  name: string;
  artists: Array<{
    id: string;
    name: string;
  }>;
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
  release_date: string;
  total_tracks: number;
  external_urls: {
    spotify: string;
  };
}

interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  public: boolean;
  collaborative: boolean;
  owner: {
    id: string;
    display_name: string;
  };
  tracks: {
    total: number;
  };
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
  external_urls: {
    spotify: string;
  };
}

interface SpotifyUser {
  id: string;
  display_name: string | null;
  email?: string;
  followers: {
    total: number;
  };
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
  country?: string;
  external_urls: {
    spotify: string;
  };
}

interface SpotifyCurrentlyPlaying {
  is_playing: boolean;
  progress_ms: number | null;
  item: SpotifyTrack | null;
  device: {
    id: string;
    name: string;
    type: string;
    volume_percent: number;
  } | null;
  shuffle_state: boolean;
  repeat_state: 'off' | 'track' | 'context';
  context: {
    type: string;
    uri: string;
  } | null;
}

interface SpotifySearchResponse<T> {
  tracks?: {
    items: T[];
    total: number;
    limit: number;
    offset: number;
    next: string | null;
    previous: string | null;
  };
  artists?: {
    items: T[];
    total: number;
    limit: number;
    offset: number;
    next: string | null;
    previous: string | null;
  };
  albums?: {
    items: T[];
    total: number;
    limit: number;
    offset: number;
    next: string | null;
    previous: string | null;
  };
  playlists?: {
    items: T[];
    total: number;
    limit: number;
    offset: number;
    next: string | null;
    previous: string | null;
  };
}

interface SpotifyPaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  next: string | null;
  previous: string | null;
}

// OAuth2 credentials schema for Spotify
const spotifyOAuth2Schema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.string(),
  tokenType: z.string().default('Bearer'),
  clientId: z.string(),
  clientSecret: z.string(),
});

type SpotifyOAuth2Credentials = z.infer<typeof spotifyOAuth2Schema>;

class SpotifyClient {
  private baseUrl = 'https://api.spotify.com/v1';
  private tokenUrl = 'https://accounts.spotify.com/api/token';
  private oauth2: SpotifyOAuth2Credentials;

  constructor(oauth2: SpotifyOAuth2Credentials) {
    this.oauth2 = oauth2;
  }

  private async ensureValidToken(): Promise<void> {
    const expiresAt = new Date(this.oauth2.expiresAt);
    const now = new Date();

    // Refresh token if it expires within 5 minutes
    if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
      await this.refreshAccessToken();
    }
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.oauth2.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${this.oauth2.clientId}:${this.oauth2.clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.oauth2.refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Spotify token refresh failed: ${response.status} ${response.statusText}`
      );
    }

    const tokenData = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      token_type: string;
    };
    this.oauth2.accessToken = tokenData.access_token;
    this.oauth2.expiresAt = new Date(
      Date.now() + tokenData.expires_in * 1000
    ).toISOString();

    if (tokenData.refresh_token) {
      this.oauth2.refreshToken = tokenData.refresh_token;
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `${this.oauth2.tokenType} ${this.oauth2.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  async searchTracks(params: {
    q: string;
    market?: string;
    limit?: number;
    offset?: number;
  }): Promise<SpotifySearchResponse<SpotifyTrack>> {
    await this.ensureValidToken();

    const queryParams = new URLSearchParams({
      q: params.q,
      type: 'track',
      limit: (params.limit || 20).toString(),
      offset: (params.offset || 0).toString(),
    });

    if (params.market) {
      queryParams.set('market', params.market);
    }

    const response = await fetch(`${this.baseUrl}/search?${queryParams}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<SpotifySearchResponse<SpotifyTrack>>;
  }

  async searchArtists(params: {
    q: string;
    market?: string;
    limit?: number;
    offset?: number;
  }): Promise<SpotifySearchResponse<SpotifyArtist>> {
    await this.ensureValidToken();

    const queryParams = new URLSearchParams({
      q: params.q,
      type: 'artist',
      limit: (params.limit || 20).toString(),
      offset: (params.offset || 0).toString(),
    });

    if (params.market) {
      queryParams.set('market', params.market);
    }

    const response = await fetch(`${this.baseUrl}/search?${queryParams}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<SpotifySearchResponse<SpotifyArtist>>;
  }

  async searchAlbums(params: {
    q: string;
    market?: string;
    limit?: number;
    offset?: number;
  }): Promise<SpotifySearchResponse<SpotifyAlbum>> {
    await this.ensureValidToken();

    const queryParams = new URLSearchParams({
      q: params.q,
      type: 'album',
      limit: (params.limit || 20).toString(),
      offset: (params.offset || 0).toString(),
    });

    if (params.market) {
      queryParams.set('market', params.market);
    }

    const response = await fetch(`${this.baseUrl}/search?${queryParams}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<SpotifySearchResponse<SpotifyAlbum>>;
  }

  async searchPlaylists(params: {
    q: string;
    market?: string;
    limit?: number;
    offset?: number;
  }): Promise<SpotifySearchResponse<SpotifyPlaylist>> {
    await this.ensureValidToken();

    const queryParams = new URLSearchParams({
      q: params.q,
      type: 'playlist',
      limit: (params.limit || 20).toString(),
      offset: (params.offset || 0).toString(),
    });

    if (params.market) {
      queryParams.set('market', params.market);
    }

    const response = await fetch(`${this.baseUrl}/search?${queryParams}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<SpotifySearchResponse<SpotifyPlaylist>>;
  }

  async getUserProfile(): Promise<SpotifyUser> {
    await this.ensureValidToken();
    const response = await fetch(`${this.baseUrl}/me`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<SpotifyUser>;
  }

  async getUserPlaylists(
    params: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<SpotifyPaginatedResponse<SpotifyPlaylist>> {
    await this.ensureValidToken();

    const queryParams = new URLSearchParams({
      limit: (params.limit || 20).toString(),
      offset: (params.offset || 0).toString(),
    });

    const response = await fetch(`${this.baseUrl}/me/playlists?${queryParams}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<SpotifyPaginatedResponse<SpotifyPlaylist>>;
  }

  async getUserSavedTracks(
    params: {
      market?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<SpotifyPaginatedResponse<{ added_at: string; track: SpotifyTrack }>> {
    await this.ensureValidToken();

    const queryParams = new URLSearchParams({
      limit: (params.limit || 20).toString(),
      offset: (params.offset || 0).toString(),
    });

    if (params.market) {
      queryParams.set('market', params.market);
    }

    const response = await fetch(`${this.baseUrl}/me/tracks?${queryParams}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<
      SpotifyPaginatedResponse<{ added_at: string; track: SpotifyTrack }>
    >;
  }

  async getCurrentlyPlaying(market?: string): Promise<SpotifyCurrentlyPlaying | null> {
    await this.ensureValidToken();

    const queryParams = new URLSearchParams();
    if (market) {
      queryParams.set('market', market);
    }

    const response = await fetch(
      `${this.baseUrl}/me/player/currently-playing?${queryParams}`,
      {
        headers: this.getHeaders(),
      }
    );

    if (response.status === 204) {
      return null; // No content - nothing playing
    }

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<SpotifyCurrentlyPlaying>;
  }

  async pausePlayback(deviceId?: string): Promise<void> {
    await this.ensureValidToken();

    const queryParams = new URLSearchParams();
    if (deviceId) {
      queryParams.set('device_id', deviceId);
    }

    const response = await fetch(`${this.baseUrl}/me/player/pause?${queryParams}`, {
      method: 'PUT',
      headers: this.getHeaders(),
    });

    if (!response.ok && response.status !== 204) {
      throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
    }
  }

  async resumePlayback(deviceId?: string): Promise<void> {
    await this.ensureValidToken();

    const queryParams = new URLSearchParams();
    if (deviceId) {
      queryParams.set('device_id', deviceId);
    }

    const response = await fetch(`${this.baseUrl}/me/player/play?${queryParams}`, {
      method: 'PUT',
      headers: this.getHeaders(),
    });

    if (!response.ok && response.status !== 204) {
      throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
    }
  }

  async skipToNext(deviceId?: string): Promise<void> {
    await this.ensureValidToken();

    const queryParams = new URLSearchParams();
    if (deviceId) {
      queryParams.set('device_id', deviceId);
    }

    const response = await fetch(`${this.baseUrl}/me/player/next?${queryParams}`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok && response.status !== 204) {
      throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
    }
  }

  async skipToPrevious(deviceId?: string): Promise<void> {
    await this.ensureValidToken();

    const queryParams = new URLSearchParams();
    if (deviceId) {
      queryParams.set('device_id', deviceId);
    }

    const response = await fetch(`${this.baseUrl}/me/player/previous?${queryParams}`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok && response.status !== 204) {
      throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
    }
  }
}

export const SpotifyConnectorConfig = mcpConnectorConfig({
  name: 'Spotify',
  key: 'spotify',
  version: '1.0.0',
  logo: 'https://developer.spotify.com/images/guidelines/design/icon3@2x.png',
  credentials: z.object({
    clientId: z.string().describe('Spotify OAuth2 Client ID'),
    clientSecret: z.string().describe('Spotify OAuth2 Client Secret'),
  }),
  setup: z.object({}),
  oauth2: {
    schema: spotifyOAuth2Schema,
    token: async (_credentials) => {
      throw new Error(
        'Initial token acquisition should be done through Spotify OAuth2 web flow'
      );
    },
    refresh: async (credentials, oauth2Credentials) => {
      const oauth2Parsed = spotifyOAuth2Schema.parse(oauth2Credentials);
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${btoa(`${credentials.clientId}:${credentials.clientSecret}`)}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: oauth2Parsed.refreshToken || '',
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Spotify token refresh failed: ${response.status} ${response.statusText}`
        );
      }

      const tokenData = (await response.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
        token_type: string;
      };

      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || oauth2Parsed.refreshToken,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        tokenType: tokenData.token_type || 'Bearer',
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
      };
    },
  },
  examplePrompt:
    'Search for tracks by The Beatles, show me my saved tracks, or control my Spotify playback',
  tools: (tool) => ({
    SEARCH_TRACKS: tool({
      name: 'spotify_search_tracks',
      description: 'Search for tracks on Spotify',
      schema: z.object({
        q: z.string().describe('Search query for tracks'),
        market: z
          .string()
          .optional()
          .describe('ISO 3166-1 alpha-2 country code (e.g., US, GB)'),
        limit: z.number().min(1).max(50).default(20).describe('Number of results (1-50)'),
        offset: z.number().min(0).default(0).describe('Starting index for pagination'),
      }),
      handler: async (args, context) => {
        try {
          const oauth2Raw = await context.getOauth2Credentials?.();
          if (!oauth2Raw) {
            throw new Error('OAuth2 credentials not available');
          }

          const oauth2 = spotifyOAuth2Schema.parse(oauth2Raw);
          const client = new SpotifyClient(oauth2);
          const results = await client.searchTracks(args);
          return JSON.stringify(results, null, 2);
        } catch (error) {
          return `Failed to search tracks: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    SEARCH_ARTISTS: tool({
      name: 'spotify_search_artists',
      description: 'Search for artists on Spotify',
      schema: z.object({
        q: z.string().describe('Search query for artists'),
        market: z
          .string()
          .optional()
          .describe('ISO 3166-1 alpha-2 country code (e.g., US, GB)'),
        limit: z.number().min(1).max(50).default(20).describe('Number of results (1-50)'),
        offset: z.number().min(0).default(0).describe('Starting index for pagination'),
      }),
      handler: async (args, context) => {
        try {
          const oauth2Raw = await context.getOauth2Credentials?.();
          if (!oauth2Raw) {
            throw new Error('OAuth2 credentials not available');
          }

          const oauth2 = spotifyOAuth2Schema.parse(oauth2Raw);
          const client = new SpotifyClient(oauth2);
          const results = await client.searchArtists(args);
          return JSON.stringify(results, null, 2);
        } catch (error) {
          return `Failed to search artists: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    SEARCH_ALBUMS: tool({
      name: 'spotify_search_albums',
      description: 'Search for albums on Spotify',
      schema: z.object({
        q: z.string().describe('Search query for albums'),
        market: z
          .string()
          .optional()
          .describe('ISO 3166-1 alpha-2 country code (e.g., US, GB)'),
        limit: z.number().min(1).max(50).default(20).describe('Number of results (1-50)'),
        offset: z.number().min(0).default(0).describe('Starting index for pagination'),
      }),
      handler: async (args, context) => {
        try {
          const oauth2Raw = await context.getOauth2Credentials?.();
          if (!oauth2Raw) {
            throw new Error('OAuth2 credentials not available');
          }

          const oauth2 = spotifyOAuth2Schema.parse(oauth2Raw);
          const client = new SpotifyClient(oauth2);
          const results = await client.searchAlbums(args);
          return JSON.stringify(results, null, 2);
        } catch (error) {
          return `Failed to search albums: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    SEARCH_PLAYLISTS: tool({
      name: 'spotify_search_playlists',
      description: 'Search for playlists on Spotify',
      schema: z.object({
        q: z.string().describe('Search query for playlists'),
        market: z
          .string()
          .optional()
          .describe('ISO 3166-1 alpha-2 country code (e.g., US, GB)'),
        limit: z.number().min(1).max(50).default(20).describe('Number of results (1-50)'),
        offset: z.number().min(0).default(0).describe('Starting index for pagination'),
      }),
      handler: async (args, context) => {
        try {
          const oauth2Raw = await context.getOauth2Credentials?.();
          if (!oauth2Raw) {
            throw new Error('OAuth2 credentials not available');
          }

          const oauth2 = spotifyOAuth2Schema.parse(oauth2Raw);
          const client = new SpotifyClient(oauth2);
          const results = await client.searchPlaylists(args);
          return JSON.stringify(results, null, 2);
        } catch (error) {
          return `Failed to search playlists: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_USER_PROFILE: tool({
      name: 'spotify_get_user_profile',
      description: "Get the current user's Spotify profile information",
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const oauth2Raw = await context.getOauth2Credentials?.();
          if (!oauth2Raw) {
            throw new Error('OAuth2 credentials not available');
          }

          const oauth2 = spotifyOAuth2Schema.parse(oauth2Raw);
          const client = new SpotifyClient(oauth2);
          const profile = await client.getUserProfile();
          return JSON.stringify(profile, null, 2);
        } catch (error) {
          return `Failed to get user profile: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_USER_PLAYLISTS: tool({
      name: 'spotify_get_user_playlists',
      description: "Get the current user's playlists",
      schema: z.object({
        limit: z.number().min(1).max(50).default(20).describe('Number of results (1-50)'),
        offset: z.number().min(0).default(0).describe('Starting index for pagination'),
      }),
      handler: async (args, context) => {
        try {
          const oauth2Raw = await context.getOauth2Credentials?.();
          if (!oauth2Raw) {
            throw new Error('OAuth2 credentials not available');
          }

          const oauth2 = spotifyOAuth2Schema.parse(oauth2Raw);
          const client = new SpotifyClient(oauth2);
          const playlists = await client.getUserPlaylists(args);
          return JSON.stringify(playlists, null, 2);
        } catch (error) {
          return `Failed to get user playlists: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_USER_SAVED_TRACKS: tool({
      name: 'spotify_get_user_saved_tracks',
      description: "Get the current user's saved (liked) tracks",
      schema: z.object({
        market: z
          .string()
          .optional()
          .describe('ISO 3166-1 alpha-2 country code (e.g., US, GB)'),
        limit: z.number().min(1).max(50).default(20).describe('Number of results (1-50)'),
        offset: z.number().min(0).default(0).describe('Starting index for pagination'),
      }),
      handler: async (args, context) => {
        try {
          const oauth2Raw = await context.getOauth2Credentials?.();
          if (!oauth2Raw) {
            throw new Error('OAuth2 credentials not available');
          }

          const oauth2 = spotifyOAuth2Schema.parse(oauth2Raw);
          const client = new SpotifyClient(oauth2);
          const savedTracks = await client.getUserSavedTracks(args);
          return JSON.stringify(savedTracks, null, 2);
        } catch (error) {
          return `Failed to get saved tracks: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_CURRENT_PLAYING: tool({
      name: 'spotify_get_current_playing',
      description: "Get information about the user's current playback state",
      schema: z.object({
        market: z
          .string()
          .optional()
          .describe('ISO 3166-1 alpha-2 country code (e.g., US, GB)'),
      }),
      handler: async (args, context) => {
        try {
          const oauth2Raw = await context.getOauth2Credentials?.();
          if (!oauth2Raw) {
            throw new Error('OAuth2 credentials not available');
          }

          const oauth2 = spotifyOAuth2Schema.parse(oauth2Raw);
          const client = new SpotifyClient(oauth2);
          const currentPlaying = await client.getCurrentlyPlaying(args.market);

          if (!currentPlaying) {
            return 'No track currently playing';
          }

          return JSON.stringify(currentPlaying, null, 2);
        } catch (error) {
          return `Failed to get current playing track: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    PAUSE_PLAYBACK: tool({
      name: 'spotify_pause_playback',
      description: "Pause the user's current playback",
      schema: z.object({
        deviceId: z.string().optional().describe('Device ID to target (optional)'),
      }),
      handler: async (args, context) => {
        try {
          const oauth2Raw = await context.getOauth2Credentials?.();
          if (!oauth2Raw) {
            throw new Error('OAuth2 credentials not available');
          }

          const oauth2 = spotifyOAuth2Schema.parse(oauth2Raw);
          const client = new SpotifyClient(oauth2);
          await client.pausePlayback(args.deviceId);
          return 'Playback paused successfully';
        } catch (error) {
          return `Failed to pause playback: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    RESUME_PLAYBACK: tool({
      name: 'spotify_resume_playback',
      description: "Resume the user's current playback",
      schema: z.object({
        deviceId: z.string().optional().describe('Device ID to target (optional)'),
      }),
      handler: async (args, context) => {
        try {
          const oauth2Raw = await context.getOauth2Credentials?.();
          if (!oauth2Raw) {
            throw new Error('OAuth2 credentials not available');
          }

          const oauth2 = spotifyOAuth2Schema.parse(oauth2Raw);
          const client = new SpotifyClient(oauth2);
          await client.resumePlayback(args.deviceId);
          return 'Playback resumed successfully';
        } catch (error) {
          return `Failed to resume playback: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    SKIP_TO_NEXT: tool({
      name: 'spotify_skip_to_next',
      description: "Skip to the next track in the user's queue",
      schema: z.object({
        deviceId: z.string().optional().describe('Device ID to target (optional)'),
      }),
      handler: async (args, context) => {
        try {
          const oauth2Raw = await context.getOauth2Credentials?.();
          if (!oauth2Raw) {
            throw new Error('OAuth2 credentials not available');
          }

          const oauth2 = spotifyOAuth2Schema.parse(oauth2Raw);
          const client = new SpotifyClient(oauth2);
          await client.skipToNext(args.deviceId);
          return 'Skipped to next track successfully';
        } catch (error) {
          return `Failed to skip to next track: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    SKIP_TO_PREVIOUS: tool({
      name: 'spotify_skip_to_previous',
      description: "Skip to the previous track in the user's queue",
      schema: z.object({
        deviceId: z.string().optional().describe('Device ID to target (optional)'),
      }),
      handler: async (args, context) => {
        try {
          const oauth2Raw = await context.getOauth2Credentials?.();
          if (!oauth2Raw) {
            throw new Error('OAuth2 credentials not available');
          }

          const oauth2 = spotifyOAuth2Schema.parse(oauth2Raw);
          const client = new SpotifyClient(oauth2);
          await client.skipToPrevious(args.deviceId);
          return 'Skipped to previous track successfully';
        } catch (error) {
          return `Failed to skip to previous track: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

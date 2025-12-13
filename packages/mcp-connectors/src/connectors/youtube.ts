import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

// YouTube API interfaces for type safety
interface YouTubeVideo {
  kind: string;
  etag: string;
  id: string;
  snippet?: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: {
      default: { url: string; width: number; height: number };
      medium?: { url: string; width: number; height: number };
      high?: { url: string; width: number; height: number };
      standard?: { url: string; width: number; height: number };
      maxres?: { url: string; width: number; height: number };
    };
    channelTitle: string;
    tags?: string[];
    categoryId: string;
    liveBroadcastContent: string;
    defaultLanguage?: string;
    defaultAudioLanguage?: string;
  };
  statistics?: {
    viewCount: string;
    likeCount: string;
    dislikeCount: string;
    favoriteCount: string;
    commentCount: string;
  };
  contentDetails?: {
    duration: string;
    dimension: string;
    definition: string;
    caption: string;
    licensedContent: boolean;
    regionRestriction?: {
      allowed?: string[];
      blocked?: string[];
    };
  };
  status?: {
    uploadStatus: string;
    privacyStatus: string;
    license: string;
    embeddable: boolean;
    publicStatsViewable: boolean;
    madeForKids: boolean;
  };
}

interface YouTubeChannel {
  kind: string;
  etag: string;
  id: string;
  snippet?: {
    title: string;
    description: string;
    customUrl?: string;
    publishedAt: string;
    thumbnails: {
      default: { url: string; width: number; height: number };
      medium?: { url: string; width: number; height: number };
      high?: { url: string; width: number; height: number };
    };
    country?: string;
  };
  statistics?: {
    viewCount: string;
    subscriberCount: string;
    hiddenSubscriberCount: boolean;
    videoCount: string;
  };
  contentDetails?: {
    relatedPlaylists: {
      likes?: string;
      favorites?: string;
      uploads?: string;
      watchHistory?: string;
      watchLater?: string;
    };
  };
}

interface YouTubePlaylist {
  kind: string;
  etag: string;
  id: string;
  snippet?: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: {
      default: { url: string; width: number; height: number };
      medium?: { url: string; width: number; height: number };
      high?: { url: string; width: number; height: number };
    };
    channelTitle: string;
    defaultLanguage?: string;
  };
  status?: {
    privacyStatus: string;
  };
  contentDetails?: {
    itemCount: number;
  };
}

interface YouTubeSearchResult {
  kind: string;
  etag: string;
  id: {
    kind: string;
    videoId?: string;
    channelId?: string;
    playlistId?: string;
  };
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: {
      default: { url: string; width: number; height: number };
      medium?: { url: string; width: number; height: number };
      high?: { url: string; width: number; height: number };
    };
    channelTitle: string;
    liveBroadcastContent: string;
  };
}

interface YouTubePlaylistItem {
  kind: string;
  etag: string;
  id: string;
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: {
      default: { url: string; width: number; height: number };
      medium?: { url: string; width: number; height: number };
      high?: { url: string; width: number; height: number };
    };
    channelTitle: string;
    playlistId: string;
    position: number;
    resourceId: {
      kind: string;
      videoId: string;
    };
  };
  contentDetails: {
    videoId: string;
    startAt?: string;
    endAt?: string;
    note?: string;
    videoPublishedAt?: string;
  };
}

interface YouTubeApiResponse<T> {
  kind: string;
  etag: string;
  nextPageToken?: string;
  prevPageToken?: string;
  regionCode?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: T[];
}

class YouTubeClient {
  private apiKey: string;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeRequest<T>(
    endpoint: string,
    params: Record<string, string>
  ): Promise<YouTubeApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.append('key', this.apiKey);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `YouTube API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json() as Promise<YouTubeApiResponse<T>>;
  }

  async searchVideos(params: {
    q: string;
    maxResults?: number;
    order?: 'relevance' | 'date' | 'rating' | 'viewCount' | 'title';
    publishedAfter?: string;
    publishedBefore?: string;
    regionCode?: string;
    relevanceLanguage?: string;
    channelId?: string;
    channelType?: 'any' | 'show';
    videoDefinition?: 'any' | 'high' | 'standard';
    videoDuration?: 'any' | 'long' | 'medium' | 'short';
    videoLicense?: 'any' | 'creativeCommon' | 'youtube';
    videoCaption?: 'any' | 'closedCaption' | 'none';
    pageToken?: string;
  }): Promise<YouTubeApiResponse<YouTubeSearchResult>> {
    const queryParams: Record<string, string> = {
      part: 'snippet',
      type: 'video',
      q: params.q,
      maxResults: (params.maxResults || 10).toString(),
    };

    if (params.order) queryParams.order = params.order;
    if (params.publishedAfter) queryParams.publishedAfter = params.publishedAfter;
    if (params.publishedBefore) queryParams.publishedBefore = params.publishedBefore;
    if (params.regionCode) queryParams.regionCode = params.regionCode;
    if (params.relevanceLanguage)
      queryParams.relevanceLanguage = params.relevanceLanguage;
    if (params.channelId) queryParams.channelId = params.channelId;
    if (params.channelType) queryParams.channelType = params.channelType;
    if (params.videoDefinition) queryParams.videoDefinition = params.videoDefinition;
    if (params.videoDuration) queryParams.videoDuration = params.videoDuration;
    if (params.videoLicense) queryParams.videoLicense = params.videoLicense;
    if (params.videoCaption) queryParams.videoCaption = params.videoCaption;
    if (params.pageToken) queryParams.pageToken = params.pageToken;

    return this.makeRequest<YouTubeSearchResult>('/search', queryParams);
  }

  async searchChannels(params: {
    q: string;
    maxResults?: number;
    order?: 'relevance' | 'date' | 'rating' | 'viewCount' | 'title';
    regionCode?: string;
    relevanceLanguage?: string;
    pageToken?: string;
  }): Promise<YouTubeApiResponse<YouTubeSearchResult>> {
    const queryParams: Record<string, string> = {
      part: 'snippet',
      type: 'channel',
      q: params.q,
      maxResults: (params.maxResults || 10).toString(),
    };

    if (params.order) queryParams.order = params.order;
    if (params.regionCode) queryParams.regionCode = params.regionCode;
    if (params.relevanceLanguage)
      queryParams.relevanceLanguage = params.relevanceLanguage;
    if (params.pageToken) queryParams.pageToken = params.pageToken;

    return this.makeRequest<YouTubeSearchResult>('/search', queryParams);
  }

  async getVideoDetails(params: {
    videoIds: string[];
    part?: string[];
  }): Promise<YouTubeApiResponse<YouTubeVideo>> {
    const parts = params.part || ['snippet', 'statistics', 'contentDetails'];
    const queryParams: Record<string, string> = {
      part: parts.join(','),
      id: params.videoIds.join(','),
    };

    return this.makeRequest<YouTubeVideo>('/videos', queryParams);
  }

  async getChannelDetails(params: {
    channelIds?: string[];
    forUsername?: string;
    part?: string[];
  }): Promise<YouTubeApiResponse<YouTubeChannel>> {
    const parts = params.part || ['snippet', 'statistics', 'contentDetails'];
    const queryParams: Record<string, string> = {
      part: parts.join(','),
    };

    if (params.channelIds) {
      queryParams.id = params.channelIds.join(',');
    } else if (params.forUsername) {
      queryParams.forUsername = params.forUsername;
    }

    return this.makeRequest<YouTubeChannel>('/channels', queryParams);
  }

  async getPlaylistDetails(params: {
    playlistIds: string[];
    part?: string[];
  }): Promise<YouTubeApiResponse<YouTubePlaylist>> {
    const parts = params.part || ['snippet', 'status', 'contentDetails'];
    const queryParams: Record<string, string> = {
      part: parts.join(','),
      id: params.playlistIds.join(','),
    };

    return this.makeRequest<YouTubePlaylist>('/playlists', queryParams);
  }

  async getPlaylistItems(params: {
    playlistId: string;
    maxResults?: number;
    pageToken?: string;
  }): Promise<YouTubeApiResponse<YouTubePlaylistItem>> {
    const queryParams: Record<string, string> = {
      part: 'snippet,contentDetails',
      playlistId: params.playlistId,
      maxResults: (params.maxResults || 25).toString(),
    };

    if (params.pageToken) {
      queryParams.pageToken = params.pageToken;
    }

    return this.makeRequest<YouTubePlaylistItem>('/playlistItems', queryParams);
  }

  async getMostPopularVideos(params: {
    regionCode?: string;
    categoryId?: string;
    maxResults?: number;
    pageToken?: string;
  }): Promise<YouTubeApiResponse<YouTubeVideo>> {
    const queryParams: Record<string, string> = {
      part: 'snippet,statistics,contentDetails',
      chart: 'mostPopular',
      maxResults: (params.maxResults || 25).toString(),
    };

    if (params.regionCode) queryParams.regionCode = params.regionCode;
    if (params.categoryId) queryParams.videoCategoryId = params.categoryId;
    if (params.pageToken) queryParams.pageToken = params.pageToken;

    return this.makeRequest<YouTubeVideo>('/videos', queryParams);
  }
}

export const YouTubeConnectorConfig = mcpConnectorConfig({
  name: 'YouTube',
  key: 'youtube',
  version: '1.0.0',
  logo: 'https://www.youtube.com/s/desktop/8d9c6f0b/img/favicon_144x144.png',
  description:
    'Access YouTube content including videos, channels, playlists, and search functionality',
  credentials: z.object({
    apiKey: z
      .string()
      .describe('YouTube Data API v3 key (get from Google Cloud Console)'),
  }),
  setup: z.object({}),
  examplePrompt:
    'Search for "machine learning tutorials" videos, get details about a specific channel, and find the most popular tech videos in the US.',
  tools: (tool) => ({
    SEARCH_VIDEOS: tool({
      name: 'youtube_search_videos',
      description: 'Search for videos on YouTube with advanced filtering options',
      schema: z.object({
        q: z.string().describe('Search query'),
        maxResults: z
          .number()
          .min(1)
          .max(50)
          .default(10)
          .describe('Number of results (1-50)'),
        order: z
          .enum(['relevance', 'date', 'rating', 'viewCount', 'title'])
          .default('relevance')
          .describe('Sort order'),
        publishedAfter: z
          .string()
          .optional()
          .describe('Videos published after this date (RFC 3339)'),
        publishedBefore: z
          .string()
          .optional()
          .describe('Videos published before this date (RFC 3339)'),
        regionCode: z
          .string()
          .optional()
          .describe('Two-letter country code (e.g., "US", "GB")'),
        relevanceLanguage: z
          .string()
          .optional()
          .describe('Language code (e.g., "en", "es")'),
        channelId: z.string().optional().describe('Search within specific channel'),
        videoDefinition: z
          .enum(['any', 'high', 'standard'])
          .optional()
          .describe('Video quality'),
        videoDuration: z
          .enum(['any', 'long', 'medium', 'short'])
          .optional()
          .describe('Video length'),
        videoLicense: z
          .enum(['any', 'creativeCommon', 'youtube'])
          .optional()
          .describe('Video license'),
        videoCaption: z
          .enum(['any', 'closedCaption', 'none'])
          .optional()
          .describe('Caption availability'),
        pageToken: z.string().optional().describe('Token for pagination'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new YouTubeClient(apiKey);
          const results = await client.searchVideos(args);
          return JSON.stringify(results, null, 2);
        } catch (error) {
          return `Failed to search videos: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    SEARCH_CHANNELS: tool({
      name: 'youtube_search_channels',
      description: 'Search for channels on YouTube',
      schema: z.object({
        q: z.string().describe('Search query'),
        maxResults: z
          .number()
          .min(1)
          .max(50)
          .default(10)
          .describe('Number of results (1-50)'),
        order: z
          .enum(['relevance', 'date', 'rating', 'viewCount', 'title'])
          .default('relevance')
          .describe('Sort order'),
        regionCode: z.string().optional().describe('Two-letter country code'),
        relevanceLanguage: z.string().optional().describe('Language code'),
        pageToken: z.string().optional().describe('Token for pagination'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new YouTubeClient(apiKey);
          const results = await client.searchChannels(args);
          return JSON.stringify(results, null, 2);
        } catch (error) {
          return `Failed to search channels: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_VIDEO_DETAILS: tool({
      name: 'youtube_get_video_details',
      description: 'Get detailed information about specific videos',
      schema: z.object({
        videoIds: z
          .array(z.string())
          .min(1)
          .max(50)
          .describe('Array of video IDs (max 50)'),
        includeParts: z
          .array(z.enum(['snippet', 'statistics', 'contentDetails', 'status']))
          .default(['snippet', 'statistics', 'contentDetails'])
          .describe('Parts of video data to include'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new YouTubeClient(apiKey);
          const results = await client.getVideoDetails({
            videoIds: args.videoIds,
            part: args.includeParts,
          });
          return JSON.stringify(results, null, 2);
        } catch (error) {
          return `Failed to get video details: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_CHANNEL_DETAILS: tool({
      name: 'youtube_get_channel_details',
      description: 'Get detailed information about specific channels',
      schema: z.object({
        channelIds: z.array(z.string()).optional().describe('Array of channel IDs'),
        username: z.string().optional().describe('Channel username (alternative to IDs)'),
        includeParts: z
          .array(z.enum(['snippet', 'statistics', 'contentDetails', 'brandingSettings']))
          .default(['snippet', 'statistics', 'contentDetails'])
          .describe('Parts of channel data to include'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new YouTubeClient(apiKey);
          const results = await client.getChannelDetails({
            channelIds: args.channelIds,
            forUsername: args.username,
            part: args.includeParts,
          });
          return JSON.stringify(results, null, 2);
        } catch (error) {
          return `Failed to get channel details: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_PLAYLIST_DETAILS: tool({
      name: 'youtube_get_playlist_details',
      description: 'Get information about specific playlists',
      schema: z.object({
        playlistIds: z.array(z.string()).min(1).max(50).describe('Array of playlist IDs'),
        includeParts: z
          .array(z.enum(['snippet', 'status', 'contentDetails']))
          .default(['snippet', 'status', 'contentDetails'])
          .describe('Parts of playlist data to include'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new YouTubeClient(apiKey);
          const results = await client.getPlaylistDetails({
            playlistIds: args.playlistIds,
            part: args.includeParts,
          });
          return JSON.stringify(results, null, 2);
        } catch (error) {
          return `Failed to get playlist details: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_PLAYLIST_ITEMS: tool({
      name: 'youtube_get_playlist_items',
      description: 'Get videos from a specific playlist',
      schema: z.object({
        playlistId: z.string().describe('Playlist ID'),
        maxResults: z
          .number()
          .min(1)
          .max(50)
          .default(25)
          .describe('Number of results (1-50)'),
        pageToken: z.string().optional().describe('Token for pagination'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new YouTubeClient(apiKey);
          const results = await client.getPlaylistItems(args);
          return JSON.stringify(results, null, 2);
        } catch (error) {
          return `Failed to get playlist items: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_POPULAR_VIDEOS: tool({
      name: 'youtube_get_popular_videos',
      description: 'Get most popular videos by region and category',
      schema: z.object({
        regionCode: z.string().default('US').describe('Two-letter country code'),
        categoryId: z
          .string()
          .optional()
          .describe('Video category ID (e.g., "1" for Film & Animation)'),
        maxResults: z
          .number()
          .min(1)
          .max(50)
          .default(25)
          .describe('Number of results (1-50)'),
        pageToken: z.string().optional().describe('Token for pagination'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new YouTubeClient(apiKey);
          const results = await client.getMostPopularVideos(args);
          return JSON.stringify(results, null, 2);
        } catch (error) {
          return `Failed to get popular videos: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

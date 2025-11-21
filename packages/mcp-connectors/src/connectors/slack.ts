import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface SlackChannel {
  id: string;
  name: string;
  is_archived: boolean;
  [key: string]: unknown;
}

interface SlackListChannelsResponse {
  ok: boolean;
  channels?: SlackChannel[];
  response_metadata?: {
    next_cursor: string;
  };
  error?: string;
}

interface SlackChannelInfoResponse {
  ok: boolean;
  channel?: SlackChannel;
  error?: string;
}

interface SlackMessageResponse {
  ok: boolean;
  ts?: string;
  channel?: string;
  error?: string;
  [key: string]: unknown;
}

interface SlackMessage {
  type: string;
  ts: string;
  user: string;
  text: string;
  thread_ts?: string;
  [key: string]: unknown;
}

interface SlackHistoryResponse {
  ok: boolean;
  messages?: SlackMessage[];
  has_more?: boolean;
  error?: string;
}

interface SlackUser {
  id: string;
  name: string;
  is_admin?: boolean;
  is_bot?: boolean;
  [key: string]: unknown;
}

interface SlackUserListResponse {
  ok: boolean;
  members?: SlackUser[];
  response_metadata?: {
    next_cursor: string;
  };
  error?: string;
}

interface SlackUserProfileField {
  value: string;
  [key: string]: unknown;
}

interface SlackUserProfile {
  real_name: string;
  email?: string;
  display_name?: string;
  fields?: Record<string, SlackUserProfileField>;
  [key: string]: unknown;
}

interface SlackUserProfileResponse {
  ok: boolean;
  profile?: SlackUserProfile;
  error?: string;
}

class SlackClient {
  private botHeaders: { Authorization: string; 'Content-Type': string };

  constructor(
    botToken: string,
    private teamId: string,
    private channelIds?: string
  ) {
    this.botHeaders = {
      Authorization: `Bearer ${botToken}`,
      'Content-Type': 'application/json',
    };
  }

  async getChannels(limit = 100, cursor?: string): Promise<SlackListChannelsResponse> {
    const predefinedChannelIds = this.channelIds;
    if (!predefinedChannelIds) {
      const params = new URLSearchParams({
        types: 'public_channel',
        exclude_archived: 'true',
        limit: Math.min(limit, 200).toString(),
        team_id: this.teamId,
      });

      if (cursor) {
        params.append('cursor', cursor);
      }

      const response = await fetch(`https://slack.com/api/conversations.list?${params}`, {
        headers: this.botHeaders,
      });

      return response.json() as Promise<SlackListChannelsResponse>;
    }

    const predefinedChannelIdsArray = predefinedChannelIds
      .split(',')
      .map((id: string) => id.trim());
    const channels: SlackChannel[] = [];

    for (const channelId of predefinedChannelIdsArray) {
      const params = new URLSearchParams({
        channel: channelId,
      });

      const response = await fetch(`https://slack.com/api/conversations.info?${params}`, {
        headers: this.botHeaders,
      });
      const data = (await response.json()) as SlackChannelInfoResponse;

      if (data.ok && data.channel && !data.channel.is_archived) {
        channels.push(data.channel);
      }
    }

    return {
      ok: true,
      channels: channels,
      response_metadata: { next_cursor: '' },
    };
  }

  async postMessage(channel_id: string, text: string): Promise<SlackMessageResponse> {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: this.botHeaders,
      body: JSON.stringify({
        channel: channel_id,
        text: text,
      }),
    });

    return response.json() as Promise<SlackMessageResponse>;
  }

  async postReply(
    channel_id: string,
    thread_ts: string,
    text: string
  ): Promise<SlackMessageResponse> {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: this.botHeaders,
      body: JSON.stringify({
        channel: channel_id,
        thread_ts: thread_ts,
        text: text,
      }),
    });

    return response.json() as Promise<SlackMessageResponse>;
  }

  async addReaction(
    channel_id: string,
    timestamp: string,
    reaction: string
  ): Promise<SlackMessageResponse> {
    const response = await fetch('https://slack.com/api/reactions.add', {
      method: 'POST',
      headers: this.botHeaders,
      body: JSON.stringify({
        channel: channel_id,
        timestamp: timestamp,
        name: reaction,
      }),
    });

    return response.json() as Promise<SlackMessageResponse>;
  }

  async getChannelHistory(channel_id: string, limit = 10): Promise<SlackHistoryResponse> {
    const params = new URLSearchParams({
      channel: channel_id,
      limit: limit.toString(),
    });

    const response = await fetch(
      `https://slack.com/api/conversations.history?${params}`,
      { headers: this.botHeaders }
    );

    return response.json() as Promise<SlackHistoryResponse>;
  }

  async getThreadReplies(
    channel_id: string,
    thread_ts: string
  ): Promise<SlackHistoryResponse> {
    const params = new URLSearchParams({
      channel: channel_id,
      ts: thread_ts,
    });

    const response = await fetch(
      `https://slack.com/api/conversations.replies?${params}`,
      { headers: this.botHeaders }
    );

    return response.json() as Promise<SlackHistoryResponse>;
  }

  async getUsers(limit = 100, cursor?: string): Promise<SlackUserListResponse> {
    const params = new URLSearchParams({
      limit: Math.min(limit, 200).toString(),
      team_id: this.teamId,
    });

    if (cursor) {
      params.append('cursor', cursor);
    }

    const response = await fetch(`https://slack.com/api/users.list?${params}`, {
      headers: this.botHeaders,
    });

    return response.json() as Promise<SlackUserListResponse>;
  }

  async getUserProfile(user_id: string): Promise<SlackUserProfileResponse> {
    const params = new URLSearchParams({
      user: user_id,
      include_labels: 'true',
    });

    const response = await fetch(`https://slack.com/api/users.profile.get?${params}`, {
      headers: this.botHeaders,
    });

    return response.json() as Promise<SlackUserProfileResponse>;
  }
}

export const SlackConnectorConfig = mcpConnectorConfig({
  name: 'Slack',
  key: 'slack',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/slack/filled/svg',
  credentials: z.object({
    botToken: z
      .string()
      .describe(
        'Slack Bot Token from your Slack App :: xoxb-1234567890-1234567890123-abcdefghijklmnopqrstuvwx :: https://api.slack.com/tutorials/tracks/getting-a-token'
      ),
    teamId: z
      .string()
      .describe(
        'Slack Team ID (also called Workspace ID) :: T1234567890 :: https://slack.com/intl/en-gb/help/articles/221769328-Locate-your-Slack-URL-or-ID'
      ),
  }),
  setup: z.object({
    channelIds: z
      .string()
      .optional()
      .describe(
        'Comma-separated list of channel IDs to use. If not provided, all channels will be used :: C1234567890,C0987654321'
      ),
  }),
  examplePrompt:
    'List all channels, post a message to #general, check the recent history of #engineering, and reply to a thread in #announcements.',
  tools: (tool) => ({
    POST_MESSAGE: tool({
      name: 'slack_post_message',
      description: 'Post a message to a Slack channel',
      schema: z.object({
        channel_id: z.string().describe('The ID of the channel to post to'),
        text: z.string().describe('The message text to post'),
      }),
      handler: async (args, context) => {
        try {
          const { botToken, teamId } = await context.getCredentials();
          const { channelIds: setupChannelIds } = await context.getSetup();
          const client = new SlackClient(botToken, teamId, setupChannelIds);
          const response = await client.postMessage(args.channel_id, args.text);
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to post message: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_CHANNEL_HISTORY: tool({
      name: 'slack_get_channel_history',
      description: 'Get message history from a Slack channel',
      schema: z.object({
        channel_id: z.string().describe('The ID of the channel'),
        limit: z
          .number()
          .optional()
          .describe('Number of messages to retrieve (default 10)'),
      }),
      handler: async (args, context) => {
        try {
          const { botToken, teamId } = await context.getCredentials();
          const { channelIds: setupChannelIds } = await context.getSetup();
          const client = new SlackClient(botToken, teamId, setupChannelIds);
          const response = await client.getChannelHistory(args.channel_id, args.limit);
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to get channel history: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_THREAD_REPLIES: tool({
      name: 'slack_get_thread_replies',
      description: 'Get replies in a message thread',
      schema: z.object({
        channel_id: z.string().describe('The ID of the channel containing the thread'),
        thread_ts: z
          .string()
          .describe(
            "The timestamp of the parent message in the format '1234567890.123456'. Timestamps in the format without the period can be converted by adding the period such that 6 numbers come after it."
          ),
      }),
      handler: async (args, context) => {
        try {
          const { botToken, teamId } = await context.getCredentials();
          const { channelIds: setupChannelIds } = await context.getSetup();
          const client = new SlackClient(botToken, teamId, setupChannelIds);
          const response = await client.getThreadReplies(args.channel_id, args.thread_ts);
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to get thread replies: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    ADD_REACTION: tool({
      name: 'slack_add_reaction',
      description: 'Add a reaction to a message',
      schema: z.object({
        channel_id: z.string().describe('The ID of the channel containing the message'),
        timestamp: z.string().describe('The timestamp of the message to react to'),
        reaction: z.string().describe('The name of the emoji reaction (without ::)'),
      }),
      handler: async (args, context) => {
        try {
          const { botToken, teamId } = await context.getCredentials();
          const { channelIds: setupChannelIds } = await context.getSetup();
          const client = new SlackClient(botToken, teamId, setupChannelIds);
          const response = await client.addReaction(
            args.channel_id,
            args.timestamp,
            args.reaction
          );
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to add reaction: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_CHANNELS: tool({
      name: 'slack_list_channels',
      description: 'List all channels in a Slack team',
      schema: z.object({
        limit: z
          .number()
          .optional()
          .describe('Maximum number of channels to return (default 100, max 200)'),
        cursor: z
          .string()
          .optional()
          .describe('Pagination cursor for next page of results'),
      }),
      handler: async (args, context) => {
        try {
          const { botToken, teamId } = await context.getCredentials();
          const { channelIds: setupChannelIds } = await context.getSetup();
          const client = new SlackClient(botToken, teamId, setupChannelIds);
          const response = await client.getChannels(args.limit, args.cursor);
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to list channels: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_USERS: tool({
      name: 'slack_get_users',
      description: 'Get a list of all users in a Slack team',
      schema: z.object({
        cursor: z
          .string()
          .optional()
          .describe('Pagination cursor for next page of results'),
        limit: z
          .number()
          .optional()
          .describe('Maximum number of users to return (default 100, max 200)'),
      }),
      handler: async (args, context) => {
        try {
          const { botToken, teamId } = await context.getCredentials();
          const { channelIds: setupChannelIds } = await context.getSetup();
          const client = new SlackClient(botToken, teamId, setupChannelIds);
          const response = await client.getUsers(args.limit, args.cursor);
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to get users: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_USER_PROFILE: tool({
      name: 'slack_get_user_profile',
      description: 'Get a user profile from a Slack user ID',
      schema: z.object({
        user_id: z.string().describe('The ID of the user'),
      }),
      handler: async (args, context) => {
        try {
          const { botToken, teamId } = await context.getCredentials();
          const { channelIds: setupChannelIds } = await context.getSetup();
          const client = new SlackClient(botToken, teamId, setupChannelIds);
          const response = await client.getUserProfile(args.user_id);
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to get user profile: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    REPLY_TO_THREAD: tool({
      name: 'slack_reply_to_thread',
      description: 'Reply to a message in a thread',
      schema: z.object({
        channel_id: z.string().describe('The ID of the channel containing the thread'),
        thread_ts: z
          .string()
          .describe(
            "The timestamp of the parent message in the format '1234567890.123456'. Timestamps in the format without the period can be converted by adding the period such that 6 numbers come after it."
          ),
        text: z.string().describe('The reply text'),
      }),
      handler: async (args, context) => {
        try {
          const { botToken, teamId } = await context.getCredentials();
          const { channelIds: setupChannelIds } = await context.getSetup();
          const client = new SlackClient(botToken, teamId, setupChannelIds);
          const response = await client.postReply(
            args.channel_id,
            args.thread_ts,
            args.text
          );
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to reply to thread: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

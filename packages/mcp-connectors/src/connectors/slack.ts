import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
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

export interface SlackCredentials {
  botToken: string;
  teamId: string;
  channelIds?: string;
}

export function createSlackServer(credentials: SlackCredentials): McpServer {
  const server = new McpServer({
    name: 'Slack',
    version: '1.0.0',
  });

  const client = new SlackClient(credentials.botToken, credentials.teamId, credentials.channelIds);

  server.tool(
    'slack_post_message',
    'Post a message to a Slack channel',
    {
      channel_id: z.string().describe('The ID of the channel to post to'),
      text: z.string().describe('The message text to post'),
    },
    async (args) => {
      try {
        const response = await client.postMessage(args.channel_id, args.text);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to post message: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'slack_get_channel_history',
    'Get message history from a Slack channel',
    {
      channel_id: z.string().describe('The ID of the channel'),
      limit: z
        .number()
        .optional()
        .describe('Number of messages to retrieve (default 10)'),
    },
    async (args) => {
      try {
        const response = await client.getChannelHistory(args.channel_id, args.limit);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to get channel history: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'slack_get_thread_replies',
    'Get replies in a message thread',
    {
      channel_id: z.string().describe('The ID of the channel containing the thread'),
      thread_ts: z
        .string()
        .describe(
          "The timestamp of the parent message in the format '1234567890.123456'. Timestamps in the format without the period can be converted by adding the period such that 6 numbers come after it."
        ),
    },
    async (args) => {
      try {
        const response = await client.getThreadReplies(args.channel_id, args.thread_ts);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to get thread replies: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'slack_add_reaction',
    'Add a reaction to a message',
    {
      channel_id: z.string().describe('The ID of the channel containing the message'),
      timestamp: z.string().describe('The timestamp of the message to react to'),
      reaction: z.string().describe('The name of the emoji reaction (without ::)'),
    },
    async (args) => {
      try {
        const response = await client.addReaction(
          args.channel_id,
          args.timestamp,
          args.reaction
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to add reaction: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'slack_list_channels',
    'List all channels in a Slack team',
    {
      limit: z
        .number()
        .optional()
        .describe('Maximum number of channels to return (default 100, max 200)'),
      cursor: z
        .string()
        .optional()
        .describe('Pagination cursor for next page of results'),
    },
    async (args) => {
      try {
        const response = await client.getChannels(args.limit, args.cursor);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to list channels: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'slack_get_users',
    'Get a list of all users in a Slack team',
    {
      cursor: z
        .string()
        .optional()
        .describe('Pagination cursor for next page of results'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of users to return (default 100, max 200)'),
    },
    async (args) => {
      try {
        const response = await client.getUsers(args.limit, args.cursor);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to get users: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'slack_get_user_profile',
    'Get a user profile from a Slack user ID',
    {
      user_id: z.string().describe('The ID of the user'),
    },
    async (args) => {
      try {
        const response = await client.getUserProfile(args.user_id);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to get user profile: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'slack_reply_to_thread',
    'Reply to a message in a thread',
    {
      channel_id: z.string().describe('The ID of the channel containing the thread'),
      thread_ts: z
        .string()
        .describe(
          "The timestamp of the parent message in the format '1234567890.123456'. Timestamps in the format without the period can be converted by adding the period such that 6 numbers come after it."
        ),
      text: z.string().describe('The reply text'),
    },
    async (args) => {
      try {
        const response = await client.postReply(
          args.channel_id,
          args.thread_ts,
          args.text
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to reply to thread: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  return server;
}

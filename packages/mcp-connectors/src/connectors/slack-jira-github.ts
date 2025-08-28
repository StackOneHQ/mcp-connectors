import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

// Slack message interface (simplified)
interface SlackMessage {
  text: string;
  user: string;
  ts: string;
  channel: string;
}

// Combined client for Slack, JIRA, and GitHub operations
class SlackJiraGitHubClient {
  private slackHeaders: { Authorization: string; 'Content-Type': string };
  private jiraHeaders: { Authorization: string; Accept: string; 'Content-Type': string };
  private githubHeaders: { Authorization: string; Accept: string; 'User-Agent': string };
  
  constructor(
    private slackBotToken: string,
    private slackTeamId: string,
    private jiraBaseUrl: string,
    private jiraEmail: string,
    private jiraApiToken: string,
    private githubToken: string
  ) {
    this.slackHeaders = {
      Authorization: `Bearer ${slackBotToken}`,
      'Content-Type': 'application/json',
    };
    
    const jiraAuth = btoa(`${jiraEmail}:${jiraApiToken}`);
    this.jiraHeaders = {
      Authorization: `Basic ${jiraAuth}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    this.githubHeaders = {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'MCP-Slack-JIRA-GitHub-Connector/1.0.0',
    };
  }

  // Get Slack message content
  async getSlackMessage(channelId: string, messageTs: string): Promise<SlackMessage> {
    const params = new URLSearchParams({
      channel: channelId,
      latest: messageTs,
      limit: '1',
      inclusive: 'true',
    });

    const response = await fetch(`https://slack.com/api/conversations.history?${params}`, {
      headers: this.slackHeaders,
    });

    const data = await response.json() as { ok: boolean; messages?: SlackMessage[]; error?: string };
    
    if (!data.ok || !data.messages || data.messages.length === 0) {
      throw new Error(`Failed to get Slack message: ${data.error || 'Message not found'}`);
    }

    return data.messages[0] as SlackMessage;
  }

  // Get Slack user info to get real name
  async getSlackUserInfo(userId: string): Promise<{ real_name?: string; name?: string }> {
    const params = new URLSearchParams({
      user: userId,
    });

    const response = await fetch(`https://slack.com/api/users.info?${params}`, {
      headers: this.slackHeaders,
    });

    const data = await response.json() as { 
      ok: boolean; 
      user?: { 
        profile?: { real_name?: string }; 
        name?: string 
      }; 
      error?: string 
    };
    
    if (!data.ok) {
      throw new Error(`Failed to get Slack user info: ${data.error || 'User not found'}`);
    }

    return {
      real_name: data.user?.profile?.real_name,
      name: data.user?.name,
    };
  }

  // Create Atlassian Document Format from plain text
  private createAdfFromText(text: string) {
    return {
      version: 1,
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: text,
            },
          ],
        },
      ],
    };
  }

  // Create JIRA ticket
  async createJiraTicket(
    projectKey: string,
    issueType: string,
    summary: string,
    description: string,
    fields?: Record<string, unknown>
  ): Promise<{ id: string; key: string }> {
    const payload = {
      fields: {
        project: {
          key: projectKey,
        },
        summary,
        issuetype: {
          name: issueType,
        },
        description: this.createAdfFromText(description),
        ...fields,
      },
    };

    const response = await fetch(`${this.jiraBaseUrl}/rest/api/3/issue`, {
      method: 'POST',
      headers: this.jiraHeaders,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`JIRA API Error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    return response.json() as Promise<{ id: string; key: string }>;
  }

  // Create GitHub issue
  async createGithubIssue(
    owner: string,
    repo: string,
    title: string,
    body: string,
    labels?: string[],
    assignees?: string[]
  ): Promise<{ id: number; number: number; html_url: string }> {
    const payload = {
      title,
      body,
      labels,
      assignees,
    };

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: this.githubHeaders,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<{ id: number; number: number; html_url: string }>;
  }

  // Create GitHub branch
  async createGithubBranch(
    owner: string,
    repo: string,
    branchName: string,
    baseBranch = 'main'
  ): Promise<{ name: string; commit: { sha: string } }> {
    // First, get the SHA of the base branch
    const baseResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`, {
      headers: this.githubHeaders,
    });

    if (!baseResponse.ok) {
      throw new Error(`Failed to get base branch ${baseBranch}: ${baseResponse.status} ${baseResponse.statusText}`);
    }

    const baseData = await baseResponse.json() as { object: { sha: string } };
    const baseSha = baseData.object.sha;

    // Create the new branch
    const payload = {
      ref: `refs/heads/${branchName}`,
      sha: baseSha,
    };

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      headers: this.githubHeaders,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`GitHub API Error creating branch: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const result = await response.json() as { ref: string; object: { sha: string } };
    return {
      name: branchName,
      commit: { sha: result.object.sha },
    };
  }

  // Full workflow: Slack message -> JIRA ticket -> GitHub issue + branch
  async createTicketFromSlackMessage(
    channelId: string,
    messageTs: string,
    jiraProjectKey: string,
    jiraIssueType: string,
    githubOwner: string,
    githubRepo: string,
    githubLabels?: string[],
    githubAssignees?: string[],
    baseBranch?: string
  ): Promise<{
    slackMessage: SlackMessage;
    jiraTicket: { id: string; key: string };
    githubIssue: { id: number; number: number; html_url: string };
    githubBranch: { name: string; commit: { sha: string } };
  }> {
    // Step 1: Get Slack message
    const slackMessage = await this.getSlackMessage(channelId, messageTs);
    
    // Get user info for better attribution
    let userName = slackMessage.user;
    try {
      const userInfo = await this.getSlackUserInfo(slackMessage.user);
      userName = userInfo.real_name || userInfo.name || slackMessage.user;
    } catch (error) {
      console.warn('Failed to get Slack user info:', error);
    }

    // Step 2: Create JIRA ticket
    const summary = slackMessage.text.length > 100 
      ? slackMessage.text.substring(0, 97) + '...' 
      : slackMessage.text;
    
    const description = `Created from Slack message by: ${userName}

Original message:
${slackMessage.text}

Slack Channel: ${channelId}
Message Timestamp: ${messageTs}`;

    const jiraTicket = await this.createJiraTicket(
      jiraProjectKey,
      jiraIssueType,
      summary,
      description
    );

    // Step 3: Create GitHub issue
    const githubTitle = `${jiraTicket.key}: ${summary}`;
    const githubBody = `Related JIRA ticket: ${jiraTicket.key}

${description}

## JIRA Ticket Details
- **Ticket**: ${jiraTicket.key}
- **Type**: ${jiraIssueType}
- **Project**: ${jiraProjectKey}`;

    const githubIssue = await this.createGithubIssue(
      githubOwner,
      githubRepo,
      githubTitle,
      githubBody,
      githubLabels,
      githubAssignees
    );

    // Step 4: Create GitHub branch with JIRA ticket ID
    const branchName = `feature/${jiraTicket.key.toLowerCase()}`;
    const githubBranch = await this.createGithubBranch(
      githubOwner,
      githubRepo,
      branchName,
      baseBranch
    );

    return {
      slackMessage,
      jiraTicket,
      githubIssue,
      githubBranch,
    };
  }
}

export const SlackJiraGitHubConnectorConfig = mcpConnectorConfig({
  name: 'Slack JIRA GitHub',
  key: 'slack_jira_github',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/slack/filled/svg',
  credentials: z.object({
    slackBotToken: z
      .string()
      .describe(
        'Slack Bot Token :: xoxb-1234567890-1234567890123-abcdefghijklmnopqrstuvwx :: https://api.slack.com/tutorials/tracks/getting-a-token'
      ),
    slackTeamId: z
      .string()
      .describe(
        'Slack Team ID (Workspace ID) :: T1234567890 :: https://slack.com/intl/en-gb/help/articles/221769328-Locate-your-Slack-URL-or-ID'
      ),
    jiraBaseUrl: z
      .string()
      .describe(
        'JIRA base URL :: https://your-domain.atlassian.net :: https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/'
      ),
    jiraEmail: z
      .string()
      .describe('JIRA account email :: user@example.com'),
    jiraApiToken: z
      .string()
      .describe(
        'JIRA API token :: ATATT3xFfGF01234567890abcdefghijklmnop :: https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/'
      ),
    githubToken: z
      .string()
      .describe(
        'GitHub Personal Access Token :: ghp_1234567890abcdefGHIJKLMNOP :: https://docs.github.com/en/rest/authentication/authenticating-to-the-rest-api'
      ),
  }),
  setup: z.object({}),
  description: 
    'Integrates Slack, JIRA, and GitHub to create JIRA tickets and GitHub issues with branches from Slack messages.',
  examplePrompt:
    'Take a Slack message from #engineering channel and create a JIRA story in PROJECT-1, then create a GitHub issue in my-repo with a feature branch.',
  tools: (tool) => ({
    CREATE_TICKET_FROM_SLACK_MESSAGE: tool({
      name: 'slack_jira_github_create_ticket_from_message',
      description: 'Create a JIRA ticket and GitHub issue with branch from a Slack message',
      schema: z.object({
        channelId: z.string().describe('Slack channel ID where the message is located'),
        messageTs: z.string().describe('Timestamp of the Slack message to process'),
        jiraProjectKey: z.string().describe('JIRA project key (e.g., "PROJ")'),
        jiraIssueType: z.string().describe('JIRA issue type (e.g., "Story", "Task", "Bug")'),
        githubOwner: z.string().describe('GitHub repository owner'),
        githubRepo: z.string().describe('GitHub repository name'),
        githubLabels: z.array(z.string()).optional().describe('Labels to apply to the GitHub issue'),
        githubAssignees: z.array(z.string()).optional().describe('GitHub usernames to assign to the issue'),
        baseBranch: z.string().optional().default('main').describe('Base branch for new GitHub branch (defaults to "main")'),
      }),
      handler: async (args, context) => {
        try {
          const {
            slackBotToken,
            slackTeamId,
            jiraBaseUrl,
            jiraEmail,
            jiraApiToken,
            githubToken,
          } = await context.getCredentials();

          const client = new SlackJiraGitHubClient(
            slackBotToken,
            slackTeamId,
            jiraBaseUrl,
            jiraEmail,
            jiraApiToken,
            githubToken
          );

          const result = await client.createTicketFromSlackMessage(
            args.channelId,
            args.messageTs,
            args.jiraProjectKey,
            args.jiraIssueType,
            args.githubOwner,
            args.githubRepo,
            args.githubLabels,
            args.githubAssignees,
            args.baseBranch
          );

          return JSON.stringify({
            success: true,
            message: 'Successfully created JIRA ticket and GitHub issue with branch from Slack message',
            data: {
              slackMessage: {
                text: result.slackMessage.text,
                user: result.slackMessage.user,
                channel: result.slackMessage.channel,
                timestamp: result.slackMessage.ts,
              },
              jiraTicket: {
                id: result.jiraTicket.id,
                key: result.jiraTicket.key,
                url: `${jiraBaseUrl}/browse/${result.jiraTicket.key}`,
              },
              githubIssue: {
                id: result.githubIssue.id,
                number: result.githubIssue.number,
                url: result.githubIssue.html_url,
              },
              githubBranch: {
                name: result.githubBranch.name,
                sha: result.githubBranch.commit.sha,
              },
            },
          }, null, 2);
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: `Failed to create ticket from Slack message: ${error instanceof Error ? error.message : String(error)}`,
          }, null, 2);
        }
      },
    }),
    GET_SLACK_MESSAGE: tool({
      name: 'slack_jira_github_get_slack_message',
      description: 'Get a specific Slack message content',
      schema: z.object({
        channelId: z.string().describe('Slack channel ID'),
        messageTs: z.string().describe('Timestamp of the Slack message'),
      }),
      handler: async (args, context) => {
        try {
          const {
            slackBotToken,
            slackTeamId,
            jiraBaseUrl,
            jiraEmail,
            jiraApiToken,
            githubToken,
          } = await context.getCredentials();

          const client = new SlackJiraGitHubClient(
            slackBotToken,
            slackTeamId,
            jiraBaseUrl,
            jiraEmail,
            jiraApiToken,
            githubToken
          );

          const message = await client.getSlackMessage(args.channelId, args.messageTs);
          
          // Try to get user info
          let userName = message.user;
          try {
            const userInfo = await client.getSlackUserInfo(message.user);
            userName = userInfo.real_name || userInfo.name || message.user;
          } catch (error) {
            console.warn('Failed to get user info:', error);
          }

          return JSON.stringify({
            text: message.text,
            user: message.user,
            userName: userName,
            channel: args.channelId,
            timestamp: message.ts,
          }, null, 2);
        } catch (error) {
          return `Failed to get Slack message: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

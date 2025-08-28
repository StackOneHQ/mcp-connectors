import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

// Figma API types
interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  comment?: FigmaComment[];
}

interface FigmaComment {
  id: string;
  text: string;
  user: {
    handle: string;
    img_url: string;
  };
  created_at: string;
  resolved_at?: string;
}

interface FigmaFileResponse {
  nodes: Record<string, { document: FigmaNode }>;
}

interface FigmaFileInfo {
  key: string;
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
  document: {
    name: string;
    type: string;
    children?: FigmaNode[];
  };
}

// Jira API types
interface JiraIssueFields {
  project: { key: string };
  summary: string;
  description: {
    type: string;
    version: number;
    content: Array<{
      type: string;
      content: Array<{
        type: string;
        text: string;
      }>;
    }>;
  };
  issuetype: { name: string };
  [key: string]: unknown;
}

interface JiraCreateIssueRequest {
  fields: JiraIssueFields;
}

interface JiraCreateIssueResponse {
  id: string;
  key: string;
  self: string;
}

// Type guards
function isFigmaFileResponse(data: unknown): data is FigmaFileResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'nodes' in data &&
    typeof (data as any).nodes === 'object'
  );
}

function isFigmaFileInfo(data: unknown): data is FigmaFileInfo {
  return (
    typeof data === 'object' &&
    data !== null &&
    'key' in data &&
    'name' in data &&
    'document' in data
  );
}

function isJiraCreateIssueResponse(data: unknown): data is JiraCreateIssueResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'key' in data &&
    'self' in data
  );
}

export const FigmaJiraConnectorConfig = mcpConnectorConfig({
  name: 'Figma Jira',
  key: 'figma_jira',
  version: '1.0.0',
  description: 'Connect Figma designs to Jira issues for seamless design-to-development workflow',
  logo: 'https://stackone-logos.com/api/disco/filled/svg',
  credentials: z.object({
    figmaToken: z.string().describe('Figma Personal Access Token'),
    jiraEmail: z.string().describe('Jira account email address'),
    jiraApiToken: z.string().describe('Jira API token (not password)'),
    jiraBaseUrl: z.string().describe('Jira instance URL (e.g., https://your-domain.atlassian.net)'),
  }),
  setup: z.object({
    defaultProjectKey: z.string().describe('Default Jira project key for new issues'),
    defaultIssueType: z.string().describe('Default issue type (e.g., "Task", "Story", "Bug")'),
  }),
  examplePrompt: 'Create a Jira ticket from a Figma frame with its comments and design details',
  tools: (tool) => ({
    GET_FIGMA_FRAME: tool({
      name: 'figma_jira_get_frame',
      description: 'Retrieve frame data from Figma including name, structure, and comments',
      schema: z.object({
        fileId: z.string().describe('Figma file ID (from the file URL)'),
        frameId: z.string().describe('Frame node ID to retrieve'),
      }),
      handler: async (args, context) => {
        try {
          const { figmaToken } = await context.getCredentials();
          const url = `https://api.figma.com/v1/files/${args.fileId}/nodes?ids=${args.frameId}`;
          
          const response = await fetch(url, {
            headers: { 'X-Figma-Token': figmaToken }
          });
          
          if (!response.ok) {
            throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
          }
          
          const rawData = await response.json();
          if (!isFigmaFileResponse(rawData)) {
            throw new Error('Invalid response format from Figma API');
          }
          
          const data: FigmaFileResponse = rawData;
          const frame = data.nodes[args.frameId]?.document;
          
          if (!frame) {
            return `Frame with ID ${args.frameId} not found in file ${args.fileId}`;
          }
          
          const result = {
            frameId: frame.id,
            name: frame.name,
            type: frame.type,
            comments: frame.comment || [],
            childrenCount: frame.children?.length || 0
          };
          
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to get Figma frame: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    CREATE_JIRA_TICKET_FROM_FRAME: tool({
      name: 'figma_jira_create_ticket_from_frame',
      description: 'Create a Jira issue from a Figma frame, including frame details and comments',
      schema: z.object({
        fileId: z.string().describe('Figma file ID (from the file URL)'),
        frameId: z.string().describe('Frame node ID to create ticket from'),
        projectKey: z.string().optional().describe('Jira project key (uses default if not provided)'),
        issueType: z.string().optional().describe('Issue type (uses default if not provided)'),
        summary: z.string().optional().describe('Custom summary (uses frame name if not provided)'),
        description: z.string().optional().describe('Additional description to append to frame details'),
      }),
      handler: async (args, context) => {
        try {
          const { figmaToken, jiraEmail, jiraApiToken, jiraBaseUrl } = await context.getCredentials();
          const { defaultProjectKey, defaultIssueType } = await context.getSetup();
          
          // Get Figma frame data
          const figmaUrl = `https://api.figma.com/v1/files/${args.fileId}/nodes?ids=${args.frameId}`;
          const figmaResponse = await fetch(figmaUrl, {
            headers: { 'X-Figma-Token': figmaToken }
          });
          
          if (!figmaResponse.ok) {
            throw new Error(`Figma API error: ${figmaResponse.status} ${figmaResponse.statusText}`);
          }
          
          const rawFigmaData = await figmaResponse.json();
          if (!isFigmaFileResponse(rawFigmaData)) {
            throw new Error('Invalid response format from Figma API');
          }
          
          const figmaData: FigmaFileResponse = rawFigmaData;
          const frame = figmaData.nodes[args.frameId]?.document;
          
          if (!frame) {
            return `Frame with ID ${args.frameId} not found in file ${args.fileId}`;
          }
          
          // Prepare Jira issue data
          const projectKey = args.projectKey || defaultProjectKey;
          const issueType = args.issueType || defaultIssueType;
          const summary = args.summary || `${frame.name} - Figma Design`;
          
          let description = `**Figma Frame Details**\n`;
          description += `- **Frame Name:** ${frame.name}\n`;
          description += `- **Frame Type:** ${frame.type}\n`;
          description += `- **Frame ID:** ${frame.id}\n`;
          description += `- **File ID:** ${args.fileId}\n`;
          description += `- **Figma Link:** https://www.figma.com/file/${args.fileId}?node-id=${args.frameId}\n\n`;
          
          if (frame.comment && frame.comment.length > 0) {
            description += `**Design Comments:**\n`;
            frame.comment.forEach((comment, index) => {
              const status = comment.resolved_at ? '✅ Resolved' : '💬 Open';
              description += `${index + 1}. ${status} by @${comment.user.handle}\n`;
              description += `   ${comment.text}\n\n`;
            });
          }
          
          if (args.description) {
            description += `**Additional Notes:**\n${args.description}\n\n`;
          }
          
          // Create Jira issue
          const jiraUrl = `${jiraBaseUrl}/rest/api/3/issue`;
          const auth = Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64');
          
          const jiraBody: JiraCreateIssueRequest = {
            fields: {
              project: { key: projectKey },
              summary,
              description: {
                type: 'doc',
                version: 1,
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: description
                      }
                    ]
                  }
                ]
              },
              issuetype: { name: issueType }
            }
          };
          
          const jiraResponse = await fetch(jiraUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(jiraBody)
          });
          
          if (!jiraResponse.ok) {
            const errorText = await jiraResponse.text();
            throw new Error(`Jira API error: ${jiraResponse.status} ${jiraResponse.statusText} - ${errorText}`);
          }
          
          const rawJiraResult = await jiraResponse.json();
          if (!isJiraCreateIssueResponse(rawJiraResult)) {
            throw new Error('Invalid response format from Jira API');
          }
          
          const jiraResult: JiraCreateIssueResponse = rawJiraResult;
          
          const result = {
            message: 'Jira ticket created successfully from Figma frame',
            jiraIssue: {
              id: jiraResult.id,
              key: jiraResult.key,
              url: `${jiraBaseUrl}/browse/${jiraResult.key}`,
              summary,
              projectKey,
              issueType
            },
            figmaFrame: {
              name: frame.name,
              type: frame.type,
              commentsCount: frame.comment?.length || 0,
              figmaUrl: `https://www.figma.com/file/${args.fileId}?node-id=${args.frameId}`
            }
          };
          
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to create Jira ticket from Figma frame: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_FIGMA_FILE_INFO: tool({
      name: 'figma_jira_get_file_info',
      description: 'Get basic information about a Figma file including available frames',
      schema: z.object({
        fileId: z.string().describe('Figma file ID (from the file URL)'),
      }),
      handler: async (args, context) => {
        try {
          const { figmaToken } = await context.getCredentials();
          const url = `https://api.figma.com/v1/files/${args.fileId}`;
          
          const response = await fetch(url, {
            headers: { 'X-Figma-Token': figmaToken }
          });
          
          if (!response.ok) {
            throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
          }
          
          const rawData = await response.json();
          if (!isFigmaFileInfo(rawData)) {
            throw new Error('Invalid response format from Figma API');
          }
          
          const data: FigmaFileInfo = rawData;
          
          const result = {
            fileId: data.key,
            name: data.name,
            lastModified: data.lastModified,
            thumbnailUrl: data.thumbnailUrl,
            version: data.version,
            document: {
              name: data.document.name,
              type: data.document.type,
              childrenCount: data.document.children?.length || 0
            }
          };
          
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to get Figma file info: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    SEARCH_FIGMA_FRAMES: tool({
      name: 'figma_jira_search_frames',
      description: 'Search for frames within a Figma file by name or type',
      schema: z.object({
        fileId: z.string().describe('Figma file ID (from the file URL)'),
        query: z.string().describe('Search query for frame names or types'),
        maxResults: z.number().optional().describe('Maximum number of results to return (default: 10)'),
      }),
      handler: async (args, context) => {
        try {
          const { figmaToken } = await context.getCredentials();
          const url = `https://api.figma.com/v1/files/${args.fileId}`;
          
          const response = await fetch(url, {
            headers: { 'X-Figma-Token': figmaToken }
          });
          
          if (!response.ok) {
            throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
          }
          
          const rawData = await response.json();
          if (!isFigmaFileInfo(rawData)) {
            throw new Error('Invalid response format from Figma API');
          }
          
          const data: FigmaFileInfo = rawData;
          const maxResults = args.maxResults || 10;
          
          // Recursively search for frames
          const searchFrames = (nodes: FigmaNode[], query: string): Array<{
            id: string;
            name: string;
            type: string;
            childrenCount: number;
          }> => {
            const results: Array<{
              id: string;
              name: string;
              type: string;
              childrenCount: number;
            }> = [];
            
            for (const node of nodes) {
              if (node.type === 'FRAME' && 
                  (node.name.toLowerCase().includes(query.toLowerCase()) || 
                   node.type.toLowerCase().includes(query.toLowerCase()))) {
                results.push({
                  id: node.id,
                  name: node.name,
                  type: node.type,
                  childrenCount: node.children?.length || 0
                });
              }
              
              if (node.children && results.length < maxResults) {
                results.push(...searchFrames(node.children, query));
              }
              
              if (results.length >= maxResults) break;
            }
            
            return results.slice(0, maxResults);
          };
          
          const frames = searchFrames([data.document as FigmaNode], args.query);
          
          const result = {
            fileId: data.key,
            fileName: data.name,
            searchQuery: args.query,
            framesFound: frames.length,
            frames: frames
          };
          
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to search Figma frames: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});
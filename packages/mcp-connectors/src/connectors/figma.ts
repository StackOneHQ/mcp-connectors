import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface FigmaFile {
  key: string;
  name: string;
  thumbnail_url: string;
  last_modified: string;
  document: FigmaNode;
  components: Record<string, FigmaComponent>;
  styles: Record<string, FigmaStyle>;
  version: string;
}

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  backgroundColor?: FigmaColor;
  fills?: FigmaFill[];
  absoluteBoundingBox?: FigmaRectangle;
  constraints?: FigmaConstraints;
  visible?: boolean;
}

interface FigmaComponent {
  key: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  user: FigmaUser;
  containing_frame: FigmaFrameInfo;
}

interface FigmaStyle {
  key: string;
  name: string;
  description: string;
  style_type: string;
  created_at: string;
  updated_at: string;
  user: FigmaUser;
}

interface FigmaComment {
  id: string;
  file_key: string;
  parent_id?: string;
  user: FigmaUser;
  created_at: string;
  resolved_at?: string;
  message: string;
  client_meta: {
    x?: number;
    y?: number;
    node_id?: string[];
  };
  reactions?: Array<{
    emoji: string;
    count: number;
    users: FigmaUser[];
  }>;
}

interface FigmaUser {
  id: string;
  handle: string;
  img_url: string;
  email?: string;
}

interface FigmaProject {
  id: string;
  name: string;
  modified_at: string;
}

interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface FigmaFill {
  blendMode: string;
  type: string;
  color?: FigmaColor;
  gradientHandlePositions?: Array<{ x: number; y: number }>;
  gradientStops?: Array<{ color: FigmaColor; position: number }>;
}

interface FigmaRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FigmaConstraints {
  vertical: string;
  horizontal: string;
}

interface FigmaFrameInfo {
  node_id: string;
  name: string;
  background_color: string;
  page_id: string;
  page_name: string;
}

class FigmaClient {
  private headers: { 'X-Figma-Token': string; 'Content-Type': string };
  private baseUrl = 'https://api.figma.com/v1';

  constructor(token: string) {
    this.headers = {
      'X-Figma-Token': token,
      'Content-Type': 'application/json',
    };
  }

  async getFile(
    fileKey: string,
    options: {
      version?: string;
      ids?: string[];
      depth?: number;
      geometry?: string;
      plugin_data?: string;
      branch_data?: boolean;
    } = {}
  ): Promise<FigmaFile> {
    const params = new URLSearchParams();
    if (options.version) params.append('version', options.version);
    if (options.ids) params.append('ids', options.ids.join(','));
    if (options.depth) params.append('depth', options.depth.toString());
    if (options.geometry) params.append('geometry', options.geometry);
    if (options.plugin_data) params.append('plugin_data', options.plugin_data);
    if (options.branch_data) params.append('branch_data', options.branch_data.toString());

    const url = `${this.baseUrl}/files/${fileKey}${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, { headers: this.headers });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<FigmaFile>;
  }

  async getFileNodes(
    fileKey: string,
    nodeIds: string[],
    options: {
      version?: string;
      depth?: number;
      geometry?: string;
      plugin_data?: string;
    } = {}
  ): Promise<{ nodes: Record<string, FigmaNode> }> {
    const params = new URLSearchParams();
    params.append('ids', nodeIds.join(','));
    if (options.version) params.append('version', options.version);
    if (options.depth) params.append('depth', options.depth.toString());
    if (options.geometry) params.append('geometry', options.geometry);
    if (options.plugin_data) params.append('plugin_data', options.plugin_data);

    const response = await fetch(
      `${this.baseUrl}/files/${fileKey}/nodes?${params.toString()}`,
      {
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<{ nodes: Record<string, FigmaNode> }>;
  }

  async getComments(fileKey: string): Promise<{ comments: FigmaComment[] }> {
    const response = await fetch(`${this.baseUrl}/files/${fileKey}/comments`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<{ comments: FigmaComment[] }>;
  }

  async postComment(
    fileKey: string,
    message: string,
    clientMeta: {
      x?: number;
      y?: number;
      node_id?: string[];
    } = {}
  ): Promise<{ comment: FigmaComment }> {
    const response = await fetch(`${this.baseUrl}/files/${fileKey}/comments`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        message,
        client_meta: clientMeta,
      }),
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<{ comment: FigmaComment }>;
  }

  async getTeamProjects(teamId: string): Promise<{ projects: FigmaProject[] }> {
    const response = await fetch(`${this.baseUrl}/teams/${teamId}/projects`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<{ projects: FigmaProject[] }>;
  }

  async getProjectFiles(
    projectId: string,
    options: {
      branch_data?: boolean;
    } = {}
  ): Promise<{
    files: Array<{
      key: string;
      name: string;
      thumbnail_url: string;
      last_modified: string;
    }>;
  }> {
    const params = new URLSearchParams();
    if (options.branch_data) params.append('branch_data', options.branch_data.toString());

    const url = `${this.baseUrl}/projects/${projectId}/files${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, { headers: this.headers });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<{
      files: Array<{
        key: string;
        name: string;
        thumbnail_url: string;
        last_modified: string;
      }>;
    }>;
  }

  async getMe(): Promise<FigmaUser> {
    const response = await fetch(`${this.baseUrl}/me`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<FigmaUser>;
  }

  async getImage(
    fileKey: string,
    nodeIds: string[],
    options: {
      scale?: number;
      format?: 'jpg' | 'png' | 'svg' | 'pdf';
      svg_include_id?: boolean;
      svg_simplify_stroke?: boolean;
      use_absolute_bounds?: boolean;
      version?: string;
    } = {}
  ): Promise<{ images: Record<string, string | null> }> {
    const params = new URLSearchParams();
    params.append('ids', nodeIds.join(','));
    if (options.scale) params.append('scale', options.scale.toString());
    if (options.format) params.append('format', options.format);
    if (options.svg_include_id)
      params.append('svg_include_id', options.svg_include_id.toString());
    if (options.svg_simplify_stroke)
      params.append('svg_simplify_stroke', options.svg_simplify_stroke.toString());
    if (options.use_absolute_bounds)
      params.append('use_absolute_bounds', options.use_absolute_bounds.toString());
    if (options.version) params.append('version', options.version);

    const response = await fetch(
      `${this.baseUrl}/images/${fileKey}?${params.toString()}`,
      {
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<{ images: Record<string, string | null> }>;
  }

  async getTeamComponents(
    teamId: string,
    options: {
      page_size?: number;
      after?: string;
    } = {}
  ): Promise<{
    components: FigmaComponent[];
    pagination?: { after?: string; before?: string };
  }> {
    const params = new URLSearchParams();
    if (options.page_size) params.append('page_size', options.page_size.toString());
    if (options.after) params.append('after', options.after);

    const url = `${this.baseUrl}/teams/${teamId}/components${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, { headers: this.headers });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<{
      components: FigmaComponent[];
      pagination?: { after?: string; before?: string };
    }>;
  }

  async getTeamStyles(
    teamId: string,
    options: {
      page_size?: number;
      after?: string;
    } = {}
  ): Promise<{
    styles: FigmaStyle[];
    pagination?: { after?: string; before?: string };
  }> {
    const params = new URLSearchParams();
    if (options.page_size) params.append('page_size', options.page_size.toString());
    if (options.after) params.append('after', options.after);

    const url = `${this.baseUrl}/teams/${teamId}/styles${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, { headers: this.headers });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<{
      styles: FigmaStyle[];
      pagination?: { after?: string; before?: string };
    }>;
  }

  async getVersions(fileKey: string): Promise<{
    versions: Array<{
      id: string;
      created_at: string;
      label: string;
      description: string;
      user: FigmaUser;
    }>;
  }> {
    const response = await fetch(`${this.baseUrl}/files/${fileKey}/versions`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<{
      versions: Array<{
        id: string;
        created_at: string;
        label: string;
        description: string;
        user: FigmaUser;
      }>;
    }>;
  }
}

export const FigmaConnectorConfig = mcpConnectorConfig({
  name: 'Figma',
  key: 'figma',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/figma/filled/svg',
  credentials: z.object({
    personalAccessToken: z
      .string()
      .describe(
        'Figma Personal Access Token :: figd_1234567890abcdefGHIJKLMNOP :: https://www.figma.com/developers/api#access-tokens' // cspell:disable-line
      ),
  }),
  setup: z.object({}),
  examplePrompt:
    'Get the details of my main design file, export PNG images of the key components, show me the team component library, list all comments on the project, and check the file version history.',
  tools: (tool) => ({
    GET_FILE: tool({
      name: 'figma_get_file',
      description:
        'Get detailed information about a Figma file including its document tree, components, and styles',
      schema: z.object({
        fileKey: z.string().describe('The Figma file key from the file URL'),
        version: z.string().optional().describe('Specific version ID to retrieve'),
        nodeIds: z.array(z.string()).optional().describe('Specific node IDs to retrieve'),
        depth: z
          .number()
          .optional()
          .describe('How deep to traverse the document tree (default: 1)'),
        geometry: z
          .enum(['paths', 'bounds'])
          .optional()
          .describe('Geometry format to return'),
        pluginData: z.string().optional().describe('Plugin data to retrieve'),
        branchData: z.boolean().optional().describe('Whether to include branch data'),
      }),
      handler: async (args, context) => {
        try {
          const { personalAccessToken } = await context.getCredentials();
          const client = new FigmaClient(personalAccessToken);
          const file = await client.getFile(args.fileKey, {
            version: args.version,
            ids: args.nodeIds,
            depth: args.depth,
            geometry: args.geometry,
            plugin_data: args.pluginData,
            branch_data: args.branchData,
          });
          return JSON.stringify(file, null, 2);
        } catch (error) {
          return `Failed to get file: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_FILE_NODES: tool({
      name: 'figma_get_file_nodes',
      description: 'Get specific nodes from a Figma file by their node IDs',
      schema: z.object({
        fileKey: z.string().describe('The Figma file key from the file URL'),
        nodeIds: z.array(z.string()).describe('Array of node IDs to retrieve'),
        version: z.string().optional().describe('Specific version ID to retrieve'),
        depth: z.number().optional().describe('How deep to traverse each node tree'),
        geometry: z
          .enum(['paths', 'bounds'])
          .optional()
          .describe('Geometry format to return'),
        pluginData: z.string().optional().describe('Plugin data to retrieve'),
      }),
      handler: async (args, context) => {
        try {
          const { personalAccessToken } = await context.getCredentials();
          const client = new FigmaClient(personalAccessToken);
          const nodes = await client.getFileNodes(args.fileKey, args.nodeIds, {
            version: args.version,
            depth: args.depth,
            geometry: args.geometry,
            plugin_data: args.pluginData,
          });
          return JSON.stringify(nodes, null, 2);
        } catch (error) {
          return `Failed to get file nodes: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_COMMENTS: tool({
      name: 'figma_get_comments',
      description: 'Get all comments from a Figma file',
      schema: z.object({
        fileKey: z.string().describe('The Figma file key from the file URL'),
      }),
      handler: async (args, context) => {
        try {
          const { personalAccessToken } = await context.getCredentials();
          const client = new FigmaClient(personalAccessToken);
          const comments = await client.getComments(args.fileKey);
          return JSON.stringify(comments, null, 2);
        } catch (error) {
          return `Failed to get comments: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    POST_COMMENT: tool({
      name: 'figma_post_comment',
      description: 'Post a new comment on a Figma file',
      schema: z.object({
        fileKey: z.string().describe('The Figma file key from the file URL'),
        message: z.string().describe('The comment message text'),
        x: z.number().optional().describe('X coordinate for positioning the comment'),
        y: z.number().optional().describe('Y coordinate for positioning the comment'),
        nodeIds: z
          .array(z.string())
          .optional()
          .describe('Node IDs to attach the comment to'),
      }),
      handler: async (args, context) => {
        try {
          const { personalAccessToken } = await context.getCredentials();
          const client = new FigmaClient(personalAccessToken);
          const comment = await client.postComment(args.fileKey, args.message, {
            x: args.x,
            y: args.y,
            node_id: args.nodeIds,
          });
          return JSON.stringify(comment, null, 2);
        } catch (error) {
          return `Failed to post comment: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_TEAM_PROJECTS: tool({
      name: 'figma_get_team_projects',
      description: 'List all projects in a Figma team',
      schema: z.object({
        teamId: z.string().describe('The Figma team ID'),
      }),
      handler: async (args, context) => {
        try {
          const { personalAccessToken } = await context.getCredentials();
          const client = new FigmaClient(personalAccessToken);
          const projects = await client.getTeamProjects(args.teamId);
          return JSON.stringify(projects, null, 2);
        } catch (error) {
          return `Failed to get team projects: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_PROJECT_FILES: tool({
      name: 'figma_get_project_files',
      description: 'List all files in a Figma project',
      schema: z.object({
        projectId: z.string().describe('The Figma project ID'),
        branchData: z.boolean().optional().describe('Whether to include branch data'),
      }),
      handler: async (args, context) => {
        try {
          const { personalAccessToken } = await context.getCredentials();
          const client = new FigmaClient(personalAccessToken);
          const files = await client.getProjectFiles(args.projectId, {
            branch_data: args.branchData,
          });
          return JSON.stringify(files, null, 2);
        } catch (error) {
          return `Failed to get project files: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_ME: tool({
      name: 'figma_get_me',
      description: 'Get information about the authenticated user',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { personalAccessToken } = await context.getCredentials();
          const client = new FigmaClient(personalAccessToken);
          const user = await client.getMe();
          return JSON.stringify(user, null, 2);
        } catch (error) {
          return `Failed to get user info: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_IMAGE: tool({
      name: 'figma_get_image',
      description: 'Get rendered images of Figma nodes as PNG, JPG, SVG, or PDF',
      schema: z.object({
        fileKey: z.string().describe('The Figma file key from the file URL'),
        nodeIds: z.array(z.string()).describe('Array of node IDs to render as images'),
        scale: z.number().optional().describe('Scale factor for rasterized output (1-4)'),
        format: z
          .enum(['jpg', 'png', 'svg', 'pdf'])
          .default('png')
          .describe('Image format'),
        svgIncludeId: z.boolean().optional().describe('Include node IDs in SVG output'),
        svgSimplifyStroke: z
          .boolean()
          .optional()
          .describe('Simplify strokes in SVG output'),
        useAbsoluteBounds: z
          .boolean()
          .optional()
          .describe('Use absolute bounds instead of relative'),
        version: z.string().optional().describe('Specific version ID to render'),
      }),
      handler: async (args, context) => {
        try {
          const { personalAccessToken } = await context.getCredentials();
          const client = new FigmaClient(personalAccessToken);
          const images = await client.getImage(args.fileKey, args.nodeIds, {
            scale: args.scale,
            format: args.format,
            svg_include_id: args.svgIncludeId,
            svg_simplify_stroke: args.svgSimplifyStroke,
            use_absolute_bounds: args.useAbsoluteBounds,
            version: args.version,
          });

          // For SVG format, return as text content
          if (args.format === 'svg') {
            const svgResults: Record<string, string> = {};
            for (const [nodeId, url] of Object.entries(images.images)) {
              if (url) {
                try {
                  const response = await fetch(url);
                  if (response.ok) {
                    svgResults[nodeId] = await response.text();
                  } else {
                    svgResults[nodeId] = `Error fetching SVG: ${response.statusText}`;
                  }
                } catch (fetchError) {
                  svgResults[nodeId] = `Error fetching SVG: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`;
                }
              } else {
                svgResults[nodeId] = 'No URL returned for this node';
              }
            }
            return JSON.stringify({ format: 'svg', images: svgResults }, null, 2);
          }

          // For binary formats (PNG, JPG, PDF), fetch and return as base64
          const binaryResults: Record<string, { data: string; mimeType: string }> = {};
          const mimeType = args.format === 'pdf' ? 'application/pdf' : `image/${args.format || 'png'}`;
          
          for (const [nodeId, url] of Object.entries(images.images)) {
            if (url) {
              try {
                const response = await fetch(url);
                if (response.ok) {
                  const buffer = await response.arrayBuffer();
                  const base64 = Buffer.from(buffer).toString('base64');
                  binaryResults[nodeId] = {
                    data: base64,
                    mimeType: mimeType
                  };
                } else {
                  binaryResults[nodeId] = {
                    data: '',
                    mimeType: 'text/plain'
                  };
                }
              } catch (fetchError) {
                binaryResults[nodeId] = {
                  data: `Error fetching image: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
                  mimeType: 'text/plain'
                };
              }
            } else {
              binaryResults[nodeId] = {
                data: 'No URL returned for this node',
                mimeType: 'text/plain'
              };
            }
          }
          
          return JSON.stringify({ format: args.format || 'png', images: binaryResults }, null, 2);
        } catch (error) {
          return `Failed to get images: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_TEAM_COMPONENTS: tool({
      name: 'figma_get_team_components',
      description: 'Get published components from a team library',
      schema: z.object({
        teamId: z.string().describe('The Figma team ID'),
        pageSize: z
          .number()
          .optional()
          .describe('Number of components to return per page'),
        after: z.string().optional().describe('Cursor for pagination'),
      }),
      handler: async (args, context) => {
        try {
          const { personalAccessToken } = await context.getCredentials();
          const client = new FigmaClient(personalAccessToken);
          const components = await client.getTeamComponents(args.teamId, {
            page_size: args.pageSize,
            after: args.after,
          });
          return JSON.stringify(components, null, 2);
        } catch (error) {
          return `Failed to get team components: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_TEAM_STYLES: tool({
      name: 'figma_get_team_styles',
      description: 'Get published styles from a team library (colors, text styles, etc.)',
      schema: z.object({
        teamId: z.string().describe('The Figma team ID'),
        pageSize: z.number().optional().describe('Number of styles to return per page'),
        after: z.string().optional().describe('Cursor for pagination'),
      }),
      handler: async (args, context) => {
        try {
          const { personalAccessToken } = await context.getCredentials();
          const client = new FigmaClient(personalAccessToken);
          const styles = await client.getTeamStyles(args.teamId, {
            page_size: args.pageSize,
            after: args.after,
          });
          return JSON.stringify(styles, null, 2);
        } catch (error) {
          return `Failed to get team styles: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_VERSIONS: tool({
      name: 'figma_get_versions',
      description: 'Get version history of a Figma file',
      schema: z.object({
        fileKey: z.string().describe('The Figma file key from the file URL'),
      }),
      handler: async (args, context) => {
        try {
          const { personalAccessToken } = await context.getCredentials();
          const client = new FigmaClient(personalAccessToken);
          const versions = await client.getVersions(args.fileKey);
          return JSON.stringify(versions, null, 2);
        } catch (error) {
          return `Failed to get versions: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

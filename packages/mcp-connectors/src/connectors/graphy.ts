import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

const GRAPHY_API_BASE = 'https://api.graphy.app/rest/v1';

interface GraphyBoard {
  id: string;
  title: string;
  type: string;
  description?: string;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  embed_url?: string;
  data_source?: {
    type: string;
    url?: string;
    query?: string;
  };
}

interface GraphyDataset {
  id: string;
  name: string;
  description?: string;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
  }>;
  row_count: number;
  created_at: string;
  updated_at: string;
}

class GraphyClient {
  private headers: {
    Authorization: string;
    'Content-Type': string;
    Accept: string;
  };

  constructor(apiToken: string) {
    this.headers = {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async makeRequest(
    path: string,
    method = 'GET',
    body?: Record<string, unknown>
  ): Promise<unknown> {
    const options: RequestInit = {
      method,
      headers: this.headers,
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${GRAPHY_API_BASE}${path}`, options);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorBody = (await response.json()) as {
          message?: string;
          error?: string;
        };
        if (errorBody.message) {
          errorMessage = errorBody.message;
        }
        if (errorBody.error) {
          errorMessage = errorBody.error;
        }
      } catch {
        // If we can't parse the error, use the basic message
      }
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    }
    return response.text();
  }

  async getBoards(limit = 50, offset = 0): Promise<GraphyBoard[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const response = await this.makeRequest(`/boards?${params}`);
    if (typeof response === 'object' && response && 'results' in response) {
      return response.results as GraphyBoard[];
    }
    return Array.isArray(response) ? response : [];
  }

  async getBoard(boardId: string): Promise<GraphyBoard> {
    const response = await this.makeRequest(`/boards/${boardId}`);
    if (typeof response === 'object' && response && 'data' in response) {
      return response.data as GraphyBoard;
    }
    return response as GraphyBoard;
  }

  async createBoard(
    title: string,
    type: string,
    description?: string,
    datasetId?: string,
    config?: Record<string, unknown>
  ): Promise<GraphyBoard> {
    const body: Record<string, unknown> = {
      title,
      type,
      description,
      dataset_id: datasetId,
      config,
    };

    const response = await this.makeRequest('/boards', 'POST', body);
    if (typeof response === 'object' && response && 'data' in response) {
      return response.data as GraphyBoard;
    }
    return response as GraphyBoard;
  }

  async updateBoard(
    boardId: string,
    title?: string,
    description?: string,
    config?: Record<string, unknown>
  ): Promise<GraphyBoard> {
    const body: Record<string, unknown> = {};
    if (title !== undefined) body.title = title;
    if (description !== undefined) body.description = description;
    if (config !== undefined) body.config = config;

    const response = await this.makeRequest(`/boards/${boardId}`, 'PUT', body);
    if (typeof response === 'object' && response && 'data' in response) {
      return response.data as GraphyBoard;
    }
    return response as GraphyBoard;
  }

  async deleteBoard(boardId: string): Promise<boolean> {
    await this.makeRequest(`/boards/${boardId}`, 'DELETE');
    return true;
  }

  async getDatasets(limit = 50, offset = 0): Promise<GraphyDataset[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const response = await this.makeRequest(`/datasets?${params}`);
    if (typeof response === 'object' && response && 'results' in response) {
      return response.results as GraphyDataset[];
    }
    return Array.isArray(response) ? response : [];
  }

  async getDataset(datasetId: string): Promise<GraphyDataset> {
    const response = await this.makeRequest(`/datasets/${datasetId}`);
    if (typeof response === 'object' && response && 'data' in response) {
      return response.data as GraphyDataset;
    }
    return response as GraphyDataset;
  }

  async createDataset(
    name: string,
    data: unknown[][],
    columns: Array<{ name: string; type: string }>,
    description?: string
  ): Promise<GraphyDataset> {
    const body = {
      name,
      description,
      data,
      columns,
    };

    const response = await this.makeRequest('/datasets', 'POST', body);
    if (typeof response === 'object' && response && 'data' in response) {
      return response.data as GraphyDataset;
    }
    return response as GraphyDataset;
  }

  async getBoardData(boardId: string, format = 'json'): Promise<unknown> {
    const params = new URLSearchParams({ format });
    return this.makeRequest(`/boards/${boardId}/data?${params}`);
  }

  async shareBoard(boardId: string, isPublic = true): Promise<string> {
    const body = { is_public: isPublic };
    const response = await this.makeRequest(`/boards/${boardId}/share`, 'POST', body);
    if (typeof response === 'object' && response && 'embed_url' in response) {
      return response.embed_url as string;
    }
    if (typeof response === 'object' && response && 'data' in response) {
      const data = response.data as { embed_url?: string };
      return data.embed_url || '';
    }
    return '';
  }
}

const handleGraphyError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

export const GraphyConnectorConfig = mcpConnectorConfig({
  name: 'Graphy',
  key: 'graphy',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/graphy/squared/png',
  credentials: z.object({
    apiToken: z
      .string()
      .describe(
        'Graphy API token from your account settings :: token_1234567890abcdef :: https://visualize.graphy.app/account/api'
      ),
  }),
  setup: z.object({}),
  examplePrompt:
    'Create a bar chart for sales data, list all my existing boards, and share a board publicly to get an embed URL. Show me all my datasets and create a line chart from the revenue dataset to visualize monthly trends. Create a pie chart showing user distribution by country from my analytics dataset, then share it publicly.',
  tools: (tool) => ({
    LIST_BOARDS: tool({
      name: 'graphy_list_boards',
      description: 'List all boards in your Graphy account',
      schema: z.object({
        limit: z
          .number()
          .min(1)
          .max(100)
          .optional()
          .default(50)
          .describe('Number of boards to return (max 100)'),
        offset: z
          .number()
          .min(0)
          .optional()
          .default(0)
          .describe('Number of boards to skip for pagination'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new GraphyClient(apiToken);
          const boards = await client.getBoards(args.limit, args.offset);
          return JSON.stringify(boards, null, 2);
        } catch (error) {
          return handleGraphyError(error);
        }
      },
    }),
    GET_BOARD: tool({
      name: 'graphy_get_board',
      description: 'Get details of a specific board by ID',
      schema: z.object({
        boardId: z.string().describe('The ID of the board to retrieve'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new GraphyClient(apiToken);
          const board = await client.getBoard(args.boardId);
          return JSON.stringify(board, null, 2);
        } catch (error) {
          return handleGraphyError(error);
        }
      },
    }),
    CREATE_BOARD: tool({
      name: 'graphy_create_board',
      description: 'Create a new board in Graphy',
      schema: z.object({
        title: z.string().describe('Board title'),
        type: z.string().describe('Board type (bar, line, pie, scatter, area, etc.)'),
        description: z.string().optional().describe('Board description'),
        datasetId: z.string().optional().describe('ID of dataset to use for the board'),
        config: z.record(z.unknown()).optional().describe('Board configuration options'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new GraphyClient(apiToken);
          const board = await client.createBoard(
            args.title,
            args.type,
            args.description,
            args.datasetId,
            args.config
          );
          return JSON.stringify(board, null, 2);
        } catch (error) {
          return handleGraphyError(error);
        }
      },
    }),
    UPDATE_BOARD: tool({
      name: 'graphy_update_board',
      description: 'Update an existing board',
      schema: z.object({
        boardId: z.string().describe('The ID of the board to update'),
        title: z.string().optional().describe('New board title'),
        description: z.string().optional().describe('New board description'),
        config: z
          .record(z.unknown())
          .optional()
          .describe('Updated board configuration options'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new GraphyClient(apiToken);
          const board = await client.updateBoard(
            args.boardId,
            args.title,
            args.description,
            args.config
          );
          return JSON.stringify(board, null, 2);
        } catch (error) {
          return handleGraphyError(error);
        }
      },
    }),
    DELETE_BOARD: tool({
      name: 'graphy_delete_board',
      description: 'Delete a board by ID',
      schema: z.object({
        boardId: z.string().describe('The ID of the board to delete'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new GraphyClient(apiToken);
          await client.deleteBoard(args.boardId);
          return `Board ${args.boardId} deleted successfully`;
        } catch (error) {
          return handleGraphyError(error);
        }
      },
    }),
    LIST_DATASETS: tool({
      name: 'graphy_list_datasets',
      description: 'List all datasets in your Graphy account',
      schema: z.object({
        limit: z
          .number()
          .min(1)
          .max(100)
          .optional()
          .default(50)
          .describe('Number of datasets to return (max 100)'),
        offset: z
          .number()
          .min(0)
          .optional()
          .default(0)
          .describe('Number of datasets to skip for pagination'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new GraphyClient(apiToken);
          const datasets = await client.getDatasets(args.limit, args.offset);
          return JSON.stringify(datasets, null, 2);
        } catch (error) {
          return handleGraphyError(error);
        }
      },
    }),
    GET_DATASET: tool({
      name: 'graphy_get_dataset',
      description: 'Get details of a specific dataset by ID',
      schema: z.object({
        datasetId: z.string().describe('The ID of the dataset to retrieve'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new GraphyClient(apiToken);
          const dataset = await client.getDataset(args.datasetId);
          return JSON.stringify(dataset, null, 2);
        } catch (error) {
          return handleGraphyError(error);
        }
      },
    }),
    CREATE_DATASET: tool({
      name: 'graphy_create_dataset',
      description: 'Create a new dataset with data',
      schema: z.object({
        name: z.string().describe('Dataset name'),
        data: z.array(z.array(z.unknown())).describe('Array of data rows'),
        columns: z
          .array(
            z.object({
              name: z.string().describe('Column name'),
              type: z
                .string()
                .describe('Column data type (string, number, date, boolean)'),
            })
          )
          .describe('Array of column definitions'),
        description: z.string().optional().describe('Dataset description'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new GraphyClient(apiToken);
          const dataset = await client.createDataset(
            args.name,
            args.data,
            args.columns,
            args.description
          );
          return JSON.stringify(dataset, null, 2);
        } catch (error) {
          return handleGraphyError(error);
        }
      },
    }),
    GET_BOARD_DATA: tool({
      name: 'graphy_get_board_data',
      description: 'Get the underlying data for a board',
      schema: z.object({
        boardId: z.string().describe('The ID of the board to get data for'),
        format: z
          .enum(['json', 'csv', 'xlsx'])
          .optional()
          .default('json')
          .describe('Data format to return'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new GraphyClient(apiToken);
          const data = await client.getBoardData(args.boardId, args.format);
          if (args.format === 'json') {
            return JSON.stringify(data, null, 2);
          }
          return String(data);
        } catch (error) {
          return handleGraphyError(error);
        }
      },
    }),
    SHARE_BOARD: tool({
      name: 'graphy_share_board',
      description: 'Share a board publicly and get an embed URL',
      schema: z.object({
        boardId: z.string().describe('The ID of the board to share'),
        isPublic: z
          .boolean()
          .optional()
          .default(true)
          .describe('Whether to make the board publicly accessible'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new GraphyClient(apiToken);
          const embedUrl = await client.shareBoard(args.boardId, args.isPublic);
          return `Board shared successfully. Embed URL: ${embedUrl}`;
        } catch (error) {
          return handleGraphyError(error);
        }
      },
    }),
  }),
});

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
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

  constructor(apiKey: string) {
    this.headers = {
      Authorization: `Bearer ${apiKey}`,
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

    // Handle binary formats (like XLSX) by returning base64-encoded data
    if (
      contentType?.includes(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ) ||
      contentType?.includes('application/octet-stream') ||
      path.includes('format=xlsx')
    ) {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return `data:${contentType || 'application/octet-stream'};base64,${buffer.toString('base64')}`;
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

export interface GraphyCredentials {
  apiKey: string;
}

export function createGraphyServer(credentials: GraphyCredentials): McpServer {
  const server = new McpServer({
    name: 'Graphy',
    version: '1.0.0',
  });

  server.tool(
    'graphy_list_boards',
    'List all boards in your Graphy account',
    {
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
    },
    async (args) => {
      try {
        const client = new GraphyClient(credentials.apiKey);
        const boards = await client.getBoards(args.limit, args.offset);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(boards, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: handleGraphyError(error),
          }],
        };
      }
    }
  );

  server.tool(
    'graphy_get_board',
    'Get details of a specific board by ID',
    {
      boardId: z.string().describe('The ID of the board to retrieve'),
    },
    async (args) => {
      try {
        const client = new GraphyClient(credentials.apiKey);
        const board = await client.getBoard(args.boardId);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(board, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: handleGraphyError(error),
          }],
        };
      }
    }
  );

  server.tool(
    'graphy_create_board',
    'Create a new board in Graphy',
    {
      title: z.string().describe('Board title'),
      type: z.string().describe('Board type (bar, line, pie, scatter, area, etc.)'),
      description: z.string().optional().describe('Board description'),
      datasetId: z.string().optional().describe('ID of dataset to use for the board'),
      config: z.record(z.unknown()).optional().describe('Board configuration options'),
    },
    async (args) => {
      try {
        const client = new GraphyClient(credentials.apiKey);
        const board = await client.createBoard(
          args.title,
          args.type,
          args.description,
          args.datasetId,
          args.config
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(board, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: handleGraphyError(error),
          }],
        };
      }
    }
  );

  server.tool(
    'graphy_update_board',
    'Update an existing board',
    {
      boardId: z.string().describe('The ID of the board to update'),
      title: z.string().optional().describe('New board title'),
      description: z.string().optional().describe('New board description'),
      config: z
        .record(z.unknown())
        .optional()
        .describe('Updated board configuration options'),
    },
    async (args) => {
      try {
        const client = new GraphyClient(credentials.apiKey);
        const board = await client.updateBoard(
          args.boardId,
          args.title,
          args.description,
          args.config
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(board, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: handleGraphyError(error),
          }],
        };
      }
    }
  );

  server.tool(
    'graphy_delete_board',
    'Delete a board by ID',
    {
      boardId: z.string().describe('The ID of the board to delete'),
    },
    async (args) => {
      try {
        const client = new GraphyClient(credentials.apiKey);
        await client.deleteBoard(args.boardId);
        return {
          content: [{
            type: 'text',
            text: `Board ${args.boardId} deleted successfully`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: handleGraphyError(error),
          }],
        };
      }
    }
  );

  server.tool(
    'graphy_list_datasets',
    'List all datasets in your Graphy account',
    {
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
    },
    async (args) => {
      try {
        const client = new GraphyClient(credentials.apiKey);
        const datasets = await client.getDatasets(args.limit, args.offset);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(datasets, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: handleGraphyError(error),
          }],
        };
      }
    }
  );

  server.tool(
    'graphy_get_dataset',
    'Get details of a specific dataset by ID',
    {
      datasetId: z.string().describe('The ID of the dataset to retrieve'),
    },
    async (args) => {
      try {
        const client = new GraphyClient(credentials.apiKey);
        const dataset = await client.getDataset(args.datasetId);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(dataset, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: handleGraphyError(error),
          }],
        };
      }
    }
  );

  server.tool(
    'graphy_create_dataset',
    'Create a new dataset with data',
    {
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
    },
    async (args) => {
      try {
        const client = new GraphyClient(credentials.apiKey);
        const dataset = await client.createDataset(
          args.name,
          args.data,
          args.columns as Array<{ name: string; type: string }>,
          args.description
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(dataset, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: handleGraphyError(error),
          }],
        };
      }
    }
  );

  server.tool(
    'graphy_get_board_data',
    'Get the underlying data for a board',
    {
      boardId: z.string().describe('The ID of the board to get data for'),
      format: z
        .enum(['json', 'csv', 'xlsx'])
        .optional()
        .default('json')
        .describe('Data format to return'),
    },
    async (args) => {
      try {
        const client = new GraphyClient(credentials.apiKey);
        const data = await client.getBoardData(args.boardId, args.format);
        let resultText: string;
        if (args.format === 'json') {
          resultText = JSON.stringify(data, null, 2);
        } else if (
          args.format === 'xlsx' &&
          typeof data === 'string' &&
          data.startsWith('data:')
        ) {
          resultText = data;
        } else {
          resultText = String(data);
        }
        return {
          content: [{
            type: 'text',
            text: resultText,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: handleGraphyError(error),
          }],
        };
      }
    }
  );

  server.tool(
    'graphy_share_board',
    'Share a board publicly and get an embed URL',
    {
      boardId: z.string().describe('The ID of the board to share'),
      isPublic: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to make the board publicly accessible'),
    },
    async (args) => {
      try {
        const client = new GraphyClient(credentials.apiKey);
        const embedUrl = await client.shareBoard(args.boardId, args.isPublic);
        return {
          content: [{
            type: 'text',
            text: `Board shared successfully. Embed URL: ${embedUrl}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: handleGraphyError(error),
          }],
        };
      }
    }
  );

  return server;
}

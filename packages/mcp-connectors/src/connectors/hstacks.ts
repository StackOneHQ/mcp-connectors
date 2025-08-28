import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

const HSTACKS_BASE_URL = 'https://api.hstacks.dev';
const USER_AGENT = 'hstacks-mcp/0.1';

// Type definitions
interface HStacksSchema {
  [key: string]: unknown;
}

interface HStacksImage {
  id: string;
  name: string;
  description?: string;
  [key: string]: unknown;
}

interface HStacksLocation {
  id: string;
  name: string;
  description?: string;
  [key: string]: unknown;
}

interface HStacksServer {
  id: string;
  name: string;
  vcpus: number;
  memory: string;
  disk: string;
  price: string;
  [key: string]: unknown;
}

interface HStacksValidationResponse {
  valid: boolean;
  errors?: string[];
  [key: string]: unknown;
}

interface HStacksDeploymentResponse {
  stackId: string;
  status: string;
  [key: string]: unknown;
}

interface HStacksStatusResponse {
  stackId: string;
  status: string;
  servers?: unknown[];
  [key: string]: unknown;
}

interface HStacksDeleteResponse {
  success: boolean;
  message?: string;
  [key: string]: unknown;
}

class HStacksClient {
  private headers: {
    'User-Agent': string;
    'Content-Type': string;
    'Access-Token': string;
  };

  constructor(accessToken: string) {
    this.headers = {
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/json',
      'Access-Token': accessToken,
    };
  }

  async makeRequest<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const url = `${HSTACKS_BASE_URL}/${path}`;
    console.log(`[HStacks] Making ${method} request to: ${url}`);

    const options: RequestInit = {
      method,
      headers: this.headers,
    };

    // Only add body for non-GET and non-HEAD requests when body is provided
    if (body !== undefined && method && !['GET', 'HEAD'].includes(method.toUpperCase())) {
      options.body = JSON.stringify(body);
      console.log('[HStacks] Request body:', JSON.stringify(body, null, 2));
    }

    try {
      console.log('[HStacks] Request headers:', this.headers);
      const response = await fetch(url, options);
      console.log(`[HStacks] Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[HStacks] Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const responseData = (await response.json()) as T;
      console.log('[HStacks] Response data:', JSON.stringify(responseData, null, 2));
      return responseData;
    } catch (error) {
      console.error(`[HStacks] Error making request to ${url}:`, error);
      throw error;
    }
  }

  async getSchema(): Promise<HStacksSchema> {
    return this.makeRequest<HStacksSchema>('info/hstacks-schema');
  }

  async getAvailableImages(): Promise<HStacksImage[]> {
    return this.makeRequest<HStacksImage[]>('info/available-images');
  }

  async getAvailableLocations(serverType?: string): Promise<HStacksLocation[]> {
    const endpoint = serverType
      ? `info/available-locations/${serverType}`
      : 'info/available-locations';
    return this.makeRequest<HStacksLocation[]>(endpoint);
  }

  async getAvailableServers(location?: string): Promise<HStacksServer[]> {
    const endpoint = location
      ? `info/available-servers/${location}`
      : 'info/available-servers';
    return this.makeRequest<HStacksServer[]>(endpoint);
  }

  async validateStack(stackData: unknown): Promise<HStacksValidationResponse> {
    return this.makeRequest<HStacksValidationResponse>(
      'stacks/validate',
      'POST',
      stackData
    );
  }

  async deployStack(stackData: unknown): Promise<HStacksDeploymentResponse> {
    return this.makeRequest<HStacksDeploymentResponse>(
      'stacks/create',
      'POST',
      stackData
    );
  }

  async deleteStack(stackId: string): Promise<HStacksDeleteResponse> {
    return this.makeRequest<HStacksDeleteResponse>(`stacks/delete/${stackId}`, 'POST');
  }

  async getStackStatus(stackId: string): Promise<HStacksStatusResponse> {
    return this.makeRequest<HStacksStatusResponse>(`stacks/check/${stackId}`);
  }
}

export const HStacksConnectorConfig = mcpConnectorConfig({
  name: 'hstacks',
  key: 'hstacks',
  version: '1.0.0',
  logo: 'https://hstacks.dev/images/logo.jpg', // Update with actual logo URL
  credentials: z.object({
    accessToken: z
      .string()
      .describe('hstacks API Access Token :: Get from your hstacks dashboard'),
  }),
  setup: z.object({
    // Add any setup options here if needed
  }),
  examplePrompt:
    'Get available server types, deploy a new stack with Ubuntu servers, check deployment status, and manage stack lifecycle.',
  tools: (tool) => ({
    GET_HSTACKS_SCHEMA: tool({
      name: 'get_hstacks_stacks_schema',
      description: 'Get the JSON schema that describes all hstacks Stack properties.',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new HStacksClient(accessToken);
          const schema = await client.getSchema();
          return JSON.stringify(schema);
        } catch (error) {
          return `Failed to get hstacks schema: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_AVAILABLE_IMAGES: tool({
      name: 'get_available_hstacks_images',
      description:
        'Get a list of all of the operating system images available to deploy a server with on hstacks.',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          console.log('[get_available_hstacks_images] Starting');
          const credentials = await context.getCredentials();
          console.log('[get_available_hstacks_images] Credentials:', credentials);
          const { accessToken } = credentials;

          if (!accessToken) {
            return 'ERROR: No access token provided in credentials';
          }

          console.log(
            '[get_available_hstacks_images] Creating client with token:',
            `${accessToken.substring(0, 8)}...`
          );
          const client = new HStacksClient(accessToken);

          console.log('[get_available_hstacks_images] Making API call');
          const images = await client.getAvailableImages();

          console.log('[get_available_hstacks_images] Success, got images:', images);
          return JSON.stringify(images);
        } catch (error) {
          const errorMsg = `ERROR in get_available_hstacks_images: ${error instanceof Error ? error.message : String(error)}`;
          console.error(errorMsg);
          return errorMsg;
        }
      },
    }),
    GET_AVAILABLE_LOCATIONS: tool({
      name: 'get_available_hstacks_locations',
      description:
        'Get a list of all of the locations that we can deploy a server to with hstacks.',
      schema: z.object({
        serverType: z
          .string()
          .optional()
          .describe("Optional server type to filter locations (e.g., 'cax11')"),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new HStacksClient(accessToken);
          const locations = await client.getAvailableLocations(args.serverType);
          return JSON.stringify(locations);
        } catch (error) {
          return `Failed to get available locations: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_AVAILABLE_SERVERS: tool({
      name: 'get_available_hstacks_servers',
      description:
        'Get a list of all of the servers that we can deploy with hstacks, optionally with a given location.',
      schema: z.object({
        location: z
          .string()
          .optional()
          .describe("Optional server type to filter locations (e.g., 'cax11')"),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new HStacksClient(accessToken);
          const servers = await client.getAvailableServers(args.location);
          return JSON.stringify(servers);
        } catch (error) {
          return `Failed to get available servers: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    VALIDATE_STACK: tool({
      name: 'validate_stack',
      description: 'Validate a hstacks Stack json.',
      schema: z.object({
        name: z.string().describe('Unique identifier for the stack deployment'),
        servers: z.array(z.any()).describe('Collection of server instances to deploy'),
        firewalls: z.array(z.any()).describe('Shared firewall configurations'),
        volumes: z.array(z.any()).describe('Persistent storage volumes'),
        successHook: z
          .string()
          .optional()
          .describe('Webhook URL called on successful deployment'),
        errorHook: z
          .string()
          .optional()
          .describe('Webhook URL called on deployment failure'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new HStacksClient(accessToken);

          const stackData = {
            name: args.name,
            servers: args.servers,
            firewalls: args.firewalls,
            volumes: args.volumes,
            successHook: args.successHook || '',
            errorHook: args.errorHook || '',
          };

          const validation = await client.validateStack(stackData);
          return JSON.stringify(validation);
        } catch (error) {
          return `Failed to validate stack: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    DEPLOY_STACK: tool({
      name: 'deploy_stack',
      description: 'Deploy a Stack to hstacks.',
      schema: z.object({
        name: z.string().describe('Unique identifier for the stack deployment'),
        servers: z.array(z.any()).describe('Collection of server instances to deploy'),
        firewalls: z.array(z.any()).describe('Shared firewall configurations'),
        volumes: z.array(z.any()).describe('Persistent storage volumes'),
        successHook: z
          .string()
          .optional()
          .describe('Webhook URL called on successful deployment'),
        errorHook: z
          .string()
          .optional()
          .describe('Webhook URL called on deployment failure'),
      }),
      handler: async (args, context) => {
        try {
          console.log('[deploy_stack] Starting deployment');
          const { accessToken } = await context.getCredentials();
          console.log(
            '[deploy_stack] Got access token:',
            accessToken ? 'present' : 'missing'
          );

          if (!accessToken) {
            throw new Error('No access token provided in credentials');
          }

          const client = new HStacksClient(accessToken);

          const stackData = {
            name: args.name,
            servers: args.servers,
            firewalls: args.firewalls,
            volumes: args.volumes,
            successHook: args.successHook || '',
            errorHook: args.errorHook || '',
          };

          console.log(
            '[deploy_stack] Deploying stack:',
            JSON.stringify(stackData, null, 2)
          );
          const deployment = await client.deployStack(stackData);
          console.log('[deploy_stack] Got deployment result:', deployment);

          const result = JSON.stringify(deployment);
          console.log('[deploy_stack] Returning result:', result);
          return result;
        } catch (error) {
          const errorMessage = `Failed to deploy stack: ${error instanceof Error ? error.message : String(error)}`;
          console.error('[deploy_stack] Error:', errorMessage);
          return errorMessage;
        }
      },
    }),
    DELETE_STACK: tool({
      name: 'delete_stack',
      description: 'Delete a hstacks Stack.',
      schema: z.object({
        stackID: z.string().describe('The stackID to check the deployment status of'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new HStacksClient(accessToken);
          const result = await client.deleteStack(args.stackID);
          return JSON.stringify(result);
        } catch (error) {
          return `Failed to delete stack: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_STACK_STATUS: tool({
      name: 'get_stack_status',
      description: 'Get the deployment status of a stack by a given StackID',
      schema: z.object({
        stackID: z.string().describe('The stackID to check the deployment status of'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new HStacksClient(accessToken);
          const status = await client.getStackStatus(args.stackID);
          return JSON.stringify(status);
        } catch (error) {
          return `Failed to get stack status: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

// Modal API response interfaces
interface ModalAppInfo {
  app_id: string;
  name: string;
  state: 'running' | 'stopped' | 'ephemeral';
  environment: string;
  created_at: string;
  description?: string;
}

interface ModalFunctionInfo {
  function_id: string;
  function_name: string;
  app_name: string;
  state: 'active' | 'inactive';
  created_at: string;
  last_invoked_at?: string;
  total_calls: number;
}

interface ModalFunctionCall {
  call_id: string;
  function_id: string;
  state: 'running' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  finished_at?: string;
  duration_ms?: number;
  input_data?: any;
  output_data?: any;
  error?: string;
}

interface ModalLogEntry {
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  function_call_id?: string;
  app_id?: string;
  source: 'stdout' | 'stderr' | 'system';
  metadata?: Record<string, any>;
}

interface ModalSandbox {
  sandbox_id: string;
  state: 'running' | 'stopped' | 'terminated';
  created_at: string;
  image: string;
  command: string[];
  ports?: number[];
  environment?: Record<string, string>;
  timeout_seconds?: number;
}

interface ModalProcess {
  process_id: string;
  sandbox_id: string;
  state: 'running' | 'completed' | 'failed';
  command: string[];
  started_at: string;
  finished_at?: string;
  exit_code?: number;
}

interface ModalSnapshot {
  snapshot_id: string;
  name?: string;
  created_at: string;
  size_bytes: number;
  description?: string;
}

// Modal API responses
interface ModalListAppsResponse {
  apps: ModalAppInfo[];
  has_more: boolean;
  next_cursor?: string;
}

interface ModalListFunctionsResponse {
  functions: ModalFunctionInfo[];
  has_more: boolean;
  next_cursor?: string;
}

interface ModalFunctionCallsResponse {
  calls: ModalFunctionCall[];
  has_more: boolean;
  next_cursor?: string;
}

interface ModalLogsResponse {
  logs: ModalLogEntry[];
  has_more: boolean;
  next_cursor?: string;
}

interface ModalSandboxResponse {
  sandbox: ModalSandbox;
}

interface ModalProcessResponse {
  process: ModalProcess;
  logs: ModalLogEntry[];
}

class ModalClient {
  private headers: { Authorization: string; 'Content-Type': string };
  private baseUrl = 'https://api.modal.com';

  constructor(apiToken: string) {
    this.headers = {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  async listApps(
    limit = 50,
    cursor?: string,
    environment?: string
  ): Promise<ModalListAppsResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });
    
    if (cursor) params.append('cursor', cursor);
    if (environment) params.append('environment', environment);

    const response = await fetch(`${this.baseUrl}/v1/apps?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to list apps: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<ModalListAppsResponse>;
  }

  async getApp(appId: string): Promise<ModalAppInfo> {
    const response = await fetch(`${this.baseUrl}/v1/apps/${appId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to get app: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<ModalAppInfo>;
  }

  async listFunctions(
    appId?: string,
    limit = 50,
    cursor?: string
  ): Promise<ModalListFunctionsResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });
    
    if (appId) params.append('app_id', appId);
    if (cursor) params.append('cursor', cursor);

    const response = await fetch(`${this.baseUrl}/v1/functions?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to list functions: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<ModalListFunctionsResponse>;
  }

  async getFunction(functionId: string): Promise<ModalFunctionInfo> {
    const response = await fetch(`${this.baseUrl}/v1/functions/${functionId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to get function: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<ModalFunctionInfo>;
  }

  async getFunctionCalls(
    functionId: string,
    limit = 50,
    cursor?: string,
    state?: string
  ): Promise<ModalFunctionCallsResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });
    
    if (cursor) params.append('cursor', cursor);
    if (state) params.append('state', state);

    const response = await fetch(`${this.baseUrl}/v1/functions/${functionId}/calls?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to get function calls: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<ModalFunctionCallsResponse>;
  }

  async getFunctionLogs(
    functionId: string,
    callId?: string,
    limit = 100,
    cursor?: string,
    startTime?: string,
    endTime?: string,
    level?: string
  ): Promise<ModalLogsResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });
    
    if (callId) params.append('call_id', callId);
    if (cursor) params.append('cursor', cursor);
    if (startTime) params.append('start_time', startTime);
    if (endTime) params.append('end_time', endTime);
    if (level) params.append('level', level);

    const response = await fetch(`${this.baseUrl}/v1/functions/${functionId}/logs?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to get function logs: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<ModalLogsResponse>;
  }

  async getAppLogs(
    appId: string,
    limit = 100,
    cursor?: string,
    startTime?: string,
    endTime?: string,
    level?: string
  ): Promise<ModalLogsResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });
    
    if (cursor) params.append('cursor', cursor);
    if (startTime) params.append('start_time', startTime);
    if (endTime) params.append('end_time', endTime);
    if (level) params.append('level', level);

    const response = await fetch(`${this.baseUrl}/v1/apps/${appId}/logs?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to get app logs: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<ModalLogsResponse>;
  }

  async createSandbox(
    image: string,
    command: string[],
    options: {
      ports?: number[];
      environment?: Record<string, string>;
      timeout_seconds?: number;
      resources?: {
        cpu?: number;
        memory_mb?: number;
        gpu?: string;
      };
    } = {}
  ): Promise<ModalSandboxResponse> {
    const response = await fetch(`${this.baseUrl}/v1/sandboxes`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        image,
        command,
        ...options,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create sandbox: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<ModalSandboxResponse>;
  }

  async getSandbox(sandboxId: string): Promise<ModalSandboxResponse> {
    const response = await fetch(`${this.baseUrl}/v1/sandboxes/${sandboxId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to get sandbox: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<ModalSandboxResponse>;
  }

  async listSandboxes(limit = 50, cursor?: string): Promise<{ sandboxes: ModalSandbox[]; has_more: boolean; next_cursor?: string }> {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });
    
    if (cursor) params.append('cursor', cursor);

    const response = await fetch(`${this.baseUrl}/v1/sandboxes?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to list sandboxes: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<{ sandboxes: ModalSandbox[]; has_more: boolean; next_cursor?: string }>;
  }

  async execInSandbox(
    sandboxId: string,
    command: string[],
    options: {
      background?: boolean;
      stdin?: string;
    } = {}
  ): Promise<ModalProcessResponse> {
    const response = await fetch(`${this.baseUrl}/v1/sandboxes/${sandboxId}/exec`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        command,
        ...options,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to exec in sandbox: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<ModalProcessResponse>;
  }

  async getSandboxLogs(
    sandboxId: string,
    processId?: string,
    limit = 100,
    cursor?: string
  ): Promise<ModalLogsResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });
    
    if (processId) params.append('process_id', processId);
    if (cursor) params.append('cursor', cursor);

    const response = await fetch(`${this.baseUrl}/v1/sandboxes/${sandboxId}/logs?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to get sandbox logs: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<ModalLogsResponse>;
  }

  async terminateSandbox(sandboxId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/v1/sandboxes/${sandboxId}/terminate`, {
      method: 'POST',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to terminate sandbox: ${response.status} ${response.statusText}`);
    }
  }

  async createSnapshot(
    sandboxId: string,
    name?: string,
    description?: string
  ): Promise<ModalSnapshot> {
    const response = await fetch(`${this.baseUrl}/v1/sandboxes/${sandboxId}/snapshots`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        name,
        description,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create snapshot: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<ModalSnapshot>;
  }

  async restoreFromSnapshot(
    snapshotId: string,
    image?: string,
    command?: string[]
  ): Promise<ModalSandboxResponse> {
    const response = await fetch(`${this.baseUrl}/v1/snapshots/${snapshotId}/restore`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        image,
        command,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to restore from snapshot: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<ModalSandboxResponse>;
  }

  async getProcessStatus(
    sandboxId: string,
    processId: string
  ): Promise<ModalProcess> {
    const response = await fetch(`${this.baseUrl}/v1/sandboxes/${sandboxId}/processes/${processId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to get process status: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<ModalProcess>;
  }

  async waitForProcess(
    sandboxId: string,
    processId: string,
    timeoutSeconds = 60
  ): Promise<ModalProcess> {
    const response = await fetch(`${this.baseUrl}/v1/sandboxes/${sandboxId}/processes/${processId}/wait`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        timeout_seconds: timeoutSeconds,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to wait for process: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<ModalProcess>;
  }
}

export const ModalConnectorConfig = mcpConnectorConfig({
  name: 'Modal',
  key: 'modal',
  version: '1.0.0',
  logo: 'https://modal.com/favicon-32x32.png',
  description: 'Modal MCP connector for managing sandboxes, functions, and apps with logging support',
  credentials: z.object({
    apiToken: z
      .string()
      .describe('Modal API token :: tok-1234567890abcdef :: https://modal.com/docs/guide/api-keys'),
  }),
  setup: z.object({
    defaultEnvironment: z
      .string()
      .optional()
      .describe('Default environment to use for operations (main, dev, etc.)'),
    defaultImage: z
      .string()
      .optional()
      .describe('Default Docker image for sandbox creation'),
  }),
  examplePrompt: 'List apps, get function logs, create a sandbox, execute code, and view debugging logs from both running and stopped functions.',
  tools: (tool) => ({
    LIST_APPS: tool({
      name: 'modal_list_apps',
      description: 'List all Modal apps with their current state',
      schema: z.object({
        limit: z
          .number()
          .optional()
          .describe('Maximum number of apps to return (default 50)'),
        cursor: z
          .string()
          .optional()
          .describe('Pagination cursor for next page of results'),
        environment: z
          .string()
          .optional()
          .describe('Filter by environment (main, dev, etc.)'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new ModalClient(apiToken);
          const response = await client.listApps(args.limit, args.cursor, args.environment);
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return `Failed to list apps: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_APP: tool({
      name: 'modal_get_app',
      description: 'Get detailed information about a specific Modal app',
      schema: z.object({
        app_id: z.string().describe('The ID of the Modal app'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new ModalClient(apiToken);
          const response = await client.getApp(args.app_id);
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return `Failed to get app: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_APP_LOGS: tool({
      name: 'modal_get_app_logs',
      description: 'Get logs for a Modal app, including both running and stopped apps',
      schema: z.object({
        app_id: z.string().describe('The ID of the Modal app'),
        limit: z
          .number()
          .optional()
          .describe('Maximum number of log entries to return (default 100)'),
        cursor: z
          .string()
          .optional()
          .describe('Pagination cursor for next page of results'),
        start_time: z
          .string()
          .optional()
          .describe('Start time for log filtering (ISO 8601 format)'),
        end_time: z
          .string()
          .optional()
          .describe('End time for log filtering (ISO 8601 format)'),
        level: z
          .enum(['DEBUG', 'INFO', 'WARNING', 'ERROR'])
          .optional()
          .describe('Filter by log level'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new ModalClient(apiToken);
          const response = await client.getAppLogs(
            args.app_id,
            args.limit,
            args.cursor,
            args.start_time,
            args.end_time,
            args.level
          );
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return `Failed to get app logs: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    LIST_FUNCTIONS: tool({
      name: 'modal_list_functions',
      description: 'List all Modal functions, optionally filtered by app',
      schema: z.object({
        app_id: z
          .string()
          .optional()
          .describe('Filter functions by app ID'),
        limit: z
          .number()
          .optional()
          .describe('Maximum number of functions to return (default 50)'),
        cursor: z
          .string()
          .optional()
          .describe('Pagination cursor for next page of results'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new ModalClient(apiToken);
          const response = await client.listFunctions(args.app_id, args.limit, args.cursor);
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return `Failed to list functions: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_FUNCTION: tool({
      name: 'modal_get_function',
      description: 'Get detailed information about a specific Modal function',
      schema: z.object({
        function_id: z.string().describe('The ID of the Modal function'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new ModalClient(apiToken);
          const response = await client.getFunction(args.function_id);
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return `Failed to get function: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_FUNCTION_CALLS: tool({
      name: 'modal_get_function_calls',
      description: 'Get function call history for a specific Modal function',
      schema: z.object({
        function_id: z.string().describe('The ID of the Modal function'),
        limit: z
          .number()
          .optional()
          .describe('Maximum number of calls to return (default 50)'),
        cursor: z
          .string()
          .optional()
          .describe('Pagination cursor for next page of results'),
        state: z
          .enum(['running', 'completed', 'failed', 'cancelled'])
          .optional()
          .describe('Filter by call state'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new ModalClient(apiToken);
          const response = await client.getFunctionCalls(
            args.function_id,
            args.limit,
            args.cursor,
            args.state
          );
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return `Failed to get function calls: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_FUNCTION_LOGS: tool({
      name: 'modal_get_function_logs',
      description: 'Get logs for a Modal function, including both running and stopped functions',
      schema: z.object({
        function_id: z.string().describe('The ID of the Modal function'),
        call_id: z
          .string()
          .optional()
          .describe('Filter logs by specific function call ID'),
        limit: z
          .number()
          .optional()
          .describe('Maximum number of log entries to return (default 100)'),
        cursor: z
          .string()
          .optional()
          .describe('Pagination cursor for next page of results'),
        start_time: z
          .string()
          .optional()
          .describe('Start time for log filtering (ISO 8601 format)'),
        end_time: z
          .string()
          .optional()
          .describe('End time for log filtering (ISO 8601 format)'),
        level: z
          .enum(['DEBUG', 'INFO', 'WARNING', 'ERROR'])
          .optional()
          .describe('Filter by log level'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new ModalClient(apiToken);
          const response = await client.getFunctionLogs(
            args.function_id,
            args.call_id,
            args.limit,
            args.cursor,
            args.start_time,
            args.end_time,
            args.level
          );
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return `Failed to get function logs: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    CREATE_SANDBOX: tool({
      name: 'modal_create_sandbox',
      description: 'Create a new Modal sandbox for code execution',
      schema: z.object({
        image: z
          .string()
          .optional()
          .describe('Docker image to use (defaults to setup defaultImage)'),
        command: z
          .array(z.string())
          .optional()
          .describe('Command to run in the sandbox'),
        ports: z
          .array(z.number())
          .optional()
          .describe('Ports to expose from the sandbox'),
        environment: z
          .record(z.string())
          .optional()
          .describe('Environment variables to set'),
        timeout_seconds: z
          .number()
          .optional()
          .describe('Sandbox timeout in seconds'),
        cpu: z
          .number()
          .optional()
          .describe('CPU allocation'),
        memory_mb: z
          .number()
          .optional()
          .describe('Memory allocation in MB'),
        gpu: z
          .string()
          .optional()
          .describe('GPU type (e.g., "H100", "L40S")'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const { defaultImage } = await context.getSetup();
          const client = new ModalClient(apiToken);
          
          const image = args.image || defaultImage || 'python:3.11';
          const command = args.command || ['sleep', 'infinity'];
          
          const resources: any = {};
          if (args.cpu !== undefined) resources.cpu = args.cpu;
          if (args.memory_mb !== undefined) resources.memory_mb = args.memory_mb;
          if (args.gpu !== undefined) resources.gpu = args.gpu;

          const response = await client.createSandbox(image, command, {
            ports: args.ports,
            environment: args.environment,
            timeout_seconds: args.timeout_seconds,
            ...(Object.keys(resources).length > 0 && { resources }),
          });
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return `Failed to create sandbox: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_SANDBOX: tool({
      name: 'modal_get_sandbox',
      description: 'Get information about a specific sandbox',
      schema: z.object({
        sandbox_id: z.string().describe('The ID of the sandbox'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new ModalClient(apiToken);
          const response = await client.getSandbox(args.sandbox_id);
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return `Failed to get sandbox: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    LIST_SANDBOXES: tool({
      name: 'modal_list_sandboxes',
      description: 'List all active Modal sandboxes',
      schema: z.object({
        limit: z
          .number()
          .optional()
          .describe('Maximum number of sandboxes to return (default 50)'),
        cursor: z
          .string()
          .optional()
          .describe('Pagination cursor for next page of results'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new ModalClient(apiToken);
          const response = await client.listSandboxes(args.limit, args.cursor);
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return `Failed to list sandboxes: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    EXEC_IN_SANDBOX: tool({
      name: 'modal_exec_in_sandbox',
      description: 'Execute a command in an existing sandbox',
      schema: z.object({
        sandbox_id: z.string().describe('The ID of the sandbox'),
        command: z.array(z.string()).describe('Command to execute'),
        background: z
          .boolean()
          .optional()
          .describe('Run command in background (default: false)'),
        stdin: z
          .string()
          .optional()
          .describe('Input to send to the command'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new ModalClient(apiToken);
          const response = await client.execInSandbox(args.sandbox_id, args.command, {
            background: args.background,
            stdin: args.stdin,
          });
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return `Failed to execute command: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_SANDBOX_LOGS: tool({
      name: 'modal_get_sandbox_logs',
      description: 'Get logs from a sandbox for debugging',
      schema: z.object({
        sandbox_id: z.string().describe('The ID of the sandbox'),
        process_id: z
          .string()
          .optional()
          .describe('Filter logs by specific process ID'),
        limit: z
          .number()
          .optional()
          .describe('Maximum number of log entries to return (default 100)'),
        cursor: z
          .string()
          .optional()
          .describe('Pagination cursor for next page of results'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new ModalClient(apiToken);
          const response = await client.getSandboxLogs(
            args.sandbox_id,
            args.process_id,
            args.limit,
            args.cursor
          );
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return `Failed to get sandbox logs: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    TERMINATE_SANDBOX: tool({
      name: 'modal_terminate_sandbox',
      description: 'Terminate a running sandbox',
      schema: z.object({
        sandbox_id: z.string().describe('The ID of the sandbox to terminate'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new ModalClient(apiToken);
          await client.terminateSandbox(args.sandbox_id);
          return JSON.stringify({ success: true, message: 'Sandbox terminated successfully' });
        } catch (error) {
          return `Failed to terminate sandbox: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    CREATE_SNAPSHOT: tool({
      name: 'modal_create_snapshot',
      description: 'Create a filesystem snapshot of a sandbox',
      schema: z.object({
        sandbox_id: z.string().describe('The ID of the sandbox'),
        name: z
          .string()
          .optional()
          .describe('Name for the snapshot'),
        description: z
          .string()
          .optional()
          .describe('Description of the snapshot'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new ModalClient(apiToken);
          const response = await client.createSnapshot(
            args.sandbox_id,
            args.name,
            args.description
          );
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return `Failed to create snapshot: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    RESTORE_FROM_SNAPSHOT: tool({
      name: 'modal_restore_from_snapshot',
      description: 'Restore a sandbox from a snapshot',
      schema: z.object({
        snapshot_id: z.string().describe('The ID of the snapshot to restore from'),
        image: z
          .string()
          .optional()
          .describe('Docker image to use for restored sandbox'),
        command: z
          .array(z.string())
          .optional()
          .describe('Command to run in the restored sandbox'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new ModalClient(apiToken);
          const response = await client.restoreFromSnapshot(
            args.snapshot_id,
            args.image,
            args.command
          );
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return `Failed to restore from snapshot: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_PROCESS_STATUS: tool({
      name: 'modal_get_process_status',
      description: 'Get the status of a process running in a sandbox',
      schema: z.object({
        sandbox_id: z.string().describe('The ID of the sandbox'),
        process_id: z.string().describe('The ID of the process'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new ModalClient(apiToken);
          const response = await client.getProcessStatus(args.sandbox_id, args.process_id);
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return `Failed to get process status: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    WAIT_FOR_PROCESS: tool({
      name: 'modal_wait_for_process',
      description: 'Wait for a background process to complete',
      schema: z.object({
        sandbox_id: z.string().describe('The ID of the sandbox'),
        process_id: z.string().describe('The ID of the process'),
        timeout_seconds: z
          .number()
          .optional()
          .describe('Maximum time to wait in seconds (default 60)'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new ModalClient(apiToken);
          const response = await client.waitForProcess(
            args.sandbox_id,
            args.process_id,
            args.timeout_seconds
          );
          return JSON.stringify(response, null, 2);
        } catch (error) {
          return `Failed to wait for process: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});
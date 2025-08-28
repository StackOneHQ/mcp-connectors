import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface ModalSandbox {
  object_id: string;
  state: 'CREATED' | 'RUNNING' | 'STOPPED' | 'TERMINATED';
  created_at: string;
  image_uri?: string;
  timeout_seconds?: number;
  pty_info?: unknown;
  tunnels?: Record<number, { url: string }>;
  logs?: string[];
}

interface ModalProcess {
  object_id: string;
  sandbox_id: string;
  returncode?: number;
  stdout: string;
  stderr: string;
  is_running: boolean;
}

interface ModalSnapshot {
  object_id: string;
  created_at: string;
  sandbox_id: string;
}

class ModalClient {
  private headers: { Authorization: string; 'Content-Type': string };
  private baseUrl = 'https://api.modal.com';

  constructor(token: string) {
    this.headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async createSandbox(
    entrypoint: string[] = [],
    options: {
      image?: string;
      timeout?: number;
      encrypted_ports?: number[];
      unencrypted_ports?: number[];
      secrets?: Record<string, string>;
      cpu?: number;
      memory?: number;
      gpu?: string;
      workdir?: string;
    } = {}
  ): Promise<ModalSandbox> {
    const payload = {
      entrypoint_args: entrypoint,
      image_uri: options.image || 'python:3.12-slim',
      timeout_seconds: options.timeout || 3600,
      encrypted_ports: options.encrypted_ports || [],
      unencrypted_ports: options.unencrypted_ports || [],
      environment: options.secrets || {},
      cpu: options.cpu,
      memory: options.memory,
      gpu: options.gpu,
      workdir: options.workdir,
    };

    const response = await fetch(`${this.baseUrl}/v1/sandboxes`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Modal API error: ${response.status} ${response.statusText} - ${error}`
      );
    }

    return response.json() as Promise<ModalSandbox>;
  }

  async getSandbox(sandboxId: string): Promise<ModalSandbox> {
    const response = await fetch(`${this.baseUrl}/v1/sandboxes/${sandboxId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Modal API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<ModalSandbox>;
  }

  async listSandboxes(): Promise<ModalSandbox[]> {
    const response = await fetch(`${this.baseUrl}/v1/sandboxes`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Modal API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { sandboxes?: ModalSandbox[] };
    return result.sandboxes || [];
  }

  async terminateSandbox(sandboxId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/v1/sandboxes/${sandboxId}/terminate`, {
      method: 'POST',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Modal API error: ${response.status} ${response.statusText}`);
    }
  }

  async execInSandbox(
    sandboxId: string,
    command: string[],
    options: {
      workdir?: string;
      background?: boolean;
      stdin?: string;
    } = {}
  ): Promise<ModalProcess> {
    const payload = {
      command,
      workdir: options.workdir,
      background: options.background || false,
      stdin: options.stdin,
    };

    const response = await fetch(`${this.baseUrl}/v1/sandboxes/${sandboxId}/exec`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Modal API error: ${response.status} ${response.statusText} - ${error}`
      );
    }

    return response.json() as Promise<ModalProcess>;
  }

  async getProcessStatus(sandboxId: string, processId: string): Promise<ModalProcess> {
    const response = await fetch(
      `${this.baseUrl}/v1/sandboxes/${sandboxId}/processes/${processId}`,
      {
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(`Modal API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<ModalProcess>;
  }

  async waitForProcess(sandboxId: string, processId: string): Promise<ModalProcess> {
    const response = await fetch(
      `${this.baseUrl}/v1/sandboxes/${sandboxId}/processes/${processId}/wait`,
      {
        method: 'POST',
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(`Modal API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<ModalProcess>;
  }

  async getSandboxLogs(sandboxId: string): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/v1/sandboxes/${sandboxId}/logs`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Modal API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { logs?: string[] };
    return result.logs || [];
  }

  async createSnapshot(sandboxId: string): Promise<ModalSnapshot> {
    const response = await fetch(`${this.baseUrl}/v1/sandboxes/${sandboxId}/snapshot`, {
      method: 'POST',
      headers: this.headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Modal API error: ${response.status} ${response.statusText} - ${error}`
      );
    }

    return response.json() as Promise<ModalSnapshot>;
  }

  async restoreFromSnapshot(
    snapshotId: string,
    options: { timeout?: number } = {}
  ): Promise<ModalSandbox> {
    const payload = {
      snapshot_id: snapshotId,
      timeout_seconds: options.timeout || 3600,
    };

    const response = await fetch(`${this.baseUrl}/v1/sandboxes/restore`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Modal API error: ${response.status} ${response.statusText} - ${error}`
      );
    }

    return response.json() as Promise<ModalSandbox>;
  }
}

export const ModalConnectorConfig = mcpConnectorConfig({
  name: 'Modal',
  key: 'modal',
  version: '1.0.0',
  logo: 'https://modal.com/favicon.ico',
  credentials: z.object({
    token: z
      .string()
      .describe(
        'Modal API Token :: ak-1234567890abcdef :: Create at https://modal.com/settings/tokens'
      ),
  }),
  setup: z.object({}),
  examplePrompt:
    'Create a Python sandbox which runs a python script that prints "hello world" to the console.',
  tools: (tool) => ({
    CREATE_SANDBOX: tool({
      name: 'modal_create_sandbox',
      description:
        'Create a new Modal sandbox for running code in an isolated environment',
      schema: z.object({
        entrypoint: z
          .array(z.string())
          .optional()
          .describe(
            'Command to run as entrypoint (e.g., ["python", "-c", "print(\'hello\')"])'
          ),
        image: z
          .string()
          .optional()
          .describe('Container image to use (default: python:3.12-slim)'),
        timeout: z.number().optional().describe('Timeout in seconds (default: 3600)'),
        encrypted_ports: z
          .array(z.number())
          .optional()
          .describe('List of ports to expose with encryption'),
        unencrypted_ports: z
          .array(z.number())
          .optional()
          .describe('List of ports to expose without encryption'),
        secrets: z
          .record(z.string())
          .optional()
          .describe('Environment variables to inject into the sandbox'),
        cpu: z.number().optional().describe('CPU cores to allocate'),
        memory: z.number().optional().describe('Memory in MB to allocate'),
        gpu: z.string().optional().describe('GPU type to allocate (e.g., "A100", "T4")'),
        workdir: z.string().optional().describe('Working directory for the sandbox'),
      }),
      handler: async (args, context) => {
        try {
          const { token } = await context.getCredentials();
          const client = new ModalClient(token);

          const sandbox = await client.createSandbox(args.entrypoint, {
            image: args.image,
            timeout: args.timeout,
            encrypted_ports: args.encrypted_ports,
            unencrypted_ports: args.unencrypted_ports,
            secrets: args.secrets,
            cpu: args.cpu,
            memory: args.memory,
            gpu: args.gpu,
            workdir: args.workdir,
          });

          return JSON.stringify(sandbox, null, 2);
        } catch (error) {
          return `Failed to create sandbox: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_SANDBOX: tool({
      name: 'modal_get_sandbox',
      description: 'Get information about a specific Modal sandbox',
      schema: z.object({
        sandboxId: z.string().describe('The ID of the sandbox to retrieve'),
      }),
      handler: async (args, context) => {
        try {
          const { token } = await context.getCredentials();
          const client = new ModalClient(token);
          const sandbox = await client.getSandbox(args.sandboxId);
          return JSON.stringify(sandbox, null, 2);
        } catch (error) {
          return `Failed to get sandbox: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_SANDBOXES: tool({
      name: 'modal_list_sandboxes',
      description: 'List all active Modal sandboxes',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { token } = await context.getCredentials();
          const client = new ModalClient(token);
          const sandboxes = await client.listSandboxes();
          return JSON.stringify(sandboxes, null, 2);
        } catch (error) {
          return `Failed to list sandboxes: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    TERMINATE_SANDBOX: tool({
      name: 'modal_terminate_sandbox',
      description: 'Terminate a running Modal sandbox',
      schema: z.object({
        sandboxId: z.string().describe('The ID of the sandbox to terminate'),
      }),
      handler: async (args, context) => {
        try {
          const { token } = await context.getCredentials();
          const client = new ModalClient(token);
          await client.terminateSandbox(args.sandboxId);
          return `Sandbox ${args.sandboxId} terminated successfully`;
        } catch (error) {
          return `Failed to terminate sandbox: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    EXEC_IN_SANDBOX: tool({
      name: 'modal_exec_in_sandbox',
      description: 'Execute a command in a Modal sandbox',
      schema: z.object({
        sandboxId: z.string().describe('The ID of the sandbox'),
        command: z
          .array(z.string())
          .describe('Command to execute (e.g., ["python", "-c", "print(\'hello\')"])'),
        workdir: z.string().optional().describe('Working directory for the command'),
        background: z
          .boolean()
          .optional()
          .describe('Run command in background (default: false)'),
        stdin: z.string().optional().describe('Input to send to the command'),
      }),
      handler: async (args, context) => {
        try {
          const { token } = await context.getCredentials();
          const client = new ModalClient(token);

          const process = await client.execInSandbox(args.sandboxId, args.command, {
            workdir: args.workdir,
            background: args.background,
            stdin: args.stdin,
          });

          return JSON.stringify(process, null, 2);
        } catch (error) {
          return `Failed to execute command: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_PROCESS_STATUS: tool({
      name: 'modal_get_process_status',
      description: 'Get the status of a process running in a Modal sandbox',
      schema: z.object({
        sandboxId: z.string().describe('The ID of the sandbox'),
        processId: z.string().describe('The ID of the process'),
      }),
      handler: async (args, context) => {
        try {
          const { token } = await context.getCredentials();
          const client = new ModalClient(token);
          const process = await client.getProcessStatus(args.sandboxId, args.processId);
          return JSON.stringify(process, null, 2);
        } catch (error) {
          return `Failed to get process status: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    WAIT_FOR_PROCESS: tool({
      name: 'modal_wait_for_process',
      description: 'Wait for a background process to complete and get its results',
      schema: z.object({
        sandboxId: z.string().describe('The ID of the sandbox'),
        processId: z.string().describe('The ID of the process to wait for'),
      }),
      handler: async (args, context) => {
        try {
          const { token } = await context.getCredentials();
          const client = new ModalClient(token);
          const process = await client.waitForProcess(args.sandboxId, args.processId);
          return JSON.stringify(process, null, 2);
        } catch (error) {
          return `Failed to wait for process: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_SANDBOX_LOGS: tool({
      name: 'modal_get_sandbox_logs',
      description: 'Get logs from a Modal sandbox for debugging',
      schema: z.object({
        sandboxId: z.string().describe('The ID of the sandbox to get logs from'),
      }),
      handler: async (args, context) => {
        try {
          const { token } = await context.getCredentials();
          const client = new ModalClient(token);
          const logs = await client.getSandboxLogs(args.sandboxId);
          return JSON.stringify({ sandbox_id: args.sandboxId, logs }, null, 2);
        } catch (error) {
          return `Failed to get sandbox logs: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    CREATE_SNAPSHOT: tool({
      name: 'modal_create_snapshot',
      description: 'Create a filesystem snapshot of a Modal sandbox',
      schema: z.object({
        sandboxId: z.string().describe('The ID of the sandbox to snapshot'),
      }),
      handler: async (args, context) => {
        try {
          const { token } = await context.getCredentials();
          const client = new ModalClient(token);
          const snapshot = await client.createSnapshot(args.sandboxId);
          return JSON.stringify(snapshot, null, 2);
        } catch (error) {
          return `Failed to create snapshot: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    RESTORE_FROM_SNAPSHOT: tool({
      name: 'modal_restore_from_snapshot',
      description: 'Restore a Modal sandbox from a filesystem snapshot',
      schema: z.object({
        snapshotId: z.string().describe('The ID of the snapshot to restore from'),
        timeout: z
          .number()
          .optional()
          .describe('Timeout in seconds for the restored sandbox (default: 3600)'),
      }),
      handler: async (args, context) => {
        try {
          const { token } = await context.getCredentials();
          const client = new ModalClient(token);
          const sandbox = await client.restoreFromSnapshot(args.snapshotId, {
            timeout: args.timeout,
          });
          return JSON.stringify(sandbox, null, 2);
        } catch (error) {
          return `Failed to restore from snapshot: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

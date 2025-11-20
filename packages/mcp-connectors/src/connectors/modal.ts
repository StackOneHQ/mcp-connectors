import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ConnectorMetadata } from '../types/metadata';

interface Secret {
  name?: string;
  secretId: string;
}

// Custom interface for sandbox options to avoid importing Modal types
interface SandboxOptions {
  command?: string[];
  timeout?: number;
  encryptedPorts?: number[];
  unencryptedPorts?: number[];
  cpu?: number;
  memory?: number;
  gpu?: string;
  workdir?: string;
  secrets?: Secret[];
  // biome-ignore lint/suspicious/noExplicitAny: volume type is hard
  volumes?: Record<string, any>;
}

// Helper to format sandbox info for display
function formatSandboxInfo(sandbox: {
  sandboxId: string;
}): string {
  return JSON.stringify(
    {
      sandbox_id: sandbox.sandboxId,
      message: 'Sandbox created successfully',
    },
    null,
    2
  );
}

// Helper to format process info for display
async function formatProcessInfo(process: {
  stdout?: { readText: () => Promise<string> };
  stderr?: { readText: () => Promise<string> };
  wait?: () => Promise<number>;
}): Promise<string> {
  const stdout = (await process.stdout?.readText()) || '';
  const stderr = (await process.stderr?.readText()) || '';
  const exitCode = (await process.wait?.()) || 0;

  return JSON.stringify(
    {
      stdout,
      stderr,
      exit_code: exitCode,
      is_running: false,
    },
    null,
    2
  );
}

export interface ModalCredentials {
  tokenId: string;
  tokenSecret: string;
}

export const ModalCredentialsSchema = z.object({
  tokenId: z.string().describe('tokenId value'),
  tokenSecret: z.string().describe('tokenSecret value'),
});

export const ModalConnectorMetadata = {
  key: 'modal',
  name: 'Modal',
  description: 'Serverless compute platform',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/modal/filled/svg',
  examplePrompt: 'Run Modal functions',
  categories: ['compute', 'serverless'],
  credentialsSchema: ModalCredentialsSchema,
} as const satisfies ConnectorMetadata;

export function createModalServer(credentials: ModalCredentials): McpServer {
  const server = new McpServer({
    name: 'Modal',
    version: '1.0.0',
  });

  server.tool(
    'modal_create_sandbox',
    'Create a new Modal sandbox for running code in an isolated environment',
    {
      appName: z
        .string()
        .optional()
        .default('mcp-sandbox')
        .describe('Name of the Modal app (default: mcp-sandbox)'),
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
      timeout: z
        .number()
        .optional()
        .describe('Timeout in milliseconds (default: 600000)'),
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
      memory: z.number().optional().describe('Memory in MiB to allocate'),
      gpu: z.string().optional().describe('GPU type to allocate (e.g., "A100", "T4")'),
      workdir: z.string().optional().describe('Working directory for the sandbox'),
    },
    async (args) => {
      try {
        const { App, Image, Secret, initializeClient } = await import('modal');
        await initializeClient({
          tokenId: credentials.tokenId,
          tokenSecret: credentials.tokenSecret,
        });

        const app = await App.lookup(args.appName || 'mcp-sandbox', {
          createIfMissing: true,
        });

        const imageTag = args.image || 'python:3.12-slim';
        const image = Image.fromRegistry(imageTag);

        // Prepare sandbox options
        const sandboxOptions: SandboxOptions = {
          command: args.entrypoint,
          timeout: args.timeout,
          encryptedPorts: args.encrypted_ports,
          unencryptedPorts: args.unencrypted_ports,
          cpu: args.cpu,
          memory: args.memory,
          gpu: args.gpu,
          workdir: args.workdir,
        };

        // Handle secrets if provided
        if (args.secrets) {
          const secretObj = await Secret.fromObject(args.secrets);
          sandboxOptions.secrets = [secretObj];
        }

        // Create sandbox
        const sandbox = await app.createSandbox(image, sandboxOptions);

        return {
          content: [
            {
              type: 'text',
              text: formatSandboxInfo(sandbox),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to create sandbox: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'modal_get_sandbox',
    'Get information about a specific Modal sandbox',
    {
      sandboxId: z.string().describe('The ID of the sandbox to retrieve'),
    },
    async (args) => {
      try {
        const { Sandbox, initializeClient } = await import('modal');
        await initializeClient({
          tokenId: credentials.tokenId,
          tokenSecret: credentials.tokenSecret,
        });

        const sandbox = await Sandbox.fromId(args.sandboxId);

        // Poll to get current state
        const exitCode = await sandbox.poll();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  sandbox_id: sandbox.sandboxId,
                  state: exitCode === null ? 'RUNNING' : 'TERMINATED',
                  exit_code: exitCode,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get sandbox: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'modal_terminate_sandbox',
    'Terminate a running Modal sandbox',
    {
      sandboxId: z.string().describe('The ID of the sandbox to terminate'),
    },
    async (args) => {
      try {
        const { Sandbox, initializeClient } = await import('modal');
        await initializeClient({
          tokenId: credentials.tokenId,
          tokenSecret: credentials.tokenSecret,
        });

        const sandbox = await Sandbox.fromId(args.sandboxId);
        await sandbox.terminate();

        return {
          content: [
            {
              type: 'text',
              text: `Sandbox ${args.sandboxId} terminated successfully`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to terminate sandbox: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'modal_exec_in_sandbox',
    'Execute a command in a Modal sandbox',
    {
      sandboxId: z.string().describe('The ID of the sandbox'),
      command: z
        .array(z.string())
        .describe('Command to execute (e.g., ["python", "-c", "print(\'hello\')"])'),
      workdir: z.string().optional().describe('Working directory for the command'),
      stdin: z.string().optional().describe('Input to send to the command'),
      background: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'Run the command in background without waiting for completion. Useful for servers or other very long-running processes.'
        ),
    },
    async (args) => {
      try {
        const { Sandbox, initializeClient } = await import('modal');
        await initializeClient({
          tokenId: credentials.tokenId,
          tokenSecret: credentials.tokenSecret,
        });

        const sandbox = await Sandbox.fromId(args.sandboxId);

        const execOptions = {
          stdout: 'pipe' as const,
          stderr: 'pipe' as const,
          workdir: args.workdir,
          mode: 'text' as const,
        };

        const process = await sandbox.exec(args.command, execOptions);

        // If stdin is provided, write it
        if (args.stdin && process.stdin) {
          await process.stdin.writeText(args.stdin);
          await process.stdin.close();
        }

        // If background mode, return immediately without waiting
        if (args.background) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    message: 'Command started in background',
                    sandbox_id: args.sandboxId,
                    is_running: true,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        const result = await formatProcessInfo(process);
        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to execute command: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'modal_list_sandboxes',
    'List active Modal sandboxes (Note: Modal SDK does not provide a direct list method)',
    {},
    async () => {
      try {
        const { Sandbox, initializeClient } = await import('modal');
        await initializeClient({
          tokenId: credentials.tokenId,
          tokenSecret: credentials.tokenSecret,
        });

        const sandboxes = [];
        for await (const sandbox of Sandbox.list()) {
          sandboxes.push(sandbox.sandboxId);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(sandboxes, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to list sandboxes: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'modal_create_sandbox_with_volume',
    'Create a Modal sandbox with a persistent volume attached',
    {
      appName: z
        .string()
        .optional()
        .default('mcp-sandbox')
        .describe('Name of the Modal app'),
      volumeName: z.string().describe('Name of the volume to create or attach'),
      mountPath: z
        .string()
        .default('/mnt/volume')
        .describe('Path where the volume will be mounted'),
      image: z
        .string()
        .optional()
        .describe('Container image to use (default: python:3.12-slim)'),
      entrypoint: z.array(z.string()).optional().describe('Command to run as entrypoint'),
      timeout: z.number().optional().describe('Timeout in milliseconds'),
    },
    async (args) => {
      try {
        const { App, Image, Volume, initializeClient } = await import('modal');
        await initializeClient({
          tokenId: credentials.tokenId,
          tokenSecret: credentials.tokenSecret,
        });

        const app = await App.lookup(args.appName || 'mcp-sandbox', {
          createIfMissing: true,
        });

        const volume = await Volume.fromName(args.volumeName, {
          createIfMissing: true,
        });

        const imageTag = args.image || 'python:3.12-slim';
        const image = Image.fromRegistry(imageTag);

        const sandboxOptions: SandboxOptions = {
          command: args.entrypoint,
          timeout: args.timeout,
          volumes: {
            [args.mountPath]: volume,
          },
        };

        const sandbox = await app.createSandbox(image, sandboxOptions);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  sandbox_id: sandbox.sandboxId,
                  volume_name: args.volumeName,
                  mount_path: args.mountPath,
                  message: 'Sandbox with volume created successfully',
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to create sandbox with volume: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'modal_sandbox_read_file',
    'Read a file from a Modal sandbox',
    {
      sandboxId: z.string().describe('The ID of the sandbox'),
      filePath: z.string().describe('Path to the file to read'),
    },
    async (args) => {
      try {
        const { Sandbox, initializeClient } = await import('modal');
        await initializeClient({
          tokenId: credentials.tokenId,
          tokenSecret: credentials.tokenSecret,
        });

        const sandbox = await Sandbox.fromId(args.sandboxId);

        const handle = await sandbox.open(args.filePath, 'r');
        const content = await handle.read();
        await handle.close();

        const decoder = new TextDecoder();
        const text = decoder.decode(content);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  file_path: args.filePath,
                  content: text,
                  size: content.length,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'modal_sandbox_write_file',
    'Write a file to a Modal sandbox',
    {
      sandboxId: z.string().describe('The ID of the sandbox'),
      filePath: z.string().describe('Path where the file will be written'),
      content: z.string().describe('Content to write to the file'),
    },
    async (args) => {
      try {
        const { Sandbox, initializeClient } = await import('modal');
        await initializeClient({
          tokenId: credentials.tokenId,
          tokenSecret: credentials.tokenSecret,
        });

        const sandbox = await Sandbox.fromId(args.sandboxId);

        const handle = await sandbox.open(args.filePath, 'w');
        const encoder = new TextEncoder();
        await handle.write(encoder.encode(args.content));
        await handle.close();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  file_path: args.filePath,
                  bytes_written: args.content.length,
                  message: 'File written successfully',
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to write file: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'modal_get_sandbox_tunnels',
    'Get tunnel URLs for exposed ports in a Modal sandbox',
    {
      sandboxId: z.string().describe('The ID of the sandbox'),
    },
    async (args) => {
      try {
        const { Sandbox, initializeClient } = await import('modal');
        await initializeClient({
          tokenId: credentials.tokenId,
          tokenSecret: credentials.tokenSecret,
        });

        const sandbox = await Sandbox.fromId(args.sandboxId);
        const tunnels = await sandbox.tunnels();

        const tunnelInfo: Record<string, { url: string; port: number }> = {};
        for (const [port, tunnel] of Object.entries(tunnels)) {
          tunnelInfo[port] = {
            url: tunnel.url,
            port: tunnel.port,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  sandbox_id: args.sandboxId,
                  tunnels: tunnelInfo,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get sandbox tunnels: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'modal_wait_for_sandbox',
    'Wait for a Modal sandbox to complete and get its exit code',
    {
      sandboxId: z.string().describe('The ID of the sandbox'),
    },
    async (args) => {
      try {
        const { Sandbox, initializeClient } = await import('modal');
        await initializeClient({
          tokenId: credentials.tokenId,
          tokenSecret: credentials.tokenSecret,
        });

        const sandbox = await Sandbox.fromId(args.sandboxId);
        const exitCode = await sandbox.wait();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  sandbox_id: args.sandboxId,
                  exit_code: exitCode,
                  state: 'TERMINATED',
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to wait for sandbox: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  return server;
}

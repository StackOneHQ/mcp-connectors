import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';
import { 
  initializeClient, 
  App, 
  Image, 
  Sandbox,
  type SandboxCreateOptions 
} from 'modal';

// Initialize the Modal client with credentials
function setupModalClient(tokenId: string, tokenSecret: string) {
  initializeClient({
    tokenId,
    tokenSecret,
  });
}

// Helper to format sandbox info for display
function formatSandboxInfo(sandbox: Sandbox): string {
  return JSON.stringify({
    sandbox_id: sandbox.sandboxId,
    message: 'Sandbox created successfully'
  }, null, 2);
}

// Helper to format process info for display
async function formatProcessInfo(process: any): Promise<string> {
  const stdout = await process.stdout?.readText() || '';
  const stderr = await process.stderr?.readText() || '';
  const exitCode = await process.wait?.() || 0;
  
  return JSON.stringify({
    stdout,
    stderr,
    exit_code: exitCode,
    is_running: false
  }, null, 2);
}

export const ModalConnectorConfig = mcpConnectorConfig({
  name: 'Modal',
  key: 'modal',
  version: '1.0.0',
  logo: 'https://modal.com/favicon.ico',
  credentials: z.object({
    tokenId: z
      .string()
      .describe(
        'Modal Token ID :: The ID part of your Modal token (e.g., ak-xxx...)'
      ),
    tokenSecret: z
      .string()
      .describe(
        'Modal Token Secret :: The secret part of your Modal token'
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
        timeout: z.number().optional().describe('Timeout in milliseconds (default: 600000)'),
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
      }),
      handler: async (args, context) => {
        try {
          console.log('[Modal SDK] CREATE_SANDBOX called with args:', JSON.stringify(args, null, 2));
          const { tokenId, tokenSecret } = await context.getCredentials();
          
          // Initialize Modal client
          setupModalClient(tokenId, tokenSecret);
          
          // Create or get app
          const app = await App.lookup(args.appName || 'mcp-sandbox', { 
            createIfMissing: true 
          });
          
          // Create image
          const imageTag = args.image || 'python:3.12-slim';
          const image = await Image.fromRegistry(imageTag);
          
          // Prepare sandbox options
          const sandboxOptions: SandboxCreateOptions = {
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
            const { Secret } = await import('modal');
            const secretObj = await Secret.fromObject(args.secrets);
            sandboxOptions.secrets = [secretObj];
          }
          
          // Create sandbox
          const sandbox = await app.createSandbox(image, sandboxOptions);
          
          console.log('[Modal SDK] Sandbox created:', sandbox.sandboxId);
          return formatSandboxInfo(sandbox);
        } catch (error) {
          console.error('[Modal SDK] CREATE_SANDBOX error:', error);
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
          console.log('[Modal SDK] GET_SANDBOX called for:', args.sandboxId);
          const { tokenId, tokenSecret } = await context.getCredentials();
          
          setupModalClient(tokenId, tokenSecret);
          
          const sandbox = await Sandbox.fromId(args.sandboxId);
          
          // Poll to get current state
          const exitCode = await sandbox.poll();
          
          return JSON.stringify({
            sandbox_id: sandbox.sandboxId,
            state: exitCode === null ? 'RUNNING' : 'TERMINATED',
            exit_code: exitCode
          }, null, 2);
        } catch (error) {
          console.error('[Modal SDK] GET_SANDBOX error:', error);
          return `Failed to get sandbox: ${error instanceof Error ? error.message : String(error)}`;
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
          console.log('[Modal SDK] TERMINATE_SANDBOX called for:', args.sandboxId);
          const { tokenId, tokenSecret } = await context.getCredentials();
          
          setupModalClient(tokenId, tokenSecret);
          
          const sandbox = await Sandbox.fromId(args.sandboxId);
          await sandbox.terminate();
          
          console.log('[Modal SDK] Sandbox terminated successfully:', args.sandboxId);
          return `Sandbox ${args.sandboxId} terminated successfully`;
        } catch (error) {
          console.error('[Modal SDK] TERMINATE_SANDBOX error:', error);
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
        stdin: z.string().optional().describe('Input to send to the command'),
      }),
      handler: async (args, context) => {
        try {
          console.log('[Modal SDK] EXEC_IN_SANDBOX called');
          console.log('[Modal SDK] Sandbox:', args.sandboxId);
          console.log('[Modal SDK] Command:', args.command);
          const { tokenId, tokenSecret } = await context.getCredentials();
          
          setupModalClient(tokenId, tokenSecret);
          
          const sandbox = await Sandbox.fromId(args.sandboxId);
          
          const execOptions: any = {
            stdout: 'pipe',
            stderr: 'pipe',
          };
          
          if (args.workdir) {
            execOptions.workdir = args.workdir;
          }
          
          const process = await sandbox.exec(args.command, execOptions);
          
          // If stdin is provided, write it
          if (args.stdin && process.stdin) {
            await process.stdin.writeText(args.stdin);
            await process.stdin.close();
          }
          
          const result = await formatProcessInfo(process);
          console.log('[Modal SDK] Process completed');
          return result;
        } catch (error) {
          console.error('[Modal SDK] EXEC_IN_SANDBOX error:', error);
          return `Failed to execute command: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_SANDBOXES: tool({
      name: 'modal_list_sandboxes',
      description: 'List active Modal sandboxes (Note: Modal SDK does not provide a direct list method)',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          console.log('[Modal SDK] LIST_SANDBOXES called');
          const { tokenId, tokenSecret } = await context.getCredentials();
          
          setupModalClient(tokenId, tokenSecret);
          
          // Note: The Modal SDK doesn't provide a direct way to list all sandboxes
          // This is a limitation of the current SDK
          return JSON.stringify({
            message: 'Listing sandboxes is not supported by the Modal SDK. Please use sandbox IDs directly.',
            sandboxes: []
          }, null, 2);
        } catch (error) {
          console.error('[Modal SDK] LIST_SANDBOXES error:', error);
          return `Failed to list sandboxes: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    CREATE_SANDBOX_WITH_VOLUME: tool({
      name: 'modal_create_sandbox_with_volume',
      description: 'Create a Modal sandbox with a persistent volume attached',
      schema: z.object({
        appName: z
          .string()
          .optional()
          .default('mcp-sandbox')
          .describe('Name of the Modal app'),
        volumeName: z
          .string()
          .describe('Name of the volume to create or attach'),
        mountPath: z
          .string()
          .default('/mnt/volume')
          .describe('Path where the volume will be mounted'),
        image: z
          .string()
          .optional()
          .describe('Container image to use (default: python:3.12-slim)'),
        entrypoint: z
          .array(z.string())
          .optional()
          .describe('Command to run as entrypoint'),
        timeout: z.number().optional().describe('Timeout in milliseconds'),
      }),
      handler: async (args, context) => {
        try {
          console.log('[Modal SDK] CREATE_SANDBOX_WITH_VOLUME called');
          const { tokenId, tokenSecret } = await context.getCredentials();
          
          setupModalClient(tokenId, tokenSecret);
          
          const { Volume } = await import('modal');
          
          const app = await App.lookup(args.appName || 'mcp-sandbox', { 
            createIfMissing: true 
          });
          
          const volume = await Volume.fromName(args.volumeName, {
            createIfMissing: true,
          });
          
          const imageTag = args.image || 'python:3.12-slim';
          const image = await Image.fromRegistry(imageTag);
          
          const sandboxOptions: SandboxCreateOptions = {
            command: args.entrypoint,
            timeout: args.timeout,
            volumes: {
              [args.mountPath]: volume,
            },
          };
          
          const sandbox = await app.createSandbox(image, sandboxOptions);
          
          console.log('[Modal SDK] Sandbox with volume created:', sandbox.sandboxId);
          return JSON.stringify({
            sandbox_id: sandbox.sandboxId,
            volume_name: args.volumeName,
            mount_path: args.mountPath,
            message: 'Sandbox with volume created successfully'
          }, null, 2);
        } catch (error) {
          console.error('[Modal SDK] CREATE_SANDBOX_WITH_VOLUME error:', error);
          return `Failed to create sandbox with volume: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    SANDBOX_READ_FILE: tool({
      name: 'modal_sandbox_read_file',
      description: 'Read a file from a Modal sandbox',
      schema: z.object({
        sandboxId: z.string().describe('The ID of the sandbox'),
        filePath: z.string().describe('Path to the file to read'),
      }),
      handler: async (args, context) => {
        try {
          console.log('[Modal SDK] SANDBOX_READ_FILE called');
          const { tokenId, tokenSecret } = await context.getCredentials();
          
          setupModalClient(tokenId, tokenSecret);
          
          const sandbox = await Sandbox.fromId(args.sandboxId);
          
          const handle = await sandbox.open(args.filePath, 'r');
          const content = await handle.read();
          await handle.close();
          
          const decoder = new TextDecoder();
          const text = decoder.decode(content);
          
          return JSON.stringify({
            file_path: args.filePath,
            content: text,
            size: content.length
          }, null, 2);
        } catch (error) {
          console.error('[Modal SDK] SANDBOX_READ_FILE error:', error);
          return `Failed to read file: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    SANDBOX_WRITE_FILE: tool({
      name: 'modal_sandbox_write_file',
      description: 'Write a file to a Modal sandbox',
      schema: z.object({
        sandboxId: z.string().describe('The ID of the sandbox'),
        filePath: z.string().describe('Path where the file will be written'),
        content: z.string().describe('Content to write to the file'),
      }),
      handler: async (args, context) => {
        try {
          console.log('[Modal SDK] SANDBOX_WRITE_FILE called');
          const { tokenId, tokenSecret } = await context.getCredentials();
          
          setupModalClient(tokenId, tokenSecret);
          
          const sandbox = await Sandbox.fromId(args.sandboxId);
          
          const handle = await sandbox.open(args.filePath, 'w');
          const encoder = new TextEncoder();
          await handle.write(encoder.encode(args.content));
          await handle.close();
          
          return JSON.stringify({
            file_path: args.filePath,
            bytes_written: args.content.length,
            message: 'File written successfully'
          }, null, 2);
        } catch (error) {
          console.error('[Modal SDK] SANDBOX_WRITE_FILE error:', error);
          return `Failed to write file: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_SANDBOX_TUNNELS: tool({
      name: 'modal_get_sandbox_tunnels',
      description: 'Get tunnel URLs for exposed ports in a Modal sandbox',
      schema: z.object({
        sandboxId: z.string().describe('The ID of the sandbox'),
      }),
      handler: async (args, context) => {
        try {
          console.log('[Modal SDK] GET_SANDBOX_TUNNELS called');
          const { tokenId, tokenSecret } = await context.getCredentials();
          
          setupModalClient(tokenId, tokenSecret);
          
          const sandbox = await Sandbox.fromId(args.sandboxId);
          const tunnels = await sandbox.tunnels();
          
          const tunnelInfo: Record<string, any> = {};
          for (const [port, tunnel] of Object.entries(tunnels)) {
            tunnelInfo[port] = {
              url: tunnel.url,
              port: tunnel.port
            };
          }
          
          return JSON.stringify({
            sandbox_id: args.sandboxId,
            tunnels: tunnelInfo
          }, null, 2);
        } catch (error) {
          console.error('[Modal SDK] GET_SANDBOX_TUNNELS error:', error);
          return `Failed to get tunnels: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    WAIT_FOR_SANDBOX: tool({
      name: 'modal_wait_for_sandbox',
      description: 'Wait for a Modal sandbox to complete and get its exit code',
      schema: z.object({
        sandboxId: z.string().describe('The ID of the sandbox'),
      }),
      handler: async (args, context) => {
        try {
          console.log('[Modal SDK] WAIT_FOR_SANDBOX called');
          const { tokenId, tokenSecret } = await context.getCredentials();
          
          setupModalClient(tokenId, tokenSecret);
          
          const sandbox = await Sandbox.fromId(args.sandboxId);
          const exitCode = await sandbox.wait();
          
          return JSON.stringify({
            sandbox_id: args.sandboxId,
            exit_code: exitCode,
            state: 'TERMINATED'
          }, null, 2);
        } catch (error) {
          console.error('[Modal SDK] WAIT_FOR_SANDBOX error:', error);
          return `Failed to wait for sandbox: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});
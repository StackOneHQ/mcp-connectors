import { spawn } from 'node:child_process';
import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

// shadcn/ui connector using @jpisnice/shadcn-ui-mcp-server
// This connector leverages the external MCP server via npx

// Helper: format errors consistently
function formatError(prefix: string, error: unknown): string {
    return `${prefix}: ${error instanceof Error ? error.message : String(error)}`;
}

// Helper: execute npx command and return output
async function executeNpx(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
        const process = spawn('npx', ['@jpisnice/shadcn-ui-mcp-server', ...args], {
            stdio: ['pipe', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        process.on('close', (code) => {
            if (code === 0) {
                resolve(stdout.trim());
            } else {
                reject(new Error(`Command failed with code ${code}: ${stderr}`));
            }
        });

        process.on('error', (error) => {
            reject(error);
        });
    });
}

export const ShadcnConnectorConfig = mcpConnectorConfig({
    name: 'shadcn/ui',
    key: 'shadcn',
    version: '1.0.0',
    logo: 'https://stackone-logos.com/api/shadcn/filled/svg',
    description:
        'Browse shadcn/ui v4 components and demos. Fetch component source code from the New York v4 registry and view inline demos.',
    credentials: z.object({}),
    setup: z.object({}),
    examplePrompt:
        'List shadcn/ui components, then fetch the source and demo for the button component.',
    tools: (tool) => ({
        LIST_COMPONENTS: tool({
            name: 'shadcn_list_components',
            description:
                'List available shadcn/ui components (v4). Returns names only. Use before fetching a specific component.',
            schema: z.object({}),
            handler: async () => {
                try {
                    const result = await executeNpx(['list-components']);
                    return result;
                } catch (error) {
                    return formatError('Failed to list components', error);
                }
            },
        }),

        GET_DEMO: tool({
            name: 'shadcn_get_demo',
            description:
                'Fetch the official demo usage snippet for a component from the New York v4 registry.',
            schema: z.object({
                component: z
                    .string()
                    .describe('Component name, e.g., "button", "dialog", "select"'),
            }),
            handler: async (args) => {
                try {
                    const result = await executeNpx(['get-component-demo', args.component]);
                    return result;
                } catch (error) {
                    return formatError('Failed to fetch demo', error);
                }
            },
        }),

        GET_COMPONENT: tool({
            name: 'shadcn_get_component',
            description: 'Fetch the raw component source code from the New York v4 registry.',
            schema: z.object({
                component: z
                    .string()
                    .describe('Component name, e.g., "button", "dialog", "select"'),
            }),
            handler: async (args) => {
                try {
                    const result = await executeNpx(['get-component', args.component]);
                    return result;
                } catch (error) {
                    return formatError('Failed to fetch component source', error);
                }
            },
        }),

        GET_DOCS_LINK: tool({
            name: 'shadcn_get_docs_link',
            description: 'Get the documentation URL for a specific component on ui.shadcn.com.',
            schema: z.object({
                component: z
                    .string()
                    .describe('Component name, e.g., "button", "dialog", "select"'),
            }),
            handler: async (args) => {
                try {
                    // Return standard docs URL pattern for shadcn/ui components
                    return `https://ui.shadcn.com/docs/components/${args.component}`;
                } catch (error) {
                    return formatError('Failed to get docs link', error);
                }
            },
        }),

        GET_COMPONENT_METADATA: tool({
            name: 'shadcn_get_component_metadata',
            description:
                'Return a best-effort metadata summary: docs URL and expected registry path.',
            schema: z.object({
                component: z
                    .string()
                    .describe('Component name, e.g., "button", "dialog", "select"'),
            }),
            handler: async (args) => {
                try {
                    const result = await executeNpx(['get-component-metadata', args.component]);
                    return result;
                } catch (error) {
                    return formatError('Failed to get metadata', error);
                }
            },
        }),
    }),
});

import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

// Minimal client for shadcn/ui v4 registry using public endpoints
// We rely on the v4 New York style registry paths surfaced by our shadcn tools.
// No external libraries; fetch-based only.

const SHADCN_BASE = 'https://ui.shadcn.com';

// Known components list can be fetched dynamically using our MCP-shadcn tools at runtime,
// but we'll rely on stable paths and graceful fallbacks.

// Helper: format errors consistently
function formatError(prefix: string, error: unknown): string {
    return `${prefix}: ${error instanceof Error ? error.message : String(error)}`;
}

// Helper: attempt to derive a raw import path for a component from demo import pattern
// Example demo import: "@/registry/new-york-v4/ui/button"
function componentPathFromDemoImport(demoCode: string): string | null {
    const match = demoCode.match(/"@\/registry\/([^\"]+)"/);
    if (!match) return null;
    const subPath = match[1]; // e.g. new-york-v4/ui/button
    // The site hosts registry source files under /r/styles/<style>/<subpath>.tsx (for ui files)
    // In v4, demo imports typically point to new-york-v4/ui/<name>
    // The corresponding raw file is usually available at /r/styles/new-york-v4/ui/<name>.tsx
    return `/r/styles/${subPath}.tsx`;
}

// Helper: fetch text with better error messages
async function fetchText(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
    }
    return res.text();
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
                    // We cannot rely on a public JSON index without rate limits; return a stable curated list
                    // mirroring the MCP-shadcn list we have access to. This stays lightweight and reliable.
                    const components = [
                        'accordion',
                        'alert',
                        'alert-dialog',
                        'aspect-ratio',
                        'avatar',
                        'badge',
                        'breadcrumb',
                        'button',
                        'calendar',
                        'card',
                        'carousel',
                        'chart',
                        'checkbox',
                        'collapsible',
                        'command',
                        'context-menu',
                        'dialog',
                        'drawer',
                        'dropdown-menu',
                        'form',
                        'hover-card',
                        'input',
                        'input-otp',
                        'label',
                        'menubar',
                        'navigation-menu',
                        'pagination',
                        'popover',
                        'progress',
                        'radio-group',
                        'resizable',
                        'scroll-area',
                        'select',
                        'separator',
                        'sheet',
                        'sidebar',
                        'skeleton',
                        'slider',
                        'sonner',
                        'switch',
                        'table',
                        'tabs',
                        'textarea',
                        'toggle',
                        'toggle-group',
                        'tooltip',
                    ];

                    return `Found ${components.length} components:\n\n${components
                        .map((c) => `- ${c}`)
                        .join('\n')}`;
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
                    const docsUrl = `${SHADCN_BASE}/docs/components/${args.component}`;
                    const html = await fetchText(docsUrl);

                    // Find first occurrence of the registry import marker
                    const marker = '@/registry/new-york-v4/ui/';
                    const markerIndex = html.indexOf(marker);
                    if (markerIndex === -1) {
                        return `Demo not directly found. Visit docs: ${docsUrl}`;
                    }

                    // Try to extract the surrounding code block
                    const preStart = html.lastIndexOf('<pre', markerIndex);
                    const codeStartTag = preStart >= 0 ? html.indexOf('<code', preStart) : -1;
                    const codeStart = codeStartTag >= 0 ? html.indexOf('>', codeStartTag) + 1 : -1;
                    const codeEnd = codeStart >= 0 ? html.indexOf('</code>', codeStart) : -1;

                    if (preStart >= 0 && codeStart > 0 && codeEnd > codeStart) {
                        const raw = html.slice(codeStart, codeEnd);
                        const decoded = raw
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>')
                            .replace(/&amp;/g, '&');
                        if (decoded.includes(marker)) {
                            return decoded.trim();
                        }
                    }

                    // Fallback: return a minimal import hint
                    return `import { ${args.component
                        .split('-')
                        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                        .join('')} } from "@/registry/new-york-v4/ui/${args.component}"`;
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
                    // First try the conventional raw URL directly
                    const directUrl = `${SHADCN_BASE}/r/styles/new-york-v4/ui/${args.component}.tsx`;
                    try {
                        const direct = await fetchText(directUrl);
                        if (direct && direct.length > 50) {
                            return direct;
                        }
                    } catch { }

                    // Fallback: derive from docs page import path
                    const docsUrl = `${SHADCN_BASE}/docs/components/${args.component}`;
                    const html = await fetchText(docsUrl);
                    const marker = '@/registry/new-york-v4/ui/';
                    const idx = html.indexOf(`${marker}${args.component}`);
                    if (idx === -1) {
                        return `Unable to derive registry path from docs for component "${args.component}". See docs: ${docsUrl}`;
                    }

                    // Find the quoted string containing the import path
                    const quoteStart = html.lastIndexOf('"', idx);
                    const quoteEnd = html.indexOf('"', idx);
                    const importStr =
                        quoteStart >= 0 && quoteEnd > quoteStart
                            ? html.slice(quoteStart, quoteEnd + 1)
                            : '';
                    const path = importStr
                        ? componentPathFromDemoImport(importStr)
                        : `/r/styles/new-york-v4/ui/${args.component}.tsx`;

                    const rawUrl = `${SHADCN_BASE}${path}`;
                    const source = await fetchText(rawUrl);

                    if (!source || source.length < 50) {
                        return `Component source appears empty or too small at ${rawUrl}`;
                    }

                    return source;
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
                    const docsUrl = `${SHADCN_BASE}/docs/components/${args.component}`;
                    // Ping to ensure it exists
                    const res = await fetch(docsUrl, { method: 'HEAD' });
                    if (!res.ok) {
                        return `Docs page not found for component "${args.component}" (HTTP ${res.status}). Searched: ${docsUrl}`;
                    }
                    return docsUrl;
                } catch (error) {
                    return formatError('Failed to verify docs link', error);
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
                    const docsUrl = `${SHADCN_BASE}/docs/components/${args.component}`;
                    const html = await fetchText(docsUrl);
                    const marker = '@/registry/new-york-v4/ui/';
                    const idx = html.indexOf(`${marker}${args.component}`);

                    let registryUiPath = `/r/styles/new-york-v4/ui/${args.component}.tsx`;
                    if (idx !== -1) {
                        const quoteStart = html.lastIndexOf('"', idx);
                        const quoteEnd = html.indexOf('"', idx);
                        const importStr =
                            quoteStart >= 0 && quoteEnd > quoteStart
                                ? html.slice(quoteStart, quoteEnd + 1)
                                : '';
                        const derived = importStr ? componentPathFromDemoImport(importStr) : null;
                        if (derived) registryUiPath = derived;
                    }

                    return JSON.stringify(
                        {
                            name: args.component,
                            docsUrl,
                            registryUiPath,
                        },
                        null,
                        2
                    );
                } catch (error) {
                    return formatError('Failed to get metadata', error);
                }
            },
        }),
    }),
});

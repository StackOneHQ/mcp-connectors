import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

export const ShadcnConnectorConfig = mcpConnectorConfig({
  name: 'shadcn/ui',
  key: 'shadcn',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/shadcn/filled/svg',
  description: 'Fetch shadcn/ui component source code directly from GitHub.',
  credentials: z.object({}),
  setup: z.object({}),
  examplePrompt: 'List components, then get the button component source.',
  tools: (tool) => ({
    LIST_COMPONENTS: tool({
      name: 'shadcn_list_components',
      description: 'List available shadcn/ui components.',
      schema: z.object({}),
      handler: async () => {
        const components = [
          'accordion', 'alert', 'alert-dialog', 'aspect-ratio', 'avatar', 'badge',
          'breadcrumb', 'button', 'calendar', 'card', 'carousel', 'chart',
          'checkbox', 'collapsible', 'command', 'context-menu', 'dialog', 'drawer',
          'dropdown-menu', 'form', 'hover-card', 'input', 'input-otp', 'label',
          'menubar', 'navigation-menu', 'pagination', 'popover', 'progress',
          'radio-group', 'resizable', 'scroll-area', 'select', 'separator',
          'sheet', 'sidebar', 'skeleton', 'slider', 'sonner', 'switch', 'table',
          'tabs', 'textarea', 'toggle', 'toggle-group', 'tooltip'
        ];
        return `Found ${components.length} components:\n\n${components.map(c => `- ${c}`).join('\n')}`;
      },
    }),

    GET_DEMO: tool({
      name: 'shadcn_get_demo',
      description: 'Get basic import example for a component.',
      schema: z.object({
        component: z.string().describe('Component name, e.g., "button"'),
      }),
      handler: async (args) => {
        const componentName = args.component
          .split('-')
          .map(s => s.charAt(0).toUpperCase() + s.slice(1))
          .join('');
        return `import { ${componentName} } from "@/components/ui/${args.component}"

// Visit https://ui.shadcn.com/docs/components/${args.component} for documentation`;
      },
    }),

    GET_COMPONENT: tool({
      name: 'shadcn_get_component',
      description: 'Fetch component source code from GitHub.',
      schema: z.object({
        component: z.string().describe('Component name, e.g., "button"'),
      }),
      handler: async (args) => {
        const urls = [
          `https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/www/registry/new-york/ui/${args.component}.tsx`,
          `https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/www/registry/default/ui/${args.component}.tsx`
        ];
        
        for (const url of urls) {
          try {
            const response = await fetch(url);
            if (response.ok) {
              const content = await response.text();
              if (content && content.trim().length > 0) {
                return content;
              }
            }
          } catch {}
        }
        
        return `Component "${args.component}" not found. Visit: https://ui.shadcn.com/docs/components/${args.component}`;
      },
    }),

    GET_DOCS_LINK: tool({
      name: 'shadcn_get_docs_link',
      description: 'Get documentation URL for a component.',
      schema: z.object({
        component: z.string().describe('Component name, e.g., "button"'),
      }),
      handler: async (args) => {
        return `https://ui.shadcn.com/docs/components/${args.component}`;
      },
    }),

    GET_COMPONENT_METADATA: tool({
      name: 'shadcn_get_component_metadata',
      description: 'Get component metadata (docs URL and source path).',
      schema: z.object({
        component: z.string().describe('Component name, e.g., "button"'),
      }),
      handler: async (args) => {
        const docsUrl = `https://ui.shadcn.com/docs/components/${args.component}`;
        const registryPath = `https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/www/registry/new-york/ui/${args.component}.tsx`;

        return `Component: ${args.component}
Documentation: ${docsUrl}
Registry Path: ${registryPath}`;
      },
    }),
  }),
});

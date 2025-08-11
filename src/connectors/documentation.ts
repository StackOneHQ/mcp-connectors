import { z } from 'zod';
import { mcpConnectorConfig } from '../config-types';

import { type AnySearchableObject, createIndex, search } from './utils/lexical-search';
import { splitTextIntoSmartChunks } from './utils/text-chunking';

enum DocumentationCategory {
  AI = 'ai',
  DATABASE = 'database',
  FRAMEWORK = 'framework',
  EMAIL = 'email',
  AUTOMATION = 'automation',
  DEVELOPMENT = 'development',
  DOCUMENTATION = 'documentation',
  INFRASTRUCTURE = 'infrastructure',
  DATA = 'data',
  QUANTUM = 'quantum',
  REVENUE = 'revenue',
  VALIDATION = 'validation',
  MEETING = 'meeting',
  NOTIFICATION = 'notification',
  UNIFIED_API = 'unified-api',
  OTHER = 'other',
}

const documentationProviderSchema = z.object({
  key: z.string().describe('Documentation provider identifier'),
  name: z.string().describe('Service or platform name'),
  description: z.string().describe("Short summary of the provider's purpose"),
  llmsFullUrl: z.string().url().describe('Source URL of the documentation content'),
  category: z
    .nativeEnum(DocumentationCategory)
    .describe('Type of service (AI, Database, Framework, etc.)'),
});

type DocumentationProvider = z.infer<typeof documentationProviderSchema> &
  AnySearchableObject;

const generateProviderExplanation = () => {
  const schema = documentationProviderSchema.shape;
  const explanations = Object.entries(schema).map(([key, field]) => {
    const description = field.description || 'No description available';
    return `- ${key.charAt(0).toUpperCase() + key.slice(1)}: ${description}`;
  });

  return `Available Documentation Providers:

Each result includes:
${explanations.join('\n')}

For best results, select providers based on name match and relevance to your documentation needs.

----------

`;
};

// Collection of providers mapped to their llms-full.txt endpoints
const DOCUMENTATION_PROVIDERS: DocumentationProvider[] = [
  {
    key: 'stackone',
    name: 'StackOne',
    description: 'Unified API for HR, ATS, CRM, and productivity tools',
    llmsFullUrl: 'https://docs.stackone.com/llms-full.txt',
    category: DocumentationCategory.UNIFIED_API,
  },
  {
    key: 'hono',
    name: 'Hono',
    description: 'Hono is a fast, lightweight, web framework built on Web Standards.',
    llmsFullUrl: 'https://hono.dev/llms-full.txt',
    category: DocumentationCategory.FRAMEWORK,
  },
  {
    key: 'ai-sdk',
    name: 'AI SDK',
    description: 'AI SDK for building AI-powered applications',
    llmsFullUrl: 'https://ai-sdk.dev/llms.txt',
    category: DocumentationCategory.AI,
  },
  {
    key: 'anthropic',
    name: 'Anthropic',
    description: 'AI safety company with Claude AI models',
    llmsFullUrl: 'https://docs.anthropic.com/llms-full.txt',
    category: DocumentationCategory.AI,
  },
  {
    key: 'resend',
    name: 'Resend',
    description: 'Email API for developers',
    llmsFullUrl: 'https://resend.com/docs/llms-full.txt',
    category: DocumentationCategory.EMAIL,
  },
  {
    key: 'prisma',
    name: 'Prisma',
    description: 'Modern database toolkit and ORM',
    llmsFullUrl: 'https://www.prisma.io/docs/llms-full.txt',
    category: DocumentationCategory.DATABASE,
  },
  {
    key: 'mintlify',
    name: 'Mintlify',
    description: 'Documentation platform for modern teams',
    llmsFullUrl: 'https://mintlify.com/docs/llms-full.txt',
    category: DocumentationCategory.DOCUMENTATION,
  },
  {
    key: 'perplexity',
    name: 'Perplexity',
    description: 'AI-powered search and answer engine',
    llmsFullUrl: 'https://docs.perplexity.ai/llms-full.txt',
    category: DocumentationCategory.AI,
  },
  {
    key: 'pinecone',
    name: 'Pinecone',
    description: 'Vector database for AI applications',
    llmsFullUrl: 'https://docs.pinecone.io/llms-full.txt',
    category: DocumentationCategory.DATABASE,
  },
  {
    key: 'mindsdb',
    name: 'MindsDB',
    description: 'Open-source AI layer for existing databases',
    llmsFullUrl: 'https://docs.mindsdb.com/llms-full.txt',
    category: DocumentationCategory.AI,
  },
  {
    key: 'cursor',
    name: 'Cursor',
    description: 'AI-powered code editor',
    llmsFullUrl: 'https://docs.cursor.com/llms-full.txt',
    category: DocumentationCategory.DEVELOPMENT,
  },
  {
    key: 'zapier',
    name: 'Zapier',
    description: 'Automation platform for connecting apps',
    llmsFullUrl: 'https://docs.zapier.com/llms-full.txt',
    category: DocumentationCategory.AUTOMATION,
  },
  {
    key: 'datafold',
    name: 'Datafold',
    description: 'Data reliability platform',
    llmsFullUrl: 'https://docs.datafold.com/llms-full.txt',
    category: DocumentationCategory.DATA,
  },
  {
    key: 'ionq',
    name: 'IonQ',
    description: 'Quantum computing platform',
    llmsFullUrl: 'https://docs.ionq.com/llms-full.txt',
    category: DocumentationCategory.QUANTUM,
  },
  {
    key: 'hyperline',
    name: 'Hyperline',
    description: 'Revenue optimization platform',
    llmsFullUrl: 'https://docs.hyperline.co/llms-full.txt',
    category: DocumentationCategory.REVENUE,
  },
  {
    key: 'meteor',
    name: 'Meteor',
    description: 'Full-stack JavaScript platform',
    llmsFullUrl: 'https://docs.meteor.com/llms-full.txt',
    category: DocumentationCategory.FRAMEWORK,
  },
  {
    key: 'pydantic',
    name: 'Pydantic',
    description: 'Data validation library for Python',
    llmsFullUrl: 'https://docs.pydantic.dev/latest/llms-full.txt',
    category: DocumentationCategory.VALIDATION,
  },
  {
    key: 'baseten',
    name: 'Baseten',
    description: 'ML infrastructure platform',
    llmsFullUrl: 'https://docs.baseten.co/llms-full.txt',
    category: DocumentationCategory.INFRASTRUCTURE,
  },
  {
    key: 'unstructured',
    name: 'Unstructured',
    description: 'Platform for processing unstructured data',
    llmsFullUrl: 'https://docs.unstructured.io/llms-full.txt',
    category: DocumentationCategory.DATA,
  },
  {
    key: 'zenml',
    name: 'ZenML',
    description: 'MLOps framework for production ML pipelines',
    llmsFullUrl: 'https://docs.zenml.io/bleeding-edge/reference/llms-txt',
    category: DocumentationCategory.INFRASTRUCTURE,
  },
  {
    key: 'convex',
    name: 'Convex',
    description: 'Backend-as-a-service platform',
    llmsFullUrl: 'https://docs.convex.dev/llms.txt',
    category: DocumentationCategory.FRAMEWORK,
  },
  {
    key: 'expo',
    name: 'Expo',
    description: 'Platform for building React Native apps',
    llmsFullUrl: 'https://docs.expo.dev/llms-full.txt',
    category: DocumentationCategory.FRAMEWORK,
  },
  {
    key: 'astro',
    name: 'Astro',
    description: 'Modern static site generator',
    llmsFullUrl: 'https://docs.astro.build/llms-full.txt',
    category: DocumentationCategory.FRAMEWORK,
  },
  {
    key: 'modal',
    name: 'Modal',
    description:
      'Platform for running Python code in the cloud with minimal configuration',
    llmsFullUrl: 'https://modal.com/llms-full.txt',
    category: DocumentationCategory.INFRASTRUCTURE,
  },
  {
    key: 'fireflies',
    name: 'Fireflies',
    description: 'AI meeting assistant',
    llmsFullUrl: 'https://docs.fireflies.ai/llms-full.txt',
    category: DocumentationCategory.MEETING,
  },
  {
    key: 'knock',
    name: 'Knock',
    description: 'Notification infrastructure',
    llmsFullUrl: 'https://docs.knock.app/llms-full.txt',
    category: DocumentationCategory.NOTIFICATION,
  },
  {
    key: 'fireworks-ai',
    name: 'Fireworks AI',
    description: 'AI inference platform',
    llmsFullUrl: 'https://docs.fireworks.ai/llms-full.txt',
    category: DocumentationCategory.AI,
  },
  {
    key: 'replit',
    name: 'Replit',
    description: 'Online IDE and collaborative coding platform',
    llmsFullUrl: 'https://docs.replit.com/llms-full.txt',
    category: DocumentationCategory.DEVELOPMENT,
  },
  {
    key: 'humanloop',
    name: 'HumanLoop',
    description: 'AI model evaluation and monitoring',
    llmsFullUrl: 'https://humanloop.com/docs/llms-full.txt',
    category: DocumentationCategory.AI,
  },
  {
    key: 'orama',
    name: 'Orama',
    description: 'Javascript search engine',
    llmsFullUrl: 'https://docs.orama.com/llms-full.txt',
    category: DocumentationCategory.DATABASE,
  },
];

export const DocumentationConnectorConfig = mcpConnectorConfig({
  name: 'Documentation',
  key: 'documentation',
  version: '1.0.0',
  credentials: z.object({}),
  setup: z.object({}),
  examplePrompt:
    'Find documentation for Anthropic Claude API authentication methods, then search for Prisma database schema migration best practices.',
  logo: 'https://stackone-logos.com/api/stackone/filled/svg',
  tools: (tool) => ({
    GET_PROVIDER_KEY: tool({
      name: 'get_provider_key',
      description:
        'ALWAYS call this first to discover available documentation providers. Essential step before searching documentation. Returns provider keys, names, and descriptions for 30+ services including AI platforms (anthropic, openai), databases (pinecone, prisma), frameworks (astro, expo), and developer tools (cursor, zapier). Use the returned provider_key with search_docs.',
      schema: z.object({
        provider_name: z
          .string()
          .describe(
            'Optional provider name to fuzzy match. Examples: "anthropic", "prisma", "cursor". Leave empty to see all providers.'
          )
          .optional(),
      }),
      handler: async (args, _context) => {
        try {
          // try be as token efficient as possible
          if (!args.provider_name || args.provider_name.trim() === '') {
            const providerList = DOCUMENTATION_PROVIDERS.map(
              (p) => `- Key: ${p.key}\n- Description: ${p.description}`
            ).join('\n----------\n');

            return `${generateProviderExplanation()}${providerList}`;
          }

          // create an index
          const index = await createIndex(DOCUMENTATION_PROVIDERS, {
            fields: ['key', 'name', 'description'],
            maxResults: 10,
            threshold: 0.1,
          });

          // do the search
          const searchResults = await search(index, args.provider_name);
          if (searchResults.length === 0) {
            return `No providers found matching "${args.provider_name}". Try a broader search or call get_provider_key without arguments.`;
          }

          // Return matched providers
          const results = searchResults.map(
            (res) =>
              `- Key: ${res.item.key}\n- Name: ${res.item.name}\n- Description: ${res.item.description}\n- LlmFullUrl: ${res.item.llmsFullUrl}\n- Category: ${res.item.category}`
          );

          return `${generateProviderExplanation()}Found ${results.length} provider${results.length === 1 ? '' : 's'} matching "${args.provider_name}":\n\n${results.join('\n----------\n')}`;
        } catch (error) {
          console.error('[get_provider_key] Handler error:', error);
          return `Error getting provider keys: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    }),
    SEARCH_DOCS: tool({
      name: 'search_docs',
      description:
        'Search documentation for a specific provider using a query. MUST use get_provider_key first to get the correct provider_key. Returns relevant documentation sections with confidence scores. Works best with specific technical terms, API names, or feature descriptions.',
      schema: z.object({
        provider_key: z
          .string()
          .describe(
            'Exact provider key from get_provider_key output. Common examples: "anthropic" (Claude API), "ai-sdk" (Vercel AI SDK), "prisma" (database ORM), "cursor" (AI editor), "zapier" (automation), "pinecone" (vector database). Case-sensitive.'
          ),
        query: z
          .string()
          .describe(
            'Search query for documentation. Best results with: API method names (e.g., "createMessage"), feature names (e.g., "function calling"), technical concepts (e.g., "authentication", "rate limits"), or error codes. Avoid generic terms like "how to" or "tutorial".'
          ),
        max_results: z
          .number()
          .min(1)
          .max(10)
          .default(5)
          .describe('Maximum number of results to return (1-10). Default is 5.')
          .optional(),
      }),
      handler: async (args, context) => {
        try {
          const maxResults = args.max_results || 5;
          const provider = DOCUMENTATION_PROVIDERS.find(
            (p) => p.key === args.provider_key
          );

          if (!provider) {
            return `Provider "${args.provider_key}" not found. Call get_provider_key to see available providers.`;
          }

          if (!args.query || args.query.trim().length < 2) {
            return 'Please provide a meaningful search query (at least 2 characters).';
          }

          // Try to get cached documentation first
          let text: string | null = null;

          // connector level cache in format <connector-key>:<search-key>:<version>
          const cacheKey = `documentation:${args.provider_key}:v3`;

          try {
            text = await context.readCache(cacheKey);
          } catch (error) {
            console.warn(`KV cache read error for ${args.provider_key}:`, error);
          }

          // If not cached, fetch from external URL
          if (!text) {
            const res = await fetch(provider.llmsFullUrl);

            if (!res.ok) {
              return `Error fetching documentation for ${provider.name}: ${res.status} ${res.statusText}`;
            }

            text = await res.text();

            // Cache the fetched documentation (24 hour TTL)
            if (text && text.length > 100) {
              try {
                await context.writeCache(cacheKey, text);
              } catch (error) {
                console.warn(`KV cache write error for ${args.provider_key}:`, error);
              }
            }
          }

          // Search the documentation text
          const chunks = splitTextIntoSmartChunks(text);

          if (chunks.length === 0) {
            return `No content found in ${provider.name} documentation.`;
          }

          // Convert chunks to searchable objects
          const documents = chunks.map((chunk, index) => ({
            id: String(index),
            text: chunk,
          }));

          // Search using our lexical search utility
          const index = await createIndex(documents, {
            fields: ['text'],
            maxResults,
            threshold: 0.1,
          });

          const searchResults = await search(index, args.query);

          if (searchResults.length === 0) {
            return `No relevant documentation found for "${args.query}" in ${provider.name}. Try different search terms.`;
          }

          // Format search results
          const results = searchResults
            .map(
              (result, idx) =>
                `### Search Result ${idx + 1}\n\n${((result.item as AnySearchableObject).text as string).trim()}`
            )
            .join(`\n\n${'----------'}\n\n`);

          return `Found ${searchResults.length} relevant sections in ${provider.name} documentation for "${args.query}":\n\n${results}`;
        } catch (error) {
          console.error('[search_docs] Handler error:', error);
          return `Error searching "${args.provider_key}" for "${args.query}": ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    }),
  }),
});

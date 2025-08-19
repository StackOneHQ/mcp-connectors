import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

export const TestConnectorConfig = mcpConnectorConfig({
  name: 'Test',
  key: 'test',
  version: '1.0.0',
  credentials: z.object({
    apiKey: z.string().describe('API Key'),
  }),
  setup: z.object({
    someSetting: z.string().describe('Some setting'),
  }),
  logo: 'https://stackone-logos.com/api/disco/filled/svg',
  examplePrompt:
    'Test the connector by running basic tools, persisting some values, and incrementing a counter to verify functionality.',
  tools: (tool) => ({
    TEST_TOOL: tool({
      name: 'test-tool',
      description: 'Test tool',
      schema: z.object({}),
      handler: async (_args, context) => {
        console.log('CONTEXT', context);

        const credentials = await context.getCredentials();
        console.log('CREDENTIALS', credentials);
        return 'this is a test';
      },
    }),

    TEST_TOOL_WITH_ARGS: tool({
      name: 'test-tool-with-args',
      description: 'Test tool with args',
      schema: z.object({
        param1: z.string().describe('Param 1'),
      }),
      handler: (args, context) => {
        console.log('CONTEXT', context);
        return `this is a test with args: ${JSON.stringify(args)}`;
      },
    }),

    PERSIST_VALUE: tool({
      name: 'persist_value',
      description: 'Persist a value to demonstrate state management',
      schema: z.object({
        key: z.string().describe('Key to store the value under'),
        value: z.union([z.string(), z.number()]).describe('Value to persist'),
      }),
      handler: async (args, context) => {
        await context.setData(args.key, args.value);
        return `Stored "${args.value}" under key "${args.key}"`;
      },
    }),

    GET_VALUE: tool({
      name: 'get_value',
      description: 'Retrieve a previously persisted value',
      schema: z.object({
        key: z.string().describe('Key to retrieve the value for'),
      }),
      handler: async (args, context) => {
        const value = await context.getData(args.key);

        if (value === undefined) {
          return `No value found for key "${args.key}"`;
        }

        return `Retrieved value for "${args.key}": ${JSON.stringify(value)}`;
      },
    }),

    INCREMENT_COUNTER: tool({
      name: 'increment_counter',
      description: 'Increment a persistent counter',
      schema: z.object({
        amount: z.number().optional().describe('Amount to increment by (default: 1)'),
      }),
      handler: async (args, context) => {
        const currentCounter = (await context.getData<number>('counter')) ?? 0;
        const increment = args.amount ?? 1;
        const newCounter = currentCounter + increment;

        await context.setData('counter', newCounter);

        return `Counter incremented by ${increment}. New value: ${newCounter}`;
      },
    }),
  }),
});

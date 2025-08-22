import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import OpenAI from 'openai';
import { z } from 'zod';

export type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

// Type definitions for Deepseek connector tools
export interface DeepseekUser {
  id: string;
  name: string;
  email: string;
  metadata?: Record<string, unknown>;
}

export interface DeepseekTask {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
}

const TAG_START = '<thinking>';
const TAG_END = '</thinking>';

const callDeepseek = async (apiKey: string, messages: Message[]): Promise<string> => {
  const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: apiKey,
  });

  const stream = await openai.chat.completions.create({
    messages,
    model: 'deepseek-reasoner',
    stream: true,
  });

  let fullResponse = '';
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (!content) continue;

    if (fullResponse.includes(TAG_END)) break;
    fullResponse += content;
  }

  const start = fullResponse.indexOf(TAG_START) + TAG_START.length;
  const end = fullResponse.indexOf(TAG_END);
  return fullResponse.slice(start, end).trim();
};

export const DeepseekConnectorConfig = mcpConnectorConfig({
  name: 'Deepseek',
  key: 'deepseek',
  logo: 'https://stackone-logos.com/api/deepseek/filled/svg',
  version: '1.0.0',
  credentials: z.object({
    apiKey: z
      .string()
      .describe(
        'DeepSeek API Key from platform.deepseek.com :: sk-1234567890abcdef1234567890abcdef :: https://platform.deepseek.com/api-keys'
      ),
  }),
  setup: z.object({}),
  examplePrompt:
    'I need to analyze a complex problem step by step. Walk me through the reasoning process for determining the optimal approach to implement a distributed caching system.',
  tools: (tool) => ({
    THINKING: tool({
      name: 'chain-of-thought-reasoning',
      description:
        'Use this tool for all thinking and reasoning tasks. The tool accepts a question and returns a chain of thought reasoning. You must include all context and information relevant in the question.',
      schema: z.object({
        question: z.string(),
      }),
      handler: async (args, context) => {
        console.log('Thinking Tool', { question: args.question });

        try {
          const { apiKey } = await context.getCredentials();
          const text = await callDeepseek(apiKey, [
            { role: 'user', content: args.question },
          ]);
          console.log('Thinking Tool Response', { text });
          return text;
        } catch (error) {
          console.log('Thinking Tool Error', { error });
          return 'Failed to invoke thinking tool, please try again later.';
        }
      },
    }),
    deepseek_get_data: tool({
      name: 'deepseek_get_data',
      description:
        'Retrieve user profile data including user ID, name, email, and optional metadata fields',
      schema: z.object({
        user_id: z.string().describe('The unique identifier for the user profile'),
        include_metadata: z
          .boolean()
          .optional()
          .describe('Flag to indicate whether to include additional metadata fields'),
      }),
      handler: async (args, _context) => {
        console.log('Deepseek Get Data Tool', {
          user_id: args.user_id,
          include_metadata: args.include_metadata,
        });

        try {
          // Since Deepseek API doesn't have native user management,
          // this would typically integrate with an external user management system
          // For now, return a structured response indicating the API limitation
          const response: DeepseekUser = {
            id: args.user_id,
            name: `User ${args.user_id}`,
            email: `user${args.user_id}@example.com`,
            ...(args.include_metadata && {
              metadata: {
                note: 'Deepseek API does not natively support user management. This tool would require integration with an external user management system.',
                timestamp: new Date().toISOString(),
              },
            }),
          };

          console.log('Deepseek Get Data Response', response);
          return JSON.stringify(response);
        } catch (error) {
          console.log('Deepseek Get Data Error', { error });
          return JSON.stringify({ error: 'Failed to retrieve user data' });
        }
      },
    }),
    deepseek_create_item: tool({
      name: 'deepseek_create_item',
      description:
        'Create new project tasks and associate them with specific user profiles',
      schema: z.object({
        user_id: z.string().describe('The unique identifier for the user profile'),
        title: z.string().describe('The title of the task to create'),
        description: z.string().optional().describe('Optional description of the task'),
      }),
      handler: async (args, _context) => {
        console.log('Deepseek Create Item Tool', {
          user_id: args.user_id,
          title: args.title,
          description: args.description,
        });

        try {
          // Since Deepseek API doesn't have native task management,
          // this would typically integrate with an external task management system
          const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          const response: DeepseekTask = {
            id: taskId,
            user_id: args.user_id,
            title: args.title,
            description: args.description,
            status: 'pending',
            created_at: new Date().toISOString(),
          };

          console.log('Deepseek Create Item Response', response);
          return JSON.stringify({
            ...response,
            note: 'Deepseek API does not natively support task management. This tool would require integration with an external task management system.',
          });
        } catch (error) {
          console.log('Deepseek Create Item Error', { error });
          return JSON.stringify({ error: 'Failed to create task item' });
        }
      },
    }),
  }),
});

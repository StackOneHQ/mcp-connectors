import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import OpenAI from 'openai';
import { z } from 'zod';

export type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

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
  }),
});

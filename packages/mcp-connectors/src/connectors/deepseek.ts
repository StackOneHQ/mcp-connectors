import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
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

export interface DeepseekCredentials {
  apiKey: string;
}

export function createDeepseekServer(credentials: DeepseekCredentials): McpServer {
  const server = new McpServer({
    name: 'Deepseek',
    version: '1.0.0',
  });

  server.tool(
    'chain-of-thought-reasoning',
    'Use this tool for all thinking and reasoning tasks. The tool accepts a question and returns a chain of thought reasoning. You must include all context and information relevant in the question.',
    {
      question: z.string(),
    },
    async (args) => {
      console.log('Thinking Tool', { question: args.question });

      try {
        const text = await callDeepseek(credentials.apiKey, [
          { role: 'user', content: args.question },
        ]);
        console.log('Thinking Tool Response', { text });
        return {
          content: [{
            type: 'text',
            text: text,
          }],
        };
      } catch (error) {
        console.log('Thinking Tool Error', { error });
        return {
          content: [{
            type: 'text',
            text: 'Failed to invoke thinking tool, please try again later.',
          }],
        };
      }
    }
  );

  return server;
}

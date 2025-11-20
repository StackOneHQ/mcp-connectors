import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ConnectorMetadata } from '../types/metadata';

type DeepSeekRole = 'system' | 'user' | 'assistant' | 'tool';

interface DeepSeekMessage {
  role: DeepSeekRole;
  content: string;
}

interface DeepSeekReasoningContentItem {
  type?: string;
  text?: string;
}

interface DeepSeekAssistantMessage {
  role: string;
  content: string | Array<DeepSeekReasoningContentItem | string>;
  reasoning_content?: string | DeepSeekReasoningContentItem[];
}

interface DeepSeekChoice {
  index: number;
  finish_reason: string | null;
  message: DeepSeekAssistantMessage;
}

interface DeepSeekUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface DeepSeekChatResponse {
  id: string;
  created: number;
  model: string;
  choices: DeepSeekChoice[];
  usage?: DeepSeekUsage;
}

interface DeepSeekModelSummary {
  id: string;
  object?: string;
  created?: number;
  owned_by?: string;
  description?: string;
}

interface DeepSeekModelsResponse {
  data: DeepSeekModelSummary[];
}

class DeepSeekClient {
  private readonly baseUrl = 'https://api.deepseek.com/v1';
  private readonly headers: Record<string, string>;

  constructor(apiKey: string) {
    this.headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async chatCompletion(
    model: string,
    messages: DeepSeekMessage[],
    {
      maxTokens = 4096,
      temperature = 0.7,
    }: {
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<DeepSeekChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `DeepSeek API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json() as Promise<DeepSeekChatResponse>;
  }

  async listModels(): Promise<DeepSeekModelsResponse> {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: this.headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `DeepSeek API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json() as Promise<DeepSeekModelsResponse>;
  }
}

const extractContent = (
  content: string | Array<DeepSeekReasoningContentItem | string> | undefined
): string => {
  if (!content) {
    return '';
  }

  if (typeof content === 'string') {
    return content;
  }

  return content
    .map((item) => {
      if (typeof item === 'string') {
        return item;
      }
      return item?.text || '';
    })
    .filter(Boolean)
    .join('\n');
};

const extractReasoningContent = (
  reasoning: string | DeepSeekReasoningContentItem[] | undefined
): string => {
  if (!reasoning) {
    return '';
  }

  if (typeof reasoning === 'string') {
    return reasoning;
  }

  return reasoning
    .map((item) => item?.text || '')
    .filter(Boolean)
    .join('\n');
};

const formatChatResponse = (response: DeepSeekChatResponse): string => {
  const choice = response.choices[0];
  const rawContent = extractContent(choice?.message?.content);
  const reasoning = extractReasoningContent(choice?.message?.reasoning_content);
  const usage = response.usage
    ? `\n\nTokens Used:\n- Prompt: ${response.usage.prompt_tokens}\n- Completion: ${response.usage.completion_tokens}\n- Total: ${response.usage.total_tokens}`
    : '';

  const reasoningSection = reasoning ? `\n\nReasoning Trace:\n${reasoning}` : '';

  return `DeepSeek Response (model: ${response.model}, finish: ${choice?.finish_reason ?? 'unknown'})

${rawContent || 'No response content returned.'}${reasoningSection}${usage}`;
};

export const DeepSeekCredentialsSchema = z.object({
  apiKey: z.string().describe('API key for authentication'),
});

export type DeepSeekCredentials = z.infer<typeof DeepSeekCredentialsSchema>;

export const DeepseekConnectorMetadata = {
  key: 'deepseek',
  name: 'DeepSeek',
  description: 'AI-powered code understanding',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/deepseek/filled/svg',
  examplePrompt: 'Analyze code with DeepSeek',
  categories: ['ai', 'development'],
  credentialsSchema: DeepSeekCredentialsSchema,
} as const satisfies ConnectorMetadata;

export function createDeepSeekServer(credentials: DeepSeekCredentials): McpServer {
  const server = new McpServer({
    name: 'DeepSeek',
    version: '1.0.0',
  });

  server.tool(
    'deepseek_chat',
    'Generate a conversational response using the general-purpose DeepSeek Chat model',
    {
      prompt: z.string().min(1).describe('User prompt or question for the assistant'),
      systemPrompt: z
        .string()
        .optional()
        .describe('Optional system instructions that steer the assistant'),
      model: z
        .string()
        .default('deepseek-chat')
        .describe('DeepSeek model identifier (e.g., deepseek-chat)'),
      temperature: z
        .number()
        .min(0)
        .max(2)
        .default(0.7)
        .describe('Sampling temperature for response creativity'),
      maxTokens: z
        .number()
        .int()
        .min(1)
        .max(8192)
        .default(4096)
        .describe('Maximum number of tokens to generate in the response'),
    },
    async (args) => {
      try {
        const client = new DeepSeekClient(credentials.apiKey);
        const messages: DeepSeekMessage[] = [];

        if (args.systemPrompt) {
          messages.push({
            role: 'system',
            content: args.systemPrompt,
          });
        }

        messages.push({
          role: 'user',
          content: args.prompt,
        });

        const response = await client.chatCompletion(args.model, messages, {
          temperature: args.temperature,
          maxTokens: args.maxTokens,
        });

        return {
          content: [
            {
              type: 'text',
              text: formatChatResponse(response),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to call DeepSeek chat: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'deepseek_reason',
    'Invoke the DeepSeek Reasoner model for structured, step-by-step analysis',
    {
      prompt: z.string().min(1).describe('Problem statement or scenario to analyse'),
      systemPrompt: z
        .string()
        .optional()
        .describe('Optional system instructions to provide additional context'),
      temperature: z
        .number()
        .min(0)
        .max(2)
        .default(0.3)
        .describe(
          'Sampling temperature (lower values yield more deterministic reasoning)'
        ),
      maxTokens: z
        .number()
        .int()
        .min(1)
        .max(8192)
        .default(4096)
        .describe('Maximum number of tokens to generate in the reasoning response'),
    },
    async (args) => {
      try {
        const client = new DeepSeekClient(credentials.apiKey);
        const messages: DeepSeekMessage[] = [];

        if (args.systemPrompt) {
          messages.push({
            role: 'system',
            content: args.systemPrompt,
          });
        }

        messages.push({
          role: 'user',
          content: args.prompt,
        });

        const response = await client.chatCompletion('deepseek-reasoner', messages, {
          temperature: args.temperature,
          maxTokens: args.maxTokens,
        });

        return {
          content: [
            {
              type: 'text',
              text: formatChatResponse(response),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to call DeepSeek reasoner: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'deepseek_list_models',
    'Retrieve the list of DeepSeek models available to the current API key',
    {},
    async () => {
      try {
        const client = new DeepSeekClient(credentials.apiKey);
        const response = await client.listModels();

        if (!response.data || response.data.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No DeepSeek models were returned for this API key.',
              },
            ],
          };
        }

        const formatted = response.data
          .map((model, index) => {
            const lines = [
              `${index + 1}. ${model.id}`,
              model.description ? `   Description: ${model.description}` : '',
              model.owned_by ? `   Owned by: ${model.owned_by}` : '',
              model.created
                ? `   Created: ${new Date(model.created * 1000).toISOString()}`
                : '',
            ].filter(Boolean);

            return lines.join('\n');
          })
          .join('\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `Available DeepSeek Models:\n\n${formatted}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to retrieve DeepSeek models: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  return server;
}

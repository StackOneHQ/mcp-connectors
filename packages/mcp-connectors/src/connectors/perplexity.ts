import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

interface PerplexityResponse {
  id: string;
  model: string;
  created: number;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
    delta: {
      role: string;
      content: string;
    };
  }>;
}

class PerplexityClient {
  private headers: { Authorization: string; 'Content-Type': string };
  private baseUrl = 'https://api.perplexity.ai';

  constructor(apiKey: string) {
    this.headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async makeRequest(
    model: string,
    messages: Array<{ role: string; content: string }>,
    maxTokens = 4000
  ): Promise<PerplexityResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.2,
        top_p: 0.9,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Perplexity API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json() as Promise<PerplexityResponse>;
  }

  async search(query: string, maxTokens = 2000): Promise<string> {
    const messages = [
      {
        role: 'system',
        content:
          'You are a helpful assistant that provides accurate, up-to-date information from web searches. Always cite sources when possible.',
      },
      {
        role: 'user',
        content: query,
      },
    ];

    const response = await this.makeRequest('sonar-pro', messages, maxTokens);
    return response.choices[0]?.message?.content || 'No response generated';
  }

  async reason(query: string, maxTokens = 4000): Promise<string> {
    const messages = [
      {
        role: 'system',
        content:
          'You are an expert reasoning assistant that provides detailed analysis, breaks down complex problems, and offers step-by-step solutions. Use current web information when relevant.',
      },
      {
        role: 'user',
        content: query,
      },
    ];

    const response = await this.makeRequest('sonar-reasoning-pro', messages, maxTokens);
    return response.choices[0]?.message?.content || 'No response generated';
  }

  async deepResearch(query: string, maxTokens = 8000): Promise<string> {
    const messages = [
      {
        role: 'system',
        content:
          'You are a comprehensive research assistant that conducts thorough investigations, synthesizes information from multiple sources, and provides detailed reports with proper citations.',
      },
      {
        role: 'user',
        content: query,
      },
    ];

    const response = await this.makeRequest('sonar-deep-research', messages, maxTokens);
    return response.choices[0]?.message?.content || 'No response generated';
  }

  async customModel(
    model: string,
    prompt: string,
    systemPrompt?: string,
    maxTokens = 4000
  ): Promise<string> {
    const messages = [];

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: prompt,
    });

    const response = await this.makeRequest(model, messages, maxTokens);
    return response.choices[0]?.message?.content || 'No response generated';
  }
}

export interface PerplexityCredentials {
  apiKey: string;
}

export function createPerplexityServer(credentials: PerplexityCredentials): McpServer {
  const server = new McpServer({
    name: 'Perplexity',
    version: '1.0.0',
  });

  server.tool(
    'perplexity_search',
    'Perform a web search using Perplexity Sonar Pro for quick, accurate results with citations',
    {
      query: z.string().describe('The search query or question'),
      maxTokens: z.number().default(2000).describe('Maximum tokens for the response'),
    },
    async (args) => {
      try {
        const client = new PerplexityClient(credentials.apiKey);
        const result = await client.search(args.query, args.maxTokens);
        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to perform search: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'perplexity_reason',
    'Use Perplexity Sonar Reasoning Pro for complex analysis, problem-solving, and detailed explanations',
    {
      query: z.string().describe('The complex question or problem to analyze'),
      maxTokens: z.number().default(4000).describe('Maximum tokens for the response'),
    },
    async (args) => {
      try {
        const client = new PerplexityClient(credentials.apiKey);
        const result = await client.reason(args.query, args.maxTokens);
        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to perform reasoning: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'perplexity_deep_research',
    'Conduct comprehensive research using Perplexity Sonar Deep Research for thorough investigations',
    {
      query: z
        .string()
        .describe('The research topic or question requiring comprehensive analysis'),
      maxTokens: z.number().default(8000).describe('Maximum tokens for the response'),
    },
    async (args) => {
      try {
        const client = new PerplexityClient(credentials.apiKey);
        const result = await client.deepResearch(args.query, args.maxTokens);
        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to perform deep research: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'perplexity_custom_model',
    'Use a specific Perplexity model with custom prompts',
    {
      model: z
        .enum(['sonar-pro', 'sonar-reasoning-pro', 'sonar-deep-research'])
        .describe('The Perplexity model to use'),
      prompt: z.string().describe('The main prompt or question'),
      systemPrompt: z
        .string()
        .optional()
        .describe('Optional system prompt to set context'),
      maxTokens: z.number().default(4000).describe('Maximum tokens for the response'),
    },
    async (args) => {
      try {
        const client = new PerplexityClient(credentials.apiKey);
        const result = await client.customModel(
          args.model,
          args.prompt,
          args.systemPrompt,
          args.maxTokens
        );
        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to use custom model: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  return server;
}

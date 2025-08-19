import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { ParallelConnectorConfig } from './parallel';

const createMockContextWithCredentials = () => {
  const mockContext = createMockConnectorContext();
  mockContext.getCredentials = vi.fn().mockResolvedValue({ apiKey: 'test-api-key' });
  return mockContext;
};

const mockSearchResponse = {
  results: [
    {
      url: 'https://example.com/result1',
      title: 'Test Result 1',
      content:
        'This is test content for result 1 with detailed information about the topic.',
      relevance_score: 0.95,
    },
    {
      url: 'https://example.com/result2',
      title: 'Test Result 2',
      content:
        'This is test content for result 2 with more details about the subject matter.',
      relevance_score: 0.87,
    },
  ],
  total_results: 2,
  search_time: 2.5,
};

const mockTaskResponse = {
  task_id: 'task_12345',
  status: 'completed' as const,
  result: {
    findings: ['Finding 1', 'Finding 2'],
    summary: 'Research summary',
  },
};

const mockChatResponse = {
  response: 'This is a test chat response with web-researched information.',
  sources: [
    {
      url: 'https://source1.com',
      title: 'Source 1',
      snippet: 'Source 1 snippet',
    },
    {
      url: 'https://source2.com',
      title: 'Source 2',
      snippet: 'Source 2 snippet',
    },
  ],
};

const server = setupServer(
  http.post('https://api.parallel.ai/alpha/search', () => {
    return HttpResponse.json(mockSearchResponse);
  }),
  http.post('https://api.parallel.ai/alpha/task', () => {
    return HttpResponse.json(mockTaskResponse);
  }),
  http.get('https://api.parallel.ai/alpha/task/:taskId', () => {
    return HttpResponse.json(mockTaskResponse);
  }),
  http.post('https://api.parallel.ai/alpha/chat', () => {
    return HttpResponse.json(mockChatResponse);
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('#ParallelConnectorConfig', () => {
  describe('.SEARCH', () => {
    it('should search with objective only', async () => {
      const tool = ParallelConnectorConfig.tools.SEARCH as MCPToolDefinition;

      const actual = await tool.handler(
        {
          objective: 'What is artificial intelligence?',
        },
        createMockContextWithCredentials()
      );

      expect(actual).toContain('Found 2 search results');
      expect(actual).toContain('Test Result 1');
      expect(actual).toContain('Test Result 2');
      expect(actual).toContain('Search completed in 2.5s');
    });

    it('should search with search queries only', async () => {
      const tool = ParallelConnectorConfig.tools.SEARCH as MCPToolDefinition;

      const actual = await tool.handler(
        {
          searchQueries: ['AI development', 'machine learning'],
        },
        createMockContextWithCredentials()
      );

      expect(actual).toContain('Found 2 search results');
      expect(actual).toContain('Test Result 1');
    });

    it('should return error when neither objective nor searchQueries provided', async () => {
      const tool = ParallelConnectorConfig.tools.SEARCH as MCPToolDefinition;

      const actual = await tool.handler({}, createMockContextWithCredentials());

      expect(actual).toBe('Error: Either objective or searchQueries must be provided.');
    });

    it('should handle search results with missing content field', async () => {
      server.use(
        http.post('https://api.parallel.ai/alpha/search', () => {
          return HttpResponse.json({
            results: [
              {
                url: 'https://example.com/no-content',
                title: 'Result Without Content',
                // content field is missing
              },
              {
                url: 'https://example.com/empty-content',
                title: 'Result With Empty Content',
                content: '',
              },
            ],
            total_results: 2,
            search_time: 1.2,
          });
        })
      );

      const tool = ParallelConnectorConfig.tools.SEARCH as MCPToolDefinition;

      const actual = await tool.handler(
        {
          objective: 'test search with missing content',
        },
        createMockContextWithCredentials()
      );

      expect(actual).toContain('Found 2 search results');
      expect(actual).toContain('Result Without Content');
      expect(actual).toContain('Result With Empty Content');
      expect(actual).not.toContain('Content: undefined');
      expect(actual).toContain('Search completed in 1.2s');
    });

    it('should handle API error', async () => {
      server.use(
        http.post('https://api.parallel.ai/alpha/search', () => {
          return new HttpResponse(null, { status: 401, statusText: 'Unauthorized' });
        })
      );

      const tool = ParallelConnectorConfig.tools.SEARCH as MCPToolDefinition;

      const actual = await tool.handler(
        {
          objective: 'test search',
        },
        createMockContextWithCredentials()
      );

      expect(actual).toContain('Failed to perform search');
      expect(actual).toContain('401 Unauthorized');
    });
  });

  describe('.CREATE_TASK', () => {
    it('should create task with objective', async () => {
      const tool = ParallelConnectorConfig.tools.CREATE_TASK as MCPToolDefinition;

      const actual = await tool.handler(
        {
          objective: 'Research AI trends in 2024',
        },
        createMockContextWithCredentials()
      );

      expect(actual).toContain('Task completed immediately');
      expect(actual).toContain('findings');
      expect(actual).toContain('Finding 1');
    });

    it('should create task with entities', async () => {
      const tool = ParallelConnectorConfig.tools.CREATE_TASK as MCPToolDefinition;

      const actual = await tool.handler(
        {
          objective: 'Research companies',
          entities: ['OpenAI', 'Anthropic', 'Google'],
        },
        createMockContextWithCredentials()
      );

      expect(actual).toContain('Task completed immediately');
    });

    it('should handle pending task', async () => {
      server.use(
        http.post('https://api.parallel.ai/alpha/task', () => {
          return HttpResponse.json({
            task_id: 'task_pending',
            status: 'pending',
          });
        })
      );

      const tool = ParallelConnectorConfig.tools.CREATE_TASK as MCPToolDefinition;

      const actual = await tool.handler(
        {
          objective: 'Research AI trends',
        },
        createMockContextWithCredentials()
      );

      expect(actual).toContain('Task created successfully');
      expect(actual).toContain('task_pending');
      expect(actual).toContain('Status: pending');
    });
  });

  describe('.GET_TASK_STATUS', () => {
    it('should get completed task status', async () => {
      const tool = ParallelConnectorConfig.tools.GET_TASK_STATUS as MCPToolDefinition;

      const actual = await tool.handler(
        {
          taskId: 'task_12345',
        },
        createMockContextWithCredentials()
      );

      expect(actual).toContain('Task completed successfully');
      expect(actual).toContain('findings');
    });

    it('should handle failed task', async () => {
      server.use(
        http.get('https://api.parallel.ai/alpha/task/:taskId', () => {
          return HttpResponse.json({
            task_id: 'task_failed',
            status: 'failed',
            error: 'Task processing failed',
          });
        })
      );

      const tool = ParallelConnectorConfig.tools.GET_TASK_STATUS as MCPToolDefinition;

      const actual = await tool.handler(
        {
          taskId: 'task_failed',
        },
        createMockContextWithCredentials()
      );

      expect(actual).toContain('Task failed: Task processing failed');
    });

    it('should handle pending task', async () => {
      server.use(
        http.get('https://api.parallel.ai/alpha/task/:taskId', () => {
          return HttpResponse.json({
            task_id: 'task_pending',
            status: 'processing',
          });
        })
      );

      const tool = ParallelConnectorConfig.tools.GET_TASK_STATUS as MCPToolDefinition;

      const actual = await tool.handler(
        {
          taskId: 'task_pending',
        },
        createMockContextWithCredentials()
      );

      expect(actual).toContain('Task status: processing');
      expect(actual).toContain('Please check again later');
    });
  });

  describe('.CHAT', () => {
    it('should chat without system prompt', async () => {
      const tool = ParallelConnectorConfig.tools.CHAT as MCPToolDefinition;

      const actual = await tool.handler(
        {
          message: 'What is the latest in AI development?',
        },
        createMockContextWithCredentials()
      );

      expect(actual).toContain('This is a test chat response');
      expect(actual).toContain('Sources:');
      expect(actual).toContain('Source 1');
      expect(actual).toContain('Source 2');
    });

    it('should chat with system prompt', async () => {
      const tool = ParallelConnectorConfig.tools.CHAT as MCPToolDefinition;

      const actual = await tool.handler(
        {
          message: 'Explain AI concepts',
          systemPrompt: 'You are an AI expert explaining complex topics simply.',
          maxTokens: 1000,
        },
        createMockContextWithCredentials()
      );

      expect(actual).toContain('This is a test chat response');
      expect(actual).toContain('Sources:');
    });

    it('should handle response without sources', async () => {
      server.use(
        http.post('https://api.parallel.ai/alpha/chat', () => {
          return HttpResponse.json({
            response: 'Response without sources',
          });
        })
      );

      const tool = ParallelConnectorConfig.tools.CHAT as MCPToolDefinition;

      const actual = await tool.handler(
        {
          message: 'Simple question',
        },
        createMockContextWithCredentials()
      );

      expect(actual).toBe('Response without sources');
      expect(actual).not.toContain('Sources:');
    });

    it('should handle chat response with missing response field', async () => {
      server.use(
        http.post('https://api.parallel.ai/alpha/chat', () => {
          return HttpResponse.json({
            // response field is missing
            sources: [
              {
                url: 'https://example.com',
                title: 'Example',
                snippet: 'Test snippet',
              },
            ],
          });
        })
      );

      const tool = ParallelConnectorConfig.tools.CHAT as MCPToolDefinition;

      const actual = await tool.handler(
        {
          message: 'Test message',
        },
        createMockContextWithCredentials()
      );

      expect(actual).toContain('No response received');
      expect(actual).toContain('Sources:');
      expect(actual).toContain('Example');
    });

    it('should handle chat response with incomplete source fields', async () => {
      server.use(
        http.post('https://api.parallel.ai/alpha/chat', () => {
          return HttpResponse.json({
            response: 'Test response',
            sources: [
              {
                // title is missing
                url: 'https://example1.com',
                snippet: 'Snippet 1',
              },
              {
                title: 'Title 2',
                // url is missing
                snippet: 'Snippet 2',
              },
              {
                title: 'Title 3',
                url: 'https://example3.com',
                // snippet is missing
              },
            ],
          });
        })
      );

      const tool = ParallelConnectorConfig.tools.CHAT as MCPToolDefinition;

      const actual = await tool.handler(
        {
          message: 'Test message',
        },
        createMockContextWithCredentials()
      );

      expect(actual).toContain('Test response');
      expect(actual).toContain('Untitled'); // For missing title
      expect(actual).toContain('No URL'); // For missing URL
      expect(actual).toContain('Snippet 1');
      expect(actual).toContain('Title 2');
      expect(actual).toContain('Title 3');
    });
  });
});

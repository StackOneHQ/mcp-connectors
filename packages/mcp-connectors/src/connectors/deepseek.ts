import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import OpenAI from 'openai';
import { z } from 'zod';

export type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export interface DeepseekUser {
  id: string;
  name: string;
  email: string;
  metadata?: Record<string, unknown>;
}

export interface DeepseekTask {
  id: string;
  title: string;
  description?: string;
  user_id: string;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface DeepseekNotification {
  id: string;
  user_id: string;
  type: 'task_created' | 'task_updated' | 'general';
  title: string;
  message: string;
  sent_at: string;
}

const TAG_START = '<thinking>';
const TAG_END = '</thinking>';

// Mock data storage for demonstration purposes
// In a real implementation, this would connect to DeepSeek's API
const mockUsers: Map<string, DeepseekUser> = new Map([
  [
    'user_1',
    {
      id: 'user_1',
      name: 'John Doe',
      email: 'john.doe@example.com',
      metadata: {
        department: 'Engineering',
        role: 'Senior Developer',
        timezone: 'UTC-8',
        preferences: { notifications: true, theme: 'dark' },
      },
    },
  ],
  [
    'user_2',
    {
      id: 'user_2',
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      metadata: {
        department: 'Product',
        role: 'Product Manager',
        timezone: 'UTC-5',
        preferences: { notifications: true, theme: 'light' },
      },
    },
  ],
]);

const mockTasks: Map<string, DeepseekTask> = new Map();
const mockNotifications: Map<string, DeepseekNotification> = new Map();

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

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
    'Retrieve user profile data for user_1 and create a new task titled "Implement user authentication" for them. Also send them a notification about the new project requirements.',
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

    GET_USER_DATA: tool({
      name: 'deepseek_get_data',
      description:
        'Retrieve user profile data including user ID, name, email, and optional metadata fields. Returns comprehensive user information for task management and notifications.',
      schema: z.object({
        user_id: z.string().describe('The unique identifier for the user profile'),
        include_metadata: z
          .boolean()
          .optional()
          .describe(
            'Flag to indicate whether to include additional metadata fields for the user'
          ),
      }),
      handler: async (args, _context) => {
        console.log('Get User Data Tool', {
          user_id: args.user_id,
          include_metadata: args.include_metadata,
        });

        try {
          const user = mockUsers.get(args.user_id);

          if (!user) {
            throw new Error(`User with ID ${args.user_id} not found`);
          }

          const result: DeepseekUser = {
            id: user.id,
            name: user.name,
            email: user.email,
          };

          if (args.include_metadata && user.metadata) {
            result.metadata = user.metadata;
          }

          console.log('Get User Data Response', { result });
          return JSON.stringify(result);
        } catch (error) {
          console.log('Get User Data Error', { error });
          throw new Error(
            `Failed to retrieve user data: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      },
    }),

    CREATE_ITEM: tool({
      name: 'deepseek_create_item',
      description:
        'Create new project tasks and associate them with specific user profiles. Provides the ability to send notifications to users about task updates and project changes.',
      schema: z.object({
        user_id: z
          .string()
          .describe('The unique identifier for the user to associate with the task'),
        title: z.string().describe('The title of the task or item to create'),
        description: z.string().optional().describe('Optional description of the task'),
        type: z
          .enum(['task', 'notification'])
          .describe('Type of item to create - either a task or notification'),
        notification_type: z
          .enum(['task_created', 'task_updated', 'general'])
          .optional()
          .describe('Type of notification (required if type is notification)'),
        notification_message: z
          .string()
          .optional()
          .describe('Notification message content (required if type is notification)'),
      }),
      handler: async (args, _context) => {
        console.log('Create Item Tool', args);

        try {
          // Validate user exists
          const user = mockUsers.get(args.user_id);
          if (!user) {
            throw new Error(`User with ID ${args.user_id} not found`);
          }

          if (args.type === 'task') {
            // Create a new task
            const task: DeepseekTask = {
              id: generateId(),
              title: args.title,
              description: args.description,
              user_id: args.user_id,
              status: 'pending',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            mockTasks.set(task.id, task);

            // Create a notification for the task creation
            const notification: DeepseekNotification = {
              id: generateId(),
              user_id: args.user_id,
              type: 'task_created',
              title: 'New Task Created',
              message: `A new task "${args.title}" has been created for you.`,
              sent_at: new Date().toISOString(),
            };

            mockNotifications.set(notification.id, notification);

            console.log('Task Created', { task, notification });
            return JSON.stringify({
              type: 'task',
              task,
              notification: `Notification sent to ${user.name} (${user.email})`,
            });
          }

          if (args.type === 'notification') {
            // Create a standalone notification
            if (!args.notification_type || !args.notification_message) {
              throw new Error(
                'notification_type and notification_message are required when type is notification'
              );
            }

            const notification: DeepseekNotification = {
              id: generateId(),
              user_id: args.user_id,
              type: args.notification_type,
              title: args.title,
              message: args.notification_message,
              sent_at: new Date().toISOString(),
            };

            mockNotifications.set(notification.id, notification);

            console.log('Notification Created', { notification });
            return JSON.stringify({
              type: 'notification',
              notification,
              sent_to: `${user.name} (${user.email})`,
            });
          }

          throw new Error('Invalid type specified');
        } catch (error) {
          console.log('Create Item Error', { error });
          throw new Error(
            `Failed to create item: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      },
    }),
  }),
});

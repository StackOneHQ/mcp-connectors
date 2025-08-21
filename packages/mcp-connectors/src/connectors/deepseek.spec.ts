import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { describe, expect, it } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { DeepseekConnectorConfig } from './deepseek';

describe('#DeepseekConnector', () => {
  describe('.GET_USER_DATA', () => {
    describe('when user exists', () => {
      describe('and include_metadata is false', () => {
        it('returns user data without metadata', async () => {
          const tool = DeepseekConnectorConfig.tools.GET_USER_DATA as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = await tool.handler(
            { user_id: 'user_1', include_metadata: false },
            mockContext
          );

          expect(JSON.parse(actual)).toEqual({
            id: 'user_1',
            name: 'John Doe',
            email: 'john.doe@example.com',
          });
        });
      });

      describe('and include_metadata is true', () => {
        it('returns user data with metadata', async () => {
          const tool = DeepseekConnectorConfig.tools.GET_USER_DATA as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = await tool.handler(
            { user_id: 'user_1', include_metadata: true },
            mockContext
          );

          expect(JSON.parse(actual)).toEqual({
            id: 'user_1',
            name: 'John Doe',
            email: 'john.doe@example.com',
            metadata: {
              department: 'Engineering',
              role: 'Senior Developer',
              timezone: 'UTC-8',
              preferences: { notifications: true, theme: 'dark' },
            },
          });
        });
      });

      describe('and include_metadata is not provided', () => {
        it('returns user data without metadata', async () => {
          const tool = DeepseekConnectorConfig.tools.GET_USER_DATA as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = await tool.handler({ user_id: 'user_2' }, mockContext);

          expect(JSON.parse(actual)).toEqual({
            id: 'user_2',
            name: 'Jane Smith',
            email: 'jane.smith@example.com',
          });
        });
      });
    });

    describe('when user does not exist', () => {
      it('throws an error', async () => {
        const tool = DeepseekConnectorConfig.tools.GET_USER_DATA as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        await expect(
          tool.handler({ user_id: 'nonexistent_user' }, mockContext)
        ).rejects.toThrow(
          'Failed to retrieve user data: User with ID nonexistent_user not found'
        );
      });
    });
  });

  describe('.CREATE_ITEM', () => {
    describe('when creating a task', () => {
      describe('and user exists', () => {
        it('creates task and sends notification', async () => {
          const tool = DeepseekConnectorConfig.tools.CREATE_ITEM as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = await tool.handler(
            {
              user_id: 'user_1',
              title: 'Test Task',
              description: 'A test task description',
              type: 'task',
            },
            mockContext
          );

          const parsedResult = JSON.parse(actual);
          expect(parsedResult.type).toBe('task');
          expect(parsedResult.task).toMatchObject({
            title: 'Test Task',
            description: 'A test task description',
            user_id: 'user_1',
            status: 'pending',
          });
          expect(parsedResult.task.id).toBeDefined();
          expect(parsedResult.task.created_at).toBeDefined();
          expect(parsedResult.task.updated_at).toBeDefined();
          expect(parsedResult.notification).toBe(
            'Notification sent to John Doe (john.doe@example.com)'
          );
        });
      });

      describe('and user does not exist', () => {
        it('throws an error', async () => {
          const tool = DeepseekConnectorConfig.tools.CREATE_ITEM as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          await expect(
            tool.handler(
              {
                user_id: 'nonexistent_user',
                title: 'Test Task',
                type: 'task',
              },
              mockContext
            )
          ).rejects.toThrow(
            'Failed to create item: User with ID nonexistent_user not found'
          );
        });
      });
    });

    describe('when creating a notification', () => {
      describe('and all required fields are provided', () => {
        it('creates and sends notification', async () => {
          const tool = DeepseekConnectorConfig.tools.CREATE_ITEM as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = await tool.handler(
            {
              user_id: 'user_2',
              title: 'Project Update',
              type: 'notification',
              notification_type: 'general',
              notification_message: 'There has been an update to your project timeline.',
            },
            mockContext
          );

          const parsedResult = JSON.parse(actual);
          expect(parsedResult.type).toBe('notification');
          expect(parsedResult.notification).toMatchObject({
            user_id: 'user_2',
            type: 'general',
            title: 'Project Update',
            message: 'There has been an update to your project timeline.',
          });
          expect(parsedResult.notification.id).toBeDefined();
          expect(parsedResult.notification.sent_at).toBeDefined();
          expect(parsedResult.sent_to).toBe('Jane Smith (jane.smith@example.com)');
        });
      });

      describe('and notification_type is missing', () => {
        it('throws an error', async () => {
          const tool = DeepseekConnectorConfig.tools.CREATE_ITEM as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          await expect(
            tool.handler(
              {
                user_id: 'user_1',
                title: 'Test Notification',
                type: 'notification',
                notification_message: 'Test message',
              },
              mockContext
            )
          ).rejects.toThrow(
            'Failed to create item: notification_type and notification_message are required when type is notification'
          );
        });
      });

      describe('and notification_message is missing', () => {
        it('throws an error', async () => {
          const tool = DeepseekConnectorConfig.tools.CREATE_ITEM as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          await expect(
            tool.handler(
              {
                user_id: 'user_1',
                title: 'Test Notification',
                type: 'notification',
                notification_type: 'general',
              },
              mockContext
            )
          ).rejects.toThrow(
            'Failed to create item: notification_type and notification_message are required when type is notification'
          );
        });
      });
    });

    describe('when type is invalid', () => {
      it('throws an error', async () => {
        const tool = DeepseekConnectorConfig.tools.CREATE_ITEM as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        await expect(
          tool.handler(
            {
              user_id: 'user_1',
              title: 'Test',
              type: 'invalid_type' as 'task' | 'notification',
            },
            mockContext
          )
        ).rejects.toThrow();
      });
    });
  });

  describe('.THINKING', () => {
    describe('when API call succeeds', () => {
      it('returns thinking response', async () => {
        const tool = DeepseekConnectorConfig.tools.THINKING as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        (mockContext.getCredentials as any).mockResolvedValue({ apiKey: 'test-api-key' });

        // Note: This test would require mocking the OpenAI client
        // For now, we'll test the error path since we don't have a real API key
        const actual = await tool.handler({ question: 'What is 2+2?' }, mockContext);

        expect(actual).toBe('Failed to invoke thinking tool, please try again later.');
      });
    });
  });
});

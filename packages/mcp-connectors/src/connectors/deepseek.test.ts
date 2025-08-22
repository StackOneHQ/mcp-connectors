import { describe, expect, test, vi } from 'vitest';
import { DeepseekConnectorConfig } from './deepseek';

describe('DeepseekConnectorConfig', () => {
  test('should have correct basic properties', () => {
    expect(DeepseekConnectorConfig.name).toBe('Deepseek');
    expect(DeepseekConnectorConfig.key).toBe('deepseek');
    expect(DeepseekConnectorConfig.version).toBe('1.0.0');
  });

  test('should have correct credentials schema', () => {
    const credentialsSchema = DeepseekConnectorConfig.credentials;
    const result = credentialsSchema.safeParse({ apiKey: 'test-key' });
    expect(result.success).toBe(true);

    const invalidResult = credentialsSchema.safeParse({});
    expect(invalidResult.success).toBe(false);
  });

  test('should have all required tools', () => {
    const tools = DeepseekConnectorConfig.tools;
    expect(tools).toHaveProperty('THINKING');
    expect(tools).toHaveProperty('deepseek_get_data');
    expect(tools).toHaveProperty('deepseek_create_item');
  });

  describe('deepseek_get_data tool', () => {
    test('should have correct schema', () => {
      const tools = DeepseekConnectorConfig.tools;
      const getDataTool = tools.deepseek_get_data;

      expect(getDataTool.name).toBe('deepseek_get_data');
      expect(getDataTool.description).toContain('Retrieve user profile data');

      // Test valid schema
      const validResult = getDataTool.schema.safeParse({
        user_id: 'test-user-123',
        include_metadata: true,
      });
      expect(validResult.success).toBe(true);

      // Test missing required field
      const invalidResult = getDataTool.schema.safeParse({});
      expect(invalidResult.success).toBe(false);
    });

    test('should handle user data retrieval', async () => {
      const tools = DeepseekConnectorConfig.tools;
      const getDataTool = tools.deepseek_get_data;

      const mockContext = {
        getCredentials: vi.fn().mockResolvedValue({ apiKey: 'test-key' }),
        getSetup: vi.fn(),
        getData: vi.fn(),
        setData: vi.fn(),
        readCache: vi.fn(),
        writeCache: vi.fn(),
      };

      const result = await getDataTool.handler(
        { user_id: 'test-user-123', include_metadata: true },
        mockContext
      );

      expect(typeof result).toBe('string');
      const parsedResult = JSON.parse(result);
      expect(parsedResult).toHaveProperty('id', 'test-user-123');
      expect(parsedResult).toHaveProperty('name');
      expect(parsedResult).toHaveProperty('email');
      expect(parsedResult).toHaveProperty('metadata');
    });

    test('should handle user data retrieval without metadata', async () => {
      const tools = DeepseekConnectorConfig.tools;
      const getDataTool = tools.deepseek_get_data;

      const mockContext = {
        getCredentials: vi.fn().mockResolvedValue({ apiKey: 'test-key' }),
        getSetup: vi.fn(),
        getData: vi.fn(),
        setData: vi.fn(),
        readCache: vi.fn(),
        writeCache: vi.fn(),
      };

      const result = await getDataTool.handler({ user_id: 'test-user-456' }, mockContext);

      const parsedResult = JSON.parse(result);
      expect(parsedResult).toHaveProperty('id', 'test-user-456');
      expect(parsedResult).not.toHaveProperty('metadata');
    });
  });

  describe('deepseek_create_item tool', () => {
    test('should have correct schema', () => {
      const tools = DeepseekConnectorConfig.tools;
      const createItemTool = tools.deepseek_create_item;

      expect(createItemTool.name).toBe('deepseek_create_item');
      expect(createItemTool.description).toContain('Create new project tasks');

      // Test valid schema
      const validResult = createItemTool.schema.safeParse({
        user_id: 'test-user-123',
        title: 'Test Task',
        description: 'Test description',
      });
      expect(validResult.success).toBe(true);

      // Test missing required fields
      const invalidResult = createItemTool.schema.safeParse({
        user_id: 'test-user-123',
      });
      expect(invalidResult.success).toBe(false);
    });

    test('should handle task creation', async () => {
      const tools = DeepseekConnectorConfig.tools;
      const createItemTool = tools.deepseek_create_item;

      const mockContext = {
        getCredentials: vi.fn().mockResolvedValue({ apiKey: 'test-key' }),
        getSetup: vi.fn(),
        getData: vi.fn(),
        setData: vi.fn(),
        readCache: vi.fn(),
        writeCache: vi.fn(),
      };

      const result = await createItemTool.handler(
        {
          user_id: 'test-user-123',
          title: 'Test Task',
          description: 'Test description',
        },
        mockContext
      );

      expect(typeof result).toBe('string');
      const parsedResult = JSON.parse(result);
      expect(parsedResult).toHaveProperty('id');
      expect(parsedResult).toHaveProperty('user_id', 'test-user-123');
      expect(parsedResult).toHaveProperty('title', 'Test Task');
      expect(parsedResult).toHaveProperty('description', 'Test description');
      expect(parsedResult).toHaveProperty('status', 'pending');
      expect(parsedResult).toHaveProperty('created_at');
      expect(parsedResult).toHaveProperty('note');
    });

    test('should handle task creation without description', async () => {
      const tools = DeepseekConnectorConfig.tools;
      const createItemTool = tools.deepseek_create_item;

      const mockContext = {
        getCredentials: vi.fn().mockResolvedValue({ apiKey: 'test-key' }),
        getSetup: vi.fn(),
        getData: vi.fn(),
        setData: vi.fn(),
        readCache: vi.fn(),
        writeCache: vi.fn(),
      };

      const result = await createItemTool.handler(
        {
          user_id: 'test-user-456',
          title: 'Another Test Task',
        },
        mockContext
      );

      const parsedResult = JSON.parse(result);
      expect(parsedResult).toHaveProperty('title', 'Another Test Task');
      expect(parsedResult.description).toBeUndefined();
    });
  });
});

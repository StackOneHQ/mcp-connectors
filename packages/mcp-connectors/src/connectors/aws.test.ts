import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AwsConnectorConfig } from './aws';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock crypto.subtle for AWS signing
global.crypto = {
  subtle: {
    digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
    importKey: vi.fn().mockResolvedValue({}),
    sign: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
  },
} as typeof crypto;

describe('AWS Connector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should have correct connector configuration', () => {
    expect(AwsConnectorConfig.name).toBe('AWS');
    expect(AwsConnectorConfig.key).toBe('aws');
    expect(AwsConnectorConfig.version).toBe('2.0.0');
  });

  test('should have required credentials schema', () => {
    const credentialsSchema = AwsConnectorConfig.credentials;
    expect(credentialsSchema).toBeDefined();

    // Test valid credentials
    const validCredentials = {
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    };
    expect(() => credentialsSchema.parse(validCredentials)).not.toThrow();
  });

  test('should have setup schema with default region', () => {
    const setupSchema = AwsConnectorConfig.setup;
    expect(setupSchema).toBeDefined();

    const defaultSetup = setupSchema.parse({});
    expect(defaultSetup.region).toBe('us-east-1');
  });

  test('should have all required tools', () => {
    const tools = AwsConnectorConfig.tools;
    const expectedTools = [
      'LIST_EC2_INSTANCES',
      'GET_EC2_INSTANCE',
      'LIST_LAMBDA_FUNCTIONS',
      'GET_LAMBDA_FUNCTION',
      'INVOKE_LAMBDA_FUNCTION',
      'GET_CLOUDWATCH_LOGS',
      'LIST_LOG_GROUPS',
      'LIST_ECS_CLUSTERS',
      'LIST_ECS_SERVICES',
      'DESCRIBE_ECS_SERVICES',
      'LIST_ECS_TASKS',
      'GET_COST_AND_USAGE',
    ];

    for (const toolName of expectedTools) {
      expect(tools[toolName]).toBeDefined();
      expect(tools[toolName].name).toBeDefined();
      expect(tools[toolName].description).toBeDefined();
      expect(tools[toolName].schema).toBeDefined();
      expect(tools[toolName].handler).toBeDefined();
    }
  });

  describe('Lambda Tools', () => {
    test('LIST_LAMBDA_FUNCTIONS should work with successful response', async () => {
      const mockResponse = {
        Functions: [
          {
            FunctionName: 'test-function',
            FunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
            Runtime: 'nodejs18.x',
            CodeSize: 1024,
            Timeout: 30,
            MemorySize: 128,
            LastModified: '2023-01-01T00:00:00.000+0000',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
        headers: {
          get: () => 'application/json',
        },
      });

      const tools = AwsConnectorConfig.tools;
      const context = {
        getCredentials: () =>
          Promise.resolve({
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret',
          }),
        getSetup: () => Promise.resolve({ region: 'us-east-1' }),
      };

      const result = await tools.LIST_LAMBDA_FUNCTIONS.handler({}, context);
      expect(result).toContain('test-function');
      expect(mockFetch).toHaveBeenCalled();
    });

    test('INVOKE_LAMBDA_FUNCTION should handle different invocation types', async () => {
      const mockResponse = {
        StatusCode: 200,
        Payload: '{"message": "success"}',
        ExecutedVersion: '$LATEST',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve('{"message": "success"}'),
        headers: {
          get: (name: string) => {
            if (name === 'X-Amz-Executed-Version') return '$LATEST';
            return null;
          },
        },
      });

      const tools = AwsConnectorConfig.tools;
      const context = {
        getCredentials: () =>
          Promise.resolve({
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret',
          }),
        getSetup: () => Promise.resolve({ region: 'us-east-1' }),
      };

      const args = {
        functionName: 'test-function',
        payload: { test: 'data' },
        invocationType: 'RequestResponse' as const,
      };

      const result = await tools.INVOKE_LAMBDA_FUNCTION.handler(args, context);
      expect(result).toContain('StatusCode');
      expect(result).toContain('success');
    });
  });

  describe('CloudWatch Logs Tools', () => {
    test('GET_CLOUDWATCH_LOGS should retrieve log events', async () => {
      const mockResponse = {
        events: [
          {
            timestamp: 1640995200000,
            message: 'Test log message',
            ingestionTime: 1640995200000,
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const tools = AwsConnectorConfig.tools;
      const context = {
        getCredentials: () =>
          Promise.resolve({
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret',
          }),
        getSetup: () => Promise.resolve({ region: 'us-east-1' }),
      };

      const args = {
        logGroupName: '/aws/lambda/test-function',
        startTime: 1640995200000,
        endTime: 1640998800000,
        filterPattern: 'ERROR',
        limit: 50,
      };

      const result = await tools.GET_CLOUDWATCH_LOGS.handler(args, context);
      expect(result).toContain('Test log message');
      expect(result).toContain('timestamp');
    });

    test('LIST_LOG_GROUPS should return log groups', async () => {
      const mockResponse = {
        logGroups: [
          {
            logGroupName: '/aws/lambda/test-function',
            creationTime: 1640995200000,
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const tools = AwsConnectorConfig.tools;
      const context = {
        getCredentials: () =>
          Promise.resolve({
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret',
          }),
        getSetup: () => Promise.resolve({ region: 'us-east-1' }),
      };

      const result = await tools.LIST_LOG_GROUPS.handler({}, context);
      expect(result).toContain('/aws/lambda/test-function');
    });
  });

  describe('ECS Tools', () => {
    test('LIST_ECS_CLUSTERS should return cluster ARNs', async () => {
      const mockResponse = {
        clusterArns: ['arn:aws:ecs:us-east-1:123456789012:cluster/test-cluster'],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const tools = AwsConnectorConfig.tools;
      const context = {
        getCredentials: () =>
          Promise.resolve({
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret',
          }),
        getSetup: () => Promise.resolve({ region: 'us-east-1' }),
      };

      const result = await tools.LIST_ECS_CLUSTERS.handler({}, context);
      expect(result).toContain('test-cluster');
    });

    test('DESCRIBE_ECS_SERVICES should return service details', async () => {
      const mockResponse = {
        services: [
          {
            serviceName: 'test-service',
            serviceArn:
              'arn:aws:ecs:us-east-1:123456789012:service/test-cluster/test-service',
            clusterArn: 'arn:aws:ecs:us-east-1:123456789012:cluster/test-cluster',
            status: 'ACTIVE',
            runningCount: 1,
            pendingCount: 0,
            desiredCount: 1,
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const tools = AwsConnectorConfig.tools;
      const context = {
        getCredentials: () =>
          Promise.resolve({
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret',
          }),
        getSetup: () => Promise.resolve({ region: 'us-east-1' }),
      };

      const args = {
        serviceArns: [
          'arn:aws:ecs:us-east-1:123456789012:service/test-cluster/test-service',
        ],
        clusterName: 'test-cluster',
      };

      const result = await tools.DESCRIBE_ECS_SERVICES.handler(args, context);
      expect(result).toContain('test-service');
      expect(result).toContain('ACTIVE');
    });
  });

  describe('EC2 Tools', () => {
    test('LIST_EC2_INSTANCES should return instances', async () => {
      const mockResponse = {
        reservationSet: [
          {
            instancesSet: [
              {
                InstanceId: 'i-1234567890abcdef0',
                InstanceType: 't2.micro',
                State: {
                  Name: 'running',
                  Code: 16,
                },
                LaunchTime: '2023-01-01T00:00:00.000Z',
              },
            ],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => 'text/xml',
        },
        text: () =>
          Promise.resolve(`
          <DescribeInstancesResponse>
            <reservationSet>
              <item>
                <instancesSet>
                  <item>
                    <instanceId>i-1234567890abcdef0</instanceId>
                    <instanceType>t2.micro</instanceType>
                    <state>
                      <name>running</name>
                      <code>16</code>
                    </state>
                    <launchTime>2023-01-01T00:00:00.000Z</launchTime>
                  </item>
                </instancesSet>
              </item>
            </reservationSet>
          </DescribeInstancesResponse>
        `),
      });

      const tools = AwsConnectorConfig.tools;
      const context = {
        getCredentials: () =>
          Promise.resolve({
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret',
          }),
        getSetup: () => Promise.resolve({ region: 'us-east-1' }),
      };

      const result = await tools.LIST_EC2_INSTANCES.handler({}, context);
      expect(result).toBeDefined();
    });
  });

  describe('Cost Explorer Tools', () => {
    test('GET_COST_AND_USAGE should return cost data', async () => {
      const mockResponse = {
        ResultsByTime: [
          {
            TimePeriod: {
              Start: '2023-01-01',
              End: '2023-01-02',
            },
            Total: {
              BlendedCost: {
                Amount: '1.23',
                Unit: 'USD',
              },
            },
            Groups: [],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const tools = AwsConnectorConfig.tools;
      const context = {
        getCredentials: () =>
          Promise.resolve({
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret',
          }),
        getSetup: () => Promise.resolve({ region: 'us-east-1' }),
      };

      const args = {
        startTime: '2023-01-01',
        endTime: '2023-01-31',
        granularity: 'DAILY' as const,
      };

      const result = await tools.GET_COST_AND_USAGE.handler(args, context);
      expect(result).toContain('ResultsByTime');
      expect(result).toContain('1.23');
    });
  });

  describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: () => Promise.resolve('Access denied'),
      });

      const tools = AwsConnectorConfig.tools;
      const context = {
        getCredentials: () =>
          Promise.resolve({
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret',
          }),
        getSetup: () => Promise.resolve({ region: 'us-east-1' }),
      };

      const result = await tools.LIST_LAMBDA_FUNCTIONS.handler({}, context);
      expect(result).toContain('Failed to list Lambda functions');
    });

    test('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const tools = AwsConnectorConfig.tools;
      const context = {
        getCredentials: () =>
          Promise.resolve({
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret',
          }),
        getSetup: () => Promise.resolve({ region: 'us-east-1' }),
      };

      const result = await tools.LIST_EC2_INSTANCES.handler({}, context);
      expect(result).toContain('Failed to list EC2 instances');
    });
  });

  describe('Tool Schemas', () => {
    test('INVOKE_LAMBDA_FUNCTION schema should validate correctly', () => {
      const tools = AwsConnectorConfig.tools;
      const schema = tools.INVOKE_LAMBDA_FUNCTION.schema;

      // Valid input
      const validInput = {
        functionName: 'test-function',
        payload: { key: 'value' },
        invocationType: 'RequestResponse' as const,
      };
      expect(() => schema.parse(validInput)).not.toThrow();

      // Default invocation type
      const inputWithDefaults = schema.parse({
        functionName: 'test-function',
      });
      expect(inputWithDefaults.invocationType).toBe('RequestResponse');
    });

    test('GET_CLOUDWATCH_LOGS schema should validate correctly', () => {
      const tools = AwsConnectorConfig.tools;
      const schema = tools.GET_CLOUDWATCH_LOGS.schema;

      const validInput = {
        logGroupName: '/aws/lambda/test',
        startTime: 1640995200000,
        endTime: 1640998800000,
        filterPattern: 'ERROR',
        limit: 50,
      };
      expect(() => schema.parse(validInput)).not.toThrow();

      // Test defaults
      const inputWithDefaults = schema.parse({
        logGroupName: '/aws/lambda/test',
      });
      expect(inputWithDefaults.limit).toBe(100);
    });
  });
});


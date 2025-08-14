import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  sessionToken?: string;
}

interface EC2Response {
  reservationSet?: Array<{
    instancesSet?: EC2Instance[];
  }>;
}

interface S3ListBucketsResponse {
  ListAllMyBucketsResult?: {
    Buckets?: {
      Bucket?: S3Bucket[];
    };
  };
}

interface S3ListObjectsResponse {
  ListBucketResult?: {
    Contents?: S3Object[];
  };
}

interface LambdaListResponse {
  Functions?: LambdaFunction[];
}

interface LambdaGetResponse {
  Configuration: LambdaFunction;
}

interface CloudWatchResponse {
  GetMetricStatisticsResult?: {
    Datapoints?: {
      member?: unknown[];
    };
  };
}

interface CostExplorerResponse {
  ResultsByTime?: unknown[];
}

interface EC2Instance {
  InstanceId: string;
  InstanceType: string;
  State: {
    Name: string;
    Code: number;
  };
  PublicIpAddress?: string;
  PrivateIpAddress?: string;
  LaunchTime: string;
  Tags?: Array<{ Key: string; Value: string }>;
}

interface S3Bucket {
  Name: string;
  CreationDate: string;
}

interface S3Object {
  Key: string;
  LastModified: string;
  Size: number;
  StorageClass: string;
}

interface LambdaFunction {
  FunctionName: string;
  FunctionArn: string;
  Runtime: string;
  CodeSize: number;
  Description?: string;
  Timeout: number;
  MemorySize: number;
  LastModified: string;
  Environment?: {
    Variables?: Record<string, string>;
  };
}

class AwsClient {
  private region: string;
  private credentials: AwsCredentials;

  constructor(credentials: AwsCredentials) {
    this.credentials = credentials;
    this.region = credentials.region;
  }

  private async makeAwsRequest(
    service: string,
    action: string,
    params: Record<string, unknown> = {},
    method = 'POST'
  ): Promise<unknown> {
    const maxRetries = 3;
    const baseDelay = 1000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.executeAwsRequest(service, action, params, method);
        return result;
      } catch (error) {
        if (attempt === maxRetries || !this.isRetryableError(error)) {
          throw error;
        }

        const delay = baseDelay * 2 ** attempt + Math.random() * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  private isRetryableError(error: unknown): boolean {
    if (
      error instanceof Error &&
      (error.name === 'NetworkError' || error.name === 'TimeoutError')
    ) {
      return true;
    }

    if (error instanceof Error && 'status' in error && typeof error.status === 'number') {
      return error.status >= 500 || error.status === 429;
    }

    return false;
  }

  private async executeAwsRequest(
    service: string,
    action: string,
    params: Record<string, unknown> = {},
    method = 'POST'
  ): Promise<unknown> {
    const endpoint = this.getServiceEndpoint(service);
    const headers = await this.getServiceHeaders(service, action);
    const body = this.getRequestBody(service, params, method);

    const signedRequest = await this.signRequest(
      method,
      endpoint,
      headers,
      body,
      service
    );

    const response = await fetch(signedRequest.url, {
      method: method,
      headers: signedRequest.headers,
      body: body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw await this.handleAwsError(response, errorText, service);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }
    if (contentType.includes('text/xml') || contentType.includes('application/xml')) {
      return this.parseXmlResponse(await response.text());
    }
    return response.text();
  }

  private getServiceEndpoint(service: string): string {
    const serviceMappings: Record<string, string> = {
      ec2: `https://ec2.${this.region}.amazonaws.com`,
      s3: `https://s3.${this.region}.amazonaws.com`,
      lambda: `https://lambda.${this.region}.amazonaws.com`,
      monitoring: `https://monitoring.${this.region}.amazonaws.com`,
      ce: 'https://ce.us-east-1.amazonaws.com', // Cost Explorer is always us-east-1
    };

    return serviceMappings[service] || `https://${service}.${this.region}.amazonaws.com`;
  }

  private getServiceHeaders(service: string, action: string): Record<string, string> {
    const headers: Record<string, string> = {
      Host: `${service}.${this.region}.amazonaws.com`,
      'X-Amz-Date': new Date().toISOString().replace(/[:\-]|\.\d{3}/g, ''),
    };

    if (this.credentials.sessionToken) {
      headers['X-Amz-Security-Token'] = this.credentials.sessionToken;
    }

    // Service-specific headers
    switch (service) {
      case 'ec2':
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        break;
      case 'lambda':
        headers['Content-Type'] = 'application/x-amz-json-1.0';
        break;
      case 'monitoring':
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        break;
      case 'ce':
        headers['Content-Type'] = 'application/x-amz-json-1.1';
        headers['X-Amz-Target'] = `AWSInsightsIndexService.${action}`;
        break;
      case 's3':
        headers['Content-Type'] = 'application/xml';
        break;
      default:
        headers['Content-Type'] = 'application/x-amz-json-1.1';
        headers['X-Amz-Target'] = `${service}.${action}`;
    }

    return headers;
  }

  private getRequestBody(
    service: string,
    params: Record<string, unknown>,
    method: string
  ): string | undefined {
    if (method === 'GET') {
      return undefined;
    }

    switch (service) {
      case 'ec2':
      case 'monitoring':
        return this.encodeFormData(params);
      case 's3':
        return (params.body as string) || '';
      default:
        return JSON.stringify(params);
    }
  }

  private encodeFormData(params: Record<string, unknown>): string {
    const formData = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          formData.append(`${key}.${index + 1}`, String(item));
        });
      } else {
        formData.append(key, String(value));
      }
    }
    return formData.toString();
  }

  private async signRequest(
    method: string,
    endpoint: string,
    headers: Record<string, string>,
    body: string | undefined,
    service: string
  ): Promise<{ url: string; headers: Record<string, string> }> {
    const url = new URL(endpoint);
    const path = url.pathname;
    const queryString = url.search.slice(1);

    const timestamp = headers['X-Amz-Date'];
    if (!timestamp) {
      throw new Error('X-Amz-Date header is required');
    }
    const date = timestamp.slice(0, 8);

    // Create canonical request
    const canonicalHeaders = Object.entries(headers)
      .sort(([a], [b]) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .map(([key, value]) => `${key.toLowerCase()}:${value.trim()}`)
      .join('\n');

    const signedHeaders = Object.keys(headers)
      .map((key) => key.toLowerCase())
      .sort()
      .join(';');

    const payloadHash = await this.sha256(body || '');

    const canonicalRequest = [
      method,
      path,
      queryString,
      canonicalHeaders,
      '',
      signedHeaders,
      payloadHash,
    ].join('\n');

    // Create string to sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${date}/${this.region}/${service}/aws4_request`;
    const stringToSign = [
      algorithm,
      timestamp,
      credentialScope,
      await this.sha256(canonicalRequest),
    ].join('\n');

    // Calculate signature
    const signature = await this.calculateSignature(stringToSign, date, service);

    // Create authorization header
    const authorizationHeader = `${algorithm} Credential=${this.credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return {
      url: endpoint,
      headers: {
        ...headers,
        Authorization: authorizationHeader,
      },
    };
  }

  private async calculateSignature(
    stringToSign: string,
    date: string,
    service: string
  ): Promise<string> {
    const kDate = await this.hmacSha256(`AWS4${this.credentials.secretAccessKey}`, date);
    const kRegion = await this.hmacSha256(kDate, this.region);
    const kService = await this.hmacSha256(kRegion, service);
    const kSigning = await this.hmacSha256(kService, 'aws4_request');

    const signature = await this.hmacSha256(kSigning, stringToSign);
    return this.toHex(signature);
  }

  private async sha256(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return this.toHex(hashBuffer);
  }

  private async hmacSha256(
    key: string | ArrayBuffer,
    data: string
  ): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const keyBuffer = typeof key === 'string' ? encoder.encode(key) : key;
    const dataBuffer = encoder.encode(data);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    return crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
  }

  private toHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  private async handleAwsError(
    response: Response,
    errorText: string,
    service: string
  ): Promise<Error> {
    try {
      const contentType = response.headers.get('content-type') || '';
      let errorInfo: Record<string, unknown> = {};

      if (contentType.includes('application/json')) {
        errorInfo = JSON.parse(errorText);
      } else if (contentType.includes('xml')) {
        errorInfo = this.parseXmlResponse(errorText);
      } else {
        errorInfo = { message: errorText };
      }

      const errorCode =
        (errorInfo.code as string) ||
        (errorInfo.Code as string) ||
        (errorInfo.__type as string) ||
        'UnknownError';
      const errorMessage =
        (errorInfo.message as string) ||
        (errorInfo.Message as string) ||
        (errorInfo.error as string) ||
        errorText;

      const error = new Error(
        `AWS ${service} API error (${response.status}): ${errorCode} - ${errorMessage}`
      );
      (error as Error & { status?: number }).status = response.status;
      (error as Error & { code?: string }).code = errorCode;
      (error as Error & { service?: string }).service = service;

      return error;
    } catch (_parseError) {
      const error = new Error(
        `AWS ${service} API error (${response.status}): ${response.statusText}`
      );
      (error as Error & { status?: number }).status = response.status;
      (error as Error & { service?: string }).service = service;
      return error;
    }
  }

  private parseXmlResponse(xml: string): Record<string, unknown> {
    // Simple regex-based XML parser for basic AWS responses
    const parseXmlString = (xmlStr: string): Record<string, unknown> => {
      const obj: Record<string, unknown> = {};
      const tagRegex = /<([^>\/\s]+)(?:[^>]*)>([^<]*(?:<(?!\1[>\s])[^<]*)*)<\/\1>/g;
      const selfClosingRegex = /<([^>\/\s]+)(?:[^>]*)\s*\/>/g;

      let match: RegExpExecArray | null;

      // Handle self-closing tags
      match = selfClosingRegex.exec(xmlStr);
      while (match !== null) {
        const key = match[1];
        if (key) {
          obj[key] = '';
        }
        match = selfClosingRegex.exec(xmlStr);
      }

      // Handle regular tags
      tagRegex.lastIndex = 0;
      match = tagRegex.exec(xmlStr);
      while (match !== null) {
        const key = match[1];
        const rawContent = match[2];

        if (key && rawContent !== undefined) {
          const content = rawContent.trim();

          // Check if content contains nested XML
          if (content.includes('<')) {
            const nestedValue = parseXmlString(content);
            const currentValue = obj[key];
            if (currentValue !== undefined) {
              if (Array.isArray(currentValue)) {
                currentValue.push(nestedValue);
              } else {
                obj[key] = [currentValue, nestedValue];
              }
            } else {
              obj[key] = nestedValue;
            }
          } else {
            const currentValue = obj[key];
            if (currentValue !== undefined) {
              if (Array.isArray(currentValue)) {
                currentValue.push(content);
              } else {
                obj[key] = [currentValue, content];
              }
            } else {
              obj[key] = content;
            }
          }
        }
        match = tagRegex.exec(xmlStr);
      }

      return obj;
    };

    return parseXmlString(xml);
  }

  async listEC2Instances(): Promise<EC2Instance[]> {
    try {
      const result = (await this.makeAwsRequest('ec2', 'DescribeInstances', {
        Action: 'DescribeInstances',
        Version: '2016-11-15',
      })) as EC2Response;

      const instances: EC2Instance[] = [];
      if (result.reservationSet) {
        for (const reservation of result.reservationSet) {
          if (reservation.instancesSet) {
            instances.push(...reservation.instancesSet);
          }
        }
      }
      return instances;
    } catch (error) {
      throw new Error(
        `Failed to list EC2 instances: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getEC2Instance(instanceId: string): Promise<EC2Instance> {
    try {
      const result = (await this.makeAwsRequest('ec2', 'DescribeInstances', {
        Action: 'DescribeInstances',
        Version: '2016-11-15',
        'InstanceId.1': instanceId,
      })) as EC2Response;

      if (result.reservationSet?.[0]?.instancesSet?.[0]) {
        return result.reservationSet[0].instancesSet[0];
      }
      throw new Error('Instance not found');
    } catch (error) {
      throw new Error(
        `Failed to get EC2 instance: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async listS3Buckets(): Promise<S3Bucket[]> {
    try {
      const result = (await this.makeAwsRequest(
        's3',
        'ListBuckets',
        {},
        'GET'
      )) as S3ListBucketsResponse;
      return result.ListAllMyBucketsResult?.Buckets?.Bucket || [];
    } catch (error) {
      throw new Error(
        `Failed to list S3 buckets: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async listS3Objects(
    bucketName: string,
    prefix?: string,
    maxKeys = 100
  ): Promise<S3Object[]> {
    try {
      const endpoint = `https://${bucketName}.s3.${this.region}.amazonaws.com`;
      const queryParams = new URLSearchParams();
      queryParams.append('list-type', '2');
      queryParams.append('max-keys', maxKeys.toString());

      if (prefix) {
        queryParams.append('prefix', prefix);
      }

      const url = `${endpoint}?${queryParams.toString()}`;
      const headers = await this.getServiceHeaders('s3', 'ListObjectsV2');
      const signedRequest = await this.signRequest('GET', url, headers, undefined, 's3');

      const response = await fetch(signedRequest.url, {
        method: 'GET',
        headers: signedRequest.headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw await this.handleAwsError(response, errorText, 's3');
      }

      const xmlText = await response.text();
      const result = this.parseXmlResponse(xmlText) as S3ListObjectsResponse;
      return result.ListBucketResult?.Contents || [];
    } catch (error) {
      throw new Error(
        `Failed to list S3 objects: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async listLambdaFunctions(): Promise<LambdaFunction[]> {
    try {
      const result = (await this.makeAwsRequest(
        'lambda',
        'ListFunctions',
        {}
      )) as LambdaListResponse;
      return result.Functions || [];
    } catch (error) {
      throw new Error(
        `Failed to list Lambda functions: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getLambdaFunction(functionName: string): Promise<LambdaFunction> {
    try {
      const endpoint = `https://lambda.${this.region}.amazonaws.com/2015-03-31/functions/${encodeURIComponent(functionName)}`;
      const headers = await this.getServiceHeaders('lambda', 'GetFunction');
      const signedRequest = await this.signRequest(
        'GET',
        endpoint,
        headers,
        undefined,
        'lambda'
      );

      const response = await fetch(signedRequest.url, {
        method: 'GET',
        headers: signedRequest.headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw await this.handleAwsError(response, errorText, 'lambda');
      }

      const result = (await response.json()) as LambdaGetResponse;
      return result.Configuration;
    } catch (error) {
      throw new Error(
        `Failed to get Lambda function: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async invokeLambdaFunction(
    functionName: string,
    payload?: Record<string, unknown>
  ): Promise<unknown> {
    try {
      const endpoint = `https://lambda.${this.region}.amazonaws.com/2015-03-31/functions/${encodeURIComponent(functionName)}/invocations`;
      const body = payload ? JSON.stringify(payload) : '';
      const headers = await this.getServiceHeaders('lambda', 'Invoke');
      headers['X-Amz-Invocation-Type'] = 'RequestResponse';

      const signedRequest = await this.signRequest(
        'POST',
        endpoint,
        headers,
        body,
        'lambda'
      );

      const response = await fetch(signedRequest.url, {
        method: 'POST',
        headers: signedRequest.headers,
        body: body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw await this.handleAwsError(response, errorText, 'lambda');
      }

      return response.json();
    } catch (error) {
      throw new Error(
        `Failed to invoke Lambda function: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getCloudWatchMetrics(
    namespace: string,
    metricName: string,
    dimensions?: Array<{ Name: string; Value: string }>,
    startTime?: string,
    endTime?: string
  ): Promise<unknown> {
    try {
      const params: Record<string, unknown> = {
        Action: 'GetMetricStatistics',
        Version: '2010-08-01',
        Namespace: namespace,
        MetricName: metricName,
        StartTime: startTime || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        EndTime: endTime || new Date().toISOString(),
        Period: 300,
        'Statistics.member.1': 'Average',
        'Statistics.member.2': 'Maximum',
        'Statistics.member.3': 'Sum',
      };

      if (dimensions) {
        dimensions.forEach((dimension, index) => {
          params[`Dimensions.member.${index + 1}.Name`] = dimension.Name;
          params[`Dimensions.member.${index + 1}.Value`] = dimension.Value;
        });
      }

      const result = (await this.makeAwsRequest(
        'monitoring',
        'GetMetricStatistics',
        params
      )) as CloudWatchResponse;
      return result.GetMetricStatisticsResult?.Datapoints?.member || [];
    } catch (error) {
      throw new Error(
        `Failed to get CloudWatch metrics: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getCostAndUsage(
    startTime?: string,
    endTime?: string,
    granularity = 'DAILY'
  ): Promise<unknown> {
    try {
      const params = {
        TimePeriod: {
          Start:
            startTime ||
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          End: endTime || new Date().toISOString().split('T')[0],
        },
        Granularity: granularity,
        Metrics: ['BlendedCost', 'UsageQuantity'],
        GroupBy: [
          {
            Type: 'DIMENSION',
            Key: 'SERVICE',
          },
        ],
      };

      const result = (await this.makeAwsRequest(
        'ce',
        'GetCostAndUsage',
        params
      )) as CostExplorerResponse;
      return result.ResultsByTime || [];
    } catch (error) {
      throw new Error(
        `Failed to get cost and usage: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

export const AwsConnectorConfig = mcpConnectorConfig({
  name: 'AWS',
  key: 'aws',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/amazon-redshift/filled/svg',
  credentials: z.object({
    accessKeyId: z.string().describe('AWS Access Key ID :: AKIAIOSFODNN7EXAMPLE'),
    secretAccessKey: z
      .string()
      .describe('AWS Secret Access Key :: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'),
    sessionToken: z
      .string()
      .optional()
      .describe(
        'AWS Session Token (for temporary credentials) :: AQoDYXdzEJr...<remainder of session token>'
      ),
  }),
  setup: z.object({
    region: z
      .string()
      .default('us-east-1')
      .describe('AWS region (e.g., us-east-1, eu-west-1) :: us-east-1'),
  }),
  examplePrompt:
    'List all my EC2 instances in the us-east-1 region, check my S3 buckets, and show me the cost breakdown for the last 30 days.',
  tools: (tool) => ({
    LIST_EC2_INSTANCES: tool({
      name: 'aws_list_ec2_instances',
      description: 'List all EC2 instances in the specified region',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { accessKeyId, secretAccessKey, sessionToken } =
            await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new AwsClient({
            accessKeyId,
            secretAccessKey,
            region,
            sessionToken,
          });
          const instances = await client.listEC2Instances();
          return JSON.stringify(instances, null, 2);
        } catch (error) {
          return `Failed to list EC2 instances: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_EC2_INSTANCE: tool({
      name: 'aws_get_ec2_instance',
      description: 'Get details of a specific EC2 instance',
      schema: z.object({
        instanceId: z.string().describe('The EC2 instance ID'),
      }),
      handler: async (args, context) => {
        try {
          const { accessKeyId, secretAccessKey, sessionToken } =
            await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new AwsClient({
            accessKeyId,
            secretAccessKey,
            region,
            sessionToken,
          });
          const instance = await client.getEC2Instance(args.instanceId);
          return JSON.stringify(instance, null, 2);
        } catch (error) {
          return `Failed to get EC2 instance: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_S3_BUCKETS: tool({
      name: 'aws_list_s3_buckets',
      description: 'List all S3 buckets in the account',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { accessKeyId, secretAccessKey, sessionToken } =
            await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new AwsClient({
            accessKeyId,
            secretAccessKey,
            region,
            sessionToken,
          });
          const buckets = await client.listS3Buckets();
          return JSON.stringify(buckets, null, 2);
        } catch (error) {
          return `Failed to list S3 buckets: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_S3_OBJECTS: tool({
      name: 'aws_list_s3_objects',
      description: 'List objects in an S3 bucket',
      schema: z.object({
        bucketName: z.string().describe('The S3 bucket name'),
        prefix: z.string().optional().describe('Filter objects by prefix'),
        maxKeys: z.number().default(100).describe('Maximum number of objects to return'),
      }),
      handler: async (args, context) => {
        try {
          const { accessKeyId, secretAccessKey, sessionToken } =
            await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new AwsClient({
            accessKeyId,
            secretAccessKey,
            region,
            sessionToken,
          });
          const objects = await client.listS3Objects(
            args.bucketName,
            args.prefix,
            args.maxKeys
          );
          return JSON.stringify(objects, null, 2);
        } catch (error) {
          return `Failed to list S3 objects: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_LAMBDA_FUNCTIONS: tool({
      name: 'aws_list_lambda_functions',
      description: 'List all Lambda functions in the specified region',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { accessKeyId, secretAccessKey, sessionToken } =
            await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new AwsClient({
            accessKeyId,
            secretAccessKey,
            region,
            sessionToken,
          });
          const functions = await client.listLambdaFunctions();
          return JSON.stringify(functions, null, 2);
        } catch (error) {
          return `Failed to list Lambda functions: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_LAMBDA_FUNCTION: tool({
      name: 'aws_get_lambda_function',
      description: 'Get details of a specific Lambda function',
      schema: z.object({
        functionName: z.string().describe('The Lambda function name or ARN'),
      }),
      handler: async (args, context) => {
        try {
          const { accessKeyId, secretAccessKey, sessionToken } =
            await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new AwsClient({
            accessKeyId,
            secretAccessKey,
            region,
            sessionToken,
          });
          const func = await client.getLambdaFunction(args.functionName);
          return JSON.stringify(func, null, 2);
        } catch (error) {
          return `Failed to get Lambda function: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    INVOKE_LAMBDA_FUNCTION: tool({
      name: 'aws_invoke_lambda_function',
      description: 'Invoke a Lambda function with optional payload',
      schema: z.object({
        functionName: z.string().describe('The Lambda function name or ARN'),
        payload: z
          .record(z.any())
          .optional()
          .describe('JSON payload to send to the function'),
      }),
      handler: async (args, context) => {
        try {
          const { accessKeyId, secretAccessKey, sessionToken } =
            await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new AwsClient({
            accessKeyId,
            secretAccessKey,
            region,
            sessionToken,
          });
          const result = await client.invokeLambdaFunction(
            args.functionName,
            args.payload
          );
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to invoke Lambda function: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_CLOUDWATCH_METRICS: tool({
      name: 'aws_get_cloudwatch_metrics',
      description: 'Get CloudWatch metrics for monitoring',
      schema: z.object({
        namespace: z
          .string()
          .describe('CloudWatch namespace (e.g., AWS/EC2, AWS/Lambda)'),
        metricName: z.string().describe('Name of the metric to retrieve'),
        dimensions: z
          .array(
            z.object({
              Name: z.string(),
              Value: z.string(),
            })
          )
          .optional()
          .describe('Metric dimensions for filtering'),
        startTime: z.string().optional().describe('Start time (ISO 8601 format)'),
        endTime: z.string().optional().describe('End time (ISO 8601 format)'),
      }),
      handler: async (args, context) => {
        try {
          const { accessKeyId, secretAccessKey, sessionToken } =
            await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new AwsClient({
            accessKeyId,
            secretAccessKey,
            region,
            sessionToken,
          });
          const metrics = await client.getCloudWatchMetrics(
            args.namespace,
            args.metricName,
            args.dimensions,
            args.startTime,
            args.endTime
          );
          return JSON.stringify(metrics, null, 2);
        } catch (error) {
          return `Failed to get CloudWatch metrics: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_COST_AND_USAGE: tool({
      name: 'aws_get_cost_and_usage',
      description: 'Get AWS cost and usage information',
      schema: z.object({
        startTime: z.string().optional().describe('Start date (YYYY-MM-DD format)'),
        endTime: z.string().optional().describe('End date (YYYY-MM-DD format)'),
        granularity: z
          .enum(['DAILY', 'MONTHLY', 'HOURLY'])
          .default('DAILY')
          .describe('Time granularity'),
      }),
      handler: async (args, context) => {
        try {
          const { accessKeyId, secretAccessKey, sessionToken } =
            await context.getCredentials();
          const { region } = await context.getSetup();
          const client = new AwsClient({
            accessKeyId,
            secretAccessKey,
            region,
            sessionToken,
          });
          const costData = await client.getCostAndUsage(
            args.startTime,
            args.endTime,
            args.granularity
          );
          return JSON.stringify(costData, null, 2);
        } catch (error) {
          return `Failed to get cost and usage: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface LogfireException {
  file_path: string;
  exception_count: number;
  first_occurrence: string;
  last_occurrence: string;
  exception_types: string[];
  sample_messages: string[];
}

interface LogfireTrace {
  trace_id: string;
  span_id: string;
  timestamp: string;
  message: string;
  level: string;
  service_name?: string;
  attributes?: Record<string, unknown>;
  exception_type?: string;
  exception_message?: string;
  stack_trace?: string;
}

interface LogfireQueryResult {
  columns: Array<{
    name: string;
    type: string;
  }>;
  rows: unknown[][];
  total_rows: number;
}

interface LogfireRecord {
  trace_id: string;
  span_id: string;
  timestamp: string;
  observed_timestamp: string;
  severity_text: string;
  severity_number: number;
  body: string;
  attributes: Record<string, unknown>;
  resource_attributes: Record<string, unknown>;
  scope_name?: string;
  scope_version?: string;
}

class LogfireClient {
  private headers: { Authorization: string; 'Content-Type': string };
  private baseUrl = 'https://logfire-api.pydantic.dev';

  constructor(readToken: string) {
    this.headers = {
      Authorization: `Bearer ${readToken}`,
      'Content-Type': 'application/json',
    };
  }

  async findExceptions(timeRange = '24h', limit = 50): Promise<LogfireException[]> {
    const query = `
      SELECT 
        attributes['code.filepath'] as file_path,
        COUNT(*) as exception_count,
        MIN(timestamp) as first_occurrence,
        MAX(timestamp) as last_occurrence,
        groupArray(DISTINCT attributes['exception.type']) as exception_types,
        groupArray(DISTINCT body) as sample_messages
      FROM records 
      WHERE 
        timestamp >= now() - INTERVAL '${timeRange}'
        AND attributes['exception.type'] IS NOT NULL
      GROUP BY file_path
      ORDER BY exception_count DESC
      LIMIT ${limit}
    `;

    return (await this.arbitraryQuery(query)) as LogfireException[];
  }

  async findExceptionsInFile(
    filePath: string,
    timeRange = '24h',
    limit = 50
  ): Promise<LogfireTrace[]> {
    const query = `
      SELECT 
        trace_id,
        span_id,
        timestamp,
        body as message,
        severity_text as level,
        resource_attributes['service.name'] as service_name,
        attributes,
        attributes['exception.type'] as exception_type,
        attributes['exception.message'] as exception_message,
        attributes['exception.stacktrace'] as stack_trace
      FROM records 
      WHERE 
        timestamp >= now() - INTERVAL '${timeRange}'
        AND attributes['code.filepath'] = '${filePath}'
        AND attributes['exception.type'] IS NOT NULL
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `;

    return (await this.arbitraryQuery(query)) as LogfireTrace[];
  }

  async arbitraryQuery(query: string): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/v1/query`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        sql: query,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Logfire API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result = (await response.json()) as { data?: unknown };
    return result.data || result;
  }

  async getLogfireRecordsSchema(): Promise<LogfireQueryResult> {
    const query = `
      DESCRIBE records
    `;

    return (await this.arbitraryQuery(query)) as LogfireQueryResult;
  }

  async searchRecords(
    searchTerm: string,
    timeRange = '24h',
    limit = 50,
    severityLevel?: string
  ): Promise<LogfireRecord[]> {
    let query = `
      SELECT 
        trace_id,
        span_id,
        timestamp,
        observed_timestamp,
        severity_text,
        severity_number,
        body,
        attributes,
        resource_attributes,
        scope_name,
        scope_version
      FROM records 
      WHERE 
        timestamp >= now() - INTERVAL '${timeRange}'
        AND (
          body ILIKE '%${searchTerm}%' 
          OR toString(attributes) ILIKE '%${searchTerm}%'
          OR toString(resource_attributes) ILIKE '%${searchTerm}%'
        )
    `;

    if (severityLevel) {
      query += ` AND severity_text = '${severityLevel}'`;
    }

    query += ` ORDER BY timestamp DESC LIMIT ${limit}`;

    return (await this.arbitraryQuery(query)) as LogfireRecord[];
  }

  async getServiceMetrics(serviceName?: string, timeRange = '24h'): Promise<unknown> {
    let query = `
      SELECT 
        resource_attributes['service.name'] as service_name,
        COUNT(*) as total_records,
        COUNT(DISTINCT trace_id) as unique_traces,
        countIf(severity_text = 'ERROR') as error_count,
        countIf(severity_text = 'WARN') as warning_count,
        countIf(severity_text = 'INFO') as info_count,
        countIf(attributes['exception.type'] IS NOT NULL) as exception_count
      FROM records 
      WHERE timestamp >= now() - INTERVAL '${timeRange}'
    `;

    if (serviceName) {
      query += ` AND resource_attributes['service.name'] = '${serviceName}'`;
    }

    query += ' GROUP BY service_name ORDER BY total_records DESC';

    return this.arbitraryQuery(query);
  }

  async getTraceDetails(traceId: string): Promise<LogfireRecord[]> {
    const query = `
      SELECT 
        trace_id,
        span_id,
        timestamp,
        observed_timestamp,
        severity_text,
        severity_number,
        body,
        attributes,
        resource_attributes,
        scope_name,
        scope_version
      FROM records 
      WHERE trace_id = '${traceId}'
      ORDER BY timestamp ASC
    `;

    return (await this.arbitraryQuery(query)) as LogfireRecord[];
  }

  async getPerformanceMetrics(timeRange = '1h', serviceName?: string): Promise<unknown> {
    let query = `
      SELECT 
        toStartOfMinute(timestamp) as time_bucket,
        COUNT(*) as requests_per_minute,
        avg(toFloat64OrNull(attributes['duration'])) as avg_duration_ms,
        quantile(0.95)(toFloat64OrNull(attributes['duration'])) as p95_duration_ms,
        countIf(severity_text = 'ERROR') as error_rate
      FROM records 
      WHERE 
        timestamp >= now() - INTERVAL '${timeRange}'
        AND attributes['duration'] IS NOT NULL
    `;

    if (serviceName) {
      query += ` AND resource_attributes['service.name'] = '${serviceName}'`;
    }

    query += ' GROUP BY time_bucket ORDER BY time_bucket DESC';

    return this.arbitraryQuery(query);
  }
}

export const LogfireConnectorConfig = mcpConnectorConfig({
  name: 'Pydantic Logfire',
  key: 'pydantic_logfire',
  logo: 'https://stackone-logos.com/api/pydantic-logfire/filled/svg',
  version: '1.0.0',
  credentials: z.object({
    readToken: z
      .string()
      .describe(
        'Logfire read token from your project dashboard :: lgf_read_1234567890abcdefghijklmnopqrstuv :: https://logfire-pydantic.readthedocs.io/en/latest/getting-started/authentication.html :: https://logfire.pydantic.dev/docs/how-to-guides/query-api/#how-to-create-a-read-token'
      ),
  }),
  setup: z.object({}),
  description:
    'Logfire is a platform for monitoring and observability based on OpenTelemetry data. Logfire is made by the Pydantic team.',
  examplePrompt:
    'Find all exceptions from the last 24 hours, show me detailed traces for errors in my main.py file, and get performance metrics for my authentication service.',
  tools: (tool) => ({
    FIND_EXCEPTIONS: tool({
      name: 'pydantic_logfire_find_exceptions',
      description: 'Get exception counts grouped by file over a time range',
      schema: z.object({
        timeRange: z
          .string()
          .default('24h')
          .describe('Time range (e.g., "1h", "24h", "7d")'),
        limit: z.number().default(50).describe('Maximum number of files to return'),
      }),
      handler: async (args, context) => {
        try {
          const { readToken } = await context.getCredentials();
          const client = new LogfireClient(readToken);
          const exceptions = await client.findExceptions(args.timeRange, args.limit);
          return JSON.stringify(exceptions, null, 2);
        } catch (error) {
          return `Failed to find exceptions: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    FIND_EXCEPTIONS_IN_FILE: tool({
      name: 'pydantic_logfire_find_exceptions_in_file',
      description: 'Get detailed trace information for exceptions in a specific file',
      schema: z.object({
        filePath: z.string().describe('The file path to search for exceptions in'),
        timeRange: z
          .string()
          .default('24h')
          .describe('Time range (e.g., "1h", "24h", "7d")'),
        limit: z.number().default(50).describe('Maximum number of traces to return'),
      }),
      handler: async (args, context) => {
        try {
          const { readToken } = await context.getCredentials();
          const client = new LogfireClient(readToken);
          const traces = await client.findExceptionsInFile(
            args.filePath,
            args.timeRange,
            args.limit
          );
          return JSON.stringify(traces, null, 2);
        } catch (error) {
          return `Failed to find exceptions in file: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    ARBITRARY_QUERY: tool({
      name: 'pydantic_logfire_arbitrary_query',
      description: 'Execute a custom SQL query on OpenTelemetry data',
      schema: z.object({
        query: z.string().describe('SQL query to execute on the records table'),
      }),
      handler: async (args, context) => {
        try {
          const { readToken } = await context.getCredentials();
          const client = new LogfireClient(readToken);
          const result = await client.arbitraryQuery(args.query);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to execute query: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_SCHEMA: tool({
      name: 'pydantic_logfire_get_schema',
      description: 'Get the OpenTelemetry schema for the records table',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { readToken } = await context.getCredentials();
          const client = new LogfireClient(readToken);
          const schema = await client.getLogfireRecordsSchema();
          return JSON.stringify(schema, null, 2);
        } catch (error) {
          return `Failed to get schema: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    SEARCH_RECORDS: tool({
      name: 'pydantic_logfire_search_records',
      description: 'Search log records by text content',
      schema: z.object({
        searchTerm: z
          .string()
          .describe('Text to search for in log messages and attributes'),
        timeRange: z
          .string()
          .default('24h')
          .describe('Time range (e.g., "1h", "24h", "7d")'),
        limit: z.number().default(50).describe('Maximum number of records to return'),
        severityLevel: z
          .string()
          .optional()
          .describe('Filter by severity level (DEBUG, INFO, WARN, ERROR)'),
      }),
      handler: async (args, context) => {
        try {
          const { readToken } = await context.getCredentials();
          const client = new LogfireClient(readToken);
          const records = await client.searchRecords(
            args.searchTerm,
            args.timeRange,
            args.limit,
            args.severityLevel
          );
          return JSON.stringify(records, null, 2);
        } catch (error) {
          return `Failed to search records: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_SERVICE_METRICS: tool({
      name: 'pydantic_logfire_get_service_metrics',
      description: 'Get aggregated metrics for services',
      schema: z.object({
        serviceName: z.string().optional().describe('Specific service name to filter by'),
        timeRange: z
          .string()
          .default('24h')
          .describe('Time range (e.g., "1h", "24h", "7d")'),
      }),
      handler: async (args, context) => {
        try {
          const { readToken } = await context.getCredentials();
          const client = new LogfireClient(readToken);
          const metrics = await client.getServiceMetrics(
            args.serviceName,
            args.timeRange
          );
          return JSON.stringify(metrics, null, 2);
        } catch (error) {
          return `Failed to get service metrics: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_TRACE_DETAILS: tool({
      name: 'pydantic_logfire_get_trace_details',
      description: 'Get all records for a specific trace ID',
      schema: z.object({
        traceId: z.string().describe('The trace ID to get details for'),
      }),
      handler: async (args, context) => {
        try {
          const { readToken } = await context.getCredentials();
          const client = new LogfireClient(readToken);
          const trace = await client.getTraceDetails(args.traceId);
          return JSON.stringify(trace, null, 2);
        } catch (error) {
          return `Failed to get trace details: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_PERFORMANCE_METRICS: tool({
      name: 'pydantic_logfire_get_performance_metrics',
      description: 'Get performance metrics over time',
      schema: z.object({
        timeRange: z
          .string()
          .default('1h')
          .describe('Time range (e.g., "1h", "6h", "24h")'),
        serviceName: z.string().optional().describe('Specific service name to filter by'),
      }),
      handler: async (args, context) => {
        try {
          const { readToken } = await context.getCredentials();
          const client = new LogfireClient(readToken);
          const metrics = await client.getPerformanceMetrics(
            args.timeRange,
            args.serviceName
          );
          return JSON.stringify(metrics, null, 2);
        } catch (error) {
          return `Failed to get performance metrics: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

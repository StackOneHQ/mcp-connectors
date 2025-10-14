import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

interface DatadogIncident {
  id: string;
  type: string;
  attributes: {
    title: string;
    public_id: number;
    resolved?: string;
    created: string;
    modified: string;
    customer_impact_scope?: string;
    customer_impact_start?: string;
    customer_impact_end?: string;
    customer_impacted?: boolean;
    commander_user?: {
      uuid: string;
      name: string;
      email: string;
    };
    state: string;
    severity: string;
    fields?: Record<string, unknown>;
  };
}

interface DatadogMonitor {
  id: number;
  name: string;
  type: string;
  query: string;
  message: string;
  overall_state: string;
  tags: string[];
  options: Record<string, unknown>;
  created: string;
  modified: string;
  creator: {
    id: number;
    name: string;
    email: string;
  };
}

interface DatadogLog {
  id: string;
  attributes: {
    timestamp: string;
    message: string;
    status: string;
    service?: string;
    host?: string;
    tags?: string[];
    attributes?: Record<string, unknown>;
  };
}

interface DatadogMetric {
  metric_name: string;
  points: Array<[number, number]>;
  tags?: string[];
  unit?: string;
  type?: string;
}

class DatadogClient {
  private headers: {
    'DD-API-KEY': string;
    'DD-APPLICATION-KEY': string;
    'Content-Type': string;
  };
  private baseUrl: string;

  constructor(apiKey: string, appKey: string, site = 'datadoghq.com') {
    this.headers = {
      'DD-API-KEY': apiKey,
      'DD-APPLICATION-KEY': appKey,
      'Content-Type': 'application/json',
    };
    this.baseUrl = `https://api.${site}`;
  }

  async listIncidents(
    limit = 30,
    state?: string,
    severity?: string
  ): Promise<DatadogIncident[]> {
    const params = new URLSearchParams({
      'page[size]': limit.toString(),
    });

    if (state) {
      params.append('filter[state]', state);
    }

    if (severity) {
      params.append('filter[severity]', severity);
    }

    const response = await fetch(`${this.baseUrl}/api/v2/incidents?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Datadog API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data?: DatadogIncident[] };
    return result.data || [];
  }

  async getIncident(incidentId: string): Promise<DatadogIncident> {
    const response = await fetch(`${this.baseUrl}/api/v2/incidents/${incidentId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Datadog API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: DatadogIncident };
    return result.data;
  }

  async getMonitors(
    limit = 30,
    state?: string,
    tags?: string[]
  ): Promise<DatadogMonitor[]> {
    const params = new URLSearchParams({
      page_size: limit.toString(),
    });

    if (state) {
      params.append('group_states', state);
    }

    if (tags && tags.length > 0) {
      params.append('tags', tags.join(','));
    }

    const response = await fetch(`${this.baseUrl}/api/v1/monitor?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Datadog API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<DatadogMonitor[]>;
  }

  async getMonitor(monitorId: number): Promise<DatadogMonitor> {
    const response = await fetch(`${this.baseUrl}/api/v1/monitor/${monitorId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Datadog API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<DatadogMonitor>;
  }

  async searchLogs(
    query: string,
    from?: string,
    to?: string,
    limit = 50
  ): Promise<DatadogLog[]> {
    const body: Record<string, unknown> = {
      filter: {
        query,
        from: from || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24h ago
        to: to || new Date().toISOString(),
      },
      page: {
        limit,
      },
      sort: '-timestamp',
    };

    const response = await fetch(`${this.baseUrl}/api/v2/logs/events/search`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Datadog API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data?: DatadogLog[] };
    return result.data || [];
  }

  async getMetrics(query: string, from: number, to: number): Promise<DatadogMetric[]> {
    const params = new URLSearchParams({
      query,
      from: from.toString(),
      to: to.toString(),
    });

    const response = await fetch(`${this.baseUrl}/api/v1/query?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Datadog API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { series?: DatadogMetric[] };
    return result.series || [];
  }

  async getDowntimes(limit = 30): Promise<unknown[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/downtime`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Datadog API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as unknown;
    return Array.isArray(result) ? result.slice(0, limit) : [];
  }

  async getHosts(limit = 30, filter?: string): Promise<unknown[]> {
    const params = new URLSearchParams({
      count: limit.toString(),
    });

    if (filter) {
      params.append('filter', filter);
    }

    const response = await fetch(`${this.baseUrl}/api/v1/hosts?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Datadog API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { host_list?: unknown[] };
    return result.host_list || [];
  }
}

export interface DatadogCredentials {
  apiKey: string;
  appKey: string;
  site?: string;
}

export function createDatadogServer(credentials: DatadogCredentials): McpServer {
  const server = new McpServer({
    name: 'Datadog',
    version: '1.0.0',
  });

  const site = credentials.site || 'datadoghq.com';

  server.tool(
    'datadog_list_incidents',
    'List incidents with optional filtering',
    {
      limit: z.number().default(30).describe('Maximum number of incidents to return'),
      state: z
        .string()
        .optional()
        .describe('Filter by incident state (active, stable, resolved)'),
      severity: z
        .string()
        .optional()
        .describe('Filter by severity (SEV-1, SEV-2, SEV-3, SEV-4, SEV-5)'),
    },
    async (args) => {
      try {
        const client = new DatadogClient(credentials.apiKey, credentials.appKey, site);
        const incidents = await client.listIncidents(
          args.limit,
          args.state,
          args.severity
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(incidents, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to list incidents: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'datadog_get_incident',
    'Get detailed information about a specific incident',
    {
      incidentId: z.string().describe('The incident ID to retrieve'),
    },
    async (args) => {
      try {
        const client = new DatadogClient(credentials.apiKey, credentials.appKey, site);
        const incident = await client.getIncident(args.incidentId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(incident, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get incident: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'datadog_get_monitors',
    'Get monitor statuses with optional filtering',
    {
      limit: z.number().default(30).describe('Maximum number of monitors to return'),
      state: z
        .string()
        .optional()
        .describe('Filter by monitor state (Alert, Warn, No Data, OK)'),
      tags: z.array(z.string()).optional().describe('Filter by tags'),
    },
    async (args) => {
      try {
        const client = new DatadogClient(credentials.apiKey, credentials.appKey, site);
        const monitors = await client.getMonitors(args.limit, args.state, args.tags);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(monitors, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get monitors: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'datadog_get_monitor',
    'Get details of a specific monitor',
    {
      monitorId: z.number().describe('The monitor ID to retrieve'),
    },
    async (args) => {
      try {
        const client = new DatadogClient(credentials.apiKey, credentials.appKey, site);
        const monitor = await client.getMonitor(args.monitorId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(monitor, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get monitor: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'datadog_search_logs',
    'Search and retrieve logs',
    {
      query: z.string().describe('Log search query'),
      from: z
        .string()
        .optional()
        .describe('Start time (ISO 8601 format, defaults to 24h ago)'),
      to: z.string().optional().describe('End time (ISO 8601 format, defaults to now)'),
      limit: z.number().default(50).describe('Maximum number of logs to return'),
    },
    async (args) => {
      try {
        const client = new DatadogClient(credentials.apiKey, credentials.appKey, site);
        const logs = await client.searchLogs(args.query, args.from, args.to, args.limit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(logs, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to search logs: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'datadog_get_metrics',
    'Query metrics data',
    {
      query: z.string().describe('Metrics query (e.g., "avg:system.cpu.user{*}")'),
      from: z.number().describe('Start time (Unix timestamp)'),
      to: z.number().describe('End time (Unix timestamp)'),
    },
    async (args) => {
      try {
        const client = new DatadogClient(credentials.apiKey, credentials.appKey, site);
        const metrics = await client.getMetrics(args.query, args.from, args.to);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(metrics, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get metrics: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'datadog_get_downtimes',
    'List scheduled downtimes',
    {
      limit: z.number().default(30).describe('Maximum number of downtimes to return'),
    },
    async (args) => {
      try {
        const client = new DatadogClient(credentials.apiKey, credentials.appKey, site);
        const downtimes = await client.getDowntimes(args.limit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(downtimes, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get downtimes: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'datadog_get_hosts',
    'List hosts in the infrastructure',
    {
      limit: z.number().default(30).describe('Maximum number of hosts to return'),
      filter: z.string().optional().describe('Filter hosts by tags or attributes'),
    },
    async (args) => {
      try {
        const client = new DatadogClient(credentials.apiKey, credentials.appKey, site);
        const hosts = await client.getHosts(args.limit, args.filter);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(hosts, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get hosts: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  return server;
}

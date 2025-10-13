import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

interface IncidentIoIncident {
  id: string;
  name: string;
  description?: string;
  reference: string;
  url: string;
  status: {
    category: string;
    name: string;
    rank: number;
  };
  severity: {
    name: string;
    rank: number;
  };
  incident_type: {
    name: string;
    description?: string;
  };
  mode: string;
  visibility: string;
  created_at: string;
  updated_at: string;
  creator: {
    id: string;
    name: string;
    email?: string;
  };
  assignee?: {
    id: string;
    name: string;
    email?: string;
  };
  external_issue_reference?: {
    issue_name: string;
    issue_permalink: string;
  };
  incident_role_assignments?: Array<{
    role: {
      id: string;
      name: string;
    };
    assignee: {
      id: string;
      name: string;
      email?: string;
    };
  }>;
}

interface IncidentIoUser {
  id: string;
  name: string;
  email: string;
  slack_user_id?: string;
  role: string;
  base_role: {
    name: string;
    description?: string;
  };
  custom_roles?: Array<{
    name: string;
    description?: string;
  }>;
}

interface IncidentIoService {
  id: string;
  name: string;
  description?: string;
  summary?: string;
  annotations?: Record<string, string>;
  backstage_id?: string;
  created_at: string;
  updated_at: string;
}

interface IncidentIoTeam {
  id: string;
  name: string;
  summary?: string;
  slack_channel_name?: string;
  slack_channel_id?: string;
  created_at: string;
  updated_at: string;
}

interface IncidentIoEscalationPath {
  id: string;
  name: string;
  path: Array<{
    id: string;
    if_else: {
      conditions: Array<{
        operation: string;
        param_bindings: Array<{
          array_value?: unknown[];
          value?: unknown;
        }>;
        subject: string;
      }>;
      else_path: Array<unknown>;
      then_path: Array<unknown>;
    };
    level: {
      targets: Array<{
        id: string;
        type: string;
        urgency: string;
      }>;
      time_to_ack_interval_condition: string;
      time_to_ack_weekday_interval_condition?: string;
    };
    repeat?: {
      repeat_times: number;
      to_node: string;
    };
    type: string;
  }>;
  working_hours?: Array<{
    name: string;
    timezone: string;
    weekday_intervals: Array<{
      start_time: string;
      end_time: string;
      weekday: string;
    }>;
  }>;
}

interface IncidentIoSchedule {
  id: string;
  name: string;
  timezone: string;
  config: {
    rotations: Array<{
      id: string;
      name: string;
      effective_from: string;
      handover_start_at: string;
      handovers: Array<{
        interval: number;
        interval_type: string;
      }>;
      layers: Array<{
        id: string;
        name: string;
        users: Array<{
          id: string;
          email: string;
          name: string;
        }>;
      }>;
      working_interval?: Array<{
        start_time: string;
        end_time: string;
        weekday: string;
      }>;
    }>;
  };
  created_at: string;
  updated_at: string;
}

class IncidentIoClient {
  private headers: { Authorization: string; 'Content-Type': string };
  private baseUrl = 'https://api.incident.io';

  constructor(apiKey: string) {
    this.headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async listIncidents(
    status?: string,
    severity?: string,
    limit = 25
  ): Promise<IncidentIoIncident[]> {
    const params = new URLSearchParams({
      page_size: limit.toString(),
    });

    if (status) {
      params.append('status', status);
    }

    if (severity) {
      params.append('severity', severity);
    }

    const response = await fetch(`${this.baseUrl}/v2/incidents?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Incident.io API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { incidents?: IncidentIoIncident[] };
    return result.incidents || [];
  }

  async getIncident(incidentId: string): Promise<IncidentIoIncident> {
    const response = await fetch(`${this.baseUrl}/v2/incidents/${incidentId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Incident.io API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { incident: IncidentIoIncident };
    return result.incident;
  }

  async createIncident(
    name: string,
    summary: string,
    severityId: string,
    incidentTypeId?: string,
    visibility = 'private'
  ): Promise<IncidentIoIncident> {
    const body = {
      name,
      summary,
      severity_id: severityId,
      incident_type_id: incidentTypeId,
      visibility,
    };

    const response = await fetch(`${this.baseUrl}/v2/incidents`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Incident.io API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { incident: IncidentIoIncident };
    return result.incident;
  }

  async updateIncident(
    incidentId: string,
    updates: {
      name?: string;
      summary?: string;
      status_id?: string;
      severity_id?: string;
    }
  ): Promise<IncidentIoIncident> {
    const response = await fetch(`${this.baseUrl}/v2/incidents/${incidentId}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`Incident.io API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { incident: IncidentIoIncident };
    return result.incident;
  }

  async listUsers(limit = 25): Promise<IncidentIoUser[]> {
    const params = new URLSearchParams({
      page_size: limit.toString(),
    });

    const response = await fetch(`${this.baseUrl}/v2/users?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Incident.io API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { users?: IncidentIoUser[] };
    return result.users || [];
  }

  async getUser(userId: string): Promise<IncidentIoUser> {
    const response = await fetch(`${this.baseUrl}/v2/users/${userId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Incident.io API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { user: IncidentIoUser };
    return result.user;
  }

  async listServices(limit = 25): Promise<IncidentIoService[]> {
    const params = new URLSearchParams({
      page_size: limit.toString(),
    });

    const response = await fetch(`${this.baseUrl}/v2/catalog/services?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Incident.io API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { services?: IncidentIoService[] };
    return result.services || [];
  }

  async listTeams(limit = 25): Promise<IncidentIoTeam[]> {
    const params = new URLSearchParams({
      page_size: limit.toString(),
    });

    const response = await fetch(`${this.baseUrl}/v2/teams?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Incident.io API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { teams?: IncidentIoTeam[] };
    return result.teams || [];
  }

  async listEscalationPaths(limit = 25): Promise<IncidentIoEscalationPath[]> {
    const params = new URLSearchParams({
      page_size: limit.toString(),
    });

    const response = await fetch(`${this.baseUrl}/v2/escalation_paths?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Incident.io API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as {
      escalation_paths?: IncidentIoEscalationPath[];
    };
    return result.escalation_paths || [];
  }

  async listSchedules(limit = 25): Promise<IncidentIoSchedule[]> {
    const params = new URLSearchParams({
      page_size: limit.toString(),
    });

    const response = await fetch(`${this.baseUrl}/v2/schedules?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Incident.io API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { schedules?: IncidentIoSchedule[] };
    return result.schedules || [];
  }

  async getOnCallSchedule(scheduleId: string): Promise<unknown[]> {
    const response = await fetch(`${this.baseUrl}/v2/schedules/${scheduleId}/entries`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Incident.io API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { schedule_entries?: unknown[] };
    return result.schedule_entries || [];
  }
}

export interface IncidentCredentials {
  apiKey: string;
}

export function createIncidentServer(credentials: IncidentCredentials): McpServer {
  const server = new McpServer({
    name: 'Incident.io',
    version: '1.0.0',
  });

  server.tool(
    'incident_list_incidents',
    'List incidents with optional filtering',
    {
      status: z
        .string()
        .optional()
        .describe('Filter by incident status (triage, fixing, monitoring, closed)'),
      severity: z.string().optional().describe('Filter by severity name'),
      limit: z.number().default(25).describe('Maximum number of incidents to return'),
    },
    async (args) => {
      try {
        const client = new IncidentIoClient(credentials.apiKey);
        const incidents = await client.listIncidents(
          args.status,
          args.severity,
          args.limit
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(incidents, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to list incidents: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'incident_get_incident',
    'Get detailed information about a specific incident',
    {
      incidentId: z.string().describe('The incident ID to retrieve'),
    },
    async (args) => {
      try {
        const client = new IncidentIoClient(credentials.apiKey);
        const incident = await client.getIncident(args.incidentId);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(incident, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to get incident: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'incident_create_incident',
    'Create a new incident',
    {
      name: z.string().describe('Name of the incident'),
      summary: z.string().describe('Summary description of the incident'),
      severityId: z.string().describe('Severity ID for the incident'),
      incidentTypeId: z.string().optional().describe('Incident type ID'),
      visibility: z
        .enum(['private', 'public'])
        .default('private')
        .describe('Visibility of the incident'),
    },
    async (args) => {
      try {
        const client = new IncidentIoClient(credentials.apiKey);
        const incident = await client.createIncident(
          args.name,
          args.summary,
          args.severityId,
          args.incidentTypeId,
          args.visibility
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(incident, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to create incident: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'incident_update_incident',
    'Update an existing incident',
    {
      incidentId: z.string().describe('The incident ID to update'),
      name: z.string().optional().describe('New name for the incident'),
      summary: z.string().optional().describe('New summary for the incident'),
      statusId: z.string().optional().describe('New status ID for the incident'),
      severityId: z.string().optional().describe('New severity ID for the incident'),
    },
    async (args) => {
      try {
        const client = new IncidentIoClient(credentials.apiKey);
        const updates: {
          name?: string;
          summary?: string;
          status_id?: string;
          severity_id?: string;
        } = {};
        if (args.name) updates.name = args.name;
        if (args.summary) updates.summary = args.summary;
        if (args.statusId) updates.status_id = args.statusId;
        if (args.severityId) updates.severity_id = args.severityId;

        const incident = await client.updateIncident(args.incidentId, updates);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(incident, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to update incident: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'incident_list_users',
    'List users in the organization',
    {
      limit: z.number().default(25).describe('Maximum number of users to return'),
    },
    async (args) => {
      try {
        const client = new IncidentIoClient(credentials.apiKey);
        const users = await client.listUsers(args.limit);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(users, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to list users: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'incident_get_user',
    'Get details of a specific user',
    {
      userId: z.string().describe('The user ID to retrieve'),
    },
    async (args) => {
      try {
        const client = new IncidentIoClient(credentials.apiKey);
        const user = await client.getUser(args.userId);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(user, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to get user: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'incident_list_services',
    'List services in the catalog',
    {
      limit: z.number().default(25).describe('Maximum number of services to return'),
    },
    async (args) => {
      try {
        const client = new IncidentIoClient(credentials.apiKey);
        const services = await client.listServices(args.limit);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(services, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to list services: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'incident_list_teams',
    'List teams in the organization',
    {
      limit: z.number().default(25).describe('Maximum number of teams to return'),
    },
    async (args) => {
      try {
        const client = new IncidentIoClient(credentials.apiKey);
        const teams = await client.listTeams(args.limit);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(teams, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to list teams: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'incident_list_escalation_paths',
    'List escalation paths configured in the system',
    {
      limit: z
        .number()
        .default(25)
        .describe('Maximum number of escalation paths to return'),
    },
    async (args) => {
      try {
        const client = new IncidentIoClient(credentials.apiKey);
        const escalationPaths = await client.listEscalationPaths(args.limit);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(escalationPaths, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to list escalation paths: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'incident_list_schedules',
    'List on-call schedules',
    {
      limit: z.number().default(25).describe('Maximum number of schedules to return'),
    },
    async (args) => {
      try {
        const client = new IncidentIoClient(credentials.apiKey);
        const schedules = await client.listSchedules(args.limit);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(schedules, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to list schedules: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'incident_get_on_call_schedule',
    'Get on-call schedule entries for a specific schedule',
    {
      scheduleId: z.string().describe('The schedule ID to retrieve entries for'),
    },
    async (args) => {
      try {
        const client = new IncidentIoClient(credentials.apiKey);
        const scheduleEntries = await client.getOnCallSchedule(args.scheduleId);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(scheduleEntries, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to get on-call schedule: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  return server;
}

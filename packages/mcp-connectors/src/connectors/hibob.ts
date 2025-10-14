import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

interface HiBobEmployee {
  id: string;
  firstName?: string;
  surname?: string;
  email?: string;
  [key: string]: unknown;
}

interface HiBobEmployeeField {
  id: string;
  name: string;
  description?: string;
  jsonPath: string;
  historicField: boolean;
  fieldType: string;
  required: boolean;
  deprecated: boolean;
  [key: string]: unknown;
}

interface HiBobTimeoffPolicyType {
  name: string;
  id: string;
  [key: string]: unknown;
}

interface HiBobTimeoffRequest {
  id: string;
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
  [key: string]: unknown;
}

interface HiBobTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  dueDate?: string;
  [key: string]: unknown;
}

class HiBobClient {
  private headers: { Authorization: string; 'Content-Type': string };
  private baseUrl = 'https://api.hibob.com/v1';

  constructor(serviceUserId: string, serviceUserToken: string) {
    const token = Buffer.from(`${serviceUserId}:${serviceUserToken}`).toString('base64');
    this.headers = {
      Authorization: `Basic ${token}`,
      'Content-Type': 'application/json',
    };
  }

  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: unknown
  ): Promise<unknown> {
    const url = `${this.baseUrl}/${endpoint}`;
    const options: RequestInit = {
      method,
      headers: this.headers,
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`HiBob API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async searchPeople(
    fields?: string[],
    filters?: unknown[]
  ): Promise<{ employees: HiBobEmployee[] }> {
    const body: Record<string, unknown> = {};
    if (fields) {
      body.fields = fields;
    }
    if (filters) {
      body.filters = filters;
    }
    return (await this.makeRequest('people/search', 'POST', body)) as {
      employees: HiBobEmployee[];
    };
  }

  async getEmployeeFields(): Promise<{ fields: HiBobEmployeeField[] }> {
    return (await this.makeRequest('company/people/fields')) as {
      fields: HiBobEmployeeField[];
    };
  }

  async updateEmployee(
    employeeId: string,
    fields: Record<string, unknown>
  ): Promise<HiBobEmployee> {
    return (await this.makeRequest(
      `people/${employeeId}`,
      'PUT',
      fields
    )) as HiBobEmployee;
  }

  async getTimeoffPolicyTypes(): Promise<HiBobTimeoffPolicyType[]> {
    return (await this.makeRequest('timeoff/policy-types')) as HiBobTimeoffPolicyType[];
  }

  async submitTimeoffRequest(
    employeeId: string,
    requestDetails: Record<string, unknown>
  ): Promise<HiBobTimeoffRequest> {
    return (await this.makeRequest(
      `timeoff/employees/${employeeId}/requests`,
      'POST',
      requestDetails
    )) as HiBobTimeoffRequest;
  }

  async createEmployee(fields: Record<string, unknown>): Promise<HiBobEmployee> {
    return (await this.makeRequest('people', 'POST', fields)) as HiBobEmployee;
  }

  async getEmployeeTasks(employeeId: string): Promise<{ tasks: HiBobTask[] }> {
    return (await this.makeRequest(`tasks/people/${employeeId}`)) as {
      tasks: HiBobTask[];
    };
  }
}

export interface HiBobCredentials {
  serviceUserId: string;
  serviceUserToken: string;
}

export function createHiBobServer(credentials: HiBobCredentials): McpServer {
  const server = new McpServer({
    name: 'HiBob',
    version: '1.0.0',
  });

  server.tool(
    'hibob_people_search',
    'Search for employees in HiBob using advanced filters',
    {
      fields: z
        .array(z.string())
        .optional()
        .describe('List of field paths to return for each employee'),
      filters: z
        .array(
          z.object({
            fieldPath: z.string().describe('Field path (e.g., "root.id", "root.email")'),
            operator: z.string().describe('Operator (e.g., "equals")'),
            values: z.array(z.string()).describe('Values to filter by'),
          })
        )
        .optional()
        .describe('Filters to apply to the search'),
    },
    async (args) => {
      try {
        const client = new HiBobClient(
          credentials.serviceUserId,
          credentials.serviceUserToken
        );
        const result = await client.searchPeople(args.fields, args.filters);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to search people: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'hibob_get_employee_fields',
    'Get metadata about all employee fields from HiBob',
    {},
    async (_args) => {
      try {
        const client = new HiBobClient(
          credentials.serviceUserId,
          credentials.serviceUserToken
        );
        const result = await client.getEmployeeFields();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get employee fields: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'hibob_update_employee',
    'Update specific fields in an employee record in HiBob',
    {
      employeeId: z.string().describe('Employee ID'),
      fields: z
        .record(z.unknown())
        .describe(
          'Object with field paths as keys and values to update (e.g., {"root.firstName": "NewName"})'
        ),
    },
    async (args) => {
      try {
        const client = new HiBobClient(
          credentials.serviceUserId,
          credentials.serviceUserToken
        );
        const result = await client.updateEmployee(args.employeeId, args.fields);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to update employee: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'hibob_get_timeoff_policy_types',
    'Get a list of all timeoff policy type names from HiBob',
    {},
    async (_args) => {
      try {
        const client = new HiBobClient(
          credentials.serviceUserId,
          credentials.serviceUserToken
        );
        const result = await client.getTimeoffPolicyTypes();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get timeoff policy types: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'hibob_submit_timeoff_request',
    'Submit a new time off request for an employee in HiBob',
    {
      employeeId: z.string().describe('The HiBob employee ID'),
      requestDetails: z
        .object({
          type: z.string().describe('The time off type (e.g., "Holiday")'),
          requestRangeType: z.literal('days').describe('Must be "days"'),
          startDatePortion: z.literal('all_day').describe('Must be "all_day"'),
          endDatePortion: z.literal('all_day').describe('Must be "all_day"'),
          startDate: z.string().describe('Start date in YYYY-MM-DD format'),
          endDate: z.string().describe('End date in YYYY-MM-DD format'),
          days: z.number().optional().describe('Number of days requested'),
          reason: z.string().optional().describe('Reason for the request'),
          comment: z.string().optional().describe('Additional comments'),
          halfDay: z.boolean().optional().describe('If the request is for a half day'),
          policyType: z.string().optional().describe('Policy type name'),
          reasonCode: z.string().optional().describe('Reason code if required by policy'),
        })
        .describe('The request details'),
    },
    async (args) => {
      try {
        const client = new HiBobClient(
          credentials.serviceUserId,
          credentials.serviceUserToken
        );
        const result = await client.submitTimeoffRequest(
          args.employeeId,
          args.requestDetails
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to submit timeoff request: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'hibob_create_employee',
    'Create a new employee record in HiBob',
    {
      fields: z
        .record(z.unknown())
        .describe(
          'Dictionary of employee fields to set (must include site and startDate which are mandatory)'
        ),
    },
    async (args) => {
      try {
        const client = new HiBobClient(
          credentials.serviceUserId,
          credentials.serviceUserToken
        );
        const result = await client.createEmployee(args.fields);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to create employee: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'hibob_get_employee_tasks',
    'Get all tasks for a specific employee in HiBob',
    {
      employeeId: z.string().describe('The HiBob employee ID'),
    },
    async (args) => {
      try {
        const client = new HiBobClient(
          credentials.serviceUserId,
          credentials.serviceUserToken
        );
        const result = await client.getEmployeeTasks(args.employeeId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get employee tasks: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  return server;
}

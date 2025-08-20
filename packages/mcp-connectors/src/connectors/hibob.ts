import { mcpConnectorConfig } from '@stackone/mcp-config-types';
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

export const HiBobConnectorConfig = mcpConnectorConfig({
  name: 'HiBob',
  key: 'hibob',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/hibob/filled/svg',
  credentials: z.object({
    serviceUserId: z
      .string()
      .describe(
        'HiBob Service User ID :: 1234567890 : https://apidocs.hibob.com/docs/api-service-users'
      ),
    serviceUserToken: z.string().describe('HiBob Service User Token :: 1234567890'),
  }),
  setup: z.object({}),
  examplePrompt:
    'Submit a vacation request for next week and check my current tasks and assignments.',
  tools: (tool) => ({
    PEOPLE_SEARCH: tool({
      name: 'hibob_people_search',
      description: 'Search for employees in HiBob using advanced filters',
      schema: z.object({
        fields: z
          .array(z.string())
          .optional()
          .describe('List of field paths to return for each employee'),
        filters: z
          .array(
            z.object({
              fieldPath: z
                .string()
                .describe('Field path (e.g., "root.id", "root.email")'),
              operator: z.string().describe('Operator (e.g., "equals")'),
              values: z.array(z.string()).describe('Values to filter by'),
            })
          )
          .optional()
          .describe('Filters to apply to the search'),
      }),
      handler: async (args, context) => {
        try {
          const { serviceUserId, serviceUserToken } = await context.getCredentials();
          const client = new HiBobClient(serviceUserId, serviceUserToken);
          const result = await client.searchPeople(args.fields, args.filters);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to search people: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_EMPLOYEE_FIELDS: tool({
      name: 'hibob_get_employee_fields',
      description: 'Get metadata about all employee fields from HiBob',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { serviceUserId, serviceUserToken } = await context.getCredentials();
          const client = new HiBobClient(serviceUserId, serviceUserToken);
          const result = await client.getEmployeeFields();
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to get employee fields: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    UPDATE_EMPLOYEE: tool({
      name: 'hibob_update_employee',
      description: 'Update specific fields in an employee record in HiBob',
      schema: z.object({
        employeeId: z.string().describe('Employee ID'),
        fields: z
          .record(z.unknown())
          .describe(
            'Object with field paths as keys and values to update (e.g., {"root.firstName": "NewName"})'
          ),
      }),
      handler: async (args, context) => {
        try {
          const { serviceUserId, serviceUserToken } = await context.getCredentials();
          const client = new HiBobClient(serviceUserId, serviceUserToken);
          const result = await client.updateEmployee(args.employeeId, args.fields);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to update employee: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_TIMEOFF_POLICY_TYPES: tool({
      name: 'hibob_get_timeoff_policy_types',
      description: 'Get a list of all timeoff policy type names from HiBob',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { serviceUserId, serviceUserToken } = await context.getCredentials();
          const client = new HiBobClient(serviceUserId, serviceUserToken);
          const result = await client.getTimeoffPolicyTypes();
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to get timeoff policy types: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    SUBMIT_TIMEOFF_REQUEST: tool({
      name: 'hibob_submit_timeoff_request',
      description: 'Submit a new time off request for an employee in HiBob',
      schema: z.object({
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
            reasonCode: z
              .string()
              .optional()
              .describe('Reason code if required by policy'),
          })
          .describe('The request details'),
      }),
      handler: async (args, context) => {
        try {
          const { serviceUserId, serviceUserToken } = await context.getCredentials();
          const client = new HiBobClient(serviceUserId, serviceUserToken);
          const result = await client.submitTimeoffRequest(
            args.employeeId,
            args.requestDetails
          );
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to submit timeoff request: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    CREATE_EMPLOYEE: tool({
      name: 'hibob_create_employee',
      description: 'Create a new employee record in HiBob',
      schema: z.object({
        fields: z
          .record(z.unknown())
          .describe(
            'Dictionary of employee fields to set (must include site and startDate which are mandatory)'
          ),
      }),
      handler: async (args, context) => {
        try {
          const { serviceUserId, serviceUserToken } = await context.getCredentials();
          const client = new HiBobClient(serviceUserId, serviceUserToken);
          const result = await client.createEmployee(args.fields);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to create employee: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_EMPLOYEE_TASKS: tool({
      name: 'hibob_get_employee_tasks',
      description: 'Get all tasks for a specific employee in HiBob',
      schema: z.object({
        employeeId: z.string().describe('The HiBob employee ID'),
      }),
      handler: async (args, context) => {
        try {
          const { serviceUserId, serviceUserToken } = await context.getCredentials();
          const client = new HiBobClient(serviceUserId, serviceUserToken);
          const result = await client.getEmployeeTasks(args.employeeId);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to get employee tasks: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

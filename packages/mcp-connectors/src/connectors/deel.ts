import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface DeelEmployee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department?: string;
  job_title?: string;
  employment_type?: string;
  start_date?: string;
  status?: string;
  country?: string;
  currency?: string;
  timezone?: string;
  [key: string]: unknown;
}

interface DeelTimeOff {
  id: string;
  employee_id: string;
  type: string;
  start_date: string;
  end_date: string;
  days: number;
  status: string;
  reason?: string;
  approved_by?: string;
  approved_at?: string;
  [key: string]: unknown;
}

interface DeelNote {
  id: string;
  employee_id: string;
  content: string;
  author_id: string;
  author_name: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

interface DeelDocument {
  id: string;
  employee_id: string;
  name: string;
  type: string;
  file_url: string;
  uploaded_at: string;
  uploaded_by: string;
  [key: string]: unknown;
}

interface DeelPayslip {
  id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  gross_amount: number;
  net_amount: number;
  currency: string;
  status: string;
  file_url?: string;
  [key: string]: unknown;
}

interface DeelContract {
  id: string;
  employee_id: string;
  job_title: string;
  employment_type: string;
  salary_amount: number;
  currency: string;
  start_date: string;
  end_date?: string;
  status: string;
  [key: string]: unknown;
}

class DeelClient {
  private headers: { Authorization: string; 'Content-Type': string };
  private baseUrl = 'https://api.deel.com/v1';

  constructor(apiKey: string) {
    this.headers = {
      Authorization: `Bearer ${apiKey}`,
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
      throw new Error(`Deel API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Employee Management
  async searchEmployees(
    filters?: {
      department?: string;
      job_title?: string;
      employment_type?: string;
      status?: string;
      country?: string;
      query?: string;
      email?: string;
    },
    limit?: number,
    offset?: number
  ): Promise<{ employees: DeelEmployee[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.department) params.set('department', filters.department);
    if (filters?.job_title) params.set('job_title', filters.job_title);
    if (filters?.employment_type) params.set('employment_type', filters.employment_type);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.country) params.set('country', filters.country);
    if (filters?.query) params.set('search', filters.query);
    if (limit) params.set('limit', limit.toString());
    if (offset) params.set('offset', offset.toString());

    // If email search is provided, try API search first, then fallback to client-side filtering
    if (filters?.email) {
      // Try searching by email using the general search parameter
      params.set('search', filters.email);
    }

    const endpoint = `employees${params.toString() ? `?${params.toString()}` : ''}`;
    const result = (await this.makeRequest(endpoint)) as {
      employees: DeelEmployee[];
      total: number;
    };

    // If email filter is provided, apply client-side filtering to ensure exact email matches
    if (filters?.email) {
      const emailLower = filters.email.toLowerCase();
      const filteredEmployees = result.employees.filter(
        (emp) => emp.email?.toLowerCase() === emailLower
      );
      return {
        employees: filteredEmployees,
        total: filteredEmployees.length,
      };
    }

    return result;
  }

  async getEmployee(employeeId: string): Promise<DeelEmployee> {
    return (await this.makeRequest(`employees/${employeeId}`)) as DeelEmployee;
  }

  async createEmployee(employeeData: {
    first_name: string;
    last_name: string;
    email: string;
    job_title: string;
    employment_type: string;
    country: string;
    currency: string;
    start_date: string;
    department?: string;
    phone?: string;
    timezone?: string;
  }): Promise<DeelEmployee> {
    return (await this.makeRequest('employees', 'POST', employeeData)) as DeelEmployee;
  }

  async updateEmployee(
    employeeId: string,
    updateData: Partial<DeelEmployee>
  ): Promise<DeelEmployee> {
    return (await this.makeRequest(
      `employees/${employeeId}`,
      'PUT',
      updateData
    )) as DeelEmployee;
  }

  // Time Off Management
  async addTimeOff(timeOffData: {
    employee_id: string;
    type: string;
    start_date: string;
    end_date: string;
    reason?: string;
  }): Promise<DeelTimeOff> {
    return (await this.makeRequest('time-off', 'POST', timeOffData)) as DeelTimeOff;
  }

  async getEmployeeTimeOff(
    employeeId: string,
    status?: string
  ): Promise<{ time_off: DeelTimeOff[] }> {
    const params = new URLSearchParams();
    if (status) params.set('status', status);

    const endpoint = `employees/${employeeId}/time-off${params.toString() ? `?${params.toString()}` : ''}`;
    return (await this.makeRequest(endpoint)) as { time_off: DeelTimeOff[] };
  }

  async getScheduledTimeOff(
    startDate?: string,
    endDate?: string
  ): Promise<{ time_off: DeelTimeOff[] }> {
    const params = new URLSearchParams();
    params.set('status', 'approved');
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);

    const endpoint = `time-off?${params.toString()}`;
    return (await this.makeRequest(endpoint)) as { time_off: DeelTimeOff[] };
  }

  // Notes & Documents
  async addEmployeeNote(employeeId: string, content: string): Promise<DeelNote> {
    return (await this.makeRequest(`employees/${employeeId}/notes`, 'POST', {
      content,
    })) as DeelNote;
  }

  async getEmployeeNotes(employeeId: string): Promise<{ notes: DeelNote[] }> {
    return (await this.makeRequest(`employees/${employeeId}/notes`)) as {
      notes: DeelNote[];
    };
  }

  async getEmployeeDocuments(employeeId: string): Promise<{ documents: DeelDocument[] }> {
    return (await this.makeRequest(`employees/${employeeId}/documents`)) as {
      documents: DeelDocument[];
    };
  }

  async uploadEmployeeDocument(
    employeeId: string,
    documentData: {
      name: string;
      type: string;
      file_data: string; // base64 encoded file data
    }
  ): Promise<DeelDocument> {
    return (await this.makeRequest(
      `employees/${employeeId}/documents`,
      'POST',
      documentData
    )) as DeelDocument;
  }

  // Pay Management
  async getEmployeePayslips(
    employeeId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ payslips: DeelPayslip[] }> {
    const params = new URLSearchParams();
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);

    const endpoint = `employees/${employeeId}/payslips${params.toString() ? `?${params.toString()}` : ''}`;
    return (await this.makeRequest(endpoint)) as { payslips: DeelPayslip[] };
  }

  async getEmployeeContract(employeeId: string): Promise<DeelContract> {
    return (await this.makeRequest(`employees/${employeeId}/contract`)) as DeelContract;
  }

  async updateEmployeeContract(
    employeeId: string,
    contractData: {
      job_title?: string;
      salary_amount?: number;
      currency?: string;
      start_date?: string;
      end_date?: string;
    }
  ): Promise<DeelContract> {
    return (await this.makeRequest(
      `employees/${employeeId}/contract`,
      'PUT',
      contractData
    )) as DeelContract;
  }
}

export const DeelConnectorConfig = mcpConnectorConfig({
  name: 'Deel',
  key: 'deel',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/deel/filled/svg',
  credentials: z.object({
    apiKey: z
      .string()
      .describe(
        'Deel API Key from Settings > API :: deel_live_1234567890abcdef :: https://help.letsdeel.com/hc/en-gb/articles/8801712601233-How-To-Use-Deel-API'
      ),
  }),
  setup: z.object({}),
  examplePrompt:
    'Search for employees in the engineering department, add a vacation request for John Doe next week, get payslip information for the last month, and add a note about the team meeting.',
  tools: (tool) => ({
    SEARCH_EMPLOYEES: tool({
      name: 'deel_search_employees',
      description: 'Search for employees in Deel using various filters',
      schema: z.object({
        department: z.string().optional().describe('Filter by department'),
        job_title: z.string().optional().describe('Filter by job title'),
        employment_type: z
          .string()
          .optional()
          .describe('Filter by employment type (e.g., full-time, contractor)'),
        status: z
          .string()
          .optional()
          .describe('Filter by employee status (e.g., active, inactive)'),
        country: z.string().optional().describe('Filter by country'),
        query: z.string().optional().describe('Search query for name or general search'),
        email: z
          .string()
          .email()
          .optional()
          .describe('Search for employees by exact email address'),
        limit: z.number().optional().describe('Maximum number of results to return'),
        offset: z.number().optional().describe('Number of results to skip'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new DeelClient(apiKey);
          const result = await client.searchEmployees(
            {
              department: args.department,
              job_title: args.job_title,
              employment_type: args.employment_type,
              status: args.status,
              country: args.country,
              query: args.query,
              email: args.email,
            },
            args.limit,
            args.offset
          );
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to search employees: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_EMPLOYEE: tool({
      name: 'deel_get_employee',
      description: 'Get detailed information about a specific employee',
      schema: z.object({
        employeeId: z.string().describe('Employee ID'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new DeelClient(apiKey);
          const result = await client.getEmployee(args.employeeId);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to get employee: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    CREATE_EMPLOYEE: tool({
      name: 'deel_create_employee',
      description: 'Create a new employee record in Deel',
      schema: z.object({
        first_name: z.string().describe('Employee first name'),
        last_name: z.string().describe('Employee last name'),
        email: z.string().email().describe('Employee email address'),
        job_title: z.string().describe('Job title'),
        employment_type: z
          .string()
          .describe('Employment type (e.g., full-time, contractor)'),
        country: z.string().describe('Country of employment'),
        currency: z.string().describe('Currency for compensation'),
        start_date: z.string().describe('Start date in YYYY-MM-DD format'),
        department: z.string().optional().describe('Department name'),
        phone: z.string().optional().describe('Phone number'),
        timezone: z.string().optional().describe('Timezone'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new DeelClient(apiKey);
          const result = await client.createEmployee(args);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to create employee: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    UPDATE_EMPLOYEE: tool({
      name: 'deel_update_employee',
      description: 'Update an existing employee record in Deel',
      schema: z.object({
        employeeId: z.string().describe('Employee ID'),
        updateData: z
          .object({
            first_name: z.string().optional(),
            last_name: z.string().optional(),
            email: z.string().email().optional(),
            phone: z.string().optional(),
            department: z.string().optional(),
            job_title: z.string().optional(),
            employment_type: z.string().optional(),
            status: z.string().optional(),
            country: z.string().optional(),
            currency: z.string().optional(),
            timezone: z.string().optional(),
          })
          .describe('Fields to update'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new DeelClient(apiKey);
          const result = await client.updateEmployee(args.employeeId, args.updateData);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to update employee: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    ADD_TIME_OFF: tool({
      name: 'deel_add_time_off',
      description: 'Add a time off request for an employee',
      schema: z.object({
        employee_id: z.string().describe('Employee ID'),
        type: z.string().describe('Type of time off (e.g., vacation, sick, personal)'),
        start_date: z.string().describe('Start date in YYYY-MM-DD format'),
        end_date: z.string().describe('End date in YYYY-MM-DD format'),
        reason: z.string().optional().describe('Reason for time off'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new DeelClient(apiKey);
          const result = await client.addTimeOff(args);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to add time off: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_EMPLOYEE_TIME_OFF: tool({
      name: 'deel_get_employee_time_off',
      description: 'Get time off records for a specific employee',
      schema: z.object({
        employeeId: z.string().describe('Employee ID'),
        status: z
          .string()
          .optional()
          .describe('Filter by status (e.g., pending, approved, rejected)'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new DeelClient(apiKey);
          const result = await client.getEmployeeTimeOff(args.employeeId, args.status);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to get employee time off: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_SCHEDULED_TIME_OFF: tool({
      name: 'deel_get_scheduled_time_off',
      description: 'Get scheduled/approved time off for all employees in a date range',
      schema: z.object({
        start_date: z.string().optional().describe('Start date in YYYY-MM-DD format'),
        end_date: z.string().optional().describe('End date in YYYY-MM-DD format'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new DeelClient(apiKey);
          const result = await client.getScheduledTimeOff(args.start_date, args.end_date);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to get scheduled time off: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    ADD_EMPLOYEE_NOTE: tool({
      name: 'deel_add_employee_note',
      description: 'Add a note to an employee record',
      schema: z.object({
        employeeId: z.string().describe('Employee ID'),
        content: z.string().describe('Note content'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new DeelClient(apiKey);
          const result = await client.addEmployeeNote(args.employeeId, args.content);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to add employee note: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_EMPLOYEE_NOTES: tool({
      name: 'deel_get_employee_notes',
      description: 'Get all notes for a specific employee',
      schema: z.object({
        employeeId: z.string().describe('Employee ID'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new DeelClient(apiKey);
          const result = await client.getEmployeeNotes(args.employeeId);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to get employee notes: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_EMPLOYEE_DOCUMENTS: tool({
      name: 'deel_get_employee_documents',
      description: 'Get all documents for a specific employee',
      schema: z.object({
        employeeId: z.string().describe('Employee ID'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new DeelClient(apiKey);
          const result = await client.getEmployeeDocuments(args.employeeId);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to get employee documents: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    UPLOAD_EMPLOYEE_DOCUMENT: tool({
      name: 'deel_upload_employee_document',
      description: 'Upload a document for an employee',
      schema: z.object({
        employeeId: z.string().describe('Employee ID'),
        name: z.string().describe('Document name'),
        type: z
          .string()
          .describe('Document type (e.g., contract, id_document, tax_form)'),
        file_data: z.string().describe('Base64 encoded file data'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new DeelClient(apiKey);
          const result = await client.uploadEmployeeDocument(args.employeeId, {
            name: args.name,
            type: args.type,
            file_data: args.file_data,
          });
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to upload employee document: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_EMPLOYEE_PAYSLIPS: tool({
      name: 'deel_get_employee_payslips',
      description: 'Get payslips for a specific employee',
      schema: z.object({
        employeeId: z.string().describe('Employee ID'),
        start_date: z.string().optional().describe('Start date in YYYY-MM-DD format'),
        end_date: z.string().optional().describe('End date in YYYY-MM-DD format'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new DeelClient(apiKey);
          const result = await client.getEmployeePayslips(
            args.employeeId,
            args.start_date,
            args.end_date
          );
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to get employee payslips: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_EMPLOYEE_CONTRACT: tool({
      name: 'deel_get_employee_contract',
      description: 'Get contract information for a specific employee',
      schema: z.object({
        employeeId: z.string().describe('Employee ID'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new DeelClient(apiKey);
          const result = await client.getEmployeeContract(args.employeeId);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to get employee contract: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    UPDATE_EMPLOYEE_CONTRACT: tool({
      name: 'deel_update_employee_contract',
      description: 'Update contract information for a specific employee',
      schema: z.object({
        employeeId: z.string().describe('Employee ID'),
        contractData: z
          .object({
            job_title: z.string().optional().describe('Job title'),
            salary_amount: z.number().optional().describe('Salary amount'),
            currency: z.string().optional().describe('Currency'),
            start_date: z
              .string()
              .optional()
              .describe('Contract start date in YYYY-MM-DD format'),
            end_date: z
              .string()
              .optional()
              .describe('Contract end date in YYYY-MM-DD format'),
          })
          .describe('Contract fields to update'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new DeelClient(apiKey);
          const result = await client.updateEmployeeContract(
            args.employeeId,
            args.contractData
          );
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to update employee contract: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

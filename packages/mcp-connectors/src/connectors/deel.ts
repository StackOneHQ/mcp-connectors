import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
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

export interface DeelCredentials {
  apiKey: string;
}

export function createDeelServer(credentials: DeelCredentials): McpServer {
  const server = new McpServer({
    name: 'Deel',
    version: '1.0.0',
  });

  server.tool(
    'deel_search_employees',
    'Search for employees in Deel using various filters',
    {
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
    },
    async (args) => {
      try {
        const client = new DeelClient(credentials.apiKey);
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
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to search employees: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'deel_get_employee',
    'Get detailed information about a specific employee',
    {
      employeeId: z.string().describe('Employee ID'),
    },
    async (args) => {
      try {
        const client = new DeelClient(credentials.apiKey);
        const result = await client.getEmployee(args.employeeId);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to get employee: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'deel_create_employee',
    'Create a new employee record in Deel',
    {
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
    },
    async (args) => {
      try {
        const client = new DeelClient(credentials.apiKey);
        const result = await client.createEmployee(args as {
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
        });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to create employee: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'deel_update_employee',
    'Update an existing employee record in Deel',
    {
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
    },
    async (args) => {
      try {
        const client = new DeelClient(credentials.apiKey);
        const result = await client.updateEmployee(args.employeeId, args.updateData);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to update employee: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'deel_add_time_off',
    'Add a time off request for an employee',
    {
      employee_id: z.string().describe('Employee ID'),
      type: z.string().describe('Type of time off (e.g., vacation, sick, personal)'),
      start_date: z.string().describe('Start date in YYYY-MM-DD format'),
      end_date: z.string().describe('End date in YYYY-MM-DD format'),
      reason: z.string().optional().describe('Reason for time off'),
    },
    async (args) => {
      try {
        const client = new DeelClient(credentials.apiKey);
        const result = await client.addTimeOff(args as {
          employee_id: string;
          type: string;
          start_date: string;
          end_date: string;
          reason?: string;
        });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to add time off: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'deel_get_employee_time_off',
    'Get time off records for a specific employee',
    {
      employeeId: z.string().describe('Employee ID'),
      status: z
        .string()
        .optional()
        .describe('Filter by status (e.g., pending, approved, rejected)'),
    },
    async (args) => {
      try {
        const client = new DeelClient(credentials.apiKey);
        const result = await client.getEmployeeTimeOff(args.employeeId, args.status);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to get employee time off: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'deel_get_scheduled_time_off',
    'Get scheduled/approved time off for all employees in a date range',
    {
      start_date: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      end_date: z.string().optional().describe('End date in YYYY-MM-DD format'),
    },
    async (args) => {
      try {
        const client = new DeelClient(credentials.apiKey);
        const result = await client.getScheduledTimeOff(args.start_date, args.end_date);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to get scheduled time off: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'deel_add_employee_note',
    'Add a note to an employee record',
    {
      employeeId: z.string().describe('Employee ID'),
      content: z.string().describe('Note content'),
    },
    async (args) => {
      try {
        const client = new DeelClient(credentials.apiKey);
        const result = await client.addEmployeeNote(args.employeeId, args.content);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to add employee note: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'deel_get_employee_notes',
    'Get all notes for a specific employee',
    {
      employeeId: z.string().describe('Employee ID'),
    },
    async (args) => {
      try {
        const client = new DeelClient(credentials.apiKey);
        const result = await client.getEmployeeNotes(args.employeeId);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to get employee notes: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'deel_get_employee_documents',
    'Get all documents for a specific employee',
    {
      employeeId: z.string().describe('Employee ID'),
    },
    async (args) => {
      try {
        const client = new DeelClient(credentials.apiKey);
        const result = await client.getEmployeeDocuments(args.employeeId);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to get employee documents: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'deel_upload_employee_document',
    'Upload a document for an employee',
    {
      employeeId: z.string().describe('Employee ID'),
      name: z.string().describe('Document name'),
      type: z
        .string()
        .describe('Document type (e.g., contract, id_document, tax_form)'),
      file_data: z.string().describe('Base64 encoded file data'),
    },
    async (args) => {
      try {
        const client = new DeelClient(credentials.apiKey);
        const result = await client.uploadEmployeeDocument(args.employeeId, {
          name: args.name,
          type: args.type,
          file_data: args.file_data,
        });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to upload employee document: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'deel_get_employee_payslips',
    'Get payslips for a specific employee',
    {
      employeeId: z.string().describe('Employee ID'),
      start_date: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      end_date: z.string().optional().describe('End date in YYYY-MM-DD format'),
    },
    async (args) => {
      try {
        const client = new DeelClient(credentials.apiKey);
        const result = await client.getEmployeePayslips(
          args.employeeId,
          args.start_date,
          args.end_date
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to get employee payslips: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'deel_get_employee_contract',
    'Get contract information for a specific employee',
    {
      employeeId: z.string().describe('Employee ID'),
    },
    async (args) => {
      try {
        const client = new DeelClient(credentials.apiKey);
        const result = await client.getEmployeeContract(args.employeeId);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to get employee contract: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'deel_update_employee_contract',
    'Update contract information for a specific employee',
    {
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
    },
    async (args) => {
      try {
        const client = new DeelClient(credentials.apiKey);
        const result = await client.updateEmployeeContract(
          args.employeeId,
          args.contractData
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to update employee contract: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  return server;
}

import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface FreeAgentCompany {
  type: string;
  currency: string;
  mileage_units: string;
  company_start_date: string;
  sales_tax_registration_status: string;
  name?: string;
  subdomain?: string;
  first_accounting_year_end?: string;
}

interface FreeAgentContact {
  url: string;
  first_name?: string;
  last_name?: string;
  organization_name?: string;
  email?: string;
  billing_email?: string;
  phone_number?: string;
  mobile?: string;
  address1?: string;
  address2?: string;
  address3?: string;
  town?: string;
  region?: string;
  postcode?: string;
  country?: string;
  contact_name_on_invoices?: boolean;
  is_deletable?: boolean;
  created_at: string;
  updated_at: string;
}

interface FreeAgentProject {
  url: string;
  contact: string;
  name: string;
  status: string;
  uses_project_invoice_sequence: boolean;
  currency: string;
  budget?: number;
  budget_units?: string;
  normal_billing_rate?: string;
  hours_per_day?: number;
  is_ir35?: boolean;
  created_at: string;
  updated_at: string;
}

interface FreeAgentInvoice {
  url: string;
  contact: string;
  project?: string;
  reference?: string;
  dated_on: string;
  due_on: string;
  net_value: string;
  sales_tax_value: string;
  total_value: string;
  currency: string;
  status: string;
  comments?: string;
  created_at: string;
  updated_at: string;
}

interface FreeAgentBankAccount {
  url: string;
  name: string;
  type: string;
  currency: string;
  current_balance: string;
  bank_name?: string;
  account_number?: string;
  sort_code?: string;
  is_personal?: boolean;
  created_at: string;
  updated_at: string;
}

interface FreeAgentBankTransaction {
  url: string;
  bank_account: string;
  dated_on: string;
  amount: string;
  description?: string;
  unexplained_amount?: string;
  is_manual?: boolean;
  created_at: string;
  updated_at: string;
}

interface FreeAgentBill {
  url: string;
  contact: string;
  project?: string;
  reference?: string;
  dated_on: string;
  due_on: string;
  net_value: string;
  sales_tax_value: string;
  total_value: string;
  currency: string;
  status: string;
  comments?: string;
  created_at: string;
  updated_at: string;
}

class FreeAgentClient {
  private headers: { Authorization: string; Accept: string; 'User-Agent': string };
  private baseUrl: string;

  constructor(accessToken: string, sandbox = false) {
    this.baseUrl = sandbox
      ? 'https://api.sandbox.freeagent.com/v2'
      : 'https://api.freeagent.com/v2';
    this.headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'User-Agent': 'MCP-FreeAgent-Connector/1.0.0',
    };
  }

  async getCompany(): Promise<FreeAgentCompany> {
    const response = await fetch(`${this.baseUrl}/company`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`FreeAgent API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { company: FreeAgentCompany };
    return result.company;
  }

  async listContacts(view = 'active', sort = 'name'): Promise<FreeAgentContact[]> {
    const response = await fetch(`${this.baseUrl}/contacts?view=${view}&sort=${sort}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`FreeAgent API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { contacts: FreeAgentContact[] };
    return result.contacts;
  }

  async getContact(contactId: string): Promise<FreeAgentContact> {
    const response = await fetch(`${this.baseUrl}/contacts/${contactId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`FreeAgent API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { contact: FreeAgentContact };
    return result.contact;
  }

  async listProjects(view = 'active', sort = 'name'): Promise<FreeAgentProject[]> {
    const response = await fetch(`${this.baseUrl}/projects?view=${view}&sort=${sort}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`FreeAgent API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { projects: FreeAgentProject[] };
    return result.projects;
  }

  async getProject(projectId: string): Promise<FreeAgentProject> {
    const response = await fetch(`${this.baseUrl}/projects/${projectId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`FreeAgent API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { project: FreeAgentProject };
    return result.project;
  }

  async listInvoices(view?: string, sort = 'dated_on'): Promise<FreeAgentInvoice[]> {
    let url = `${this.baseUrl}/invoices?sort=${sort}`;
    if (view) {
      url += `&view=${view}`;
    }

    const response = await fetch(url, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`FreeAgent API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { invoices: FreeAgentInvoice[] };
    return result.invoices;
  }

  async getInvoice(invoiceId: string): Promise<FreeAgentInvoice> {
    const response = await fetch(`${this.baseUrl}/invoices/${invoiceId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`FreeAgent API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { invoice: FreeAgentInvoice };
    return result.invoice;
  }

  async listBankAccounts(): Promise<FreeAgentBankAccount[]> {
    const response = await fetch(`${this.baseUrl}/bank_accounts`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`FreeAgent API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { bank_accounts: FreeAgentBankAccount[] };
    return result.bank_accounts;
  }

  async getBankAccount(accountId: string): Promise<FreeAgentBankAccount> {
    const response = await fetch(`${this.baseUrl}/bank_accounts/${accountId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`FreeAgent API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { bank_account: FreeAgentBankAccount };
    return result.bank_account;
  }

  async listBankTransactions(
    bankAccountId?: string,
    from?: string,
    to?: string
  ): Promise<FreeAgentBankTransaction[]> {
    let url = `${this.baseUrl}/bank_transactions`;
    const params = new URLSearchParams();

    if (bankAccountId) {
      params.append('bank_account', bankAccountId);
    }
    if (from) {
      params.append('from_date', from);
    }
    if (to) {
      params.append('to_date', to);
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await fetch(url, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`FreeAgent API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { bank_transactions: FreeAgentBankTransaction[] };
    return result.bank_transactions;
  }

  async listBills(view?: string, sort = 'dated_on'): Promise<FreeAgentBill[]> {
    let url = `${this.baseUrl}/bills?sort=${sort}`;
    if (view) {
      url += `&view=${view}`;
    }

    const response = await fetch(url, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`FreeAgent API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { bills: FreeAgentBill[] };
    return result.bills;
  }

  async getBill(billId: string): Promise<FreeAgentBill> {
    const response = await fetch(`${this.baseUrl}/bills/${billId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`FreeAgent API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { bill: FreeAgentBill };
    return result.bill;
  }
}

export const FreeAgentConnectorConfig = mcpConnectorConfig({
  name: 'FreeAgent',
  key: 'freeagent',
  version: '1.0.0',
  logo: 'https://www.freeagent.com/wp-content/uploads/2019/11/freeagent-logo.svg',
  credentials: z.object({
    accessToken: z
      .string()
      .describe(
        'FreeAgent OAuth 2.0 Access Token :: Required for API authentication :: https://dev.freeagent.com/docs/quick_start'
      ),
    sandbox: z.boolean().default(false).describe('Use sandbox environment for testing'),
  }),
  setup: z.object({}),
  examplePrompt:
    'Get company information, list all active contacts and projects, show recent invoices and bills, and display bank account balances.',
  tools: (tool) => ({
    GET_COMPANY: tool({
      name: 'freeagent_get_company',
      description: 'Get company information and settings',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { accessToken, sandbox } = await context.getCredentials();
          const client = new FreeAgentClient(accessToken, sandbox);
          const company = await client.getCompany();
          return JSON.stringify(company, null, 2);
        } catch (error) {
          return `Failed to get company: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_CONTACTS: tool({
      name: 'freeagent_list_contacts',
      description: 'List contacts (clients, suppliers, etc.)',
      schema: z.object({
        view: z
          .enum(['active', 'hidden', 'clients', 'suppliers'])
          .default('active')
          .describe('Filter contacts by type'),
        sort: z
          .enum(['name', 'created_at', 'updated_at'])
          .default('name')
          .describe('Sort contacts by field'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, sandbox } = await context.getCredentials();
          const client = new FreeAgentClient(accessToken, sandbox);
          const contacts = await client.listContacts(args.view, args.sort);
          return JSON.stringify(contacts, null, 2);
        } catch (error) {
          return `Failed to list contacts: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_CONTACT: tool({
      name: 'freeagent_get_contact',
      description: 'Get details of a specific contact',
      schema: z.object({
        contactId: z.string().describe('Contact ID'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, sandbox } = await context.getCredentials();
          const client = new FreeAgentClient(accessToken, sandbox);
          const contact = await client.getContact(args.contactId);
          return JSON.stringify(contact, null, 2);
        } catch (error) {
          return `Failed to get contact: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_PROJECTS: tool({
      name: 'freeagent_list_projects',
      description: 'List projects',
      schema: z.object({
        view: z
          .enum(['active', 'completed', 'cancelled', 'hidden'])
          .default('active')
          .describe('Filter projects by status'),
        sort: z
          .enum(['name', 'contact', 'created_at', 'updated_at'])
          .default('name')
          .describe('Sort projects by field'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, sandbox } = await context.getCredentials();
          const client = new FreeAgentClient(accessToken, sandbox);
          const projects = await client.listProjects(args.view, args.sort);
          return JSON.stringify(projects, null, 2);
        } catch (error) {
          return `Failed to list projects: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_PROJECT: tool({
      name: 'freeagent_get_project',
      description: 'Get details of a specific project',
      schema: z.object({
        projectId: z.string().describe('Project ID'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, sandbox } = await context.getCredentials();
          const client = new FreeAgentClient(accessToken, sandbox);
          const project = await client.getProject(args.projectId);
          return JSON.stringify(project, null, 2);
        } catch (error) {
          return `Failed to get project: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_INVOICES: tool({
      name: 'freeagent_list_invoices',
      description: 'List invoices',
      schema: z.object({
        view: z
          .enum([
            'recent_open_or_overdue',
            'open',
            'overdue',
            'draft',
            'sent',
            'paid',
            'cancelled',
          ])
          .optional()
          .describe('Filter invoices by status'),
        sort: z
          .enum(['dated_on', 'created_at', 'updated_at'])
          .default('dated_on')
          .describe('Sort invoices by field'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, sandbox } = await context.getCredentials();
          const client = new FreeAgentClient(accessToken, sandbox);
          const invoices = await client.listInvoices(args.view, args.sort);
          return JSON.stringify(invoices, null, 2);
        } catch (error) {
          return `Failed to list invoices: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_INVOICE: tool({
      name: 'freeagent_get_invoice',
      description: 'Get details of a specific invoice',
      schema: z.object({
        invoiceId: z.string().describe('Invoice ID'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, sandbox } = await context.getCredentials();
          const client = new FreeAgentClient(accessToken, sandbox);
          const invoice = await client.getInvoice(args.invoiceId);
          return JSON.stringify(invoice, null, 2);
        } catch (error) {
          return `Failed to get invoice: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_BANK_ACCOUNTS: tool({
      name: 'freeagent_list_bank_accounts',
      description: 'List bank accounts',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { accessToken, sandbox } = await context.getCredentials();
          const client = new FreeAgentClient(accessToken, sandbox);
          const accounts = await client.listBankAccounts();
          return JSON.stringify(accounts, null, 2);
        } catch (error) {
          return `Failed to list bank accounts: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_BANK_ACCOUNT: tool({
      name: 'freeagent_get_bank_account',
      description: 'Get details of a specific bank account',
      schema: z.object({
        accountId: z.string().describe('Bank account ID'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, sandbox } = await context.getCredentials();
          const client = new FreeAgentClient(accessToken, sandbox);
          const account = await client.getBankAccount(args.accountId);
          return JSON.stringify(account, null, 2);
        } catch (error) {
          return `Failed to get bank account: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_BANK_TRANSACTIONS: tool({
      name: 'freeagent_list_bank_transactions',
      description: 'List bank transactions',
      schema: z.object({
        bankAccountId: z.string().optional().describe('Filter by bank account ID'),
        fromDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
        toDate: z.string().optional().describe('End date (YYYY-MM-DD)'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, sandbox } = await context.getCredentials();
          const client = new FreeAgentClient(accessToken, sandbox);
          const transactions = await client.listBankTransactions(
            args.bankAccountId,
            args.fromDate,
            args.toDate
          );
          return JSON.stringify(transactions, null, 2);
        } catch (error) {
          return `Failed to list bank transactions: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_BILLS: tool({
      name: 'freeagent_list_bills',
      description: 'List bills (purchases from suppliers)',
      schema: z.object({
        view: z
          .enum([
            'recent_open_or_overdue',
            'open',
            'overdue',
            'draft',
            'sent',
            'paid',
            'cancelled',
          ])
          .optional()
          .describe('Filter bills by status'),
        sort: z
          .enum(['dated_on', 'created_at', 'updated_at'])
          .default('dated_on')
          .describe('Sort bills by field'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, sandbox } = await context.getCredentials();
          const client = new FreeAgentClient(accessToken, sandbox);
          const bills = await client.listBills(args.view, args.sort);
          return JSON.stringify(bills, null, 2);
        } catch (error) {
          return `Failed to list bills: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_BILL: tool({
      name: 'freeagent_get_bill',
      description: 'Get details of a specific bill',
      schema: z.object({
        billId: z.string().describe('Bill ID'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, sandbox } = await context.getCredentials();
          const client = new FreeAgentClient(accessToken, sandbox);
          const bill = await client.getBill(args.billId);
          return JSON.stringify(bill, null, 2);
        } catch (error) {
          return `Failed to get bill: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

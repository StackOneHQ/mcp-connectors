import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

// Xero API Base URLs
const XERO_API_BASE_URL = 'https://api.xero.com/api.xro/2.0';

// TypeScript interfaces for Xero API responses
interface XeroContact {
  ContactID: string;
  Name: string;
  ContactStatus: string;
  EmailAddress?: string;
  IsSupplier?: boolean;
  IsCustomer?: boolean;
  [key: string]: unknown;
}

interface XeroAccount {
  AccountID: string;
  Name: string;
  Code: string;
  Type: string;
  BankAccountType?: string;
  CurrencyCode?: string;
  [key: string]: unknown;
}

interface XeroBankTransaction {
  BankTransactionID: string;
  Type: 'SPEND' | 'RECEIVE';
  Contact?: XeroContact;
  Date: string;
  Reference?: string;
  CurrencyCode: string;
  CurrencyRate?: number;
  Status: 'AUTHORISED' | 'DELETED';
  LineAmountTypes: string;
  TotalTax: number;
  SubTotal: number;
  Total: number;
  BankAccount: XeroAccount;
  [key: string]: unknown;
}

interface XeroPayment {
  PaymentID: string;
  Date: string;
  Amount: number;
  Reference?: string;
  CurrencyCode: string;
  Account: XeroAccount;
  Invoice?: {
    InvoiceID: string;
    InvoiceNumber?: string;
  };
  [key: string]: unknown;
}

interface XeroInvoice {
  InvoiceID: string;
  InvoiceNumber?: string;
  Reference?: string;
  Type: 'ACCREC' | 'ACCPAY';
  Contact: XeroContact;
  Date: string;
  DueDate?: string;
  Status: 'DRAFT' | 'SUBMITTED' | 'AUTHORISED' | 'PAID' | 'VOIDED';
  CurrencyCode: string;
  SubTotal: number;
  TotalTax: number;
  Total: number;
  AmountDue: number;
  AmountPaid: number;
  AmountCredited: number;
  [key: string]: unknown;
}

// API response interfaces
interface XeroBankTransactionsResponse {
  BankTransactions: XeroBankTransaction[];
}

interface XeroPaymentsResponse {
  Payments: XeroPayment[];
}

interface XeroInvoicesResponse {
  Invoices: XeroInvoice[];
}

interface XeroContactsResponse {
  Contacts: XeroContact[];
}

interface XeroAccountsResponse {
  Accounts: XeroAccount[];
}

interface XeroOrganisationsResponse {
  Organisations: Record<string, unknown>[];
}

class XeroClient {
  private baseUrl: string;
  private accessToken: string;
  private tenantId: string;

  constructor(accessToken: string, tenantId: string) {
    this.baseUrl = XERO_API_BASE_URL;
    this.accessToken = accessToken;
    this.tenantId = tenantId;
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Xero-tenant-id': this.tenantId,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Xero API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async getBankTransactions(
    options: {
      where?: string;
      unitdp?: number;
      page?: number;
    } = {}
  ): Promise<XeroBankTransaction[]> {
    const params = new URLSearchParams();
    if (options.where) params.append('where', options.where);
    if (options.unitdp) params.append('unitdp', options.unitdp.toString());
    if (options.page) params.append('page', options.page.toString());

    const queryString = params.toString();
    const endpoint = `/BankTransactions${queryString ? `?${queryString}` : ''}`;

    const response = await this.makeRequest(endpoint);
    return (response as XeroBankTransactionsResponse).BankTransactions || [];
  }

  async createBankTransaction(data: {
    type: 'SPEND' | 'RECEIVE';
    contact: { contactID: string };
    bankAccount: { accountID: string };
    lineItems: Array<{
      description: string;
      quantity?: number;
      unitAmount: number;
      accountCode: string;
    }>;
    date?: string;
    reference?: string;
  }): Promise<XeroBankTransaction> {
    const payload = {
      Type: data.type,
      Contact: { ContactID: data.contact.contactID },
      BankAccount: { AccountID: data.bankAccount.accountID },
      LineItems: data.lineItems.map((item) => ({
        Description: item.description,
        Quantity: item.quantity || 1,
        UnitAmount: item.unitAmount,
        AccountCode: item.accountCode,
      })),
      Date: data.date || new Date().toISOString().split('T')[0],
      Reference: data.reference,
    };

    const response = await this.makeRequest('/BankTransactions', {
      method: 'POST',
      body: JSON.stringify({ BankTransactions: [payload] }),
    });

    const bankTransaction = (response as XeroBankTransactionsResponse)
      .BankTransactions[0];
    if (!bankTransaction) {
      throw new Error(
        'Failed to create bank transaction: no transaction returned from API'
      );
    }
    return bankTransaction;
  }

  async getPayments(
    options: {
      where?: string;
      page?: number;
    } = {}
  ): Promise<XeroPayment[]> {
    const params = new URLSearchParams();
    if (options.where) params.append('where', options.where);
    if (options.page) params.append('page', options.page.toString());

    const queryString = params.toString();
    const endpoint = `/Payments${queryString ? `?${queryString}` : ''}`;

    const response = await this.makeRequest(endpoint);
    return (response as XeroPaymentsResponse).Payments || [];
  }

  async createPayment(data: {
    invoice: { invoiceID: string };
    account: { accountID: string };
    amount: number;
    date?: string;
    reference?: string;
  }): Promise<XeroPayment> {
    const payload = {
      Invoice: { InvoiceID: data.invoice.invoiceID },
      Account: { AccountID: data.account.accountID },
      Amount: data.amount,
      Date: data.date || new Date().toISOString().split('T')[0],
      Reference: data.reference,
    };

    const response = await this.makeRequest('/Payments', {
      method: 'POST',
      body: JSON.stringify({ Payments: [payload] }),
    });

    const payment = (response as XeroPaymentsResponse).Payments[0];
    if (!payment) {
      throw new Error('Failed to create payment: no payment returned from API');
    }
    return payment;
  }

  async getInvoices(
    options: {
      where?: string;
      statuses?: string[];
      page?: number;
    } = {}
  ): Promise<XeroInvoice[]> {
    const params = new URLSearchParams();
    if (options.where) params.append('where', options.where);
    if (options.statuses && options.statuses.length > 0) {
      params.append('Statuses', options.statuses.join(','));
    }
    if (options.page) params.append('page', options.page.toString());

    const queryString = params.toString();
    const endpoint = `/Invoices${queryString ? `?${queryString}` : ''}`;

    const response = await this.makeRequest(endpoint);
    return (response as XeroInvoicesResponse).Invoices || [];
  }

  async emailInvoice(
    invoiceId: string,
    emailData?: {
      includeOnlineInvoice?: boolean;
      includeAttachments?: boolean;
    }
  ) {
    const response = await this.makeRequest(`/Invoices/${invoiceId}/Email`, {
      method: 'POST',
      body: JSON.stringify(emailData || {}),
    });
    return response;
  }

  async getContacts(
    options: {
      where?: string;
      includeArchived?: boolean;
      page?: number;
    } = {}
  ): Promise<XeroContact[]> {
    const params = new URLSearchParams();
    if (options.where) params.append('where', options.where);
    if (options.includeArchived) params.append('includeArchived', 'true');
    if (options.page) params.append('page', options.page.toString());

    const queryString = params.toString();
    const endpoint = `/Contacts${queryString ? `?${queryString}` : ''}`;

    const response = await this.makeRequest(endpoint);
    return (response as XeroContactsResponse).Contacts || [];
  }

  async getAccounts(
    options: {
      where?: string;
      page?: number;
    } = {}
  ): Promise<XeroAccount[]> {
    const params = new URLSearchParams();
    if (options.where) params.append('where', options.where);
    if (options.page) params.append('page', options.page.toString());

    const queryString = params.toString();
    const endpoint = `/Accounts${queryString ? `?${queryString}` : ''}`;

    const response = await this.makeRequest(endpoint);
    return (response as XeroAccountsResponse).Accounts || [];
  }

  async getOrganisation(): Promise<Record<string, unknown>> {
    const response = await this.makeRequest('/Organisation');
    return (response as XeroOrganisationsResponse).Organisations?.[0] || {};
  }
}

export const XeroConnectorConfig = mcpConnectorConfig({
  name: 'Xero',
  key: 'xero',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/xero/filled/svg',
  credentials: z.object({
    accessToken: z
      .string()
      .describe(
        'Xero OAuth2 access token :: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoieGVybyJ9.1234567890abcdef'
      ),
    tenantId: z
      .string()
      .describe('Xero tenant/organisation ID :: 12345678-1234-1234-1234-123456789012'),
  }),
  setup: z.object({}),
  examplePrompt:
    'List recent bank transactions for reconciliation, create a payment to supplier "ABC Ltd" for invoice INV-001, and email invoice INV-002 to the customer.',
  tools: (tool) => ({
    LIST_BANK_TRANSACTIONS: tool({
      name: 'list_bank_transactions',
      description:
        'Retrieve bank transactions for reconciliation. Supports filtering by date, account, status, and contact.',
      schema: z.object({
        where: z
          .string()
          .optional()
          .describe('Filter expression (e.g. "Date >= DateTime(2024,01,01)")'),
        page: z.number().optional().describe('Page number for pagination'),
        unitdp: z
          .number()
          .optional()
          .describe('Unit decimal places (4 = 4 decimal places)'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, tenantId } = await context.getCredentials();
          const client = new XeroClient(accessToken, tenantId);
          const transactions = await client.getBankTransactions(args);

          if (transactions.length === 0) {
            return 'No bank transactions found';
          }

          return `Found ${transactions.length} bank transactions:\n${transactions
            .map(
              (tx) =>
                `- ${tx.Type} | ${tx.Date} | ${tx.CurrencyCode} ${tx.Total} | ${tx.Reference || 'No reference'}\n  Bank: ${tx.BankAccount.Name} | Contact: ${tx.Contact?.Name || 'N/A'} | Status: ${tx.Status}`
            )
            .join('\n')}`;
        } catch (error) {
          return `Failed to retrieve bank transactions: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    CREATE_BANK_TRANSACTION: tool({
      name: 'create_bank_transaction',
      description:
        'Create a new bank transaction. Use for manual entry of transactions for reconciliation.',
      schema: z.object({
        type: z.enum(['SPEND', 'RECEIVE']).describe('Transaction type'),
        contactId: z.string().describe('Contact/supplier ID'),
        bankAccountId: z.string().describe('Bank account ID'),
        description: z.string().describe('Transaction description'),
        amount: z.number().describe('Transaction amount'),
        accountCode: z.string().describe('Account code for categorization'),
        reference: z.string().optional().describe('Reference number'),
        date: z.string().optional().describe('Transaction date (YYYY-MM-DD)'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, tenantId } = await context.getCredentials();
          const client = new XeroClient(accessToken, tenantId);

          const transaction = await client.createBankTransaction({
            type: args.type,
            contact: { contactID: args.contactId },
            bankAccount: { accountID: args.bankAccountId },
            lineItems: [
              {
                description: args.description,
                unitAmount: args.amount,
                accountCode: args.accountCode,
              },
            ],
            reference: args.reference,
            date: args.date,
          });

          return `Created ${args.type.toLowerCase()} transaction: ${transaction.BankTransactionID}\nAmount: ${transaction.CurrencyCode} ${transaction.Total}\nReference: ${transaction.Reference || 'None'}`;
        } catch (error) {
          return `Failed to create bank transaction: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    LIST_PAYMENTS: tool({
      name: 'list_payments',
      description:
        'Retrieve payments made to suppliers/vendors. Useful for tracking payment history and reconciliation.',
      schema: z.object({
        where: z
          .string()
          .optional()
          .describe('Filter expression (e.g. "Date >= DateTime(2024,01,01)")'),
        page: z.number().optional().describe('Page number for pagination'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, tenantId } = await context.getCredentials();
          const client = new XeroClient(accessToken, tenantId);
          const payments = await client.getPayments(args);

          if (payments.length === 0) {
            return 'No payments found';
          }

          return `Found ${payments.length} payments:\n${payments
            .map(
              (payment) =>
                `- ${payment.Date} | ${payment.CurrencyCode} ${payment.Amount} | ${payment.Reference || 'No reference'}\n  Account: ${payment.Account.Name} | Invoice: ${payment.Invoice?.InvoiceNumber || 'N/A'}`
            )
            .join('\n')}`;
        } catch (error) {
          return `Failed to retrieve payments: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    CREATE_PAYMENT: tool({
      name: 'create_payment',
      description:
        'Create a payment to a supplier/vendor for a specific invoice. Used for paying bills and managing vendor payments.',
      schema: z.object({
        invoiceId: z.string().describe('Invoice ID to pay'),
        bankAccountId: z.string().describe('Bank account ID to pay from'),
        amount: z.number().describe('Payment amount'),
        reference: z.string().optional().describe('Payment reference'),
        date: z.string().optional().describe('Payment date (YYYY-MM-DD)'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, tenantId } = await context.getCredentials();
          const client = new XeroClient(accessToken, tenantId);

          const payment = await client.createPayment({
            invoice: { invoiceID: args.invoiceId },
            account: { accountID: args.bankAccountId },
            amount: args.amount,
            reference: args.reference,
            date: args.date,
          });

          return `Created payment: ${payment.PaymentID}\nAmount: ${payment.CurrencyCode} ${payment.Amount}\nDate: ${payment.Date}\nReference: ${payment.Reference || 'None'}`;
        } catch (error) {
          return `Failed to create payment: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    LIST_INVOICES: tool({
      name: 'list_invoices',
      description:
        'Retrieve invoices for sending reminders or checking payment status. Supports filtering by status, contact, and date.',
      schema: z.object({
        where: z
          .string()
          .optional()
          .describe('Filter expression (e.g. "Contact.Name == \\"ABC Ltd\\"")'),
        statuses: z
          .array(z.enum(['DRAFT', 'SUBMITTED', 'AUTHORISED', 'PAID', 'VOIDED']))
          .optional()
          .describe('Filter by invoice statuses'),
        page: z.number().optional().describe('Page number for pagination'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, tenantId } = await context.getCredentials();
          const client = new XeroClient(accessToken, tenantId);
          const invoices = await client.getInvoices(args);

          if (invoices.length === 0) {
            return 'No invoices found';
          }

          return `Found ${invoices.length} invoices:\n${invoices
            .map(
              (invoice) =>
                `- ${invoice.InvoiceNumber || invoice.InvoiceID} | ${invoice.Contact.Name} | ${invoice.Status}\n  Amount: ${invoice.CurrencyCode} ${invoice.Total} | Due: ${invoice.DueDate || 'N/A'} | Outstanding: ${invoice.CurrencyCode} ${invoice.AmountDue}`
            )
            .join('\n')}`;
        } catch (error) {
          return `Failed to retrieve invoices: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    EMAIL_INVOICE: tool({
      name: 'email_invoice',
      description:
        'Send an invoice via email to the customer. Use for payment reminders and invoice delivery.',
      schema: z.object({
        invoiceId: z.string().describe('Invoice ID to email'),
        includeOnlineInvoice: z
          .boolean()
          .optional()
          .describe('Include online invoice link (default: true)'),
        includeAttachments: z
          .boolean()
          .optional()
          .describe('Include attachments (default: true)'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, tenantId } = await context.getCredentials();
          const client = new XeroClient(accessToken, tenantId);

          await client.emailInvoice(args.invoiceId, {
            includeOnlineInvoice: args.includeOnlineInvoice ?? true,
            includeAttachments: args.includeAttachments ?? true,
          });

          return `Successfully sent invoice ${args.invoiceId} via email`;
        } catch (error) {
          return `Failed to email invoice: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    LIST_CONTACTS: tool({
      name: 'list_contacts',
      description:
        'List contacts/suppliers/customers. Use for finding contact IDs and managing vendor relationships.',
      schema: z.object({
        where: z
          .string()
          .optional()
          .describe('Filter expression (e.g. "IsSupplier == true")'),
        includeArchived: z.boolean().optional().describe('Include archived contacts'),
        page: z.number().optional().describe('Page number for pagination'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, tenantId } = await context.getCredentials();
          const client = new XeroClient(accessToken, tenantId);
          const contacts = await client.getContacts(args);

          if (contacts.length === 0) {
            return 'No contacts found';
          }

          return `Found ${contacts.length} contacts:\n${contacts
            .map(
              (contact) =>
                `- ${contact.Name} (${contact.ContactID})\n  Email: ${contact.EmailAddress || 'N/A'} | Status: ${contact.ContactStatus} | Supplier: ${contact.IsSupplier ? 'Yes' : 'No'} | Customer: ${contact.IsCustomer ? 'Yes' : 'No'}`
            )
            .join('\n')}`;
        } catch (error) {
          return `Failed to retrieve contacts: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    LIST_ACCOUNTS: tool({
      name: 'list_accounts',
      description:
        'List chart of accounts including bank accounts. Use for getting account IDs for transactions and payments.',
      schema: z.object({
        where: z
          .string()
          .optional()
          .describe('Filter expression (e.g. "Type == \\"BANK\\"")'),
        page: z.number().optional().describe('Page number for pagination'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken, tenantId } = await context.getCredentials();
          const client = new XeroClient(accessToken, tenantId);
          const accounts = await client.getAccounts(args);

          if (accounts.length === 0) {
            return 'No accounts found';
          }

          return `Found ${accounts.length} accounts:\n${accounts
            .map(
              (account) =>
                `- ${account.Name} (${account.Code}) | ${account.AccountID}\n  Type: ${account.Type} | Bank Type: ${account.BankAccountType || 'N/A'} | Currency: ${account.CurrencyCode || 'N/A'}`
            )
            .join('\n')}`;
        } catch (error) {
          return `Failed to retrieve accounts: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GET_ORGANISATION: tool({
      name: 'get_organisation',
      description:
        'Get organization details and settings. Useful for understanding the Xero setup and configuration.',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { accessToken, tenantId } = await context.getCredentials();
          const client = new XeroClient(accessToken, tenantId);
          const organisation = await client.getOrganisation();

          return JSON.stringify(organisation, null, 2);
        } catch (error) {
          return `Failed to get organisation details: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { describe, expect, it, type vi } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { FreeAgentConnectorConfig } from './freeagent';

const mockCompanyResponse = {
  company: {
    type: 'UkLimitedCompany',
    currency: 'GBP',
    mileage_units: 'miles',
    company_start_date: '2010-07-01',
    sales_tax_registration_status: 'Registered',
  },
};

const mockContactsResponse = {
  contacts: [
    {
      url: 'https://api.freeagent.com/v2/contacts/1',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    },
  ],
};

const mockProjectsResponse = {
  projects: [
    {
      url: 'https://api.freeagent.com/v2/projects/1',
      contact: 'https://api.freeagent.com/v2/contacts/1',
      name: 'Test Project',
      status: 'Active',
      uses_project_invoice_sequence: false,
      currency: 'GBP',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    },
  ],
};

const mockInvoicesResponse = {
  invoices: [
    {
      url: 'https://api.freeagent.com/v2/invoices/1',
      contact: 'https://api.freeagent.com/v2/contacts/1',
      reference: 'INV-001',
      dated_on: '2023-01-01',
      due_on: '2023-01-31',
      net_value: '100.00',
      sales_tax_value: '20.00',
      total_value: '120.00',
      currency: 'GBP',
      status: 'Open',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    },
  ],
};

const mockBankAccountsResponse = {
  bank_accounts: [
    {
      url: 'https://api.freeagent.com/v2/bank_accounts/1',
      name: 'Main Business Account',
      type: 'BusinessCurrentAccount',
      currency: 'GBP',
      current_balance: '5000.00',
      bank_name: 'Test Bank',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    },
  ],
};

describe('FreeAgent Connector', () => {
  describe('GET_COMPANY', () => {
    it('should get company information', async () => {
      const server = setupServer(
        http.get('https://api.sandbox.freeagent.com/v2/company', () => {
          return HttpResponse.json(mockCompanyResponse);
        })
      );
      server.listen();

      const tool = FreeAgentConnectorConfig.tools.GET_COMPANY as MCPToolDefinition;
      const mockContext = createMockConnectorContext();
      (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
        accessToken: 'test-access-token',
        sandbox: true,
      });

      const result = await tool.handler({}, mockContext);

      server.close();

      expect(result).toContain('UkLimitedCompany');
      expect(result).toContain('GBP');
    });

    it('should handle API errors', async () => {
      const server = setupServer(
        http.get('https://api.sandbox.freeagent.com/v2/company', () => {
          return new HttpResponse('Unauthorized', { status: 401 });
        })
      );
      server.listen();

      const tool = FreeAgentConnectorConfig.tools.GET_COMPANY as MCPToolDefinition;
      const mockContext = createMockConnectorContext();
      (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
        accessToken: 'test-access-token',
        sandbox: true,
      });

      const result = await tool.handler({}, mockContext);

      server.close();

      expect(result).toContain('Failed to get company');
      expect(result).toContain('401 Unauthorized');
    });
  });

  describe('LIST_CONTACTS', () => {
    it('should list contacts with default parameters', async () => {
      const server = setupServer(
        http.get('https://api.sandbox.freeagent.com/v2/contacts', () => {
          return HttpResponse.json(mockContactsResponse);
        })
      );
      server.listen();

      const tool = FreeAgentConnectorConfig.tools.LIST_CONTACTS as MCPToolDefinition;
      const mockContext = createMockConnectorContext();
      (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
        accessToken: 'test-access-token',
        sandbox: true,
      });

      const result = await tool.handler({ view: 'active', sort: 'name' }, mockContext);

      server.close();

      expect(result).toContain('John');
      expect(result).toContain('Doe');
    });
  });

  describe('LIST_PROJECTS', () => {
    it('should list projects with filtering', async () => {
      const server = setupServer(
        http.get('https://api.sandbox.freeagent.com/v2/projects', () => {
          return HttpResponse.json(mockProjectsResponse);
        })
      );
      server.listen();

      const tool = FreeAgentConnectorConfig.tools.LIST_PROJECTS as MCPToolDefinition;
      const mockContext = createMockConnectorContext();
      (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
        accessToken: 'test-access-token',
        sandbox: true,
      });

      const result = await tool.handler({ view: 'completed', sort: 'name' }, mockContext);

      server.close();

      expect(result).toContain('Test Project');
      expect(result).toContain('Active');
    });
  });

  describe('LIST_INVOICES', () => {
    it('should list invoices with optional view filter', async () => {
      const server = setupServer(
        http.get('https://api.sandbox.freeagent.com/v2/invoices', () => {
          return HttpResponse.json(mockInvoicesResponse);
        })
      );
      server.listen();

      const tool = FreeAgentConnectorConfig.tools.LIST_INVOICES as MCPToolDefinition;
      const mockContext = createMockConnectorContext();
      (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
        accessToken: 'test-access-token',
        sandbox: true,
      });

      const result = await tool.handler({ view: 'open', sort: 'dated_on' }, mockContext);

      server.close();

      expect(result).toContain('INV-001');
      expect(result).toContain('120.00');
    });
  });

  describe('LIST_BANK_ACCOUNTS', () => {
    it('should list bank accounts', async () => {
      const server = setupServer(
        http.get('https://api.sandbox.freeagent.com/v2/bank_accounts', () => {
          return HttpResponse.json(mockBankAccountsResponse);
        })
      );
      server.listen();

      const tool = FreeAgentConnectorConfig.tools.LIST_BANK_ACCOUNTS as MCPToolDefinition;
      const mockContext = createMockConnectorContext();
      (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
        accessToken: 'test-access-token',
        sandbox: true,
      });

      const result = await tool.handler({}, mockContext);

      server.close();

      expect(result).toContain('Main Business Account');
      expect(result).toContain('5000.00');
    });
  });

  describe('Production vs Sandbox', () => {
    it('should use production URL when sandbox is false', async () => {
      const server = setupServer(
        http.get('https://api.freeagent.com/v2/company', () => {
          return HttpResponse.json(mockCompanyResponse);
        })
      );
      server.listen();

      const tool = FreeAgentConnectorConfig.tools.GET_COMPANY as MCPToolDefinition;
      const mockContext = createMockConnectorContext();
      (mockContext.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
        accessToken: 'test-access-token',
        sandbox: false,
      });

      const result = await tool.handler({}, mockContext);

      server.close();

      expect(result).toContain('UkLimitedCompany');
    });
  });
});

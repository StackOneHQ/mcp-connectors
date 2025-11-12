import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ConnectorMetadata } from '../types/metadata';

// LinkedIn API interfaces
interface LinkedInCompany {
  id: string;
  name: string;
  vanityName?: string;
  localizedName: string;
  localizedDescription?: string;
  websiteUrl?: string;
  staffCountRange?: {
    start: number;
    end?: number;
  };
  specialties?: string[];
  locations?: Array<{
    country: string;
    city?: string;
    geographicArea?: string;
  }>;
}

interface LinkedInOrganization {
  entityUrn: string;
  name: string;
  vanityName?: string;
  localizedName: string;
  localizedDescription?: string;
  websiteUrl?: string;
  staffCount?: number;
  organizationType?: string;
}

class LinkedInClient {
  private baseUrl = 'https://api.linkedin.com/v2';
  private accessToken: string;
  private tokenType: string;

  constructor(accessToken: string, tokenType = 'Bearer') {
    this.accessToken = accessToken;
    this.tokenType = tokenType;
  }

  private async authenticatedFetch(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const headers = new Headers(options.headers);
    headers.set('Authorization', `${this.tokenType} ${this.accessToken}`);
    headers.set('X-Restli-Protocol-Version', '2.0.0');
    headers.set('LinkedIn-Version', '202401');

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `LinkedIn API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response;
  }

  async searchCompanies(
    keywords: string,
    start = 0,
    count = 10
  ): Promise<{ companies: LinkedInCompany[]; total: number }> {
    const params = new URLSearchParams({
      keywords,
      start: start.toString(),
      count: count.toString(),
    });

    const response = await this.authenticatedFetch(
      `${this.baseUrl}/companySearch?${params}`
    );

    // LinkedIn API response structure is not fully documented, using any to handle dynamic response
    const data = (await response.json()) as {
      elements: LinkedInCompany[];
      paging: { total: number };
    };
    return {
      companies: data.elements || [],
      total: data.paging?.total || 0,
    };
  }

  async getCompany(companyId: string): Promise<LinkedInCompany> {
    const response = await this.authenticatedFetch(
      `${this.baseUrl}/companies/${companyId}`
    );

    return response.json() as Promise<LinkedInCompany>;
  }

  async getOrganization(organizationId: string): Promise<LinkedInOrganization> {
    const response = await this.authenticatedFetch(
      `${this.baseUrl}/organizations/${organizationId}`
    );

    return response.json() as Promise<LinkedInOrganization>;
  }

  async searchOrganizations(
    vanityName: string
  ): Promise<{ organizations: LinkedInOrganization[] }> {
    const params = new URLSearchParams({
      q: 'vanityName',
      vanityName,
    });

    const response = await this.authenticatedFetch(
      `${this.baseUrl}/organizations?${params}`
    );

    // LinkedIn API response structure is not fully documented, using any to handle dynamic response
    const data = (await response.json()) as {
      elements: LinkedInOrganization[];
    };
    return {
      organizations: data.elements || [],
    };
  }
}

export const LinkedinConnectorMetadata = {
  key: 'linkedin',
  name: 'LinkedIn',
  description: 'Professional networking',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/linkedin/filled/svg',
  examplePrompt: 'Post to LinkedIn',
  categories: ['social', 'professional'],
} as const satisfies ConnectorMetadata;

export interface LinkedInCredentials {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  tokenType?: string;
}

export function createLinkedInServer(credentials: LinkedInCredentials): McpServer {
  const server = new McpServer({
    name: 'LinkedIn',
    version: '1.0.0',
  });

  // Helper function to get access token (handles OAuth2 token fetching if needed)
  async function getAccessToken(): Promise<{ accessToken: string; tokenType: string }> {
    if (credentials.accessToken) {
      return {
        accessToken: credentials.accessToken,
        tokenType: credentials.tokenType || 'Bearer',
      };
    }

    // Fetch new token using client credentials flow
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
    });

    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `LinkedIn token request failed: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const tokenData = (await response.json()) as {
      access_token: string;
      token_type: string;
      expires_in: number;
    };

    // Update credentials for future use
    credentials.accessToken = tokenData.access_token;
    credentials.tokenType = tokenData.token_type || 'Bearer';

    return {
      accessToken: tokenData.access_token,
      tokenType: tokenData.token_type || 'Bearer',
    };
  }

  server.tool(
    'linkedin_search_companies',
    'Search for companies on LinkedIn',
    {
      keywords: z.string().describe('Search keywords'),
      start: z.number().optional().default(0).describe('Starting index for pagination'),
      count: z.number().optional().default(10).describe('Number of results to return'),
    },
    async (args) => {
      try {
        const { accessToken, tokenType } = await getAccessToken();
        const client = new LinkedInClient(accessToken, tokenType);
        const result = await client.searchCompanies(
          args.keywords,
          args.start,
          args.count
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
              text: `Failed to search companies: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'linkedin_get_company',
    'Get detailed information about a LinkedIn company',
    {
      companyId: z.string().describe('LinkedIn company ID'),
    },
    async (args) => {
      try {
        const { accessToken, tokenType } = await getAccessToken();
        const client = new LinkedInClient(accessToken, tokenType);
        const company = await client.getCompany(args.companyId);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(company, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get company: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'linkedin_search_organizations',
    'Search for organizations by vanity name',
    {
      vanityName: z.string().describe('Organization vanity name (e.g., "microsoft")'),
    },
    async (args) => {
      try {
        const { accessToken, tokenType } = await getAccessToken();
        const client = new LinkedInClient(accessToken, tokenType);
        const result = await client.searchOrganizations(args.vanityName);

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
              text: `Failed to search organizations: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'linkedin_get_organization',
    'Get detailed information about a LinkedIn organization',
    {
      organizationId: z.string().describe('LinkedIn organization ID'),
    },
    async (args) => {
      try {
        const { accessToken, tokenType } = await getAccessToken();
        const client = new LinkedInClient(accessToken, tokenType);
        const organization = await client.getOrganization(args.organizationId);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(organization, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get organization: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  return server;
}

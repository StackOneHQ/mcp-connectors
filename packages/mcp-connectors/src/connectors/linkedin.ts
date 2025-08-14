import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

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

// LinkedIn OAuth2 Configuration for Client Credentials Flow (2-legged OAuth)
const LINKEDIN_OAUTH2_CONFIG = {
  tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
  scopes: [], // Client credentials flow doesn't use scopes in the same way
} as const;

// OAuth2 credentials schema for LinkedIn
const linkedInOAuth2Schema = z.object({
  accessToken: z.string().describe('OAuth2 access token'),
  tokenType: z.string().default('Bearer').describe('Token type'),
  expiresAt: z.number().optional().describe('Token expiration timestamp'),
});

type LinkedInOAuth2Credentials = z.infer<typeof linkedInOAuth2Schema>;

class LinkedInClient {
  private baseUrl = 'https://api.linkedin.com/v2';
  private oauth2Credentials: LinkedInOAuth2Credentials;

  constructor(oauth2Credentials: LinkedInOAuth2Credentials) {
    this.oauth2Credentials = oauth2Credentials;
  }

  private async authenticatedFetch(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const headers = new Headers(options.headers);
    headers.set(
      'Authorization',
      `${this.oauth2Credentials.tokenType} ${this.oauth2Credentials.accessToken}`
    );
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

// Connector configuration
export const LinkedInConnectorConfig = mcpConnectorConfig({
  name: 'LinkedIn',
  key: 'linkedin',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/linkedin/filled/svg',
  credentials: z.object({
    clientId: z.string().describe('LinkedIn OAuth2 Client ID :: 861abc123def45'),
    clientSecret: z
      .string()
      .describe('LinkedIn OAuth2 Client Secret :: AbCdEfGhIjKlMnOp'),
  }),
  setup: z.object({}),
  oauth2: {
    schema: linkedInOAuth2Schema,
    token: async (credentials) => {
      // LinkedIn Client Credentials Flow (2-legged OAuth)
      const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
      });

      const response = await fetch(LINKEDIN_OAUTH2_CONFIG.tokenUrl, {
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

      // OAuth2 token response structure varies by provider, using any for flexibility
      const tokenData = (await response.json()) as {
        access_token: string;
        token_type: string;
        expires_in: number;
      };

      return {
        accessToken: tokenData.access_token,
        tokenType: tokenData.token_type || 'Bearer',
        expiresAt: tokenData.expires_in
          ? Date.now() + tokenData.expires_in * 1000
          : undefined,
      };
    },
    refresh: async (credentials, _oauth2) => {
      // LinkedIn Client Credentials Flow doesn't support refresh tokens
      // When the token expires, we need to request a new one
      const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
      });

      const response = await fetch(LINKEDIN_OAUTH2_CONFIG.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `LinkedIn token refresh failed: ${response.status} ${response.statusText}. ${errorText}`
        );
      }

      // OAuth2 token response structure varies by provider, using any for flexibility
      const tokenData = (await response.json()) as {
        access_token: string;
        token_type: string;
        expires_in: number;
      };

      return {
        accessToken: tokenData.access_token,
        tokenType: tokenData.token_type || 'Bearer',
        expiresAt: tokenData.expires_in
          ? Date.now() + tokenData.expires_in * 1000
          : undefined,
      };
    },
  },
  tools: (tool) => ({
    SEARCH_COMPANIES: tool({
      name: 'linkedin_search_companies',
      description: 'Search for companies on LinkedIn',
      schema: z.object({
        keywords: z.string().describe('Search keywords'),
        start: z.number().optional().default(0).describe('Starting index for pagination'),
        count: z.number().optional().default(10).describe('Number of results to return'),
      }),
      handler: async (args, context) => {
        const oauth2Raw = await context.getOauth2Credentials?.();
        if (!oauth2Raw) {
          throw new Error('OAuth2 credentials not available');
        }

        // Parse the raw OAuth2 credentials to ensure they match our schema
        const oauth2 = linkedInOAuth2Schema.parse(oauth2Raw);

        const client = new LinkedInClient(oauth2);
        const result = await client.searchCompanies(
          args.keywords,
          args.start,
          args.count
        );

        return JSON.stringify(result, null, 2);
      },
    }),
    GET_COMPANY: tool({
      name: 'linkedin_get_company',
      description: 'Get detailed information about a LinkedIn company',
      schema: z.object({
        companyId: z.string().describe('LinkedIn company ID'),
      }),
      handler: async (args, context) => {
        const oauth2Raw = await context.getOauth2Credentials?.();
        if (!oauth2Raw) {
          throw new Error('OAuth2 credentials not available');
        }

        // Parse the raw OAuth2 credentials to ensure they match our schema
        const oauth2 = linkedInOAuth2Schema.parse(oauth2Raw);

        const client = new LinkedInClient(oauth2);
        const company = await client.getCompany(args.companyId);

        return JSON.stringify(company, null, 2);
      },
    }),
    SEARCH_ORGANIZATIONS: tool({
      name: 'linkedin_search_organizations',
      description: 'Search for organizations by vanity name',
      schema: z.object({
        vanityName: z.string().describe('Organization vanity name (e.g., "microsoft")'),
      }),
      handler: async (args, context) => {
        const oauth2Raw = await context.getOauth2Credentials?.();
        if (!oauth2Raw) {
          throw new Error('OAuth2 credentials not available');
        }

        // Parse the raw OAuth2 credentials to ensure they match our schema
        const oauth2 = linkedInOAuth2Schema.parse(oauth2Raw);

        const client = new LinkedInClient(oauth2);
        const result = await client.searchOrganizations(args.vanityName);

        return JSON.stringify(result, null, 2);
      },
    }),
    GET_ORGANIZATION: tool({
      name: 'linkedin_get_organization',
      description: 'Get detailed information about a LinkedIn organization',
      schema: z.object({
        organizationId: z.string().describe('LinkedIn organization ID'),
      }),
      handler: async (args, context) => {
        const oauth2Raw = await context.getOauth2Credentials?.();
        if (!oauth2Raw) {
          throw new Error('OAuth2 credentials not available');
        }

        // Parse the raw OAuth2 credentials to ensure they match our schema
        const oauth2 = linkedInOAuth2Schema.parse(oauth2Raw);

        const client = new LinkedInClient(oauth2);
        const organization = await client.getOrganization(args.organizationId);

        return JSON.stringify(organization, null, 2);
      },
    }),
  }),
  examplePrompt: 'Search for companies related to "artificial intelligence" on LinkedIn',
});

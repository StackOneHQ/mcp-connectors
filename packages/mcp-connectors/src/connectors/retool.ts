import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ConnectorMetadata } from '../types/metadata';

interface RetoolUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  lastActiveAt?: string;
  metadata?: Record<string, unknown>;
}

interface RetoolGroup {
  id: string;
  name: string;
  description?: string;
  members: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface RetoolFolder {
  id: string;
  name: string;
  parentId?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RetoolApp {
  id: string;
  name: string;
  folderId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

interface RetoolPermission {
  subject: {
    id: string;
    type: 'user' | 'group';
    name: string;
  };
  accessLevel: 'viewer' | 'editor' | 'admin';
}

interface RetoolCustomComponentLibrary {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  latestRevision?: {
    id: string;
    version: string;
    createdAt: string;
    description?: string;
  };
}

interface RetoolCustomComponentRevision {
  id: string;
  version: string;
  description?: string;
  createdAt: string;
  files?: Array<{
    name: string;
    content: string;
    size: number;
  }>;
}

class RetoolClient {
  private headers: { Authorization: string; Accept: string; 'Content-Type': string };
  private baseUrl: string;

  constructor(apiToken: string, baseUrl?: string) {
    this.headers = {
      Authorization: `Bearer ${apiToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    this.baseUrl = baseUrl || 'https://api.retool.com/api/v2';
  }

  async getUsers(limit = 50): Promise<RetoolUser[]> {
    const response = await fetch(`${this.baseUrl}/users?limit=${limit}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Retool API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: RetoolUser[] };
    return result.data;
  }

  async getUser(userId: string): Promise<RetoolUser> {
    const response = await fetch(`${this.baseUrl}/users/${userId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Retool API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: RetoolUser };
    return result.data;
  }

  async createUser(data: {
    email: string;
    firstName?: string;
    lastName?: string;
    isAdmin?: boolean;
    metadata?: Record<string, unknown>;
  }): Promise<RetoolUser> {
    const response = await fetch(`${this.baseUrl}/users`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Retool API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: RetoolUser };
    return result.data;
  }

  async updateUser(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      isAdmin?: boolean;
      metadata?: Record<string, unknown>;
    }
  ): Promise<RetoolUser> {
    const response = await fetch(`${this.baseUrl}/users/${userId}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Retool API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: RetoolUser };
    return result.data;
  }

  async deleteUser(userId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/users/${userId}`, {
      method: 'DELETE',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Retool API error: ${response.status} ${response.statusText}`);
    }

    return { success: true };
  }

  async getGroups(limit = 50): Promise<RetoolGroup[]> {
    const response = await fetch(`${this.baseUrl}/groups?limit=${limit}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Retool API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: RetoolGroup[] };
    return result.data;
  }

  async getGroup(groupId: string): Promise<RetoolGroup> {
    const response = await fetch(`${this.baseUrl}/groups/${groupId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Retool API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: RetoolGroup };
    return result.data;
  }

  async createGroup(data: {
    name: string;
    description?: string;
    members?: string[];
  }): Promise<RetoolGroup> {
    const response = await fetch(`${this.baseUrl}/groups`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Retool API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: RetoolGroup };
    return result.data;
  }

  async updateGroup(
    groupId: string,
    data: {
      name?: string;
      description?: string;
      members?: string[];
    }
  ): Promise<RetoolGroup> {
    const response = await fetch(`${this.baseUrl}/groups/${groupId}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Retool API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: RetoolGroup };
    return result.data;
  }

  async deleteGroup(groupId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/groups/${groupId}`, {
      method: 'DELETE',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Retool API error: ${response.status} ${response.statusText}`);
    }

    return { success: true };
  }

  async getFolders(limit = 50): Promise<RetoolFolder[]> {
    const response = await fetch(`${this.baseUrl}/folders?limit=${limit}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Retool API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: RetoolFolder[] };
    return result.data;
  }

  async createFolder(data: {
    name: string;
    parentId?: string;
  }): Promise<RetoolFolder> {
    const response = await fetch(`${this.baseUrl}/folders`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Retool API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: RetoolFolder };
    return result.data;
  }

  async getApps(folderId?: string, limit = 50): Promise<RetoolApp[]> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (folderId) {
      params.append('folderId', folderId);
    }

    const response = await fetch(`${this.baseUrl}/apps?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Retool API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: RetoolApp[] };
    return result.data;
  }

  async getAppPermissions(appId: string): Promise<RetoolPermission[]> {
    const response = await fetch(`${this.baseUrl}/apps/${appId}/permissions`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Retool API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: RetoolPermission[] };
    return result.data;
  }

  async getFolderPermissions(folderId: string): Promise<RetoolPermission[]> {
    const response = await fetch(`${this.baseUrl}/folders/${folderId}/permissions`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Retool API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: RetoolPermission[] };
    return result.data;
  }

  async updateAppPermissions(
    appId: string,
    permissions: Array<{
      subjectId: string;
      subjectType: 'user' | 'group';
      accessLevel: 'viewer' | 'editor' | 'admin';
    }>
  ): Promise<RetoolPermission[]> {
    const response = await fetch(`${this.baseUrl}/apps/${appId}/permissions`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify({ permissions }),
    });

    if (!response.ok) {
      throw new Error(`Retool API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: RetoolPermission[] };
    return result.data;
  }

  async getCustomComponentLibraries(): Promise<RetoolCustomComponentLibrary[]> {
    const response = await fetch(`${this.baseUrl}/custom_component_libraries`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Retool API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: RetoolCustomComponentLibrary[] };
    return result.data;
  }

  async getCustomComponentLibrary(
    libraryId: string
  ): Promise<RetoolCustomComponentLibrary> {
    const response = await fetch(
      `${this.baseUrl}/custom_component_libraries/${libraryId}`,
      {
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(`Retool API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: RetoolCustomComponentLibrary };
    return result.data;
  }

  async createCustomComponentLibrary(data: {
    name: string;
    description?: string;
  }): Promise<RetoolCustomComponentLibrary> {
    const response = await fetch(`${this.baseUrl}/custom_component_libraries`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Retool API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: RetoolCustomComponentLibrary };
    return result.data;
  }

  async updateCustomComponentLibrary(
    libraryId: string,
    data: {
      name?: string;
      description?: string;
    }
  ): Promise<RetoolCustomComponentLibrary> {
    const response = await fetch(
      `${this.baseUrl}/custom_component_libraries/${libraryId}`,
      {
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      throw new Error(`Retool API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: RetoolCustomComponentLibrary };
    return result.data;
  }

  async deleteCustomComponentLibrary(libraryId: string): Promise<{ success: boolean }> {
    const response = await fetch(
      `${this.baseUrl}/custom_component_libraries/${libraryId}`,
      {
        method: 'DELETE',
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(`Retool API error: ${response.status} ${response.statusText}`);
    }

    return { success: true };
  }

  async getCustomComponentRevisions(
    libraryId: string,
    limit = 50
  ): Promise<RetoolCustomComponentRevision[]> {
    const response = await fetch(
      `${this.baseUrl}/custom_component_libraries/${libraryId}/revisions?limit=${limit}`,
      {
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(`Retool API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: RetoolCustomComponentRevision[] };
    return result.data;
  }

  async createCustomComponentRevision(
    libraryId: string,
    data: {
      version: string;
      description?: string;
      files: Array<{
        name: string;
        content: string;
      }>;
    }
  ): Promise<RetoolCustomComponentRevision> {
    const response = await fetch(
      `${this.baseUrl}/custom_component_libraries/${libraryId}/revisions`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      throw new Error(`Retool API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { data: RetoolCustomComponentRevision };
    return result.data;
  }

  async getCustomComponentRevisionFiles(
    libraryId: string,
    revisionId: string
  ): Promise<Array<{ name: string; content: string; size: number }>> {
    const response = await fetch(
      `${this.baseUrl}/custom_component_libraries/${libraryId}/revisions/${revisionId}/files`,
      {
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(`Retool API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as {
      data: Array<{ name: string; content: string; size: number }>;
    };
    return result.data;
  }
}

export const RetoolCredentialsSchema = z.object({
  apiToken: z.string().describe('API token for authentication'),
  baseUrl: z.string().describe('Base URL of the instance').optional(),
});

export type RetoolCredentials = z.infer<typeof RetoolCredentialsSchema>;

export const RetoolConnectorMetadata = {
  key: 'retool',
  name: 'Retool',
  description: 'Internal tool builder',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/retool/filled/svg',
  examplePrompt: 'Query Retool resources',
  categories: ['internal-tools', 'development'],
  credentialsSchema: RetoolCredentialsSchema,
} as const satisfies ConnectorMetadata;

export function createRetoolServer(credentials: RetoolCredentials): McpServer {
  const server = new McpServer({
    name: 'Retool',
    version: '1.0.0',
  });

  const client = new RetoolClient(credentials.apiToken, credentials.baseUrl);

  server.tool(
    'retool_list_users',
    'List all users in the organization',
    {
      limit: z.number().default(50).describe('Maximum number of users to return'),
    },
    async (args) => {
      try {
        const users = await client.getUsers(args.limit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(users, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to list users: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'retool_get_user',
    'Get detailed information about a specific user',
    {
      userId: z.string().describe('User ID to retrieve'),
    },
    async (args) => {
      try {
        const user = await client.getUser(args.userId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(user, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get user: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'retool_create_user',
    'Create a new user in the organization',
    {
      email: z.string().email().describe('User email address'),
      firstName: z.string().optional().describe('User first name'),
      lastName: z.string().optional().describe('User last name'),
      isAdmin: z.boolean().optional().describe('Whether the user should be an admin'),
      metadata: z.record(z.unknown()).optional().describe('Additional user metadata'),
    },
    async (args) => {
      try {
        const user = await client.createUser(args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(user, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to create user: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'retool_update_user',
    'Update an existing user',
    {
      userId: z.string().describe('User ID to update'),
      firstName: z.string().optional().describe('New first name'),
      lastName: z.string().optional().describe('New last name'),
      isAdmin: z.boolean().optional().describe('Whether the user should be an admin'),
      metadata: z.record(z.unknown()).optional().describe('Updated user metadata'),
    },
    async (args) => {
      try {
        const { userId, ...updateData } = args;
        const user = await client.updateUser(userId, updateData);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(user, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to update user: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'retool_delete_user',
    'Delete a user from the organization',
    {
      userId: z.string().describe('User ID to delete'),
    },
    async (args) => {
      try {
        const result = await client.deleteUser(args.userId);
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
              text: `Failed to delete user: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'retool_list_groups',
    'List all groups in the organization',
    {
      limit: z.number().default(50).describe('Maximum number of groups to return'),
    },
    async (args) => {
      try {
        const groups = await client.getGroups(args.limit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(groups, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to list groups: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'retool_get_group',
    'Get detailed information about a specific group',
    {
      groupId: z.string().describe('Group ID to retrieve'),
    },
    async (args) => {
      try {
        const group = await client.getGroup(args.groupId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(group, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get group: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'retool_create_group',
    'Create a new group in the organization',
    {
      name: z.string().describe('Group name'),
      description: z.string().optional().describe('Group description'),
      members: z
        .array(z.string())
        .optional()
        .describe('Array of user IDs to add as members'),
    },
    async (args) => {
      try {
        const group = await client.createGroup(args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(group, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to create group: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'retool_update_group',
    'Update an existing group',
    {
      groupId: z.string().describe('Group ID to update'),
      name: z.string().optional().describe('New group name'),
      description: z.string().optional().describe('New group description'),
      members: z
        .array(z.string())
        .optional()
        .describe('Array of user IDs to set as group members'),
    },
    async (args) => {
      try {
        const { groupId, ...updateData } = args;
        const group = await client.updateGroup(groupId, updateData);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(group, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to update group: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'retool_delete_group',
    'Delete a group from the organization',
    {
      groupId: z.string().describe('Group ID to delete'),
    },
    async (args) => {
      try {
        const result = await client.deleteGroup(args.groupId);
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
              text: `Failed to delete group: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'retool_list_folders',
    'List all folders in the organization',
    {
      limit: z.number().default(50).describe('Maximum number of folders to return'),
    },
    async (args) => {
      try {
        const folders = await client.getFolders(args.limit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(folders, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to list folders: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'retool_create_folder',
    'Create a new folder',
    {
      name: z.string().describe('Folder name'),
      parentId: z.string().optional().describe('Parent folder ID'),
    },
    async (args) => {
      try {
        const folder = await client.createFolder(args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(folder, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to create folder: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'retool_list_apps',
    'List all apps in the organization or in a specific folder',
    {
      folderId: z.string().optional().describe('Filter apps by folder ID'),
      limit: z.number().default(50).describe('Maximum number of apps to return'),
    },
    async (args) => {
      try {
        const apps = await client.getApps(args.folderId, args.limit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(apps, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to list apps: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'retool_get_app_permissions',
    'Get permissions for a specific app',
    {
      appId: z.string().describe('App ID to get permissions for'),
    },
    async (args) => {
      try {
        const permissions = await client.getAppPermissions(args.appId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(permissions, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get app permissions: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'retool_get_folder_permissions',
    'Get permissions for a specific folder',
    {
      folderId: z.string().describe('Folder ID to get permissions for'),
    },
    async (args) => {
      try {
        const permissions = await client.getFolderPermissions(args.folderId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(permissions, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get folder permissions: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'retool_update_app_permissions',
    'Update permissions for a specific app',
    {
      appId: z.string().describe('App ID to update permissions for'),
      permissions: z
        .array(
          z.object({
            subjectId: z.string().describe('User or group ID'),
            subjectType: z.enum(['user', 'group']).describe('Type of subject'),
            accessLevel: z
              .enum(['viewer', 'editor', 'admin'])
              .describe('Access level to grant'),
          })
        )
        .describe('Array of permission updates'),
    },
    async (args) => {
      try {
        const permissions = await client.updateAppPermissions(
          args.appId,
          args.permissions
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(permissions, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to update app permissions: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'retool_list_custom_component_libraries',
    'List all custom component libraries in the organization',
    {},
    async () => {
      try {
        const libraries = await client.getCustomComponentLibraries();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(libraries, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to list custom component libraries: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'retool_get_custom_component_library',
    'Get detailed information about a specific custom component library',
    {
      libraryId: z.string().describe('Library ID to retrieve'),
    },
    async (args) => {
      try {
        const library = await client.getCustomComponentLibrary(args.libraryId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(library, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get custom component library: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'retool_create_custom_component_library',
    'Create a new custom component library',
    {
      name: z.string().describe('Library name'),
      description: z.string().optional().describe('Library description'),
    },
    async (args) => {
      try {
        const library = await client.createCustomComponentLibrary(args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(library, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to create custom component library: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'retool_update_custom_component_library',
    'Update an existing custom component library',
    {
      libraryId: z.string().describe('Library ID to update'),
      name: z.string().optional().describe('New library name'),
      description: z.string().optional().describe('New library description'),
    },
    async (args) => {
      try {
        const { libraryId, ...updateData } = args;
        const library = await client.updateCustomComponentLibrary(libraryId, updateData);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(library, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to update custom component library: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'retool_delete_custom_component_library',
    'Delete a custom component library',
    {
      libraryId: z.string().describe('Library ID to delete'),
    },
    async (args) => {
      try {
        const result = await client.deleteCustomComponentLibrary(args.libraryId);
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
              text: `Failed to delete custom component library: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'retool_list_custom_component_revisions',
    'List all revisions for a custom component library',
    {
      libraryId: z.string().describe('Library ID to get revisions for'),
      limit: z.number().default(50).describe('Maximum number of revisions to return'),
    },
    async (args) => {
      try {
        const revisions = await client.getCustomComponentRevisions(
          args.libraryId,
          args.limit
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(revisions, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to list custom component revisions: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'retool_create_custom_component_revision',
    'Create a new revision for a custom component library',
    {
      libraryId: z.string().describe('Library ID to create revision for'),
      version: z.string().describe('Revision version (e.g., "1.0.0")'),
      description: z.string().optional().describe('Revision description'),
      files: z
        .array(
          z.object({
            name: z.string().describe('File name (e.g., "index.js", "package.json")'),
            content: z.string().describe('File content'),
          })
        )
        .describe('Array of files to include in this revision'),
    },
    async (args) => {
      try {
        const { libraryId, ...revisionData } = args;
        const revision = await client.createCustomComponentRevision(
          libraryId,
          revisionData
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(revision, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to create custom component revision: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'retool_get_custom_component_revision_files',
    'Get files for a specific custom component library revision',
    {
      libraryId: z.string().describe('Library ID'),
      revisionId: z.string().describe('Revision ID to get files for'),
    },
    async (args) => {
      try {
        const files = await client.getCustomComponentRevisionFiles(
          args.libraryId,
          args.revisionId
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(files, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get custom component revision files: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  return server;
}

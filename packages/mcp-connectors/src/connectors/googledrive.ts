import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  kind: string;
  size?: string;
  parents?: string[];
  createdTime: string;
  modifiedTime: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  shared?: boolean;
  trashed?: boolean;
  capabilities?: {
    canEdit?: boolean;
    canDelete?: boolean;
    canShare?: boolean;
  };
  permissions?: Array<{
    id: string;
    type: string;
    role: string;
    emailAddress?: string;
  }>;
}

interface GoogleDriveAbout {
  user: {
    displayName: string;
    emailAddress: string;
    photoLink?: string;
  };
  storageQuota: {
    limit: string;
    usage: string;
    usageInDrive: string;
    usageInDriveTrash: string;
  };
}

interface GoogleDrivePermission {
  id: string;
  type: string;
  role: string;
  emailAddress?: string;
  domain?: string;
  displayName?: string;
  photoLink?: string;
}

class GoogleDriveClient {
  private headers: { Authorization: string; Accept: string };
  private baseUrl = 'https://www.googleapis.com/drive/v3';

  constructor(accessToken: string) {
    this.headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    };
  }

  async getAbout(): Promise<GoogleDriveAbout> {
    const response = await fetch(`${this.baseUrl}/about?fields=user,storageQuota`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(
        `Google Drive API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json() as Promise<GoogleDriveAbout>;
  }

  async listFiles(
    query?: string,
    pageSize = 100,
    orderBy?: string,
    pageToken?: string
  ): Promise<{ files: GoogleDriveFile[]; nextPageToken?: string }> {
    const params = new URLSearchParams({
      pageSize: pageSize.toString(),
      fields:
        'nextPageToken,files(id,name,mimeType,size,parents,createdTime,modifiedTime,webViewLink,webContentLink,iconLink,thumbnailLink,shared,trashed,capabilities,permissions)',
    });

    if (query) {
      params.append('q', query);
    }
    if (orderBy) {
      params.append('orderBy', orderBy);
    }
    if (pageToken) {
      params.append('pageToken', pageToken);
    }

    const response = await fetch(`${this.baseUrl}/files?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(
        `Google Drive API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json() as Promise<{
      files: GoogleDriveFile[];
      nextPageToken?: string;
    }>;
  }

  async getFile(fileId: string, includePermissions = false): Promise<GoogleDriveFile> {
    const fields = includePermissions
      ? 'id,name,mimeType,size,parents,createdTime,modifiedTime,webViewLink,webContentLink,iconLink,thumbnailLink,shared,trashed,capabilities,permissions'
      : 'id,name,mimeType,size,parents,createdTime,modifiedTime,webViewLink,webContentLink,iconLink,thumbnailLink,shared,trashed,capabilities';

    const response = await fetch(`${this.baseUrl}/files/${fileId}?fields=${fields}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(
        `Google Drive API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json() as Promise<GoogleDriveFile>;
  }

  async downloadFile(fileId: string): Promise<ArrayBuffer> {
    const response = await fetch(`${this.baseUrl}/files/${fileId}?alt=media`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(
        `Google Drive API error: ${response.status} ${response.statusText}`
      );
    }

    return response.arrayBuffer();
  }

  async getFileContent(fileId: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/files/${fileId}?alt=media`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(
        `Google Drive API error: ${response.status} ${response.statusText}`
      );
    }

    return response.text();
  }

  async createFile(data: {
    name: string;
    parents?: string[];
    mimeType?: string;
    content?: string;
  }): Promise<GoogleDriveFile> {
    const metadata = {
      name: data.name,
      parents: data.parents,
      mimeType: data.mimeType,
    };

    let response: Response;

    if (data.content) {
      const formData = new FormData();
      formData.append('metadata', JSON.stringify(metadata));
      formData.append(
        'file',
        new Blob([data.content], { type: data.mimeType || 'text/plain' })
      );

      response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            Authorization: this.headers.Authorization,
          },
          body: formData,
        }
      );
    } else {
      response = await fetch(`${this.baseUrl}/files`, {
        method: 'POST',
        headers: {
          ...this.headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      });
    }

    if (!response.ok) {
      throw new Error(
        `Google Drive API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json() as Promise<GoogleDriveFile>;
  }

  async updateFile(
    fileId: string,
    data: {
      name?: string;
      content?: string;
      mimeType?: string;
    }
  ): Promise<GoogleDriveFile> {
    if (data.content) {
      const metadata = {
        name: data.name,
      };

      const formData = new FormData();
      formData.append('metadata', JSON.stringify(metadata));
      formData.append(
        'file',
        new Blob([data.content], { type: data.mimeType || 'text/plain' })
      );

      const response = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`,
        {
          method: 'PATCH',
          headers: {
            Authorization: this.headers.Authorization,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(
          `Google Drive API error: ${response.status} ${response.statusText}`
        );
      }

      return response.json() as Promise<GoogleDriveFile>;
    }
    const response = await fetch(`${this.baseUrl}/files/${fileId}`, {
      method: 'PATCH',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: data.name,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Google Drive API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json() as Promise<GoogleDriveFile>;
  }

  async deleteFile(fileId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/files/${fileId}`, {
      method: 'DELETE',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(
        `Google Drive API error: ${response.status} ${response.statusText}`
      );
    }

    return { success: true };
  }

  async copyFile(
    fileId: string,
    name: string,
    parents?: string[]
  ): Promise<GoogleDriveFile> {
    const response = await fetch(`${this.baseUrl}/files/${fileId}/copy`, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        parents,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Google Drive API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json() as Promise<GoogleDriveFile>;
  }

  async createFolder(name: string, parentId?: string): Promise<GoogleDriveFile> {
    const response = await fetch(`${this.baseUrl}/files`, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : undefined,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Google Drive API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json() as Promise<GoogleDriveFile>;
  }

  async shareFile(
    fileId: string,
    data: {
      type: 'user' | 'group' | 'domain' | 'anyone';
      role: 'owner' | 'organizer' | 'fileOrganizer' | 'writer' | 'commenter' | 'reader';
      emailAddress?: string;
      domain?: string;
    }
  ): Promise<GoogleDrivePermission> {
    const response = await fetch(`${this.baseUrl}/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(
        `Google Drive API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json() as Promise<GoogleDrivePermission>;
  }

  async listPermissions(fileId: string): Promise<GoogleDrivePermission[]> {
    const response = await fetch(`${this.baseUrl}/files/${fileId}/permissions`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(
        `Google Drive API error: ${response.status} ${response.statusText}`
      );
    }

    const result = (await response.json()) as GoogleDrivePermission[];
    return result;
  }

  async removePermission(
    fileId: string,
    permissionId: string
  ): Promise<{ success: boolean }> {
    const response = await fetch(
      `${this.baseUrl}/files/${fileId}/permissions/${permissionId}`,
      {
        method: 'DELETE',
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(
        `Google Drive API error: ${response.status} ${response.statusText}`
      );
    }

    return { success: true };
  }
}

export const GoogleDriveConnectorConfig = mcpConnectorConfig({
  name: 'Google Drive',
  key: 'googledrive',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/google-drive/filled/svg',
  credentials: z.object({
    accessToken: z
      .string()
      .describe(
        'Google OAuth 2.0 Access Token with Drive API scope. Get from OAuth 2.0 Playground: Go to https://developers.google.com/oauthplayground/ → Select Drive API v3 scopes (https://www.googleapis.com/auth/drive) → Authorize APIs → Sign in with Google account → Exchange authorization code for tokens → Copy the Access Token value. Note: Token expires after 1 hour. :: ya29.a0AfH6SMBa1234567890abcdefghijklmnopqrstuvwxyz'
      ),
  }),
  setup: z.object({}),
  examplePrompt:
    'List all files in my Drive, create a new document called "Meeting Notes", and share it with my team member at john@company.com with edit permissions.',
  tools: (tool) => ({
    GET_ABOUT: tool({
      name: 'googledrive_get_about',
      description: 'Get information about the user and their Drive storage',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new GoogleDriveClient(accessToken);
          const about = await client.getAbout();
          return JSON.stringify(about, null, 2);
        } catch (error) {
          return `Failed to get Drive info: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_FILES: tool({
      name: 'googledrive_list_files',
      description: 'List files and folders in Google Drive',
      schema: z.object({
        query: z
          .string()
          .optional()
          .describe(
            'Search query (e.g., \'name contains "test"\', \'mimeType="image/jpeg"\')'
          ),
        pageSize: z.number().default(100).describe('Number of files to return per page'),
        orderBy: z
          .string()
          .optional()
          .describe('Sort order (e.g., "name", "modifiedTime desc", "createdTime")'),
        pageToken: z.string().optional().describe('Token for pagination'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new GoogleDriveClient(accessToken);
          const result = await client.listFiles(
            args.query,
            args.pageSize,
            args.orderBy,
            args.pageToken
          );
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to list files: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_FILE: tool({
      name: 'googledrive_get_file',
      description: 'Get metadata for a specific file or folder',
      schema: z.object({
        fileId: z.string().describe('File ID'),
        includePermissions: z
          .boolean()
          .default(false)
          .describe('Include file sharing permissions'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new GoogleDriveClient(accessToken);
          const file = await client.getFile(args.fileId, args.includePermissions);
          return JSON.stringify(file, null, 2);
        } catch (error) {
          return `Failed to get file: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_FILE_CONTENT: tool({
      name: 'googledrive_get_file_content',
      description: 'Download and return the text content of a file',
      schema: z.object({
        fileId: z.string().describe('File ID'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new GoogleDriveClient(accessToken);
          const content = await client.getFileContent(args.fileId);
          return content;
        } catch (error) {
          return `Failed to get file content: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    CREATE_FILE: tool({
      name: 'googledrive_create_file',
      description: 'Create a new file in Google Drive',
      schema: z.object({
        name: z.string().describe('File name'),
        content: z.string().optional().describe('File content (for text files)'),
        mimeType: z.string().optional().describe('MIME type of the file'),
        parentId: z.string().optional().describe('Parent folder ID'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new GoogleDriveClient(accessToken);
          const file = await client.createFile({
            name: args.name,
            content: args.content,
            mimeType: args.mimeType,
            parents: args.parentId ? [args.parentId] : undefined,
          });
          return JSON.stringify(file, null, 2);
        } catch (error) {
          return `Failed to create file: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    UPDATE_FILE: tool({
      name: 'googledrive_update_file',
      description: 'Update a file in Google Drive',
      schema: z.object({
        fileId: z.string().describe('File ID'),
        name: z.string().optional().describe('New file name'),
        content: z.string().optional().describe('New file content (for text files)'),
        mimeType: z.string().optional().describe('MIME type of the file'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new GoogleDriveClient(accessToken);
          const file = await client.updateFile(args.fileId, {
            name: args.name,
            content: args.content,
            mimeType: args.mimeType,
          });
          return JSON.stringify(file, null, 2);
        } catch (error) {
          return `Failed to update file: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    DELETE_FILE: tool({
      name: 'googledrive_delete_file',
      description: 'Delete a file or folder from Google Drive',
      schema: z.object({
        fileId: z.string().describe('File ID'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new GoogleDriveClient(accessToken);
          const result = await client.deleteFile(args.fileId);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to delete file: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    COPY_FILE: tool({
      name: 'googledrive_copy_file',
      description: 'Copy a file to create a duplicate',
      schema: z.object({
        fileId: z.string().describe('Source file ID'),
        name: z.string().describe('Name for the copied file'),
        parentId: z.string().optional().describe('Parent folder ID for the copy'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new GoogleDriveClient(accessToken);
          const file = await client.copyFile(
            args.fileId,
            args.name,
            args.parentId ? [args.parentId] : undefined
          );
          return JSON.stringify(file, null, 2);
        } catch (error) {
          return `Failed to copy file: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    CREATE_FOLDER: tool({
      name: 'googledrive_create_folder',
      description: 'Create a new folder in Google Drive',
      schema: z.object({
        name: z.string().describe('Folder name'),
        parentId: z.string().optional().describe('Parent folder ID'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new GoogleDriveClient(accessToken);
          const folder = await client.createFolder(args.name, args.parentId);
          return JSON.stringify(folder, null, 2);
        } catch (error) {
          return `Failed to create folder: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    SHARE_FILE: tool({
      name: 'googledrive_share_file',
      description: 'Share a file with a user, group, or make it public',
      schema: z.object({
        fileId: z.string().describe('File ID'),
        type: z
          .enum(['user', 'group', 'domain', 'anyone'])
          .describe('Type of permission'),
        role: z
          .enum(['owner', 'organizer', 'fileOrganizer', 'writer', 'commenter', 'reader'])
          .describe('Role/permission level'),
        emailAddress: z
          .string()
          .optional()
          .describe('Email address (for user/group type)'),
        domain: z.string().optional().describe('Domain name (for domain type)'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new GoogleDriveClient(accessToken);
          const permission = await client.shareFile(args.fileId, {
            type: args.type,
            role: args.role,
            emailAddress: args.emailAddress,
            domain: args.domain,
          });
          return JSON.stringify(permission, null, 2);
        } catch (error) {
          return `Failed to share file: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    LIST_PERMISSIONS: tool({
      name: 'googledrive_list_permissions',
      description: 'List sharing permissions for a file',
      schema: z.object({
        fileId: z.string().describe('File ID'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new GoogleDriveClient(accessToken);
          const permissions = await client.listPermissions(args.fileId);
          return JSON.stringify(permissions, null, 2);
        } catch (error) {
          return `Failed to list permissions: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    REMOVE_PERMISSION: tool({
      name: 'googledrive_remove_permission',
      description: 'Remove a sharing permission from a file',
      schema: z.object({
        fileId: z.string().describe('File ID'),
        permissionId: z.string().describe('Permission ID'),
      }),
      handler: async (args, context) => {
        try {
          const { accessToken } = await context.getCredentials();
          const client = new GoogleDriveClient(accessToken);
          const result = await client.removePermission(args.fileId, args.permissionId);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Failed to remove permission: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

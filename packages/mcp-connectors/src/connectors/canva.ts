import { z } from 'zod';
import { mcpConnectorConfig } from '@stackone/mcp-config-types';

// Canva API interfaces
interface CanvaDesign {
  id: string;
  name: string;
  type: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
  status: string;
}

interface CanvaTemplate {
  id: string;
  name: string;
  category: string;
  thumbnailUrl?: string;
  dimensions: {
    width: number;
    height: number;
  };
  tags: string[];
}

interface CanvaAsset {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  createdAt: string;
}

interface CanvaBrandKit {
  id: string;
  name: string;
  colors: Array<{ name: string; hex: string }>;
  fonts: string[];
  createdAt: string;
}

interface CanvaFolder {
  id: string;
  name: string;
  parentId?: string;
  createdAt: string;
  itemCount: number;
}

// Canva API client
class CanvaClient {
  private apiKey: string;
  private baseUrl = 'https://api.canva.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeRequest(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };

    const options: RequestInit = {
      method,
      headers
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as any;
      throw new Error(`Canva API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
    }

    return response.json();
  }

  // Design methods
  async listDesigns(limit: number = 20): Promise<{ designs: CanvaDesign[] }> {
    return this.makeRequest(`/designs?limit=${limit}`);
  }

  async getDesign(designId: string): Promise<CanvaDesign> {
    return this.makeRequest(`/designs/${designId}`);
  }

  async createDesign(name: string, type: string, dimensions: { width: number; height: number }): Promise<CanvaDesign> {
    return this.makeRequest('/designs', 'POST', {
      name,
      type,
      dimensions
    });
  }

  async updateDesign(designId: string, updates: Partial<CanvaDesign>): Promise<CanvaDesign> {
    return this.makeRequest(`/designs/${designId}`, 'PUT', updates);
  }

  async deleteDesign(designId: string): Promise<void> {
    return this.makeRequest(`/designs/${designId}`, 'DELETE');
  }

  async duplicateDesign(designId: string, newName?: string): Promise<CanvaDesign> {
    return this.makeRequest(`/designs/${designId}/duplicate`, 'POST', {
      name: newName
    });
  }

  // Template methods
  async listTemplates(category?: string, limit: number = 20): Promise<{ templates: CanvaTemplate[] }> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    params.append('limit', String(limit));
    
    return this.makeRequest(`/templates?${params.toString()}`);
  }

  async getTemplate(templateId: string): Promise<CanvaTemplate> {
    return this.makeRequest(`/templates/${templateId}`);
  }

  async searchTemplates(query: string, limit: number = 20): Promise<{ templates: CanvaTemplate[] }> {
    return this.makeRequest(`/templates/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  // Asset methods
  async listAssets(limit: number = 20): Promise<{ assets: CanvaAsset[] }> {
    return this.makeRequest(`/assets?limit=${limit}`);
  }

  async getAsset(assetId: string): Promise<CanvaAsset> {
    return this.makeRequest(`/assets/${assetId}`);
  }

  async deleteAsset(assetId: string): Promise<void> {
    return this.makeRequest(`/assets/${assetId}`, 'DELETE');
  }

  // Brand kit methods
  async listBrandKits(limit: number = 20): Promise<{ brandKits: CanvaBrandKit[] }> {
    return this.makeRequest(`/brand-kits?limit=${limit}`);
  }

  async getBrandKit(brandKitId: string): Promise<CanvaBrandKit> {
    return this.makeRequest(`/brand-kits/${brandKitId}`);
  }

  async createBrandKit(name: string, colors: Array<{ name: string; hex: string }>): Promise<CanvaBrandKit> {
    return this.makeRequest('/brand-kits', 'POST', {
      name,
      colors
    });
  }

  async updateBrandKit(brandKitId: string, updates: Partial<CanvaBrandKit>): Promise<CanvaBrandKit> {
    return this.makeRequest(`/brand-kits/${brandKitId}`, 'PUT', updates);
  }

  // Folder methods
  async listFolders(parentId?: string, limit: number = 20): Promise<{ folders: CanvaFolder[] }> {
    const params = new URLSearchParams();
    if (parentId) params.append('parentId', parentId);
    params.append('limit', String(limit));
    
    return this.makeRequest(`/folders?${params.toString()}`);
  }

  async createFolder(name: string, parentId?: string): Promise<CanvaFolder> {
    return this.makeRequest('/folders', 'POST', {
      name,
      parentId
    });
  }

  async deleteFolder(folderId: string): Promise<void> {
    return this.makeRequest(`/folders/${folderId}`, 'DELETE');
  }

  // Collaboration methods
  async shareDesign(designId: string, email: string, permissions: string[]): Promise<any> {
    return this.makeRequest(`/designs/${designId}/share`, 'POST', {
      email,
      permissions
    });
  }

  async getDesignCollaborators(designId: string): Promise<{ collaborators: any[] }> {
    return this.makeRequest(`/designs/${designId}/collaborators`);
  }
}

// Canva connector configuration
export const CanvaConnectorConfig = mcpConnectorConfig({
  name: 'canva',
  description: 'Connect to Canva for design management, template operations, and brand tools',
  credentials: {
    apiKey: {
      type: 'string',
      description: 'Your Canva API key',
      required: true,
      secret: true,
      help: 'Get your API key from the Canva Developer Portal'
    }
  },
  setup: {
    baseUrl: {
      type: 'string',
      description: 'Canva API base URL (usually https://api.canva.com)',
      required: false,
      default: 'https://api.canva.com',
      help: 'Leave as default unless you have a custom Canva endpoint'
    }
  },
  tools: (tool) => ({
    LIST_DESIGNS: tool({
      name: 'list_designs',
      description: 'List designs from Canva',
      schema: z.object({
        limit: z.number().min(1).max(100).default(20).describe('Number of designs to return (max 100)')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CanvaClient(credentials.apiKey);
        const result = await client.listDesigns(args.limit);
        
        return JSON.stringify({
          success: true,
          designs: result.designs,
          total: result.designs.length
        });
      }
    }),

    GET_DESIGN: tool({
      name: 'get_design',
      description: 'Get a specific design by ID',
      schema: z.object({
        designId: z.string().describe('Canva design ID')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CanvaClient(credentials.apiKey);
        const design = await client.getDesign(args.designId);
        
        return JSON.stringify({
          success: true,
          design
        });
      }
    }),

    CREATE_DESIGN: tool({
      name: 'create_design',
      description: 'Create a new design in Canva',
      schema: z.object({
        name: z.string().min(1).describe('Design name'),
        type: z.string().describe('Design type (e.g., presentation, social-media, document)'),
        width: z.number().positive().describe('Design width in pixels'),
        height: z.number().positive().describe('Design height in pixels')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CanvaClient(credentials.apiKey);
        const design = await client.createDesign(args.name, args.type, {
          width: args.width,
          height: args.height
        });
        
        return JSON.stringify({
          success: true,
          design
        });
      }
    }),

    UPDATE_DESIGN: tool({
      name: 'update_design',
      description: 'Update an existing design',
      schema: z.object({
        designId: z.string().describe('Canva design ID'),
        name: z.string().optional().describe('New design name'),
        status: z.string().optional().describe('New design status')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CanvaClient(credentials.apiKey);
        
        const updates: any = {};
        if (args.name) updates.name = args.name;
        if (args.status) updates.status = args.status;
        
        const design = await client.updateDesign(args.designId, updates);
        
        return JSON.stringify({
          success: true,
          design
        });
      }
    }),

    DELETE_DESIGN: tool({
      name: 'delete_design',
      description: 'Delete a design from Canva',
      schema: z.object({
        designId: z.string().describe('Canva design ID')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CanvaClient(credentials.apiKey);
        await client.deleteDesign(args.designId);
        
        return JSON.stringify({
          success: true,
          message: 'Design deleted successfully'
        });
      }
    }),

    DUPLICATE_DESIGN: tool({
      name: 'duplicate_design',
      description: 'Duplicate an existing design',
      schema: z.object({
        designId: z.string().describe('Canva design ID'),
        newName: z.string().optional().describe('Name for the duplicated design')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CanvaClient(credentials.apiKey);
        const design = await client.duplicateDesign(args.designId, args.newName);
        
        return JSON.stringify({
          success: true,
          design
        });
      }
    }),

    LIST_TEMPLATES: tool({
      name: 'list_templates',
      description: 'List templates from Canva',
      schema: z.object({
        category: z.string().optional().describe('Template category to filter by'),
        limit: z.number().min(1).max(100).default(20).describe('Number of templates to return (max 100)')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CanvaClient(credentials.apiKey);
        const result = await client.listTemplates(args.category, args.limit);
        
        return JSON.stringify({
          success: true,
          templates: result.templates,
          total: result.templates.length
        });
      }
    }),

    GET_TEMPLATE: tool({
      name: 'get_template',
      description: 'Get a specific template by ID',
      schema: z.object({
        templateId: z.string().describe('Canva template ID')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CanvaClient(credentials.apiKey);
        const template = await client.getTemplate(args.templateId);
        
        return JSON.stringify({
          success: true,
          template
        });
      }
    }),

    SEARCH_TEMPLATES: tool({
      name: 'search_templates',
      description: 'Search for templates by query',
      schema: z.object({
        query: z.string().min(1).describe('Search query for templates'),
        limit: z.number().min(1).max(100).default(20).describe('Number of templates to return (max 100)')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CanvaClient(credentials.apiKey);
        const result = await client.searchTemplates(args.query, args.limit);
        
        return JSON.stringify({
          success: true,
          templates: result.templates,
          total: result.templates.length
        });
      }
    }),

    LIST_ASSETS: tool({
      name: 'list_assets',
      description: 'List assets from Canva',
      schema: z.object({
        limit: z.number().min(1).max(100).default(20).describe('Number of assets to return (max 100)')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CanvaClient(credentials.apiKey);
        const result = await client.listAssets(args.limit);
        
        return JSON.stringify({
          success: true,
          assets: result.assets,
          total: result.assets.length
        });
      }
    }),

    GET_ASSET: tool({
      name: 'get_asset',
      description: 'Get a specific asset by ID',
      schema: z.object({
        assetId: z.string().describe('Canva asset ID')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CanvaClient(credentials.apiKey);
        const asset = await client.getAsset(args.assetId);
        
        return JSON.stringify({
          success: true,
          asset
        });
      }
    }),

    DELETE_ASSET: tool({
      name: 'delete_asset',
      description: 'Delete an asset from Canva',
      schema: z.object({
        assetId: z.string().describe('Canva asset ID')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CanvaClient(credentials.apiKey);
        await client.deleteAsset(args.assetId);
        
        return JSON.stringify({
          success: true,
          message: 'Asset deleted successfully'
        });
      }
    }),

    LIST_BRAND_KITS: tool({
      name: 'list_brand_kits',
      description: 'List brand kits from Canva',
      schema: z.object({
        limit: z.number().min(1).max(100).default(20).describe('Number of brand kits to return (max 100)')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CanvaClient(credentials.apiKey);
        const result = await client.listBrandKits(args.limit);
        
        return JSON.stringify({
          success: true,
          brandKits: result.brandKits,
          total: result.brandKits.length
        });
      }
    }),

    GET_BRAND_KIT: tool({
      name: 'get_brand_kit',
      description: 'Get a specific brand kit by ID',
      schema: z.object({
        brandKitId: z.string().describe('Canva brand kit ID')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CanvaClient(credentials.apiKey);
        const brandKit = await client.getBrandKit(args.brandKitId);
        
        return JSON.stringify({
          success: true,
          brandKit
        });
      }
    }),

    CREATE_BRAND_KIT: tool({
      name: 'create_brand_kit',
      description: 'Create a new brand kit in Canva',
      schema: z.object({
        name: z.string().min(1).describe('Brand kit name'),
        colors: z.array(z.object({
          name: z.string().describe('Color name'),
          hex: z.string().regex(/^#[0-9A-F]{6}$/i).describe('Color hex code (e.g., #FF0000)')
        })).default([]).describe('Array of brand colors')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CanvaClient(credentials.apiKey);
        const colors = (args.colors || []) as Array<{ name: string; hex: string }>;
        const brandKit = await client.createBrandKit(args.name, colors);
        
        return JSON.stringify({
          success: true,
          brandKit
        });
      }
    }),

    UPDATE_BRAND_KIT: tool({
      name: 'update_brand_kit',
      description: 'Update an existing brand kit',
      schema: z.object({
        brandKitId: z.string().describe('Canva brand kit ID'),
        name: z.string().optional().describe('New brand kit name'),
        colors: z.array(z.object({
          name: z.string().describe('Color name'),
          hex: z.string().regex(/^#[0-9A-F]{6}$/i).describe('Color hex code')
        })).optional().describe('New array of brand colors')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CanvaClient(credentials.apiKey);
        
        const updates: any = {};
        if (args.name) updates.name = args.name;
        if (args.colors) updates.colors = args.colors;
        
        const brandKit = await client.updateBrandKit(args.brandKitId, updates);
        
        return JSON.stringify({
          success: true,
          brandKit
        });
      }
    }),

    LIST_FOLDERS: tool({
      name: 'list_folders',
      description: 'List folders from Canva',
      schema: z.object({
        parentId: z.string().optional().describe('Parent folder ID to list children'),
        limit: z.number().min(1).max(100).default(20).describe('Number of folders to return (max 100)')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CanvaClient(credentials.apiKey);
        const result = await client.listFolders(args.parentId, args.limit);
        
        return JSON.stringify({
          success: true,
          folders: result.folders,
          total: result.folders.length
        });
      }
    }),

    CREATE_FOLDER: tool({
      name: 'create_folder',
      description: 'Create a new folder in Canva',
      schema: z.object({
        name: z.string().min(1).describe('Folder name'),
        parentId: z.string().optional().describe('Parent folder ID (optional)')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CanvaClient(credentials.apiKey);
        const folder = await client.createFolder(args.name, args.parentId);
        
        return JSON.stringify({
          success: true,
          folder
        });
      }
    }),

    DELETE_FOLDER: tool({
      name: 'delete_folder',
      description: 'Delete a folder from Canva',
      schema: z.object({
        folderId: z.string().describe('Canva folder ID')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CanvaClient(credentials.apiKey);
        await client.deleteFolder(args.folderId);
        
        return JSON.stringify({
          success: true,
          message: 'Folder deleted successfully'
        });
      }
    }),

    SHARE_DESIGN: tool({
      name: 'share_design',
      description: 'Share a design with collaborators',
      schema: z.object({
        designId: z.string().describe('Canva design ID'),
        email: z.string().email().describe('Email of the person to share with'),
        permissions: z.array(z.enum(['view', 'edit', 'comment'])).describe('Permissions to grant')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CanvaClient(credentials.apiKey);
        const result = await client.shareDesign(args.designId, args.email, args.permissions);
        
        return JSON.stringify({
          success: true,
          result
        });
      }
    }),

    GET_DESIGN_COLLABORATORS: tool({
      name: 'get_design_collaborators',
      description: 'Get list of collaborators for a design',
      schema: z.object({
        designId: z.string().describe('Canva design ID')
      }),
      handler: async (args, context) => {
        const credentials = await context.getCredentials();
        const client = new CanvaClient(credentials.apiKey);
        const result = await client.getDesignCollaborators(args.designId);
        
        return JSON.stringify({
          success: true,
          collaborators: result.collaborators
        });
      }
    })
  }),
  resources: (resource) => ({
    DESIGNS: resource({
      name: 'designs',
      description: 'Canva design data',
      schema: z.object({
        id: z.string(),
        name: z.string(),
        type: z.string(),
        thumbnailUrl: z.string().optional(),
        createdAt: z.string(),
        updatedAt: z.string(),
        status: z.string()
      }),
      handler: async (context) => {
        const credentials = await context.getCredentials();
        const client = new CanvaClient(credentials.apiKey);
        const result = await client.listDesigns(100);
        
        return result.designs;
      }
    }),

    TEMPLATES: resource({
      name: 'templates',
      description: 'Canva template data',
      schema: z.object({
        id: z.string(),
        name: z.string(),
        category: z.string(),
        thumbnailUrl: z.string().optional(),
        dimensions: z.object({
          width: z.number(),
          height: z.number()
        }),
        tags: z.array(z.string())
      }),
      handler: async (context) => {
        const credentials = await context.getCredentials();
        const client = new CanvaClient(credentials.apiKey);
        const result = await client.listTemplates(undefined, 100);
        
        return result.templates;
      }
    }),

    ASSETS: resource({
      name: 'assets',
      description: 'Canva asset data',
      schema: z.object({
        id: z.string(),
        name: z.string(),
        type: z.string(),
        url: z.string(),
        size: z.number(),
        createdAt: z.string()
      }),
      handler: async (context) => {
        const credentials = await context.getCredentials();
        const client = new CanvaClient(credentials.apiKey);
        const result = await client.listAssets(100);
        
        return result.assets;
      }
    }),

    BRAND_KITS: resource({
      name: 'brand_kits',
      description: 'Canva brand kit data',
      schema: z.object({
        id: z.string(),
        name: z.string(),
        colors: z.array(z.object({
          name: z.string(),
          hex: z.string()
        })),
        fonts: z.array(z.string()),
        createdAt: z.string()
      }),
      handler: async (context) => {
        const credentials = await context.getCredentials();
        const client = new CanvaClient(credentials.apiKey);
        const result = await client.listBrandKits(100);
        
        return result.brandKits;
      }
    }),

    FOLDERS: resource({
      name: 'folders',
      description: 'Canva folder data',
      schema: z.object({
        id: z.string(),
        name: z.string(),
        parentId: z.string().optional(),
        createdAt: z.string(),
        itemCount: z.number()
      }),
      handler: async (context) => {
        const credentials = await context.getCredentials();
        const client = new CanvaClient(credentials.apiKey);
        const result = await client.listFolders(undefined, 100);
        
        return result.folders;
      }
    })
  })
});

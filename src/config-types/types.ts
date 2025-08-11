import type { z } from 'zod';

export interface ConnectorContext<
  TCredentials = z.infer<z.ZodType>,
  TSetup = z.infer<z.ZodType>,
  TOAuth2Schema extends z.ZodType = z.ZodType,
> {
  // server level api
  getCredentials(): Promise<TCredentials>;
  getSetup(): Promise<TSetup>;
  getData<T = unknown>(key?: string): Promise<T | null>;
  setData(keyOrData: string | Record<string, unknown>, value?: unknown): Promise<void>;

  // connector level cache shared between all tenants
  readCache(key: string): Promise<string | null>;
  writeCache(key: string, value: string): Promise<void>;

  // OAuth2 support
  getOauth2Credentials?(): Promise<z.infer<TOAuth2Schema>>;
  refreshOauth2Credentials?(): Promise<z.infer<TOAuth2Schema>>;
}

export interface MCPResourceDefinition<
  TCredentials = z.infer<z.ZodType>,
  TSetup = z.infer<z.ZodType>,
> {
  name: string;
  uri: string;
  title?: string;
  description?: string;
  mimeType?: string;
  handler: (context: ConnectorContext<TCredentials, TSetup>) => string | Promise<string>;
}

export interface MCPConnectorConfig {
  name: string;
  key: string;
  version: string;
  logo?: string;
  description?: string;
  credentials: z.ZodType;
  setup: z.ZodType;
  initialState?: Record<string, unknown>;
  tools: Record<string, MCPToolDefinition>;
  prompts: Record<string, unknown>;
  resources: Record<string, MCPResourceDefinition>;
  examplePrompt?: string;
  oauth2?: OAuth2ConnectorConfig<z.ZodType, z.ZodType>;
}

export interface MCPToolDefinition<
  TCredentials = z.infer<z.ZodType>,
  TSetup = z.infer<z.ZodType>,
> {
  name: string;
  description: string;
  // biome-ignore lint/suspicious/noExplicitAny: schema is not typed
  schema: z.ZodObject<any>;
  handler: (
    args: unknown,
    context: ConnectorContext<TCredentials, TSetup>
  ) => string | Promise<string>;
}

// OAuth2 connector configuration with functions
export interface OAuth2ConnectorConfig<
  TCredentials extends z.ZodType = z.ZodType,
  TSchema extends z.ZodType = z.ZodType,
> {
  schema: TSchema;
  token: (credentials: z.infer<TCredentials>) => Promise<z.infer<TSchema>>;
  refresh: (
    credentials: z.infer<TCredentials>,
    oauth2Credentials: z.infer<TSchema>
  ) => Promise<z.infer<TSchema>>;
}

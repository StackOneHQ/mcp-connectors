import type { z } from 'zod';

// Context interface with typed credentials and setup
export interface ConnectorContext<
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  TCredentials = any,
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  TSetup = any,
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  TOAuth2 = any,
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
  getOauth2Credentials?(): Promise<TOAuth2>;
  refreshOauth2Credentials?(): Promise<TOAuth2>;
}

// Resource definition uses standard TypeScript types (no parsing needed)
export interface MCPResourceDefinition {
  name: string;
  uri: string;
  title?: string;
  description?: string;
  mimeType?: string;
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  handler: (context: ConnectorContext<any, any>) => string | Promise<string>;
}

// Tool definition with typed input and context
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export interface MCPToolDefinition<TInput = any> {
  name: string;
  description: string;
  schema: z.ZodType<TInput>; // Keep Zod schema for parsing
  handler: (
    args: TInput, // Typed args from schema inference
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    context: ConnectorContext<any, any> // Will be typed in the config function
  ) => string | Promise<string>;
}

// Connector config with typed credentials and setup
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export interface MCPConnectorConfig<TCredentials = any, TSetup = any> {
  name: string;
  key: string;
  version: string;
  logo?: string;
  description?: string;
  credentials: z.ZodType<TCredentials>; // Keep Zod for parsing
  setup: z.ZodType<TSetup>; // Keep Zod for parsing
  initialState?: Record<string, unknown>;
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  tools: Record<string, MCPToolDefinition<any>>;
  prompts: Record<string, unknown>;
  resources: Record<string, MCPResourceDefinition>;
  examplePrompt?: string;
  oauth2?: OAuth2ConnectorConfig<TCredentials>;
}

// OAuth2 config with typed credentials
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export interface OAuth2ConnectorConfig<TCredentials = any> {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  schema: z.ZodType<any>; // Keep Zod for parsing
  token: (credentials: TCredentials) => Promise<unknown>;
  refresh: (credentials: TCredentials, oauth2Credentials: unknown) => Promise<unknown>;
}

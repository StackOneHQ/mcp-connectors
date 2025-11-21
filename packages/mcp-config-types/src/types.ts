import type { z } from 'zod';

// Context interface with typed credentials and setup
export interface ConnectorContext<
  // biome-ignore lint/suspicious/noExplicitAny: Type simplification
  C = any,
  // biome-ignore lint/suspicious/noExplicitAny: Type simplification
  S = any,
  // biome-ignore lint/suspicious/noExplicitAny: Type simplification
  O = any,
> {
  // server level api
  getCredentials(): Promise<C>;
  getSetup(): Promise<S>;
  getData<T = unknown>(key?: string): Promise<T | null>;
  setData(keyOrData: string | Record<string, unknown>, value?: unknown): Promise<void>;

  // connector level cache shared between all tenants
  readCache(key: string): Promise<string | null>;
  writeCache(key: string, value: string): Promise<void>;

  // OAuth2 support
  getOauth2Credentials?(): Promise<O>;
  refreshOauth2Credentials?(): Promise<O>;
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
export interface MCPToolDefinition<I = any> {
  name: string;
  description: string;
  schema: z.ZodType<I>; // Keep Zod schema for parsing
  handler: (
    args: I, // Typed args from schema inference
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    context: ConnectorContext<any, any> // Will be typed in the config function
  ) => string | Promise<string>;
}

// Connector config with typed credentials and setup
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export interface MCPConnectorConfig<C = any, S = any> {
  name: string;
  key: string;
  version: string;
  logo?: string;
  description?: string;
  credentials: z.ZodType<C>; // Keep Zod for parsing
  setup: z.ZodType<S>; // Keep Zod for parsing
  initialState?: Record<string, unknown>;
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  tools: Record<string, MCPToolDefinition<any>>;
  prompts: Record<string, unknown>;
  resources: Record<string, MCPResourceDefinition>;
  examplePrompt?: string;
  oauth2?: OAuth2ConnectorConfig<C>;
}

// OAuth2 config with typed credentials
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export interface OAuth2ConnectorConfig<C = any> {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  schema: z.ZodType<any>; // Keep Zod for parsing
  token: (credentials: C) => Promise<unknown>;
  refresh: (credentials: C, oauth2Credentials: unknown) => Promise<unknown>;
}

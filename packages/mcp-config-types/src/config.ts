import type { z } from 'zod';
import type {
  ConnectorContext,
  MCPConnectorConfig,
  MCPResourceDefinition,
  MCPToolDefinition,
} from './types';

export const mcpConnectorConfig = <
  TCredentials extends z.ZodType,
  TSetup extends z.ZodType,
  TOAuth2Schema extends z.ZodType = z.ZodType,
>(config: {
  name: string;
  key: string;
  version: string;
  logo?: string;
  description?: string;
  credentials: TCredentials;
  setup: TSetup;
  initialState?: Record<string, unknown>;
  examplePrompt?: string;
  oauth2?: {
    schema: TOAuth2Schema;
    token: (credentials: z.infer<TCredentials>) => Promise<z.infer<TOAuth2Schema>>;
    refresh: (
      credentials: z.infer<TCredentials>,
      oauth2Credentials: z.infer<TOAuth2Schema>
    ) => Promise<z.infer<TOAuth2Schema>>;
  };
  tools: (
    // biome-ignore lint/suspicious/noExplicitAny: schema is not typed
    tool: <TSchema extends z.ZodObject<any>>(config: {
      name: string;
      description: string;
      schema: TSchema;
      handler: (
        args: z.infer<TSchema>,
        context: ConnectorContext<
          z.infer<TCredentials>,
          z.infer<TSetup>,
          z.infer<TOAuth2Schema>
        >
      ) => string | Promise<string>;
    }) => MCPToolDefinition<z.infer<TCredentials>, z.infer<TSetup>>
  ) => Record<string, MCPToolDefinition<z.infer<TCredentials>, z.infer<TSetup>>>;
  prompts?: Record<string, unknown>;
  resources?: (
    resource: (config: {
      name: string;
      uri: string;
      title?: string;
      description?: string;
      mimeType?: string;
      handler: (
        context: ConnectorContext<
          z.infer<TCredentials>,
          z.infer<TSetup>,
          z.infer<TOAuth2Schema>
        >
      ) => string | Promise<string>;
    }) => MCPResourceDefinition<z.infer<TCredentials>, z.infer<TSetup>>
  ) => Record<string, MCPResourceDefinition<z.infer<TCredentials>, z.infer<TSetup>>>;
}) => {
  // biome-ignore lint/suspicious/noExplicitAny: schema is not typed
  const typedTool = <TSchema extends z.ZodObject<any>>(toolConfig: {
    name: string;
    description: string;
    schema: TSchema;
    handler: (
      args: z.infer<TSchema>,
      context: ConnectorContext<z.infer<TCredentials>, z.infer<TSetup>>
    ) => string | Promise<string>;
  }): MCPToolDefinition<z.infer<TCredentials>, z.infer<TSetup>> => ({
    name: toolConfig.name,
    description: toolConfig.description,
    schema: toolConfig.schema,
    handler: toolConfig.handler as (
      args: unknown,
      context: ConnectorContext
    ) => string | Promise<string>,
  });

  const typedResource = (resourceConfig: {
    name: string;
    uri: string;
    title?: string;
    description?: string;
    mimeType?: string;
    handler: (
      context: ConnectorContext<z.infer<TCredentials>, z.infer<TSetup>>
    ) => string | Promise<string>;
  }): MCPResourceDefinition<z.infer<TCredentials>, z.infer<TSetup>> => ({
    name: resourceConfig.name,
    uri: resourceConfig.uri,
    title: resourceConfig.title,
    description: resourceConfig.description,
    mimeType: resourceConfig.mimeType,
    handler: resourceConfig.handler as (
      context: ConnectorContext
    ) => string | Promise<string>,
  });

  return {
    name: config.name,
    key: config.key,
    version: config.version,
    logo: config.logo,
    description: config.description,
    credentials: config.credentials,
    setup: config.setup,
    initialState: config.initialState,
    tools: config.tools(typedTool),
    prompts: config.prompts ?? {},
    resources: config.resources ? config.resources(typedResource) : {},
    examplePrompt: config.examplePrompt,
    oauth2: config.oauth2,
  } satisfies MCPConnectorConfig;
};

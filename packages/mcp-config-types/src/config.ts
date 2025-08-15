import type { z } from 'zod';
import type {
  ConnectorContext,
  MCPConnectorConfig,
  MCPResourceDefinition,
  MCPToolDefinition,
} from './types';

// Simple type helper to extract Zod output types
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type ZodInfer<T> = T extends z.ZodType<any, any, any> ? z.output<T> : never;

// Simplified connector config function to avoid infinite recursion
export function mcpConnectorConfig<
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  C extends z.ZodType<any> = z.ZodType<any>,
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  S extends z.ZodType<any> = z.ZodType<any>,
>(config: {
  name: string;
  key: string;
  version: string;
  logo?: string;
  description?: string;
  credentials: C;
  setup: S;
  initialState?: Record<string, unknown>;
  examplePrompt?: string;
  oauth2?: {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    schema: z.ZodType<any>;
    token: (credentials: ZodInfer<C>) => Promise<unknown>;
    refresh: (credentials: ZodInfer<C>, oauth2Credentials: unknown) => Promise<unknown>;
  };
  tools: (
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    tool: <I extends z.ZodType<any> = z.ZodType<any>>(config: {
      name: string;
      description: string;
      schema: I;
      handler: (
        args: ZodInfer<I>,
        context: ConnectorContext<ZodInfer<C>, ZodInfer<S>>
      ) => string | Promise<string>;
    }) => MCPToolDefinition<ZodInfer<I>>
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  ) => Record<string, MCPToolDefinition<any>>;
  prompts?: Record<string, unknown>;
  resources?: (
    resource: (config: {
      name: string;
      uri: string;
      title?: string;
      description?: string;
      mimeType?: string;
      handler: (
        context: ConnectorContext<ZodInfer<C>, ZodInfer<S>>
      ) => string | Promise<string>;
    }) => MCPResourceDefinition
  ) => Record<string, MCPResourceDefinition>;
}): MCPConnectorConfig<ZodInfer<C>, ZodInfer<S>> {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const typedTool = <I extends z.ZodType<any>>(toolConfig: {
    name: string;
    description: string;
    schema: I;
    handler: (
      args: ZodInfer<I>,
      context: ConnectorContext<ZodInfer<C>, ZodInfer<S>>
    ) => string | Promise<string>;
  }): MCPToolDefinition<ZodInfer<I>> => ({
    name: toolConfig.name,
    description: toolConfig.description,
    schema: toolConfig.schema,
    handler: toolConfig.handler as MCPToolDefinition<ZodInfer<I>>['handler'],
  });

  const typedResource = (resourceConfig: {
    name: string;
    uri: string;
    title?: string;
    description?: string;
    mimeType?: string;
    handler: (
      context: ConnectorContext<ZodInfer<C>, ZodInfer<S>>
    ) => string | Promise<string>;
  }): MCPResourceDefinition => ({
    name: resourceConfig.name,
    uri: resourceConfig.uri,
    title: resourceConfig.title,
    description: resourceConfig.description,
    mimeType: resourceConfig.mimeType,
    handler: resourceConfig.handler as (
      context: ConnectorContext<ZodInfer<C>, ZodInfer<S>>
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
  } satisfies MCPConnectorConfig<ZodInfer<C>, ZodInfer<S>>;
}

import type { MCPConnectorConfig } from '@stackone/mcp-config-types';

// Import all connectors for the array
import { AsanaConnectorConfig } from './connectors/asana';
import { AttioConnectorConfig } from './connectors/attio';
import { AwsConnectorConfig } from './connectors/aws';
import { DatadogConnectorConfig } from './connectors/datadog';
import { DeelConnectorConfig } from './connectors/deel';
import { DeepseekConnectorConfig } from './connectors/deepseek';
import { DocumentationConnectorConfig } from './connectors/documentation';
import { DuckDuckGoConnectorConfig } from './connectors/duckduckgo';
import { ElevenLabsConnectorConfig } from './connectors/elevenlabs';
import { ExaConnectorConfig } from './connectors/exa';
import { FalConnectorConfig } from './connectors/fal';
import { FirefliesConnectorConfig } from './connectors/fireflies';
import { GitHubConnectorConfig } from './connectors/github';
import { GitLabConnectorConfig } from './connectors/gitlab';
import { GoogleDriveConnectorConfig } from './connectors/google-drive';
import { googleMapsConnector as GoogleMapsConnectorConfig } from './connectors/google-maps';
import { GraphyConnectorConfig } from './connectors/graphy';
import { HiBobConnectorConfig } from './connectors/hibob';
import { HubSpotConnectorConfig } from './connectors/hubspot';
import { IncidentConnectorConfig } from './connectors/incident';
import { JiraConnectorConfig } from './connectors/jira';
import { LangsmithConnectorConfig } from './connectors/langsmith';
import { LinearConnectorConfig } from './connectors/linear';
import { LinkedInConnectorConfig } from './connectors/linkedin';
import { ModalConnectorConfig } from './connectors/modal';
import { NotionConnectorConfig } from './connectors/notion';
import { OnePasswordConnectorConfig } from './connectors/onepassword';
import { ParallelConnectorConfig } from './connectors/parallel';
import { PerplexityConnectorConfig } from './connectors/perplexity';
import { PostHogConnectorConfig } from './connectors/posthog';
import { ProducthuntConnectorConfig } from './connectors/producthunt';
import { LogfireConnectorConfig } from './connectors/pydantic-logfire';
import { PylonConnectorConfig } from './connectors/pylon';
import { ReplicateConnectorConfig } from './connectors/replicate';
import { RetoolConnectorConfig } from './connectors/retool';
import { RideWithGPSConnectorConfig } from './connectors/ridewithgps';
import { SequentialThinkingConnectorConfig } from './connectors/sequential-thinking';
import { SlackConnectorConfig } from './connectors/slack';
import { StackOneConnectorConfig } from './connectors/stackone';
import { StravaConnectorConfig } from './connectors/strava';
import { SupabaseConnectorConfig } from './connectors/supabase';
import { TestConnectorConfig } from './connectors/test';
import { TFLConnectorConfig } from './connectors/tfl';
import { TinybirdConnectorConfig } from './connectors/tinybird';
import { TodoistConnectorConfig } from './connectors/todoist';
import { TodoListConnectorConfig } from './connectors/todolist';
import { TurbopufferConnectorConfig } from './connectors/turbopuffer';
import { WandbConnectorConfig } from './connectors/wandb';
import { XeroConnectorConfig } from './connectors/xero';
import { ZapierConnectorConfig } from './connectors/zapier';

// Export Connectors array for platforms like disco
export const Connectors: readonly MCPConnectorConfig[] = [
  TestConnectorConfig,
  StackOneConnectorConfig,
  AsanaConnectorConfig,
  AttioConnectorConfig,
  AwsConnectorConfig,
  DatadogConnectorConfig,
  DeelConnectorConfig,
  DeepseekConnectorConfig,
  DocumentationConnectorConfig,
  DuckDuckGoConnectorConfig,
  ElevenLabsConnectorConfig,
  ExaConnectorConfig,
  FalConnectorConfig,
  GitHubConnectorConfig,
  GitLabConnectorConfig,
  GoogleDriveConnectorConfig,
  GoogleMapsConnectorConfig,
  GraphyConnectorConfig,
  HiBobConnectorConfig,
  HubSpotConnectorConfig,
  IncidentConnectorConfig,
  FirefliesConnectorConfig,
  JiraConnectorConfig,
  LangsmithConnectorConfig,
  LinearConnectorConfig,
  LinkedInConnectorConfig,
  LogfireConnectorConfig,
  ModalConnectorConfig,
  NotionConnectorConfig,
  OnePasswordConnectorConfig,
  ParallelConnectorConfig,
  PerplexityConnectorConfig,
  PostHogConnectorConfig,
  ProducthuntConnectorConfig,
  PylonConnectorConfig,
  ReplicateConnectorConfig,
  RetoolConnectorConfig,
  RideWithGPSConnectorConfig,
  SequentialThinkingConnectorConfig,
  SlackConnectorConfig,
  StravaConnectorConfig,
  SupabaseConnectorConfig,
  TFLConnectorConfig,
  TinybirdConnectorConfig,
  TodoistConnectorConfig,
  TodoListConnectorConfig,
  TurbopufferConnectorConfig,
  WandbConnectorConfig,
  XeroConnectorConfig,
  ZapierConnectorConfig,
] as const;

// Re-export all individual connectors
export * from './connectors/asana';
export * from './connectors/attio';
export * from './connectors/aws';
export * from './connectors/datadog';
export * from './connectors/duckduckgo';
export * from './connectors/deel';
export * from './connectors/deepseek';
export * from './connectors/documentation';
export * from './connectors/elevenlabs';
export * from './connectors/exa';
export * from './connectors/fal';
export * from './connectors/fireflies';
export * from './connectors/github';
export * from './connectors/gitlab';
export * from './connectors/google-drive';
export * from './connectors/google-maps';
export * from './connectors/graphy';
export * from './connectors/hibob';
export * from './connectors/hubspot';
export * from './connectors/incident';
export * from './connectors/jira';
export * from './connectors/langsmith';
export * from './connectors/linear';
export * from './connectors/linkedin';
export * from './connectors/modal';
export * from './connectors/notion';
export * from './connectors/onepassword';
export * from './connectors/perplexity';
export * from './connectors/parallel';
export * from './connectors/posthog';
export * from './connectors/producthunt';
export * from './connectors/pydantic-logfire';
export * from './connectors/pylon';
export * from './connectors/replicate';
export * from './connectors/retool';
export * from './connectors/ridewithgps';
export * from './connectors/stackone';
export * from './connectors/slack';
export * from './connectors/sequential-thinking';
export * from './connectors/strava';
export * from './connectors/supabase';
export * from './connectors/tfl';
export * from './connectors/tinybird';
export * from './connectors/todoist';
export * from './connectors/todolist';
export * from './connectors/test';
export * from './connectors/turbopuffer';
export * from './connectors/wandb';
export * from './connectors/xero';
export * from './connectors/zapier';

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
import { HarnessConnectorConfig } from './connectors/harness';
import { HiBobConnectorConfig } from './connectors/hibob';
import { HubSpotConnectorConfig } from './connectors/hubspot';
import { IncidentConnectorConfig } from './connectors/incident';
import { JiraConnectorConfig } from './connectors/jira';
import { LangsmithConnectorConfig } from './connectors/langsmith';
import { LinearConnectorConfig } from './connectors/linear';
import { LinkedInConnectorConfig } from './connectors/linkedin';
import { LumaConnectorConfig } from './connectors/luma';
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
  HarnessConnectorConfig,
  HiBobConnectorConfig,
  HubSpotConnectorConfig,
  IncidentConnectorConfig,
  FirefliesConnectorConfig,
  JiraConnectorConfig,
  LangsmithConnectorConfig,
  LinearConnectorConfig,
  LinkedInConnectorConfig,
  LogfireConnectorConfig,
  LumaConnectorConfig,
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

export {
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
  HarnessConnectorConfig,
  HiBobConnectorConfig,
  HubSpotConnectorConfig,
  IncidentConnectorConfig,
  FirefliesConnectorConfig,
  JiraConnectorConfig,
  LangsmithConnectorConfig,
  LinearConnectorConfig,
  LinkedInConnectorConfig,
  LogfireConnectorConfig,
  LumaConnectorConfig,
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
};

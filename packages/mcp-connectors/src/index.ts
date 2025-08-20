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
import { GoogleDriveConnectorConfig } from './connectors/google-drive';
import { HiBobConnectorConfig } from './connectors/hibob';
import { IncidentConnectorConfig } from './connectors/incident';
import { JiraConnectorConfig } from './connectors/jira';
import { LangsmithConnectorConfig } from './connectors/langsmith';
import { LinearConnectorConfig } from './connectors/linear';
import { LinkedInConnectorConfig } from './connectors/linkedin';
import { NotionConnectorConfig } from './connectors/notion';
import { OnePasswordConnectorConfig } from './connectors/onepassword';
import { ParallelConnectorConfig } from './connectors/parallel';
import { PerplexityConnectorConfig } from './connectors/perplexity';
import { LogfireConnectorConfig } from './connectors/pydantic-logfire';
import { PylonConnectorConfig } from './connectors/pylon';
import { ReplicateConnectorConfig } from './connectors/replicate';
import { SequentialThinkingConnectorConfig } from './connectors/sequential-thinking';
import { SlackConnectorConfig } from './connectors/slack';
import { StackOneConnectorConfig } from './connectors/stackone';
import { SupabaseConnectorConfig } from './connectors/supabase';
import { TestConnectorConfig } from './connectors/test';
import { TinybirdConnectorConfig } from './connectors/tinybird';
import { TodoistConnectorConfig } from './connectors/todoist';
import { TurbopufferConnectorConfig } from './connectors/turbopuffer';
import { WandbConnectorConfig } from './connectors/wandb';
import { XeroConnectorConfig } from './connectors/xero';

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
  GoogleDriveConnectorConfig,
  HiBobConnectorConfig,
  IncidentConnectorConfig,
  FirefliesConnectorConfig,
  JiraConnectorConfig,
  LangsmithConnectorConfig,
  LinearConnectorConfig,
  LinkedInConnectorConfig,
  LogfireConnectorConfig,
  NotionConnectorConfig,
  OnePasswordConnectorConfig,
  ParallelConnectorConfig,
  PerplexityConnectorConfig,
  PylonConnectorConfig,
  ReplicateConnectorConfig,
  SequentialThinkingConnectorConfig,
  SlackConnectorConfig,
  SupabaseConnectorConfig,
  TinybirdConnectorConfig,
  TodoistConnectorConfig,
  TurbopufferConnectorConfig,
  WandbConnectorConfig,
  XeroConnectorConfig,
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
  GoogleDriveConnectorConfig,
  HiBobConnectorConfig,
  IncidentConnectorConfig,
  FirefliesConnectorConfig,
  JiraConnectorConfig,
  LangsmithConnectorConfig,
  LinearConnectorConfig,
  LinkedInConnectorConfig,
  LogfireConnectorConfig,
  NotionConnectorConfig,
  OnePasswordConnectorConfig,
  ParallelConnectorConfig,
  PerplexityConnectorConfig,
  PylonConnectorConfig,
  ReplicateConnectorConfig,
  SequentialThinkingConnectorConfig,
  SlackConnectorConfig,
  SupabaseConnectorConfig,
  TinybirdConnectorConfig,
  TodoistConnectorConfig,
  TurbopufferConnectorConfig,
  WandbConnectorConfig,
  XeroConnectorConfig,
};

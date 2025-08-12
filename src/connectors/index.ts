// Import all connectors for the array
import { AsanaConnectorConfig } from './asana';
import { AttioConnectorConfig } from './attio';
import { AwsConnectorConfig } from './aws';
import { DatadogConnectorConfig } from './datadog';
import { DeelConnectorConfig } from './deel';
import { DeepseekConnectorConfig } from './deepseek';
import { DocumentationConnectorConfig } from './documentation';
import { DuckDuckGoConnectorConfig } from './duckduckgo';
import { ElevenLabsConnectorConfig } from './elevenlabs';
import { ExaConnectorConfig } from './exa';
import { FalConnectorConfig } from './fal';
import { FirefliesConnectorConfig } from './fireflies';
import { GitHubConnectorConfig } from './github';
import { GoogleDriveConnectorConfig } from './googledrive';
import { HiBobConnectorConfig } from './hibob';
import { IncidentConnectorConfig } from './incident';
import { JiraConnectorConfig } from './jira';
import { LangsmithConnectorConfig } from './langsmith';
import { LinearConnectorConfig } from './linear';
import { LinkedInConnectorConfig } from './linkedin';
import { LogfireConnectorConfig } from './logfire';
import { NotionConnectorConfig } from './notion';
import { OnePasswordConnectorConfig } from './onepassword';
import { ParallelConnectorConfig } from './parallel';
import { PerplexityConnectorConfig } from './perplexity';
import { PylonConnectorConfig } from './pylon';
import { ReplicateConnectorConfig } from './replicate';
import { SequentialThinkingConnectorConfig } from './sequentialthinking';
import { SlackConnectorConfig } from './slack';
import { StackOneConnectorConfig } from './stackone';
import { SupabaseConnectorConfig } from './supabase';
import { TestConnectorConfig } from './test';
import { TinybirdConnectorConfig } from './tinybird';
import { TodoistConnectorConfig } from './todoist';
import { TurbopufferConnectorConfig } from './turbopuffer';
import { XeroConnectorConfig } from './xero';

// Auto-export all connectors
export const allConnectors = [
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
  XeroConnectorConfig,
] as const;

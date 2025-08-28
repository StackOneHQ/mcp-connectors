// packages/mcp-connectors/src/connectors/AppleScript/lib/types.ts

export interface AppleScriptGenerationRequest {
  prompt: string;
  context?: string;
  signature?: string;
  timestamp?: number;
}

export interface AppleScriptGenerationResponse {
  success: boolean;
  script?: string;
  error?: string;
  warning?: string;
}

export interface RemoteBuilderConfig {
  endpoint: string;
  signingSecret: string;
  timeout?: number;
}

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
}
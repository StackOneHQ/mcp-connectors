// packages/mcp-connectors/src/connectors/AppleScript/remote_builder.ts
import { createSignedRequest } from './lib/signer';
import type { 
  AppleScriptGenerationRequest, 
  AppleScriptGenerationResponse, 
  RemoteBuilderConfig,
  ExecutionResult 
} from './lib/types';
import { runAppleScript } from './helpers/osascript';

/**
 * Remote AppleScript builder client
 * Generates AppleScript using a remote Vercel function, then executes locally
 */
export class RemoteAppleScriptBuilder {
  private config: RemoteBuilderConfig;

  constructor(config: RemoteBuilderConfig) {
    this.config = {
      timeout: 30000, // 30 second default timeout
      ...config
    };
  }

  /**
   * Generate AppleScript using remote service
   */
  async generateScript(
    prompt: string, 
    context?: string
  ): Promise<string> {
    const payload = { prompt, context };
    const signed = createSignedRequest(payload, this.config.signingSecret);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signed.payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Remote builder error (${response.status}): ${errorText}`);
      }

      const result: AppleScriptGenerationResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Script generation failed');
      }

      if (!result.script) {
        throw new Error('No script returned from remote builder');
      }

      if (result.warning) {
        console.warn(`AppleScript generation warning: ${result.warning}`);
      }

      return result.script;

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.config.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Generate and execute AppleScript in one call
   */
  async composeAndExecute(
    prompt: string,
    context?: string,
    timeoutMs?: number
  ): Promise<ExecutionResult> {
    try {
      // Generate script remotely
      const script = await this.generateScript(prompt, context);
      
      // Execute locally using existing osascript helper
      const result = await runAppleScript(script, timeoutMs);
      
      return {
        success: true,
        output: result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

/**
 * Create a remote builder instance from environment variables
 */
export function createRemoteBuilder(): RemoteAppleScriptBuilder {
  const endpoint = process.env.APPLESCRIPT_REMOTE_ENDPOINT;
  const signingSecret = process.env.APPLESCRIPT_SIGNING_SECRET;

  if (!endpoint) {
    throw new Error('APPLESCRIPT_REMOTE_ENDPOINT environment variable not set');
  }

  if (!signingSecret) {
    throw new Error('APPLESCRIPT_SIGNING_SECRET environment variable not set');
  }

  return new RemoteAppleScriptBuilder({
    endpoint,
    signingSecret
  });
}
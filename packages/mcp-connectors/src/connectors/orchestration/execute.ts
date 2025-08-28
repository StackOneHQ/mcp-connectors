import { z } from 'zod';
import { orchestrationState } from './state';
import { ExecuteRequestSchema, ExecuteResponseSchema } from './schema';

export type ExecuteRequest = z.infer<typeof ExecuteRequestSchema>;
export type ExecuteResponse = z.infer<typeof ExecuteResponseSchema>;

/**
 * Forward tool calls to a remote MCP server
 * Simulates success if policy.dry_run === true, otherwise calls remote server
 */
export async function forwardToRemote(
  tool: string, 
  params: Record<string, unknown>
): Promise<ExecuteResponse> {
  const startTime = Date.now();
  const policy = orchestrationState.getPolicy();
  
  try {
    // If dry_run is enabled, simulate success
    if (policy.dry_run) {
      const executionTime = Date.now() - startTime;
      
      // Create audit entry for simulated execution
      orchestrationState.createAuditEvent({
        eventType: 'tool_simulated',
        entityType: 'tool',
        entityId: tool,
        userId: 'system',
        details: { 
          ok: true, 
          simulated: true,
          params,
          execution_time_ms: executionTime
        },
      });
      
      return {
        success: true,
        data: { ok: true, simulated: true },
        simulated: true,
        execution_time_ms: executionTime,
      };
    }

    // Otherwise, call the remote server
    const serverUrl = 'http://localhost:3000'; // Default remote server URL
    const timeout = policy.timeout_ms;
    
    // Prepare the request payload
    const payload = {
      method: 'tools/call',
      params: {
        name: tool,
        arguments: params,
      },
      id: `request_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    // Make the request to the remote server
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`${serverUrl}/tools/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json() as any;
    const executionTime = Date.now() - startTime;

    // Check if the response has an error
    if (result.error) {
      // Create audit entry for failed execution
      orchestrationState.createAuditEvent({
        eventType: 'tool_failed',
        entityType: 'tool',
        entityId: tool,
        userId: 'system',
        details: { 
          error: result.error.message || 'Unknown error from remote server',
          params,
          execution_time_ms: executionTime
        },
      });

      return {
        success: false,
        error: result.error.message || 'Unknown error from remote server',
        execution_time_ms: executionTime,
      };
    }

    // Create audit entry for successful execution
    orchestrationState.createAuditEvent({
      eventType: 'tool_simulated', // Using this as a generic success event
      entityType: 'tool',
      entityId: tool,
      userId: 'system',
      details: { 
        ok: true,
        result: result.result,
        params,
        execution_time_ms: executionTime
      },
    });

    return {
      success: true,
      data: result.result,
      execution_time_ms: executionTime,
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    // Create audit entry for failed execution
    orchestrationState.createAuditEvent({
      eventType: 'tool_failed',
      entityType: 'tool',
      entityId: tool,
      userId: 'system',
      details: { 
        error: error instanceof Error ? error.message : 'Unknown error',
        params,
        execution_time_ms: executionTime
      },
    });

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
        execution_time_ms: executionTime,
      };
    }

    return {
      success: false,
      error: 'Unknown error occurred',
      execution_time_ms: executionTime,
    };
  }
}

/**
 * Execute a tool call with retry logic
 * Uses the policy configuration for retry settings
 */
export async function executeWithRetry(
  tool: string, 
  params: Record<string, unknown>
): Promise<ExecuteResponse> {
  const policy = orchestrationState.getPolicy();
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= policy.max_retries; attempt++) {
    try {
      const result = await forwardToRemote(tool, params);
      
      if (result.success) {
        return result;
      }
      
      // If it's a simulated execution, don't retry
      if (result.simulated) {
        return result;
      }
      
      lastError = new Error(result.error || 'Unknown error');
      
      // If this is not the last attempt, wait before retrying
      if (attempt < policy.max_retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // If this is not the last attempt, wait before retrying
      if (attempt < policy.max_retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All retries failed
  return {
    success: false,
    error: lastError?.message || 'All retry attempts failed',
    execution_time_ms: 0,
  };
}

/**
 * Forward a tool call to a remote MCP server with custom configuration
 * This is an alternative interface that accepts a full ExecuteRequest
 */
export async function forwardToRemoteServer(request: ExecuteRequest): Promise<ExecuteResponse> {
  const startTime = Date.now();
  
  try {
    // Validate the request
    ExecuteRequestSchema.parse(request);
    
    // Prepare the request payload
    const payload = {
      method: 'tools/call',
      params: {
        name: request.tool_name,
        arguments: request.args || {},
      },
      id: `request_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    // Make the request to the remote server
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), request.timeout_ms);

    const response = await fetch(`${request.server_url}/tools/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json() as any;
    const executionTime = Date.now() - startTime;

    // Check if the response has an error
    if (result.error) {
      return {
        success: false,
        error: result.error.message || 'Unknown error from remote server',
        execution_time_ms: executionTime,
      };
    }

    return {
      success: true,
      data: result.result,
      execution_time_ms: executionTime,
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
        execution_time_ms: executionTime,
      };
    }

    return {
      success: false,
      error: 'Unknown error occurred',
      execution_time_ms: executionTime,
    };
  }
}



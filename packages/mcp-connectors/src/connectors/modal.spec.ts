import { describe, expect, it } from 'vitest';
import { ModalConnectorConfig } from './modal';

describe('Modal Connector Configuration', () => {
  it('should have correct connector name and structure', () => {
    expect(ModalConnectorConfig.name).toBe('Modal');
    expect(ModalConnectorConfig.key).toBe('modal');
    expect(ModalConnectorConfig.version).toBe('1.0.0');
    expect(ModalConnectorConfig.description).toContain('Modal MCP connector');
  });

  it('should have required tools for logging functionality', () => {
    const toolNames = Object.keys(ModalConnectorConfig.tools);
    
    // Core app and function management
    expect(toolNames).toContain('LIST_APPS');
    expect(toolNames).toContain('GET_APP');
    expect(toolNames).toContain('LIST_FUNCTIONS');
    expect(toolNames).toContain('GET_FUNCTION');
    
    // Key logging tools (both running and stopped functions/apps)
    expect(toolNames).toContain('GET_APP_LOGS');
    expect(toolNames).toContain('GET_FUNCTION_LOGS');
    expect(toolNames).toContain('GET_FUNCTION_CALLS');
    
    // Sandbox tools
    expect(toolNames).toContain('CREATE_SANDBOX');
    expect(toolNames).toContain('GET_SANDBOX_LOGS');
    expect(toolNames).toContain('EXEC_IN_SANDBOX');
    expect(toolNames).toContain('TERMINATE_SANDBOX');
    
    // Advanced tools
    expect(toolNames).toContain('CREATE_SNAPSHOT');
    expect(toolNames).toContain('RESTORE_FROM_SNAPSHOT');
    expect(toolNames).toContain('GET_PROCESS_STATUS');
    expect(toolNames).toContain('WAIT_FOR_PROCESS');
  });

  it('should have correct tool schemas for logging', () => {
    // Check that function logs tool has required parameters
    const functionLogsTool = ModalConnectorConfig.tools.GET_FUNCTION_LOGS;
    expect(functionLogsTool.name).toBe('modal_get_function_logs');
    expect(functionLogsTool.description).toContain('logs for a Modal function');
    expect(functionLogsTool.description).toContain('running and stopped functions');

    // Check that app logs tool has required parameters  
    const appLogsTool = ModalConnectorConfig.tools.GET_APP_LOGS;
    expect(appLogsTool.name).toBe('modal_get_app_logs');
    expect(appLogsTool.description).toContain('logs for a Modal app');
    expect(appLogsTool.description).toContain('running and stopped apps');

    // Check sandbox logs tool
    const sandboxLogsTool = ModalConnectorConfig.tools.GET_SANDBOX_LOGS;
    expect(sandboxLogsTool.name).toBe('modal_get_sandbox_logs');
    expect(sandboxLogsTool.description).toContain('logs from a sandbox for debugging');
  });

  it('should have proper credentials schema', () => {
    expect(ModalConnectorConfig.credentials).toBeDefined();
  });

  it('should have setup schema with optional default configurations', () => {
    expect(ModalConnectorConfig.setup).toBeDefined();
  });

  it('should have an example prompt that mentions logging', () => {
    expect(ModalConnectorConfig.examplePrompt).toContain('logs');
    expect(ModalConnectorConfig.examplePrompt).toContain('debugging');
    expect(ModalConnectorConfig.examplePrompt).toContain('stopped functions');
  });
});
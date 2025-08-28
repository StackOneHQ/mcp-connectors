import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowOrchestrationConnectorConfig } from './workflow-orchestration';

describe('WorkflowOrchestrationConnector', () => {
  beforeEach(() => {
    // Reset state by re-importing the module
    // Note: In a real implementation, you might want to reset the state
    // For now, we'll just test the basic functionality
  });

  it('should have all required tools', () => {
    const tools = WorkflowOrchestrationConnectorConfig.tools;
    
    expect(tools.REGISTER_ACTOR).toBeDefined();
    expect(tools.START_WORKFLOW).toBeDefined();
    expect(tools.PROPOSE_ACTION).toBeDefined();
    expect(tools.REVIEW_ACTION).toBeDefined();
    expect(tools.EXECUTE_ACTION).toBeDefined();
    expect(tools.EXECUTE_PARALLEL).toBeDefined();
    expect(tools.GET_AUDIT_LOG).toBeDefined();
    expect(tools.SET_POLICY).toBeDefined();
  });

  it('should register an actor correctly', async () => {
    const result = await WorkflowOrchestrationConnectorConfig.tools.REGISTER_ACTOR!.handler({
      name: 'John Doe',
      role: 'Developer',
    }, {} as any);

    const parsedResult = JSON.parse(result);
    expect(parsedResult).toHaveProperty('actor_id');
    expect(parsedResult.actor_id).toMatch(/^actor_\d+$/);
  });

  it('should start a workflow correctly', async () => {
    const result = await WorkflowOrchestrationConnectorConfig.tools.START_WORKFLOW!.handler({
      title: 'Test Workflow',
    }, {} as any);

    const parsedResult = JSON.parse(result);
    expect(parsedResult).toHaveProperty('workflow_id');
    expect(parsedResult.workflow_id).toMatch(/^workflow_\d+$/);
  });

  it('should set policy correctly', async () => {
    const result = await WorkflowOrchestrationConnectorConfig.tools.SET_POLICY!.handler({
      dry_run: true,
    }, {} as any);

    const parsedResult = JSON.parse(result);
    expect(parsedResult).toHaveProperty('dry_run');
    expect(parsedResult.dry_run).toBe(true);
  });

  it('should execute parallel actions correctly', async () => {
    const result = await WorkflowOrchestrationConnectorConfig.tools.EXECUTE_PARALLEL!.handler({
      calls: [
        { tool: 'test_tool_1', params: { param1: 'value1' } },
        { tool: 'test_tool_2', params: { param2: 'value2' } },
      ],
    }, {} as any);

    const parsedResult = JSON.parse(result);
    expect(parsedResult).toHaveProperty('results');
    expect(parsedResult.results).toHaveLength(2);
    expect(parsedResult.results[0]).toHaveProperty('tool', 'test_tool_1');
    expect(parsedResult.results[1]).toHaveProperty('tool', 'test_tool_2');
  });
});

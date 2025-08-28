import { describe, it, expect, beforeEach } from 'vitest';
import { OrchestrationConnectorConfig } from './index';
import { orchestrationState } from './state';

// Helper function to call tool handlers with proper context
const callTool = async (toolName: keyof typeof OrchestrationConnectorConfig.tools, args: any) => {
  const tool = OrchestrationConnectorConfig.tools[toolName];
  if (!tool) {
    throw new Error(`Tool ${toolName} not found`);
  }
  return await tool.handler(args, {} as any);
};

describe('Merged Orchestration Connector', () => {
  beforeEach(() => {
    // Reset state before each test
    orchestrationState.clearAll();
  });

  describe('Core Orchestration Features', () => {
    it('should create an actor with capabilities', async () => {
      const result = await callTool('createActor', {
        name: 'John Doe',
        role: 'Developer',
        capabilities: ['code_review', 'deployment'],
      });

      const parsedResult = JSON.parse(result);
      expect(parsedResult.success).toBe(true);
      expect(parsedResult.data.name).toBe('John Doe');
      expect(parsedResult.data.capabilities).toEqual(['code_review', 'deployment']);
    });

    it('should create a workflow with steps', async () => {
      const result = await callTool('createWorkflow', {
        name: 'Code Review Workflow',
        description: 'Automated code review process',
        priority: 'high',
        steps: [
          {
            name: 'Initial Review',
            description: 'Code quality review',
            actorId: 'actor_1',
            dependencies: [],
            estimatedDuration: 2,
          },
        ],
        assignedActors: ['actor_1'],
      });

      const parsedResult = JSON.parse(result);
      expect(parsedResult.success).toBe(true);
      expect(parsedResult.data.name).toBe('Code Review Workflow');
      expect(parsedResult.data.steps).toHaveLength(1);
    });

    it('should create a proposal for review', async () => {
      const result = await callTool('createProposal', {
        title: 'Database Migration',
        description: 'Migrate user data to new schema',
        priority: 'high',
        assignedReviewers: ['actor_1'],
      });

      const parsedResult = JSON.parse(result);
      expect(parsedResult.success).toBe(true);
      expect(parsedResult.data.title).toBe('Database Migration');
      expect(parsedResult.data.status).toBe('draft');
    });
  });

  describe('Approval-Based Workflow Features', () => {
    it('should propose an action for approval', async () => {
      const result = await callTool('proposeAction', {
        workflow_id: 'workflow_1',
        actor_id: 'actor_1',
        tool: 'update_database_schema',
        params: { table: 'users', column: 'email' },
        reason: 'Add email verification column',
      });

      const parsedResult = JSON.parse(result);
      expect(parsedResult.success).toBe(true);
      expect(parsedResult.data.status).toBe('pending');
      expect(parsedResult.data.proposal_id).toMatch(/^action_proposal_\d+$/);
    });

    it('should review and approve an action', async () => {
      // First create a proposal
      const proposalResult = await callTool('proposeAction', {
        workflow_id: 'workflow_1',
        actor_id: 'actor_1',
        tool: 'update_database_schema',
        params: { table: 'users', column: 'email' },
        reason: 'Add email verification column',
      });

      const proposalData = JSON.parse(proposalResult);
      const proposalId = proposalData.data.proposal_id;

      // Then review and approve it
      const reviewResult = await callTool('reviewAction', {
        proposal_id: proposalId,
        reviewer_id: 'actor_2',
        decision: 'approve',
      });

      const parsedReviewResult = JSON.parse(reviewResult);
      expect(parsedReviewResult.success).toBe(true);
      expect(parsedReviewResult.data.status).toBe('approved');
      expect(parsedReviewResult.data.final_tool_call).toBeDefined();
    });

    it('should execute an approved action', async () => {
      // First create and approve a proposal
      const proposalResult = await callTool('proposeAction', {
        workflow_id: 'workflow_1',
        actor_id: 'actor_1',
        tool: 'update_database_schema',
        params: { table: 'users', column: 'email' },
        reason: 'Add email verification column',
      });

      const proposalData = JSON.parse(proposalResult);
      const proposalId = proposalData.data.proposal_id;

      await callTool('reviewAction', {
        proposal_id: proposalId,
        reviewer_id: 'actor_2',
        decision: 'approve',
      });

      // Then execute the approved action
      const executeResult = await callTool('executeAction', {
        proposal_id: proposalId,
      });

      const parsedExecuteResult = JSON.parse(executeResult);
      expect(parsedExecuteResult.success).toBe(true);
      expect(parsedExecuteResult.data.execution_id).toBeDefined();
      expect(parsedExecuteResult.data.result.success).toBe(true);
    });

    it('should execute multiple actions in parallel', async () => {
      const result = await callTool('executeParallel', {
        calls: [
          { tool: 'test_tool_1', params: { param1: 'value1' } },
          { tool: 'test_tool_2', params: { param2: 'value2' } },
        ],
      });

      const parsedResult = JSON.parse(result);
      expect(parsedResult.success).toBe(true);
      expect(parsedResult.data.results).toHaveLength(2);
      expect(parsedResult.data.results[0].tool).toBe('test_tool_1');
      expect(parsedResult.data.results[1].tool).toBe('test_tool_2');
    });

    it('should reject an action proposal', async () => {
      // First create a proposal
      const proposalResult = await callTool('proposeAction', {
        workflow_id: 'workflow_1',
        actor_id: 'actor_1',
        tool: 'delete_database',
        params: { table: 'users' },
        reason: 'Clean up old data',
      });

      const proposalData = JSON.parse(proposalResult);
      const proposalId = proposalData.data.proposal_id;

      // Then reject it
      const reviewResult = await callTool('reviewAction', {
        proposal_id: proposalId,
        reviewer_id: 'actor_2',
        decision: 'reject',
      });

      const parsedReviewResult = JSON.parse(reviewResult);
      expect(parsedReviewResult.success).toBe(true);
      expect(parsedReviewResult.data.status).toBe('rejected');
    });

    it('should edit an action proposal', async () => {
      // First create a proposal
      const proposalResult = await callTool('proposeAction', {
        workflow_id: 'workflow_1',
        actor_id: 'actor_1',
        tool: 'update_database_schema',
        params: { table: 'users', column: 'email' },
        reason: 'Add email verification column',
      });

      const proposalData = JSON.parse(proposalResult);
      const proposalId = proposalData.data.proposal_id;

      // Then edit it
      const reviewResult = await callTool('reviewAction', {
        proposal_id: proposalId,
        reviewer_id: 'actor_2',
        decision: 'edit',
        edits: { column: 'email_verified' },
      });

      const parsedReviewResult = JSON.parse(reviewResult);
      expect(parsedReviewResult.success).toBe(true);
      expect(parsedReviewResult.data.status).toBe('edited');
      expect(parsedReviewResult.data.final_tool_call.params.column).toBe('email_verified');
    });
  });

  describe('Policy and Dry-Run Features', () => {
    it('should enable dry-run mode', async () => {
      const result = await callTool('updatePolicy', {
        dry_run: true,
        max_retries: 5,
        timeout_ms: 15000,
      });

      const parsedResult = JSON.parse(result);
      expect(parsedResult.success).toBe(true);
      expect(parsedResult.data.dry_run).toBe(true);
      expect(parsedResult.data.max_retries).toBe(5);
    });

    it('should simulate execution in dry-run mode', async () => {
      // Enable dry-run mode
      await callTool('updatePolicy', {
        dry_run: true,
      });

      // Create and approve a proposal
      const proposalResult = await callTool('proposeAction', {
        workflow_id: 'workflow_1',
        actor_id: 'actor_1',
        tool: 'update_database_schema',
        params: { table: 'users', column: 'email' },
        reason: 'Add email verification column',
      });

      const proposalData = JSON.parse(proposalResult);
      const proposalId = proposalData.data.proposal_id;

      await callTool('reviewAction', {
        proposal_id: proposalId,
        reviewer_id: 'actor_2',
        decision: 'approve',
      });

      // Execute in dry-run mode
      const executeResult = await callTool('executeAction', {
        proposal_id: proposalId,
      });

      const parsedExecuteResult = JSON.parse(executeResult);
      expect(parsedExecuteResult.success).toBe(true);
      expect(parsedExecuteResult.data.result.dryRun).toBe(true);
      expect(parsedExecuteResult.data.result.message).toContain('[DRY RUN]');
    });
  });

  describe('Query and Management Features', () => {
    it('should query action proposals by status', async () => {
      // Create multiple proposals
      await callTool('proposeAction', {
        workflow_id: 'workflow_1',
        actor_id: 'actor_1',
        tool: 'tool_1',
        params: {},
        reason: 'Test 1',
      });

      await callTool('proposeAction', {
        workflow_id: 'workflow_1',
        actor_id: 'actor_1',
        tool: 'tool_2',
        params: {},
        reason: 'Test 2',
      });

      // Query pending proposals
      const result = await callTool('queryActionProposals', {
        status: 'pending',
      });

      const parsedResult = JSON.parse(result);
      expect(parsedResult.success).toBe(true);
      expect(parsedResult.data).toHaveLength(2);
      expect(parsedResult.data.every((p: any) => p.status === 'pending')).toBe(true);
    });

    it('should get system statistics', async () => {
      // Create some data
      await callTool('createActor', {
        name: 'Test Actor',
        role: 'Tester',
        capabilities: ['testing'],
      });

      await callTool('createWorkflow', {
        name: 'Test Workflow',
        description: 'Test workflow',
        priority: 'medium',
        steps: [],
        assignedActors: [],
      });

      await callTool('proposeAction', {
        workflow_id: 'workflow_1',
        actor_id: 'actor_1',
        tool: 'test_tool',
        params: {},
        reason: 'Test proposal',
      });

      // Get statistics
      const result = await callTool('getStats', {});

      const parsedResult = JSON.parse(result);
      expect(parsedResult.success).toBe(true);
      expect(parsedResult.data.actors.total).toBe(1);
      expect(parsedResult.data.workflows.total).toBe(1);
      // Note: Action proposals are separate from regular proposals
      expect(parsedResult.data.proposals.total).toBe(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle a complete approval workflow', async () => {
      // 1. Create actors
      const developerResult = await callTool('createActor', {
        name: 'Developer',
        role: 'Developer',
        capabilities: ['coding', 'testing'],
      });

      const reviewerResult = await callTool('createActor', {
        name: 'Reviewer',
        role: 'Senior Developer',
        capabilities: ['code_review', 'approval'],
      });

      const developerId = JSON.parse(developerResult).data.id;
      const reviewerId = JSON.parse(reviewerResult).data.id;

      // 2. Create workflow
      const workflowResult = await callTool('createWorkflow', {
        name: 'Feature Deployment',
        description: 'Deploy new feature to production',
        priority: 'high',
        steps: [
          {
            name: 'Code Review',
            description: 'Review the code changes',
            actorId: reviewerId,
            dependencies: [],
            estimatedDuration: 1,
          },
        ],
        assignedActors: [developerId, reviewerId],
      });

      const workflowId = JSON.parse(workflowResult).data.id;

      // 3. Propose action
      const proposalResult = await callTool('proposeAction', {
        workflow_id: workflowId,
        actor_id: developerId,
        tool: 'deploy_to_production',
        params: { version: '1.2.0', environment: 'production' },
        reason: 'Deploy new user authentication feature',
      });

      const proposalId = JSON.parse(proposalResult).data.proposal_id;

      // 4. Review and approve
      const reviewResult = await callTool('reviewAction', {
        proposal_id: proposalId,
        reviewer_id: reviewerId,
        decision: 'approve',
      });

      const reviewData = JSON.parse(reviewResult);
      expect(reviewData.success).toBe(true);
      expect(reviewData.data.status).toBe('approved');

      // 5. Execute the approved action
      const executeResult = await callTool('executeAction', {
        proposal_id: proposalId,
      });

      const executeData = JSON.parse(executeResult);
      expect(executeData.success).toBe(true);
      expect(executeData.data.result.success).toBe(true);
    });

    it('should handle parallel execution with approval workflow', async () => {
      // Enable dry-run mode for safe testing
      await callTool('updatePolicy', {
        dry_run: true,
      });

      // Create actors
      await callTool('createActor', {
        name: 'DevOps Engineer',
        role: 'DevOps',
        capabilities: ['deployment', 'monitoring'],
      });

      // Execute parallel actions
      const parallelResult = await callTool('executeParallel', {
        calls: [
          { tool: 'deploy_frontend', params: { version: '1.0.0' } },
          { tool: 'deploy_backend', params: { version: '1.0.0' } },
          { tool: 'update_database', params: { migration: 'v1.0.0' } },
        ],
      });

      const parallelData = JSON.parse(parallelResult);
      expect(parallelData.success).toBe(true);
      expect(parallelData.data.results).toHaveLength(3);
      expect(parallelData.data.results.every((r: any) => r.success)).toBe(true);
    });
  });
});

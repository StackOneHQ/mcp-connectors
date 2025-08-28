import { describe, it, expect, beforeEach } from 'vitest';
import { orchestrationState } from './state';
import { forwardToRemote, executeWithRetry } from './execute';

describe('Orchestration Connector', () => {
  beforeEach(() => {
    orchestrationState.clearAll();
  });

  describe('Actor Management', () => {
    it('should create an actor with capabilities', () => {
      const actor = orchestrationState.createActor({
        name: 'John Developer',
        role: 'Software Engineer',
        capabilities: ['code_review', 'testing', 'deployment'],
      });

      expect(actor).toMatchObject({
        name: 'John Developer',
        role: 'Software Engineer',
        capabilities: ['code_review', 'testing', 'deployment'],
        status: 'active',
      });
      expect(actor.id).toMatch(/^actor_\d+$/);
      expect(actor.created_at).toBeDefined();
      expect(actor.updated_at).toBeDefined();
    });

    it('should retrieve an actor by ID', () => {
      const createdActor = orchestrationState.createActor({
        name: 'Sarah Reviewer',
        role: 'Senior Engineer',
        capabilities: ['code_review', 'architecture_review'],
      });

      const retrievedActor = orchestrationState.getActor(createdActor.id);
      expect(retrievedActor).toEqual(createdActor);
    });

    it('should update an actor', () => {
      const actor = orchestrationState.createActor({
        name: 'Mike Manager',
        role: 'Engineering Manager',
        capabilities: ['approval'],
      });

      const updatedActor = orchestrationState.updateActor({
        id: actor.id,
        status: 'busy',
        capabilities: ['approval', 'resource_allocation'],
      });

      expect(updatedActor).toMatchObject({
        id: actor.id,
        name: 'Mike Manager',
        role: 'Engineering Manager',
        status: 'busy',
        capabilities: ['approval', 'resource_allocation'],
      });
    });

    it('should query actors by capabilities', () => {
      orchestrationState.createActor({
        name: 'John Developer',
        role: 'Software Engineer',
        capabilities: ['code_review', 'testing'],
      });

      orchestrationState.createActor({
        name: 'Sarah Reviewer',
        role: 'Senior Engineer',
        capabilities: ['code_review', 'architecture_review'],
      });

      const codeReviewers = orchestrationState.queryActors({
        capabilities: ['code_review'],
      });

      expect(codeReviewers).toHaveLength(2);
      expect(codeReviewers.every(actor => actor.capabilities.includes('code_review'))).toBe(true);
    });

    it('should delete an actor', () => {
      const actor = orchestrationState.createActor({
        name: 'Test Actor',
        role: 'Test Role',
        capabilities: ['test'],
      });

      const deleted = orchestrationState.deleteActor(actor.id);
      expect(deleted).toBe(true);

      const retrievedActor = orchestrationState.getActor(actor.id);
      expect(retrievedActor).toBeUndefined();
    });
  });

  describe('Workflow Management', () => {
    it('should create a workflow with steps', () => {
      const workflow = orchestrationState.createWorkflow({
        name: 'Code Review Process',
        description: 'Standard code review workflow',
        priority: 'high',
        steps: [
          {
            name: 'Initial Review',
            description: 'Code quality review',
            actorId: 'actor_1',
            dependencies: [],
            estimatedDuration: 2,
          },
          {
            name: 'Security Review',
            description: 'Security assessment',
            actorId: 'actor_2',
            dependencies: ['step_0'],
            estimatedDuration: 1,
          },
        ],
        assignedActors: ['actor_1', 'actor_2'],
      });

      expect(workflow).toMatchObject({
        name: 'Code Review Process',
        description: 'Standard code review workflow',
        priority: 'high',
        status: 'draft',
        createdBy: 'system',
        assignedActors: ['actor_1', 'actor_2'],
      });

      expect(workflow.steps).toHaveLength(2);
      expect(workflow.steps[0]).toMatchObject({
        name: 'Initial Review',
        description: 'Code quality review',
        actorId: 'actor_1',
        status: 'pending',
        estimatedDuration: 2,
      });
      expect(workflow.steps[1]).toMatchObject({
        name: 'Security Review',
        description: 'Security assessment',
        actorId: 'actor_2',
        status: 'pending',
        dependencies: ['step_0'],
        estimatedDuration: 1,
      });
    });

    it('should update workflow status', () => {
      const workflow = orchestrationState.createWorkflow({
        name: 'Test Workflow',
        description: 'Test description',
        priority: 'medium',
        steps: [],
        assignedActors: [],
      });

      const updatedWorkflow = orchestrationState.updateWorkflow({
        id: workflow.id,
        status: 'active',
        priority: 'high',
      });

      expect(updatedWorkflow).toMatchObject({
        id: workflow.id,
        status: 'active',
        priority: 'high',
      });
    });

    it('should query workflows by status', () => {
      // Create a draft workflow (not used in test, but needed for setup)
      orchestrationState.createWorkflow({
        name: 'Draft Workflow',
        description: 'Draft workflow',
        priority: 'low',
        steps: [],
        assignedActors: [],
      });

      const activeWorkflow = orchestrationState.createWorkflow({
        name: 'Active Workflow',
        description: 'Active workflow',
        priority: 'medium',
        steps: [],
        assignedActors: [],
      });

      // Update the second workflow to active status
      orchestrationState.updateWorkflow({
        id: activeWorkflow.id,
        status: 'active',
      });

      const activeWorkflows = orchestrationState.queryWorkflows({
        status: 'active',
      });

      expect(activeWorkflows).toHaveLength(1);
      expect(activeWorkflows[0]?.name).toBe('Active Workflow');
    });
  });

  describe('Proposal Management', () => {
    it('should create a proposal with reviewers', () => {
      const proposal = orchestrationState.createProposal({
        title: 'API Documentation Update',
        description: 'Update API documentation for v2.0',
        priority: 'medium',
        assignedReviewers: ['actor_1', 'actor_2'],
      });

      expect(proposal).toMatchObject({
        title: 'API Documentation Update',
        description: 'Update API documentation for v2.0',
        priority: 'medium',
        status: 'draft',
        requester: 'system',
        assignedReviewers: ['actor_1', 'actor_2'],
        reviewComments: [],
      });
    });

    it('should update proposal with review comments', () => {
      const proposal = orchestrationState.createProposal({
        title: 'Test Proposal',
        description: 'Test description',
        priority: 'low',
        assignedReviewers: ['actor_1'],
      });

      const updatedProposal = orchestrationState.updateProposal({
        id: proposal.id,
        status: 'under_review',
        reviewComments: [
          {
            reviewer: 'actor_1',
            comment: 'This looks good, but needs more details.',
          },
        ],
      });

      expect(updatedProposal).toMatchObject({
        id: proposal.id,
        status: 'under_review',
      });
      expect(updatedProposal?.reviewComments).toHaveLength(1);
      expect(updatedProposal?.reviewComments[0]).toMatchObject({
        reviewer: 'actor_1',
        comment: 'This looks good, but needs more details.',
      });
    });

    it('should query proposals by status', () => {
      // Create a draft proposal (not used in test, but needed for setup)
      orchestrationState.createProposal({
        title: 'Draft Proposal',
        description: 'Draft proposal',
        priority: 'low',
        assignedReviewers: [],
      });

      const submittedProposal = orchestrationState.createProposal({
        title: 'Submitted Proposal',
        description: 'Submitted proposal',
        priority: 'medium',
        assignedReviewers: ['actor_1'],
      });

      // Update the second proposal to submitted status
      orchestrationState.updateProposal({
        id: submittedProposal.id,
        status: 'submitted',
      });

      const draftProposals = orchestrationState.queryProposals({
        status: 'draft',
      });

      expect(draftProposals).toHaveLength(1);
      expect(draftProposals[0]?.title).toBe('Draft Proposal');
    });
  });

  describe('Audit Events', () => {
    it('should create audit events for actor operations', () => {
      const actor = orchestrationState.createActor({
        name: 'Test Actor',
        role: 'Test Role',
        capabilities: ['test'],
      });

      const auditEvents = orchestrationState.queryAuditEvents({
        entityType: 'actor',
        entityId: actor.id,
      });

      expect(auditEvents).toHaveLength(1);
      expect(auditEvents[0]).toMatchObject({
        eventType: 'actor_created',
        entityType: 'actor',
        entityId: actor.id,
        userId: 'system',
      });
    });

    it('should query audit events by date range', () => {
      const startDate = new Date().toISOString();
      
      orchestrationState.createActor({
        name: 'Test Actor',
        role: 'Test Role',
        capabilities: ['test'],
      });

      const endDate = new Date().toISOString();

      const auditEvents = orchestrationState.queryAuditEvents({
        startDate,
        endDate,
      });

      expect(auditEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    it('should return comprehensive statistics', () => {
      // Create some test data
      orchestrationState.createActor({
        name: 'Actor 1',
        role: 'Role 1',
        capabilities: ['cap1'],
      });

      orchestrationState.createActor({
        name: 'Actor 2',
        role: 'Role 2',
        capabilities: ['cap2'],
      });

      orchestrationState.createWorkflow({
        name: 'Workflow 1',
        description: 'Description 1',
        priority: 'medium',
        steps: [],
        assignedActors: [],
      });

      orchestrationState.createProposal({
        title: 'Proposal 1',
        description: 'Description 1',
        priority: 'low',
        assignedReviewers: [],
      });

      const stats = orchestrationState.getStats();

      expect(stats.actors.total).toBe(2);
      expect(stats.actors.active).toBe(2);
      expect(stats.workflows.total).toBe(1);
      expect(stats.workflows.draft).toBe(1);
      expect(stats.proposals.total).toBe(1);
      expect(stats.proposals.draft).toBe(1);
      expect(stats.audit.total_events).toBeGreaterThan(0);
      expect(stats.policy).toBeDefined();
    });
  });

  describe('Policy Management', () => {
    it('should get default policy', () => {
      const policy = orchestrationState.getPolicy();
      expect(policy).toMatchObject({
        dry_run: false,
        max_retries: 3,
        timeout_ms: 10000,
      });
    });

    it('should update policy', () => {
      const updatedPolicy = orchestrationState.updatePolicy({
        dry_run: true,
        max_retries: 5,
        timeout_ms: 15000,
      });

      expect(updatedPolicy).toMatchObject({
        dry_run: true,
        max_retries: 5,
        timeout_ms: 15000,
      });
    });
  });

  describe('Remote Execution', () => {
    it('should handle dry-run mode', async () => {
      // Set dry-run mode
      orchestrationState.updatePolicy({ dry_run: true });

      const result = await forwardToRemote('test_tool', { param: 'value' });

      expect(result.success).toBe(true);
      expect(result.simulated).toBe(true);
      expect(result.data).toMatchObject({ ok: true, simulated: true });
    });

    it('should handle retry logic', async () => {
      // Set retry policy
      orchestrationState.updatePolicy({ 
        dry_run: true, 
        max_retries: 3 
      });

      const result = await executeWithRetry('test_tool', { param: 'value' });

      expect(result.success).toBe(true);
      expect(result.simulated).toBe(true);
    });
  });

  describe('Data Cleanup', () => {
    it('should clear all data', () => {
      // Create some test data
      orchestrationState.createActor({
        name: 'Test Actor',
        role: 'Test Role',
        capabilities: ['test'],
      });

      orchestrationState.createWorkflow({
        name: 'Test Workflow',
        description: 'Test description',
        priority: 'medium',
        steps: [],
        assignedActors: [],
      });

      orchestrationState.createProposal({
        title: 'Test Proposal',
        description: 'Test description',
        priority: 'low',
        assignedReviewers: [],
      });

      // Clear all data
      orchestrationState.clearAll();

      // Verify all data is cleared
      const stats = orchestrationState.getStats();
      expect(stats.actors.total).toBe(0);
      expect(stats.workflows.total).toBe(0);
      expect(stats.proposals.total).toBe(0);
      expect(stats.audit.total_events).toBe(0);
    });
  });
});

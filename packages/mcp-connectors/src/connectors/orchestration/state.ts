import { z } from 'zod';
import type { 
  ActorSchema, 
  WorkflowSchema, 
  ProposalSchema, 
  AuditEventSchema,
  CreateActorSchema,
  CreateWorkflowSchema,
  CreateProposalSchema,
  CreateAuditEventSchema,
  UpdateActorSchema,
  UpdateWorkflowSchema,
  UpdateProposalSchema,
  QueryActorsSchema,
  QueryWorkflowsSchema,
  QueryProposalsSchema,
  QueryAuditEventsSchema,
  PolicySchema,
  ActionProposalSchema,
  CreateActionProposalSchema,
  ReviewActionSchema,
  ExecuteActionSchema,
  ParallelExecutionSchema,
  ExecuteParallelSchema
} from './schema';

type Actor = z.infer<typeof ActorSchema>;
type Workflow = z.infer<typeof WorkflowSchema>;
type Proposal = z.infer<typeof ProposalSchema>;
type AuditEvent = z.infer<typeof AuditEventSchema>;
type CreateActor = z.infer<typeof CreateActorSchema>;
type CreateWorkflow = z.infer<typeof CreateWorkflowSchema>;
type CreateProposal = z.infer<typeof CreateProposalSchema>;
type CreateAuditEvent = z.infer<typeof CreateAuditEventSchema>;
type UpdateActor = z.infer<typeof UpdateActorSchema>;
type UpdateWorkflow = z.infer<typeof UpdateWorkflowSchema>;
type UpdateProposal = z.infer<typeof UpdateProposalSchema>;
type QueryActors = z.infer<typeof QueryActorsSchema>;
type QueryWorkflows = z.infer<typeof QueryWorkflowsSchema>;
type QueryProposals = z.infer<typeof QueryProposalsSchema>;
type QueryAuditEvents = z.infer<typeof QueryAuditEventsSchema>;
type Policy = z.infer<typeof PolicySchema>;
type ActionProposal = z.infer<typeof ActionProposalSchema>;
type CreateActionProposal = z.infer<typeof CreateActionProposalSchema>;
type ReviewAction = z.infer<typeof ReviewActionSchema>;
type ExecuteAction = z.infer<typeof ExecuteActionSchema>;
type ParallelExecution = z.infer<typeof ParallelExecutionSchema>;
type ExecuteParallel = z.infer<typeof ExecuteParallelSchema>;

class OrchestrationState {
  private actors: Map<string, Actor> = new Map();
  private workflows: Map<string, Workflow> = new Map();
  private proposals: Map<string, Proposal> = new Map();
  private auditEvents: Map<string, AuditEvent> = new Map();
  private actionProposals: Map<string, ActionProposal> = new Map();
  private parallelExecutions: Map<string, ParallelExecution> = new Map();
  private policy: Policy = {
    dry_run: false,
    max_retries: 3,
    timeout_ms: 10000,
  };
  
  private actorIdCounter = 1;
  private workflowIdCounter = 1;
  private proposalIdCounter = 1;
  private auditEventIdCounter = 1;
  private actionProposalIdCounter = 1;
  private parallelExecutionIdCounter = 1;

  // Policy management (from minimal orchestration)
  getPolicy(): Policy {
    return { ...this.policy };
  }

  updatePolicy(updates: Partial<Policy>): Policy {
    this.policy = { ...this.policy, ...updates };
    return this.getPolicy();
  }

  // Actor operations (enhanced from reviewable orchestration)
  createActor(data: CreateActor): Actor {
    const id = `actor_${this.actorIdCounter++}`;
    const now = new Date().toISOString();
    
    const actor: Actor = {
      id,
      name: data.name,
      role: data.role,
      capabilities: data.capabilities,
      status: 'active',
      created_at: now,
      updated_at: now,
    };
    
    this.actors.set(id, actor);
    this.createAuditEvent({
      eventType: 'actor_created',
      entityType: 'actor',
      entityId: id,
      userId: 'system',
      details: { actor },
    });
    
    return actor;
  }

  getActor(id: string): Actor | undefined {
    return this.actors.get(id);
  }

  updateActor(data: UpdateActor): Actor | null {
    const actor = this.actors.get(data.id);
    if (!actor) return null;

    const now = new Date().toISOString();
    const updatedActor: Actor = {
      ...actor,
      ...(data.name && { name: data.name }),
      ...(data.role && { role: data.role }),
      ...(data.capabilities && { capabilities: data.capabilities }),
      ...(data.status && { status: data.status }),
      updated_at: now,
    };

    this.actors.set(data.id, updatedActor);
    this.createAuditEvent({
      eventType: 'actor_updated',
      entityType: 'actor',
      entityId: data.id,
      userId: 'system',
      details: { actor: updatedActor },
    });

    return updatedActor;
  }

  queryActors(query: QueryActors): Actor[] {
    let filteredActors = Array.from(this.actors.values());

    if (query.status) {
      filteredActors = filteredActors.filter(actor => actor.status === query.status);
    }

    if (query.role) {
      filteredActors = filteredActors.filter(actor => actor.role.includes(query.role!));
    }

    if (query.capabilities && query.capabilities.length > 0) {
      filteredActors = filteredActors.filter(actor => 
        query.capabilities!.some(capability => actor.capabilities.includes(capability))
      );
    }

    return filteredActors;
  }

  deleteActor(id: string): boolean {
    const actor = this.actors.get(id);
    if (!actor) return false;

    this.actors.delete(id);
    this.createAuditEvent({
      eventType: 'actor_updated',
      entityType: 'actor',
      entityId: id,
      userId: 'system',
      details: { action: 'deleted', actor },
    });

    return true;
  }

  // Workflow operations (enhanced from reviewable orchestration)
  createWorkflow(data: CreateWorkflow): Workflow {
    const id = `workflow_${this.workflowIdCounter++}`;
    const now = new Date().toISOString();
    
    const steps = data.steps.map((step, index) => ({
      id: `step_${index}`,
      name: step.name,
      description: step.description,
      actorId: step.actorId,
      status: 'pending' as const,
      dependencies: step.dependencies,
      estimatedDuration: step.estimatedDuration,
    }));

    const workflow: Workflow = {
      id,
      name: data.name,
      description: data.description,
      status: 'draft',
      priority: data.priority,
      steps,
      createdBy: 'system',
      assignedActors: data.assignedActors,
      createdAt: now,
      updatedAt: now,
    };
    
    this.workflows.set(id, workflow);
    this.createAuditEvent({
      eventType: 'workflow_started',
      entityType: 'workflow',
      entityId: id,
      userId: 'system',
      details: { workflow },
    });
    
    return workflow;
  }

  getWorkflow(id: string): Workflow | undefined {
    return this.workflows.get(id);
  }

  updateWorkflow(data: UpdateWorkflow): Workflow | null {
    const workflow = this.workflows.get(data.id);
    if (!workflow) return null;

    const now = new Date().toISOString();
    const updatedWorkflow: Workflow = {
      ...workflow,
      ...(data.name && { name: data.name }),
      ...(data.description && { description: data.description }),
      ...(data.status && { status: data.status }),
      ...(data.priority && { priority: data.priority }),
      ...(data.steps && { steps: data.steps }),
      ...(data.assignedActors && { assignedActors: data.assignedActors }),
      updatedAt: now,
    };

    this.workflows.set(data.id, updatedWorkflow);
    this.createAuditEvent({
      eventType: 'workflow_started',
      entityType: 'workflow',
      entityId: data.id,
      userId: 'system',
      details: { workflow: updatedWorkflow },
    });

    return updatedWorkflow;
  }

  queryWorkflows(query: QueryWorkflows): Workflow[] {
    let filteredWorkflows = Array.from(this.workflows.values());

    if (query.status) {
      filteredWorkflows = filteredWorkflows.filter(workflow => workflow.status === query.status);
    }

    if (query.priority) {
      filteredWorkflows = filteredWorkflows.filter(workflow => workflow.priority === query.priority);
    }

    if (query.assignedActors && query.assignedActors.length > 0) {
      filteredWorkflows = filteredWorkflows.filter(workflow => 
        query.assignedActors!.some(actorId => workflow.assignedActors.includes(actorId))
      );
    }

    if (query.createdBy) {
      filteredWorkflows = filteredWorkflows.filter(workflow => workflow.createdBy === query.createdBy);
    }

    return filteredWorkflows;
  }

  deleteWorkflow(id: string): boolean {
    const workflow = this.workflows.get(id);
    if (!workflow) return false;

    this.workflows.delete(id);
    this.createAuditEvent({
      eventType: 'workflow_completed',
      entityType: 'workflow',
      entityId: id,
      userId: 'system',
      details: { action: 'deleted', workflow },
    });

    return true;
  }

  // Proposal operations (enhanced from reviewable orchestration)
  createProposal(data: CreateProposal): Proposal {
    const id = `proposal_${this.proposalIdCounter++}`;
    const now = new Date().toISOString();
    
    const proposal: Proposal = {
      id,
      title: data.title,
      description: data.description,
      status: 'draft',
      priority: data.priority,
      requester: 'system',
      assignedReviewers: data.assignedReviewers,
      createdAt: now,
      updatedAt: now,
      reviewComments: [],
    };
    
    this.proposals.set(id, proposal);
    this.createAuditEvent({
      eventType: 'proposal_submitted',
      entityType: 'proposal',
      entityId: id,
      userId: 'system',
      details: { proposal },
    });
    
    return proposal;
  }

  getProposal(id: string): Proposal | undefined {
    return this.proposals.get(id);
  }

  updateProposal(data: UpdateProposal): Proposal | null {
    const proposal = this.proposals.get(data.id);
    if (!proposal) return null;

    const now = new Date().toISOString();
    const updatedProposal: Proposal = {
      ...proposal,
      ...(data.title && { title: data.title }),
      ...(data.description && { description: data.description }),
      ...(data.status && { status: data.status }),
      ...(data.priority && { priority: data.priority }),
      ...(data.assignedReviewers && { assignedReviewers: data.assignedReviewers }),
      updatedAt: now,
    };

    // Handle review comments
    if (data.reviewComments && data.reviewComments.length > 0) {
      const newComments = data.reviewComments.map(comment => ({
        id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        reviewer: comment.reviewer,
        comment: comment.comment,
        timestamp: now,
      }));
      updatedProposal.reviewComments = [...updatedProposal.reviewComments, ...newComments];
    }

    this.proposals.set(data.id, updatedProposal);
    this.createAuditEvent({
      eventType: 'proposal_reviewed',
      entityType: 'proposal',
      entityId: data.id,
      userId: 'system',
      details: { proposal: updatedProposal },
    });

    return updatedProposal;
  }

  queryProposals(query: QueryProposals): Proposal[] {
    let filteredProposals = Array.from(this.proposals.values());

    if (query.status) {
      filteredProposals = filteredProposals.filter(proposal => proposal.status === query.status);
    }

    if (query.priority) {
      filteredProposals = filteredProposals.filter(proposal => proposal.priority === query.priority);
    }

    if (query.requester) {
      filteredProposals = filteredProposals.filter(proposal => proposal.requester === query.requester);
    }

    if (query.assignedReviewers && query.assignedReviewers.length > 0) {
      filteredProposals = filteredProposals.filter(proposal => 
        query.assignedReviewers!.some(reviewerId => proposal.assignedReviewers.includes(reviewerId))
      );
    }

    return filteredProposals;
  }

  deleteProposal(id: string): boolean {
    const proposal = this.proposals.get(id);
    if (!proposal) return false;

    this.proposals.delete(id);
    this.createAuditEvent({
      eventType: 'proposal_reviewed',
      entityType: 'proposal',
      entityId: id,
      userId: 'system',
      details: { action: 'deleted', proposal },
    });

    return true;
  }

  // Audit operations (enhanced from reviewable orchestration)
  createAuditEvent(data: CreateAuditEvent): AuditEvent {
    const id = `audit_${this.auditEventIdCounter++}`;
    const now = new Date().toISOString();
    
    const auditEvent: AuditEvent = {
      id,
      eventType: data.eventType,
      entityType: data.entityType,
      entityId: data.entityId,
      userId: data.userId,
      timestamp: now,
      details: data.details,
      metadata: data.metadata,
    };
    
    this.auditEvents.set(id, auditEvent);
    return auditEvent;
  }

  queryAuditEvents(query: QueryAuditEvents): AuditEvent[] {
    let filteredEvents = Array.from(this.auditEvents.values());

    if (query.eventType) {
      filteredEvents = filteredEvents.filter(event => event.eventType === query.eventType);
    }

    if (query.entityType) {
      filteredEvents = filteredEvents.filter(event => event.entityType === query.entityType);
    }

    if (query.entityId) {
      filteredEvents = filteredEvents.filter(event => event.entityId === query.entityId);
    }

    if (query.userId) {
      filteredEvents = filteredEvents.filter(event => event.userId === query.userId);
    }

    if (query.startDate) {
      filteredEvents = filteredEvents.filter(event => event.timestamp >= query.startDate!);
    }

    if (query.endDate) {
      filteredEvents = filteredEvents.filter(event => event.timestamp <= query.endDate!);
    }

    return filteredEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Statistics
  getStats() {
    return {
      actors: {
        total: this.actors.size,
        active: Array.from(this.actors.values()).filter(a => a.status === 'active').length,
        inactive: Array.from(this.actors.values()).filter(a => a.status === 'inactive').length,
        busy: Array.from(this.actors.values()).filter(a => a.status === 'busy').length,
      },
      workflows: {
        total: this.workflows.size,
        draft: Array.from(this.workflows.values()).filter(w => w.status === 'draft').length,
        active: Array.from(this.workflows.values()).filter(w => w.status === 'active').length,
        completed: Array.from(this.workflows.values()).filter(w => w.status === 'completed').length,
        cancelled: Array.from(this.workflows.values()).filter(w => w.status === 'cancelled').length,
      },
      proposals: {
        total: this.proposals.size,
        draft: Array.from(this.proposals.values()).filter(p => p.status === 'draft').length,
        submitted: Array.from(this.proposals.values()).filter(p => p.status === 'submitted').length,
        under_review: Array.from(this.proposals.values()).filter(p => p.status === 'under_review').length,
        approved: Array.from(this.proposals.values()).filter(p => p.status === 'approved').length,
        rejected: Array.from(this.proposals.values()).filter(p => p.status === 'rejected').length,
      },
      audit: {
        total_events: this.auditEvents.size,
      },
      policy: this.getPolicy(),
    };
  }

  // Approval-based workflow operations (from workflow orchestration)
  createActionProposal(data: CreateActionProposal): ActionProposal {
    const id = `action_proposal_${this.actionProposalIdCounter++}`;
    const now = new Date().toISOString();
    
    const actionProposal: ActionProposal = {
      id,
      workflowId: data.workflow_id,
      actorId: data.actor_id,
      tool: data.tool,
      params: data.params,
      reason: data.reason,
      status: 'pending',
      createdAt: now,
    };
    
    this.actionProposals.set(id, actionProposal);
    
    // Add audit entry
    this.createAuditEvent({
      eventType: 'proposal_submitted',
      entityType: 'proposal',
      entityId: id,
      userId: data.actor_id,
      details: {
        proposalId: id,
        tool: data.tool,
        reason: data.reason,
      },
    });
    
    return actionProposal;
  }

  getActionProposal(id: string): ActionProposal | undefined {
    return this.actionProposals.get(id);
  }

  reviewAction(data: ReviewAction): ActionProposal | null {
    const proposal = this.actionProposals.get(data.proposal_id);
    if (!proposal) return null;
    
    if (proposal.status !== 'pending') {
      throw new Error(`Proposal ${data.proposal_id} is not pending for review`);
    }
    
    const now = new Date().toISOString();
    
    // Update proposal
    proposal.status = data.decision === 'approve' ? 'approved' : data.decision === 'reject' ? 'rejected' : 'edited';
    proposal.reviewedAt = now;
    proposal.reviewerId = data.reviewer_id;
    proposal.decision = data.decision;
    
    if (data.edits) {
      proposal.edits = data.edits;
    }
    
    // Generate final tool call
    let finalToolCall = {
      tool: proposal.tool,
      params: proposal.params,
    };
    
    if (data.decision === 'edit' && data.edits) {
      finalToolCall.params = { ...proposal.params, ...data.edits };
    }
    
    proposal.finalToolCall = finalToolCall;
    
    // Add audit entry
    this.createAuditEvent({
      eventType: 'proposal_reviewed',
      entityType: 'proposal',
      entityId: data.proposal_id,
      userId: data.reviewer_id,
      details: {
        proposalId: data.proposal_id,
        decision: data.decision,
        edits: data.edits,
      },
    });
    
    return proposal;
  }

  executeAction(data: ExecuteAction): { executionId: string; result: any } | null {
    const proposal = this.actionProposals.get(data.proposal_id);
    if (!proposal) return null;
    
    if (proposal.status !== 'approved') {
      throw new Error(`Proposal ${data.proposal_id} is not approved for execution`);
    }
    
    const executionId = `execution_${Date.now()}`;
    
    // Simulate tool execution (in a real system, this would call the actual tool)
    const result = {
      success: true,
      executedAt: new Date().toISOString(),
      tool: proposal.finalToolCall!.tool,
      params: proposal.finalToolCall!.params,
      dryRun: this.policy.dry_run,
      message: this.policy.dry_run 
        ? `[DRY RUN] Would execute ${proposal.finalToolCall!.tool} with params: ${JSON.stringify(proposal.finalToolCall!.params)}`
        : `Successfully executed ${proposal.finalToolCall!.tool}`,
    };
    
    // Add audit entry
    this.createAuditEvent({
      eventType: this.policy.dry_run ? 'tool_simulated' : 'workflow_completed',
      entityType: 'tool',
      entityId: executionId,
      userId: proposal.actorId,
      details: {
        proposalId: data.proposal_id,
        executionId,
        result,
      },
    });
    
    return {
      executionId,
      result,
    };
  }

  executeParallel(data: ExecuteParallel): { results: any[] } {
    const parallelExecutionId = `parallel_${this.parallelExecutionIdCounter++}`;
    
    // Simulate parallel execution (in a real system, this would execute tools concurrently)
    const results = data.calls.map((call, index) => ({
      callIndex: index,
      tool: call.tool,
      params: call.params,
      success: true,
      result: this.policy.dry_run 
        ? `[DRY RUN] Would execute ${call.tool} with params: ${JSON.stringify(call.params)}`
        : `Successfully executed ${call.tool}`,
      executedAt: new Date().toISOString(),
    }));
    
    const parallelExecution: ParallelExecution = {
      id: parallelExecutionId,
      calls: data.calls,
      results,
      executedAt: new Date().toISOString(),
      dryRun: this.policy.dry_run,
    };
    
    this.parallelExecutions.set(parallelExecutionId, parallelExecution);
    
    return {
      results,
    };
  }

  queryActionProposals(query: { status?: string; actorId?: string; workflowId?: string }): ActionProposal[] {
    let filteredProposals = Array.from(this.actionProposals.values());

    if (query.status) {
      filteredProposals = filteredProposals.filter(proposal => proposal.status === query.status);
    }

    if (query.actorId) {
      filteredProposals = filteredProposals.filter(proposal => proposal.actorId === query.actorId);
    }

    if (query.workflowId) {
      filteredProposals = filteredProposals.filter(proposal => proposal.workflowId === query.workflowId);
    }

    return filteredProposals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Utility methods
  clearAll() {
    this.actors.clear();
    this.workflows.clear();
    this.proposals.clear();
    this.auditEvents.clear();
    this.actionProposals.clear();
    this.parallelExecutions.clear();
    this.actorIdCounter = 1;
    this.workflowIdCounter = 1;
    this.proposalIdCounter = 1;
    this.auditEventIdCounter = 1;
    this.actionProposalIdCounter = 1;
    this.parallelExecutionIdCounter = 1;
  }
}

export const orchestrationState = new OrchestrationState();


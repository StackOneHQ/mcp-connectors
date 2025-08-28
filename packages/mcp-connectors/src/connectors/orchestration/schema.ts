import { z } from 'zod';

// Policy configuration schema (from minimal orchestration)
export const PolicySchema = z.object({
  dry_run: z.boolean().default(false).describe('Whether to simulate execution instead of calling remote servers'),
  max_retries: z.number().min(1).max(10).default(3).describe('Maximum number of retry attempts'),
  timeout_ms: z.number().min(1000).max(30000).default(10000).describe('Request timeout in milliseconds'),
});

// Actor schemas (enhanced from reviewable orchestration)
export const ActorSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  capabilities: z.array(z.string()),
  status: z.enum(['active', 'inactive', 'busy']),
  currentWorkflow: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateActorSchema = z.object({
  name: z.string().min(1, 'Actor name is required'),
  role: z.string().min(1, 'Role is required'),
  capabilities: z.array(z.string()).min(1, 'At least one capability is required'),
});

export const UpdateActorSchema = z.object({
  id: z.string().min(1, 'Actor ID is required'),
  name: z.string().optional(),
  role: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  status: z.enum(['active', 'inactive', 'busy']).optional(),
});

// Workflow schemas (enhanced from reviewable orchestration)
export const WorkflowStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  actorId: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
  dependencies: z.array(z.string()),
  estimatedDuration: z.number().optional(),
  actualDuration: z.number().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  output: z.record(z.unknown()).optional(),
});

export const WorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  status: z.enum(['draft', 'active', 'completed', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  steps: z.array(WorkflowStepSchema),
  createdBy: z.string(),
  assignedActors: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
});

export const CreateWorkflowSchema = z.object({
  name: z.string().min(1, 'Workflow name is required'),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  steps: z.array(z.object({
    name: z.string().min(1, 'Step name is required'),
    description: z.string().min(1, 'Step description is required'),
    actorId: z.string().optional(),
    dependencies: z.array(z.string()).default([]),
    estimatedDuration: z.number().optional(),
  })),
  assignedActors: z.array(z.string()).default([]),
});

export const UpdateWorkflowSchema = z.object({
  id: z.string().min(1, 'Workflow ID is required'),
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  steps: z.array(WorkflowStepSchema).optional(),
  assignedActors: z.array(z.string()).optional(),
});

// Proposal schemas (enhanced from reviewable orchestration)
export const ProposalSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(['draft', 'submitted', 'under_review', 'approved', 'rejected']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  requester: z.string(),
  assignedReviewers: z.array(z.string()),
  workflowId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  submittedAt: z.string().optional(),
  reviewedAt: z.string().optional(),
  reviewComments: z.array(z.object({
    id: z.string(),
    reviewer: z.string(),
    comment: z.string(),
    timestamp: z.string(),
  })).default([]),
});

export const CreateProposalSchema = z.object({
  title: z.string().min(1, 'Proposal title is required'),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assignedReviewers: z.array(z.string()).default([]),
});

export const UpdateProposalSchema = z.object({
  id: z.string().min(1, 'Proposal ID is required'),
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'submitted', 'under_review', 'approved', 'rejected']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedReviewers: z.array(z.string()).optional(),
  reviewComments: z.array(z.object({
    reviewer: z.string(),
    comment: z.string(),
  })).optional(),
});

// Audit event schemas (enhanced from reviewable orchestration)
export const AuditEventSchema = z.object({
  id: z.string(),
  eventType: z.enum(['actor_created', 'actor_updated', 'workflow_started', 'workflow_completed', 'proposal_submitted', 'proposal_reviewed', 'tool_simulated', 'tool_failed']),
  entityType: z.enum(['actor', 'workflow', 'proposal', 'tool']),
  entityId: z.string(),
  userId: z.string(),
  timestamp: z.string(),
  details: z.record(z.unknown()),
  metadata: z.record(z.unknown()).optional(),
});

export const CreateAuditEventSchema = z.object({
  eventType: z.enum(['actor_created', 'actor_updated', 'workflow_started', 'workflow_completed', 'proposal_submitted', 'proposal_reviewed', 'tool_simulated', 'tool_failed']),
  entityType: z.enum(['actor', 'workflow', 'proposal', 'tool']),
  entityId: z.string().min(1, 'Entity ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  details: z.record(z.unknown()).default({}),
  metadata: z.record(z.unknown()).optional(),
});

// Query schemas (enhanced from reviewable orchestration)
export const QueryActorsSchema = z.object({
  status: z.enum(['active', 'inactive', 'busy']).optional(),
  role: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
});

export const QueryWorkflowsSchema = z.object({
  status: z.enum(['draft', 'active', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedActors: z.array(z.string()).optional(),
  createdBy: z.string().optional(),
});

export const QueryProposalsSchema = z.object({
  status: z.enum(['draft', 'submitted', 'under_review', 'approved', 'rejected']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  requester: z.string().optional(),
  assignedReviewers: z.array(z.string()).optional(),
});

export const QueryAuditEventsSchema = z.object({
  eventType: z.enum(['actor_created', 'actor_updated', 'workflow_started', 'workflow_completed', 'proposal_submitted', 'proposal_reviewed', 'tool_simulated', 'tool_failed']).optional(),
  entityType: z.enum(['actor', 'workflow', 'proposal', 'tool']).optional(),
  entityId: z.string().optional(),
  userId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// Remote execution schemas (from minimal orchestration)
export const ExecuteRequestSchema = z.object({
  server_url: z.string().url('Must be a valid URL'),
  tool_name: z.string().min(1, 'Tool name is required'),
  args: z.record(z.unknown()).optional(),
  timeout_ms: z.number().min(1000).max(30000).default(10000),
});

export const ExecuteResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  simulated: z.boolean().optional(),
  execution_time_ms: z.number().optional(),
});

// Approval-based workflow schemas (from workflow orchestration)
export const ActionProposalSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  actorId: z.string(),
  tool: z.string(),
  params: z.record(z.unknown()),
  reason: z.string(),
  status: z.enum(['pending', 'approved', 'rejected', 'edited']),
  createdAt: z.string(),
  reviewedAt: z.string().optional(),
  reviewerId: z.string().optional(),
  decision: z.enum(['approve', 'reject', 'edit']).optional(),
  edits: z.record(z.unknown()).optional(),
  finalToolCall: z.object({
    tool: z.string(),
    params: z.record(z.unknown()),
  }).optional(),
});

export const CreateActionProposalSchema = z.object({
  workflow_id: z.string().min(1, 'Workflow ID is required'),
  actor_id: z.string().min(1, 'Actor ID is required'),
  tool: z.string().min(1, 'Tool name is required'),
  params: z.record(z.unknown()).default({}),
  reason: z.string().min(1, 'Reason is required'),
});

export const ReviewActionSchema = z.object({
  proposal_id: z.string().min(1, 'Proposal ID is required'),
  reviewer_id: z.string().min(1, 'Reviewer ID is required'),
  decision: z.enum(['approve', 'reject', 'edit']),
  edits: z.record(z.unknown()).optional(),
});

export const ExecuteActionSchema = z.object({
  proposal_id: z.string().min(1, 'Proposal ID is required'),
});

export const ParallelExecutionSchema = z.object({
  id: z.string(),
  calls: z.array(z.object({
    tool: z.string(),
    params: z.record(z.unknown()),
  })),
  results: z.array(z.unknown()),
  executedAt: z.string(),
  dryRun: z.boolean(),
});

export const ExecuteParallelSchema = z.object({
  calls: z.array(z.object({
    tool: z.string().min(1, 'Tool name is required'),
    params: z.record(z.unknown()).default({}),
  })).min(1, 'At least one call is required'),
});

// Response schemas (from reviewable orchestration)
export const ActorResponseSchema = z.object({
  success: z.boolean(),
  data: ActorSchema.optional(),
  error: z.string().optional(),
});

export const ActorsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(ActorSchema).optional(),
  error: z.string().optional(),
});

export const WorkflowResponseSchema = z.object({
  success: z.boolean(),
  data: WorkflowSchema.optional(),
  error: z.string().optional(),
});

export const WorkflowsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(WorkflowSchema).optional(),
  error: z.string().optional(),
});

export const ProposalResponseSchema = z.object({
  success: z.boolean(),
  data: ProposalSchema.optional(),
  error: z.string().optional(),
});

export const ProposalsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(ProposalSchema).optional(),
  error: z.string().optional(),
});

export const AuditEventsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(AuditEventSchema).optional(),
  error: z.string().optional(),
});


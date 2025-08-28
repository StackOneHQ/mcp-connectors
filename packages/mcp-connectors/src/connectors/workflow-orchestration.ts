import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

// Types for the workflow orchestration system
interface Actor {
  id: string;
  name: string;
  role: string;
  createdAt: Date;
}

interface Workflow {
  id: string;
  title: string;
  createdAt: Date;
  status: 'active' | 'completed' | 'cancelled';
}

interface Proposal {
  id: string;
  workflowId: string;
  actorId: string;
  tool: string;
  params: Record<string, any>;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'edited';
  createdAt: Date;
  reviewedAt?: Date;
  reviewerId?: string;
  decision?: 'approve' | 'reject' | 'edit';
  edits?: Record<string, any>;
  finalToolCall?: Record<string, any>;
}

interface Execution {
  id: string;
  proposalId: string;
  result: any;
  executedAt: Date;
  dryRun: boolean;
}

interface AuditEntry {
  id: string;
  workflowId: string;
  timestamp: Date;
  action: string;
  actorId: string;
  details: Record<string, any>;
}

interface ParallelExecution {
  id: string;
  calls: Array<{
    tool: string;
    params: Record<string, any>;
  }>;
  results: Array<any>;
  executedAt: Date;
  dryRun: boolean;
}

// In-memory state storage
const state = {
  actors: new Map<string, Actor>(),
  workflows: new Map<string, Workflow>(),
  proposals: new Map<string, Proposal>(),
  executions: new Map<string, Execution>(),
  parallelExecutions: new Map<string, ParallelExecution>(),
  auditLog: [] as AuditEntry[],
  dryRunMode: false,
  nextIds: {
    actor: 1,
    workflow: 1,
    proposal: 1,
    execution: 1,
    parallelExecution: 1,
    auditEntry: 1,
  },
};

// Helper functions
const generateId = (type: keyof typeof state.nextIds): string => {
  const id = `${type}_${state.nextIds[type]}`;
  state.nextIds[type]++;
  return id;
};

const addAuditEntry = (workflowId: string, action: string, actorId: string, details: Record<string, any>) => {
  const entry: AuditEntry = {
    id: generateId('auditEntry'),
    workflowId,
    timestamp: new Date(),
    action,
    actorId,
    details,
  };
  state.auditLog.push(entry);
  return entry;
};

const validateActor = (actorId: string): Actor => {
  const actor = state.actors.get(actorId);
  if (!actor) {
    throw new Error(`Actor with ID ${actorId} not found`);
  }
  return actor;
};

const validateWorkflow = (workflowId: string): Workflow => {
  const workflow = state.workflows.get(workflowId);
  if (!workflow) {
    throw new Error(`Workflow with ID ${workflowId} not found`);
  }
  return workflow;
};

const validateProposal = (proposalId: string): Proposal => {
  const proposal = state.proposals.get(proposalId);
  if (!proposal) {
    throw new Error(`Proposal with ID ${proposalId} not found`);
  }
  return proposal;
};

export const WorkflowOrchestrationConnectorConfig = mcpConnectorConfig({
  name: 'Workflow Orchestration',
  key: 'workflow-orchestration',
  version: '1.0.0',
  credentials: z.object({}),
  setup: z.object({}),
  logo: 'https://stackone-logos.com/api/disco/filled/svg',
  description: 'A workflow orchestration system with proposal, review, execution, and audit capabilities',
  examplePrompt: 'Create a workflow for deploying a new feature, propose an action to update the database schema, review it, and execute it with audit logging.',
  tools: (tool) => ({
    REGISTER_ACTOR: tool({
      name: 'register_actor',
      description: 'Register a new actor in the workflow system',
      schema: z.object({
        name: z.string().describe('Name of the actor'),
        role: z.string().describe('Role of the actor in the workflow'),
      }),
      handler: async (args) => {
        const actorId = generateId('actor');
        const actor: Actor = {
          id: actorId,
          name: args.name,
          role: args.role,
          createdAt: new Date(),
        };
        
        state.actors.set(actorId, actor);
        
        return JSON.stringify({
          actor_id: actorId,
        });
      },
    }),

    START_WORKFLOW: tool({
      name: 'start_workflow',
      description: 'Start a new workflow',
      schema: z.object({
        title: z.string().describe('Title of the workflow'),
      }),
      handler: async (args) => {
        const workflowId = generateId('workflow');
        const workflow: Workflow = {
          id: workflowId,
          title: args.title,
          createdAt: new Date(),
          status: 'active',
        };
        
        state.workflows.set(workflowId, workflow);
        
        return JSON.stringify({
          workflow_id: workflowId,
        });
      },
    }),

    PROPOSE_ACTION: tool({
      name: 'propose_action',
      description: 'Propose an action to be reviewed and executed',
      schema: z.object({
        workflow_id: z.string().describe('ID of the workflow'),
        actor_id: z.string().describe('ID of the actor proposing the action'),
        tool: z.string().describe('Tool to be executed'),
        params: z.record(z.any()).describe('Parameters for the tool'),
        reason: z.string().describe('Reason for proposing this action'),
      }),
      handler: async (args) => {
        // Validate inputs
        validateWorkflow(args.workflow_id);
        validateActor(args.actor_id);
        
        const proposalId = generateId('proposal');
        const proposal: Proposal = {
          id: proposalId,
          workflowId: args.workflow_id,
          actorId: args.actor_id,
          tool: args.tool,
          params: args.params,
          reason: args.reason,
          status: 'pending',
          createdAt: new Date(),
        };
        
        state.proposals.set(proposalId, proposal);
        
        // Add audit entry
        addAuditEntry(args.workflow_id, 'propose_action', args.actor_id, {
          proposalId,
          tool: args.tool,
          reason: args.reason,
        });
        
        return JSON.stringify({
          proposal_id: proposalId,
          status: 'pending',
        });
      },
    }),

    REVIEW_ACTION: tool({
      name: 'review_action',
      description: 'Review a proposed action',
      schema: z.object({
        proposal_id: z.string().describe('ID of the proposal to review'),
        reviewer_id: z.string().describe('ID of the reviewer'),
        decision: z.enum(['approve', 'reject', 'edit']).describe('Decision on the proposal'),
        edits: z.record(z.any()).optional().describe('Edits to the proposal (if decision is edit)'),
      }),
      handler: async (args) => {
        // Validate inputs
        const proposal = validateProposal(args.proposal_id);
        validateActor(args.reviewer_id);
        
        if (proposal.status !== 'pending') {
          throw new Error(`Proposal ${args.proposal_id} is not pending for review`);
        }
        
        // Update proposal
        proposal.status = args.decision === 'approve' ? 'approved' : args.decision === 'reject' ? 'rejected' : 'edited';
        proposal.reviewedAt = new Date();
        proposal.reviewerId = args.reviewer_id;
        proposal.decision = args.decision;
        
        if (args.edits) {
          proposal.edits = args.edits;
        }
        
        // Generate final tool call
        let finalToolCall = {
          tool: proposal.tool,
          params: proposal.params,
        };
        
        if (args.decision === 'edit' && args.edits) {
          finalToolCall.params = { ...proposal.params, ...args.edits };
        }
        
        proposal.finalToolCall = finalToolCall;
        
        // Add audit entry
        addAuditEntry(proposal.workflowId, 'review_action', args.reviewer_id, {
          proposalId: args.proposal_id,
          decision: args.decision,
          edits: args.edits,
        });
        
        return JSON.stringify({
          status: proposal.status,
          final_tool_call: finalToolCall,
        });
      },
    }),

    EXECUTE_ACTION: tool({
      name: 'execute_action',
      description: 'Execute an approved action',
      schema: z.object({
        proposal_id: z.string().describe('ID of the proposal to execute'),
      }),
      handler: async (args) => {
        const proposal = validateProposal(args.proposal_id);
        
        if (proposal.status !== 'approved') {
          throw new Error(`Proposal ${args.proposal_id} is not approved for execution`);
        }
        
        const executionId = generateId('execution');
        
        // Simulate tool execution (in a real system, this would call the actual tool)
        const result = {
          success: true,
          executedAt: new Date().toISOString(),
          tool: proposal.finalToolCall!.tool,
          params: proposal.finalToolCall!.params,
          dryRun: state.dryRunMode,
          message: state.dryRunMode 
            ? `[DRY RUN] Would execute ${proposal.finalToolCall!.tool} with params: ${JSON.stringify(proposal.finalToolCall!.params)}`
            : `Successfully executed ${proposal.finalToolCall!.tool}`,
        };
        
        const execution: Execution = {
          id: executionId,
          proposalId: args.proposal_id,
          result,
          executedAt: new Date(),
          dryRun: state.dryRunMode,
        };
        
        state.executions.set(executionId, execution);
        
        // Add audit entry
        addAuditEntry(proposal.workflowId, 'execute_action', proposal.actorId, {
          proposalId: args.proposal_id,
          executionId,
          result,
        });
        
        return JSON.stringify({
          execution_id: executionId,
          result,
        });
      },
    }),

    EXECUTE_PARALLEL: tool({
      name: 'execute_parallel',
      description: 'Execute multiple tool calls in parallel',
      schema: z.object({
        calls: z.array(z.object({
          tool: z.string().describe('Tool to execute'),
          params: z.record(z.any()).describe('Parameters for the tool'),
        })).describe('Array of tool calls to execute in parallel'),
      }),
      handler: async (args) => {
        const parallelExecutionId = generateId('parallelExecution');
        
        // Simulate parallel execution (in a real system, this would execute tools concurrently)
        const results = args.calls.map((call, index) => ({
          callIndex: index,
          tool: call.tool,
          params: call.params,
          success: true,
          result: state.dryRunMode 
            ? `[DRY RUN] Would execute ${call.tool} with params: ${JSON.stringify(call.params)}`
            : `Successfully executed ${call.tool}`,
          executedAt: new Date().toISOString(),
        }));
        
        const parallelExecution: ParallelExecution = {
          id: parallelExecutionId,
          calls: args.calls,
          results,
          executedAt: new Date(),
          dryRun: state.dryRunMode,
        };
        
        state.parallelExecutions.set(parallelExecutionId, parallelExecution);
        
        return JSON.stringify({
          results,
        });
      },
    }),

    GET_AUDIT_LOG: tool({
      name: 'get_audit_log',
      description: 'Get the audit log for a workflow',
      schema: z.object({
        workflow_id: z.string().describe('ID of the workflow'),
      }),
      handler: async (args) => {
        validateWorkflow(args.workflow_id);
        
        const entries = state.auditLog
          .filter(entry => entry.workflowId === args.workflow_id)
          .map(entry => ({
            id: entry.id,
            timestamp: entry.timestamp.toISOString(),
            action: entry.action,
            actor_id: entry.actorId,
            details: entry.details,
          }))
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        return JSON.stringify({
          entries,
        });
      },
    }),

    SET_POLICY: tool({
      name: 'set_policy',
      description: 'Set system policies like dry-run mode',
      schema: z.object({
        dry_run: z.boolean().optional().describe('Whether to enable dry-run mode'),
      }),
      handler: async (args) => {
        if (args.dry_run !== undefined) {
          state.dryRunMode = args.dry_run;
        }
        
        return JSON.stringify({
          dry_run: state.dryRunMode,
        });
      },
    }),
  }),
});

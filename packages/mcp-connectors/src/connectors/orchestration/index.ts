import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';
import { orchestrationState } from './state';
import { forwardToRemote, executeWithRetry } from './execute';
import {
  CreateActorSchema,
  UpdateActorSchema,
  QueryActorsSchema,
  CreateWorkflowSchema,
  UpdateWorkflowSchema,
  QueryWorkflowsSchema,
  CreateProposalSchema,
  UpdateProposalSchema,
  QueryProposalsSchema,
  QueryAuditEventsSchema,
  ExecuteRequestSchema,
  CreateActionProposalSchema,
  ReviewActionSchema,
  ExecuteActionSchema,
  ExecuteParallelSchema,
} from './schema';

export const OrchestrationConnectorConfig = mcpConnectorConfig({
  name: 'Orchestration',
  key: 'orchestration',
  version: '2.0.0',
  description: 'A comprehensive orchestration system for managing actors, workflows, proposals, and audit trails with enterprise-grade features, policy management, and approval-based workflow execution.',
  credentials: z.object({
    apiKey: z.string().optional(),
    serverUrl: z.string().url().optional(),
  }),
  setup: z.object({
    enableAudit: z.boolean().default(true),
    dryRun: z.boolean().default(false),
    maxRetries: z.number().min(1).max(10).default(3),
    timeoutMs: z.number().min(1000).max(30000).default(10000),
  }),
  examplePrompt: 'Create a comprehensive workflow for code review with multiple actors, approval stages, audit tracking, and action proposals that require review before execution',
  tools: (tool) => ({
    // Actor Management Tools
    createActor: tool({
      name: 'createActor',
      description: 'Create a new actor in the orchestration system',
      schema: CreateActorSchema,
      handler: async (args) => {
        try {
          const actor = orchestrationState.createActor(args);
          return JSON.stringify({
            success: true,
            data: actor,
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    }),

    getActor: tool({
      name: 'getActor',
      description: 'Retrieve a specific actor by ID',
      schema: z.object({
        id: z.string().min(1, 'Actor ID is required'),
      }),
      handler: async (args) => {
        try {
          const actor = orchestrationState.getActor(args.id);
          if (!actor) {
            return JSON.stringify({
              success: false,
              error: 'Actor not found',
            });
          }
          return JSON.stringify({
            success: true,
            data: actor,
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    }),

    updateActor: tool({
      name: 'updateActor',
      description: 'Update an existing actor',
      schema: UpdateActorSchema,
      handler: async (args) => {
        try {
          const actor = orchestrationState.updateActor(args);
          if (!actor) {
            return JSON.stringify({
              success: false,
              error: 'Actor not found',
            });
          }
          return JSON.stringify({
            success: true,
            data: actor,
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    }),

    queryActors: tool({
      name: 'queryActors',
      description: 'Query actors with filters',
      schema: QueryActorsSchema,
      handler: async (args) => {
        try {
          const actors = orchestrationState.queryActors(args);
          return JSON.stringify({
            success: true,
            data: actors,
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    }),

    deleteActor: tool({
      name: 'deleteActor',
      description: 'Delete an actor by ID',
      schema: z.object({
        id: z.string().min(1, 'Actor ID is required'),
      }),
      handler: async (args) => {
        try {
          const deleted = orchestrationState.deleteActor(args.id);
          return JSON.stringify({
            success: deleted,
            error: deleted ? undefined : 'Actor not found',
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    }),

    // Workflow Management Tools
    createWorkflow: tool({
      name: 'createWorkflow',
      description: 'Create a new workflow',
      schema: CreateWorkflowSchema,
      handler: async (args) => {
        try {
          const workflow = orchestrationState.createWorkflow(args);
          return JSON.stringify({
            success: true,
            data: workflow,
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    }),

    getWorkflow: tool({
      name: 'getWorkflow',
      description: 'Retrieve a specific workflow by ID',
      schema: z.object({
        id: z.string().min(1, 'Workflow ID is required'),
      }),
      handler: async (args) => {
        try {
          const workflow = orchestrationState.getWorkflow(args.id);
          if (!workflow) {
            return JSON.stringify({
              success: false,
              error: 'Workflow not found',
            });
          }
          return JSON.stringify({
            success: true,
            data: workflow,
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    }),

    updateWorkflow: tool({
      name: 'updateWorkflow',
      description: 'Update an existing workflow',
      schema: UpdateWorkflowSchema,
      handler: async (args) => {
        try {
          const workflow = orchestrationState.updateWorkflow(args);
          if (!workflow) {
            return JSON.stringify({
              success: false,
              error: 'Workflow not found',
            });
          }
          return JSON.stringify({
            success: true,
            data: workflow,
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    }),

    queryWorkflows: tool({
      name: 'queryWorkflows',
      description: 'Query workflows with filters',
      schema: QueryWorkflowsSchema,
      handler: async (args) => {
        try {
          const workflows = orchestrationState.queryWorkflows(args);
          return JSON.stringify({
            success: true,
            data: workflows,
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    }),

    deleteWorkflow: tool({
      name: 'deleteWorkflow',
      description: 'Delete a workflow by ID',
      schema: z.object({
        id: z.string().min(1, 'Workflow ID is required'),
      }),
      handler: async (args) => {
        try {
          const deleted = orchestrationState.deleteWorkflow(args.id);
          return JSON.stringify({
            success: deleted,
            error: deleted ? undefined : 'Workflow not found',
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    }),

    // Proposal Management Tools
    createProposal: tool({
      name: 'createProposal',
      description: 'Create a new proposal',
      schema: CreateProposalSchema,
      handler: async (args) => {
        try {
          const proposal = orchestrationState.createProposal(args);
          return JSON.stringify({
            success: true,
            data: proposal,
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    }),

    getProposal: tool({
      name: 'getProposal',
      description: 'Retrieve a specific proposal by ID',
      schema: z.object({
        id: z.string().min(1, 'Proposal ID is required'),
      }),
      handler: async (args) => {
        try {
          const proposal = orchestrationState.getProposal(args.id);
          if (!proposal) {
            return JSON.stringify({
              success: false,
              error: 'Proposal not found',
            });
          }
          return JSON.stringify({
            success: true,
            data: proposal,
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    }),

    updateProposal: tool({
      name: 'updateProposal',
      description: 'Update an existing proposal',
      schema: UpdateProposalSchema,
      handler: async (args) => {
        try {
          const proposal = orchestrationState.updateProposal(args);
          if (!proposal) {
            return JSON.stringify({
              success: false,
              error: 'Proposal not found',
            });
          }
          return JSON.stringify({
            success: true,
            data: proposal,
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    }),

    queryProposals: tool({
      name: 'queryProposals',
      description: 'Query proposals with filters',
      schema: QueryProposalsSchema,
      handler: async (args) => {
        try {
          const proposals = orchestrationState.queryProposals(args);
          return JSON.stringify({
            success: true,
            data: proposals,
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    }),

    deleteProposal: tool({
      name: 'deleteProposal',
      description: 'Delete a proposal by ID',
      schema: z.object({
        id: z.string().min(1, 'Proposal ID is required'),
      }),
      handler: async (args) => {
        try {
          const deleted = orchestrationState.deleteProposal(args.id);
          return JSON.stringify({
            success: deleted,
            error: deleted ? undefined : 'Proposal not found',
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    }),

    // Audit Tools
    queryAuditEvents: tool({
      name: 'queryAuditEvents',
      description: 'Query audit events with filters',
      schema: QueryAuditEventsSchema,
      handler: async (args) => {
        try {
          const events = orchestrationState.queryAuditEvents(args);
          return JSON.stringify({
            success: true,
            data: events,
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    }),

    getStats: tool({
      name: 'getStats',
      description: 'Get system statistics',
      schema: z.object({}),
      handler: async () => {
        try {
          const stats = orchestrationState.getStats();
          return JSON.stringify({
            success: true,
            data: stats,
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    }),

    // Policy Management Tools
    getPolicy: tool({
      name: 'getPolicy',
      description: 'Get current policy configuration',
      schema: z.object({}),
      handler: async () => {
        try {
          const policy = orchestrationState.getPolicy();
          return JSON.stringify({
            success: true,
            data: policy,
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    }),

    updatePolicy: tool({
      name: 'updatePolicy',
      description: 'Update policy configuration',
      schema: z.object({
        dry_run: z.boolean().optional(),
        max_retries: z.number().min(1).max(10).optional(),
        timeout_ms: z.number().min(1000).max(30000).optional(),
      }),
      handler: async (args) => {
        try {
          const policy = orchestrationState.updatePolicy(args);
          return JSON.stringify({
            success: true,
            data: policy,
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    }),

    // Remote Execution Tools
    forwardToolCall: tool({
      name: 'forwardToolCall',
      description: 'Forward a tool call to a remote MCP server',
      schema: ExecuteRequestSchema,
      handler: async (args) => {
        try {
          const result = await forwardToRemote(args.tool_name, args.args || {});
          return JSON.stringify(result);
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    }),

    executeWithRetry: tool({
      name: 'executeWithRetry',
      description: 'Execute a tool call with retry logic',
      schema: z.object({
        tool: z.string().min(1, 'Tool name is required'),
        params: z.record(z.unknown()).optional(),
      }),
      handler: async (args) => {
        try {
          const result = await executeWithRetry(args.tool, args.params || {});
          return JSON.stringify(result);
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    }),

    // Approval-Based Workflow Tools (from workflow orchestration)
    proposeAction: tool({
      name: 'proposeAction',
      description: 'Propose an action to be reviewed and approved before execution',
      schema: CreateActionProposalSchema,
      handler: async (args) => {
        try {
          const proposal = orchestrationState.createActionProposal(args);
          return JSON.stringify({
            success: true,
            data: {
              proposal_id: proposal.id,
              status: proposal.status,
            },
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    }),

    reviewAction: tool({
      name: 'reviewAction',
      description: 'Review a proposed action with approve/reject/edit decision',
      schema: ReviewActionSchema,
      handler: async (args) => {
        try {
          const proposal = orchestrationState.reviewAction(args);
          if (!proposal) {
            return JSON.stringify({
              success: false,
              error: 'Proposal not found',
            });
          }
          return JSON.stringify({
            success: true,
            data: {
              status: proposal.status,
              final_tool_call: proposal.finalToolCall,
            },
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    }),

    executeAction: tool({
      name: 'executeAction',
      description: 'Execute an approved action',
      schema: ExecuteActionSchema,
      handler: async (args) => {
        try {
          const result = orchestrationState.executeAction(args);
          if (!result) {
            return JSON.stringify({
              success: false,
              error: 'Proposal not found',
            });
          }
          return JSON.stringify({
            success: true,
            data: {
              execution_id: result.executionId,
              result: result.result,
            },
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    }),

    executeParallel: tool({
      name: 'executeParallel',
      description: 'Execute multiple tool calls in parallel',
      schema: ExecuteParallelSchema,
      handler: async (args) => {
        try {
          const result = orchestrationState.executeParallel(args);
          return JSON.stringify({
            success: true,
            data: result,
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    }),

    getActionProposal: tool({
      name: 'getActionProposal',
      description: 'Get a specific action proposal by ID',
      schema: z.object({
        id: z.string().min(1, 'Proposal ID is required'),
      }),
      handler: async (args) => {
        try {
          const proposal = orchestrationState.getActionProposal(args.id);
          if (!proposal) {
            return JSON.stringify({
              success: false,
              error: 'Proposal not found',
            });
          }
          return JSON.stringify({
            success: true,
            data: proposal,
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    }),

    queryActionProposals: tool({
      name: 'queryActionProposals',
      description: 'Query action proposals by status, actor, or workflow',
      schema: z.object({
        status: z.enum(['pending', 'approved', 'rejected', 'edited']).optional(),
        actorId: z.string().optional(),
        workflowId: z.string().optional(),
      }),
      handler: async (args) => {
        try {
          const proposals = orchestrationState.queryActionProposals(args);
          return JSON.stringify({
            success: true,
            data: proposals,
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    }),

    // Utility Tools
    clearAllData: tool({
      name: 'clearAllData',
      description: 'Clear all data from the orchestration state (use with caution)',
      schema: z.object({
        confirm: z.boolean().refine(val => val === true, 'Must confirm to clear all data'),
      }),
      handler: async (args) => {
        try {
          if (!args.confirm) {
            return JSON.stringify({
              success: false,
              error: 'Must confirm to clear all data',
            });
          }
          orchestrationState.clearAll();
          return JSON.stringify({
            success: true,
            message: 'All data cleared successfully',
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    }),
  }),
  prompts: {
    createActor: 'Create a new actor with the specified name, role, and capabilities',
    createWorkflow: 'Create a new workflow with the specified steps and assigned actors',
    createProposal: 'Create a new proposal for review with the specified details',
    reviewProposal: 'Review a proposal and provide feedback or approval',
    orchestrateWorkflow: 'Orchestrate a workflow by managing its steps and actor assignments',
    auditTrail: 'Generate an audit trail for specific entities or time periods',
    policyManagement: 'Configure system policy for dry-run mode and retry settings',
    proposeAction: 'Propose an action that requires approval before execution',
    reviewAction: 'Review and approve/reject/edit a proposed action',
    executeAction: 'Execute an approved action',
    executeParallel: 'Execute multiple tool calls in parallel',
  },
});

export * from './schema';
export * from './state';
export * from './execute';


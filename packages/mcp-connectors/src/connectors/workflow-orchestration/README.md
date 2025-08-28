# Workflow Orchestration Connector

## Overview

The **Workflow Orchestration Connector** is a specialized orchestration system focused on **proposal-based approval workflows**. It provides a structured approach to managing tool executions through a review and approval process, ensuring that all actions are properly vetted before execution.

## Key Features

### 🔄 **Proposal-Based Workflow**
- **Propose Actions**: Actors propose specific tool executions with reasons
- **Review Process**: Proposals go through mandatory review with approve/reject/edit decisions
- **Approval Required**: Only approved proposals can be executed
- **Audit Trail**: Complete audit logging for all workflow activities

### 👥 **Actor Management**
- **Actor Registration**: Register actors with roles in the workflow system
- **Role-Based Access**: Actors have specific roles and responsibilities
- **Audit Tracking**: All actions are tracked by actor

### 📋 **Workflow Management**
- **Workflow Creation**: Start new workflows with titles
- **Status Tracking**: Track workflow status (active, completed, cancelled)
- **Audit Logging**: Comprehensive audit trail for each workflow

### ⚡ **Parallel Execution**
- **Concurrent Tool Calls**: Execute multiple tool calls in parallel
- **Batch Processing**: Process multiple actions simultaneously
- **Result Aggregation**: Collect and return results from all parallel executions

### 🔒 **Dry-Run Mode**
- **Safe Testing**: Enable dry-run mode for testing without actual execution
- **Simulated Results**: Get simulated results for all tool calls
- **Policy Control**: Configure system policies including dry-run mode

## How It Works

### 1. **Actor Registration**
```typescript
// Register an actor
const result = await registerActor({
  name: 'John Doe',
  role: 'Developer'
});
// Returns: { actor_id: 'actor_1' }
```

### 2. **Workflow Creation**
```typescript
// Start a new workflow
const result = await startWorkflow({
  title: 'Database Migration'
});
// Returns: { workflow_id: 'workflow_1' }
```

### 3. **Action Proposal**
```typescript
// Propose an action
const result = await proposeAction({
  workflow_id: 'workflow_1',
  actor_id: 'actor_1',
  tool: 'update_database_schema',
  params: { table: 'users', column: 'email' },
  reason: 'Add email verification column'
});
// Returns: { proposal_id: 'proposal_1', status: 'pending' }
```

### 4. **Action Review**
```typescript
// Review the proposal
const result = await reviewAction({
  proposal_id: 'proposal_1',
  reviewer_id: 'actor_2',
  decision: 'approve' // or 'reject' or 'edit'
});
// Returns: { status: 'approved', final_tool_call: {...} }
```

### 5. **Action Execution**
```typescript
// Execute the approved action
const result = await executeAction({
  proposal_id: 'proposal_1'
});
// Returns: { execution_id: 'execution_1', result: {...} }
```

### 6. **Parallel Execution**
```typescript
// Execute multiple actions in parallel
const result = await executeParallel({
  calls: [
    { tool: 'tool_1', params: { param1: 'value1' } },
    { tool: 'tool_2', params: { param2: 'value2' } }
  ]
});
// Returns: { results: [...] }
```

## Comparison with Merged Orchestration Connector

| Feature | Workflow Orchestration | Merged Orchestration |
|---------|----------------------|---------------------|
| **Primary Focus** | Proposal-based approval workflows | General orchestration management |
| **Review Process** | Mandatory review for all actions | Optional review comments |
| **Execution Model** | Only executes approved proposals | Direct workflow execution |
| **Parallel Execution** | Built-in parallel execution support | Sequential workflow steps |
| **Actor Capabilities** | Simple role-based actors | Actors with capabilities and status |
| **Workflow Steps** | No predefined steps | Multi-step workflows with dependencies |
| **Audit Trail** | Detailed proposal/execution audit | General audit events |
| **Use Case** | Compliance-heavy environments | General business process management |

## Use Cases

### ✅ **Perfect For:**
- **Compliance Requirements**: When all actions must be reviewed and approved
- **High-Security Environments**: Where unauthorized tool execution is a risk
- **Audit-Heavy Industries**: Financial, healthcare, or government sectors
- **Team Collaboration**: When multiple people need to review actions
- **Risk Management**: When you need to prevent accidental or malicious actions

### ❌ **Not Ideal For:**
- **High-Frequency Operations**: When you need rapid, automated execution
- **Simple Workflows**: When direct execution is sufficient
- **Development Environments**: Where quick iteration is needed
- **Non-Compliance Scenarios**: When review processes add unnecessary overhead

## Configuration

### Dry-Run Mode
```typescript
// Enable dry-run mode for testing
await setPolicy({ dry_run: true });

// Disable for production
await setPolicy({ dry_run: false });
```

### Audit Logging
```typescript
// Get audit log for a workflow
const auditLog = await getAuditLog({
  workflow_id: 'workflow_1'
});
```

## Example Workflow

### Database Migration Workflow

1. **Register Actors**
   - Developer: Proposes changes
   - DBA: Reviews database changes
   - Manager: Final approval

2. **Start Workflow**
   - Create "Database Migration v2.0" workflow

3. **Propose Changes**
   - Developer proposes schema changes
   - Developer proposes data migration
   - Developer proposes index updates

4. **Review Process**
   - DBA reviews each proposal
   - Manager gives final approval

5. **Execute Changes**
   - Execute approved proposals
   - Monitor execution results

6. **Audit Trail**
   - Complete audit log of all activities

## Best Practices

### ✅ **Do:**
- Use dry-run mode for testing
- Require multiple reviewers for critical changes
- Maintain detailed audit logs
- Use parallel execution for independent operations
- Document reasons for all proposals

### ❌ **Don't:**
- Skip the review process for critical operations
- Use in high-frequency, automated scenarios
- Ignore audit logs
- Execute proposals without proper review
- Use for simple, non-critical operations

## Integration

The Workflow Orchestration Connector can be used alongside the Merged Orchestration Connector:

- **Workflow Orchestration**: For compliance-heavy, approval-required operations
- **Merged Orchestration**: For general business process management

This provides a comprehensive orchestration solution for different types of workflows and requirements.


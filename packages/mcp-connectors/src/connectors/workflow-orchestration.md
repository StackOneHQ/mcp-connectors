# Workflow Orchestration Connector

A comprehensive workflow orchestration system that implements a **propose → review → execute → (optional) parallel execute → audit** pattern with safe dry-run capabilities.

## Overview

This connector provides a complete workflow management system with the following key features:

- **Actor Management**: Register and manage actors (users/roles) in the system
- **Workflow Lifecycle**: Create and manage workflows from start to completion
- **Proposal System**: Propose actions that require review before execution
- **Review Process**: Approve, reject, or edit proposed actions
- **Execution Engine**: Execute approved actions with dry-run support
- **Parallel Execution**: Execute multiple actions simultaneously
- **Audit Trail**: Complete audit logging of all system activities
- **Policy Management**: Configure system policies like dry-run mode

## Tools

### 1. `register_actor`
Register a new actor in the workflow system.

**Parameters:**
- `name` (string): Name of the actor
- `role` (string): Role of the actor in the workflow

**Returns:**
- `actor_id` (string): Unique identifier for the registered actor

**Example:**
```json
{
  "name": "John Doe",
  "role": "Developer"
}
```

### 2. `start_workflow`
Start a new workflow.

**Parameters:**
- `title` (string): Title of the workflow

**Returns:**
- `workflow_id` (string): Unique identifier for the created workflow

**Example:**
```json
{
  "title": "Database Migration Workflow"
}
```

### 3. `propose_action`
Propose an action to be reviewed and executed.

**Parameters:**
- `workflow_id` (string): ID of the workflow
- `actor_id` (string): ID of the actor proposing the action
- `tool` (string): Tool to be executed
- `params` (object): Parameters for the tool
- `reason` (string): Reason for proposing this action

**Returns:**
- `proposal_id` (string): Unique identifier for the proposal
- `status` (string): Status of the proposal (always "pending" initially)

**Example:**
```json
{
  "workflow_id": "workflow_1",
  "actor_id": "actor_1",
  "tool": "database_migration",
  "params": {
    "table": "users",
    "operation": "add_column",
    "column_name": "email_verified",
    "column_type": "boolean"
  },
  "reason": "Adding email verification column for security compliance"
}
```

### 4. `review_action`
Review a proposed action.

**Parameters:**
- `proposal_id` (string): ID of the proposal to review
- `reviewer_id` (string): ID of the reviewer
- `decision` (string): Decision on the proposal ("approve", "reject", or "edit")
- `edits` (object, optional): Edits to the proposal (if decision is "edit")

**Returns:**
- `status` (string): Final status of the proposal
- `final_tool_call` (object): The final tool call that will be executed

**Example:**
```json
{
  "proposal_id": "proposal_1",
  "reviewer_id": "actor_2",
  "decision": "approve"
}
```

**Example with edits:**
```json
{
  "proposal_id": "proposal_1",
  "reviewer_id": "actor_2",
  "decision": "edit",
  "edits": {
    "params": {
      "column_type": "timestamp",
      "default_value": "CURRENT_TIMESTAMP"
    }
  }
}
```

### 5. `execute_action`
Execute an approved action.

**Parameters:**
- `proposal_id` (string): ID of the proposal to execute

**Returns:**
- `execution_id` (string): Unique identifier for the execution
- `result` (object): Result of the execution

**Example:**
```json
{
  "proposal_id": "proposal_1"
}
```

### 6. `execute_parallel`
Execute multiple tool calls in parallel.

**Parameters:**
- `calls` (array): Array of tool calls to execute in parallel
  - `tool` (string): Tool to execute
  - `params` (object): Parameters for the tool

**Returns:**
- `results` (array): Results of all parallel executions

**Example:**
```json
{
  "calls": [
    {
      "tool": "send_notification",
      "params": {
        "recipient": "admin@company.com",
        "message": "Migration started"
      }
    },
    {
      "tool": "update_status",
      "params": {
        "status": "in_progress"
      }
    }
  ]
}
```

### 7. `get_audit_log`
Get the audit log for a workflow.

**Parameters:**
- `workflow_id` (string): ID of the workflow

**Returns:**
- `entries` (array): Array of audit log entries

**Example:**
```json
{
  "workflow_id": "workflow_1"
}
```

### 8. `set_policy`
Set system policies like dry-run mode.

**Parameters:**
- `dry_run` (boolean, optional): Whether to enable dry-run mode

**Returns:**
- `dry_run` (boolean): Current dry-run mode setting

**Example:**
```json
{
  "dry_run": true
}
```

## Complete Workflow Example

Here's a complete example of a typical workflow:

1. **Register actors:**
```json
{"name": "Alice", "role": "Developer"}
{"name": "Bob", "role": "Senior Developer"}
{"name": "Carol", "role": "DevOps Engineer"}
```

2. **Start workflow:**
```json
{"title": "Production Database Migration"}
```

3. **Propose action:**
```json
{
  "workflow_id": "workflow_1",
  "actor_id": "actor_1",
  "tool": "database_backup",
  "params": {"database": "production", "backup_type": "full"},
  "reason": "Creating backup before migration"
}
```

4. **Review action:**
```json
{
  "proposal_id": "proposal_1",
  "reviewer_id": "actor_2",
  "decision": "approve"
}
```

5. **Execute action:**
```json
{"proposal_id": "proposal_1"}
```

6. **Propose migration:**
```json
{
  "workflow_id": "workflow_1",
  "actor_id": "actor_1",
  "tool": "database_migration",
  "params": {"version": "2.1.0", "rollback_plan": "enabled"},
  "reason": "Applying schema changes for new features"
}
```

7. **Review with edits:**
```json
{
  "proposal_id": "proposal_2",
  "reviewer_id": "actor_3",
  "decision": "edit",
  "edits": {
    "params": {
      "maintenance_window": "2:00-4:00 AM UTC",
      "notification_channels": ["slack", "email"]
    }
  }
}
```

8. **Execute with parallel notifications:**
```json
{
  "calls": [
    {
      "tool": "database_migration",
      "params": {
        "version": "2.1.0",
        "rollback_plan": "enabled",
        "maintenance_window": "2:00-4:00 AM UTC",
        "notification_channels": ["slack", "email"]
      }
    },
    {
      "tool": "send_notification",
      "params": {
        "channel": "slack",
        "message": "Database migration starting in 5 minutes"
      }
    }
  ]
}
```

9. **Get audit log:**
```json
{"workflow_id": "workflow_1"}
```

## State Management

The connector maintains all state in memory using the following data structures:

- **Actors**: Map of actor ID to actor details
- **Workflows**: Map of workflow ID to workflow details
- **Proposals**: Map of proposal ID to proposal details
- **Executions**: Map of execution ID to execution details
- **Parallel Executions**: Map of parallel execution ID to details
- **Audit Log**: Array of audit entries
- **Policies**: System-wide policies like dry-run mode

## Dry-Run Mode

When dry-run mode is enabled:
- All executions are simulated
- No actual tool calls are made
- Results show what would have happened
- Audit logs still record the simulated actions

This is useful for:
- Testing workflows before production
- Training new team members
- Validating workflow logic
- Compliance and governance reviews

## Error Handling

The connector includes comprehensive error handling:

- **Validation**: All inputs are validated before processing
- **State Consistency**: Ensures proposals can only be reviewed when pending
- **Execution Safety**: Only approved proposals can be executed
- **Audit Trail**: All errors are logged in the audit trail

## Security Features

- **Actor Validation**: All actions require valid actor IDs
- **Workflow Isolation**: Actions are scoped to specific workflows
- **Review Process**: All actions require explicit approval
- **Audit Logging**: Complete traceability of all system activities
- **Dry-Run Support**: Safe testing without production impact

## Use Cases

This connector is ideal for:

- **DevOps Workflows**: Database migrations, deployments, infrastructure changes
- **Compliance Processes**: Financial transactions, legal document reviews
- **Content Management**: Publishing workflows, approval processes
- **Security Operations**: Access requests, security policy changes
- **Business Processes**: Expense approvals, contract reviews
- **Research Workflows**: Data analysis, experiment execution

## Integration

The connector can be integrated with:

- **CI/CD Pipelines**: Automated deployment approvals
- **Monitoring Systems**: Alert response workflows
- **Document Management**: Content publishing workflows
- **Security Tools**: Incident response procedures
- **Business Applications**: Approval workflows for various business processes

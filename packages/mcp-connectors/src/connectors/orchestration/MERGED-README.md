# Merged Orchestration Connector

## Overview

The **Merged Orchestration Connector** is a comprehensive orchestration system that combines **general business process management** with **approval-based workflow execution**. This unified connector provides the best of both worlds - flexible workflow orchestration and mandatory approval processes for critical operations.

## Key Features

### 🔄 **Core Orchestration Management**
- **Actor Management**: Create and manage actors with roles and capabilities
- **Workflow Management**: Multi-step workflows with dependencies and status tracking
- **Proposal System**: General proposals for review and approval
- **Audit Trail**: Comprehensive audit logging for all system activities
- **Policy Management**: Configure system-wide settings including dry-run mode

### ✅ **Approval-Based Workflow Execution**
- **Action Proposals**: Propose specific tool executions that require review
- **Review Process**: Mandatory review with approve/reject/edit decisions
- **Approval Required**: Only approved actions can be executed
- **Parallel Execution**: Execute multiple tool calls simultaneously
- **Dry-Run Mode**: Safe testing without actual execution

### 🔒 **Enterprise Features**
- **Policy Configuration**: Dry-run mode, retry logic, timeouts
- **Remote Execution**: Forward tool calls to external MCP servers
- **Retry Logic**: Exponential backoff for unreliable remote calls
- **Comprehensive Auditing**: Detailed audit trail for compliance

## How It Works

### 1. **Core Orchestration Workflow**

```typescript
// Create actors with capabilities
const developer = await createActor({
  name: 'John Doe',
  role: 'Developer',
  capabilities: ['coding', 'testing', 'deployment']
});

// Create a multi-step workflow
const workflow = await createWorkflow({
  name: 'Feature Deployment',
  description: 'Deploy new feature to production',
  priority: 'high',
  steps: [
    {
      name: 'Code Review',
      description: 'Review the code changes',
      actorId: reviewer.id,
      dependencies: [],
      estimatedDuration: 1,
    },
    {
      name: 'Testing',
      description: 'Run automated tests',
      actorId: developer.id,
      dependencies: ['Code Review'],
      estimatedDuration: 2,
    }
  ],
  assignedActors: [developer.id, reviewer.id],
});

// Create a general proposal
const proposal = await createProposal({
  title: 'Database Migration',
  description: 'Migrate user data to new schema',
  priority: 'high',
  assignedReviewers: [reviewer.id],
});
```

### 2. **Approval-Based Action Workflow**

```typescript
// Propose an action that requires approval
const actionProposal = await proposeAction({
  workflow_id: workflow.id,
  actor_id: developer.id,
  tool: 'deploy_to_production',
  params: { version: '1.2.0', environment: 'production' },
  reason: 'Deploy new user authentication feature',
});

// Review and approve the action
const review = await reviewAction({
  proposal_id: actionProposal.id,
  reviewer_id: reviewer.id,
  decision: 'approve', // or 'reject' or 'edit'
});

// Execute the approved action
const execution = await executeAction({
  proposal_id: actionProposal.id,
});
```

### 3. **Parallel Execution**

```typescript
// Execute multiple actions in parallel
const parallelResult = await executeParallel({
  calls: [
    { tool: 'deploy_frontend', params: { version: '1.0.0' } },
    { tool: 'deploy_backend', params: { version: '1.0.0' } },
    { tool: 'update_database', params: { migration: 'v1.0.0' } },
  ],
});
```

### 4. **Policy and Dry-Run Mode**

```typescript
// Enable dry-run mode for safe testing
await updatePolicy({
  dry_run: true,
  max_retries: 5,
  timeout_ms: 15000,
});

// All executions will be simulated
const result = await executeAction({
  proposal_id: approvedProposal.id,
});
// Returns: { success: true, dryRun: true, message: '[DRY RUN] Would execute...' }
```

## Use Cases

### ✅ **Perfect For:**

#### **General Business Processes**
- **Project Management**: Multi-step project workflows with team assignments
- **Content Creation**: Editorial workflows with review stages
- **Customer Support**: Ticket escalation and resolution workflows
- **HR Processes**: Employee onboarding and approval workflows

#### **Compliance-Heavy Operations**
- **Financial Operations**: Payment processing with mandatory approvals
- **Healthcare Systems**: Patient data modifications with audit trails
- **Government Systems**: Policy changes requiring multiple approvals
- **Security Operations**: Access control changes with review processes

#### **Development and DevOps**
- **Code Deployment**: Multi-stage deployment with approval gates
- **Database Changes**: Schema modifications requiring DBA approval
- **Infrastructure Changes**: Server configuration updates with review
- **Security Updates**: Critical security patches with approval workflow

### 🔄 **Workflow Examples**

#### **Feature Deployment Workflow**
1. **Developer** creates workflow with steps: Code Review → Testing → Deployment
2. **Developer** proposes deployment action
3. **Senior Developer** reviews and approves
4. **System** executes deployment in dry-run mode first
5. **System** executes actual deployment after confirmation

#### **Database Migration Workflow**
1. **DBA** creates migration workflow
2. **DBA** proposes schema changes
3. **Lead DBA** reviews and approves
4. **System** executes migration with rollback plan
5. **Audit trail** records all activities

#### **Security Incident Response**
1. **Security Analyst** creates incident workflow
2. **Analyst** proposes containment actions
3. **Security Manager** reviews and approves
4. **System** executes containment in parallel
5. **Audit trail** ensures compliance

## Configuration

### **Connector Setup**
```typescript
const config = {
  enableAudit: true,        // Enable comprehensive audit logging
  dryRun: false,           // Enable dry-run mode for testing
  maxRetries: 3,           // Number of retry attempts for remote calls
  timeoutMs: 10000,        // Request timeout in milliseconds
};
```

### **Policy Management**
```typescript
// Update system policy
await updatePolicy({
  dry_run: true,           // Enable/disable dry-run mode
  max_retries: 5,          // Configure retry attempts
  timeout_ms: 15000,       // Set request timeout
});
```

### **Audit Configuration**
```typescript
// Query audit events
const auditEvents = await queryAuditEvents({
  eventType: 'proposal_reviewed',
  entityType: 'proposal',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
});
```

## API Reference

### **Core Orchestration Tools**

| Tool | Description | Use Case |
|------|-------------|----------|
| `createActor` | Create actors with roles and capabilities | Team setup |
| `createWorkflow` | Create multi-step workflows | Process definition |
| `createProposal` | Create general proposals | Review requests |
| `updatePolicy` | Configure system policies | System configuration |

### **Approval-Based Workflow Tools**

| Tool | Description | Use Case |
|------|-------------|----------|
| `proposeAction` | Propose tool execution for approval | Action requests |
| `reviewAction` | Review and approve/reject/edit actions | Approval process |
| `executeAction` | Execute approved actions | Action execution |
| `executeParallel` | Execute multiple actions in parallel | Batch operations |

### **Query and Management Tools**

| Tool | Description | Use Case |
|------|-------------|----------|
| `queryActors` | Query actors by status/role/capabilities | Team management |
| `queryWorkflows` | Query workflows by status/priority | Process monitoring |
| `queryActionProposals` | Query action proposals by status | Approval tracking |
| `getStats` | Get system statistics | System monitoring |

### **Remote Execution Tools**

| Tool | Description | Use Case |
|------|-------------|----------|
| `forwardToolCall` | Forward calls to remote MCP servers | External integration |
| `executeWithRetry` | Execute with retry logic | Reliable execution |

## Best Practices

### ✅ **Do:**

#### **For General Orchestration**
- Use multi-step workflows for complex processes
- Assign appropriate actors with relevant capabilities
- Use priority levels to manage workflow importance
- Maintain comprehensive audit trails

#### **For Approval Workflows**
- Always require approval for critical operations
- Use dry-run mode for testing and validation
- Implement parallel execution for independent operations
- Document reasons for all action proposals

#### **For System Management**
- Configure appropriate timeouts and retry settings
- Monitor system statistics regularly
- Use audit logs for compliance and debugging
- Test workflows in dry-run mode before production

### ❌ **Don't:**

#### **Avoid These Practices**
- Skip approval processes for critical operations
- Use approval workflows for high-frequency, automated tasks
- Ignore audit logs and compliance requirements
- Execute actions without proper review in production
- Use complex workflows for simple, direct operations

## Integration Examples

### **AI Agent Integration**
```typescript
// AI Agent proposes an action
const proposal = await proposeAction({
  workflow_id: 'ai_workflow',
  actor_id: 'ai_agent',
  tool: 'update_user_preferences',
  params: { userId: '123', preferences: { theme: 'dark' } },
  reason: 'User requested theme change via chat interface',
});

// Human reviewer approves
const review = await reviewAction({
  proposal_id: proposal.id,
  reviewer_id: 'human_supervisor',
  decision: 'approve',
});

// System executes the approved action
const result = await executeAction({
  proposal_id: proposal.id,
});
```

### **Multi-Agent Collaboration**
```typescript
// Agent 1 proposes database change
const dbProposal = await proposeAction({
  workflow_id: 'database_migration',
  actor_id: 'db_agent',
  tool: 'update_schema',
  params: { table: 'users', column: 'email_verified' },
  reason: 'Add email verification column for security',
});

// Agent 2 reviews and approves
await reviewAction({
  proposal_id: dbProposal.id,
  reviewer_id: 'security_agent',
  decision: 'approve',
});

// Agent 3 executes the change
await executeAction({
  proposal_id: dbProposal.id,
});
```

## Migration Guide

### **From Separate Connectors**

If you were using the separate `workflow-orchestration` and `orchestration` connectors:

1. **Update Imports**: Use the merged `OrchestrationConnectorConfig`
2. **Combine Functionality**: Use both core orchestration and approval workflows
3. **Update Tool Calls**: Use the unified API for all operations
4. **Test Integration**: Verify that both workflows work together

### **Benefits of Merged Connector**

- **Single API**: One connector for all orchestration needs
- **Unified State**: Shared state management for all workflows
- **Consistent Auditing**: Single audit trail for all activities
- **Simplified Configuration**: One configuration for all features
- **Better Integration**: Seamless workflow between general and approval processes

## Troubleshooting

### **Common Issues**

#### **Approval Workflow Issues**
- **Proposal not found**: Ensure proposal ID is correct and proposal exists
- **Cannot execute unapproved action**: Only approved proposals can be executed
- **Review decision invalid**: Use 'approve', 'reject', or 'edit' decisions

#### **Policy Configuration Issues**
- **Dry-run not working**: Check policy configuration and dry-run mode setting
- **Retry failures**: Verify timeout and retry settings
- **Remote execution errors**: Check server URLs and network connectivity

#### **State Management Issues**
- **Data persistence**: State is in-memory; consider persistence for production
- **Concurrent access**: Implement proper locking for multi-user scenarios
- **State cleanup**: Use `clearAllData` for testing, implement proper cleanup for production

### **Debugging Tips**

1. **Enable Audit Logging**: Check audit events for detailed activity tracking
2. **Use Dry-Run Mode**: Test workflows safely without side effects
3. **Check System Statistics**: Monitor system health and activity levels
4. **Review Error Messages**: Detailed error messages help identify issues

## Future Enhancements

### **Planned Features**
- **Persistent Storage**: Database-backed state management
- **Webhook Integration**: Real-time notifications for workflow events
- **Advanced Scheduling**: Time-based workflow execution
- **Conditional Logic**: Dynamic workflow paths based on conditions
- **API Rate Limiting**: Built-in rate limiting for external calls

### **Integration Roadmap**
- **CI/CD Integration**: Direct integration with deployment pipelines
- **Monitoring Integration**: Metrics and alerting integration
- **Security Enhancements**: Role-based access control and encryption
- **Scalability Features**: Distributed execution and load balancing

---

The Merged Orchestration Connector provides a powerful, flexible, and secure foundation for managing complex business processes with mandatory approval workflows. Whether you need simple workflow orchestration or compliance-heavy approval processes, this connector has you covered.


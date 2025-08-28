# Orchestration Connector

A comprehensive orchestration system for managing actors, workflows, proposals, and audit trails with enterprise-grade features and policy management. This connector combines the best features from both minimal and reviewable orchestration connectors.

## Features

### Core Functionality
- **Actor Management**: Create, update, query, and delete actors with roles and capabilities
- **Workflow Orchestration**: Design and execute multi-step workflows with dependencies and actor assignments
- **Proposal System**: Create and manage proposals with review processes and approval workflows
- **Audit Trail**: Complete audit logging for all operations with comprehensive querying capabilities
- **Policy Management**: Configurable dry-run mode, retry settings, and timeout management
- **Remote Execution**: Forward tool calls to remote MCP servers with retry logic
- **In-Memory State**: Fast, transient storage for development and testing

### Enhanced Features
- **Actor Capabilities**: Define specific capabilities for actors (e.g., code_review, security_review)
- **Workflow Steps**: Multi-step workflows with dependencies, estimated durations, and status tracking
- **Proposal Review Comments**: Track review feedback and comments
- **Priority Levels**: Support for low, medium, high, and urgent priority levels
- **Comprehensive Queries**: Advanced filtering and querying capabilities
- **Statistics**: Detailed system statistics and metrics

## Quickstart

### 1. Install Dependencies

```bash
cd packages/mcp-connectors
npm install
```

### 2. Start the Server

```bash
npm run dev
```

### 3. Configure the Connector

The connector supports the following configuration:

```json
{
  "credentials": {
    "apiKey": "optional-api-key",
    "serverUrl": "http://localhost:3000"
  },
  "setup": {
    "enableAudit": true,
    "dryRun": false,
    "maxRetries": 3,
    "timeoutMs": 10000
  }
}
```

### 4. Test the Connector

Use the example prompt: "Create a comprehensive workflow for code review with multiple actors, approval stages, and audit tracking"

## Natural Language Demo Script

Here's a natural language demonstration of the connector's capabilities:

### Scenario: Enterprise Code Review Workflow

1. **Create Actors with Capabilities**
   - Create a "Developer" actor named "John" with capabilities ["code_review", "testing", "deployment"]
   - Create a "Senior Engineer" actor named "Sarah" with capabilities ["code_review", "architecture_review", "security_review"]
   - Create an "Engineering Manager" actor named "Mike" with capabilities ["approval", "resource_allocation"]

2. **Create Multi-Step Workflow**
   - Create a "Code Review Process" workflow with priority "high"
   - Add steps: "Initial Review", "Security Review", "Manager Approval"
   - Set dependencies between steps
   - Assign actors to specific steps

3. **Create Proposal**
   - Create a proposal titled "API Documentation Update" with priority "medium"
   - Assign reviewers based on capabilities

4. **Update Workflow Status**
   - Change workflow status from "draft" to "active"
   - Track step progress and completion

5. **Review Process**
   - Add review comments to proposals
   - Update proposal status through approval stages

6. **Audit and Monitoring**
   - Query audit events for specific entities or time periods
   - Get comprehensive system statistics
   - Monitor workflow progress and actor assignments

### Example Commands

```bash
# Create actors with capabilities
createActor --name "John Developer" --role "Software Engineer" --capabilities "code_review,testing,deployment"
createActor --name "Sarah Reviewer" --role "Senior Engineer" --capabilities "code_review,architecture_review,security_review"

# Create workflow with steps
createWorkflow --name "Code Review Process" --description "Standard code review workflow" --priority "high" --steps "[{\"name\":\"Initial Review\",\"description\":\"Code quality review\",\"actorId\":\"actor_2\",\"estimatedDuration\":2},{\"name\":\"Security Review\",\"description\":\"Security assessment\",\"actorId\":\"actor_2\",\"dependencies\":[\"step_0\"],\"estimatedDuration\":1}]"

# Create proposal
createProposal --title "API Documentation Update" --description "Update API documentation for v2.0" --priority "medium" --assignedReviewers "actor_2,actor_3"

# Query actors by capabilities
queryActors --capabilities "code_review"

# Get audit trail
queryAuditEvents --entityType "proposal" --startDate "2024-01-01T00:00:00Z"

# Get system stats
getStats

# Update policy for dry-run mode
updatePolicy --dry_run true --max_retries 5
```

## API Reference

### Actor Management

#### `createActor`
Creates a new actor with specified name, role, and capabilities.

**Parameters:**
- `name` (string, required): Actor name
- `role` (string, required): Actor role
- `capabilities` (array of strings, required): Actor capabilities

#### `getActor`
Retrieves a specific actor by ID.

**Parameters:**
- `id` (string, required): Actor ID

#### `updateActor`
Updates an existing actor.

**Parameters:**
- `id` (string, required): Actor ID
- `name` (string, optional): New name
- `role` (string, optional): New role
- `capabilities` (array of strings, optional): New capabilities
- `status` (string, optional): New status (active/inactive/busy)

#### `queryActors`
Queries actors with filters.

**Parameters:**
- `status` (string, optional): Filter by status
- `role` (string, optional): Filter by role
- `capabilities` (array of strings, optional): Filter by capabilities

### Workflow Management

#### `createWorkflow`
Creates a new workflow with steps and assigned actors.

**Parameters:**
- `name` (string, required): Workflow name
- `description` (string, required): Workflow description
- `priority` (string, optional): Priority level (low/medium/high/urgent)
- `steps` (array, required): Workflow steps
- `assignedActors` (array of strings, optional): Assigned actor IDs

#### `getWorkflow`
Retrieves a specific workflow by ID.

**Parameters:**
- `id` (string, required): Workflow ID

#### `updateWorkflow`
Updates an existing workflow.

**Parameters:**
- `id` (string, required): Workflow ID
- `name` (string, optional): New name
- `description` (string, optional): New description
- `status` (string, optional): New status
- `priority` (string, optional): New priority
- `steps` (array, optional): Updated steps
- `assignedActors` (array of strings, optional): Updated assigned actors

### Proposal Management

#### `createProposal`
Creates a new proposal for review.

**Parameters:**
- `title` (string, required): Proposal title
- `description` (string, required): Proposal description
- `priority` (string, optional): Priority level
- `assignedReviewers` (array of strings, optional): Assigned reviewer IDs

#### `updateProposal`
Updates an existing proposal.

**Parameters:**
- `id` (string, required): Proposal ID
- `title` (string, optional): New title
- `description` (string, optional): New description
- `status` (string, optional): New status
- `priority` (string, optional): New priority
- `assignedReviewers` (array of strings, optional): Updated reviewers
- `reviewComments` (array, optional): New review comments

### Audit and Monitoring

#### `queryAuditEvents`
Queries audit events with comprehensive filters.

**Parameters:**
- `eventType` (string, optional): Filter by event type
- `entityType` (string, optional): Filter by entity type
- `entityId` (string, optional): Filter by entity ID
- `userId` (string, optional): Filter by user ID
- `startDate` (string, optional): Start date for time range
- `endDate` (string, optional): End date for time range

#### `getStats`
Retrieves comprehensive system statistics.

**Returns:**
- Actor statistics (total, active, inactive, busy)
- Workflow statistics (total, draft, active, completed, cancelled)
- Proposal statistics (total, draft, submitted, under_review, approved, rejected)
- Audit statistics (total events)
- Current policy configuration

### Policy Management

#### `getPolicy`
Retrieves current policy configuration.

#### `updatePolicy`
Updates policy configuration.

**Parameters:**
- `dry_run` (boolean, optional): Enable/disable dry-run mode
- `max_retries` (number, optional): Maximum retry attempts (1-10)
- `timeout_ms` (number, optional): Request timeout in milliseconds (1000-30000)

### Remote Execution

#### `forwardToolCall`
Forwards a tool call to a remote MCP server.

**Parameters:**
- `server_url` (string, required): Remote server URL
- `tool_name` (string, required): Tool name to call
- `args` (object, optional): Tool arguments
- `timeout_ms` (number, optional): Request timeout

#### `executeWithRetry`
Executes a tool call with retry logic.

**Parameters:**
- `tool` (string, required): Tool name
- `params` (object, optional): Tool parameters

## Migration from Previous Connectors

This connector is a merge of the `minimal-orchestration` and `reviewable-orchestration` connectors. Key improvements:

1. **Enhanced Schema**: Combined the best features from both connectors
2. **Policy Management**: Added comprehensive policy configuration
3. **Better Audit Events**: Enhanced audit event types and details
4. **Improved Queries**: More comprehensive filtering options
5. **Retry Logic**: Built-in retry mechanism for remote calls
6. **Statistics**: Detailed system statistics and metrics

## Configuration Options

### Setup Configuration
- `enableAudit` (boolean): Enable audit logging (default: true)
- `dryRun` (boolean): Enable dry-run mode for testing (default: false)
- `maxRetries` (number): Maximum retry attempts (default: 3)
- `timeoutMs` (number): Request timeout in milliseconds (default: 10000)

### Credentials
- `apiKey` (string, optional): API key for authentication
- `serverUrl` (string, optional): Default server URL for remote calls

## Best Practices

1. **Actor Design**: Define specific capabilities for actors to enable better workflow assignment
2. **Workflow Steps**: Use dependencies to create logical workflow sequences
3. **Audit Trail**: Leverage audit events for compliance and debugging
4. **Policy Management**: Use dry-run mode for testing before production deployment
5. **Error Handling**: Implement proper error handling for remote tool calls
6. **Monitoring**: Regularly check system statistics to monitor performance

## Troubleshooting

### Common Issues

1. **Remote Call Failures**: Check network connectivity and server URL configuration
2. **Timeout Errors**: Adjust timeout settings in policy configuration
3. **Audit Event Overload**: Consider implementing audit event cleanup for long-running systems
4. **Memory Usage**: Monitor memory usage for large numbers of entities

### Debug Mode

Enable dry-run mode to simulate operations without making actual remote calls:

```bash
updatePolicy --dry_run true
```

This allows you to test workflows and proposals without affecting external systems.



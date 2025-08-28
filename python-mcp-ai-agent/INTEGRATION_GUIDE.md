# MCP AI Agent Integration Guide

This guide explains how to integrate the Python AI Agent with your existing TypeScript MCP connectors, specifically focusing on the workflow orchestration system.

## Overview

The Python AI Agent provides a natural language interface to your MCP connectors, allowing users to:

1. **Express Intent in Natural Language**: Instead of knowing specific tool names and parameters, users can describe what they want to accomplish
2. **Orchestrate Complex Workflows**: The AI can chain multiple tool calls together to complete complex tasks
3. **Handle Validation and Proposals**: Work with your existing proposal/review/execution workflow
4. **Provide Intelligent Summaries**: Get human-readable explanations of what was accomplished

## Architecture Integration

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Query    │───▶│   Python AI      │───▶│  TypeScript     │
│  (Natural Lang) │    │     Agent        │    │  MCP Connectors │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   FastAPI        │
                       │   REST Server    │
                       └──────────────────┘
```

## Step-by-Step Integration

### 1. Start Your MCP Connector Server

First, ensure your workflow orchestration connector is running:

```bash
# From your mcp-connectors directory
bun start --connector workflow-orchestration
```

This will start the server on `http://localhost:3000` with the following tools available:
- `register_actor` - Register team members
- `start_workflow` - Create new workflows
- `propose_action` - Propose actions for review
- `review_action` - Review and approve/reject proposals
- `execute_action` - Execute approved actions
- `execute_parallel` - Execute multiple actions in parallel
- `get_audit_log` - Get audit trail
- `set_policy` - Configure system policies

### 2. Start the Python AI Agent

```bash
# Install dependencies
cd python-mcp-ai-agent
pip install -r requirements.txt

# Set your AI API key
export OPENAI_API_KEY="your-openai-api-key"

# Start the AI agent server
python main.py serve --port 8000
```

### 3. Connect the AI Agent to Your Connector

```bash
# Add your connector to the AI agent
curl -X POST "http://localhost:8000/connectors" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "workflow",
    "base_url": "http://localhost:3000"
  }'
```

### 4. Test the Integration

Now you can use natural language to interact with your workflow orchestration system:

```bash
# Example: Create a complete deployment workflow
curl -X POST "http://localhost:8000/process" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Create a deployment workflow: register a DevOps engineer named Bob, start a workflow called Production Deployment, propose a database migration, review and approve it, then execute it"
  }'
```

## Natural Language Examples

### Basic Workflow Setup

**User Query:**
```
"Create a new workflow for database migration and register Alice as a DBA"
```

**AI Agent Response:**
The AI will automatically:
1. Call `start_workflow` with title "Database Migration"
2. Call `register_actor` with name "Alice" and role "DBA"
3. Provide a summary of what was accomplished

### Proposal and Review Workflow

**User Query:**
```
"Propose an action to update the database schema by adding a users table, then review and approve it"
```

**AI Agent Response:**
The AI will:
1. Call `propose_action` with the schema update details
2. Call `review_action` to approve the proposal
3. Provide reasoning for each step

### Complex Multi-step Workflow

**User Query:**
```
"Set up a complete deployment pipeline: register a DevOps engineer, create a production deployment workflow, propose both database and code deployment actions, review them, execute them, and get the audit log"
```

**AI Agent Response:**
The AI will orchestrate all these steps automatically, providing a comprehensive summary of the entire process.

## API Integration Patterns

### 1. Direct Tool Calls (Postman-style)

For precise control, you can call tools directly:

```bash
# Register an actor
curl -X POST "http://localhost:8000/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "connector_name": "workflow",
    "tool_name": "register_actor",
    "arguments": {
      "name": "Charlie",
      "role": "Developer"
    }
  }'
```

### 2. Natural Language Processing

For user-friendly interaction:

```bash
# Natural language request
curl -X POST "http://localhost:8000/process" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Register Charlie as a developer and start a new workflow"
  }'
```

### 3. Workflow Orchestration

For complex multi-step processes:

```bash
# Complex workflow
curl -X POST "http://localhost:8000/process" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Create a deployment workflow with the following steps: register a DevOps engineer, propose database migration, propose code deployment, review both proposals, execute approved actions, and provide audit trail"
  }'
```

## Workflow Orchestration Integration

Your `workflow-orchestration.ts` connector provides a sophisticated system for:

### Actor Management
- Register team members with specific roles
- Track who can perform what actions

### Workflow Lifecycle
- Create workflows for specific projects
- Track workflow status and progress

### Proposal System
- Propose actions with detailed reasoning
- Review and approve/reject proposals
- Edit proposals before approval

### Execution Control
- Execute approved actions
- Support dry-run mode for safety
- Execute multiple actions in parallel

### Audit Trail
- Track all actions and decisions
- Maintain complete audit logs
- Provide accountability and transparency

## Advanced Integration Scenarios

### 1. CI/CD Pipeline Integration

```bash
# Natural language CI/CD setup
curl -X POST "http://localhost:8000/process" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Set up a CI/CD pipeline workflow: register CI/CD engineer, create deployment workflow, propose automated testing, propose production deployment, review and approve both, execute with audit logging"
  }'
```

### 2. Database Migration Workflow

```bash
# Database migration workflow
curl -X POST "http://localhost:8000/process" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Create a database migration workflow: register DBA, propose schema changes, review changes, execute migration, verify success, update documentation"
  }'
```

### 3. Security Review Process

```bash
# Security review workflow
curl -X POST "http://localhost:8000/process" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Set up security review process: register security engineer, create security workflow, propose security updates, review security implications, approve with conditions, execute with monitoring"
  }'
```

## Error Handling and Validation

The AI agent provides intelligent error handling:

### Tool Selection Errors
- If no appropriate tools are found, the AI will explain why
- Suggests alternative approaches when possible

### Execution Errors
- Provides detailed error messages
- Suggests corrective actions
- Maintains audit trail of failures

### Validation Errors
- Validates input parameters before execution
- Provides helpful error messages
- Suggests correct parameter formats

## Monitoring and Observability

### Audit Trail
Every action is logged with:
- Who performed the action
- When it was performed
- What was the reasoning
- What was the result

### Health Monitoring
```bash
# Check system health
curl "http://localhost:8000/health"
```

### Tool Discovery
```bash
# List all available tools
curl "http://localhost:8000/tools"
```

## Best Practices

### 1. Use Natural Language for Complex Workflows
For multi-step processes, natural language is more maintainable than chaining multiple API calls.

### 2. Leverage the Proposal System
Use the proposal/review system for actions that require approval or validation.

### 3. Enable Dry-Run Mode for Testing
```bash
# Enable dry-run mode
curl -X POST "http://localhost:8000/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "connector_name": "workflow",
    "tool_name": "set_policy",
    "arguments": {
      "dry_run": true
    }
  }'
```

### 4. Monitor Audit Logs
Regularly check audit logs to understand system usage and identify potential issues.

### 5. Use Parallel Execution for Independent Actions
For actions that don't depend on each other, use parallel execution to improve performance.

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure your MCP connector server is running
   - Check the port and URL configuration

2. **Tool Not Found**
   - Verify the tool exists in your connector
   - Check the tool name spelling

3. **AI Response Errors**
   - Ensure your API key is valid
   - Check the AI model configuration

4. **JSON Parse Errors**
   - The AI might return malformed JSON
   - Check the logs for detailed error information

### Debug Mode

Enable debug logging to see detailed information:

```bash
export LOG_LEVEL=DEBUG
python main.py serve --port 8000
```

## Next Steps

1. **Customize the AI Prompts**: Modify the prompts in `ai_agent.py` to better match your domain
2. **Add More Connectors**: Connect additional MCP connectors for broader functionality
3. **Implement Authentication**: Add authentication to the API endpoints
4. **Add Rate Limiting**: Implement rate limiting for production use
5. **Create a Web UI**: Build a web interface for easier interaction

## Conclusion

The Python AI Agent provides a powerful natural language interface to your MCP connectors, making them accessible to users who don't need to know the specific tool names and parameters. This integration enables:

- **Democratized Access**: Non-technical users can interact with complex systems
- **Reduced Training**: Users don't need to learn specific API syntax
- **Improved Productivity**: Complex workflows can be expressed in simple terms
- **Better Error Handling**: Intelligent error messages and suggestions
- **Audit Trail**: Complete tracking of all actions and decisions

This creates a bridge between your sophisticated TypeScript MCP connector ecosystem and end users who need to accomplish tasks without learning the underlying technical details.

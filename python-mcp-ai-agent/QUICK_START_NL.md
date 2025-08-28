# Quick Start: Natural Language Interface

Get started with the MCP AI Agent's natural language interface in just a few steps!

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
cd python-mcp-ai-agent
pip install -r requirements.txt
```

### 2. Set Your AI API Key
```bash
export OPENAI_API_KEY="your-openai-api-key"
# OR
export ANTHROPIC_API_KEY="your-anthropic-api-key"
```

### 3. Start Your MCP Connector
```bash
# From your mcp-connectors directory
bun start --connector workflow-orchestration
```

### 4. Start the Natural Language Interface
```bash
python main.py chat --connector http://localhost:3000
```

## 🎯 Try These Commands

Once you're in the interface, try these natural language commands:

### Basic Workflow Commands
```
Create a new workflow for database migration
Register Alice as a DBA
Start a workflow called "Production Deployment"
```

### Proposal and Review Commands
```
Propose an action to update the database schema
Review all pending proposals
Approve the database migration proposal
```

### Execution Commands
```
Execute the approved actions
Show me the audit log
What's the status of the current workflow?
```

### System Commands
```
help
tools
history
clear
quit
```

## 🎨 What You'll See

The interface provides a rich terminal experience with:

- **Beautiful formatting** with colors and panels
- **Real-time feedback** with spinners and progress indicators
- **Conversation history** tracking all interactions
- **Intelligent responses** with reasoning and summaries

## 📝 Example Session

```
🚀 Welcome to MCP AI Agent

You: Create a new workflow for database migration and register Alice as a DBA

🤔 Thinking...

🧠 AI Reasoning:
I need to create a workflow and register an actor. I'll use the start_workflow tool to create the workflow and register_actor to add Alice as a DBA.

🔧 Tool Calls Executed:
1. start_workflow (workflow)
   Arguments: {'title': 'Database Migration'}
   Reasoning: Creating a new workflow for database migration

2. register_actor (workflow)
   Arguments: {'name': 'Alice', 'role': 'DBA'}
   Reasoning: Registering Alice as a DBA for the workflow

📊 Execution Results:
1. start_workflow - ✅ Success
   Result: {"workflow_id": "workflow_1"}

2. register_actor - ✅ Success
   Result: {"actor_id": "actor_1"}

📝 Summary:
I've successfully created a new workflow called "Database Migration" and registered Alice as a DBA. The workflow has been assigned ID "workflow_1" and Alice has been assigned actor ID "actor_1". You can now proceed with proposing actions for this workflow.

You: Propose an action to add a new users table

🤔 Thinking...

🧠 AI Reasoning:
I need to propose an action to add a new users table. I'll use the propose_action tool with appropriate parameters for database schema modification.

🔧 Tool Calls Executed:
1. propose_action (workflow)
   Arguments: {'workflow_id': 'workflow_1', 'actor_id': 'actor_1', 'tool': 'database_migration', 'params': {'operation': 'create_table', 'table_name': 'users'}, 'reason': 'Adding new users table for user management system'}

📊 Execution Results:
1. propose_action - ✅ Success
   Result: {"proposal_id": "proposal_1", "status": "pending"}

📝 Summary:
I've successfully proposed an action to add a new users table to the database. The proposal has been created with ID "proposal_1" and is currently pending review. You can now review and approve this proposal when ready.

You: Review and approve the proposal

🤔 Thinking...

🧠 AI Reasoning:
I need to review and approve the pending proposal. I'll use the review_action tool to approve the proposal with ID "proposal_1".

🔧 Tool Calls Executed:
1. review_action (workflow)
   Arguments: {'proposal_id': 'proposal_1', 'reviewer_id': 'actor_1', 'decision': 'approve'}

📊 Execution Results:
1. review_action - ✅ Success
   Result: {"status": "approved", "final_tool_call": {"tool": "database_migration", "params": {"operation": "create_table", "table_name": "users"}}}

📝 Summary:
I've successfully reviewed and approved the proposal to add a new users table. The proposal is now approved and ready for execution. You can execute this approved action when you're ready to proceed with the database migration.

You: Execute the approved action

🤔 Thinking...

🧠 AI Reasoning:
I need to execute the approved action. I'll use the execute_action tool to execute the approved proposal.

🔧 Tool Calls Executed:
1. execute_action (workflow)
   Arguments: {'proposal_id': 'proposal_1'}

📊 Execution Results:
1. execute_action - ✅ Success
   Result: {"execution_id": "execution_1", "result": {"success": true, "message": "Successfully executed database_migration"}}

📝 Summary:
I've successfully executed the approved action to add a new users table. The database migration has been completed successfully. The execution has been logged with ID "execution_1". Your workflow is now complete!

You: Show me the audit log

🤔 Thinking...

🧠 AI Reasoning:
I need to retrieve the audit log for the workflow to show the user all the actions that have been taken.

🔧 Tool Calls Executed:
1. get_audit_log (workflow)
   Arguments: {'workflow_id': 'workflow_1'}

📊 Execution Results:
1. get_audit_log - ✅ Success
   Result: {"entries": [{"id": "audit_1", "action": "start_workflow", "timestamp": "2024-01-15T10:30:00Z"}, {"id": "audit_2", "action": "register_actor", "timestamp": "2024-01-15T10:30:05Z"}, {"id": "audit_3", "action": "propose_action", "timestamp": "2024-01-15T10:31:00Z"}, {"id": "audit_4", "action": "review_action", "timestamp": "2024-01-15T10:32:00Z"}, {"id": "audit_5", "action": "execute_action", "timestamp": "2024-01-15T10:33:00Z"}]}

📝 Summary:
Here's the complete audit log for your Database Migration workflow:

1. **Workflow Started** (10:30:00) - Created new workflow "Database Migration"
2. **Actor Registered** (10:30:05) - Registered Alice as DBA
3. **Action Proposed** (10:31:00) - Proposed adding users table
4. **Action Reviewed** (10:32:00) - Approved the proposal
5. **Action Executed** (10:33:00) - Successfully executed database migration

The entire workflow has been completed successfully with full audit trail maintained for accountability and compliance purposes.
```

## 🛠️ Troubleshooting

### Common Issues

1. **"Connection refused"**
   - Make sure your MCP connector server is running
   - Check the URL: `http://localhost:3000`

2. **"API key not found"**
   - Set your API key: `export OPENAI_API_KEY="your-key"`

3. **"No tools available"**
   - Ensure your connector is properly started
   - Check the connector logs for errors

### Getting Help

- Type `help` in the interface for command documentation
- Type `tools` to see available tools
- Type `history` to review your session
- Press `Ctrl+C` to interrupt and exit

## 🎉 You're Ready!

You now have a powerful natural language interface to your MCP connectors. Express your intent in plain English and let the AI handle the technical details!

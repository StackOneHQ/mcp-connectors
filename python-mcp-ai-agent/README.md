# MCP AI Agent

A Python application that provides natural language understanding and AI-powered orchestration for MCP (Model Context Protocol) connectors. This application acts as an intelligent interface between users and your existing TypeScript MCP connector ecosystem.

## Features

- **Natural Language Processing**: Convert natural language requests into MCP tool calls
- **Multi-Connector Support**: Connect to multiple MCP connectors simultaneously
- **AI-Powered Tool Selection**: Automatically select appropriate tools based on user intent
- **Workflow Orchestration**: Execute complex workflows with multiple tool calls
- **REST API**: Full REST API for integration with other applications
- **Enhanced Interactive CLI**: Rich terminal interface with natural language prompting
- **Conversation History**: Track and review previous interactions
- **Real-time Validation**: Validate proposals and execute actions with audit logging

## Architecture

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

## Quick Start

### 1. Install Dependencies

```bash
cd python-mcp-ai-agent
pip install -r requirements.txt
```

### 2. Set Up Environment Variables

```bash
export OPENAI_API_KEY="your-openai-api-key"
# OR
export ANTHROPIC_API_KEY="your-anthropic-api-key"
```

### 3. Start Your MCP Connector Server

First, start one of your TypeScript MCP connectors:

```bash
# From your mcp-connectors directory
bun start --connector workflow-orchestration
```

### 4. Run the Python AI Agent

#### Option A: Natural Language Chat Interface

```bash
# Enhanced interactive mode with natural language prompting
python main.py interactive --connector http://localhost:3000

# Or use the chat command (same as interactive)
python main.py chat --connector http://localhost:3000
```

#### Option B: REST API Server

```bash
python main.py serve --port 8000
```

Then access the API at `http://localhost:8000`

## Usage Examples

### Natural Language Chat Examples

```bash
# Start natural language chat interface
python main.py chat --connector http://localhost:3000

# Example natural language commands you can try:
You: Create a new workflow for deploying a feature
You: Register an actor named "John" with role "developer"
You: Start a workflow called "Database Migration"
You: Propose an action to update the database schema
You: Review the pending proposals
You: Execute the approved actions
You: What tools are available?
You: Show me the current workflow status
You: help
You: history
You: clear
```

### REST API Examples

#### Add a Connector

```bash
curl -X POST "http://localhost:8000/connectors" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "workflow",
    "base_url": "http://localhost:3000"
  }'
```

#### Process Natural Language Request

```bash
curl -X POST "http://localhost:8000/process" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Create a new workflow for deploying a feature and register an actor named John as a developer"
  }'
```

#### List Available Tools

```bash
curl "http://localhost:8000/tools"
```

#### Call Tool Directly

```bash
curl -X POST "http://localhost:8000/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "connector_name": "workflow",
    "tool_name": "register_actor",
    "arguments": {
      "name": "John",
      "role": "developer"
    }
  }'
```

## Workflow Orchestration Example

The AI agent can handle complex workflows like the one in your `workflow-orchestration.ts` connector:

### Natural Language Request:
```
"Create a workflow for database migration, register a DBA actor, propose a schema update action, review it, and execute it with audit logging"
```

### AI Agent Response:
The AI will automatically:
1. Start a new workflow
2. Register the DBA actor
3. Propose the schema update action
4. Review and approve the proposal
5. Execute the action
6. Provide a summary of the entire process

## Natural Language Interface Features

### Rich Terminal Experience
- **Beautiful UI**: Rich text formatting with colors, panels, and tables
- **Real-time Feedback**: Live spinners and progress indicators
- **Conversation History**: Track all interactions with timestamps
- **Help System**: Built-in help and command documentation

### Available Commands
- **Natural Language**: Express your intent in plain English
- **`help`**: Show available commands and examples
- **`tools`**: List all available tools and their descriptions
- **`history`**: View conversation history
- **`clear`**: Clear conversation history
- **`quit`/`exit`**: End the session

### Example Natural Language Commands
```
"Create a new workflow for database migration"
"Register Alice as a DBA and start a deployment workflow"
"Propose an action to update the database schema"
"Review all pending proposals and approve them"
"Execute the approved actions and show me the audit log"
"What tools are available?"
"Show me the current workflow status"
```

## API Endpoints

### Core Endpoints

- `GET /` - API information
- `GET /health` - Health check
- `POST /process` - Process natural language request
- `GET /tools/summary` - Get human-readable tools summary

### Connector Management

- `POST /connectors` - Add a new connector
- `GET /connectors` - List all connectors
- `DELETE /connectors/{name}` - Remove a connector

### Tool Management

- `GET /tools` - List all available tools
- `POST /tools/call` - Call a specific tool directly

## Configuration

### Environment Variables

- `OPENAI_API_KEY` - OpenAI API key for GPT models
- `ANTHROPIC_API_KEY` - Anthropic API key for Claude models
- `LOG_LEVEL` - Logging level (default: INFO)

### Supported AI Models

- OpenAI: `gpt-4-turbo-preview`, `gpt-4`, `gpt-3.5-turbo`
- Anthropic: `claude-3-sonnet-20240229`, `claude-3-opus-20240229`

## Development

### Project Structure

```
python-mcp-ai-agent/
├── src/
│   ├── __init__.py
│   ├── mcp_client.py      # MCP protocol client
│   ├── ai_agent.py        # AI agent for NLP
│   └── api_server.py      # FastAPI server
├── main.py                # CLI entry point
├── requirements.txt       # Python dependencies
└── README.md             # This file
```

### Running Tests

```bash
pytest tests/
```

### Code Formatting

```bash
black src/
isort src/
```

## Integration with Your MCP Connectors

This Python application is designed to work seamlessly with your existing TypeScript MCP connectors. It can:

1. **Connect to Multiple Connectors**: Manage connections to different MCP connector servers
2. **Understand Tool Schemas**: Automatically discover and understand available tools
3. **Orchestrate Complex Workflows**: Chain multiple tool calls together
4. **Provide Natural Language Interface**: Convert user intent into tool calls
5. **Handle Validation and Proposals**: Work with your workflow orchestration system

### Example: Workflow Orchestration Integration

Your `workflow-orchestration.ts` connector provides tools for:
- Actor registration
- Workflow management
- Proposal creation and review
- Action execution
- Audit logging

The Python AI agent can orchestrate all of these tools based on natural language requests, making it easy to:
- Set up complex workflows
- Manage team members and roles
- Review and approve actions
- Track all activities with audit logs

## Troubleshooting

### Common Issues

1. **Connection Refused**: Make sure your MCP connector server is running
2. **API Key Errors**: Verify your OpenAI or Anthropic API key is set correctly
3. **Tool Not Found**: Check that the tool exists in the connector you're connecting to
4. **JSON Parse Errors**: The AI response might not be valid JSON - check the logs

### Debug Mode

Enable debug logging:

```bash
export LOG_LEVEL=DEBUG
python main.py interactive --connector http://localhost:3000
```

### Testing Connections

Test if your MCP connector is accessible:

```bash
python main.py test-connection --connector http://localhost:3000
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the Apache 2.0 License.

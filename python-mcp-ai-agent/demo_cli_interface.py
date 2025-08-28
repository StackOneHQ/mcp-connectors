#!/usr/bin/env python3
"""
CLI Interface Demo - Shows the interactive natural language CLI
"""
import asyncio
import sys
import os

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.mcp_client import MCPConnectorManager, MCPToolResult
from src.ai_agent import AIAgent, ToolCall
from src.cli_interface import NaturalLanguageCLI


class MockAIAgent(AIAgent):
    """Mock AI Agent for CLI demo"""
    
    def __init__(self, connector_manager: MCPConnectorManager):
        super().__init__(connector_manager, gemini_api_key="mock-key")
    
    async def _select_tools(self, user_query: str) -> tuple[str, list[ToolCall]]:
        """Mock tool selection"""
        if "workflow" in user_query.lower() and "create" in user_query.lower():
            return "Creating a new workflow for the user", [
                ToolCall(
                    connector_name="workflow",
                    tool_name="start_workflow",
                    arguments={"title": "New Workflow"},
                    reasoning="User requested to create a workflow"
                )
            ]
        elif "tools" in user_query.lower() or "available" in user_query.lower():
            return "User is asking about available tools", []
        else:
            return "No specific action needed", []
    
    async def _generate_summary(self, user_query: str, reasoning: str, results: list[dict[str, any]]) -> str:
        """Mock summary generation"""
        if "workflow" in user_query.lower() and "create" in user_query.lower():
            return "✅ Successfully created a new workflow for you!"
        elif "tools" in user_query.lower() or "available" in user_query.lower():
            return "📋 Here are the available tools you can use with natural language commands."
        else:
            return "✅ Request processed successfully."


class MockMCPClient:
    """Mock MCP client for CLI demo"""
    
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session = None
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass
    
    async def list_tools(self):
        """Return mock tools"""
        return [
            {
                "name": "start_workflow",
                "description": "Start a new workflow",
                "inputSchema": {
                    "title": {"type": "string", "description": "Title of the workflow"}
                }
            },
            {
                "name": "register_actor",
                "description": "Register a new actor in the workflow system",
                "inputSchema": {
                    "name": {"type": "string", "description": "Name of the actor"},
                    "role": {"type": "string", "description": "Role of the actor"}
                }
            }
        ]
    
    async def call_tool(self, tool_name: str, arguments: dict):
        """Mock tool execution"""
        if tool_name == "start_workflow":
            return MCPToolResult(content=[{"text": '{"workflow_id": "demo_workflow", "status": "created"}'}])
        elif tool_name == "register_actor":
            return MCPToolResult(content=[{"text": '{"actor_id": "demo_actor", "status": "registered"}'}])
        else:
            return MCPToolResult(content=[{"text": '{"error": "Unknown tool"}'}])


class MockMCPConnectorManager:
    """Mock connector manager for CLI demo"""
    
    def __init__(self):
        self.connectors = {}
    
    async def add_connector(self, name: str, base_url: str):
        """Add a mock connector"""
        self.connectors[name] = MockMCPClient(base_url)
        return self.connectors[name]
    
    async def list_all_tools(self):
        """List all tools from all connectors"""
        result = {}
        for name, client in self.connectors.items():
            result[name] = await client.list_tools()
        return result
    
    async def call_tool_on_connector(self, connector_name: str, tool_name: str, arguments: dict):
        """Call a tool on a specific connector"""
        if connector_name not in self.connectors:
            raise ValueError(f"Connector '{connector_name}' not found")
        return await self.connectors[connector_name].call_tool(tool_name, arguments)
    
    async def close_all(self):
        """Close all connectors"""
        self.connectors.clear()


async def demo_cli_interface():
    """Demonstrate the CLI interface capabilities"""
    print("🚀 MCP AI Agent - CLI Interface Demo")
    print("="*60)
    print("This demo shows the interactive CLI interface capabilities:")
    print("• Rich terminal interface with colors and formatting")
    print("• Natural language command processing")
    print("• Tool discovery and listing")
    print("• Conversation history tracking")
    print("• Help system and command assistance")
    print("="*60)
    
    # Create mock components
    manager = MockMCPConnectorManager()
    await manager.add_connector("workflow", "http://localhost:3000")
    
    # Create mock AI agent
    ai_agent = MockAIAgent(manager)
    
    # Create CLI interface
    cli = NaturalLanguageCLI(manager, ai_agent)
    
    print("✅ Components initialized successfully")
    
    # Demo 1: Show available tools
    print("\n📋 Demo 1: Tool Discovery")
    print("-" * 40)
    await cli._show_available_tools()
    
    # Demo 2: Process a natural language request
    print("\n🧪 Demo 2: Natural Language Processing")
    print("-" * 40)
    test_query = "Create a new workflow for data processing"
    print(f"User Query: {test_query}")
    
    # Add to conversation history
    cli.conversation_history.append({
        "type": "user",
        "content": test_query,
        "timestamp": asyncio.get_event_loop().time()
    })
    
    # Process the request
    result = await ai_agent.process_request(test_query)
    
    # Add AI response to conversation history
    cli.conversation_history.append({
        "type": "assistant",
        "content": result,
        "timestamp": asyncio.get_event_loop().time()
    })
    
    # Display results
    await cli._display_results(result)
    
    # Demo 3: Show conversation history
    print("\n📜 Demo 3: Conversation History")
    print("-" * 40)
    await cli._show_history()
    
    # Demo 4: Show help system
    print("\n❓ Demo 4: Help System")
    print("-" * 40)
    await cli._show_help()
    
    print("\n🎉 CLI Interface Demo Completed!")
    print("\n" + "="*60)
    print("This demonstrates the CLI interface capabilities:")
    print("• Rich terminal UI with colors and formatting")
    print("• Natural language command processing")
    print("• Tool discovery and management")
    print("• Conversation history and context")
    print("• Help system and user assistance")
    print("• Error handling and user feedback")
    print("="*60)


async def main():
    """Run the CLI interface demo"""
    await demo_cli_interface()


if __name__ == "__main__":
    asyncio.run(main())

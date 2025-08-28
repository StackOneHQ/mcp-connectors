#!/usr/bin/env python3
"""
Demo script showing the MCP AI Agent application working
"""
import asyncio
import sys
import os

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.mcp_client import MCPClient, MCPConnectorManager, MCPToolResult
from src.ai_agent import AIAgent, ToolCall
from src.cli_interface import NaturalLanguageCLI


class MockMCPClient:
    """Mock MCP client for demonstration purposes"""
    
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
                "name": "register_actor",
                "description": "Register a new actor in the workflow system",
                "inputSchema": {
                    "name": {"type": "string", "description": "Name of the actor"},
                    "role": {"type": "string", "description": "Role of the actor"}
                }
            },
            {
                "name": "start_workflow",
                "description": "Start a new workflow",
                "inputSchema": {
                    "title": {"type": "string", "description": "Title of the workflow"}
                }
            },
            {
                "name": "propose_action",
                "description": "Propose an action to be reviewed and executed",
                "inputSchema": {
                    "workflow_id": {"type": "string", "description": "ID of the workflow"},
                    "tool": {"type": "string", "description": "Tool to be executed"},
                    "params": {"type": "object", "description": "Parameters for the tool"},
                    "reason": {"type": "string", "description": "Reason for proposing this action"}
                }
            },
            {
                "name": "review_action",
                "description": "Review a proposed action",
                "inputSchema": {
                    "proposal_id": {"type": "string", "description": "ID of the proposal to review"},
                    "decision": {"type": "string", "enum": ["approve", "reject", "edit"]}
                }
            },
            {
                "name": "execute_action",
                "description": "Execute an approved action",
                "inputSchema": {
                    "proposal_id": {"type": "string", "description": "ID of the proposal to execute"}
                }
            }
        ]
    
    async def call_tool(self, tool_name: str, arguments: dict):
        """Mock tool execution"""
        if tool_name == "register_actor":
            return MCPToolResult(content=[{"text": f'{{"actor_id": "actor_{len(arguments)}", "name": "{arguments.get("name", "Unknown")}", "role": "{arguments.get("role", "Unknown")}"}}'}])
        elif tool_name == "start_workflow":
            return MCPToolResult(content=[{"text": f'{{"workflow_id": "workflow_{len(arguments)}", "title": "{arguments.get("title", "Unknown")}"}}'}])
        elif tool_name == "propose_action":
            return MCPToolResult(content=[{"text": f'{{"proposal_id": "proposal_{len(arguments)}", "status": "pending"}}'}])
        elif tool_name == "review_action":
            return MCPToolResult(content=[{"text": f'{{"status": "approved", "decision": "{arguments.get("decision", "approve")}"}}'}])
        elif tool_name == "execute_action":
            return MCPToolResult(content=[{"text": f'{{"execution_id": "execution_{len(arguments)}", "success": true, "message": "Action executed successfully"}}'}])
        else:
            return MCPToolResult(content=[{"text": '{"error": "Unknown tool"}'}])


class MockMCPConnectorManager:
    """Mock connector manager for demonstration"""
    
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


async def demo_natural_language_interface():
    """Demonstrate the natural language interface"""
    print("🚀 MCP AI Agent - Natural Language Interface Demo")
    print("="*60)
    
    # Create mock components
    manager = MockMCPConnectorManager()
    await manager.add_connector("workflow", "http://localhost:3000")
    
    # Create AI agent with mock API key
    ai_agent = AIAgent(manager, gemini_api_key="mock-key")
    
    # Create CLI interface
    cli = NaturalLanguageCLI(manager, ai_agent)
    
    print("✅ Components initialized successfully")
    print("\n📋 Available Tools:")
    await cli._show_available_tools()
    
    # Demo natural language processing
    print("\n🧪 Demo: Natural Language Processing")
    print("="*40)
    
    demo_queries = [
        "Create a new workflow for database migration and register Alice as a DBA",
        "Propose an action to update the database schema by adding a users table",
        "Review and approve the pending proposal",
        "Execute the approved action"
    ]
    
    for i, query in enumerate(demo_queries, 1):
        print(f"\n{i}. User Query: {query}")
        print("-" * 40)
        
        try:
            # Process the request
            result = await ai_agent.process_request(query)
            
            # Display results
            if result.get("reasoning"):
                print(f"🤔 AI Reasoning: {result['reasoning']}")
            
            if result.get("tool_calls"):
                print(f"🔧 Tool Calls: {len(result['tool_calls'])} executed")
                for j, tool_call in enumerate(result["tool_calls"], 1):
                    print(f"   {j}. {tool_call['tool_name']} ({tool_call['connector_name']})")
                    print(f"      Arguments: {tool_call['arguments']}")
                    print(f"      Reasoning: {tool_call['reasoning']}")
            
            if result.get("summary"):
                print(f"📝 Summary: {result['summary']}")
                
        except Exception as e:
            print(f"❌ Error: {e}")
        
        print()
    
    print("🎉 Demo completed successfully!")
    print("\nThis demonstrates how the AI agent can:")
    print("• Understand natural language requests")
    print("• Select appropriate tools automatically")
    print("• Execute complex workflows")
    print("• Provide intelligent summaries")
    print("• Handle conversation history")


async def main():
    """Run the demo"""
    await demo_natural_language_interface()


if __name__ == "__main__":
    asyncio.run(main())

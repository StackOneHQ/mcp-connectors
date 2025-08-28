#!/usr/bin/env python3
"""
Complete Flow Demo - Shows the entire MCP AI Agent pipeline
"""
import asyncio
import json
import sys
import os
from typing import List, Dict, Any

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.mcp_client import MCPClient, MCPConnectorManager, MCPToolResult
from src.ai_agent import AIAgent, ToolCall


class MockAIAgent(AIAgent):
    """Mock AI Agent that provides predefined responses for demonstration"""
    
    def __init__(self, connector_manager: MCPConnectorManager):
        super().__init__(connector_manager, gemini_api_key="mock-key")
    
    async def _select_tools(self, user_query: str) -> tuple[str, List[ToolCall]]:
        """Mock tool selection with predefined responses"""
        # Predefined responses for demo queries
        responses = {
            "Create a new workflow for database migration and register Alice as a DBA": {
                "reasoning": "This request requires two actions: creating a workflow and registering an actor. I'll start the workflow first, then register Alice as a DBA.",
                "tool_calls": [
                    {
                        "connector_name": "workflow",
                        "tool_name": "start_workflow",
                        "arguments": {"title": "Database Migration Workflow"},
                        "reasoning": "Creating a new workflow for database migration"
                    },
                    {
                        "connector_name": "workflow", 
                        "tool_name": "register_actor",
                        "arguments": {"name": "Alice", "role": "DBA"},
                        "reasoning": "Registering Alice as a DBA for the migration workflow"
                    }
                ]
            },
            "Propose an action to update the database schema by adding a users table": {
                "reasoning": "This request requires proposing a database schema change action. I'll use the propose_action tool with appropriate parameters.",
                "tool_calls": [
                    {
                        "connector_name": "workflow",
                        "tool_name": "propose_action", 
                        "arguments": {
                            "workflow_id": "workflow_1",
                            "tool": "database_schema_update",
                            "params": {"action": "add_table", "table_name": "users", "columns": ["id", "name", "email"]},
                            "reason": "Adding users table to support user authentication"
                        },
                        "reasoning": "Proposing a database schema change to add a users table"
                    }
                ]
            },
            "Review and approve the pending proposal": {
                "reasoning": "This request requires reviewing and approving a pending proposal. I'll use the review_action tool to approve it.",
                "tool_calls": [
                    {
                        "connector_name": "workflow",
                        "tool_name": "review_action",
                        "arguments": {"proposal_id": "proposal_1", "decision": "approve"},
                        "reasoning": "Reviewing and approving the pending database schema proposal"
                    }
                ]
            },
            "Execute the approved action": {
                "reasoning": "This request requires executing an approved action. I'll use the execute_action tool to run the approved proposal.",
                "tool_calls": [
                    {
                        "connector_name": "workflow",
                        "tool_name": "execute_action",
                        "arguments": {"proposal_id": "proposal_1"},
                        "reasoning": "Executing the approved database schema change"
                    }
                ]
            }
        }
        
        if user_query in responses:
            response = responses[user_query]
            reasoning = response["reasoning"]
            tool_calls = []
            
            for call_data in response["tool_calls"]:
                tool_calls.append(ToolCall(
                    connector_name=call_data["connector_name"],
                    tool_name=call_data["tool_name"],
                    arguments=call_data["arguments"],
                    reasoning=call_data["reasoning"]
                ))
            
            return reasoning, tool_calls
        else:
            return "No specific tools needed for this request.", []
    
    async def _generate_summary(self, user_query: str, reasoning: str, results: List[Dict[str, Any]]) -> str:
        """Mock summary generation"""
        summaries = {
            "Create a new workflow for database migration and register Alice as a DBA": 
                "✅ Successfully created a new database migration workflow and registered Alice as the DBA. The workflow is now ready for database migration tasks with Alice as the responsible database administrator.",
            
            "Propose an action to update the database schema by adding a users table": 
                "✅ Successfully proposed a database schema change to add a users table. The proposal includes creating a table with id, name, and email columns to support user authentication. The proposal is now pending review.",
            
            "Review and approve the pending proposal": 
                "✅ Successfully reviewed and approved the pending database schema proposal. The proposal to add a users table has been approved and is now ready for execution.",
            
            "Execute the approved action": 
                "✅ Successfully executed the approved database schema change. The users table has been created with the specified columns (id, name, email) and is now available for use in the application."
        }
        
        return summaries.get(user_query, "Action completed successfully.")


class MockMCPClient:
    """Mock MCP client for demonstration purposes"""
    
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session = None
        self.workflow_counter = 0
        self.proposal_counter = 0
        self.actor_counter = 0
    
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
        """Mock tool execution with realistic responses"""
        if tool_name == "register_actor":
            self.actor_counter += 1
            return MCPToolResult(content=[{"text": json.dumps({
                "actor_id": f"actor_{self.actor_counter}",
                "name": arguments.get("name", "Unknown"),
                "role": arguments.get("role", "Unknown"),
                "status": "registered",
                "timestamp": "2024-01-15T10:30:00Z"
            })}])
            
        elif tool_name == "start_workflow":
            self.workflow_counter += 1
            return MCPToolResult(content=[{"text": json.dumps({
                "workflow_id": f"workflow_{self.workflow_counter}",
                "title": arguments.get("title", "Unknown"),
                "status": "active",
                "created_at": "2024-01-15T10:30:00Z",
                "actors": []
            })}])
            
        elif tool_name == "propose_action":
            self.proposal_counter += 1
            return MCPToolResult(content=[{"text": json.dumps({
                "proposal_id": f"proposal_{self.proposal_counter}",
                "workflow_id": arguments.get("workflow_id", "unknown"),
                "tool": arguments.get("tool", "unknown"),
                "params": arguments.get("params", {}),
                "reason": arguments.get("reason", ""),
                "status": "pending",
                "created_at": "2024-01-15T10:30:00Z"
            })}])
            
        elif tool_name == "review_action":
            return MCPToolResult(content=[{"text": json.dumps({
                "proposal_id": arguments.get("proposal_id", "unknown"),
                "status": "approved",
                "decision": arguments.get("decision", "approve"),
                "reviewed_at": "2024-01-15T10:30:00Z",
                "reviewer": "system"
            })}])
            
        elif tool_name == "execute_action":
            return MCPToolResult(content=[{"text": json.dumps({
                "execution_id": f"execution_{self.proposal_counter}",
                "proposal_id": arguments.get("proposal_id", "unknown"),
                "success": True,
                "message": "Action executed successfully",
                "executed_at": "2024-01-15T10:30:00Z",
                "duration_ms": 1250
            })}])
        else:
            return MCPToolResult(content=[{"text": json.dumps({"error": "Unknown tool"})}])


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


async def demo_complete_flow():
    """Demonstrate the complete MCP AI Agent flow"""
    print("🚀 MCP AI Agent - Complete Flow Demonstration")
    print("="*70)
    print("This demo shows the entire natural language processing pipeline:")
    print("1. Natural language understanding")
    print("2. Tool selection and reasoning")
    print("3. Tool execution")
    print("4. Result processing and summarization")
    print("="*70)
    
    # Create mock components
    manager = MockMCPConnectorManager()
    await manager.add_connector("workflow", "http://localhost:3000")
    
    # Create mock AI agent
    ai_agent = MockAIAgent(manager)
    
    print("✅ Components initialized successfully")
    print("\n📋 Available Tools:")
    
    # Show available tools
    tools_summary = await ai_agent.get_available_tools_summary()
    print(tools_summary)
    
    # Demo natural language processing
    print("\n🧪 Demo: Complete Natural Language Processing Flow")
    print("="*60)
    
    demo_queries = [
        "Create a new workflow for database migration and register Alice as a DBA",
        "Propose an action to update the database schema by adding a users table",
        "Review and approve the pending proposal",
        "Execute the approved action"
    ]
    
    for i, query in enumerate(demo_queries, 1):
        print(f"\n{i}. User Query: {query}")
        print("-" * 60)
        
        try:
            # Process the request
            result = await ai_agent.process_request(query)
            
            # Display results
            if result.get("reasoning"):
                print(f"🤔 AI Reasoning: {result['reasoning']}")
            
            if result.get("tool_calls"):
                print(f"\n🔧 Tool Calls Executed: {len(result['tool_calls'])}")
                for j, tool_call in enumerate(result["tool_calls"], 1):
                    print(f"   {j}. {tool_call['tool_name']} ({tool_call['connector_name']})")
                    print(f"      Arguments: {json.dumps(tool_call['arguments'], indent=6)}")
                    print(f"      Reasoning: {tool_call['reasoning']}")
            
            if result.get("results"):
                print(f"\n📊 Execution Results:")
                for j, result_item in enumerate(result["results"], 1):
                    tool_call = result_item["tool_call"]
                    status = "✅ Success" if result_item["success"] else "❌ Failed"
                    print(f"   {j}. {tool_call.tool_name} - {status}")
                    
                    if result_item["success"] and result_item["result"]:
                        content = result_item["result"].content
                        if content and len(content) > 0:
                            text_content = content[0].get("text", "No text content")
                            try:
                                parsed_content = json.loads(text_content)
                                print(f"      Result: {json.dumps(parsed_content, indent=8)}")
                            except:
                                print(f"      Result: {text_content}")
                    elif result_item["error"]:
                        print(f"      Error: {result_item['error']}")
            
            if result.get("summary"):
                print(f"\n📝 Summary: {result['summary']}")
                
        except Exception as e:
            print(f"❌ Error: {e}")
        
        print()
    
    print("🎉 Complete Flow Demo Finished!")
    print("\n" + "="*70)
    print("This demonstrates the complete MCP AI Agent capabilities:")
    print("• Natural language understanding and intent recognition")
    print("• Intelligent tool selection based on context")
    print("• Multi-step workflow orchestration")
    print("• Real-time tool execution and result processing")
    print("• Intelligent summarization and user feedback")
    print("• Error handling and graceful degradation")
    print("="*70)


async def main():
    """Run the complete flow demo"""
    await demo_complete_flow()


if __name__ == "__main__":
    asyncio.run(main())

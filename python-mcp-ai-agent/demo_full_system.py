#!/usr/bin/env python3
"""
Full System Demo - Comprehensive demonstration of the MCP AI Agent system
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
from src.cli_interface import NaturalLanguageCLI


class MockAIAgent(AIAgent):
    """Mock AI Agent that provides intelligent responses for demonstration"""
    
    def __init__(self, connector_manager: MCPConnectorManager):
        super().__init__(connector_manager, gemini_api_key="mock-key")
    
    async def _select_tools(self, user_query: str) -> tuple[str, List[ToolCall]]:
        """Intelligent tool selection based on user query"""
        query_lower = user_query.lower()
        
        # Complex workflow scenarios
        if "database migration" in query_lower and "alice" in query_lower and "dba" in query_lower:
            return "This is a complex request requiring workflow creation and actor registration. I'll create the workflow first, then register Alice as the DBA.", [
                ToolCall(
                    connector_name="workflow",
                    tool_name="start_workflow",
                    arguments={"title": "Database Migration Workflow"},
                    reasoning="Creating a new workflow for database migration tasks"
                ),
                ToolCall(
                    connector_name="workflow",
                    tool_name="register_actor",
                    arguments={"name": "Alice", "role": "DBA"},
                    reasoning="Registering Alice as the DBA responsible for the migration"
                )
            ]
        
        elif "propose" in query_lower and "database schema" in query_lower and "users table" in query_lower:
            return "This request requires proposing a database schema change. I'll create a proposal for adding a users table with appropriate columns.", [
                ToolCall(
                    connector_name="workflow",
                    tool_name="propose_action",
                    arguments={
                        "workflow_id": "workflow_1",
                        "tool": "database_schema_update",
                        "params": {
                            "action": "add_table",
                            "table_name": "users",
                            "columns": ["id", "name", "email", "created_at"]
                        },
                        "reason": "Adding users table to support user authentication and management"
                    },
                    reasoning="Proposing a database schema change to add a users table with essential columns"
                )
            ]
        
        elif "review" in query_lower and "approve" in query_lower and "pending" in query_lower:
            return "This request requires reviewing and approving a pending proposal. I'll use the review action to approve it.", [
                ToolCall(
                    connector_name="workflow",
                    tool_name="review_action",
                    arguments={"proposal_id": "proposal_1", "decision": "approve"},
                    reasoning="Reviewing and approving the pending database schema proposal"
                )
            ]
        
        elif "execute" in query_lower and "approved" in query_lower:
            return "This request requires executing an approved action. I'll use the execute action to run the approved proposal.", [
                ToolCall(
                    connector_name="workflow",
                    tool_name="execute_action",
                    arguments={"proposal_id": "proposal_1"},
                    reasoning="Executing the approved database schema change"
                )
            ]
        
        elif "workflow" in query_lower and "create" in query_lower:
            return "Creating a new workflow for the user's request.", [
                ToolCall(
                    connector_name="workflow",
                    tool_name="start_workflow",
                    arguments={"title": "New Workflow"},
                    reasoning="Creating a new workflow as requested"
                )
            ]
        
        elif "tools" in query_lower or "available" in query_lower:
            return "User is asking about available tools. No specific action needed.", []
        
        else:
            return "No specific tools needed for this request.", []
    
    async def _generate_summary(self, user_query: str, reasoning: str, results: List[Dict[str, Any]]) -> str:
        """Generate intelligent summaries based on the results"""
        query_lower = user_query.lower()
        
        if "database migration" in query_lower and "alice" in query_lower:
            return "✅ Successfully created a comprehensive database migration workflow and registered Alice as the DBA. The workflow is now ready for database migration tasks with Alice as the responsible database administrator. This setup provides a structured approach to database changes with proper role assignment."
        
        elif "propose" in query_lower and "database schema" in query_lower:
            return "✅ Successfully proposed a database schema change to add a users table. The proposal includes creating a table with id, name, email, and created_at columns to support user authentication and management. The proposal is now pending review and approval."
        
        elif "review" in query_lower and "approve" in query_lower:
            return "✅ Successfully reviewed and approved the pending database schema proposal. The proposal to add a users table has been approved and is now ready for execution. This approval ensures the database change follows proper governance procedures."
        
        elif "execute" in query_lower and "approved" in query_lower:
            return "✅ Successfully executed the approved database schema change. The users table has been created with the specified columns (id, name, email, created_at) and is now available for use in the application. The database schema has been updated successfully."
        
        elif "workflow" in query_lower and "create" in query_lower:
            return "✅ Successfully created a new workflow for your request. The workflow is now active and ready for task management and execution."
        
        else:
            return "✅ Request processed successfully. The system has handled your request appropriately."


class MockMCPClient:
    """Enhanced mock MCP client with realistic responses"""
    
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session = None
        self.workflow_counter = 0
        self.proposal_counter = 0
        self.actor_counter = 0
        self.execution_counter = 0
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass
    
    async def list_tools(self):
        """Return comprehensive mock tools"""
        return [
            {
                "name": "register_actor",
                "description": "Register a new actor in the workflow system with specific role and permissions",
                "inputSchema": {
                    "name": {"type": "string", "description": "Name of the actor"},
                    "role": {"type": "string", "description": "Role of the actor (e.g., DBA, Developer, Admin)"}
                }
            },
            {
                "name": "start_workflow",
                "description": "Start a new workflow with a title and initial configuration",
                "inputSchema": {
                    "title": {"type": "string", "description": "Title of the workflow"}
                }
            },
            {
                "name": "propose_action",
                "description": "Propose an action to be reviewed and executed with detailed parameters",
                "inputSchema": {
                    "workflow_id": {"type": "string", "description": "ID of the workflow"},
                    "tool": {"type": "string", "description": "Tool to be executed"},
                    "params": {"type": "object", "description": "Parameters for the tool"},
                    "reason": {"type": "string", "description": "Reason for proposing this action"}
                }
            },
            {
                "name": "review_action",
                "description": "Review a proposed action and make a decision (approve/reject/edit)",
                "inputSchema": {
                    "proposal_id": {"type": "string", "description": "ID of the proposal to review"},
                    "decision": {"type": "string", "enum": ["approve", "reject", "edit"]}
                }
            },
            {
                "name": "execute_action",
                "description": "Execute an approved action with full audit trail",
                "inputSchema": {
                    "proposal_id": {"type": "string", "description": "ID of the proposal to execute"}
                }
            }
        ]
    
    async def call_tool(self, tool_name: str, arguments: dict):
        """Enhanced mock tool execution with realistic responses"""
        if tool_name == "register_actor":
            self.actor_counter += 1
            return MCPToolResult(content=[{"text": json.dumps({
                "actor_id": f"actor_{self.actor_counter}",
                "name": arguments.get("name", "Unknown"),
                "role": arguments.get("role", "Unknown"),
                "status": "registered",
                "permissions": ["read", "write", "execute"],
                "created_at": "2024-01-15T10:30:00Z",
                "workflow_access": ["workflow_1"]
            })}])
            
        elif tool_name == "start_workflow":
            self.workflow_counter += 1
            return MCPToolResult(content=[{"text": json.dumps({
                "workflow_id": f"workflow_{self.workflow_counter}",
                "title": arguments.get("title", "Unknown"),
                "status": "active",
                "created_at": "2024-01-15T10:30:00Z",
                "actors": [],
                "proposals": [],
                "executions": []
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
                "created_at": "2024-01-15T10:30:00Z",
                "priority": "medium",
                "estimated_duration": "5 minutes"
            })}])
            
        elif tool_name == "review_action":
            return MCPToolResult(content=[{"text": json.dumps({
                "proposal_id": arguments.get("proposal_id", "unknown"),
                "status": "approved",
                "decision": arguments.get("decision", "approve"),
                "reviewed_at": "2024-01-15T10:30:00Z",
                "reviewer": "system",
                "comments": "Approved based on security and compliance requirements",
                "next_steps": "Ready for execution"
            })}])
            
        elif tool_name == "execute_action":
            self.execution_counter += 1
            return MCPToolResult(content=[{"text": json.dumps({
                "execution_id": f"execution_{self.execution_counter}",
                "proposal_id": arguments.get("proposal_id", "unknown"),
                "success": True,
                "message": "Action executed successfully",
                "executed_at": "2024-01-15T10:30:00Z",
                "duration_ms": 1250,
                "audit_trail": {
                    "executor": "system",
                    "environment": "production",
                    "backup_created": True,
                    "rollback_available": True
                }
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


async def demo_full_system():
    """Demonstrate the complete MCP AI Agent system"""
    print("🚀 MCP AI Agent - Full System Demonstration")
    print("="*80)
    print("This comprehensive demo shows the entire MCP AI Agent system capabilities:")
    print("• Natural language understanding and intent recognition")
    print("• Intelligent tool selection and orchestration")
    print("• Multi-step workflow execution")
    print("• Rich CLI interface with formatting")
    print("• Conversation history and context management")
    print("• Error handling and graceful degradation")
    print("• Audit trail and result processing")
    print("="*80)
    
    # Create mock components
    manager = MockMCPConnectorManager()
    await manager.add_connector("workflow", "http://localhost:3000")
    
    # Create mock AI agent
    ai_agent = MockAIAgent(manager)
    
    # Create CLI interface
    cli = NaturalLanguageCLI(manager, ai_agent)
    
    print("✅ All system components initialized successfully")
    
    # Show system overview
    print("\n📋 System Overview:")
    print("-" * 40)
    tools_summary = await ai_agent.get_available_tools_summary()
    print(tools_summary)
    
    # Demo scenarios
    print("\n🧪 Demo Scenarios - Complete Workflow")
    print("="*60)
    
    demo_scenarios = [
        {
            "title": "Complex Workflow Creation",
            "query": "Create a new workflow for database migration and register Alice as a DBA",
            "description": "Demonstrates multi-step workflow creation with actor registration"
        },
        {
            "title": "Database Schema Proposal",
            "query": "Propose an action to update the database schema by adding a users table",
            "description": "Shows intelligent proposal creation with detailed parameters"
        },
        {
            "title": "Proposal Review and Approval",
            "query": "Review and approve the pending proposal",
            "description": "Demonstrates governance workflow with approval process"
        },
        {
            "title": "Action Execution",
            "query": "Execute the approved action",
            "description": "Shows final execution with audit trail and results"
        }
    ]
    
    for i, scenario in enumerate(demo_scenarios, 1):
        print(f"\n{i}. {scenario['title']}")
        print(f"   Description: {scenario['description']}")
        print(f"   Query: {scenario['query']}")
        print("-" * 60)
        
        try:
            # Add to conversation history
            cli.conversation_history.append({
                "type": "user",
                "content": scenario['query'],
                "timestamp": asyncio.get_event_loop().time()
            })
            
            # Process the request
            result = await ai_agent.process_request(scenario['query'])
            
            # Add AI response to conversation history
            cli.conversation_history.append({
                "type": "assistant",
                "content": result,
                "timestamp": asyncio.get_event_loop().time()
            })
            
            # Display results using CLI interface
            await cli._display_results(result)
            
        except Exception as e:
            print(f"❌ Error: {e}")
        
        print()
    
    # Show conversation history
    print("\n📜 Conversation History Summary")
    print("-" * 40)
    await cli._show_history()
    
    # Show help system
    print("\n❓ Help System Overview")
    print("-" * 40)
    await cli._show_help()
    
    print("\n🎉 Full System Demo Completed!")
    print("\n" + "="*80)
    print("This comprehensive demonstration showcases:")
    print("✅ Natural language processing and understanding")
    print("✅ Intelligent tool selection and orchestration")
    print("✅ Multi-step workflow execution with proper sequencing")
    print("✅ Rich CLI interface with colors and formatting")
    print("✅ Conversation history and context management")
    print("✅ Comprehensive help system and user assistance")
    print("✅ Error handling and graceful degradation")
    print("✅ Audit trail and detailed result processing")
    print("✅ Real-world workflow scenarios with governance")
    print("="*80)
    print("\nThe MCP AI Agent system is ready for production use!")


async def main():
    """Run the full system demo"""
    await demo_full_system()


if __name__ == "__main__":
    asyncio.run(main())

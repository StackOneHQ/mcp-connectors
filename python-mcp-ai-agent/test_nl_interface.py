#!/usr/bin/env python3
"""
Test script for the natural language interface
"""
import asyncio
import sys
import os

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.mcp_client import MCPConnectorManager
from src.ai_agent import AIAgent
from src.cli_interface import NaturalLanguageCLI


class MockAIAgent(AIAgent):
    """Mock AI agent that doesn't require real API calls"""
    
    async def _select_tools(self, user_query: str):
        """Mock tool selection based on keywords"""
        available_tools = await self._get_available_tools()
        
        # Simple keyword-based tool selection
        tool_calls = []
        
        if "register" in user_query.lower() and "actor" in user_query.lower():
            # Extract name and role from query
            import re
            name_match = re.search(r'(\w+)\s+as\s+(\w+)', user_query)
            if name_match:
                name, role = name_match.groups()
                tool_calls.append({
                    "connector_name": "workflow",
                    "tool_name": "register_actor",
                    "arguments": {"name": name, "role": role},
                    "reasoning": f"Registering {name} as {role} based on user request"
                })
        
        if "workflow" in user_query.lower() and "create" in user_query.lower():
            # Extract workflow title
            import re
            title_match = re.search(r'workflow\s+(?:for|called)\s+([^"]+)', user_query, re.IGNORECASE)
            title = title_match.group(1) if title_match else "New Workflow"
            tool_calls.append({
                "connector_name": "workflow",
                "tool_name": "start_workflow",
                "arguments": {"title": title},
                "reasoning": f"Creating workflow '{title}' based on user request"
            })
        
        if "propose" in user_query.lower() or "action" in user_query.lower():
            tool_calls.append({
                "connector_name": "workflow",
                "tool_name": "propose_action",
                "arguments": {
                    "workflow_id": "workflow_1",
                    "tool": "database_migration",
                    "params": {"operation": "create_table", "table_name": "users"},
                    "reason": "Adding new users table based on user request"
                },
                "reasoning": "Proposing database migration action based on user request"
            })
        
        if "review" in user_query.lower() and "approve" in user_query.lower():
            tool_calls.append({
                "connector_name": "workflow",
                "tool_name": "review_action",
                "arguments": {
                    "proposal_id": "proposal_1",
                    "decision": "approve"
                },
                "reasoning": "Reviewing and approving proposal based on user request"
            })
        
        if "execute" in user_query.lower():
            tool_calls.append({
                "connector_name": "workflow",
                "tool_name": "execute_action",
                "arguments": {"proposal_id": "proposal_1"},
                "reasoning": "Executing approved action based on user request"
            })
        
        if "audit" in user_query.lower() or "log" in user_query.lower():
            tool_calls.append({
                "connector_name": "workflow",
                "tool_name": "get_audit_log",
                "arguments": {"workflow_id": "workflow_1"},
                "reasoning": "Retrieving audit log based on user request"
            })
        
        reasoning = f"Analyzed user query and selected {len(tool_calls)} tools to execute"
        
        return reasoning, tool_calls
    
    async def _generate_summary(self, user_query: str, reasoning: str, results: list):
        """Mock summary generation"""
        if not results:
            return "No actions were taken for this request."
        
        successful_actions = [r for r in results if r.get("success")]
        failed_actions = [r for r in results if not r.get("success")]
        
        summary = f"Successfully completed {len(successful_actions)} actions based on your request: '{user_query}'. "
        
        if successful_actions:
            summary += "All requested operations were completed successfully. "
        
        if failed_actions:
            summary += f"{len(failed_actions)} actions failed and may need attention. "
        
        summary += "The workflow has been updated and all changes have been logged in the audit trail."
        
        return summary


async def test_natural_language_interface():
    """Test the natural language interface"""
    print("🧪 Testing Natural Language Interface")
    print("="*60)
    
    # Create components
    manager = MCPConnectorManager()
    await manager.add_connector("workflow", "http://localhost:3000")
    
    # Create mock AI agent
    ai_agent = MockAIAgent(manager, openai_api_key="mock-key")
    
    # Create CLI interface
    cli = NaturalLanguageCLI(manager, ai_agent)
    
    print("✅ Components initialized")
    
    # Test natural language queries
    test_queries = [
        "Create a new workflow for database migration",
        "Register Alice as a DBA",
        "Propose an action to update the database schema",
        "Review and approve the pending proposal",
        "Execute the approved action",
        "Show me the audit log"
    ]
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n{i}. Testing: '{query}'")
        print("-" * 50)
        
        try:
            # Process the request
            result = await ai_agent.process_request(query)
            
            # Display results
            if result.get("reasoning"):
                print(f"🤔 Reasoning: {result['reasoning']}")
            
            if result.get("tool_calls"):
                print(f"🔧 Tool Calls: {len(result['tool_calls'])} executed")
                for j, tool_call in enumerate(result["tool_calls"], 1):
                    print(f"   {j}. {tool_call['tool_name']} ({tool_call['connector_name']})")
                    print(f"      Arguments: {tool_call['arguments']}")
                    print(f"      Reasoning: {tool_call['reasoning']}")
            
            if result.get("summary"):
                print(f"📝 Summary: {result['summary']}")
            
            print("✅ Query processed successfully")
            
        except Exception as e:
            print(f"❌ Error processing query: {e}")
        
        print()
    
    print("🎉 Natural language interface tests completed!")


async def test_cli_interface():
    """Test the CLI interface components"""
    print("\n🧪 Testing CLI Interface Components")
    print("="*60)
    
    # Create components
    manager = MCPConnectorManager()
    await manager.add_connector("workflow", "http://localhost:3000")
    ai_agent = MockAIAgent(manager, openai_api_key="mock-key")
    cli = NaturalLanguageCLI(manager, ai_agent)
    
    print("✅ Components initialized")
    
    # Test CLI features
    print("\n1. Testing help display...")
    await cli._show_help()
    
    print("\n2. Testing tools display...")
    await cli._show_available_tools()
    
    print("\n3. Testing history display...")
    await cli._show_history()
    
    print("\n4. Testing conversation history...")
    cli.conversation_history.append({
        "type": "user",
        "content": "Create a new workflow",
        "timestamp": asyncio.get_event_loop().time()
    })
    await cli._show_history()
    
    print("\n5. Testing result display...")
    mock_result = {
        "reasoning": "Test reasoning",
        "tool_calls": [
            {
                "tool_name": "start_workflow",
                "connector_name": "workflow",
                "arguments": {"title": "Test Workflow"},
                "reasoning": "Creating test workflow"
            }
        ],
        "results": [
            {
                "tool_call": {
                    "tool_name": "start_workflow",
                    "connector_name": "workflow"
                },
                "success": True,
                "result": {"content": [{"text": '{"workflow_id": "test_1"}'}]},
                "error": None
            }
        ],
        "summary": "Test workflow created successfully"
    }
    
    await cli._display_results(mock_result)
    
    print("\n🎉 CLI interface tests completed!")


async def main():
    """Run all natural language interface tests"""
    print("🚀 Starting Natural Language Interface Tests")
    print("="*60)
    
    # Test 1: Natural language processing
    await test_natural_language_interface()
    
    # Test 2: CLI interface components
    await test_cli_interface()
    
    print("\n" + "="*60)
    print("🎉 All natural language interface tests completed!")
    print("="*60)


if __name__ == "__main__":
    asyncio.run(main())

#!/usr/bin/env python3
"""
Test script for the API endpoints
"""
import asyncio
import sys
import os

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.mcp_client import MCPConnectorManager
from src.ai_agent import AIAgent


async def test_api_endpoints():
    """Test the API endpoints directly"""
    print("🧪 Testing API Endpoints")
    print("="*50)
    
    # Create components
    manager = MCPConnectorManager()
    await manager.add_connector("test", "http://localhost:3000")
    
    # Create AI agent with test API key
    ai_agent = AIAgent(manager, openai_api_key="test-key")
    
    print("✅ Components initialized")
    
    # Test 1: List tools
    print("\n1. Testing tool listing...")
    try:
        tools = await manager.list_all_tools()
        print(f"✅ Found {len(tools.get('test', []))} tools")
        for tool in tools.get('test', []):
            print(f"   - {tool['name']}: {tool['description']}")
    except Exception as e:
        print(f"❌ Tool listing failed: {e}")
    
    # Test 2: Direct tool calls
    print("\n2. Testing direct tool calls...")
    try:
        # Test register_actor
        result = await manager.call_tool_on_connector(
            "test", "register_actor", {"name": "Alice", "role": "DBA"}
        )
        print(f"✅ register_actor: {result.content[0]['text'] if result.content else 'No content'}")
        
        # Test start_workflow
        result = await manager.call_tool_on_connector(
            "test", "start_workflow", {"title": "Database Migration"}
        )
        print(f"✅ start_workflow: {result.content[0]['text'] if result.content else 'No content'}")
        
    except Exception as e:
        print(f"❌ Direct tool calls failed: {e}")
    
    # Test 3: Natural language processing (will fail due to invalid API key, but should handle gracefully)
    print("\n3. Testing natural language processing...")
    try:
        result = await ai_agent.process_request("Create a new workflow and register Alice as a DBA")
        print(f"✅ Natural language processing: {result.get('summary', 'No summary')}")
    except Exception as e:
        print(f"⚠️ Natural language processing failed (expected with test API key): {e}")
    
    print("\n🎉 API endpoint tests completed!")


async def test_full_workflow():
    """Test a full workflow"""
    print("\n🧪 Testing Full Workflow")
    print("="*50)
    
    # Create components
    manager = MCPConnectorManager()
    await manager.add_connector("workflow", "http://localhost:3000")
    
    print("✅ Components initialized")
    
    try:
        # Step 1: Register an actor
        print("\n1. Registering actor...")
        result = await manager.call_tool_on_connector(
            "workflow", "register_actor", {"name": "Bob", "role": "DevOps Engineer"}
        )
        actor_data = result.content[0]['text'] if result.content else '{}'
        print(f"✅ Actor registered: {actor_data}")
        
        # Step 2: Start a workflow
        print("\n2. Starting workflow...")
        result = await manager.call_tool_on_connector(
            "workflow", "start_workflow", {"title": "Production Deployment"}
        )
        workflow_data = result.content[0]['text'] if result.content else '{}'
        print(f"✅ Workflow started: {workflow_data}")
        
        # Step 3: Propose an action
        print("\n3. Proposing action...")
        result = await manager.call_tool_on_connector(
            "workflow", "propose_action", {
                "workflow_id": "workflow_1",
                "tool": "database_migration",
                "params": {"operation": "create_table", "table_name": "users"},
                "reason": "Adding new users table for authentication system"
            }
        )
        proposal_data = result.content[0]['text'] if result.content else '{}'
        print(f"✅ Action proposed: {proposal_data}")
        
        # Step 4: Review the action
        print("\n4. Reviewing action...")
        result = await manager.call_tool_on_connector(
            "workflow", "review_action", {
                "proposal_id": "proposal_1",
                "decision": "approve"
            }
        )
        review_data = result.content[0]['text'] if result.content else '{}'
        print(f"✅ Action reviewed: {review_data}")
        
        # Step 5: Execute the action
        print("\n5. Executing action...")
        result = await manager.call_tool_on_connector(
            "workflow", "execute_action", {"proposal_id": "proposal_1"}
        )
        execution_data = result.content[0]['text'] if result.content else '{}'
        print(f"✅ Action executed: {execution_data}")
        
        # Step 6: Get audit log
        print("\n6. Getting audit log...")
        result = await manager.call_tool_on_connector(
            "workflow", "get_audit_log", {"workflow_id": "workflow_1"}
        )
        audit_data = result.content[0]['text'] if result.content else '{}'
        print(f"✅ Audit log retrieved: {audit_data}")
        
        print("\n🎉 Full workflow test completed successfully!")
        
    except Exception as e:
        print(f"❌ Full workflow test failed: {e}")
    
    finally:
        await manager.close_all()


async def main():
    """Run all tests"""
    print("🚀 Starting Full API Tests")
    print("="*60)
    
    # Test 1: API endpoints
    await test_api_endpoints()
    
    # Test 2: Full workflow
    await test_full_workflow()
    
    print("\n" + "="*60)
    print("🎉 All API tests completed!")
    print("="*60)


if __name__ == "__main__":
    asyncio.run(main())

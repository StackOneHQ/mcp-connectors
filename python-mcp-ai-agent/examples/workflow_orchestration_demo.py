#!/usr/bin/env python3
"""
Demo script showing how to use the Python AI Agent with the Workflow Orchestration connector
"""
import asyncio
import json
import os
from typing import Dict, Any

from src.mcp_client import MCPConnectorManager
from src.ai_agent import AIAgent


async def demo_workflow_orchestration():
    """Demonstrate workflow orchestration capabilities"""
    
    # Initialize components
    connector_manager = MCPConnectorManager()
    
    # Get API key from environment
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        print("Please set OPENAI_API_KEY environment variable")
        return
    
    try:
        # Connect to the workflow orchestration connector
        print("🔗 Connecting to Workflow Orchestration connector...")
        await connector_manager.add_connector("workflow", "http://localhost:3000")
        print("✅ Connected successfully!")
        
        # Initialize AI agent
        print("🤖 Initializing AI Agent...")
        ai_agent = AIAgent(
            connector_manager=connector_manager,
            openai_api_key=openai_api_key
        )
        print("✅ AI Agent ready!")
        
        # Show available tools
        print("\n📋 Available Tools:")
        tools_summary = await ai_agent.get_available_tools_summary()
        print(tools_summary)
        
        # Demo 1: Basic workflow setup
        print("\n" + "="*60)
        print("DEMO 1: Basic Workflow Setup")
        print("="*60)
        
        query1 = "Create a new workflow called 'Database Migration' and register an actor named 'Alice' as a 'DBA'"
        print(f"Query: {query1}")
        
        result1 = await ai_agent.process_request(query1)
        print(f"Reasoning: {result1['reasoning']}")
        print(f"Summary: {result1['summary']}")
        
        # Demo 2: Proposal and review workflow
        print("\n" + "="*60)
        print("DEMO 2: Proposal and Review Workflow")
        print("="*60)
        
        query2 = "Propose an action to update the database schema by adding a new table called 'users' with columns 'id', 'name', and 'email', then review and approve it"
        print(f"Query: {query2}")
        
        result2 = await ai_agent.process_request(query2)
        print(f"Reasoning: {result2['reasoning']}")
        print(f"Summary: {result2['summary']}")
        
        # Demo 3: Complex multi-step workflow
        print("\n" + "="*60)
        print("DEMO 3: Complex Multi-step Workflow")
        print("="*60)
        
        query3 = """
        Create a comprehensive deployment workflow with the following steps:
        1. Register a 'DevOps Engineer' actor named 'Bob'
        2. Start a workflow called 'Production Deployment'
        3. Propose a database migration action
        4. Propose a code deployment action
        5. Review and approve both proposals
        6. Execute the approved actions
        7. Get the audit log for the workflow
        """
        print(f"Query: {query3}")
        
        result3 = await ai_agent.process_request(query3)
        print(f"Reasoning: {result3['reasoning']}")
        print(f"Summary: {result3['summary']}")
        
        # Demo 4: Parallel execution
        print("\n" + "="*60)
        print("DEMO 4: Parallel Execution")
        print("="*60)
        
        query4 = "Execute multiple actions in parallel: update user permissions, clear cache, and restart services"
        print(f"Query: {query4}")
        
        result4 = await ai_agent.process_request(query4)
        print(f"Reasoning: {result4['reasoning']}")
        print(f"Summary: {result4['summary']}")
        
        # Demo 5: Policy management
        print("\n" + "="*60)
        print("DEMO 5: Policy Management")
        print("="*60)
        
        query5 = "Enable dry-run mode for safety, then propose a critical system change, review it, and execute it"
        print(f"Query: {query5}")
        
        result5 = await ai_agent.process_request(query5)
        print(f"Reasoning: {result5['reasoning']}")
        print(f"Summary: {result5['summary']}")
        
        print("\n" + "="*60)
        print("🎉 Demo completed successfully!")
        print("="*60)
        
    except Exception as e:
        print(f"❌ Error during demo: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        await connector_manager.close_all()
        print("🔌 All connections closed")


async def demo_direct_tool_calls():
    """Demonstrate direct tool calls without AI agent"""
    
    connector_manager = MCPConnectorManager()
    
    try:
        print("🔗 Connecting to Workflow Orchestration connector...")
        await connector_manager.add_connector("workflow", "http://localhost:3000")
        print("✅ Connected successfully!")
        
        print("\n" + "="*60)
        print("DEMO: Direct Tool Calls")
        print("="*60)
        
        # 1. Register an actor
        print("1. Registering actor...")
        result1 = await connector_manager.call_tool_on_connector(
            "workflow",
            "register_actor",
            {"name": "Charlie", "role": "Developer"}
        )
        print(f"Result: {result1.content[0]['text'] if result1.content else 'No content'}")
        
        # 2. Start a workflow
        print("\n2. Starting workflow...")
        result2 = await connector_manager.call_tool_on_connector(
            "workflow",
            "start_workflow",
            {"title": "Direct API Test"}
        )
        print(f"Result: {result2.content[0]['text'] if result2.content else 'No content'}")
        
        # 3. List all tools
        print("\n3. Available tools:")
        tools = await connector_manager.list_all_tools()
        for connector_name, connector_tools in tools.items():
            print(f"\n{connector_name}:")
            for tool in connector_tools:
                print(f"  - {tool.get('name', 'Unknown')}: {tool.get('description', 'No description')}")
        
        print("\n✅ Direct tool calls completed!")
        
    except Exception as e:
        print(f"❌ Error during direct tool calls: {e}")
    
    finally:
        await connector_manager.close_all()


def main():
    """Main entry point"""
    print("🚀 MCP AI Agent - Workflow Orchestration Demo")
    print("="*60)
    
    # Check if MCP connector is running
    import requests
    try:
        response = requests.get("http://localhost:3000/mcp", timeout=5)
        print("✅ MCP connector server is running")
    except:
        print("❌ MCP connector server is not running")
        print("Please start it with: bun start --connector workflow-orchestration")
        return
    
    # Run demos
    asyncio.run(demo_workflow_orchestration())
    print("\n")
    asyncio.run(demo_direct_tool_calls())


if __name__ == "__main__":
    main()

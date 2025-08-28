#!/usr/bin/env python3
"""
Demo script showing the MCP AI Agent with Gemini integration
"""
import asyncio
import sys
import os

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.mcp_client import MCPConnectorManager
from src.ai_agent import AIAgent
from src.cli_interface import NaturalLanguageCLI


async def demo_gemini_integration():
    """Demonstrate the Gemini integration"""
    print("🚀 MCP AI Agent - Gemini Integration Demo")
    print("="*60)
    
    # Check for API key
    gemini_key = os.getenv("GOOGLE_API_KEY")
    if not gemini_key:
        print("⚠️ No GOOGLE_API_KEY found in environment")
        print("To test with real Gemini, set your API key:")
        print("export GOOGLE_API_KEY='your-gemini-api-key'")
        print("\nFor now, we'll use a mock key to demonstrate the interface...")
        gemini_key = "mock-key"
    
    # Create components
    print("\n1. Setting up components...")
    manager = MCPConnectorManager()
    await manager.add_connector("workflow", "http://localhost:3000")
    
    # Create AI agent
    ai_agent = AIAgent(manager, gemini_api_key=gemini_key)
    print("✅ AI Agent created successfully")
    
    # Create CLI interface
    cli = NaturalLanguageCLI(manager, ai_agent)
    print("✅ CLI interface created successfully")
    
    # Show available tools
    print("\n2. Available tools:")
    await cli._show_available_tools()
    
    # Demo natural language processing
    print("\n3. Natural Language Processing Demo")
    print("="*40)
    
    demo_queries = [
        "Create a new workflow for database migration",
        "Register Alice as a DBA",
        "Propose an action to update the database schema",
        "Review and approve the pending proposal",
        "Execute the approved action"
    ]
    
    for i, query in enumerate(demo_queries, 1):
        print(f"\n{i}. Processing: '{query}'")
        print("-" * 50)
        
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
            
            print("✅ Query processed successfully")
            
        except Exception as e:
            print(f"❌ Error: {e}")
        
        print()
    
    print("🎉 Gemini integration demo completed!")
    print("\nThis demonstrates how the AI agent can:")
    print("• Understand natural language requests")
    print("• Select appropriate tools automatically")
    print("• Execute complex workflows")
    print("• Provide intelligent summaries")
    print("• Handle conversation history")


async def demo_cli_interface():
    """Demonstrate the CLI interface features"""
    print("\n🧪 CLI Interface Features Demo")
    print("="*50)
    
    # Create components
    manager = MCPConnectorManager()
    await manager.add_connector("workflow", "http://localhost:3000")
    ai_agent = AIAgent(manager, gemini_api_key="mock-key")
    cli = NaturalLanguageCLI(manager, ai_agent)
    
    print("✅ Components initialized")
    
    # Demo CLI features
    print("\n1. Help system:")
    await cli._show_help()
    
    print("\n2. Tools display:")
    await cli._show_available_tools()
    
    print("\n3. History display:")
    await cli._show_history()
    
    print("\n4. Adding conversation history:")
    cli.conversation_history.append({
        "type": "user",
        "content": "Create a new workflow",
        "timestamp": asyncio.get_event_loop().time()
    })
    await cli._show_history()
    
    print("\n5. Result display:")
    mock_result = {
        "reasoning": "Analyzed user request and selected appropriate tools",
        "tool_calls": [
            {
                "tool_name": "start_workflow",
                "connector_name": "workflow",
                "arguments": {"title": "Database Migration"},
                "reasoning": "Creating new workflow for database migration"
            }
        ],
        "results": [
            {
                "tool_call": {
                    "tool_name": "start_workflow",
                    "connector_name": "workflow"
                },
                "success": True,
                "result": {"content": [{"text": '{"workflow_id": "workflow_1", "title": "Database Migration"}'}]},
                "error": None
            }
        ],
        "summary": "Successfully created a new workflow called 'Database Migration' with ID 'workflow_1'."
    }
    
    await cli._display_results(mock_result)
    
    print("\n🎉 CLI interface demo completed!")


async def main():
    """Run the complete demo"""
    print("🚀 Starting Complete Gemini Integration Demo")
    print("="*60)
    
    # Demo 1: Gemini integration
    await demo_gemini_integration()
    
    # Demo 2: CLI interface
    await demo_cli_interface()
    
    print("\n" + "="*60)
    print("🎉 Complete demo finished!")
    print("="*60)
    print("\nTo test with real Gemini:")
    print("1. Get API key: https://makersuite.google.com/app/apikey")
    print("2. Set key: export GOOGLE_API_KEY='your-key'")
    print("3. Start server: python test_server.py")
    print("4. Run chat: python main.py chat --connector http://localhost:3000")
    print("\nThe MCP AI Agent with Gemini is ready for production use! 🚀")


if __name__ == "__main__":
    asyncio.run(main())

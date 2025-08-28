#!/usr/bin/env python3
"""
Demo script showing the MCP AI Agent with disco animation
"""
import asyncio
import sys
import os

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.mcp_client import MCPConnectorManager
from src.ai_agent import AIAgent
from src.cli_interface import NaturalLanguageCLI
from src.disco_animation import show_disco_header, show_disco_spinner


async def demo_disco_integration():
    """Demonstrate disco animation integration"""
    print("🎵 MCP AI Agent - Disco Animation Demo")
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
    
    # Demo disco animation
    print("\n3. Disco Animation Demo")
    print("="*40)
    
    # Demo 1: Short spinner
    print("\n🎵 Demo 1: Disco Spinner (3 seconds)")
    await show_disco_spinner("🎵 Processing... 🎵", 3.0)
    print("✅ Spinner demo completed!")
    
    # Demo 2: Full disco header
    print("\n🎵 Demo 2: Full Disco Header (5 seconds)")
    await show_disco_header("🎵 AI is thinking... 🎵", 5.0)
    print("✅ Disco header demo completed!")
    
    # Demo 3: CLI interface with disco
    print("\n🎵 Demo 3: CLI Interface with Disco Header")
    print("="*50)
    
    # Simulate a user request with disco animation
    test_query = "Create a new workflow for database migration"
    print(f"\nUser: {test_query}")
    
    # Add to conversation history
    cli.conversation_history.append({
        "type": "user",
        "content": test_query,
        "timestamp": asyncio.get_event_loop().time()
    })
    
    # Show disco header while "processing"
    disco_task = None
    try:
        print("\n🎵 Starting disco header...")
        disco_task = asyncio.create_task(
            show_disco_header("🎵 AI is thinking... 🎵")
        )
        
        # Simulate processing time
        await asyncio.sleep(3.0)
        
        # Stop disco header animation
        if disco_task:
            disco_task.cancel()
            try:
                await disco_task
            except asyncio.CancelledError:
                pass
        
        print("\n✅ Processing completed!")
        
        # Simulate AI response
        mock_result = {
            "reasoning": "Analyzed the user request and determined that a new workflow needs to be created for database migration. This requires using the start_workflow tool.",
            "tool_calls": [
                {
                    "tool_name": "start_workflow",
                    "connector_name": "workflow",
                    "arguments": {"title": "Database Migration"},
                    "reasoning": "Creating a new workflow for database migration as requested"
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
            "summary": "I've successfully created a new workflow called 'Database Migration' with ID 'workflow_1'. This workflow is now ready for you to add actors, propose actions, and manage the database migration process."
        }
        
        # Add AI response to conversation history
        cli.conversation_history.append({
            "type": "assistant",
            "content": mock_result,
            "timestamp": asyncio.get_event_loop().time()
        })
        
        # Display the results
        await cli._display_results(mock_result)
        
    except Exception as e:
        # Stop disco header animation on error
        if disco_task:
            disco_task.cancel()
            try:
                await disco_task
            except asyncio.CancelledError:
                pass
        
        print(f"\n❌ Error: {e}")
    
    print("\n🎉 Disco header integration demo completed!")
    print("\nThis demonstrates how the CLI interface now includes:")
    print("• 🎵 Disco header animation during AI processing")
    print("• 🎵 Disco spinner for shorter operations")
    print("• 🎵 Beautiful visual feedback for users")
    print("• 🎵 Engaging terminal experience")


async def demo_cli_features():
    """Demonstrate CLI features with disco elements"""
    print("\n🧪 CLI Features with Disco Elements")
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
    
    print("\n5. Result display with disco theme:")
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
        "summary": "🎵 Successfully created a new workflow called 'Database Migration' with ID 'workflow_1'. The disco ball is spinning and the workflow is ready to rock! 🎵"
    }
    
    await cli._display_results(mock_result)
    
    print("\n🎉 CLI interface demo completed!")


async def main():
    """Run the complete disco demo"""
    print("🚀 Starting Complete Disco Animation Demo")
    print("="*60)
    
    # Demo 1: Disco integration
    await demo_disco_integration()
    
    # Demo 2: CLI features
    await demo_cli_features()
    
    print("\n" + "="*60)
    print("🎉 Complete disco demo finished!")
    print("="*60)
    print("\nTo test with real disco animation:")
    print("1. Get a Gemini API key: https://makersuite.google.com/app/apikey")
    print("2. Set your API key: export GOOGLE_API_KEY='your-key'")
    print("3. Start the test server: python test_server.py")
    print("4. Run the chat interface: python main.py chat --connector http://localhost:3000")
    print("\nThe MCP AI Agent with disco animation is ready to party! 🎵🚀")


if __name__ == "__main__":
    asyncio.run(main())

#!/usr/bin/env python3
"""
Test script to debug AI agent tool selection
"""
import asyncio
import sys
import os

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.ai_agent_debug import AIAgentDebug
from src.mcp_client import MCPConnectorManager


async def test_ai_agent():
    """Test the AI agent with debug output"""
    print("🧪 Testing AI Agent Debug")
    print("="*50)
    
    # Create connector manager
    connector_manager = MCPConnectorManager()
    
    try:
        # Connect to the test server
        print("Connecting to MCP server...")
        await connector_manager.add_connector("test", "http://localhost:3003")
        print("✅ Connected to MCP server")
        
        # Create AI agent
        ai_agent = AIAgentDebug(
            connector_manager=connector_manager,
            gemini_api_key="AIzaSyCXCVNNHi1SY-FEdPrTu6T9fH2tTw2ZKWs"
        )
        print("✅ AI Agent created")
        
        # Test getting available tools
        print("\nTesting tool discovery...")
        tools = await ai_agent._get_available_tools()
        print(f"Found {len(tools)} tools:")
        for tool in tools:
            print(f"  - {tool.name}: {tool.description}")
        
        # Test tool selection with a simple query
        print("\nTesting tool selection...")
        test_queries = [
            "What tools are available?",
            "Run the test tool",
            "Persist a value called 'test' with value 'hello world'",
            "Get the value called 'test'",
            "Increment the counter"
        ]
        
        for query in test_queries:
            print(f"\n{'='*60}")
            print(f"Testing query: '{query}'")
            print(f"{'='*60}")
            
            try:
                result = await ai_agent.process_request(query)
                print(f"Result: {result}")
            except Exception as e:
                print(f"Error: {e}")
                import traceback
                traceback.print_exc()
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await connector_manager.close_all()


if __name__ == "__main__":
    asyncio.run(test_ai_agent())

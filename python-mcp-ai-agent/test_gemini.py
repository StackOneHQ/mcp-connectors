#!/usr/bin/env python3
"""
Test script for Gemini integration
"""
import asyncio
import sys
import os

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.mcp_client import MCPConnectorManager
from src.ai_agent import AIAgent


async def test_gemini_integration():
    """Test Gemini integration"""
    print("🧪 Testing Gemini Integration")
    print("="*50)
    
    # Create components
    manager = MCPConnectorManager()
    await manager.add_connector("workflow", "http://localhost:3000")
    
    # Test with mock API key first
    print("1. Testing with mock API key...")
    try:
        ai_agent = AIAgent(manager, gemini_api_key="mock-key")
        print("✅ AI Agent created successfully with mock key")
    except Exception as e:
        print(f"❌ AI Agent creation failed: {e}")
        return False
    
    # Test tool discovery
    print("\n2. Testing tool discovery...")
    try:
        tools = await ai_agent._get_available_tools()
        print(f"✅ Found {len(tools)} tools")
        for tool in tools:
            print(f"   - {tool.name}: {tool.description}")
    except Exception as e:
        print(f"❌ Tool discovery failed: {e}")
        return False
    
    # Test prompt creation
    print("\n3. Testing prompt creation...")
    try:
        prompt = ai_agent._create_tool_selection_prompt("Create a new workflow", tools)
        print(f"✅ Prompt created successfully ({len(prompt)} characters)")
        print(f"   Prompt preview: {prompt[:200]}...")
    except Exception as e:
        print(f"❌ Prompt creation failed: {e}")
        return False
    
    print("\n🎉 Gemini integration tests completed!")
    return True


async def test_with_real_gemini():
    """Test with real Gemini API (if key is available)"""
    gemini_key = os.getenv("GOOGLE_API_KEY")
    
    if not gemini_key:
        print("\n⚠️ No GOOGLE_API_KEY found in environment")
        print("To test with real Gemini, set your API key:")
        print("export GOOGLE_API_KEY='your-gemini-api-key'")
        return True
    
    print("\n🧪 Testing with Real Gemini API")
    print("="*50)
    
    # Create components
    manager = MCPConnectorManager()
    await manager.add_connector("workflow", "http://localhost:3000")
    
    # Create AI agent with real key
    print("1. Creating AI agent with real Gemini key...")
    try:
        ai_agent = AIAgent(manager, gemini_api_key=gemini_key)
        print("✅ AI Agent created successfully")
    except Exception as e:
        print(f"❌ AI Agent creation failed: {e}")
        return False
    
    # Test natural language processing
    print("\n2. Testing natural language processing...")
    test_queries = [
        "Create a new workflow for database migration",
        "Register Alice as a DBA",
        "Show me the available tools"
    ]
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n   Testing query {i}: '{query}'")
        try:
            result = await ai_agent.process_request(query)
            
            if result.get("reasoning"):
                print(f"   🤔 Reasoning: {result['reasoning'][:100]}...")
            
            if result.get("tool_calls"):
                print(f"   🔧 Tool calls: {len(result['tool_calls'])}")
                for tool_call in result["tool_calls"]:
                    print(f"      - {tool_call['tool_name']}: {tool_call['reasoning'][:50]}...")
            
            if result.get("summary"):
                print(f"   📝 Summary: {result['summary'][:100]}...")
            
            print(f"   ✅ Query {i} processed successfully")
            
        except Exception as e:
            print(f"   ❌ Query {i} failed: {e}")
    
    print("\n🎉 Real Gemini API tests completed!")
    return True


async def main():
    """Run all Gemini tests"""
    print("🚀 Starting Gemini Integration Tests")
    print("="*60)
    
    # Test 1: Basic integration
    if not await test_gemini_integration():
        print("\n❌ Basic integration tests failed")
        return
    
    # Test 2: Real API (if available)
    if not await test_with_real_gemini():
        print("\n❌ Real API tests failed")
        return
    
    print("\n" + "="*60)
    print("🎉 All Gemini tests completed!")
    print("="*60)
    print("\nNext steps:")
    print("1. Get a Gemini API key from: https://makersuite.google.com/app/apikey")
    print("2. Set your API key: export GOOGLE_API_KEY='your-key'")
    print("3. Start the test server: python test_server.py")
    print("4. Run the chat interface: python main.py chat --connector http://localhost:3000")


if __name__ == "__main__":
    asyncio.run(main())

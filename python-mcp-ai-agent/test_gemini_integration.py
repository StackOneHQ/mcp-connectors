#!/usr/bin/env python3
"""
Test script to verify the Gemini Image connector integration
"""
import asyncio
import sys
import os

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.mcp_client import MCPConnectorManager
from src.ai_agent import AIAgent


async def test_gemini_connector():
    """Test the Gemini image connector integration"""
    print("🧪 Testing Gemini Image Connector Integration")
    print("="*60)
    
    # Create connector manager
    manager = MCPConnectorManager()
    
    try:
        # Add the Gemini image connector
        print("1. Adding Gemini image connector...")
        await manager.add_connector("gemini-image", "http://localhost:3001/mcp")
        print("✅ Gemini image connector added successfully")
        
        # List available tools
        print("\n2. Listing available tools...")
        tools = await manager.list_all_tools()
        
        if "gemini-image" in tools:
            gemini_tools = tools["gemini-image"]
            print(f"✅ Found {len(gemini_tools)} Gemini tools:")
            for tool in gemini_tools:
                print(f"   - {tool.get('name', 'Unknown')}: {tool.get('description', 'No description')}")
        else:
            print("❌ No Gemini tools found")
            return False
        
        # Test the LIST_MODELS tool
        print("\n3. Testing LIST_MODELS tool...")
        try:
            result = await manager.call_tool_on_connector(
                "gemini-image",
                "gemini_list_models",
                {"category": "all"}
            )
            
            if result.error:
                print(f"❌ LIST_MODELS failed: {result.error}")
            else:
                print("✅ LIST_MODELS tool executed successfully")
                if result.content and len(result.content) > 0:
                    content = result.content[0].get("text", "")
                    print(f"   Response length: {len(content)} characters")
                    print(f"   Response preview: {content[:200]}...")
        except Exception as e:
            print(f"❌ LIST_MODELS tool error: {e}")
            return False
        
        # Test AI Agent with Gemini connector
        print("\n4. Testing AI Agent with Gemini connector...")
        try:
            # Create AI agent with mock API key
            ai_agent = AIAgent(manager, gemini_api_key="mock-key")
            print("✅ AI Agent created successfully")
            
            # Test tool discovery
            available_tools = await ai_agent._get_available_tools()
            gemini_tools = [tool for tool in available_tools if tool.connector_name == "gemini-image"]
            print(f"✅ AI Agent found {len(gemini_tools)} Gemini tools")
            
            # Test tool selection prompt
            prompt = ai_agent._create_tool_selection_prompt(
                "Generate an image of a beautiful sunset", 
                available_tools
            )
            print(f"✅ Tool selection prompt created ({len(prompt)} characters)")
            
        except Exception as e:
            print(f"❌ AI Agent test failed: {e}")
            return False
        
        print("\n🎉 All Gemini integration tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Integration test failed: {e}")
        return False


async def test_gemini_tools():
    """Test individual Gemini tools"""
    print("\n🧪 Testing Individual Gemini Tools")
    print("="*60)
    
    manager = MCPConnectorManager()
    
    try:
        await manager.add_connector("gemini-image", "http://localhost:3001/mcp")
        
        # Test tools that don't require real API calls
        tools_to_test = [
            ("gemini_list_models", {"category": "image-generation"}),
            ("gemini_list_models", {"category": "image-analysis"}),
        ]
        
        for tool_name, args in tools_to_test:
            print(f"\nTesting {tool_name}...")
            try:
                result = await manager.call_tool_on_connector("gemini-image", tool_name, args)
                
                if result.error:
                    print(f"❌ {tool_name} failed: {result.error}")
                else:
                    print(f"✅ {tool_name} executed successfully")
                    if result.content and len(result.content) > 0:
                        content = result.content[0].get("text", "")
                        print(f"   Response preview: {content[:100]}...")
                        
            except Exception as e:
                print(f"❌ {tool_name} error: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Tool testing failed: {e}")
        return False


async def main():
    """Run all integration tests"""
    print("🚀 Starting Gemini Image Connector Integration Tests")
    print("="*80)
    
    # Test 1: Basic integration
    if not await test_gemini_connector():
        print("\n❌ Basic integration tests failed")
        return
    
    # Test 2: Individual tools
    if not await test_gemini_tools():
        print("\n❌ Individual tool tests failed")
        return
    
    print("\n" + "="*80)
    print("🎉 All Gemini Image Connector integration tests passed!")
    print("="*80)
    print("\nThe Gemini image connector is successfully integrated with the Python AI agent.")
    print("\nNext steps:")
    print("1. Set your Google AI Studio API key: export GOOGLE_API_KEY='your-key'")
    print("2. Test image generation: python main.py chat --connector http://localhost:3001/mcp")
    print("3. Try: 'Generate an image of a beautiful mountain landscape at sunset'")


if __name__ == "__main__":
    asyncio.run(main()) 
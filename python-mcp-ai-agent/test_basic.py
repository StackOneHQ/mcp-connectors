#!/usr/bin/env python3
"""
Basic test script to verify the Python AI Agent components work
"""
import asyncio
import sys
import os

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.mcp_client import MCPClient, MCPConnectorManager
from src.ai_agent import AIAgent


async def test_basic_components():
    """Test basic components without requiring MCP server"""
    print("🧪 Testing Basic Components")
    print("="*50)
    
    # Test 1: MCP Client initialization
    print("1. Testing MCP Client initialization...")
    try:
        client = MCPClient("http://localhost:3000")
        print("✅ MCP Client created successfully")
    except Exception as e:
        print(f"❌ MCP Client creation failed: {e}")
        return False
    
    # Test 2: MCP Connector Manager initialization
    print("\n2. Testing MCP Connector Manager initialization...")
    try:
        manager = MCPConnectorManager()
        print("✅ MCP Connector Manager created successfully")
    except Exception as e:
        print(f"❌ MCP Connector Manager creation failed: {e}")
        return False
    
    # Test 3: AI Agent initialization (without API key for now)
    print("\n3. Testing AI Agent initialization...")
    try:
        # This should fail without API key, which is expected
        ai_agent = AIAgent(manager, gemini_api_key=None, anthropic_api_key=None)
        print("❌ AI Agent should have failed without API key")
        return False
    except ValueError as e:
        print("✅ AI Agent correctly rejected initialization without API key")
        print(f"   Expected error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error in AI Agent initialization: {e}")
        return False
    
    # Test 4: Test with mock API key
    print("\n4. Testing AI Agent with mock API key...")
    try:
        ai_agent = AIAgent(manager, gemini_api_key="mock-key")
        print("✅ AI Agent created successfully with mock API key")
    except Exception as e:
        print(f"❌ AI Agent creation failed: {e}")
        return False
    
    print("\n🎉 All basic component tests passed!")
    return True


async def test_mock_workflow():
    """Test workflow with mock data"""
    print("\n🧪 Testing Mock Workflow")
    print("="*50)
    
    # Create components
    manager = MCPConnectorManager()
    ai_agent = AIAgent(manager, gemini_api_key="mock-key")
    
    # Test tool selection prompt creation
    print("1. Testing tool selection prompt creation...")
    try:
        tools = await ai_agent._get_available_tools()
        prompt = ai_agent._create_tool_selection_prompt("test query", tools)
        print("✅ Tool selection prompt created successfully")
        print(f"   Prompt length: {len(prompt)} characters")
    except Exception as e:
        print(f"❌ Tool selection prompt creation failed: {e}")
        return False
    
    # Test summary prompt creation
    print("\n2. Testing summary prompt creation...")
    try:
        from src.mcp_client import MCPToolResult
        from src.ai_agent import ToolCall
        
        mock_tool_call = ToolCall(
            connector_name="test",
            tool_name="test_tool",
            arguments={"param": "value"},
            reasoning="Testing the tool"
        )
        
        mock_results = [
            {
                "tool_call": mock_tool_call,
                "success": True,
                "result": MCPToolResult(content=[{"text": "Success"}]),
                "error": None
            }
        ]
        summary_prompt = ai_agent._create_summary_prompt("test query", "test reasoning", mock_results)
        print("✅ Summary prompt created successfully")
        print(f"   Prompt length: {len(summary_prompt)} characters")
    except Exception as e:
        print(f"❌ Summary prompt creation failed: {e}")
        return False
    
    print("\n🎉 All mock workflow tests passed!")
    return True


def test_imports():
    """Test that all modules can be imported"""
    print("🧪 Testing Module Imports")
    print("="*50)
    
    modules_to_test = [
        "src.mcp_client",
        "src.ai_agent", 
        "src.api_server",
        "src.cli_interface"
    ]
    
    for module_name in modules_to_test:
        try:
            __import__(module_name)
            print(f"✅ {module_name} imported successfully")
        except ImportError as e:
            print(f"❌ {module_name} import failed: {e}")
            return False
        except Exception as e:
            print(f"❌ {module_name} unexpected error: {e}")
            return False
    
    print("\n🎉 All module imports successful!")
    return True


async def main():
    """Run all tests"""
    print("🚀 Starting MCP AI Agent Tests")
    print("="*60)
    
    # Test 1: Module imports
    if not test_imports():
        print("\n❌ Module import tests failed")
        return
    
    # Test 2: Basic components
    if not await test_basic_components():
        print("\n❌ Basic component tests failed")
        return
    
    # Test 3: Mock workflow
    if not await test_mock_workflow():
        print("\n❌ Mock workflow tests failed")
        return
    
    print("\n" + "="*60)
    print("🎉 All tests passed! The Python AI Agent is ready for use.")
    print("="*60)
    print("\nNext steps:")
    print("1. Set your OpenAI API key: export OPENAI_API_KEY='your-key'")
    print("2. Start an MCP connector server")
    print("3. Run: python main.py chat --connector http://localhost:3000")


if __name__ == "__main__":
    asyncio.run(main())

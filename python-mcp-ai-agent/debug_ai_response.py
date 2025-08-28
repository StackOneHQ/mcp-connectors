#!/usr/bin/env python3
"""
Debug script to test Gemini API response
"""
import asyncio
import json
import sys
from pathlib import Path

# Add the src directory to the path
sys.path.insert(0, str(Path(__file__).parent / "src"))

import google.generativeai as genai
from src.mcp_client import MCPConnectorManager
from src.ai_agent import AIAgent

async def debug_ai_response():
    """Debug the AI response"""
    print("🔍 Debugging AI Response")
    print("="*50)
    
    # Initialize Gemini
    genai.configure(api_key="AIzaSyCXCVNNHi1SY-FEdPrTu6T9fH2tTw2ZKWs")
    model = genai.GenerativeModel("gemini-1.5-flash")
    
    # Create connector manager
    connector_manager = MCPConnectorManager()
    await connector_manager.add_connector("test_connector", "http://localhost:3000")
    
    # Create AI agent
    ai_agent = AIAgent(
        connector_manager=connector_manager,
        gemini_api_key="AIzaSyCXCVNNHi1SY-FEdPrTu6T9fH2tTw2ZKWs"
    )
    
    # Test 1: Simple Gemini response
    print("\n1. Testing simple Gemini response...")
    try:
        response = await model.generate_content_async("Say hello")
        print(f"✅ Simple response: {response.text}")
    except Exception as e:
        print(f"❌ Simple response failed: {e}")
    
    # Test 2: Get available tools
    print("\n2. Testing tool discovery...")
    try:
        tools = await ai_agent._get_available_tools()
        print(f"✅ Found {len(tools)} tools")
        for tool in tools:
            print(f"   - {tool.name}: {tool.description}")
    except Exception as e:
        print(f"❌ Tool discovery failed: {e}")
    
    # Test 3: Test the prompt creation
    print("\n3. Testing prompt creation...")
    try:
        tools = await ai_agent._get_available_tools()
        prompt = ai_agent._create_tool_selection_prompt("What tools are available?", tools)
        print(f"✅ Prompt created (length: {len(prompt)})")
        print(f"Prompt preview: {prompt[:200]}...")
    except Exception as e:
        print(f"❌ Prompt creation failed: {e}")
    
    # Test 4: Test AI response with the actual prompt
    print("\n4. Testing AI response with actual prompt...")
    try:
        tools = await ai_agent._get_available_tools()
        prompt = ai_agent._create_tool_selection_prompt("What tools are available?", tools)
        
        response = await model.generate_content_async(prompt)
        print(f"✅ AI response received (length: {len(response.text)})")
        print(f"Response: {response.text}")
        
        # Try to parse as JSON
        try:
            result = json.loads(response.text)
            print(f"✅ JSON parsed successfully: {result}")
        except json.JSONDecodeError as e:
            print(f"❌ JSON parsing failed: {e}")
            print(f"Raw response: {repr(response.text)}")
            
    except Exception as e:
        print(f"❌ AI response failed: {e}")
    
    # Cleanup
    await connector_manager.close_all()

if __name__ == "__main__":
    asyncio.run(debug_ai_response())


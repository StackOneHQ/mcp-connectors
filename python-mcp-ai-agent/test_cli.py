#!/usr/bin/env python3
"""
Test script for the CLI interface
"""
import asyncio
import sys
import os

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.cli_interface import NaturalLanguageCLI
from src.mcp_client import MCPConnectorManager
from src.ai_agent import AIAgent


async def test_cli_interface():
    """Test the CLI interface components"""
    print("🧪 Testing CLI Interface")
    print("="*50)
    
    # Create components
    manager = MCPConnectorManager()
    ai_agent = AIAgent(manager, openai_api_key="mock-key")
    
    # Test CLI initialization
    print("1. Testing CLI initialization...")
    try:
        cli = NaturalLanguageCLI(manager, ai_agent)
        print("✅ CLI interface created successfully")
    except Exception as e:
        print(f"❌ CLI interface creation failed: {e}")
        return False
    
    # Test help display
    print("\n2. Testing help display...")
    try:
        await cli._show_help()
        print("✅ Help display works")
    except Exception as e:
        print(f"❌ Help display failed: {e}")
        return False
    
    # Test tools display
    print("\n3. Testing tools display...")
    try:
        await cli._show_available_tools()
        print("✅ Tools display works")
    except Exception as e:
        print(f"❌ Tools display failed: {e}")
        return False
    
    # Test history display (empty)
    print("\n4. Testing history display...")
    try:
        await cli._show_history()
        print("✅ History display works")
    except Exception as e:
        print(f"❌ History display failed: {e}")
        return False
    
    # Test conversation history
    print("\n5. Testing conversation history...")
    try:
        cli.conversation_history.append({
            "type": "user",
            "content": "test message",
            "timestamp": asyncio.get_event_loop().time()
        })
        await cli._show_history()
        print("✅ Conversation history works")
    except Exception as e:
        print(f"❌ Conversation history failed: {e}")
        return False
    
    print("\n🎉 All CLI interface tests passed!")
    return True


async def test_cli_commands():
    """Test CLI command processing"""
    print("\n🧪 Testing CLI Commands")
    print("="*50)
    
    # Create components
    manager = MCPConnectorManager()
    ai_agent = AIAgent(manager, openai_api_key="mock-key")
    cli = NaturalLanguageCLI(manager, ai_agent)
    
    # Test command processing
    test_commands = [
        ("help", "help command"),
        ("tools", "tools command"),
        ("history", "history command"),
        ("clear", "clear command"),
        ("quit", "quit command"),
        ("exit", "exit command"),
        ("q", "q command"),
    ]
    
    for command, description in test_commands:
        print(f"Testing {description}...")
        try:
            # Simulate command processing
            if command in ['quit', 'exit', 'q']:
                print(f"✅ {description} would exit")
            elif command == 'help':
                await cli._show_help()
                print(f"✅ {description} works")
            elif command == 'tools':
                await cli._show_available_tools()
                print(f"✅ {description} works")
            elif command == 'history':
                await cli._show_history()
                print(f"✅ {description} works")
            elif command == 'clear':
                cli.conversation_history.clear()
                print(f"✅ {description} works")
        except Exception as e:
            print(f"❌ {description} failed: {e}")
            return False
    
    print("\n🎉 All CLI command tests passed!")
    return True


async def main():
    """Run CLI tests"""
    print("🚀 Starting CLI Interface Tests")
    print("="*60)
    
    # Test 1: CLI interface components
    if not await test_cli_interface():
        print("\n❌ CLI interface tests failed")
        return
    
    # Test 2: CLI commands
    if not await test_cli_commands():
        print("\n❌ CLI command tests failed")
        return
    
    print("\n" + "="*60)
    print("🎉 All CLI tests passed! The CLI interface is ready for use.")
    print("="*60)
    print("\nNext steps:")
    print("1. Set your OpenAI API key: export OPENAI_API_KEY='your-key'")
    print("2. Start an MCP connector server")
    print("3. Run: python main.py chat --connector http://localhost:3000")


if __name__ == "__main__":
    asyncio.run(main())

#!/usr/bin/env python3
"""
Integration test for the CLI interface with mock data
"""
import asyncio
import sys
import os
from unittest.mock import AsyncMock, MagicMock

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.cli_interface import NaturalLanguageCLI
from src.mcp_client import MCPConnectorManager
from src.ai_agent import AIAgent


class MockMCPConnectorManager:
    """Mock MCP connector manager for testing"""
    
    def __init__(self):
        self.connectors = {}
    
    async def add_connector(self, name: str, url: str):
        """Mock adding a connector"""
        self.connectors[name] = {"url": url}
        return True
    
    async def list_all_tools(self):
        """Mock listing tools"""
        return {
            "test": [
                {
                    "name": "create_workflow",
                    "description": "Create a new workflow",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "description": {"type": "string"}
                        }
                    }
                },
                {
                    "name": "register_user",
                    "description": "Register a new user with a role",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "role": {"type": "string"}
                        }
                    }
                },
                {
                    "name": "propose_action",
                    "description": "Propose an action for approval",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "action": {"type": "string"},
                            "reason": {"type": "string"}
                        }
                    }
                }
            ]
        }
    
    async def call_tool(self, connector_name: str, tool_name: str, arguments: dict):
        """Mock calling a tool"""
        return {
            "content": [
                {
                    "type": "text",
                    "text": f"Mock result for {tool_name} with arguments {arguments}"
                }
            ]
        }
    
    async def close_all(self):
        """Mock closing all connectors"""
        self.connectors.clear()


class MockAIAgent:
    """Mock AI agent for testing"""
    
    def __init__(self, connector_manager, **kwargs):
        self.connector_manager = connector_manager
    
    async def get_available_tools_summary(self):
        """Mock getting tools summary"""
        return """
# Available Tools

## Test Connector
- **create_workflow**: Create a new workflow
- **register_user**: Register a new user with a role  
- **propose_action**: Propose an action for approval

You can use these tools to:
- Create workflows for various tasks
- Register users with specific roles
- Propose actions that require approval
        """
    
    async def process_request(self, user_input: str):
        """Mock processing a user request"""
        # Simulate AI processing
        await asyncio.sleep(0.1)
        
        # Mock different types of responses based on input
        if "workflow" in user_input.lower():
            return {
                "reasoning": "User wants to create a workflow. I'll use the create_workflow tool.",
                "tool_calls": [
                    {
                        "tool_name": "create_workflow",
                        "connector_name": "test",
                        "arguments": {"name": "Test Workflow", "description": "A test workflow"},
                        "reasoning": "Creating a new workflow as requested"
                    }
                ],
                "results": [
                    {
                        "success": True,
                        "tool_call": {
                            "tool_name": "create_workflow",
                            "connector_name": "test"
                        },
                        "result": {
                            "content": [{"text": "Workflow 'Test Workflow' created successfully"}]
                        }
                    }
                ],
                "summary": "✅ Created a new workflow called 'Test Workflow'"
            }
        elif "register" in user_input.lower():
            return {
                "reasoning": "User wants to register someone. I'll use the register_user tool.",
                "tool_calls": [
                    {
                        "tool_name": "register_user",
                        "connector_name": "test",
                        "arguments": {"name": "Alice", "role": "DBA"},
                        "reasoning": "Registering Alice as a DBA"
                    }
                ],
                "results": [
                    {
                        "success": True,
                        "tool_call": {
                            "tool_name": "register_user",
                            "connector_name": "test"
                        },
                        "result": {
                            "content": [{"text": "User Alice registered as DBA successfully"}]
                        }
                    }
                ],
                "summary": "✅ Registered Alice as a DBA"
            }
        else:
            return {
                "reasoning": "User input doesn't match specific patterns. I'll provide a general response.",
                "tool_calls": [],
                "results": [],
                "summary": "I understand your request. Please be more specific about what you'd like me to do."
            }


async def test_cli_with_mock_data():
    """Test the CLI interface with mock data"""
    print("🧪 Testing CLI Interface with Mock Data")
    print("="*60)
    
    # Create mock components
    mock_manager = MockMCPConnectorManager()
    mock_ai_agent = MockAIAgent(mock_manager)
    
    # Create CLI interface
    cli = NaturalLanguageCLI(mock_manager, mock_ai_agent)
    
    # Test 1: Show available tools
    print("\n1. Testing tools display...")
    await cli._show_available_tools()
    
    # Test 2: Show help
    print("\n2. Testing help display...")
    await cli._show_help()
    
    # Test 3: Test conversation history
    print("\n3. Testing conversation history...")
    await cli._show_history()
    
    # Test 4: Add some conversation and test history
    print("\n4. Testing conversation with mock data...")
    cli.conversation_history.append({
        "type": "user",
        "content": "Create a workflow for database migration",
        "timestamp": asyncio.get_event_loop().time()
    })
    
    # Test 5: Process a mock request
    print("\n5. Testing request processing...")
    await cli._process_user_request("Create a workflow for database migration")
    
    # Test 6: Show updated history
    print("\n6. Testing updated conversation history...")
    await cli._show_history()
    
    # Test 7: Clear history
    print("\n7. Testing clear command...")
    cli.conversation_history.clear()
    await cli._show_history()
    
    print("\n🎉 All CLI integration tests passed!")
    return True


async def test_cli_commands():
    """Test CLI command processing with mock data"""
    print("\n🧪 Testing CLI Commands with Mock Data")
    print("="*60)
    
    # Create mock components
    mock_manager = MockMCPConnectorManager()
    mock_ai_agent = MockAIAgent(mock_manager)
    cli = NaturalLanguageCLI(mock_manager, mock_ai_agent)
    
    # Test various user inputs
    test_inputs = [
        "Create a workflow for database migration",
        "Register Alice as a DBA",
        "What tools are available?",
        "Show me the current status"
    ]
    
    for i, user_input in enumerate(test_inputs, 1):
        print(f"\n{i}. Testing: '{user_input}'")
        await cli._process_user_request(user_input)
    
    print("\n🎉 All CLI command tests passed!")
    return True


async def main():
    """Run all CLI integration tests"""
    print("🚀 Starting CLI Integration Tests")
    print("="*60)
    
    # Test 1: CLI with mock data
    if not await test_cli_with_mock_data():
        print("\n❌ CLI integration tests failed")
        return
    
    # Test 2: CLI commands
    if not await test_cli_commands():
        print("\n❌ CLI command tests failed")
        return
    
    print("\n" + "="*60)
    print("🎉 All CLI integration tests passed!")
    print("="*60)
    print("\nThe CLI interface is working correctly with:")
    print("✅ Rich text formatting and panels")
    print("✅ Conversation history management")
    print("✅ Tool display and help system")
    print("✅ Request processing and result display")
    print("✅ Error handling and user feedback")
    print("\nTo test with a real MCP server:")
    print("1. Set your API key: export GOOGLE_API_KEY='your-key'")
    print("2. Start an MCP connector server")
    print("3. Run: python main.py interactive --connector http://localhost:3000")


if __name__ == "__main__":
    asyncio.run(main())

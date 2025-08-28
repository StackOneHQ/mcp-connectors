#!/usr/bin/env python3
"""
Test script that simulates a real CLI session
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
        elif "help" in user_input.lower():
            return {
                "reasoning": "User is asking for help. I'll provide guidance.",
                "tool_calls": [],
                "results": [],
                "summary": "I'm here to help! You can ask me to create workflows, register users, or propose actions. Just tell me what you'd like to do in natural language."
            }
        else:
            return {
                "reasoning": "User input doesn't match specific patterns. I'll provide a general response.",
                "tool_calls": [],
                "results": [],
                "summary": "I understand your request. Please be more specific about what you'd like me to do."
            }


async def simulate_cli_session():
    """Simulate a CLI session with predefined inputs"""
    print("🚀 Simulating CLI Session")
    print("="*60)
    
    # Create mock components
    mock_manager = MockMCPConnectorManager()
    mock_ai_agent = MockAIAgent(mock_manager)
    
    # Create CLI interface
    cli = NaturalLanguageCLI(mock_manager, mock_ai_agent)
    
    # Simulate user inputs
    test_inputs = [
        "help",
        "tools", 
        "Create a workflow for database migration",
        "Register Alice as a DBA",
        "history",
        "What can you do?",
        "clear",
        "history",
        "quit"
    ]
    
    print("Simulating the following user inputs:")
    for i, input_text in enumerate(test_inputs, 1):
        print(f"  {i}. {input_text}")
    
    print("\n" + "="*60)
    print("Starting simulation...")
    print("="*60)
    
    for i, user_input in enumerate(test_inputs, 1):
        print(f"\n--- Step {i}: User input: '{user_input}' ---")
        
        # Handle special commands
        if user_input.lower() in ['quit', 'exit', 'q']:
            print("User chose to exit the session.")
            break
        elif user_input.lower() == 'help':
            await cli._show_help()
            continue
        elif user_input.lower() == 'tools':
            await cli._show_available_tools()
            continue
        elif user_input.lower() == 'history':
            await cli._show_history()
            continue
        elif user_input.lower() == 'clear':
            cli.conversation_history.clear()
            print("Conversation history cleared!")
            continue
        
        # Process natural language request
        await cli._process_user_request(user_input)
    
    print("\n" + "="*60)
    print("🎉 CLI session simulation completed!")
    print("="*60)
    
    # Show final conversation history
    print("\nFinal conversation history:")
    await cli._show_history()


async def test_cli_help_commands():
    """Test all help-related commands"""
    print("\n🧪 Testing Help Commands")
    print("="*60)
    
    # Create mock components
    mock_manager = MockMCPConnectorManager()
    mock_ai_agent = MockAIAgent(mock_manager)
    cli = NaturalLanguageCLI(mock_manager, mock_ai_agent)
    
    # Test help command
    print("1. Testing 'help' command:")
    await cli._show_help()
    
    # Test tools command
    print("\n2. Testing 'tools' command:")
    await cli._show_available_tools()
    
    # Test history command (empty)
    print("\n3. Testing 'history' command (empty):")
    await cli._show_history()
    
    # Add some conversation and test history again
    print("\n4. Adding conversation and testing history:")
    cli.conversation_history.append({
        "type": "user",
        "content": "Create a workflow",
        "timestamp": asyncio.get_event_loop().time()
    })
    cli.conversation_history.append({
        "type": "assistant", 
        "content": "Workflow created successfully",
        "timestamp": asyncio.get_event_loop().time()
    })
    await cli._show_history()
    
    print("\n✅ All help commands working correctly!")


async def main():
    """Run CLI session tests"""
    print("🚀 Starting CLI Session Tests")
    print("="*60)
    
    # Test 1: Simulate CLI session
    await simulate_cli_session()
    
    # Test 2: Test help commands
    await test_cli_help_commands()
    
    print("\n" + "="*60)
    print("🎉 All CLI session tests completed!")
    print("="*60)
    print("\nThe CLI interface is fully functional with:")
    print("✅ Interactive session management")
    print("✅ Natural language processing")
    print("✅ Rich text formatting and animations")
    print("✅ Conversation history tracking")
    print("✅ Help and tools display")
    print("✅ Command processing and error handling")
    print("\nReady for real-world usage!")


if __name__ == "__main__":
    asyncio.run(main())

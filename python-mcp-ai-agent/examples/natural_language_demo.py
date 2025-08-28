#!/usr/bin/env python3
"""
Demo script showing the natural language interface capabilities
"""
import asyncio
import os
import sys

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.cli_interface import run_interactive_cli


def main():
    """Main entry point for the natural language demo"""
    print("🚀 MCP AI Agent - Natural Language Interface Demo")
    print("="*60)
    
    # Check if MCP connector is running
    import requests
    try:
        response = requests.get("http://localhost:3000/mcp", timeout=5)
        print("✅ MCP connector server is running")
    except:
        print("❌ MCP connector server is not running")
        print("Please start it with: bun start --connector workflow-orchestration")
        return
    
    # Check for API key
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        print("❌ OPENAI_API_KEY environment variable not set")
        print("Please set it with: export OPENAI_API_KEY='your-api-key'")
        return
    
    print("✅ OpenAI API key found")
    print("\nStarting natural language interface...")
    print("You can now type natural language commands like:")
    print("- 'Create a new workflow for database migration'")
    print("- 'Register Alice as a DBA'")
    print("- 'Propose an action to update the database schema'")
    print("- 'Review and approve all pending proposals'")
    print("- 'Execute the approved actions'")
    print("- 'Show me the audit log'")
    print("\nType 'help' for more commands, or 'quit' to exit.")
    print("="*60)
    
    # Run the interactive CLI
    asyncio.run(run_interactive_cli(
        connector_url="http://localhost:3000",
        openai_key=openai_key,
        connector_name="workflow"
    ))


if __name__ == "__main__":
    main()

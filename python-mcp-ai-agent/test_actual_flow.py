#!/usr/bin/env python3
"""
Test the actual flow of the AI agent without demos
Focuses on core functionality: tool discovery, natural language processing, and tool execution
"""
import asyncio
import json
import logging
import os
import sys
from typing import Dict, Any, List
from pathlib import Path

# Add the src directory to the path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from src.mcp_client import MCPConnectorManager
from src.ai_agent import AIAgent

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Rich console
console = Console()

class ActualFlowTester:
    """Tester for the actual flow without demos"""
    
    def __init__(self, connector_url: str = "http://localhost:3000"):
        self.connector_url = connector_url
        self.connector_manager = None
        self.ai_agent = None
        self.test_results = []
        
    async def setup(self):
        """Set up the test environment"""
        console.print(Panel.fit(
            "[bold blue]Setting up Actual Flow Test[/bold blue]\n"
            "Initializing MCP connector and AI agent...",
            title="🔧 Setup"
        ))
        
        # Initialize connector manager
        self.connector_manager = MCPConnectorManager()
        
        # Add connector
        await self.connector_manager.add_connector("test_connector", self.connector_url)
        
        # Get API keys from environment
        gemini_key = os.getenv("GOOGLE_API_KEY")
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        
        if not gemini_key and not anthropic_key:
            console.print("[yellow]Warning: No AI API keys found. Test will use mock responses.[/yellow]")
            # Create a simple mock AI agent for testing
            self.ai_agent = MockAIAgent(self.connector_manager)
        else:
            # Initialize real AI agent
            self.ai_agent = AIAgent(
                connector_manager=self.connector_manager,
                gemini_api_key=gemini_key,
                anthropic_api_key=anthropic_key
            )
        
        console.print("[green]✓ Setup complete![/green]")
    
    async def test_tool_discovery(self):
        """Test tool discovery and listing"""
        console.print(Panel.fit(
            "[bold blue]Testing Tool Discovery[/bold blue]\n"
            "Discovering available tools from MCP connector...",
            title="🔍 Tool Discovery"
        ))
        
        try:
            tools = await self.connector_manager.list_all_tools()
            
            if not tools:
                console.print("[red]✗ No tools found![/red]")
                return False
            
            # Display tools in a table
            table = Table(title="Available Tools")
            table.add_column("Connector", style="cyan")
            table.add_column("Tool Name", style="green")
            table.add_column("Description", style="white")
            
            total_tools = 0
            for connector_name, connector_tools in tools.items():
                for tool in connector_tools:
                    table.add_row(
                        connector_name,
                        tool.get("name", "Unknown"),
                        tool.get("description", "No description")
                    )
                    total_tools += 1
            
            console.print(table)
            console.print(f"[green]✓ Found {total_tools} tools across {len(tools)} connectors[/green]")
            
            self.test_results.append({
                "test": "tool_discovery",
                "status": "passed",
                "tools_found": total_tools,
                "connectors": len(tools)
            })
            
            return True
            
        except Exception as e:
            console.print(f"[red]✗ Tool discovery failed: {e}[/red]")
            self.test_results.append({
                "test": "tool_discovery",
                "status": "failed",
                "error": str(e)
            })
            return False
    
    async def test_simple_tool_call(self):
        """Test a simple tool call to verify basic functionality"""
        console.print(Panel.fit(
            "[bold blue]Testing Simple Tool Call[/bold blue]\n"
            "Testing basic tool calling functionality...",
            title="🔧 Simple Tool Call"
        ))
        
        try:
            # Get available tools
            tools = await self.connector_manager.list_all_tools()
            
            if not tools:
                console.print("[red]✗ No tools available for testing[/red]")
                return False
            
            # Find a simple tool to test
            test_tool = None
            test_connector = None
            
            for connector_name, connector_tools in tools.items():
                for tool in connector_tools:
                    # Look for a simple tool that doesn't require complex arguments
                    if tool.get("name") in ["test", "ping", "health", "status"]:
                        test_tool = tool
                        test_connector = connector_name
                        break
                if test_tool:
                    break
            
            if not test_tool:
                # If no simple tool found, use the first available tool
                for connector_name, connector_tools in tools.items():
                    if connector_tools:
                        test_tool = connector_tools[0]
                        test_connector = connector_name
                        break
            
            if not test_tool:
                console.print("[red]✗ No suitable tool found for testing[/red]")
                return False
            
            console.print(f"Testing tool: {test_tool.get('name')} from {test_connector}")
            
            # Try to call the tool with minimal arguments
            result = await self.connector_manager.call_tool_on_connector(
                test_connector,
                test_tool.get("name"),
                {}  # Empty arguments
            )
            
            if result.error:
                console.print(f"[yellow]Tool call completed with error: {result.error}[/yellow]")
                # This might be expected if the tool requires arguments
                self.test_results.append({
                    "test": "simple_tool_call",
                    "status": "partial",
                    "tool": test_tool.get("name"),
                    "error": result.error
                })
            else:
                console.print(f"[green]✓ Tool call successful![/green]")
                console.print(f"Result: {result.content}")
                self.test_results.append({
                    "test": "simple_tool_call",
                    "status": "passed",
                    "tool": test_tool.get("name"),
                    "result": result.content
                })
            
            return True
            
        except Exception as e:
            console.print(f"[red]✗ Simple tool call failed: {e}[/red]")
            self.test_results.append({
                "test": "simple_tool_call",
                "status": "failed",
                "error": str(e)
            })
            return False
    
    async def test_ai_agent_processing(self):
        """Test the AI agent's natural language processing"""
        console.print(Panel.fit(
            "[bold blue]Testing AI Agent Processing[/bold blue]\n"
            "Testing AI agent's ability to process natural language requests...",
            title="🧠 AI Agent Processing"
        ))
        
        # Simple test queries that should work with most connectors
        test_queries = [
            "What tools are available?",
            "Show me the status",
            "List all available functions"
        ]
        
        results = []
        
        for i, query in enumerate(test_queries, 1):
            console.print(f"\n[bold]Test {i}:[/bold] {query}")
            
            try:
                result = await self.ai_agent.process_request(query)
                
                if result.get("success"):
                    console.print(f"[green]✓ Success[/green]")
                    console.print(f"Reasoning: {result.get('reasoning', 'N/A')}")
                    console.print(f"Tool calls: {len(result.get('tool_calls', []))}")
                    console.print(f"Summary: {result.get('summary', 'N/A')[:100]}...")
                    
                    results.append({
                        "query": query,
                        "status": "success",
                        "tool_calls": len(result.get('tool_calls', [])),
                        "reasoning": result.get('reasoning', ''),
                        "summary": result.get('summary', '')
                    })
                else:
                    console.print(f"[red]✗ Failed[/red]")
                    results.append({
                        "query": query,
                        "status": "failed",
                        "error": result.get('error', 'Unknown error')
                    })
                    
            except Exception as e:
                console.print(f"[red]✗ Error: {e}[/red]")
                results.append({
                    "query": query,
                    "status": "error",
                    "error": str(e)
                })
        
        # Summary
        successful_queries = sum(1 for r in results if r["status"] == "success")
        console.print(f"\n[bold]AI Agent Processing Results:[/bold]")
        console.print(f"Successful queries: {successful_queries}/{len(test_queries)}")
        
        self.test_results.append({
            "test": "ai_agent_processing",
            "status": "passed" if successful_queries == len(test_queries) else "partial",
            "successful_queries": successful_queries,
            "total_queries": len(test_queries),
            "results": results
        })
        
        return successful_queries > 0
    
    async def test_end_to_end_flow(self):
        """Test the complete end-to-end flow"""
        console.print(Panel.fit(
            "[bold blue]Testing End-to-End Flow[/bold blue]\n"
            "Testing the complete flow from natural language to tool execution...",
            title="🔄 End-to-End Flow"
        ))
        
        try:
            # Test a simple end-to-end flow
            query = "What can you do?"
            
            console.print(f"Processing query: {query}")
            
            result = await self.ai_agent.process_request(query)
            
            if result.get("success"):
                console.print(f"[green]✓ End-to-end flow successful![/green]")
                console.print(f"Reasoning: {result.get('reasoning', 'N/A')}")
                console.print(f"Tool calls executed: {len(result.get('tool_calls', []))}")
                console.print(f"Final summary: {result.get('summary', 'N/A')}")
                
                self.test_results.append({
                    "test": "end_to_end_flow",
                    "status": "passed",
                    "query": query,
                    "tool_calls": len(result.get('tool_calls', [])),
                    "reasoning": result.get('reasoning', ''),
                    "summary": result.get('summary', '')
                })
                
                return True
            else:
                console.print(f"[red]✗ End-to-end flow failed[/red]")
                self.test_results.append({
                    "test": "end_to_end_flow",
                    "status": "failed",
                    "query": query,
                    "error": result.get('error', 'Unknown error')
                })
                return False
                
        except Exception as e:
            console.print(f"[red]✗ End-to-end flow error: {e}[/red]")
            self.test_results.append({
                "test": "end_to_end_flow",
                "status": "failed",
                "error": str(e)
            })
            return False
    
    async def cleanup(self):
        """Clean up resources"""
        if self.connector_manager:
            await self.connector_manager.close_all()
    
    def print_summary(self):
        """Print test summary"""
        console.print(Panel.fit(
            "[bold blue]Test Summary[/bold blue]",
            title="📊 Results"
        ))
        
        table = Table(title="Test Results")
        table.add_column("Test", style="cyan")
        table.add_column("Status", style="green")
        table.add_column("Details", style="white")
        
        for result in self.test_results:
            status_style = "green" if result["status"] == "passed" else "yellow" if result["status"] == "partial" else "red"
            status_text = f"[{status_style}]{result['status'].upper()}[/{status_style}]"
            
            details = ""
            if result["status"] == "passed":
                if "tools_found" in result:
                    details = f"Found {result['tools_found']} tools"
                elif "tool_calls" in result:
                    details = f"Executed {result['tool_calls']} tool calls"
                elif "successful_queries" in result:
                    details = f"{result['successful_queries']}/{result['total_queries']} queries successful"
            elif result["status"] == "partial":
                if "error" in result:
                    details = f"Partial success: {result['error']}"
                elif "successful_queries" in result:
                    details = f"{result['successful_queries']}/{result['total_queries']} queries successful"
            else:
                details = result.get("error", "Unknown error")
            
            table.add_row(result["test"], status_text, details)
        
        console.print(table)
        
        # Overall status
        passed_tests = sum(1 for r in self.test_results if r["status"] == "passed")
        total_tests = len(self.test_results)
        
        if passed_tests == total_tests:
            console.print(f"\n[bold green]🎉 All tests passed! ({passed_tests}/{total_tests})[/bold green]")
        elif passed_tests > 0:
            console.print(f"\n[bold yellow]⚠️  Some tests passed ({passed_tests}/{total_tests})[/bold yellow]")
        else:
            console.print(f"\n[bold red]❌ No tests passed ({passed_tests}/{total_tests})[/bold red]")


class MockAIAgent:
    """Mock AI agent for testing without API keys"""
    
    def __init__(self, connector_manager: MCPConnectorManager):
        self.connector_manager = connector_manager
    
    async def process_request(self, user_query: str) -> Dict[str, Any]:
        """Mock implementation that returns a simple response"""
        return {
            "success": True,
            "reasoning": "Mock AI agent processing",
            "tool_calls": [],
            "results": [],
            "summary": f"Mock response to: {user_query}"
        }


async def main():
    """Main test function"""
    console.print(Panel.fit(
        "[bold blue]MCP AI Agent - Actual Flow Test[/bold blue]\n"
        "Testing the core functionality without demos",
        title="🧪 Actual Flow Test"
    ))
    
    # Get connector URL from command line or use default
    connector_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"
    
    tester = ActualFlowTester(connector_url)
    
    try:
        # Run tests
        await tester.setup()
        
        # Test tool discovery
        await tester.test_tool_discovery()
        
        # Test simple tool call
        await tester.test_simple_tool_call()
        
        # Test AI agent processing
        await tester.test_ai_agent_processing()
        
        # Test end-to-end flow
        await tester.test_end_to_end_flow()
        
        # Print summary
        tester.print_summary()
        
    except Exception as e:
        console.print(f"[red]Test failed with error: {e}[/red]")
    finally:
        await tester.cleanup()


if __name__ == "__main__":
    asyncio.run(main())


#!/usr/bin/env python3
"""
Full Flow Test for MCP AI Agent
Tests the complete end-to-end functionality from natural language input to result summarization
"""
import asyncio
import json
import logging
import os
import sys
import time
from typing import Dict, Any, List
from pathlib import Path

# Add the src directory to the path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.prompt import Confirm
from rich.text import Text

from src.mcp_client import MCPConnectorManager
from src.ai_agent import AIAgent

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Rich console
console = Console()

class FullFlowTester:
    """Comprehensive tester for the full MCP AI Agent flow"""
    
    def __init__(self, connector_url: str = "http://localhost:3000"):
        self.connector_url = connector_url
        self.connector_manager = None
        self.ai_agent = None
        self.test_results = []
        
    async def setup(self):
        """Set up the test environment"""
        console.print(Panel.fit(
            "[bold blue]Setting up Full Flow Test[/bold blue]\n"
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
            console.print("[yellow]Warning: No AI API keys found. Using mock AI responses for testing.[/yellow]")
            # We'll use a mock AI agent for testing
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
    
    async def test_natural_language_processing(self):
        """Test natural language processing with various queries"""
        console.print(Panel.fit(
            "[bold blue]Testing Natural Language Processing[/bold blue]\n"
            "Testing AI agent's ability to understand and process natural language queries...",
            title="🧠 Natural Language Processing"
        ))
        
        test_queries = [
            "Register a new actor named Alice with the role of DevOps Engineer",
            "Start a new workflow for database migration",
            "Propose an action to update the database schema",
            "Review all pending proposals and approve them",
            "Execute the approved actions and show me the audit log"
        ]
        
        results = []
        
        for i, query in enumerate(test_queries, 1):
            console.print(f"\n[bold]Test {i}:[/bold] {query}")
            
            try:
                with Progress(
                    SpinnerColumn(),
                    TextColumn("[progress.description]{task.description}"),
                    console=console
                ) as progress:
                    task = progress.add_task("Processing query...", total=None)
                    
                    result = await self.ai_agent.process_request(query)
                    
                    progress.update(task, description="Query processed successfully")
                
                # Display results
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
        console.print(f"\n[bold]Natural Language Processing Results:[/bold]")
        console.print(f"Successful queries: {successful_queries}/{len(test_queries)}")
        
        self.test_results.append({
            "test": "natural_language_processing",
            "status": "passed" if successful_queries == len(test_queries) else "partial",
            "successful_queries": successful_queries,
            "total_queries": len(test_queries),
            "results": results
        })
        
        return successful_queries > 0
    
    async def test_workflow_orchestration(self):
        """Test complete workflow orchestration"""
        console.print(Panel.fit(
            "[bold blue]Testing Workflow Orchestration[/bold blue]\n"
            "Testing complete workflow from registration to execution...",
            title="🔄 Workflow Orchestration"
        ))
        
        workflow_steps = [
            "Register a new actor named Bob with the role of Database Administrator",
            "Start a new workflow titled 'Production Database Migration'",
            "Propose an action to create a database backup before migration",
            "Review and approve the backup proposal",
            "Execute the approved backup action",
            "Get the audit log for the workflow"
        ]
        
        console.print("[bold]Executing complete workflow:[/bold]")
        
        workflow_results = []
        
        for i, step in enumerate(workflow_steps, 1):
            console.print(f"\n[bold]Step {i}:[/bold] {step}")
            
            try:
                with Progress(
                    SpinnerColumn(),
                    TextColumn("[progress.description]{task.description}"),
                    console=console
                ) as progress:
                    task = progress.add_task(f"Executing step {i}...", total=None)
                    
                    result = await self.ai_agent.process_request(step)
                    
                    progress.update(task, description=f"Step {i} completed")
                
                if result.get("success"):
                    console.print(f"[green]✓ Step {i} successful[/green]")
                    workflow_results.append({
                        "step": i,
                        "query": step,
                        "status": "success",
                        "tool_calls": len(result.get('tool_calls', [])),
                        "summary": result.get('summary', '')[:100] + "..."
                    })
                else:
                    console.print(f"[red]✗ Step {i} failed[/red]")
                    workflow_results.append({
                        "step": i,
                        "query": step,
                        "status": "failed",
                        "error": result.get('error', 'Unknown error')
                    })
                    
            except Exception as e:
                console.print(f"[red]✗ Step {i} error: {e}[/red]")
                workflow_results.append({
                    "step": i,
                    "query": step,
                    "status": "error",
                    "error": str(e)
                })
        
        # Workflow summary
        successful_steps = sum(1 for r in workflow_results if r["status"] == "success")
        console.print(f"\n[bold]Workflow Orchestration Results:[/bold]")
        console.print(f"Successful steps: {successful_steps}/{len(workflow_steps)}")
        
        if successful_steps == len(workflow_steps):
            console.print("[green]✓ Complete workflow executed successfully![/green]")
        elif successful_steps > 0:
            console.print("[yellow]⚠ Partial workflow execution[/yellow]")
        else:
            console.print("[red]✗ Workflow execution failed[/red]")
        
        self.test_results.append({
            "test": "workflow_orchestration",
            "status": "passed" if successful_steps == len(workflow_steps) else "partial",
            "successful_steps": successful_steps,
            "total_steps": len(workflow_steps),
            "results": workflow_results
        })
        
        return successful_steps > 0
    
    async def test_error_handling(self):
        """Test error handling with invalid requests"""
        console.print(Panel.fit(
            "[bold blue]Testing Error Handling[/bold blue]\n"
            "Testing system's ability to handle invalid requests gracefully...",
            title="⚠️ Error Handling"
        ))
        
        invalid_queries = [
            "Do something completely unrelated to the available tools",
            "Execute a tool that doesn't exist",
            "Call a tool with invalid parameters",
            "This is not a valid request at all"
        ]
        
        error_results = []
        
        for i, query in enumerate(invalid_queries, 1):
            console.print(f"\n[bold]Error Test {i}:[/bold] {query}")
            
            try:
                result = await self.ai_agent.process_request(query)
                
                # For invalid queries, we expect either no tool calls or graceful handling
                if result.get("success"):
                    tool_calls = len(result.get('tool_calls', []))
                    if tool_calls == 0:
                        console.print(f"[green]✓ Gracefully handled invalid query (no tool calls)[/green]")
                        error_results.append({
                            "query": query,
                            "status": "handled_gracefully",
                            "tool_calls": 0
                        })
                    else:
                        console.print(f"[yellow]⚠ Query resulted in {tool_calls} tool calls[/yellow]")
                        error_results.append({
                            "query": query,
                            "status": "unexpected_tool_calls",
                            "tool_calls": tool_calls
                        })
                else:
                    console.print(f"[green]✓ Error handled gracefully[/green]")
                    error_results.append({
                        "query": query,
                        "status": "error_handled",
                        "error": result.get('error', 'Unknown error')
                    })
                    
            except Exception as e:
                console.print(f"[red]✗ Unexpected error: {e}[/red]")
                error_results.append({
                    "query": query,
                    "status": "unexpected_error",
                    "error": str(e)
                })
        
        # Error handling summary
        graceful_handling = sum(1 for r in error_results if "handled" in r["status"])
        console.print(f"\n[bold]Error Handling Results:[/bold]")
        console.print(f"Gracefully handled: {graceful_handling}/{len(invalid_queries)}")
        
        self.test_results.append({
            "test": "error_handling",
            "status": "passed" if graceful_handling == len(invalid_queries) else "partial",
            "graceful_handling": graceful_handling,
            "total_queries": len(invalid_queries),
            "results": error_results
        })
        
        return graceful_handling > 0
    
    def display_final_results(self):
        """Display comprehensive test results"""
        console.print(Panel.fit(
            "[bold blue]Full Flow Test Results[/bold blue]",
            title="📊 Final Results"
        ))
        
        # Create results table
        table = Table(title="Test Results Summary")
        table.add_column("Test", style="cyan")
        table.add_column("Status", style="green")
        table.add_column("Details", style="white")
        
        total_tests = len(self.test_results)
        passed_tests = 0
        
        for result in self.test_results:
            test_name = result["test"].replace("_", " ").title()
            status = result["status"]
            
            if status == "passed":
                status_text = "[green]✓ PASSED[/green]"
                passed_tests += 1
            elif status == "partial":
                status_text = "[yellow]⚠ PARTIAL[/yellow]"
            else:
                status_text = "[red]✗ FAILED[/red]"
            
            # Add details based on test type
            details = ""
            if result["test"] == "tool_discovery":
                details = f"Found {result.get('tools_found', 0)} tools"
            elif result["test"] == "natural_language_processing":
                details = f"{result.get('successful_queries', 0)}/{result.get('total_queries', 0)} queries successful"
            elif result["test"] == "workflow_orchestration":
                details = f"{result.get('successful_steps', 0)}/{result.get('total_steps', 0)} steps successful"
            elif result["test"] == "error_handling":
                details = f"{result.get('graceful_handling', 0)}/{result.get('total_queries', 0)} errors handled gracefully"
            
            table.add_row(test_name, status_text, details)
        
        console.print(table)
        
        # Overall summary
        success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        
        if success_rate == 100:
            console.print(Panel.fit(
                "[bold green]🎉 ALL TESTS PASSED![/bold green]\n"
                "The MCP AI Agent is working perfectly!",
                title="✅ Success"
            ))
        elif success_rate >= 75:
            console.print(Panel.fit(
                "[bold yellow]⚠ MOST TESTS PASSED[/bold yellow]\n"
                f"Success rate: {success_rate:.1f}%\n"
                "Some minor issues detected but system is functional.",
                title="⚠️ Partial Success"
            ))
        else:
            console.print(Panel.fit(
                "[bold red]✗ TESTS FAILED[/bold red]\n"
                f"Success rate: {success_rate:.1f}%\n"
                "Significant issues detected.",
                title="❌ Issues Found"
            ))
        
        return success_rate >= 75
    
    async def cleanup(self):
        """Clean up resources"""
        if self.connector_manager:
            await self.connector_manager.close_all()
        console.print("[green]✓ Cleanup complete[/green]")
    
    async def run_full_test(self):
        """Run the complete full flow test"""
        console.print(Panel.fit(
            "[bold blue]MCP AI Agent - Full Flow Test[/bold blue]\n"
            "Testing complete end-to-end functionality\n"
            f"Connector URL: {self.connector_url}",
            title="🧪 Full Flow Test"
        ))
        
        try:
            # Setup
            await self.setup()
            
            # Run tests
            await self.test_tool_discovery()
            await self.test_natural_language_processing()
            await self.test_workflow_orchestration()
            await self.test_error_handling()
            
            # Display results
            success = self.display_final_results()
            
            return success
            
        finally:
            await self.cleanup()


class MockAIAgent:
    """Mock AI agent for testing when no API keys are available"""
    
    def __init__(self, connector_manager: MCPConnectorManager):
        self.connector_manager = connector_manager
    
    async def process_request(self, user_query: str) -> Dict[str, Any]:
        """Mock AI processing that uses keyword matching"""
        
        # Simple keyword-based tool selection
        query_lower = user_query.lower()
        import re
        
        if "register" in query_lower and "actor" in query_lower:
            # Extract name and role from query
            name = "TestActor"
            role = "TestRole"
            
            # Try to extract actual name and role
            import re
            name_match = re.search(r'named\s+(\w+)', query_lower)
            role_match = re.search(r'role\s+of\s+([^,\s]+(?:\s+[^,\s]+)*)', query_lower)
            
            if name_match:
                name = name_match.group(1)
            if role_match:
                role = role_match.group(1)
            
            return {
                "success": True,
                "reasoning": f"User wants to register an actor named {name} with role {role}",
                "tool_calls": [{
                    "connector_name": "test_connector",
                    "tool_name": "register_actor",
                    "arguments": {"name": name, "role": role},
                    "reasoning": f"Registering actor {name} with role {role}"
                }],
                "results": [{
                    "tool_call": {"tool_name": "register_actor"},
                    "success": True,
                    "result": type('MockResult', (), {'content': [{'text': f'Actor {name} registered successfully'}]})(),
                    "error": None
                }],
                "summary": f"Successfully registered actor {name} with role {role}."
            }
        
        elif "start" in query_lower and "workflow" in query_lower:
            # Extract title from query
            title = "Test Workflow"
            title_match = re.search(r'titled\s+[\'"]([^\'"]+)[\'"]', query_lower)
            if title_match:
                title = title_match.group(1)
            
            return {
                "success": True,
                "reasoning": f"User wants to start a workflow titled '{title}'",
                "tool_calls": [{
                    "connector_name": "test_connector",
                    "tool_name": "start_workflow",
                    "arguments": {"title": title},
                    "reasoning": f"Starting workflow with title '{title}'"
                }],
                "results": [{
                    "tool_call": {"tool_name": "start_workflow"},
                    "success": True,
                    "result": type('MockResult', (), {'content': [{'text': f'Workflow "{title}" started successfully'}]})(),
                    "error": None
                }],
                "summary": f"Successfully started workflow '{title}'."
            }
        
        elif "propose" in query_lower and "action" in query_lower:
            return {
                "success": True,
                "reasoning": "User wants to propose an action",
                "tool_calls": [{
                    "connector_name": "test_connector",
                    "tool_name": "propose_action",
                    "arguments": {
                        "workflow_id": "workflow_1",
                        "tool": "backup_database",
                        "params": {"database": "production"},
                        "reason": "Database backup before migration"
                    },
                    "reasoning": "Proposing database backup action"
                }],
                "results": [{
                    "tool_call": {"tool_name": "propose_action"},
                    "success": True,
                    "result": type('MockResult', (), {'content': [{'text': 'Action proposed successfully'}]})(),
                    "error": None
                }],
                "summary": "Successfully proposed database backup action."
            }
        
        elif "review" in query_lower and "proposal" in query_lower:
            return {
                "success": True,
                "reasoning": "User wants to review proposals",
                "tool_calls": [{
                    "connector_name": "test_connector",
                    "tool_name": "review_action",
                    "arguments": {
                        "proposal_id": "proposal_1",
                        "decision": "approve"
                    },
                    "reasoning": "Reviewing and approving proposal"
                }],
                "results": [{
                    "tool_call": {"tool_name": "review_action"},
                    "success": True,
                    "result": type('MockResult', (), {'content': [{'text': 'Proposal approved successfully'}]})(),
                    "error": None
                }],
                "summary": "Successfully reviewed and approved the proposal."
            }
        
        elif "execute" in query_lower and "action" in query_lower:
            return {
                "success": True,
                "reasoning": "User wants to execute an action",
                "tool_calls": [{
                    "connector_name": "test_connector",
                    "tool_name": "execute_action",
                    "arguments": {"proposal_id": "proposal_1"},
                    "reasoning": "Executing approved action"
                }],
                "results": [{
                    "tool_call": {"tool_name": "execute_action"},
                    "success": True,
                    "result": type('MockResult', (), {'content': [{'text': 'Action executed successfully'}]})(),
                    "error": None
                }],
                "summary": "Successfully executed the approved action."
            }
        
        elif "audit" in query_lower and "log" in query_lower:
            return {
                "success": True,
                "reasoning": "User wants to get the audit log",
                "tool_calls": [{
                    "connector_name": "test_connector",
                    "tool_name": "get_audit_log",
                    "arguments": {"workflow_id": "workflow_1"},
                    "reasoning": "Retrieving audit log for workflow"
                }],
                "results": [{
                    "tool_call": {"tool_name": "get_audit_log"},
                    "success": True,
                    "result": type('MockResult', (), {'content': [{'text': 'Audit log retrieved successfully'}]})(),
                    "error": None
                }],
                "summary": "Successfully retrieved the audit log."
            }
        
        else:
            # No matching tools found
            return {
                "success": True,
                "reasoning": "No specific tools needed for this request",
                "tool_calls": [],
                "results": [],
                "summary": "I understand your request, but no specific tools are needed to complete it."
            }


async def main():
    """Main function to run the full flow test"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Full Flow Test for MCP AI Agent")
    parser.add_argument(
        "--connector-url",
        default="http://localhost:3000",
        help="URL of the MCP connector to test against"
    )
    parser.add_argument(
        "--start-server",
        action="store_true",
        help="Start the test server before running tests"
    )
    
    args = parser.parse_args()
    
    # Start test server if requested
    if args.start_server:
        console.print("[yellow]Starting test server...[/yellow]")
        import subprocess
        import time
        
        # Start the test server in the background
        server_process = subprocess.Popen([
            sys.executable, "test_server.py"
        ])
        
        # Wait for server to start
        time.sleep(3)
        console.print("[green]✓ Test server started[/green]")
    
    # Run the full flow test
    tester = FullFlowTester(args.connector_url)
    success = await tester.run_full_test()
    
    # Clean up server if we started it
    if args.start_server:
        console.print("[yellow]Stopping test server...[/yellow]")
        server_process.terminate()
        server_process.wait()
        console.print("[green]✓ Test server stopped[/green]")
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())

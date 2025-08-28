#!/usr/bin/env python3
"""
Test complex flow with actual tool usage
"""
import asyncio
import sys
from pathlib import Path

# Add the src directory to the path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from rich.console import Console
from rich.panel import Panel
from src.mcp_client import MCPConnectorManager
from src.ai_agent import AIAgent

console = Console()

async def test_complex_flow():
    """Test a more complex flow that should use tools"""
    console.print(Panel.fit(
        "[bold blue]Complex Flow Test[/bold blue]\n"
        "Testing AI agent with queries that should use tools",
        title="🧪 Complex Flow"
    ))
    
    # Setup
    connector_manager = MCPConnectorManager()
    await connector_manager.add_connector("test_connector", "http://localhost:3000")
    
    ai_agent = AIAgent(
        connector_manager=connector_manager,
        gemini_api_key="AIzaSyCXCVNNHi1SY-FEdPrTu6T9fH2tTw2ZKWs"
    )
    
    # Test queries that should use tools
    test_queries = [
        "Persist a value called 'test_data' with the value 'hello world'",
        "Get the value called 'test_data'",
        "Increment the counter by 5",
        "Store my name as 'John' and then retrieve it"
    ]
    
    for i, query in enumerate(test_queries, 1):
        console.print(f"\n[bold]Test {i}:[/bold] {query}")
        
        try:
            result = await ai_agent.process_request(query)
            
            if result.get("success"):
                console.print(f"[green]✓ Success[/green]")
                console.print(f"Reasoning: {result.get('reasoning', 'N/A')}")
                console.print(f"Tool calls: {len(result.get('tool_calls', []))}")
                
                # Show tool calls
                for j, tool_call in enumerate(result.get('tool_calls', []), 1):
                    console.print(f"  Tool {j}: {tool_call.get('tool_name')} on {tool_call.get('connector_name')}")
                    console.print(f"    Arguments: {tool_call.get('arguments')}")
                    console.print(f"    Reasoning: {tool_call.get('reasoning')}")
                
                console.print(f"Summary: {result.get('summary', 'N/A')}")
            else:
                console.print(f"[red]✗ Failed[/red]")
                console.print(f"Error: {result.get('error', 'Unknown error')}")
                
        except Exception as e:
            console.print(f"[red]✗ Error: {e}[/red]")
    
    # Cleanup
    await connector_manager.close_all()

if __name__ == "__main__":
    asyncio.run(test_complex_flow())


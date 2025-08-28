#!/usr/bin/env python3
"""
Main entry point for the MCP AI Agent application
"""
import asyncio
import logging
import os
import sys
from typing import Optional

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from src.mcp_client import MCPConnectorManager
from src.ai_agent import AIAgent
from src.api_server import start_server
from src.cli_interface import run_interactive_cli, NaturalLanguageCLI

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Typer app
app = typer.Typer(help="MCP AI Agent - Natural language interface for MCP connectors")
console = Console()


@app.command()
def serve(
    host: str = typer.Option("0.0.0.0", "--host", "-h", help="Host to bind to"),
    port: int = typer.Option(8000, "--port", "-p", help="Port to bind to"),
    reload: bool = typer.Option(False, "--reload", help="Enable auto-reload"),
):
    """Start the FastAPI server"""
    console.print(Panel.fit(
        "[bold blue]MCP AI Agent Server[/bold blue]\n"
        f"Starting server on {host}:{port}",
        title="🚀 Server Starting"
    ))
    
    start_server(host=host, port=port, reload=reload)


@app.command()
def interactive(
    connector_url: str = typer.Option("http://localhost:3000", "--connector", "-c", help="MCP connector URL"),
    gemini_key: Optional[str] = typer.Option(None, "--gemini-key", envvar="GOOGLE_API_KEY", help="Google Gemini API key"),
    anthropic_key: Optional[str] = typer.Option(None, "--anthropic-key", envvar="ANTHROPIC_API_KEY", help="Anthropic API key"),
):
    """Start an enhanced interactive CLI session with natural language prompting"""
    asyncio.run(run_interactive_cli(connector_url, gemini_key, anthropic_key))


@app.command()
def chat(
    connector_url: str = typer.Option("http://localhost:3000", "--connector", "-c", help="MCP connector URL"),
    gemini_key: Optional[str] = typer.Option(None, "--gemini-key", envvar="GOOGLE_API_KEY", help="Google Gemini API key"),
    anthropic_key: Optional[str] = typer.Option(None, "--anthropic-key", envvar="ANTHROPIC_API_KEY", help="Anthropic API key"),
):
    """Start a natural language chat interface (alias for interactive)"""
    asyncio.run(run_interactive_cli(connector_url, gemini_key, anthropic_key))


# The old _run_interactive function is now replaced by run_interactive_cli from cli_interface.py


@app.command()
def list_tools(
    connector_url: str = typer.Option("http://localhost:3000", "--connector", "-c", help="MCP connector URL"),
):
    """List available tools from an MCP connector"""
    asyncio.run(_list_tools(connector_url))


async def _list_tools(connector_url: str):
    """List tools from a connector"""
    connector_manager = MCPConnectorManager()
    
    try:
        await connector_manager.add_connector("temp", connector_url)
        tools = await connector_manager.list_all_tools()
        
        if not tools:
            console.print("[yellow]No tools found[/yellow]")
            return
        
        table = Table(title=f"Tools from {connector_url}")
        table.add_column("Connector", style="cyan")
        table.add_column("Tool Name", style="green")
        table.add_column("Description", style="white")
        
        for connector_name, connector_tools in tools.items():
            for tool in connector_tools:
                table.add_row(
                    connector_name,
                    tool.get("name", "Unknown"),
                    tool.get("description", "No description")
                )
        
        console.print(table)
        
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
    finally:
        await connector_manager.close_all()


@app.command()
def test_connection(
    connector_url: str = typer.Option("http://localhost:3000", "--connector", "-c", help="MCP connector URL"),
):
    """Test connection to an MCP connector"""
    asyncio.run(_test_connection(connector_url))


async def _test_connection(connector_url: str):
    """Test connection to a connector"""
    connector_manager = MCPConnectorManager()
    
    try:
        console.print(f"Testing connection to {connector_url}...")
        await connector_manager.add_connector("test", connector_url)
        
        # Try to list tools
        tools = await connector_manager.list_all_tools()
        
        console.print("[green]✓ Connection successful![/green]")
        console.print(f"Found {len(tools.get('test', []))} tools")
        
        # Show first few tools
        if tools.get('test'):
            console.print("\n[bold]Available tools:[/bold]")
            for tool in tools['test'][:5]:  # Show first 5
                console.print(f"  - {tool.get('name', 'Unknown')}: {tool.get('description', 'No description')}")
            
            if len(tools['test']) > 5:
                console.print(f"  ... and {len(tools['test']) - 5} more")
        
    except Exception as e:
        console.print(f"[red]✗ Connection failed: {e}[/red]")
    finally:
        await connector_manager.close_all()


if __name__ == "__main__":
    app()

"""
Enhanced CLI interface with natural language prompting capabilities
"""
import asyncio
import logging
import os
import sys
from typing import Optional, List, Dict, Any

import typer
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt, Confirm
from rich.table import Table
from rich.text import Text
from rich.markdown import Markdown
from rich.live import Live
from rich.spinner import Spinner
from rich.syntax import Syntax

from .mcp_client import MCPConnectorManager
from .ai_agent import AIAgent
from .disco_animation import DiscoHeader, DiscoSpinner, show_disco_header, show_disco_spinner

logger = logging.getLogger(__name__)
console = Console()


class NaturalLanguageCLI:
    """Enhanced CLI with natural language prompting capabilities"""
    
    def __init__(self, connector_manager: MCPConnectorManager, ai_agent: AIAgent):
        self.connector_manager = connector_manager
        self.ai_agent = ai_agent
        self.conversation_history: List[Dict[str, Any]] = []
        
    async def start_interactive_session(self):
        """Start an interactive natural language session"""
        
        # Welcome message
        welcome_text = """
# 🤖 MCP AI Agent - Natural Language Interface

Welcome! You can now interact with your MCP connectors using natural language.

## Examples of what you can say:
- "Create a new workflow for database migration"
- "Register Alice as a DBA and start a deployment workflow"
- "Propose an action to update the database schema"
- "Review all pending proposals and approve them"
- "Execute the approved actions and show me the audit log"
- "What tools are available?"
- "Show me the current workflow status"

## Commands:
- Type `help` for available commands
- Type `history` to see conversation history
- Type `tools` to list available tools
- Type `clear` to clear the conversation
- Type `quit` or `exit` to end the session
        """
        
        console.print(Panel(Markdown(welcome_text), title="🚀 Welcome to MCP AI Agent"))
        
        # Show available tools
        await self._show_available_tools()
        
        # Main interaction loop
        while True:
            try:
                # Get user input with rich prompt
                user_input = Prompt.ask(
                    "\n[bold cyan]You[/bold cyan]",
                    default="",
                    show_default=False
                )
                
                if not user_input.strip():
                    continue
                
                # Handle special commands
                if user_input.lower() in ['quit', 'exit', 'q']:
                    break
                elif user_input.lower() == 'help':
                    await self._show_help()
                    continue
                elif user_input.lower() == 'history':
                    await self._show_history()
                    continue
                elif user_input.lower() == 'tools':
                    await self._show_available_tools()
                    continue
                elif user_input.lower() == 'clear':
                    self.conversation_history.clear()
                    console.print("[green]Conversation history cleared![/green]")
                    continue
                
                # Process the natural language request
                await self._process_user_request(user_input)
                
            except KeyboardInterrupt:
                console.print("\n[yellow]Interrupted by user[/yellow]")
                if Confirm.ask("Do you want to exit?"):
                    break
            except Exception as e:
                console.print(f"\n[red]Error: {e}[/red]")
                logger.error(f"Error in interactive session: {e}")
    
    async def _process_user_request(self, user_input: str):
        """Process a user's natural language request"""
        
        # Add to conversation history
        self.conversation_history.append({
            "type": "user",
            "content": user_input,
            "timestamp": asyncio.get_event_loop().time()
        })
        
        # Show disco header while AI is thinking
        disco_task = None
        try:
            # Start disco header animation in background
            disco_task = asyncio.create_task(
                show_disco_header("🎵 AI is thinking... 🎵")
            )
            
            # Process the request with the AI agent
            result = await self.ai_agent.process_request(user_input)
            
            # Stop disco header animation
            if disco_task:
                disco_task.cancel()
                try:
                    await disco_task
                except asyncio.CancelledError:
                    pass
            
            # Add AI response to conversation history
            self.conversation_history.append({
                "type": "assistant",
                "content": result,
                "timestamp": asyncio.get_event_loop().time()
            })
            
            # Display the results
            await self._display_results(result)
            
        except Exception as e:
            # Stop disco header animation on error
            if disco_task:
                disco_task.cancel()
                try:
                    await disco_task
                except asyncio.CancelledError:
                    pass
            
            error_msg = f"Error processing request: {e}"
            console.print(f"\n[red]{error_msg}[/red]")
            self.conversation_history.append({
                "type": "error",
                "content": error_msg,
                "timestamp": asyncio.get_event_loop().time()
            })
    
    async def _display_results(self, result: Dict[str, Any]):
        """Display the results of a processed request"""
        
        console.print("\n" + "="*60)
        
        # Show reasoning if available
        if result.get("reasoning"):
            console.print(Panel(
                f"[bold]Reasoning:[/bold]\n{result['reasoning']}",
                title="🧠 AI Reasoning",
                border_style="blue"
            ))
        
        # Show tool calls if any
        if result.get("tool_calls"):
            console.print(Panel(
                self._format_tool_calls(result["tool_calls"]),
                title="🔧 Tool Calls Executed",
                border_style="green"
            ))
        
        # Show results
        if result.get("results"):
            console.print(Panel(
                self._format_results(result["results"]),
                title="📊 Execution Results",
                border_style="yellow"
            ))
        
        # Show summary
        if result.get("summary"):
            console.print(Panel(
                Markdown(result["summary"]),
                title="📝 Summary",
                border_style="cyan"
            ))
        
        console.print("="*60)
    
    def _format_tool_calls(self, tool_calls: List[Dict]) -> str:
        """Format tool calls for display"""
        if not tool_calls:
            return "No tool calls were made."
        
        formatted = []
        for i, tool_call in enumerate(tool_calls, 1):
            formatted.append(f"{i}. **{tool_call['tool_name']}** ({tool_call['connector_name']})")
            formatted.append(f"   Arguments: {tool_call['arguments']}")
            formatted.append(f"   Reasoning: {tool_call['reasoning']}")
            formatted.append("")
        
        return "\n".join(formatted)
    
    def _format_results(self, results: List[Dict]) -> str:
        """Format results for display"""
        if not results:
            return "No results to display."
        
        formatted = []
        for i, result in enumerate(results, 1):
            tool_call = result["tool_call"]
            status = "✅ Success" if result["success"] else "❌ Failed"
            
            formatted.append(f"{i}. **{tool_call.tool_name}** - {status}")
            
            if result["success"] and result["result"]:
                content = result["result"].content
                if content and len(content) > 0:
                    text_content = content[0].get("text", "No text content")
                    # Truncate long content
                    if len(text_content) > 200:
                        text_content = text_content[:200] + "..."
                    formatted.append(f"   Result: {text_content}")
            elif result["error"]:
                formatted.append(f"   Error: {result['error']}")
            
            formatted.append("")
        
        return "\n".join(formatted)
    
    async def _show_available_tools(self):
        """Show available tools in a nice format"""
        try:
            tools_summary = await self.ai_agent.get_available_tools_summary()
            console.print(Panel(
                Markdown(tools_summary),
                title="📋 Available Tools",
                border_style="green"
            ))
        except Exception as e:
            console.print(f"[red]Error getting tools: {e}[/red]")
    
    async def _show_help(self):
        """Show help information"""
        help_text = """
# Available Commands

## Natural Language Commands
You can use natural language to interact with the system. Examples:
- "Create a new workflow for database migration"
- "Register Alice as a DBA"
- "Propose an action to update the database schema"
- "Review and approve all pending proposals"
- "Execute the approved actions"
- "Show me the audit log"

## System Commands
- `help` - Show this help message
- `tools` - List all available tools
- `history` - Show conversation history
- `clear` - Clear conversation history
- `quit` or `exit` - End the session

## Tips
- Be specific about what you want to accomplish
- You can chain multiple actions in one request
- The AI will automatically select the appropriate tools
- All actions are logged in the audit trail
        """
        
        console.print(Panel(Markdown(help_text), title="❓ Help", border_style="blue"))
    
    async def _show_history(self):
        """Show conversation history"""
        if not self.conversation_history:
            console.print("[yellow]No conversation history yet.[/yellow]")
            return
        
        table = Table(title="Conversation History")
        table.add_column("Time", style="cyan")
        table.add_column("Type", style="green")
        table.add_column("Content", style="white")
        
        for entry in self.conversation_history[-10:]:  # Show last 10 entries
            timestamp = f"{entry['timestamp']:.1f}s"
            entry_type = entry["type"].upper()
            content = entry["content"]
            
            # Truncate long content
            if isinstance(content, str) and len(content) > 100:
                content = content[:100] + "..."
            elif isinstance(content, dict):
                content = str(content)[:100] + "..."
            
            table.add_row(timestamp, entry_type, str(content))
        
        console.print(table)


async def run_interactive_cli(
    connector_url: str = "http://localhost:3000",
    gemini_key: Optional[str] = None,
    anthropic_key: Optional[str] = None,
    connector_name: str = "default"
):
    """Run the enhanced interactive CLI"""
    
    # Check for API keys
    if not gemini_key and not anthropic_key:
        gemini_key = os.getenv("GOOGLE_API_KEY")
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        
    if not gemini_key and not anthropic_key:
        console.print("[red]Error: Either GOOGLE_API_KEY or ANTHROPIC_API_KEY must be provided[/red]")
        console.print("Set environment variables or use --gemini-key or --anthropic-key options")
        sys.exit(1)
    
    # Initialize components
    connector_manager = MCPConnectorManager()
    
    try:
        # Connect to the connector
        console.print(f"🔗 Connecting to MCP connector at {connector_url}...")
        await connector_manager.add_connector(connector_name, connector_url)
        console.print("[green]✓ Connected to MCP connector[/green]")
        
        # Initialize AI agent
        ai_agent = AIAgent(
            connector_manager=connector_manager,
            gemini_api_key=gemini_key,
            anthropic_api_key=anthropic_key
        )
        console.print("[green]✓ AI Agent initialized[/green]")
        
        # Start interactive session
        cli = NaturalLanguageCLI(connector_manager, ai_agent)
        await cli.start_interactive_session()
        
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        logger.error(f"Error in CLI session: {e}")
    finally:
        await connector_manager.close_all()
        console.print("\n[green]Session ended[/green]")


def main():
    """Main entry point for the enhanced CLI"""
    typer.run(run_interactive_cli)


if __name__ == "__main__":
    main()

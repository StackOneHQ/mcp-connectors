"""
MCP AI Agent - Python application for natural language interaction with MCP connectors
"""

from .mcp_client import MCPClient, MCPConnectorManager, MCPToolResult
from .ai_agent import AIAgent, ToolCall, AITool
from .api_server import app, start_server
from .cli_interface import NaturalLanguageCLI, run_interactive_cli

__version__ = "1.0.0"
__all__ = [
    "MCPClient",
    "MCPConnectorManager", 
    "MCPToolResult",
    "AIAgent",
    "ToolCall",
    "AITool",
    "app",
    "start_server",
    "NaturalLanguageCLI",
    "run_interactive_cli"
]

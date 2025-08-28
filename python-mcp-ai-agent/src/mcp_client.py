"""
MCP Client for communicating with TypeScript MCP connectors
"""
import asyncio
import json
import logging
from typing import Any, Dict, List, Optional, Union
from urllib.parse import urljoin

import aiohttp
import websockets
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class MCPToolCall(BaseModel):
    """Represents a tool call to an MCP connector"""
    name: str
    arguments: Dict[str, Any] = Field(default_factory=dict)


class MCPToolResult(BaseModel):
    """Represents the result of an MCP tool call"""
    content: List[Dict[str, Any]]
    error: Optional[str] = None


class MCPClient:
    """Client for communicating with MCP connectors"""
    
    def __init__(self, base_url: str = "http://localhost:3000"):
        self.base_url = base_url.rstrip('/')
        self.mcp_endpoint = f"{self.base_url}/mcp"
        self.session: Optional[aiohttp.ClientSession] = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> MCPToolResult:
        """
        Call a tool on the MCP connector
        
        Args:
            tool_name: Name of the tool to call
            arguments: Arguments to pass to the tool
            
        Returns:
            MCPToolResult containing the response
        """
        if not self.session:
            raise RuntimeError("Client not initialized. Use async context manager.")
            
        # Create the MCP tool call request
        request_data = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments
            }
        }
        
        try:
            async with self.session.post(
                self.mcp_endpoint,
                json=request_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                response.raise_for_status()
                result = await response.json()
                
                if "error" in result:
                    return MCPToolResult(
                        content=[],
                        error=result["error"].get("message", "Unknown error")
                    )
                
                return MCPToolResult(
                    content=result.get("result", {}).get("content", [])
                )
                
        except Exception as e:
            logger.error(f"Error calling tool {tool_name}: {e}")
            return MCPToolResult(
                content=[],
                error=str(e)
            )
    
    async def list_tools(self) -> List[Dict[str, Any]]:
        """
        List available tools from the MCP connector
        
        Returns:
            List of available tools
        """
        if not self.session:
            raise RuntimeError("Client not initialized. Use async context manager.")
            
        request_data = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/list"
        }
        
        try:
            async with self.session.post(
                self.mcp_endpoint,
                json=request_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                response.raise_for_status()
                result = await response.json()
                
                if "error" in result:
                    logger.error(f"Error listing tools: {result['error']}")
                    return []
                
                return result.get("result", {}).get("tools", [])
                
        except Exception as e:
            logger.error(f"Error listing tools: {e}")
            return []
    
    async def get_tool_schema(self, tool_name: str) -> Optional[Dict[str, Any]]:
        """
        Get the schema for a specific tool
        
        Args:
            tool_name: Name of the tool
            
        Returns:
            Tool schema or None if not found
        """
        tools = await self.list_tools()
        for tool in tools:
            if tool.get("name") == tool_name:
                return tool
        return None


class MCPConnectorManager:
    """Manages multiple MCP connectors"""
    
    def __init__(self):
        self.connectors: Dict[str, MCPClient] = {}
        
    async def add_connector(self, name: str, base_url: str) -> MCPClient:
        """
        Add a new MCP connector
        
        Args:
            name: Name for the connector
            base_url: Base URL of the connector server
            
        Returns:
            MCPClient instance
        """
        client = MCPClient(base_url)
        await client.__aenter__()
        self.connectors[name] = client
        return client
    
    async def remove_connector(self, name: str):
        """Remove a connector"""
        if name in self.connectors:
            await self.connectors[name].__aexit__(None, None, None)
            del self.connectors[name]
    
    async def call_tool_on_connector(
        self, 
        connector_name: str, 
        tool_name: str, 
        arguments: Dict[str, Any]
    ) -> MCPToolResult:
        """
        Call a tool on a specific connector
        
        Args:
            connector_name: Name of the connector
            tool_name: Name of the tool
            arguments: Tool arguments
            
        Returns:
            MCPToolResult
        """
        if connector_name not in self.connectors:
            raise ValueError(f"Connector '{connector_name}' not found")
            
        return await self.connectors[connector_name].call_tool(tool_name, arguments)
    
    async def list_all_tools(self) -> Dict[str, List[Dict[str, Any]]]:
        """
        List all tools from all connectors
        
        Returns:
            Dictionary mapping connector names to their tools
        """
        result = {}
        for name, client in self.connectors.items():
            result[name] = await client.list_tools()
        return result
    
    async def close_all(self):
        """Close all connectors"""
        for name in list(self.connectors.keys()):
            await self.remove_connector(name)

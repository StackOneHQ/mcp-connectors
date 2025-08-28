"""
Debug version of AI Agent to troubleshoot tool selection issues
"""
import json
import logging
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass

import google.generativeai as genai
from anthropic import AsyncAnthropic
from pydantic import BaseModel, Field

from .mcp_client import MCPClient, MCPToolResult, MCPConnectorManager

logger = logging.getLogger(__name__)


@dataclass
class ToolCall:
    """Represents a tool call with context"""
    connector_name: str
    tool_name: str
    arguments: Dict[str, Any]
    reasoning: str


class AITool(BaseModel):
    """Represents a tool that the AI can use"""
    name: str
    description: str
    connector_name: str
    schema: Dict[str, Any]


class AIAgentDebug:
    """
    Debug version of AI Agent that understands natural language and orchestrates MCP tool calls
    """
    
    def __init__(
        self,
        connector_manager: MCPConnectorManager,
        gemini_api_key: Optional[str] = None,
        anthropic_api_key: Optional[str] = None,
        model: str = "gemini-1.5-flash"
    ):
        self.connector_manager = connector_manager
        self.model = model
        
        # Initialize AI clients
        if gemini_api_key:
            genai.configure(api_key=gemini_api_key)
            self.gemini_model = genai.GenerativeModel(model)
        else:
            self.gemini_model = None
            
        if anthropic_api_key:
            self.anthropic_client = AsyncAnthropic(api_key=anthropic_api_key)
        else:
            self.anthropic_client = None
            
        if not self.gemini_model and not self.anthropic_client:
            raise ValueError("At least one AI provider (Gemini or Anthropic) must be configured")
    
    async def _get_available_tools(self) -> List[AITool]:
        """Get all available tools from all connectors"""
        tools = []
        all_tools = await self.connector_manager.list_all_tools()
        
        for connector_name, connector_tools in all_tools.items():
            for tool in connector_tools:
                tools.append(AITool(
                    name=tool.get("name", ""),
                    description=tool.get("description", ""),
                    connector_name=connector_name,
                    schema=tool.get("inputSchema", {})
                ))
        
        return tools
    
    def _create_tool_selection_prompt(self, user_query: str, available_tools: List[AITool]) -> str:
        """Create a prompt for tool selection"""
        tools_description = "\n".join([
            f"- {tool.name} ({tool.connector_name}): {tool.description}"
            for tool in available_tools
        ])
        
        return f"""
You are an AI assistant that can use various tools to help users. Based on the user's request, determine which tools to use and how to use them.

Available tools:
{tools_description}

User request: {user_query}

Please analyze the request and determine:
1. Which tools are needed
2. The order to call them
3. The arguments for each tool call
4. Your reasoning for each decision

Respond in the following JSON format:
{{
    "reasoning": "Your overall reasoning for the approach",
    "tool_calls": [
        {{
            "connector_name": "name of the connector",
            "tool_name": "name of the tool",
            "arguments": {{"param1": "value1", "param2": "value2"}},
            "reasoning": "Why this tool call is needed"
        }}
    ]
}}

Only include tools that are actually needed for the request. If no tools are needed, return an empty tool_calls array.

IMPORTANT: Respond ONLY with valid JSON. Do not include any other text before or after the JSON.
"""
    
    async def _select_tools(self, user_query: str) -> Tuple[str, List[ToolCall]]:
        """Use AI to select appropriate tools for the user query"""
        available_tools = await self._get_available_tools()
        prompt = self._create_tool_selection_prompt(user_query, available_tools)
        
        print(f"DEBUG: Available tools: {[tool.name for tool in available_tools]}")
        print(f"DEBUG: User query: {user_query}")
        print(f"DEBUG: Sending prompt to AI...")
        
        try:
            if self.gemini_model:
                print("DEBUG: Using Gemini model")
                response = await self.gemini_model.generate_content_async(prompt)
                content = response.text
                print(f"DEBUG: Gemini response: {content}")
            elif self.anthropic_client:
                print("DEBUG: Using Anthropic model")
                response = await self.anthropic_client.messages.create(
                    model="claude-3-sonnet-20240229",
                    max_tokens=2000,
                    messages=[{"role": "user", "content": prompt}]
                )
                content = response.content[0].text
                print(f"DEBUG: Anthropic response: {content}")
            
            # Try to clean the response
            content = content.strip()
            
            # Remove any markdown code blocks
            if content.startswith("```json"):
                content = content[7:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
            
            print(f"DEBUG: Cleaned content: {content}")
            
            # Parse the JSON response
            try:
                result = json.loads(content)
                print(f"DEBUG: Parsed JSON: {result}")
                
                reasoning = result.get("reasoning", "")
                tool_calls = []
                
                for call_data in result.get("tool_calls", []):
                    tool_calls.append(ToolCall(
                        connector_name=call_data["connector_name"],
                        tool_name=call_data["tool_name"],
                        arguments=call_data["arguments"],
                        reasoning=call_data["reasoning"]
                    ))
                
                print(f"DEBUG: Created {len(tool_calls)} tool calls")
                return reasoning, tool_calls
                
            except json.JSONDecodeError as e:
                print(f"DEBUG: JSON decode error: {e}")
                print(f"DEBUG: Content that failed to parse: {repr(content)}")
                logger.error(f"Failed to parse AI response as JSON: {e}")
                return "Failed to parse tool selection", []
                
        except Exception as e:
            print(f"DEBUG: Exception in tool selection: {e}")
            logger.error(f"Error in tool selection: {e}")
            return f"Error in tool selection: {str(e)}", []
    
    async def _execute_tool_calls(self, tool_calls: List[ToolCall]) -> List[Dict[str, Any]]:
        """Execute a list of tool calls"""
        results = []
        
        for i, tool_call in enumerate(tool_calls):
            logger.info(f"Executing tool call {i+1}/{len(tool_calls)}: {tool_call.tool_name}")
            
            try:
                result = await self.connector_manager.call_tool_on_connector(
                    tool_call.connector_name,
                    tool_call.tool_name,
                    tool_call.arguments
                )
                
                results.append({
                    "tool_call": tool_call,
                    "success": result.error is None,
                    "result": result,
                    "error": result.error
                })
                
            except Exception as e:
                logger.error(f"Error executing tool call {tool_call.tool_name}: {e}")
                results.append({
                    "tool_call": tool_call,
                    "success": False,
                    "result": None,
                    "error": str(e)
                })
        
        return results
    
    def _create_summary_prompt(self, user_query: str, reasoning: str, results: List[Dict[str, Any]]) -> str:
        """Create a prompt for summarizing the results"""
        results_summary = []
        for i, result in enumerate(results):
            tool_call = result["tool_call"]
            if result["success"]:
                content = result["result"].content
                if content and len(content) > 0:
                    text_content = content[0].get("text", "No text content")
                    results_summary.append(f"Tool {i+1}: {tool_call.tool_name} - Success\nResult: {text_content}")
                else:
                    results_summary.append(f"Tool {i+1}: {tool_call.tool_name} - Success (no content)")
            else:
                results_summary.append(f"Tool {i+1}: {tool_call.tool_name} - Failed\nError: {result['error']}")
        
        return f"""
You are an AI assistant that has executed some tools based on a user's request. Please provide a clear, helpful summary of what was accomplished.

Original user request: {user_query}

Your reasoning: {reasoning}

Tool execution results:
{chr(10).join(results_summary)}

Please provide a natural language summary of what was accomplished, what the results mean, and any next steps the user might want to take. Be conversational and helpful.
"""
    
    async def _generate_summary(self, user_query: str, reasoning: str, results: List[Dict[str, Any]]) -> str:
        """Generate a summary of the tool execution results"""
        prompt = self._create_summary_prompt(user_query, reasoning, results)
        
        try:
            if self.gemini_model:
                response = await self.gemini_model.generate_content_async(prompt)
                return response.text
            elif self.anthropic_client:
                response = await self.anthropic_client.messages.create(
                    model="claude-3-sonnet-20240229",
                    max_tokens=1000,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.content[0].text
                
        except Exception as e:
            logger.error(f"Error generating summary: {e}")
            return f"Error generating summary: {str(e)}"
    
    async def process_request(self, user_query: str) -> Dict[str, Any]:
        """
        Process a natural language request by selecting and executing appropriate tools
        
        Args:
            user_query: Natural language request from the user
            
        Returns:
            Dictionary containing the results and summary
        """
        logger.info(f"Processing request: {user_query}")
        
        # Step 1: Select appropriate tools
        reasoning, tool_calls = await self._select_tools(user_query)
        
        if not tool_calls:
            return {
                "success": True,
                "reasoning": reasoning,
                "tool_calls": [],
                "results": [],
                "summary": "No tools were needed for this request."
            }
        
        # Step 2: Execute the tool calls
        results = await self._execute_tool_calls(tool_calls)
        
        # Step 3: Generate a summary
        summary = await self._generate_summary(user_query, reasoning, results)
        
        return {
            "success": True,
            "reasoning": reasoning,
            "tool_calls": [tc.__dict__ for tc in tool_calls],
            "results": results,
            "summary": summary
        }
    
    async def get_available_tools_summary(self) -> str:
        """Get a human-readable summary of available tools"""
        tools = await self._get_available_tools()
        
        if not tools:
            return "No tools are currently available."
        
        # Group tools by connector
        connectors = {}
        for tool in tools:
            if tool.connector_name not in connectors:
                connectors[tool.connector_name] = []
            connectors[tool.connector_name].append(tool)
        
        summary = "Available tools:\n\n"
        for connector_name, connector_tools in connectors.items():
            summary += f"**{connector_name}**\n"
            for tool in connector_tools:
                summary += f"- {tool.name}: {tool.description}\n"
            summary += "\n"
        
        return summary

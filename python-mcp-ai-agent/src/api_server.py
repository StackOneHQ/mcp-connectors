"""
FastAPI server for the MCP AI Agent
"""
import asyncio
import logging
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

from .mcp_client import MCPConnectorManager
from .ai_agent import AIAgent

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="MCP AI Agent API",
    description="AI-powered interface for MCP connectors with natural language understanding",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
connector_manager = MCPConnectorManager()
ai_agent: Optional[AIAgent] = None


# Pydantic models for API requests/responses
class ProcessRequestRequest(BaseModel):
    query: str = Field(..., description="Natural language query to process")
    connector_name: Optional[str] = Field(None, description="Specific connector to use (optional)")


class AddConnectorRequest(BaseModel):
    name: str = Field(..., description="Name for the connector")
    base_url: str = Field(..., description="Base URL of the MCP connector server")


class ToolCallResponse(BaseModel):
    connector_name: str
    tool_name: str
    arguments: Dict
    reasoning: str


class ToolResultResponse(BaseModel):
    tool_call: ToolCallResponse
    success: bool
    result: Optional[Dict]
    error: Optional[str]


class ProcessRequestResponse(BaseModel):
    success: bool
    reasoning: str
    tool_calls: List[ToolCallResponse]
    results: List[ToolResultResponse]
    summary: str


class ConnectorInfo(BaseModel):
    name: str
    base_url: str
    tools: List[Dict]


# API endpoints
@app.on_event("startup")
async def startup_event():
    """Initialize the AI agent on startup"""
    global ai_agent
    
    # Get API keys from environment
    import os
    openai_api_key = os.getenv("OPENAI_API_KEY")
    anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
    
    if not openai_api_key and not anthropic_api_key:
        logger.warning("No AI API keys found. Set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variables.")
        return
    
    try:
        ai_agent = AIAgent(
            connector_manager=connector_manager,
            openai_api_key=openai_api_key,
            anthropic_api_key=anthropic_api_key
        )
        logger.info("AI Agent initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize AI Agent: {e}")


@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on shutdown"""
    await connector_manager.close_all()
    logger.info("All connectors closed")


@app.get("/")
async def root():
    """Root endpoint with basic info"""
    return {
        "message": "MCP AI Agent API",
        "version": "1.0.0",
        "status": "running",
        "ai_agent_ready": ai_agent is not None
    }


@app.post("/connectors", response_model=Dict[str, str])
async def add_connector(request: AddConnectorRequest):
    """Add a new MCP connector"""
    try:
        await connector_manager.add_connector(request.name, request.base_url)
        logger.info(f"Added connector: {request.name} at {request.base_url}")
        return {"message": f"Connector '{request.name}' added successfully"}
    except Exception as e:
        logger.error(f"Failed to add connector: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/connectors/{connector_name}")
async def remove_connector(connector_name: str):
    """Remove an MCP connector"""
    try:
        await connector_manager.remove_connector(connector_name)
        logger.info(f"Removed connector: {connector_name}")
        return {"message": f"Connector '{connector_name}' removed successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to remove connector: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/connectors", response_model=List[ConnectorInfo])
async def list_connectors():
    """List all connected MCP connectors"""
    try:
        connectors = []
        all_tools = await connector_manager.list_all_tools()
        
        for connector_name, tools in all_tools.items():
            # Get the base URL from the connector manager
            if connector_name in connector_manager.connectors:
                base_url = connector_manager.connectors[connector_name].base_url
            else:
                base_url = "unknown"
                
            connectors.append(ConnectorInfo(
                name=connector_name,
                base_url=base_url,
                tools=tools
            ))
        
        return connectors
    except Exception as e:
        logger.error(f"Failed to list connectors: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/tools")
async def list_all_tools():
    """List all available tools from all connectors"""
    try:
        tools = await connector_manager.list_all_tools()
        return {"tools": tools}
    except Exception as e:
        logger.error(f"Failed to list tools: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/process", response_model=ProcessRequestResponse)
async def process_request(request: ProcessRequestRequest):
    """Process a natural language request using the AI agent"""
    if not ai_agent:
        raise HTTPException(
            status_code=503, 
            detail="AI Agent not initialized. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variables."
        )
    
    try:
        result = await ai_agent.process_request(request.query)
        
        # Convert the result to the response model
        tool_calls = [
            ToolCallResponse(**tc) for tc in result["tool_calls"]
        ]
        
        results = []
        for r in result["results"]:
            tool_call = ToolCallResponse(**r["tool_call"])
            results.append(ToolResultResponse(
                tool_call=tool_call,
                success=r["success"],
                result=r["result"].dict() if r["result"] else None,
                error=r["error"]
            ))
        
        return ProcessRequestResponse(
            success=result["success"],
            reasoning=result["reasoning"],
            tool_calls=tool_calls,
            results=results,
            summary=result["summary"]
        )
        
    except Exception as e:
        logger.error(f"Failed to process request: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/tools/summary")
async def get_tools_summary():
    """Get a human-readable summary of available tools"""
    if not ai_agent:
        raise HTTPException(
            status_code=503, 
            detail="AI Agent not initialized"
        )
    
    try:
        summary = await ai_agent.get_available_tools_summary()
        return {"summary": summary}
    except Exception as e:
        logger.error(f"Failed to get tools summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/tools/call")
async def call_tool_directly(
    connector_name: str,
    tool_name: str,
    arguments: Dict
):
    """Call a specific tool directly (bypassing AI agent)"""
    try:
        result = await connector_manager.call_tool_on_connector(
            connector_name, tool_name, arguments
        )
        return {
            "success": result.error is None,
            "result": result.dict(),
            "error": result.error
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to call tool: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "ai_agent_ready": ai_agent is not None,
        "connectors_count": len(connector_manager.connectors)
    }


def start_server(host: str = "0.0.0.0", port: int = 8000, reload: bool = False):
    """Start the FastAPI server"""
    uvicorn.run(
        "src.api_server:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info"
    )


if __name__ == "__main__":
    start_server()

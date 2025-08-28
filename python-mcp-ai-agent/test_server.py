#!/usr/bin/env python3
"""
Simple test server that simulates an MCP connector for testing
"""
import asyncio
import json
import logging
from typing import Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Test MCP Server", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock tools data
MOCK_TOOLS = [
    {
        "name": "register_actor",
        "description": "Register a new actor in the workflow system",
        "inputSchema": {
            "name": {"type": "string", "description": "Name of the actor"},
            "role": {"type": "string", "description": "Role of the actor"}
        }
    },
    {
        "name": "start_workflow",
        "description": "Start a new workflow",
        "inputSchema": {
            "title": {"type": "string", "description": "Title of the workflow"}
        }
    },
    {
        "name": "propose_action",
        "description": "Propose an action to be reviewed and executed",
        "inputSchema": {
            "workflow_id": {"type": "string", "description": "ID of the workflow"},
            "tool": {"type": "string", "description": "Tool to be executed"},
            "params": {"type": "object", "description": "Parameters for the tool"},
            "reason": {"type": "string", "description": "Reason for proposing this action"}
        }
    },
    {
        "name": "review_action",
        "description": "Review a proposed action",
        "inputSchema": {
            "proposal_id": {"type": "string", "description": "ID of the proposal to review"},
            "decision": {"type": "string", "enum": ["approve", "reject", "edit"]}
        }
    },
    {
        "name": "execute_action",
        "description": "Execute an approved action",
        "inputSchema": {
            "proposal_id": {"type": "string", "description": "ID of the proposal to execute"}
        }
    },
    {
        "name": "get_audit_log",
        "description": "Get the audit log for a workflow",
        "inputSchema": {
            "workflow_id": {"type": "string", "description": "ID of the workflow"}
        }
    }
]

# Mock state
mock_state = {
    "actors": [],
    "workflows": [],
    "proposals": [],
    "executions": [],
    "audit_log": []
}

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Test MCP Server",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.post("/mcp")
async def mcp_endpoint(request: Dict[str, Any] = None):
    """MCP protocol endpoint"""
    if request is None:
        return {
            "jsonrpc": "2.0",
            "id": 1,
            "error": {
                "code": -32600,
                "message": "Invalid request"
            }
        }
    
    try:
        method = request.get("method")
        params = request.get("params", {})
        
        logger.info(f"MCP request: {method}")
        
        if method == "tools/list":
            return {
                "jsonrpc": "2.0",
                "id": request.get("id", 1),
                "result": {
                    "tools": MOCK_TOOLS
                }
            }
        
        elif method == "tools/call":
            tool_name = params.get("name")
            arguments = params.get("arguments", {})
            
            logger.info(f"Calling tool: {tool_name} with args: {arguments}")
            
            # Mock tool execution
            if tool_name == "register_actor":
                actor_id = f"actor_{len(mock_state['actors']) + 1}"
                actor = {
                    "id": actor_id,
                    "name": arguments.get("name", "Unknown"),
                    "role": arguments.get("role", "Unknown")
                }
                mock_state["actors"].append(actor)
                mock_state["audit_log"].append({
                    "action": "register_actor",
                    "actor_id": actor_id,
                    "timestamp": "2024-01-15T10:30:00Z"
                })
                
                return {
                    "jsonrpc": "2.0",
                    "id": request.get("id", 1),
                    "result": {
                        "content": [{"text": json.dumps({"actor_id": actor_id, "name": actor["name"], "role": actor["role"]})}]
                    }
                }
            
            elif tool_name == "start_workflow":
                workflow_id = f"workflow_{len(mock_state['workflows']) + 1}"
                workflow = {
                    "id": workflow_id,
                    "title": arguments.get("title", "Unknown"),
                    "status": "active"
                }
                mock_state["workflows"].append(workflow)
                mock_state["audit_log"].append({
                    "action": "start_workflow",
                    "workflow_id": workflow_id,
                    "timestamp": "2024-01-15T10:30:05Z"
                })
                
                return {
                    "jsonrpc": "2.0",
                    "id": request.get("id", 1),
                    "result": {
                        "content": [{"text": json.dumps({"workflow_id": workflow_id, "title": workflow["title"]})}]
                    }
                }
            
            elif tool_name == "propose_action":
                proposal_id = f"proposal_{len(mock_state['proposals']) + 1}"
                proposal = {
                    "id": proposal_id,
                    "workflow_id": arguments.get("workflow_id"),
                    "tool": arguments.get("tool"),
                    "params": arguments.get("params", {}),
                    "reason": arguments.get("reason", ""),
                    "status": "pending"
                }
                mock_state["proposals"].append(proposal)
                mock_state["audit_log"].append({
                    "action": "propose_action",
                    "proposal_id": proposal_id,
                    "timestamp": "2024-01-15T10:31:00Z"
                })
                
                return {
                    "jsonrpc": "2.0",
                    "id": request.get("id", 1),
                    "result": {
                        "content": [{"text": json.dumps({"proposal_id": proposal_id, "status": "pending"})}]
                    }
                }
            
            elif tool_name == "review_action":
                proposal_id = arguments.get("proposal_id")
                decision = arguments.get("decision", "approve")
                
                # Find and update proposal
                for proposal in mock_state["proposals"]:
                    if proposal["id"] == proposal_id:
                        proposal["status"] = decision
                        break
                
                mock_state["audit_log"].append({
                    "action": "review_action",
                    "proposal_id": proposal_id,
                    "decision": decision,
                    "timestamp": "2024-01-15T10:32:00Z"
                })
                
                return {
                    "jsonrpc": "2.0",
                    "id": request.get("id", 1),
                    "result": {
                        "content": [{"text": json.dumps({"status": decision, "proposal_id": proposal_id})}]
                    }
                }
            
            elif tool_name == "execute_action":
                proposal_id = arguments.get("proposal_id")
                execution_id = f"execution_{len(mock_state['executions']) + 1}"
                
                execution = {
                    "id": execution_id,
                    "proposal_id": proposal_id,
                    "success": True,
                    "timestamp": "2024-01-15T10:33:00Z"
                }
                mock_state["executions"].append(execution)
                mock_state["audit_log"].append({
                    "action": "execute_action",
                    "execution_id": execution_id,
                    "timestamp": "2024-01-15T10:33:00Z"
                })
                
                return {
                    "jsonrpc": "2.0",
                    "id": request.get("id", 1),
                    "result": {
                        "content": [{"text": json.dumps({"execution_id": execution_id, "success": True, "message": "Action executed successfully"})}]
                    }
                }
            
            elif tool_name == "get_audit_log":
                workflow_id = arguments.get("workflow_id")
                entries = [entry for entry in mock_state["audit_log"] if entry.get("workflow_id") == workflow_id]
                
                return {
                    "jsonrpc": "2.0",
                    "id": request.get("id", 1),
                    "result": {
                        "content": [{"text": json.dumps({"entries": entries})}]
                    }
                }
            
            else:
                return {
                    "jsonrpc": "2.0",
                    "id": request.get("id", 1),
                    "error": {
                        "code": -32601,
                        "message": f"Method '{tool_name}' not found"
                    }
                }
        
        else:
            return {
                "jsonrpc": "2.0",
                "id": request.get("id", 1),
                "error": {
                    "code": -32601,
                    "message": f"Method '{method}' not found"
                }
            }
    
    except Exception as e:
        logger.error(f"Error in MCP endpoint: {e}")
        return {
            "jsonrpc": "2.0",
            "id": request.get("id", 1),
            "error": {
                "code": -32603,
                "message": f"Internal error: {str(e)}"
            }
        }

@app.get("/state")
async def get_state():
    """Get the current mock state"""
    return mock_state

@app.post("/reset")
async def reset_state():
    """Reset the mock state"""
    global mock_state
    mock_state = {
        "actors": [],
        "workflows": [],
        "proposals": [],
        "executions": [],
        "audit_log": []
    }
    return {"message": "State reset successfully"}

def start_server(host: str = "0.0.0.0", port: int = 3000):
    """Start the test server"""
    print(f"🚀 Starting Test MCP Server on {host}:{port}")
    print("Available tools:")
    for tool in MOCK_TOOLS:
        print(f"  - {tool['name']}: {tool['description']}")
    print(f"\nMCP endpoint: http://{host}:{port}/mcp")
    print("Health check: http://localhost:3000/health")
    print("State: http://localhost:3000/state")
    print("Reset: POST http://localhost:3000/reset")
    
    uvicorn.run(app, host=host, port=port, log_level="info")

if __name__ == "__main__":
    start_server()

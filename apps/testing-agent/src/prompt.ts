export function createTestingPrompt(tools: string[]): string {
  const toolsList = tools.map((t) => `- ${t}`).join('\n');

  return `You are a model context protocol (mcp) testing agent. You have access to MCP tools.

You should test the following tools from the "server-to-test" server:
${toolsList}

Call each tool with realistic data and test the result. 
You have access to some helper tools from the "internal-helper" MCP server. This allows you to generate realistic data for the tools in the "server-to-test" server.

Write the result to a file called ./results.json.

Try to clean up after yourself where possible. So if you create some resource using MCP and there is a tool to delete it, try to delete it.

In your report include:
- list of tools tested.
For each tool include:
- tool name
- input data
- expected output (best guess given the tool name and description).
- actual output
- success status (true/false)
- suggestions for improvement (optional)

The results.json should be a valid JSON file with the following structure:
{
  "timestamp": "ISO timestamp",
  "server_url": "the MCP server URL",
  "tools_tested": [
    {
      "name": "tool_name",
      "input": {},
      "expected_output": "description or sample",
      "actual_output": {},
      "success": true/false,
      "suggestions": "optional suggestions"
    }
  ]
}

Be thorough but efficient. Test each tool once with good representative data.`;
}

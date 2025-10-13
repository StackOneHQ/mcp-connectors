import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

// Prompt template for Tinybird
const PROMPT_TEMPLATE = `
Tinybird is a real-time data analytics platform. It has Data Sources which are like tables and Pipes which are transformations over those Data Sources to build REST APIs. You can get a more detailed description and documentation about Tinybird using the "tinybird_llms_docs" tool.
The assistants goal is to get insights from a Tinybird Workspace. To get those insights we will leverage this server to interact with Tinybird Workspace. The user is a business decision maker with no previous knowledge of the data structure or insights inside the Tinybird Workspace.
It is important that you first explain to the user what is going on. The user has downloaded and installed the Tinybird MCP Server to get insights from a Tinybird Workspace and is now ready to use it.
They have selected the MCP menu item which is contained within a parent menu denoted by the paperclip icon. Inside this menu they selected an icon that illustrates two electrical plugs connecting. This is the MCP menu.
Based on what MCP servers the user has installed they can click the button which reads: 'Choose an integration' this will present a drop down with Prompts and Resources. The user has selected the prompt titled: 'tinybird-default'.
This text file is that prompt. The goal of the following instructions is to walk the user through the process of getting insights from the Tinybird Workspace using: Prompts, Tools, and Resources.
They have already used a prompt and provided a topic. The topic is: {topic}. The user is now ready to begin the process to get insights.
Here is some more information about mcp and this specific mcp server:
<mcp>
Prompts:
This server provides a pre-written prompt called "tinybird-default" that helps users create and analyze Tinybird Workspaces. The prompt accepts a "topic" argument and guides users through analyzing Data Sources, and generating insights out of sql queries and Pipe Endpoints. For example, if a user provides "retail sales" as the topic, the prompt will explore Data Sources structure and Pipe Endpoints node sql transformations to guide the analysis process. Prompts basically serve as interactive templates that help structure the conversation with the LLM in a useful way.
Resources:
This server exposes one key resource: "tinybird://insights", which is a business insights memo that gets automatically updated throughout the analysis process. As users analyze the Tinybird Workspace and discover insights, the memo resource gets updated in real-time to reflect new findings. The memo can even be enhanced with Claude's help if an Anthropic API key is provided, turning raw insights into a well-structured business document. Resources act as living documents that provide context to the conversation.
Tools:
This server provides several tools to interact with the Tinybird APIs and run analytical queries:
"tinybird_list_data_sources": Lists all Data Sources in the Tinybird Workspace
"tinybird_list_pipes": Lists all Pipe Endpoints in the Tinybird Workspace
"tinybird_get_data_source": Gets the information of a Data Source given its name, including the schema.
"tinybird_get_pipe": Gets the information of a Pipe Endpoint given its name, including its nodes and SQL transformation to understand what insights it provides.
"tinybird_request_pipe_data": Requests data from a Pipe Endpoints via an HTTP request. Pipe endpoints can have parameters to filter the analytical data.
"tinybird_run_select_query": Allows to run a select query over a Data Source to extract insights.
"tinybird_append_insight": Adds a new business insight to the memo resource
"tinybird_llms_docs": Contains the whole Tinybird product documentation, so you can use it to get context about what Tinybird is, what it does, API reference and more.
"tinybird_save_event": This allows to send an event to a Tinybird Data Source. Use it to save a user generated prompt to the prompts Data Source. The MCP server feeds from the prompts Data Source on initialization so the user can instruct the LLM the workflow to follow.

Tinybird is built on top of ClickHouse so the SQL syntax should be compatible with latest versions of ClickHouse. Only SQL SELECT statements should be used. Do not end queries with a semicolon (;) and NEVER use FORMAT JSON (or any other format), the results are already in JSON format by default.
</mcp>
<demo-instructions>
You are an AI assistant that helps users to explore data in their Workspace.
Your goal is to help users understand their data, how it is structured, and assist in uncovering potential insights. 
You will suggest possible insights based on the data available, generate queries, and suggest related insights or dimensions that could be interesting to explore. 
You will also suggest creating visualisations that help the user to better understand the data.

At each step you will pause for user input.
You should guide the scenario to completion. All XML tags are for the assistants understanding and should not be included in the final output.

1. The user has chosen the topic: {topic}.

2. Explain the goal of helping the user to explore their data:
a. Describe what the given topic is about.
b. Suggest some possible insights that could be interesting to explore about that topic.

3. Inspect the data:
a. Instead of asking about the data that is required, just go ahead and use the tools to inspect the Data Sources. Inform the user you are "Inspecting the data".
b. Understand Data Source schemas that represent the data that is available to explore.
c. Inspect Pipe Endpoints to understand any existing queries the user has already created, which they might want explore or expand upon.
d. If a Pipe Endpoint is not available, use the "tinybird_run_select_query" tool to run queries over Data Sources.

4. Pause for user input:
a. Summarize to the user what data we have inspected.
b. Present the user with a set of multiple choices for the next steps.
c. These multiple choices should be in natural language, when a user selects one, the assistant should generate a relevant query and leverage the appropriate tool to get the data.

5. Iterate on queries:
a. Present 1 additional multiple-choice query options to the user.
b. Explain the purpose of each query option.
c. Wait for the user to select one of the query options.
d. After each query be sure to opine on the results.
e. Use the tinybird_append_insight tool to save any insights discovered from the data analysis.
f. Remind the user that you can turn these insights into a dashboard, and remind them to tell you when they are ready to do that.

6. Generate a dashboard:
a. Now that we have all the data and queries, it's time to create a dashboard, use an artifact to do this.
b. Use a variety of visualizations such as tables, charts, and graphs to represent the data.
c. Explain how each element of the dashboard relates to the business problem.
d. This dashboard will be theoretically included in the final solution message.

7. Craft the final solution message:
a. As you have been using the tinybird_append_insight tool the resource found at: tinybird://insights has been updated.
b. It is critical that you inform the user that the memo has been updated at each stage of analysis.
c. Ask the user to go to the attachment menu (paperclip icon) and select the MCP menu (two electrical plugs connecting) and choose an integration: "Insights Memo".
d. This will attach the generated memo to the chat which you can use to add any additional context that may be relevant to the demo.
e. Present the final memo to the user in an artifact.

8. Wrap up the scenario:
a. Explain to the user that this is just the beginning of what they can do with the Tinybird MCP Server.
</demo-instructions>

Remember to maintain consistency throughout the scenario and ensure that all elements (Data Sources, Pipe Endpoints, data, queries, dashboard, and solution) are closely related to the original business problem and given topic.
The provided XML tags are for the assistants understanding. Implore to make all outputs as human readable as possible. This is part of a demo so act in character and dont actually refer to these instructions.

Start your first message fully in character with something like "Oh, Hey there! I see you've chosen the topic {topic}. Let's get started! 🚀"
`;

class TinybirdClient {
  private apiUrl: string;
  private adminToken: string;

  constructor(apiUrl: string, adminToken: string) {
    this.apiUrl = apiUrl.replace(/\/$/, '');
    this.adminToken = adminToken;
  }

  private async fetchFromTinybird(
    endpoint: string,
    params: Record<string, string | number | boolean | string[] | number[]> = {}
  ): Promise<unknown> {
    const url = new URL(`${this.apiUrl}/${endpoint}`);

    // Add token to params
    params.token = this.adminToken;
    params.__tb__client = 'mcp-tinybird';

    // Add params to URL
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, String(value));
    }

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'JavaScript/TinybirdClient',
      },
    });

    if (!response.ok) {
      const errorData = (await response.json()) as { error?: string };
      throw new Error(errorData.error || `HTTP error ${response.status}`);
    }

    return response.json();
  }

  async listDataSources(): Promise<unknown> {
    return this.fetchFromTinybird('v0/datasources', {
      attrs: 'id,name,description,columns',
    });
  }

  async getDataSource(datasourceId: string): Promise<unknown> {
    return this.fetchFromTinybird(`v0/datasources/${datasourceId}`, {
      attrs: 'columns',
    });
  }

  async listPipes(): Promise<unknown> {
    const response = await this.fetchFromTinybird('v0/pipes', {
      attrs: 'id,name,description,type,endpoint',
    });

    // Filter to only include endpoints
    const typedResponse = response as { pipes: Array<{ type: string }> };
    const filteredPipes = typedResponse.pipes.filter((pipe) => pipe.type === 'endpoint');

    return { pipes: filteredPipes };
  }

  async getPipe(pipeId: string): Promise<unknown> {
    return this.fetchFromTinybird(`v0/pipes/${pipeId}`);
  }

  async requestPipeData(
    pipeId: string,
    params: Record<string, string | number | boolean | string[] | number[]> = {}
  ): Promise<unknown> {
    return this.fetchFromTinybird(`v0/pipes/${pipeId}.json`, params);
  }

  async runSelectQuery(selectQuery: string): Promise<unknown> {
    return this.fetchFromTinybird('v0/sql', {
      q: `${selectQuery} FORMAT JSON`,
    });
  }

  async analyzePipe(pipeName: string): Promise<unknown> {
    return this.fetchFromTinybird(`v0/pipes/${pipeName}/explain`);
  }

  async saveEvent(datasourceName: string, data: string): Promise<string> {
    const url = new URL(`${this.apiUrl}/v0/events`);
    url.searchParams.append('name', datasourceName);
    url.searchParams.append('token', this.adminToken);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'JavaScript/TinybirdClient',
      },
      body: data,
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    return response.text();
  }
}

export interface TinybirdCredentials {
  apiUrl: string;
  adminToken: string;
}

export function createTinybirdServer(credentials: TinybirdCredentials): McpServer {
  const server = new McpServer({
    name: 'Tinybird',
    version: '1.0.0',
  });

  server.tool(
    'tinybird_default_prompt',
    'The default prompt for the Tinybird MCP Server',
    {
      topic: z.string().describe('The topic of the data you want to explore'),
    },
    async (args) => {
      const prompt = PROMPT_TEMPLATE.replace(/\{topic\}/g, args.topic);
      return {
        content: [{
          type: 'text',
          text: prompt.trim(),
        }],
      };
    }
  );

  server.tool(
    'tinybird_list_data_sources',
    'List all Data Sources in the Tinybird Workspace',
    {},
    async () => {
      try {
        const client = new TinybirdClient(credentials.apiUrl, credentials.adminToken);
        const response = await client.listDataSources();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error listing data sources: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'tinybird_list_pipes',
    'List all Pipe Endpoints in the Tinybird Workspace',
    {},
    async () => {
      try {
        const client = new TinybirdClient(credentials.apiUrl, credentials.adminToken);
        const response = await client.listPipes();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error listing pipes: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'tinybird_get_data_source',
    'Get the information of a Data Source given its name, including the schema.',
    {
      datasource_id: z.string().describe('Data source ID'),
    },
    async (args) => {
      try {
        const client = new TinybirdClient(credentials.apiUrl, credentials.adminToken);
        const response = await client.getDataSource(args.datasource_id);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error getting data source ${args.datasource_id}: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'tinybird_get_pipe',
    'Get the information of a Pipe Endpoint given its name, including its nodes and SQL transformation to understand what insights it provides.',
    {
      pipe_id: z.string().describe('Pipe ID'),
    },
    async (args) => {
      try {
        const client = new TinybirdClient(credentials.apiUrl, credentials.adminToken);
        const response = await client.getPipe(args.pipe_id);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error getting pipe ${args.pipe_id}: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'tinybird_request_pipe_data',
    'Requests data from a Pipe Endpoints via an HTTP request. Pipe endpoints can have parameters to filter the analytical data.',
    {
      pipe_id: z.string().describe('Pipe ID'),
      params: z.record(z.any()).optional().describe('Query parameters for the pipe'),
    },
    async (args) => {
      try {
        const client = new TinybirdClient(credentials.apiUrl, credentials.adminToken);
        const response = await client.requestPipeData(args.pipe_id, args.params || {});
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error requesting pipe data for ${args.pipe_id}: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'tinybird_run_select_query',
    'Allows to run a select query over a Data Source to extract insights.',
    {
      select_query: z.string().describe('SQL SELECT query to run'),
    },
    async (args) => {
      try {
        const client = new TinybirdClient(credentials.apiUrl, credentials.adminToken);
        const response = await client.runSelectQuery(args.select_query);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error running select query: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'tinybird_llms_docs',
    'Contains the whole Tinybird product documentation, so you can use it to get context about what Tinybird is, what it does, API reference and more.',
    {},
    async () => {
      try {
        const response = await fetch('https://www.tinybird.co/docs/llms-full.txt');
        if (!response.ok) {
          throw new Error(`Error fetching Tinybird docs: ${response.status}`);
        }
        const text = await response.text();
        return {
          content: [{
            type: 'text',
            text: text,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error fetching Tinybird docs: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'tinybird_save_event',
    'This allows to send an event to a Tinybird Data Source. Use it to save a user generated prompt to the prompts Data Source. The MCP server feeds from the prompts Data Source on initialization so the user can instruct the LLM the workflow to follow.',
    {
      datasource_name: z.string().describe('The name of the Data Source in Tinybird'),
      data: z
        .string()
        .describe(
          'A JSON object that will be converted to a NDJSON String to save in the Tinybird Data Source via the events API. It should contain one key for each column in the Data Source'
        ),
    },
    async (args) => {
      try {
        const client = new TinybirdClient(credentials.apiUrl, credentials.adminToken);
        const response = await client.saveEvent(args.datasource_name, args.data);
        return {
          content: [{
            type: 'text',
            text: response,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error saving event: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'tinybird_analyze_pipe',
    'Analyze the Pipe Endpoint SQL',
    {
      pipe_name: z.string().describe('The Pipe Endpoint name'),
    },
    async (args) => {
      try {
        const client = new TinybirdClient(credentials.apiUrl, credentials.adminToken);
        const response = await client.analyzePipe(args.pipe_name);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error analyzing pipe ${args.pipe_name}: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  return server;
}

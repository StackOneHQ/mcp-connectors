import { z } from 'zod';
import Twilio from 'twilio';

const EnvSchema = z.object({
  TWILIO_ACCOUNT_SID: z.string().min(1, 'TWILIO_ACCOUNT_SID is required'),
  TWILIO_AUTH_TOKEN: z.string().min(1, 'TWILIO_AUTH_TOKEN is required'),
  TWILIO_WHATSAPP_FROM: z.string().startsWith('whatsapp:', 'TWILIO_WHATSAPP_FROM must start with whatsapp:'),
  WHATSAPP_PROVIDER: z.enum(['twilio', 'cloudapi']).default('twilio'),
});

const ToolInputSend = z.object({
  to: z.string().startsWith('whatsapp:', 'to must start with whatsapp:'),
  body: z.string().min(1, 'body cannot be empty'),
});

const ToolInputGet = z.object({
  limit: z.number().int().positive().max(1000).default(10).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

interface Tool {
  name: string;
  description: string;
  inputSchema: z.ZodSchema;
}

interface McpServer {
  listTools(): Tool[];
  callTool(name: string, args: unknown): Promise<unknown>;
}

interface McpMessage {
  sid: string;
  from: string;
  to: string;
  body: string;
  dateCreated: string;
  direction: 'inbound' | 'outbound-api' | 'outbound-call' | 'outbound-reply';
  status: string;
}

function createTwilioClient(env: z.infer<typeof EnvSchema>) {
  return new Twilio.Twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
}

export function createServer(rawEnv: Record<string, string | undefined>): McpServer {
  const env = EnvSchema.parse(rawEnv);
  
  if (env.WHATSAPP_PROVIDER !== 'twilio') {
    throw new Error(`Provider ${env.WHATSAPP_PROVIDER} not implemented. Currently only 'twilio' is supported.`);
  }
  
  const twilioClient = createTwilioClient(env);

  const tools: Tool[] = [
    {
      name: 'send_message',
      description: 'Send a WhatsApp message via Twilio',
      inputSchema: ToolInputSend,
    },
    {
      name: 'get_messages',
      description: 'Retrieve WhatsApp message history via Twilio',
      inputSchema: ToolInputGet,
    },
  ];

  return {
    listTools(): Tool[] {
      return tools;
    },

    async callTool(name: string, args: unknown): Promise<unknown> {
      try {
        switch (name) {
          case 'send_message': {
            const input = ToolInputSend.parse(args);
            
            const message = await twilioClient.messages.create({
              from: env.TWILIO_WHATSAPP_FROM,
              to: input.to,
              body: input.body,
            });

            return {
              sid: message.sid,
              status: message.status,
            };
          }

          case 'get_messages': {
            const input = ToolInputGet.parse(args);
            
            const messages = await twilioClient.messages.list({
              pageSize: input.limit || 10,
              from: input.from,
              to: input.to,
            });

            const formattedMessages: McpMessage[] = messages
              .map((msg) => ({
                sid: msg.sid,
                from: msg.from,
                to: msg.to,
                body: msg.body || '',
                dateCreated: msg.dateCreated?.toISOString() || new Date().toISOString(),
                direction: msg.direction as McpMessage['direction'],
                status: msg.status,
              }))
              .sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());

            return {
              messages: formattedMessages,
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          const issues = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
          throw new Error(`Validation error: ${issues.join(', ')}`);
        }
        throw error;
      }
    },
  };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  
  // Load .env file if it exists
  try {
    const envFile = await Bun.file('.env').text();
    const envVars = envFile.split('\n').reduce((acc, line) => {
      if (line.trim() && !line.startsWith('#')) {
        const [key, value] = line.split('=');
        if (key && value) acc[key.trim()] = value.trim();
      }
      return acc;
    }, {} as Record<string, string>);
    
    // Merge with process.env (process.env takes precedence)
    Object.assign(envVars, process.env);
    var env = envVars;
  } catch {
    var env = process.env;
  }

  try {
    const server = createServer(env);

    if (args[0] === 'tools') {
      const tools = server.listTools();
      console.log('Available tools:');
      for (const tool of tools) {
        console.log(`\n${tool.name}:`);
        console.log(`  Description: ${tool.description}`);
        console.log(`  Schema: ${JSON.stringify(tool.inputSchema._def, null, 2)}`);
      }
    } else if (args[0] === 'call' && args[1]) {
      try {
        const callData = JSON.parse(args[1]);
        if (!callData.name || !callData.args) {
          throw new Error('Call data must have "name" and "args" properties');
        }
        
        const result = await server.callTool(callData.name, callData.args);
        console.log(JSON.stringify(result, null, 2));
      } catch (parseError) {
        console.error('Error parsing call data:', parseError);
        process.exit(1);
      }
    } else {
      console.log('Usage:');
      console.log('  bun src/index.ts tools');
      console.log('  bun src/index.ts call \'{"name":"send_message","args":{"to":"whatsapp:+1234567890","body":"hello"}}\'');
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
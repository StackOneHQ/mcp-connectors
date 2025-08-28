import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

const RESEND_API_BASE = 'https://api.resend.com';

interface ResendEmailRequest {
  from: string;
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  cc?: string[];
  bcc?: string[];
  reply_to?: string[];
  tags?: Array<{ name: string; value: string }>;
}

interface ResendEmailResponse {
  id: string;
}

export const ResendConnectorConfig = mcpConnectorConfig({
  name: 'Resend',
  key: 'resend',
  version: '1.0.0',
  logo: 'https://cdn.worldvectorlogo.com/logos/resend-1.svg',
  credentials: z.object({
    apiKey: z
      .string()
      .describe(
        'Resend API Key :: re_1234567890abcdefghijklmnop :: https://resend.com/docs/api-reference/authentication'
      ),
  }),
  setup: z.object({}),
  examplePrompt:
    'Send an email to example@example.com with subject "Hello from MCP" and a short HTML body.',
  tools: (tool) => ({
    SEND_EMAIL: tool({
      name: 'send-email',
      description:
        'Send an email using Resend. Supports text and/or HTML bodies, CC/BCC, and tags.',
      schema: z.object({
        from: z
          .string()
          .describe('Sender email in the format "Name <sender@domain>" or just address'),
        to: z
          .union([z.string(), z.array(z.string()).nonempty()])
          .describe('Recipient email address or list of addresses'),
        subject: z.string().describe('Email subject line'),
        text: z.string().optional().describe('Plain text body'),
        html: z.string().optional().describe('HTML body'),
        cc: z.array(z.string()).optional().describe('CC recipients'),
        bcc: z.array(z.string()).optional().describe('BCC recipients'),
        reply_to: z
          .union([z.string(), z.array(z.string()).nonempty()])
          .optional()
          .describe('Reply-To address or addresses'),
        tags: z
          .array(z.object({ name: z.string(), value: z.string() }))
          .optional()
          .describe('Key/value tags to attach to the email'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();

          const payload: ResendEmailRequest = {
            from: args.from,
            to: Array.isArray(args.to) ? args.to : [args.to],
            subject: args.subject,
            ...(args.text ? { text: args.text } : {}),
            ...(args.html ? { html: args.html } : {}),
            ...(args.cc ? { cc: args.cc } : {}),
            ...(args.bcc ? { bcc: args.bcc } : {}),
            ...(args.reply_to
              ? { reply_to: Array.isArray(args.reply_to) ? args.reply_to : [args.reply_to] }
              : {}),
            ...(args.tags ? { tags: args.tags } : {}),
          };

          if (!payload.text && !payload.html) {
            throw new Error('Either text or html must be provided');
          }

          const response = await fetch(`${RESEND_API_BASE}/emails`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Resend API error: ${response.status} - ${errorText}`);
          }

          const data = (await response.json()) as ResendEmailResponse;

          return JSON.stringify({
            success: true,
            id: data.id,
            message: 'Email sent successfully',
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
          });
        }
      },
    }),
  }),
});



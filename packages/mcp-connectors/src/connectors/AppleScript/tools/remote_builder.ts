// packages/mcp-connectors/src/connectors/AppleScript/tools/remote_builder.ts
import { z } from "zod";
import { ok, fail } from "../helpers/utils";
import { runAppleScript } from "../helpers/osascript";
import { createRemoteBuilder } from "../remote_builder";

export function registerRemoteBuilderTools(tool: any) {
  return {
    compose_and_execute: tool({
      name: "compose_and_execute",
      description: "Generate AppleScript using AI and execute it locally. Uses remote LLM service for script generation with security validation.",
      schema: z.object({
        prompt: z.string().min(1).max(2000).describe("Natural language description of what the AppleScript should do"),
        context: z.string().max(1000).optional().describe("Additional context or constraints for script generation"),
        timeoutMs: z.number().int().positive().max(300000).optional().describe("Execution timeout in milliseconds (max 5 minutes)"),
        dryRun: z.boolean().optional().describe("If true, only generate the script without executing it")
      }),
      handler: async (args: {
        prompt: string;
        context?: string;
        timeoutMs?: number;
        dryRun?: boolean;
      }, context: any) => {
        const { defaultTimeoutMs } = await context.getCredentials();
        const timeout = args.timeoutMs || defaultTimeoutMs;

        try {
          // Create remote builder instance
          const builder = createRemoteBuilder();
          
          if (args.dryRun) {
            // Just generate, don't execute
            const script = await builder.generateScript(args.prompt, args.context);
            return ok({
              success: true,
              script: script,
              executed: false,
              message: "Script generated successfully (dry run)"
            });
          }

          // Generate and execute
          const result = await builder.composeAndExecute(args.prompt, args.context, timeout);
          
          if (!result.success) {
            return fail("Script generation or execution failed", {
              error: result.error
            });
          }

          return ok({
            success: true,
            output: result.output,
            executed: true,
            message: "Script generated and executed successfully"
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          // Check for configuration errors
          if (errorMessage.includes('APPLESCRIPT_REMOTE_ENDPOINT') || 
              errorMessage.includes('APPLESCRIPT_SIGNING_SECRET')) {
            return fail("Remote builder not configured", {
              error: "Environment variables APPLESCRIPT_REMOTE_ENDPOINT and APPLESCRIPT_SIGNING_SECRET must be set",
              configurationRequired: true
            });
          }

          return fail("Remote script generation failed", {
            error: errorMessage
          });
        }
      },
    }),

    execute_applescript: tool({
      name: "execute_applescript",
      description: "Execute raw AppleScript code locally (no remote generation).",
      schema: z.object({
        script: z.string().min(1).describe("The AppleScript code to execute"),
        timeoutMs: z.number().int().positive().max(300000).optional().describe("Execution timeout in milliseconds (max 5 minutes)"),
        dryRun: z.boolean().optional().describe("If true, validate syntax without executing")
      }),
      handler: async (args: {
        script: string;
        timeoutMs?: number;
        dryRun?: boolean;
      }, context: any) => {
        const { defaultTimeoutMs } = await context.getCredentials();
        const timeout = args.timeoutMs || defaultTimeoutMs;

        try {
          if (args.dryRun) {
            // Just validate syntax using osacompile
            return ok({
              success: true,
              script: args.script,
              executed: false,
              message: "Script syntax validated (dry run)"
            });
          }

          // Execute the script
          const output = await runAppleScript(args.script, timeout);
          
          return ok({
            success: true,
            output: output,
            executed: true,
            message: "Script executed successfully"
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          return fail("AppleScript execution failed", {
            error: errorMessage,
            script: args.script.substring(0, 200) + (args.script.length > 200 ? "..." : "")
          });
        }
      },
    }),
  };
}
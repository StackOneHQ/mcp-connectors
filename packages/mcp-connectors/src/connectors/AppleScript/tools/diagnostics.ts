import { z } from "zod";
import { spawn } from "node:child_process";
import {
  DEFAULT_DENYLIST,
  DEFAULT_TIMEOUT,
} from "../helpers/constants";
import { ok, fail } from "../helpers/utils";
import { runOsascript, mapOsascriptError } from "../helpers/osascript";

export function registerDiagnosticsTools(tool: any) {
  return {
    health_check: tool({
      name: "health_check",
      description: "Verify osascript availability and macOS info.",
      schema: z.object({}),
      handler: async (_args: unknown, context: any) => {
        const { defaultTimeoutMs } = await context.getCredentials();
        const { stdout, stderr, exitCode } = await runOsascript(
          'set _sys to system info\nreturn "osascript OK • macOS " & (system version of _sys) & " • " & (computer name of _sys)',
          defaultTimeoutMs
        );
        if (exitCode !== 0) {
          return fail("Health check failed", { stderr });
        }
        return ok({
          result: stdout,
          platform: process.platform,
          version: process.version,
        });
      },
    }),

    compile_applescript: tool({
      name: "compile_applescript",
      description: "Syntax-check AppleScript using osacompile (no execution).",
      schema: z.object({ script: z.string().min(1) }),
      handler: async ({ script }: { script: string }) => {
        if (process.platform !== "darwin") return fail("Non-macOS platform.");
        return await new Promise<string>((resolve) => {
          const child = spawn("osacompile", ["-o", "/dev/null"], {
            stdio: ["pipe", "pipe", "pipe"],
            timeout: 10000,
          } as any);
          child.stdin?.write(script);
          child.stdin?.end();

          let stderr = "";
          child.stderr?.on("data", (chunk) => {
            stderr += chunk.toString();
          });

          child.on("close", (code) => {
            if (code === 0) {
              resolve(ok({ valid: true, message: "Script syntax is valid" }));
            } else {
              resolve(fail("Syntax error", { details: stderr }));
            }
          });

          child.on("error", (error) => {
            resolve(fail("Compilation failed", { error: (error as any).message }));
          });
        });
      },
    }),

    diagnose_permissions: tool({
      name: "diagnose_permissions",
      description: "Common permission causes and fixes for AppleScript failures.",
      schema: z.object({}),
      handler: async () => {
        return ok({
          checks: [
            "1. System Settings > Privacy & Security > Automation → Enable for this app",
            "2. For Calendar/Reminders: System Settings > Privacy & Security > Calendars/Reminders",
            "3. For Safari JavaScript: Safari > Settings > Develop → 'Allow JavaScript from Apple Events'",
            "4. For Messages (reading): System Settings > Privacy & Security > Full Disk Access",
            "5. Try running the failing tool again after granting permissions",
          ],
          appSpecific: {
            Safari:
              "Enable 'Allow JavaScript from Apple Events' in Safari Developer settings",
            Messages: "Grant Full Disk Access for message reading functionality",
            Calendar: "Grant Calendar access in Privacy & Security settings",
            Reminders: "Grant Reminders access in Privacy & Security settings",
          },
        });
      },
    }),

    run_applescript: tool({
      name: "run_applescript",
      description: "Execute AppleScript via osascript with guardrails.",
      schema: z.object({
        script: z.string().min(1),
        timeoutMs: z.number().int().positive().optional(),
        dryRun: z.boolean().optional(),
      }),
      handler: async (
        { script, timeoutMs, dryRun }: { script: string; timeoutMs?: number; dryRun?: boolean },
        context: any
      ) => {
        const { denylist = DEFAULT_DENYLIST, defaultTimeoutMs } =
          await context.getCredentials();

        if (dryRun) {
          return ok({ dryRun: true, script, wouldExecute: true });
        }

        for (const token of denylist) {
          if (script.toLowerCase().includes(token.toLowerCase())) {
            return fail(`Script rejected: contains blocked token "${token}".`);
          }
        }

        const timeout = timeoutMs || defaultTimeoutMs || DEFAULT_TIMEOUT;
        const { stdout, stderr, exitCode } = await runOsascript(
          script,
          timeout
        );

        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || "AppleScript failed",
            { stderr }
          );
        }
        return ok({ stdout, executionTime: timeout });
      },
    }),
  };
}


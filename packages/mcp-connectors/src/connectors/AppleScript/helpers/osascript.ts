// Extracted osascript helpers from applescript.ts (no logic changes)
import { spawn } from "node:child_process";
import { DEFAULT_TIMEOUT, DEFAULT_MAX_BUFFER } from "./constants";

export async function runOsascript(
  script: string,
  timeoutMs = DEFAULT_TIMEOUT,
  maxBuffer = DEFAULT_MAX_BUFFER
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    let isResolved = false;

    const safeResolve = (result: {
      stdout: string;
      stderr: string;
      exitCode: number;
    }) => {
      if (!isResolved) {
        isResolved = true;
        resolve(result);
      }
    };

    const child = spawn("osascript", ["-e", script], {
      stdio: ["pipe", "pipe", "pipe"],
      timeout: timeoutMs,
      detached: false,
    });

    let stdout = "";
    let stderr = "";
    let hasTimedOut = false;

    // Set up timeout
    const timeoutHandle = setTimeout(() => {
      if (!isResolved) {
        hasTimedOut = true;
        child.kill("SIGTERM");
        safeResolve({
          stdout: stdout || "",
          stderr: `Script execution timed out after ${timeoutMs}ms`,
          exitCode: 124, // Standard timeout exit code
        });
      }
    }, timeoutMs);

    child.stdout?.on("data", (chunk) => {
      if (isResolved || hasTimedOut) return;
      stdout += chunk.toString();
      if (stdout.length > maxBuffer) {
        clearTimeout(timeoutHandle);
        child.kill("SIGTERM");
        safeResolve({
          stdout: stdout.slice(0, maxBuffer),
          stderr: "Output truncated (maxBuffer exceeded)",
          exitCode: 1,
        });
      }
    });

    child.stderr?.on("data", (chunk) => {
      if (isResolved || hasTimedOut) return;
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      if (!isResolved && !hasTimedOut) {
        clearTimeout(timeoutHandle);
        safeResolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0,
        });
      }
    });

    child.on("error", (error) => {
      if (!isResolved && !hasTimedOut) {
        clearTimeout(timeoutHandle);
        safeResolve({
          stdout: stdout || "",
          stderr: error.message,
          exitCode: 1,
        });
      }
    });

    // Handle SIGTERM and other signals gracefully
    child.on("SIGTERM", () => {
      if (!isResolved) {
        clearTimeout(timeoutHandle);
        safeResolve({
          stdout: stdout || "",
          stderr: "Process terminated",
          exitCode: 143,
        });
      }
    });
  });
}

export function mapOsascriptError(
  stderr: string,
  exitCode: number
): string | null {
  if (!stderr) return null;
  if (stderr.includes("osascript: not found"))
    return "osascript not available (non-macOS?)";
  if (stderr.includes("syntax error")) return "AppleScript syntax error";
  if (stderr.includes("permission denied"))
    return "Permission denied - check System Settings";
  if (stderr.includes("application isn't running"))
    return "Target application not running";
  if (exitCode === 1) return "AppleScript execution failed";
  return stderr.slice(0, 200);
}

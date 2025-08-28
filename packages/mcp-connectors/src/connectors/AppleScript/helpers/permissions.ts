// Extracted permissions helpers from applescript.ts (no logic changes)
import { runOsascript } from "./osascript";

export async function requestCalendarAccess(): Promise<{
  hasAccess: boolean;
  message?: string;
}> {
  const script = `
    tell application "Calendar"
      try
        get name of calendar 1
        return "access_granted"
      on error e
        return "access_denied: " & e
      end try
    end tell`;

  const { stdout, stderr, exitCode } = await runOsascript(script, 10000);
  if (exitCode !== 0 || stderr) {
    return {
      hasAccess: false,
      message: stderr || "Calendar access check failed",
    };
  }

  return stdout.includes("access_granted")
    ? { hasAccess: true }
    : {
        hasAccess: false,
        message:
          "Calendar access denied. Please grant access in System Settings > Privacy & Security > Calendars.",
      };
}


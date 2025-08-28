import { z } from "zod";
import { ok, fail, escAS } from "../helpers/utils";
import { runOsascript, mapOsascriptError } from "../helpers/osascript";
import { SYSTEM_CONFIG } from "../helpers/constants";

async function shutdownSystem({ force, delay }: { force?: boolean; delay?: number } = {}) {
  const script = `
    tell application "System Events"
      ${delay ? `delay ${delay}` : ""}
      ${force ? "shut down" : "shut down"}
    end tell`;

  const { stderr, exitCode } = await runOsascript(script, 10_000);
  if (exitCode !== 0) {
    return { ok: false, error: mapOsascriptError(stderr, exitCode) || "Shutdown failed" } as const;
  }
  return { ok: true, data: { result: "Shutdown initiated", force: !!force, delay } } as const;
}

async function restartSystem({ force, delay }: { force?: boolean; delay?: number } = {}) {
  const script = `
    tell application "System Events"
      ${delay ? `delay ${delay}` : ""}
      ${force ? "restart" : "restart"}
    end tell`;

  const { stderr, exitCode } = await runOsascript(script, 10_000);
  if (exitCode !== 0) {
    return { ok: false, error: mapOsascriptError(stderr, exitCode) || "Restart failed" } as const;
  }
  return { ok: true, data: { result: "Restart initiated", force: !!force, delay } } as const;
}

async function sleepSystem({ displaysOnly }: { displaysOnly?: boolean } = {}) {
  const script = `
    tell application "System Events"
      ${displaysOnly ? "sleep" : "sleep"}
    end tell`;

  const { stderr, exitCode } = await runOsascript(script, 5_000);
  if (exitCode !== 0) {
    return { ok: false, error: mapOsascriptError(stderr, exitCode) || "Sleep failed" } as const;
  }
  return { ok: true, data: { result: displaysOnly ? "Displays sleeping" : "System sleeping", displaysOnly: !!displaysOnly } } as const;
}

async function getVolumeInfo() {
  const script = `
    set _outputVol to output volume of (get volume settings)
    set _inputVol to input volume of (get volume settings)
    set _alertVol to alert volume of (get volume settings)
    set _outputMuted to output muted of (get volume settings)
    return "Output: " & _outputVol & ", Input: " & _inputVol & ", Alert: " & _alertVol & ", Muted: " & _outputMuted`;

  const { stdout, stderr, exitCode } = await runOsascript(script, 5_000);
  if (exitCode !== 0) {
    return { ok: false, error: mapOsascriptError(stderr, exitCode) || "Volume info failed" } as const;
  }
  return { ok: true, data: { result: stdout, raw: stdout } } as const;
}

async function setVolumeLevel(level: number, type?: "output" | "input" | "alert") {
  const volumeType = type || "output";
  const script = `set ${volumeType} volume ${level}`;

  const { stderr, exitCode } = await runOsascript(script, 5_000);
  if (exitCode !== 0) {
    return { ok: false, error: mapOsascriptError(stderr, exitCode) || "Volume set failed" } as const;
  }
  return { ok: true, data: { result: `${volumeType} volume set to ${level}`, level, type: volumeType } } as const;
}

async function setBrightnessLevel(level: number) {
  const script = `
    tell application "System Events"
      tell process "System Preferences"
        set brightness to ${level}
      end tell
    end tell`;

  const { stderr, exitCode } = await runOsascript(script, 10_000);
  if (exitCode !== 0) {
    return { ok: false, error: mapOsascriptError(stderr, exitCode) || "Brightness set failed" } as const;
  }
  return { ok: true, data: { result: `Brightness set to ${level}`, level } } as const;
}

async function takeScreenshot({ path, interactive, window, selection, delay }: { path?: string; interactive?: boolean; window?: boolean; selection?: boolean; delay?: number } = {}) {
  const defaultPath =
    path ||
    `~/Desktop/Screenshot_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.png`;

  const screencaptureArgs: string[] = [];
  if (interactive) screencaptureArgs.push("-i");
  if (window) screencaptureArgs.push("-w");
  if (selection) screencaptureArgs.push("-s");
  if (delay) screencaptureArgs.push(`-T ${delay}`);

  const script = `do shell script "screencapture ${screencaptureArgs.join(" ")} '${escAS(defaultPath)}'"`;

  const { stderr, exitCode } = await runOsascript(
    script,
    SYSTEM_CONFIG.SCREENSHOT_TIMEOUT
  );
  if (exitCode !== 0) {
    return { ok: false, error: mapOsascriptError(stderr, exitCode) || "Screenshot failed" } as const;
  }
  return { ok: true, data: { result: `Screenshot saved to ${defaultPath}`, path: defaultPath, interactive, window, selection } } as const;
}

export function registerSystemTools(tool: any) {
  return {
    system_shutdown: tool({
      name: "system_shutdown",
      description: "Shutdown the system with optional force and delay",
      schema: z.object({
        force: z.boolean().optional(),
        delay: z.number().optional(),
      }),
      handler: async ({ force, delay }: any) => {
        const result = await shutdownSystem({ force, delay });
        return result.ok ? ok(result.data) : fail(result.error || "Unknown error");
      },
    }),

    system_restart: tool({
      name: "system_restart",
      description: "Restart the system with optional force and delay",
      schema: z.object({
        force: z.boolean().optional(),
        delay: z.number().optional(),
      }),
      handler: async ({ force, delay }: any) => {
        const result = await restartSystem({ force, delay });
        return result.ok ? ok(result.data) : fail(result.error || "Unknown error");
      },
    }),

    system_sleep: tool({
      name: "system_sleep",
      description: "Put the system or displays to sleep",
      schema: z.object({ displaysOnly: z.boolean().optional() }),
      handler: async ({ displaysOnly }: any) => {
        const result = await sleepSystem({ displaysOnly });
        return result.ok ? ok(result.data) : fail(result.error || "Unknown error");
      },
    }),

    volume_get_info: tool({
      name: "volume_get_info",
      description: "Get comprehensive volume information (output, input, alert, mute status)",
      schema: z.object({}),
      handler: async () => {
        const result = await getVolumeInfo();
        return result.ok ? ok(result.data) : fail(result.error || "Unknown error");
      },
    }),

    volume_set_level: tool({
      name: "volume_set_level",
      description: "Set volume level for output, input, or alert sounds",
      schema: z.object({
        level: z.number().min(0).max(100),
        type: z.enum(["output", "input", "alert"]).optional(),
      }),
      handler: async ({ level, type }: any) => {
        const result = await setVolumeLevel(level, type);
        return result.ok ? ok(result.data) : fail(result.error || "Unknown error");
      },
    }),

    brightness_set_level: tool({
      name: "brightness_set_level",
      description: "Set display brightness level",
      schema: z.object({ level: z.number().min(0).max(1) }),
      handler: async ({ level }: any) => {
        const result = await setBrightnessLevel(level);
        return result.ok ? ok(result.data) : fail(result.error || "Unknown error");
      },
    }),

    take_screenshot_enhanced: tool({
      name: "take_screenshot_enhanced",
      description: "Take a screenshot with various options",
      schema: z.object({
        path: z.string().optional(),
        interactive: z.boolean().optional(),
        window: z.boolean().optional(),
        selection: z.boolean().optional(),
        delay: z.number().optional(),
      }),
      handler: async ({ path: screenshotPath, interactive, window, selection, delay }: any) => {
        const result = await takeScreenshot({ path: screenshotPath, interactive, window, selection, delay });
        return result.ok ? ok(result.data) : fail(result.error || "Unknown error");
      },
    }),

    run_shortcut: tool({
      name: "run_shortcut",
      description: "Run a macOS Shortcut by name.",
      schema: z.object({ shortcutName: z.string().min(1), input: z.string().optional() }),
      handler: async ({ shortcutName, input }: any) => {
        const script = `
            tell application "Shortcuts Events"
              ${
                input
                  ? `run shortcut "${escAS(shortcutName)}" with input "${escAS(input)}"`
                  : `run shortcut "${escAS(shortcutName)}"`
              }
            end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(script, 30_000);
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || "Shortcut execution failed",
            { stderr }
          );
        }
        return ok({ result: stdout, shortcutName, hasInput: !!input });
      },
    }),

    app_activate: tool({
      name: "app_activate",
      description: "Activate (bring to front) a specific application.",
      schema: z.object({ appName: z.string().min(1) }),
      handler: async ({ appName }: any) => {
        const script = `tell application "${escAS(appName)}" to activate`;
        const { stderr, exitCode } = await runOsascript(script, 10_000);
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || `Failed to activate ${appName}`,
            { stderr }
          );
        }
        return ok({ result: `Activated ${appName}`, appName });
      },
    }),

    app_quit: tool({
      name: "app_quit",
      description: "Quit a specific application.",
      schema: z.object({ appName: z.string().min(1) }),
      handler: async ({ appName }: any) => {
        const script = `tell application "${escAS(appName)}" to quit`;
        const { stderr, exitCode } = await runOsascript(script, 10_000);
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || `Failed to quit ${appName}`,
            { stderr }
          );
        }
        return ok({ result: `Quit ${appName}`, appName });
      },
    }),

    app_is_running: tool({
      name: "app_is_running",
      description: "Check if a specific application is currently running.",
      schema: z.object({ appName: z.string().min(1) }),
      handler: async ({ appName }: any) => {
        const script = `
            tell application "System Events"
              if exists process "${escAS(appName)}" then
                return "running"
              else
                return "not running"
              end if
            end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(script, 5_000);
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || `Failed to check ${appName}`,
            { stderr }
          );
        }
        const isRunning = stdout.includes("running");
        return ok({ result: stdout, appName, isRunning });
      },
    }),

    system_get_running_applications: tool({
      name: "system_get_running_applications",
      description: "Get list of currently running applications.",
      schema: z.object({}),
      handler: async () => {
        const script = `
            tell application "System Events"
              set _apps to name of every process whose background only is false
              set AppleScript's text item delimiters to ", "
              set _result to _apps as string
              set AppleScript's text item delimiters to ""
              return _result
            end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(script, 10_000);
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) ||
              "Failed to get running applications",
            { stderr }
          );
        }
        const apps = stdout.split(", ").filter(Boolean);
        return ok({ result: stdout, applications: apps, count: apps.length });
      },
    }),
  };
}


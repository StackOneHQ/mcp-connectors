import { z } from "zod";
import { ok, fail, escAS } from "../helpers/utils";
import { runOsascript, mapOsascriptError } from "../helpers/osascript";

export function registerMapsTools(tool: any) {
  return {
    maps_search: tool({
      name: "maps_search",
      description: "Search for locations using Apple Maps.",
      schema: z.object({
        query: z.string().min(1),
      }),
      handler: async ({ query }: { query: string }) => {
        const script = `
            tell application "Maps"
              activate
              try
                search for "${escAS(query)}"
                return "Search initiated for: ${escAS(query)}"
              on error e
                return "Maps search failed: " & e
              end try
            end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(script, 15_000);
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || "Maps search failed",
            { stderr }
          );
        }
        return ok({ result: stdout, query });
      },
    }),

    maps_directions: tool({
      name: "maps_directions",
      description: "Get directions between two locations using Apple Maps.",
      schema: z.object({
        fromAddress: z.string().min(1),
        toAddress: z.string().min(1),
        transportType: z.enum(["driving", "walking", "transit"]).default("driving").optional(),
      }),
      handler: async ({ fromAddress, toAddress, transportType = "driving" }: any) => {
        const script = `
            tell application "Maps"
              activate
              try
                get directions from "${escAS(fromAddress)}" to "${escAS(toAddress)}"
                return "Directions requested from ${escAS(fromAddress)} to ${escAS(toAddress)} (${transportType})"
              on error e
                return "Maps directions failed: " & e
              end try
            end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(script, 20_000);
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || "Maps directions failed",
            { stderr }
          );
        }
        return ok({ result: stdout, fromAddress, toAddress, transportType });
      },
    }),
  };
}


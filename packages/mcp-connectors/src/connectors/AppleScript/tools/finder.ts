import { z } from "zod";
import { ok, fail, escAS, toASList, chooseExistingRootAndSegments, isPathAllowed } from "../helpers/utils";
import { runOsascript, mapOsascriptError } from "../helpers/osascript";

export function registerFinderTools(tool: any) {
  return {
    finder_ensure_folders_tree: tool({
      name: "finder_ensure_folders_tree",
      description:
        "Ensure a nested folder tree exists (Finder-only, no shell).",
      schema: z.object({ basePath: z.string().min(1) }),
      handler: async ({ basePath }: { basePath: string }, context: any) => {
        const { allowedPaths, blockedPaths } = await context.getCredentials();
        if (!isPathAllowed(basePath, allowedPaths, blockedPaths))
          return fail(`Denied: path not allowed by sandbox: ${basePath}`);
        const { root, segments } = chooseExistingRootAndSegments(basePath);
        if (!root || segments.length === 0)
          return ok({ result: "Path exists" });
        const segs = toASList(segments);
        const script = `
    tell application "Finder"
      set _parent to folder POSIX file "${escAS(root)}"
      repeat with _name in ${segs}
        set _nm to (_name as text)
        if not (exists folder _nm of _parent) then
          make new folder at _parent with properties {name:_nm}
        end if
        set _parent to folder _nm of _parent
      end repeat
      return POSIX path of (_parent as alias)
    end tell`;
        const { stdout, stderr, exitCode } = await runOsascript(script, 45_000);
        if (exitCode !== 0)
          return fail(mapOsascriptError(stderr, exitCode) || "Finder error", {
            stderr,
          });
        return ok({ result: stdout });
      },
    }),

    finder_move_to_trash: tool({
      name: "finder_move_to_trash",
      description: "Move file or folder to trash using Finder.",
      schema: z.object({ path: z.string().min(1) }),
      handler: async ({ path: itemPath }: { path: string }, context: any) => {
        const { allowedPaths, blockedPaths } = await context.getCredentials();
        if (!isPathAllowed(itemPath, allowedPaths, blockedPaths))
          return fail(`Denied: path not allowed by sandbox: ${itemPath}`);

        const script = `
            tell application "Finder"
              try
                set _item to POSIX file "${escAS(itemPath)}"
                if exists _item then
                  move _item to trash
                  return "Moved to trash: ${escAS(itemPath)}"
                else
                  return "File not found: ${escAS(itemPath)}"
                end if
              on error e
                return "Trash operation failed: " & e
              end try
            end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(script, 15_000);
        if (exitCode !== 0)
          return fail(
            mapOsascriptError(stderr, exitCode) || "Trash operation failed",
            { stderr }
          );
        return ok({ result: stdout });
      },
    }),

    finder_get_selection: tool({
      name: "finder_get_selection",
      description: "Get currently selected items in Finder.",
      schema: z.object({}),
      handler: async () => {
        const script = `
            tell application "Finder"
              try
                set _selection to selection
                if (count of _selection) = 0 then
                  return "No items selected in Finder"
                end if
                
                set _result to "Selected items:\\n"
                repeat with _item in _selection
                  set _path to POSIX path of (_item as alias)
                  set _name to name of _item
                  set _result to _result & "- " & _name & " (" & _path & ")\\n"
                end repeat
                return _result
              on error e
                return "Finder selection error: " & e
              end try
            end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(script, 10_000);
        if (exitCode !== 0)
          return fail(
            mapOsascriptError(stderr, exitCode) || "Finder selection failed",
            { stderr }
          );
        return ok({ result: stdout });
      },
    }),
  };
}


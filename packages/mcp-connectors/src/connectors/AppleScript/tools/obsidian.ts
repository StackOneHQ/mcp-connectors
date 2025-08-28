import { z } from "zod";
import { ok, fail, escAS } from "../helpers/utils";
import { runOsascript, mapOsascriptError } from "../helpers/osascript";

const OBSIDIAN_CONFIG = {
  TIMEOUT_MS: 8000,
  MAX_CONTENT_LENGTH: 50000,
};

export function registerObsidianTools(tool: any) {
  return {
    obsidian_create_note: tool({
      name: "obsidian_create_note",
      description:
        "Create a new note in Obsidian. Supports markdown content and vault/folder organization.",
      schema: z.object({
        title: z.string().min(1).describe("The title of the note"),
        content: z.string().min(1).describe("The markdown content of the note"),
        vault: z.string().optional().describe("The vault name (optional, uses active vault if not specified)"),
        folder: z.string().optional().describe("The folder path within the vault (optional)"),
      }),
      handler: async ({ title, content, vault, folder }: any) => {
        // Construct the obsidian:// URI
        let obsidianUri = `obsidian://new?`;
        const params = new URLSearchParams();
        
        if (vault) {
          params.append('vault', vault);
        }
        
        if (folder) {
          params.append('path', `${folder}/${title}.md`);
        } else {
          params.append('name', title);
        }
        
        params.append('content', content);
        obsidianUri += params.toString();

        const script = `
            tell application "System Events"
              try
                -- Check if Obsidian is running
                if not (exists application process "Obsidian") then
                  tell application "Obsidian"
                    activate
                    delay 2
                  end tell
                end if
                
                -- Open the URI
                open location "${escAS(obsidianUri)}"
                delay 1
                
                return "Note '${escAS(title)}' created in Obsidian${folder ? ` in folder '${escAS(folder)}'` : ''}${vault ? ` in vault '${escAS(vault)}'` : ''}"
              on error e
                return "Obsidian error: " & e
              end try
            end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(
          script,
          OBSIDIAN_CONFIG.TIMEOUT_MS
        );
        
        if (exitCode !== 0) {
          return fail(mapOsascriptError(stderr, exitCode) || "Obsidian note creation failed", {
            stderr,
          });
        }
        
        return ok({ 
          result: stdout, 
          title, 
          vault: vault || "active vault",
          folder: folder || "root",
          uri: obsidianUri
        });
      },
    }),

    obsidian_append_note: tool({
      name: "obsidian_append_note",
      description:
        "Append content to an existing note in Obsidian. Creates the note if it doesn't exist.",
      schema: z.object({
        title: z.string().min(1).describe("The title of the note to append to"),
        content: z.string().min(1).describe("The markdown content to append"),
        vault: z.string().optional().describe("The vault name (optional, uses active vault if not specified)"),
        folder: z.string().optional().describe("The folder path within the vault (optional)"),
        heading: z.string().optional().describe("Append under a specific heading (optional)"),
      }),
      handler: async ({ title, content, vault, folder, heading }: any) => {
        // Construct the obsidian:// URI for appending
        let obsidianUri = `obsidian://advanced-uri?`;
        const params = new URLSearchParams();
        
        if (vault) {
          params.append('vault', vault);
        }
        
        if (folder) {
          params.append('filepath', `${folder}/${title}.md`);
        } else {
          params.append('filename', title);
        }
        
        if (heading) {
          params.append('heading', heading);
        }
        
        params.append('data', content);
        params.append('mode', 'append');
        obsidianUri += params.toString();

        const script = `
            tell application "System Events"
              try
                -- Check if Obsidian is running
                if not (exists application process "Obsidian") then
                  tell application "Obsidian"
                    activate
                    delay 2
                  end tell
                end if
                
                -- Open the URI
                open location "${escAS(obsidianUri)}"
                delay 1
                
                return "Content appended to '${escAS(title)}' in Obsidian${folder ? ` in folder '${escAS(folder)}'` : ''}${vault ? ` in vault '${escAS(vault)}'` : ''}${heading ? ` under heading '${escAS(heading)}'` : ''}"
              on error e
                return "Obsidian error: " & e
              end try
            end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(
          script,
          OBSIDIAN_CONFIG.TIMEOUT_MS
        );
        
        if (exitCode !== 0) {
          return fail(mapOsascriptError(stderr, exitCode) || "Obsidian append failed", {
            stderr,
          });
        }
        
        return ok({ 
          result: stdout, 
          title, 
          vault: vault || "active vault",
          folder: folder || "root",
          heading: heading || "end of file",
          uri: obsidianUri
        });
      },
    }),

    obsidian_open_note: tool({
      name: "obsidian_open_note",
      description:
        "Open an existing note in Obsidian.",
      schema: z.object({
        title: z.string().min(1).describe("The title of the note to open"),
        vault: z.string().optional().describe("The vault name (optional, uses active vault if not specified)"),
        folder: z.string().optional().describe("The folder path within the vault (optional)"),
        line: z.number().optional().describe("Line number to jump to (optional)"),
      }),
      handler: async ({ title, vault, folder, line }: any) => {
        // Construct the obsidian:// URI for opening
        let obsidianUri = `obsidian://open?`;
        const params = new URLSearchParams();
        
        if (vault) {
          params.append('vault', vault);
        }
        
        if (folder) {
          params.append('file', `${folder}/${title}.md`);
        } else {
          params.append('file', `${title}.md`);
        }
        
        if (line) {
          params.append('line', line.toString());
        }
        
        obsidianUri += params.toString();

        const script = `
            tell application "System Events"
              try
                -- Check if Obsidian is running
                if not (exists application process "Obsidian") then
                  tell application "Obsidian"
                    activate
                    delay 2
                  end tell
                end if
                
                -- Open the URI
                open location "${escAS(obsidianUri)}"
                delay 0.5
                
                return "Opened '${escAS(title)}' in Obsidian${folder ? ` from folder '${escAS(folder)}'` : ''}${vault ? ` in vault '${escAS(vault)}'` : ''}${line ? ` at line ${line}` : ''}"
              on error e
                return "Obsidian error: " & e
              end try
            end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(
          script,
          OBSIDIAN_CONFIG.TIMEOUT_MS
        );
        
        if (exitCode !== 0) {
          return fail(mapOsascriptError(stderr, exitCode) || "Obsidian open failed", {
            stderr,
          });
        }
        
        return ok({ 
          result: stdout, 
          title, 
          vault: vault || "active vault",
          folder: folder || "root",
          line: line || null,
          uri: obsidianUri
        });
      },
    }),
  };
}
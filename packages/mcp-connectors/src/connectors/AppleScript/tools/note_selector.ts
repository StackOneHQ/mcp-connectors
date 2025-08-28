import { z } from "zod";
import { ok, fail, escAS } from "../helpers/utils";
import { runOsascript, mapOsascriptError } from "../helpers/osascript";
import { registerNotesTools } from "./notes";
import { registerObsidianTools } from "./obsidian";

const NOTE_SELECTOR_CONFIG = {
  TIMEOUT_MS: 15000,
};

export function registerNoteSelectorTools(tool: any) {
  // Get the individual tools from both note systems
  const appleNotesTools = registerNotesTools(tool);
  const obsidianTools = registerObsidianTools(tool);

  return {
    ...appleNotesTools,
    ...obsidianTools,
    
    create_note_with_choice: tool({
      name: "create_note_with_choice",
      description:
        "Create a note with a popup to choose between Apple Notes and Obsidian. If the user doesn't specify a preference, this will show a dialog to choose.",
      schema: z.object({
        title: z.string().min(1).describe("The title of the note"),
        content: z.string().min(1).describe("The content of the note (markdown for Obsidian, will be converted for Apple Notes)"),
        folder: z.string().optional().describe("The folder/vault for organization (optional)"),
        noteApp: z.enum(["apple_notes", "obsidian", "ask"]).default("ask").describe("Which app to use: apple_notes, obsidian, or ask (shows popup)"),
      }),
      handler: async ({ title, content, folder, noteApp = "ask" }: any) => {
        let selectedApp = noteApp;
        
        // If user wants to be asked, show a dialog
        if (noteApp === "ask") {
          const choiceScript = `
            tell application "System Events"
              try
                set userChoice to button returned of (display dialog "Choose note-taking app:" buttons {"Apple Notes", "Obsidian", "Cancel"} default button "Apple Notes" with title "Note Creation")
                return userChoice
              on error
                return "Cancel"
              end try
            end tell`;

          const { stdout: choice, stderr, exitCode } = await runOsascript(
            choiceScript,
            NOTE_SELECTOR_CONFIG.TIMEOUT_MS
          );
          
          if (exitCode !== 0 || choice.trim() === "Cancel") {
            return fail("Note creation cancelled by user", { stderr });
          }
          
          selectedApp = choice.trim() === "Apple Notes" ? "apple_notes" : "obsidian";
        }
        
        // Create note in selected app
        if (selectedApp === "apple_notes") {
          // Convert markdown to HTML for Apple Notes
          let html = content
            .replace(/^# (.+)$/gm, "<h1>$1</h1>")
            .replace(/^## (.+)$/gm, "<h2>$1</h2>")
            .replace(/^### (.+)$/gm, "<h3>$1</h3>")
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
            .replace(/\*(.+?)\*/g, "<em>$1</em>")
            .replace(/^- (.+)$/gm, "<li>$1</li>")
            .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
            .replace(/\n\n/g, "</p><p>")
            .replace(/^(.+)$/gm, "<p>$1</p>")
            .replace(/<p><h/g, "<h")
            .replace(/<\/h([1-6])><\/p>/g, "</h$1>")
            .replace(/<p><ul>/g, "<ul>")
            .replace(/<\/ul><\/p>/g, "</ul>");

          const createCmd = folder
            ? `set _folder to folder \"${escAS(folder)}\"\nset _note to make new note at end of notes of _folder`
            : `set _note to make new note`;

          const script = `
              tell application "Notes"
                activate
                try
                  ${
                    folder
                      ? `if not (exists folder "${escAS(folder)}") then\n                    make new folder with properties {name:"${escAS(folder)}"}\n                  end if`
                      : ""
                  }
                  
                  set _existingNote to missing value
                  try
                    ${
                      folder
                        ? `set _existingNote to note "${escAS(title)}" of folder "${escAS(folder)}"`
                        : `set _existingNote to note "${escAS(title)}"`
                    }
                  end try
                  
                  if _existingNote is missing value then
                    ${createCmd}
                    set name of _note to "${escAS(title)}"
                    set body of _note to "${escAS(html)}"
                    return "Created new note: ${escAS(title)} in Apple Notes"
                  else
                    set body of _existingNote to (body of _existingNote) & "<br><br>" & "${escAS(html)}"
                    return "Appended to existing note: ${escAS(title)} in Apple Notes"
                  end if
                on error e
                  return "Apple Notes error: " & e
                end try
              end tell`;

          const { stdout, stderr: appleError, exitCode: appleExitCode } = await runOsascript(
            script,
            NOTE_SELECTOR_CONFIG.TIMEOUT_MS
          );
          
          if (appleExitCode !== 0) {
            return fail(mapOsascriptError(appleError, appleExitCode) || "Apple Notes creation failed", {
              stderr: appleError,
            });
          }
          
          return ok({ 
            result: stdout, 
            title, 
            app: "Apple Notes",
            folder: folder || "default",
            hasFolder: !!folder 
          });
          
        } else {
          // Use Obsidian
          let obsidianUri = `obsidian://new?`;
          const params = new URLSearchParams();
          
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
                  
                  return "Note '${escAS(title)}' created in Obsidian${folder ? ` in folder '${escAS(folder)}'` : ''}"
                on error e
                  return "Obsidian error: " & e
                end try
              end tell`;

          const { stdout, stderr: obsidianError, exitCode: obsidianExitCode } = await runOsascript(
            script,
            NOTE_SELECTOR_CONFIG.TIMEOUT_MS
          );
          
          if (obsidianExitCode !== 0) {
            return fail(mapOsascriptError(obsidianError, obsidianExitCode) || "Obsidian creation failed", {
              stderr: obsidianError,
            });
          }
          
          return ok({ 
            result: stdout, 
            title, 
            app: "Obsidian",
            folder: folder || "root",
            uri: obsidianUri
          });
        }
      },
    }),
  };
}
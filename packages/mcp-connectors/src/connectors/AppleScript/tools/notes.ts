import { z } from "zod";
import { ok, fail, escAS } from "../helpers/utils";
import { runOsascript, mapOsascriptError } from "../helpers/osascript";
import { NOTES_CONFIG } from "../helpers/constants";

export function registerNotesTools(tool: any) {
  return {
    notes_from_markdown: tool({
      name: "notes_from_markdown",
      description:
        "Create or append a Note from Markdown. Markdown is converted to safe HTML.",
      schema: z.object({
        title: z.string().min(1),
        markdown: z.string().min(1),
        folder: z.string().optional(),
        append: z.boolean().default(true).optional(),
      }),
      handler: async ({ title, markdown, folder, append = true }: any) => {
        let html = markdown
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
                    ? `if not (exists folder "${escAS(folder)}") then\n                  make new folder with properties {name:"${escAS(folder)}"}\n                end if`
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
                  return "Created new note: ${escAS(title)}"
                else
                  if ${append} then
                    set body of _existingNote to (body of _existingNote) & "<br><br>" & "${escAS(
                      html
                    )}"
                    return "Appended to existing note: ${escAS(title)}"
                  else
                    set body of _existingNote to "${escAS(html)}"
                    return "Replaced content of note: ${escAS(title)}"
                  end if
                end if
              on error e
                return "Notes error: " & e
              end try
            end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(
          script,
          NOTES_CONFIG.TIMEOUT_MS
        );
        if (exitCode !== 0) {
          return fail(mapOsascriptError(stderr, exitCode) || "Notes error", {
            stderr,
          });
        }
        return ok({ result: stdout, title, append, hasFolder: !!folder });
      },
    }),

    notes_create_enhanced: tool({
      name: "notes_create_enhanced",
      description: "Create a new note with enhanced formatting support.",
      schema: z.object({
        title: z.string().min(1),
        body: z.string().min(1),
        folderName: z.string().default("Claude").optional(),
      }),
      handler: async ({ title, body, folderName = "Claude" }: any) => {
        const script = `
            tell application "Notes"
              activate
              try
                if not (exists folder "${escAS(folderName)}") then
                  make new folder with properties {name:"${escAS(folderName)}"}
                end if
                set _folder to folder "${escAS(folderName)}"
                set _note to make new note at end of notes of _folder
                set name of _note to "${escAS(title)}"
                set body of _note to "${escAS(body)}"
                return "Created note: ${escAS(title)} in folder: ${escAS(
          folderName
        )}"
              on error e
                return "Notes error: " & e
              end try
            end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(
          script,
          NOTES_CONFIG.TIMEOUT_MS
        );
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || "Notes creation failed",
            { stderr }
          );
        }
        return ok({ result: stdout, title, folderName });
      },
    }),
  };
}


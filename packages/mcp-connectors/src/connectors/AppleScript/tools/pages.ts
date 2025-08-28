import { z } from "zod";
import { ok, fail, escAS, isPathAllowed } from "../helpers/utils";
import { runOsascript, mapOsascriptError } from "../helpers/osascript";
import { createPagesScript } from "../helpers/builders";

export function registerPagesTools(tool: any) {
  return {
    pages_read: tool({
      name: "pages_read",
      description: "Read text content from an existing Pages document.",
      schema: z.object({
        documentPath: z.string().min(1),
        maxChars: z.number().int().positive().optional(),
        includeFormatting: z.boolean().optional().default(false),
      }),
      handler: async ({ documentPath, maxChars, includeFormatting = false }: any, context: any) => {
        const { allowedPaths, blockedPaths } = await context.getCredentials();
        if (!isPathAllowed(documentPath, allowedPaths, blockedPaths)) {
          return fail(`Denied: path not allowed by sandbox: ${documentPath}`);
        }

        const script = `
          try
            tell application "Pages"
              set _doc to open POSIX file "${escAS(documentPath)}"
              set _txt to body text of _doc
              return _txt
            end tell
          on error e
            return "__ERR__" & e as string
          end try`;

        const { stdout, stderr, exitCode } = await runOsascript(script, 30_000);
        if (exitCode !== 0) {
          return fail(mapOsascriptError(stderr, exitCode) || "Pages read failed", { stderr });
        }
        if (stdout.startsWith("__ERR__")) {
          return fail(stdout.replace("__ERR__", "Pages error: "));
        }

        const fullText = stdout || "";
        const truncated = !!(maxChars && fullText.length > maxChars);
        const text = truncated ? fullText.slice(0, maxChars) : fullText;
        return ok({ documentPath, length: fullText.length, truncated, includeFormatting, text });
      },
    }),
    pages_create_document: tool({
      name: "pages_create_document",
      description: "Create a new Pages document with optional content. Supports Markdown formatting when isMarkdown=true.",
      schema: z.object({
        title: z.string().optional(),
        content: z.string().optional(),
        template: z.string().optional(),
        savePath: z.string().optional(),
        isMarkdown: z.boolean().optional().default(false),
      }),
      handler: async ({ title, content, template, savePath, isMarkdown }: any) => {
        const script = createPagesScript(title, content, template, savePath, isMarkdown);

        const { stdout, stderr, exitCode } = await runOsascript(script, 30_000);
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) ||
              "Pages document creation failed",
            { stderr }
          );
        }
        return ok({ result: stdout, title, hasContent: !!content, savePath });
      },
    }),

    pages_write_text: tool({
      name: "pages_write_text",
      description: "Write or append text content to existing Pages document.",
      schema: z.object({
        text: z.string().describe("Text content to write"),
        append: z.boolean().default(true).optional().describe("Append to existing content instead of replacing"),
        isMarkdown: z.boolean().default(false).optional().describe("Interpret text as markdown for formatting"),
        documentName: z.string().optional().describe("Document name (uses front document if not specified)"),
      }),
      handler: async ({ text, append = true, isMarkdown = false, documentName }: any) => {
        // Convert Markdown to well-formatted plain text if requested
        const formatText = (content: string) => {
          if (!isMarkdown) return content;

          return content
            // Convert headers with visual hierarchy
            .replace(
              /^# (.+)$/gm,
              (_, title) =>
                `${title.toUpperCase()}\n${"═".repeat(Math.min(title.length, 60))}\n`
            )
            .replace(
              /^## (.+)$/gm,
              (_, title) => `\n${title}\n${"─".repeat(Math.min(title.length, 40))}\n`
            )
            .replace(
              /^### (.+)$/gm,
              (_, title) => `\n${title}\n${"∙".repeat(Math.min(title.length, 30))}\n`
            )
            .replace(/^#### (.+)$/gm, "\n$1\n")
            // Convert bold to ALL CAPS
            .replace(/\*\*(.+?)\*\*/g, (_, text) => text.toUpperCase())
            // Convert italic to emphasized format
            .replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, "❝$1❞")
            // Convert bullet points to nice symbols
            .replace(/^[\s]*- (.+)$/gm, "  • $1")
            .replace(/^[\s]*\* (.+)$/gm, "  • $1")
            // Clean up excessive newlines
            .replace(/\n{4,}/g, "\n\n\n")
            .replace(/^[\n\s]+/, "")
            .replace(/[\n\s]+$/, "\n");
        };

        const formattedText = formatText(text);
        
        const script = `
          tell application "Pages"
            try
              ${documentName
                ? `set _doc to document "${escAS(documentName)}"`
                : `set _doc to front document`
              }
              ${append ? `
              set currentText to body text of _doc
              set body text of _doc to currentText & "\n\n" & "${escAS(formattedText)}"
              ` : `
              set body text of _doc to "${escAS(formattedText)}"
              `}
              return "${append ? 'Appended text to' : 'Replaced text in'} Pages document"
            on error e
              return "Pages write error: " & e as string
            end try
          end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(script, 20_000);
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || "Pages write text failed",
            { stderr }
          );
        }
        return ok({ result: stdout, textLength: text.length, append, isMarkdown });
      },
    }),

    pages_insert_text_at_position: tool({
      name: "pages_insert_text_at_position",
      description: "Insert text at specific position in Pages document.",
      schema: z.object({
        text: z.string().describe("Text to insert"),
        position: z.number().int().positive().describe("Character position to insert at (1-based)"),
        documentName: z.string().optional().describe("Document name (uses front document if not specified)"),
      }),
      handler: async ({ text, position, documentName }: any) => {
        const script = `
          tell application "Pages"
            try
              ${documentName
                ? `set _doc to document "${escAS(documentName)}"`
                : `set _doc to front document`
              }
              set currentText to body text of _doc
              set textLength to length of currentText
              
              if ${position} > textLength then
                set body text of _doc to currentText & "${escAS(text)}"
              else if ${position} <= 1 then
                set body text of _doc to "${escAS(text)}" & currentText
              else
                set beforeText to characters 1 thru (${position} - 1) of currentText as string
                set afterText to characters ${position} thru textLength of currentText as string
                set body text of _doc to beforeText & "${escAS(text)}" & afterText
              end if
              
              return "Inserted text at position ${position}"
            on error e
              return "Pages insert error: " & e as string
            end try
          end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(script, 20_000);
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || "Pages insert text failed",
            { stderr }
          );
        }
        return ok({ result: stdout, position, textLength: text.length });
      },
    }),

    pages_replace_text: tool({
      name: "pages_replace_text",
      description: "Find and replace text in Pages document.",
      schema: z.object({
        findText: z.string().describe("Text to find"),
        replaceText: z.string().describe("Text to replace with"),
        replaceAll: z.boolean().default(true).optional().describe("Replace all occurrences (true) or just first (false)"),
        documentName: z.string().optional().describe("Document name (uses front document if not specified)"),
      }),
      handler: async ({ findText, replaceText, replaceAll = true, documentName }: any) => {
        const script = `
          tell application "Pages"
            try
              ${documentName
                ? `set _doc to document "${escAS(documentName)}"`
                : `set _doc to front document`
              }
              set currentText to body text of _doc
              
              set AppleScript's text item delimiters to "${escAS(findText)}"
              set textItems to text items of currentText
              
              if (count of textItems) = 1 then
                return "Text '${escAS(findText)}' not found"
              end if
              
              ${replaceAll ? `
              set AppleScript's text item delimiters to "${escAS(replaceText)}"
              set newText to textItems as string
              set replacedCount to (count of textItems) - 1
              ` : `
              set newText to (item 1 of textItems) & "${escAS(replaceText)}"
              if (count of textItems) > 2 then
                set AppleScript's text item delimiters to "${escAS(findText)}"
                set remainingItems to items 2 thru -1 of textItems
                set remainingText to remainingItems as string
                set newText to newText & remainingText
              else if (count of textItems) = 2 then
                set newText to newText & (item 2 of textItems)
              end if
              set replacedCount to 1
              `}
              
              set AppleScript's text item delimiters to ""
              set body text of _doc to newText
              
              return "Replaced " & replacedCount & " occurrence(s) of '${escAS(findText)}'"
            on error e
              return "Pages replace error: " & e as string
            end try
          end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(script, 20_000);
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || "Pages replace text failed",
            { stderr }
          );
        }
        return ok({ result: stdout, findText, replaceText, replaceAll });
      },
    }),

  };
}

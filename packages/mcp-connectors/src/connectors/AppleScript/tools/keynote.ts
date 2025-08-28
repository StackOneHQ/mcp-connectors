import { z } from "zod";
import path from "node:path";
import { homedir } from "node:os";
import { ok, fail, escAS, isPathAllowed } from "../helpers/utils";
import { runOsascript, mapOsascriptError } from "../helpers/osascript";
import { createKeynoteScript } from "../helpers/builders";

export function registerKeynoteTools(tool: any) {
  return {
    keynote_read: tool({
      name: "keynote_read",
      description:
        "Read content from an existing Keynote presentation. Returns slides with title, content, and notes.",
      schema: z.object({
        documentPath: z.string().min(1),
        slideNumber: z.number().int().positive().optional(),
        includeNotes: z.boolean().optional().default(true),
        maxSlides: z.number().int().positive().optional(),
      }),
      handler: async (
        { documentPath, slideNumber, includeNotes = true, maxSlides }: any,
        context: any
      ) => {
        const { allowedPaths, blockedPaths } = await context.getCredentials();
        if (!isPathAllowed(documentPath, allowedPaths, blockedPaths)) {
          return fail(`Denied: path not allowed by sandbox: ${documentPath}`);
        }

        const D_SLIDE = "⎈SLIDE⎈";
        const D_CELL = "⎈FIELD⎈";

        const selection = slideNumber
          ? `set _start to ${slideNumber}
             set _end to ${slideNumber}`
          : `set _start to 1
             set _end to (count of slides)`;

        const limiter = maxSlides
          ? `set _end to min(_end, _start + ${maxSlides} - 1)`
          : ``;

        const notesSegment = includeNotes
          ? `set _notes to ""
             try
               set _notes to presenter notes of _slide as string
             end try`
          : `set _notes to ""`;

        const script = `
          try
            set D_SLIDE to "${D_SLIDE}"
            set D_CELL to "${D_CELL}"
            tell application "Keynote"
              set _doc to open POSIX file "${escAS(documentPath)}"
              tell _doc
                ${selection}
                ${limiter}
                set _assembled to ""
                repeat with i from _start to _end
                  set _slide to slide i
                  set _title to ""
                  set _content to ""
                  try
                    if (count of text items of _slide) > 0 then
                      set _title to object text of text item 1 of _slide
                    end if
                  end try
                  try
                    if (count of text items of _slide) > 1 then
                      set _content to object text of text item 2 of _slide
                    end if
                  end try
                  ${notesSegment}
                  set _one to (i as string) & D_CELL & _title & D_CELL & _content & D_CELL & _notes
                  if _assembled is "" then
                    set _assembled to _one
                  else
                    set _assembled to _assembled & D_SLIDE & _one
                  end if
                end repeat
                return _assembled
              end tell
            end tell
          on error e
            return "__ERR__" & e as string
          end try`;

        const { stdout, stderr, exitCode } = await runOsascript(script, 45_000);
        if (exitCode !== 0) {
          return fail(mapOsascriptError(stderr, exitCode) || "Keynote read failed", { stderr });
        }
        if (stdout.startsWith("__ERR__")) {
          return fail(stdout.replace("__ERR__", "Keynote error: "));
        }

        const slides: any[] = [];
        if (stdout.trim().length > 0) {
          const blocks = stdout.split(D_SLIDE);
          for (const block of blocks) {
            const parts = block.split(D_CELL);
            const idx = parseInt(parts[0] || "0", 10);
            const title = parts[1] || "";
            const content = parts[2] || "";
            const notes = parts[3] || "";
            slides.push({ index: idx, title, content, notes: includeNotes ? notes : undefined });
          }
        }

        return ok({ documentPath, count: slides.length, includeNotes, slides });
      },
    }),
    keynote_build_presentation: tool({
      name: "keynote_build_presentation",
      description:
        "Create a Keynote deck with built-in theme + slides (title/subtitle/bullets), optionally save to path. Available themes: Black, White, Gradient, Photo Essay, Classic, Slate, Cream Paper, Artisan, Improv, Showroom, Renaissance, Photo Portfolio, Editorial, Kyoto, Brushed Canvas, Typeset, Moroccan, Craft, Industrial, Modern Portfolio, Harmony, Graph Paper, Blueprint, Formal, Leather Book, Vintage, Hard Cover, Linen Book, Chalkboard, Parchment, Sal Theme.",
      schema: z.object({
        theme: z
          .enum([
            "Black",
            "White",
            "Gradient",
            "Photo Essay",
            "Classic",
            "Slate",
            "Cream Paper",
            "Artisan",
            "Improv",
            "Showroom",
            "Renaissance",
            "Photo Portfolio",
            "Editorial",
            "Kyoto",
            "Brushed Canvas",
            "Typeset",
            "Moroccan",
            "Craft",
            "Industrial",
            "Modern Portfolio",
            "Harmony",
            "Graph Paper",
            "Blueprint",
            "Formal",
            "Leather Book",
            "Vintage",
            "Hard Cover",
            "Linen Book",
            "Chalkboard",
            "Parchment",
            "Sal Theme",
          ])
          .optional()
          .default("White"),
        slides: z
          .array(
            z.object({
              layout: z.string().optional(),
              title: z.string().optional(),
              subtitle: z.string().optional(),
              bullets: z.array(z.string()).optional(),
            })
          )
          .min(1),
        savePath: z.string().optional(),
        fileName: z.string().optional(),
      }),
      handler: async ({ theme = "White", slides, savePath, fileName }: any) => {
        try {
          let resolvedSavePath = savePath;
          if (savePath?.startsWith("~")) {
            resolvedSavePath = path.join(homedir(), savePath.slice(1));
          }

          const script = createKeynoteScript(theme, slides, resolvedSavePath, fileName);

          const { stdout, stderr, exitCode } = await runOsascript(script, 60_000);
          if (exitCode !== 0) {
            return fail(mapOsascriptError(stderr, exitCode) || "Keynote error", {
              stderr,
            });
          }
          
          return ok({
            result: stdout,
            theme,
            slideCount: slides.length,
            savePath: resolvedSavePath || fileName,
          });
        } catch (error) {
          return fail("Keynote operation failed", { error: String(error) });
        }
      },
    }),

    keynote_add_slide: tool({
      name: "keynote_add_slide",
      description: "Add new slide to open Keynote presentation.",
      schema: z.object({
        title: z.string().optional().describe("Slide title"),
        content: z.string().optional().describe("Slide content/subtitle"),
        bullets: z.array(z.string()).optional().describe("Bullet points"),
        layout: z.string().optional().describe("Slide layout"),
        insertAfter: z.number().int().positive().optional().describe("Insert after slide number (appends to end if not specified)"),
        presentationName: z.string().optional().describe("Presentation name (uses front document if not specified)"),
      }),
      handler: async ({ title, content, bullets, insertAfter, presentationName }: any) => {
        const script = `
          tell application "Keynote"
            try
              ${presentationName
                ? `set _doc to document "${escAS(presentationName)}"`
                : `set _doc to front document`
              }
              tell _doc
                ${insertAfter
                  ? `set _newSlide to make new slide at after slide ${insertAfter}`
                  : `set _newSlide to make new slide at end of slides`
                }
                
                ${title ? `
                try
                  if (count of text items of _newSlide) > 0 then
                    set object text of text item 1 of _newSlide to "${escAS(title)}"
                  end if
                end try` : ''}
                
                ${content || bullets ? `
                try
                  set slideContent to ""
                  ${content ? `set slideContent to slideContent & "${escAS(content)}"` : ''}
                  ${bullets ? `
                  if slideContent is not "" then set slideContent to slideContent & "\n\n"
                  set slideContent to slideContent & "${escAS(bullets.map((b: string) => `• ${b}`).join('\n'))}"
                  ` : ''}
                  
                  if (count of text items of _newSlide) > 1 then
                    set object text of text item 2 of _newSlide to slideContent
                  else if (count of text items of _newSlide) > 0 then
                    set object text of text item 1 of _newSlide to slideContent
                  end if
                end try` : ''}
              end tell
              return "Added new slide${title ? ` with title '${escAS(title)}'` : ''}"
            on error e
              return "Keynote add slide error: " & e as string
            end try
          end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(script, 20_000);
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || "Keynote add slide failed",
            { stderr }
          );
        }
        return ok({ result: stdout, title, hasContent: !!(content || bullets) });
      },
    }),

    keynote_edit_slide: tool({
      name: "keynote_edit_slide",
      description: "Edit existing slide in open Keynote presentation.",
      schema: z.object({
        slideNumber: z.number().int().positive().describe("Slide number to edit (1-based)"),
        title: z.string().optional().describe("New slide title (leave unchanged if not provided)"),
        content: z.string().optional().describe("New slide content/subtitle (leave unchanged if not provided)"),
        bullets: z.array(z.string()).optional().describe("New bullet points (leave unchanged if not provided)"),
        append: z.boolean().default(false).optional().describe("Append to existing content instead of replacing"),
        presentationName: z.string().optional().describe("Presentation name (uses front document if not specified)"),
      }),
      handler: async ({ slideNumber, title, content, bullets, append = false, presentationName }: any) => {
        const script = `
          tell application "Keynote"
            try
              ${presentationName
                ? `set _doc to document "${escAS(presentationName)}"`
                : `set _doc to front document`
              }
              tell _doc
                set _slide to slide ${slideNumber}
                
                ${title ? `
                try
                  if (count of text items of _slide) > 0 then
                    ${append 
                      ? `
                    set currentTitle to object text of text item 1 of _slide
                    set object text of text item 1 of _slide to currentTitle & " ${escAS(title)}"
                    ` : `
                    set object text of text item 1 of _slide to "${escAS(title)}"
                    `}
                  end if
                end try` : ''}
                
                ${content || bullets ? `
                try
                  set newContent to ""
                  ${content ? `set newContent to newContent & "${escAS(content)}"` : ''}
                  ${bullets ? `
                  if newContent is not "" then set newContent to newContent & "\n\n"
                  set newContent to newContent & "${escAS(bullets.map((b: string) => `• ${b}`).join('\n'))}"
                  ` : ''}
                  
                  if (count of text items of _slide) > 1 then
                    ${append 
                      ? `
                    set currentContent to object text of text item 2 of _slide
                    set object text of text item 2 of _slide to currentContent & "\n\n" & newContent
                    ` : `
                    set object text of text item 2 of _slide to newContent
                    `}
                  else if (count of text items of _slide) > 0 then
                    ${append 
                      ? `
                    set currentContent to object text of text item 1 of _slide
                    set object text of text item 1 of _slide to currentContent & "\n\n" & newContent
                    ` : `
                    set object text of text item 1 of _slide to newContent
                    `}
                  end if
                end try` : ''}
              end tell
              return "Updated slide ${slideNumber}${title ? ` with title '${escAS(title)}'` : ''}"
            on error e
              return "Keynote edit slide error: " & e as string
            end try
          end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(script, 20_000);
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || "Keynote edit slide failed",
            { stderr }
          );
        }
        return ok({ result: stdout, slideNumber, title, append });
      },
    }),

    keynote_set_slide_notes: tool({
      name: "keynote_set_slide_notes",
      description: "Set presenter notes for specific slide in open Keynote presentation.",
      schema: z.object({
        slideNumber: z.number().int().positive().describe("Slide number (1-based)"),
        notes: z.string().describe("Presenter notes"),
        append: z.boolean().default(false).optional().describe("Append to existing notes instead of replacing"),
        presentationName: z.string().optional().describe("Presentation name (uses front document if not specified)"),
      }),
      handler: async ({ slideNumber, notes, append = false, presentationName }: any) => {
        const script = `
          tell application "Keynote"
            try
              ${presentationName
                ? `set _doc to document "${escAS(presentationName)}"`
                : `set _doc to front document`
              }
              tell _doc
                set _slide to slide ${slideNumber}
                ${append 
                  ? `
                set currentNotes to presenter notes of _slide
                set presenter notes of _slide to currentNotes & "\n\n" & "${escAS(notes)}"
                ` : `
                set presenter notes of _slide to "${escAS(notes)}"
                `}
              end tell
              return "${append ? 'Appended to' : 'Set'} presenter notes for slide ${slideNumber}"
            on error e
              return "Keynote set notes error: " & e as string
            end try
          end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(script, 15_000);
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || "Keynote set notes failed",
            { stderr }
          );
        }
        return ok({ result: stdout, slideNumber, append });
      },
    }),

  };
}

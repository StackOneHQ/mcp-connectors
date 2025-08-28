import { z } from "zod";
import { ok, fail, escAS, toASList, chooseExistingRootAndSegments, isPathAllowed } from "../helpers/utils";
import { runOsascript, mapOsascriptError } from "../helpers/osascript";
import { createWorkspaceSetupScript, createRemindersScript, createNumbersScript, createKeynoteScript } from "../helpers/builders";
import { requestCalendarAccess } from "../helpers/permissions";

export function registerWorkflowTools(tool: any) {
  return {
    workflow_setup_workspace: tool({
      name: "workflow_setup_workspace",
      description:
        "Set volume, start focus music by keyword, and activate core apps.",
      schema: z.object({
        volume: z.number().min(0).max(100).default(20),
        musicKeyword: z.string().default("focus"),
        apps: z.array(z.string()).default(["Calendar", "Reminders", "Notes"]),
      }),
      handler: async ({ volume, musicKeyword, apps }: any) => {
        const script = createWorkspaceSetupScript(volume, musicKeyword, apps);
        const { stdout, stderr, exitCode } = await runOsascript(script, 45_000);
        if (exitCode !== 0) return fail("Workspace setup error", { stderr });
        return ok({ result: stdout });
      },
    }),

    workflow_full_json: tool({
      name: "workflow_full_json",
      description:
        "Run the full demo workflow using a single JSON payload (your canonical schema).",
      schema: z.object({
        setup: z
          .object({
            volume: z.number().min(0).max(100).default(20),
            musicKeyword: z.string().default("focus"),
            apps: z.array(z.string()).default(["Calendar", "Reminders", "Notes"]),
          })
          .optional(),
        reminders: z
          .object({
            list: z.string().optional(),
            items: z
              .array(
                z.object({
                  title: z.string(),
                  notes: z.string().optional(),
                  due: z.string().optional(),
                  priority: z.enum(["low", "medium", "high"]).default("high"),
                })
              )
              .default([]),
          })
          .optional(),
        note: z
          .object({
            title: z.string(),
            markdown: z.string(),
            folder: z.string().optional(),
            append: z.boolean().optional(),
          })
          .optional(),
        numbers: z
          .object({
            headers: z.array(z.string()).min(1),
            rows: z.array(z.array(z.string())).default([]),
            savePath: z.string().optional(),
          })
          .optional(),
        keynote: z
          .object({
            theme: z.string().optional(),
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
          })
          .optional(),
        calendar: z
          .object({
            title: z.string(),
            start: z.string(),
            end: z.string(),
            location: z.string().optional(),
            description: z.string().optional(),
          })
          .optional(),
        folders: z.array(z.string()).optional(),
        urls: z.array(z.string().url()).optional(),
      }),
      handler: async (args: any, context: any) => {
        const results: Record<string, any> = {};

        if (args.setup) {
          const script = createWorkspaceSetupScript(
            args.setup.volume,
            args.setup.musicKeyword,
            args.setup.apps
          );
          const { stdout, stderr, exitCode } = await runOsascript(
            script,
            45_000
          );
          if (exitCode !== 0) {
            results.setup = JSON.parse(
              fail("Workspace setup error", { stderr })
            );
          } else {
            results.setup = JSON.parse(ok({ result: stdout }));
          }
        }

        if (args.folders?.length) {
          const { allowedPaths, blockedPaths } = await context.getCredentials();
          for (const basePath of args.folders) {
            if (!isPathAllowed(basePath, allowedPaths, blockedPaths)) {
              results.folders = JSON.parse(
                fail(`Denied: path not allowed: ${basePath}`)
              );
              continue;
            }
            const { root, segments } = chooseExistingRootAndSegments(basePath);
            if (!root || segments.length === 0) {
              results.folders = JSON.parse(ok({ result: "Path exists" }));
              continue;
            }
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
            const { stdout, stderr, exitCode } = await runOsascript(
              script,
              30_000
            );
            if (exitCode !== 0) {
              results.folders = JSON.parse(
                fail(mapOsascriptError(stderr, exitCode) || "Folders error", {
                  stderr,
                })
              );
            } else {
              results.folders = JSON.parse(ok({ result: stdout }));
            }
          }
        }

        if (args.reminders?.items.length) {
          const script = createRemindersScript(
            args.reminders.list || "",
            args.reminders.items
          );
          const { stdout, stderr, exitCode } = await runOsascript(
            script,
            45_000
          );
          if (exitCode !== 0) {
            results.reminders = JSON.parse(
              fail(mapOsascriptError(stderr, exitCode) || "Reminders error", {
                stderr,
              })
            );
          } else {
            results.reminders = JSON.parse(ok({ result: stdout }));
          }
        }

        if (args.note) {
          let html = args.note.markdown
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

          const createCmd = args.note.folder
            ? `set _folder to folder "${escAS(
                args.note.folder
              )}"\nset _note to make new note at end of notes of _folder`
            : `set _note to make new note`;

          const script = `
              tell application "Notes"
                activate
                try
                  ${
                    args.note.folder
                      ? `if not (exists folder "${escAS(
                          args.note.folder
                        )}") then\n                    make new folder with properties {name:"${escAS(
                          args.note.folder
                        )}"}\n                  end if`
                      : ""
                  }
                  
                  set _existingNote to missing value
                  try
                    ${
                      args.note.folder
                        ? `set _existingNote to note "${escAS(
                            args.note.title
                          )}" of folder "${escAS(args.note.folder)}"`
                        : `set _existingNote to note "${escAS(
                            args.note.title
                          )}"`
                    }
                  end try
                  
                  if _existingNote is missing value then
                    ${createCmd}
                    set name of _note to "${escAS(args.note.title)}"
                    set body of _note to "${escAS(html)}"
                    return "Created new note: ${escAS(args.note.title)}"
                  else
                    if ${args.note.append !== false} then
                      set body of _existingNote to (body of _existingNote) & "<br><br>" & "${escAS(
                        html
                      )}"
                      return "Appended to existing note: ${escAS(
                        args.note.title
                      )}"
                    else
                      set body of _existingNote to "${escAS(html)}"
                      return "Replaced content of note: ${escAS(
                        args.note.title
                      )}"
                    end if
                  end if
                on error e
                  return "Notes error: " & e
                end try
              end tell`;

          const { stdout, stderr, exitCode } = await runOsascript(
            script,
            30_000
          );
          if (exitCode !== 0) {
            results.note = JSON.parse(
              fail(mapOsascriptError(stderr, exitCode) || "Notes error", {
                stderr,
              })
            );
          } else {
            results.note = JSON.parse(ok({ result: stdout }));
          }
        }

        if (args.numbers) {
          const script = createNumbersScript(
            args.numbers.headers,
            args.numbers.rows,
            args.numbers.savePath
          );
          const { stdout, stderr, exitCode } = await runOsascript(
            script,
            45_000
          );
          if (exitCode !== 0) {
            results.numbers = JSON.parse(
              fail(mapOsascriptError(stderr, exitCode) || "Numbers error", {
                stderr,
              })
            );
          } else {
            results.numbers = JSON.parse(ok({ result: stdout }));
          }
        }

        if (args.keynote) {
          const script = createKeynoteScript(
            args.keynote.theme || "White",
            args.keynote.slides,
            args.keynote.savePath,
            args.keynote.fileName
          );
          const { stdout, stderr, exitCode } = await runOsascript(
            script,
            60_000
          );
          if (exitCode !== 0) {
            results.keynote = JSON.parse(
              fail(mapOsascriptError(stderr, exitCode) || "Keynote error", {
                stderr,
              })
            );
          } else {
            results.keynote = JSON.parse(ok({ result: stdout }));
          }
        }

        if (args.calendar) {
          try {
            const accessResult = await requestCalendarAccess();
            if (!accessResult.hasAccess) {
              results.calendar = JSON.parse(
                fail("Calendar access denied", {
                  message: accessResult.message,
                })
              );
            } else {
              const script = `
            tell application "Calendar"
              tell calendar 1
                set _event to make new event with properties {
                  summary: "${escAS(args.calendar.title)}",
                  start date: date "${args.calendar.start
                    .replace(/-/g, "/")
                    .replace(" ", " ")}:00",
                  end date: date "${args.calendar.end
                    .replace(/-/g, "/")
                    .replace(" ", " ")}:00"
                  ${
                    args.calendar.location
                      ? `, location:"${escAS(args.calendar.location)}"`
                      : ""
                  }
                  ${
                    args.calendar.description
                      ? `, description:"${escAS(args.calendar.description)}"`
                      : ""
                  }
                }
              end tell
              return "Created event: ${escAS(args.calendar.title)}"
            end tell
          on error e
            return "Calendar error: " & e
          end try`;

              const { stdout, stderr, exitCode } = await runOsascript(
                script,
                30_000
              );
              if (exitCode !== 0) {
                results.calendar = JSON.parse(
                  fail(
                    mapOsascriptError(stderr, exitCode) || "Calendar error",
                    {
                      stderr,
                    }
                  )
                );
              } else {
                results.calendar = JSON.parse(ok({ result: stdout }));
              }
            }
          } catch (error) {
            results.calendar = JSON.parse(
              fail("Calendar operation failed", { error: String(error) })
            );
          }
        }

        if (args.urls?.length) {
          const asUrls = toASList(args.urls);
          const script = `
              tell application "Safari"
                activate
                if (count of windows) = 0 then
                  make new document with properties {URL:(item 1 of ${asUrls})}
                else
                  set URL of current tab of front window to (item 1 of ${asUrls})
                end if
                
                repeat with i from 2 to count of ${asUrls}
                  tell front window to make new tab with properties {URL:(item i of ${asUrls})}
                end repeat
                
                return "Opened " & (count of ${asUrls}) & " URL(s)"
              end tell`;

          const { stdout, stderr, exitCode } = await runOsascript(
            script,
            30_000
          );
          if (exitCode !== 0) {
            results.urls = JSON.parse(
              fail(mapOsascriptError(stderr, exitCode) || "Safari error", {
                stderr,
              })
            );
          } else {
            results.urls = JSON.parse(ok({ result: stdout }));
          }
        }

        return ok(results);
      },
    }),

    execute_query: tool({
      name: "execute_query",
      description:
        "Natural language automation router for common tasks (calendar, notes).",
      schema: z.object({
        action: z.string().min(1),
        params: z.record(z.any()).default({}),
      }),
      handler: async ({ action, params }: any) => {
        try {
          switch (action) {
            case "create_calendar_event": {
              const title = params.title || "New Event";
              const start = params.start;
              const end = params.end;
              if (!start || !end) return fail("Missing start/end");

              const script = `
                try
                  tell application "Calendar"
                    if "${params.calendarName || ""}" is not "" then
                      set _cal to first calendar whose name is "${escAS(params.calendarName || "")}"
                    else
                      try
                        set _cal to calendar 1
                      on error
                        set _cal to first calendar whose writable is true
                      end try
                    end if
                    
                    tell _cal
                      set _event to make new event with properties {summary: "${escAS(
                        title
                      )}"}
                      try
                        set start date of _event to date "${start.replace(/-/g, "/").replace(" ", " ")}:00"
                        set end date of _event to date "${end.replace(/-/g, "/").replace(" ", " ")}:00"
                      end try
                    end tell
                    
                    return "Created event: ${escAS(title)}"
                  end tell
                on error e
                  return "Calendar error: " & e as string
                end try`;

              const { stdout, stderr, exitCode } = await runOsascript(
                script,
                20_000
              );
              if (exitCode !== 0) {
                return fail("Calendar event creation failed", { stderr });
              }
              if (stdout.includes("Calendar error:")) {
                return fail("Calendar operation failed", { details: stdout });
              }
              return ok({ result: stdout, action, title, start, end });
            }

            case "create_simple_note": {
              const title = params.noteTitle || "New Note";
              const content = params.content || "";

              const script = `
                try
                  tell application "Notes"
                    activate
                    set _note to make new note
                    set name of _note to "${escAS(title)}"
                    if "${escAS(content)}" is not "" then
                      set body of _note to "${escAS(content)}"
                    end if
                    return "Created note: ${escAS(title)}"
                  end tell
                on error e
                  return "Notes error: " & e as string
                end try`;

              const { stdout, stderr, exitCode } = await runOsascript(
                script,
                15_000
              );
              if (exitCode !== 0) {
                return fail("Note creation failed", { stderr });
              }
              if (stdout.includes("Notes error:")) {
                return fail("Notes operation failed", { details: stdout });
              }
              return ok({ result: stdout, action, title });
            }

            default:
              return fail("Unknown action", { action });
          }
        } catch (error) {
          return fail("Workflow execution failed", {
            error: String(error),
            action,
          });
        }
      },
    }),

    workflow_safe_patterns: tool({
      name: "workflow_safe_patterns",
      description:
        "Describe safe usage patterns for complex automation tasks (reference only).",
      schema: z.object({}),
      handler: async () => {
        return ok({
          patterns: [
            "music_search → pick persistentId → music_play",
            "headless_chrome_fetch for JS pages; safari_extract_content for visible tabs",
            "notes_from_markdown to persist research summaries",
            "numbers_create_and_populate to tabulate findings",
            "calendar_create_event_iso to schedule tasks",
            "reminders_create_batch for follow-ups",
          ],
        });
      },
    }),
  };
}

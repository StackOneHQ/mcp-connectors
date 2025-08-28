// Extracted script builder helpers from applescript.ts (no logic changes)
import { escAS, toASList, toAS2DList, dateTimeToAS } from "./utils";
import { homedir } from "node:os";
import path from "node:path";

export function createRemindersScript(
  list: string,
  items: Array<{
    title: string;
    notes?: string;
    due?: string;
    priority?: string;
  }>
) {
  const asTitles = toASList(items.map((i) => i.title));
  const asNotes = toASList(items.map((i) => i.notes || ""));
  const asDue = toASList(items.map((i) => i.due || ""));
  const asPri = toASList(items.map((i) => i.priority || "high"));

  return `
    tell application "Reminders"
      ${
        list
          ? `set _list to list "${escAS(list)}"`
          : "set _list to default list"
      }
      set _N to count of ${asTitles}
      repeat with i from 1 to _N
        set _title to item i of ${asTitles}
        set _notes to item i of ${asNotes}
        set _due to item i of ${asDue}
        set _pri to item i of ${asPri}
        
        set _r to make new reminder at end of reminders of _list
        set name of _r to _title
        if _notes is not "" then set body of _r to _notes
        if _pri is "high" then set priority of _r to high
        if _pri is "medium" then set priority of _r to medium
        if _pri is "low" then set priority of _r to low
        
        if _due is not "" then
          ${dateTimeToAS("_due", "_dueDate")}
          set due date of _r to _dueDate
        end if
      end repeat
      return "Created " & _N & " reminder(s) in list: " & name of _list
    end tell`;
}

export function createNumbersScript(
  headers: string[],
  rows: string[][],
  savePath?: string
) {
  const cols = headers.length;
  const rs = rows.length;

  // Expand tilde in savePath if provided and ensure it's absolute
  const resolvedPath = savePath 
    ? path.resolve(savePath.startsWith("~") 
        ? path.join(homedir(), savePath.slice(1)) 
        : savePath)
    : undefined;

  return `
    tell application "Numbers"
      activate
      delay 1
      set _doc to make new document
      tell _doc
        set _sheet to active sheet
        tell table 1 of _sheet
          set column count to ${cols}
          set row count to ${Math.max(1, rs + 1)}
          
          repeat with c from 1 to ${cols}
            set value of cell c of row 1 to item c of ${toASList(headers)}
          end repeat
          
          ${
            rows.length > 0
              ? `
          set _rIdx to 0
          repeat with _r in ${toAS2DList(rows)}
            set _rIdx to _rIdx + 1
            set _cIdx to 0
            repeat with _c in _r
              set _cIdx to _cIdx + 1
              set value of cell _cIdx of row (_rIdx + 1) to _c
            end repeat
          end repeat`
              : ""
          }
        end tell
      end tell
      ${
        resolvedPath
          ? `
      save _doc in (POSIX file "${escAS(resolvedPath)}")
      close _doc
      delay 1
      open (POSIX file "${escAS(resolvedPath)}")
      activate`
          : ""
      }
      return "Created spreadsheet with " & ${cols} & " columns and " & ${
    rs + 1
  } & " rows"
    end tell`;
}

export function createKeynoteScript(
  theme: string,
  slides: Array<{ title?: string; subtitle?: string; bullets?: string[] }>,
  savePath?: string,
  fileName?: string
) {
  const slideCommands = slides
    .map((slide, i) => {
      let slideCmd = "";

      // Create slide with basic layout
      if (i === 0) {
        // Use the first slide that's created by default
        slideCmd = `set _slide${i} to slide 1 of _doc`;
      } else {
        // Add new slide with safe layout
        slideCmd = `set _slide${i} to make new slide at end of slides of _doc`;
      }

      // Safely set title if provided
      if (slide.title) {
        slideCmd += `
        try
          if (count of text items of _slide${i}) > 0 then
            set object text of text item 1 of _slide${i} to "${escAS(
          slide.title
        )}"
          end if
        end try`;
      }

      // Safely set content if provided
      if (slide.subtitle) {
        slideCmd += `
        try
          if (count of text items of _slide${i}) > 1 then
            set object text of text item 2 of _slide${i} to "${escAS(
          slide.subtitle
        )}"
          end if
        end try`;
      }

      // Handle bullets - combine with subtitle if both exist
      if (slide.bullets && slide.bullets.length) {
        const bulletText = slide.bullets.map((b) => `• ${b}`).join("\n");
        const combinedContent = slide.subtitle
          ? `${slide.subtitle}\n\n${bulletText}`
          : bulletText;

        slideCmd += `
        try
          if (count of text items of _slide${i}) > 1 then
            set object text of text item 2 of _slide${i} to "${escAS(
          combinedContent
        )}"
          else if (count of text items of _slide${i}) > 0 then
            set object text of text item 1 of _slide${i} to "${escAS(
          combinedContent
        )}"
          end if
        end try`;
      }

      return slideCmd;
    })
    .join("\n");

  // Resolve file path properly
  const filePath = savePath 
    ? path.resolve(savePath.startsWith("~") 
        ? path.join(homedir(), savePath.slice(1)) 
        : savePath)
    : fileName 
    ? path.join(homedir(), "Desktop", `${fileName}.key`) 
    : null;

  return `
    tell application "Keynote"
      activate
      delay 1
      set _doc to make new document with properties {document theme:theme "${escAS(
        theme
      )}"}
      ${slideCommands}
      ${
        filePath
          ? `
      save _doc in (POSIX file "${escAS(filePath)}")
      close _doc
      delay 1
      open (POSIX file "${escAS(filePath)}")
      activate`
          : ""
      }
      return "Created presentation with ${
        slides.length
      } slides using theme: ${escAS(theme)}"
    end tell`;
}

export function createWorkspaceSetupScript(
  volume: number,
  musicKeyword: string,
  apps: string[]
) {
  const appCommands = apps
    .map((app) => `tell application "${escAS(app)}" to activate`)
    .join("\n");

  return `
    set volume output volume ${volume}
    tell application "Music"
      try
        set _results to search playlist 1 for "${escAS(musicKeyword)}"
        if (count of _results) > 0 then
          play item 1 of _results
        end if
      end try
    end tell
    ${appCommands}
    return "Workspace setup complete: volume ${volume}%, music playing, ${
    apps.length
  } apps activated"`;
}

export function createPagesScript(
  title?: string,
  content?: string,
  template?: string,
  savePath?: string,
  isMarkdown = false
) {
  // Expand tilde in savePath if provided and ensure it's absolute
  const resolvedPath = savePath 
    ? path.resolve(savePath.startsWith("~") 
        ? path.join(homedir(), savePath.slice(1)) 
        : savePath)
    : undefined;

  // Convert Markdown to well-formatted plain text with clear visual hierarchy
  const formatContent = (text: string) => {
    if (!isMarkdown) return `set body text of _doc to "${escAS(text)}"`;

    // Process Markdown to beautifully structured plain text
    let formattedText = text
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

      // Clean up excessive newlines while preserving intentional spacing
      .replace(/\n{4,}/g, "\n\n\n")
      .replace(/^[\n\s]+/, "") // Remove leading whitespace
      .replace(/[\n\s]+$/, "\n"); // Clean trailing but keep one newline

    return `set body text of _doc to "${escAS(formattedText)}"`;
  };

  const contentCommand = content ? formatContent(content) : "";

  return `
    tell application "Pages"
      activate
      delay 1
      set _doc to make new document${
        template ? ` with template "${escAS(template)}"` : ""
      }
      ${contentCommand}
      ${
        resolvedPath
          ? `
      save _doc in (POSIX file "${escAS(resolvedPath)}")
      close _doc
      delay 1
      open (POSIX file "${escAS(resolvedPath)}")
      activate`
          : ""
      }
      return "Created Pages document${title ? ` - ${escAS(title)}` : ""}"
    end tell`;
}

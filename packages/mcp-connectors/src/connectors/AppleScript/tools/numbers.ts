import { z } from "zod";
import path from "node:path";
import { homedir } from "node:os";
import { ok, fail, escAS, toASList, toAS2DList, isPathAllowed } from "../helpers/utils";
import { runOsascript, mapOsascriptError } from "../helpers/osascript";
import { createNumbersScript } from "../helpers/builders";

export function registerNumbersTools(tool: any) {
  return {
    numbers_read: tool({
      name: "numbers_read",
      description:
        "Read data from an existing Numbers document. Returns sheets with headers and rows.",
      schema: z.object({
        documentPath: z.string().min(1),
        sheetName: z.string().optional(),
        maxRows: z.number().int().positive().optional(),
      }),
      handler: async (
        { documentPath, sheetName, maxRows }: any,
        context: any
      ) => {
        const { allowedPaths, blockedPaths } = await context.getCredentials();
        if (!isPathAllowed(documentPath, allowedPaths, blockedPaths)) {
          return fail(`Denied: path not allowed by sandbox: ${documentPath}`);
        }

        // Use rare delimiters to safely parse results
        const D_SHEET = "␝SHEET␝";
        const D_ROW = "␟ROW␟";
        const D_CELL = "␞CELL␞";

        const sheetFilter = sheetName
          ? `set _sheets to every sheet of _doc whose name is "${escAS(
              sheetName
            )}"
             if (count of _sheets) = 0 then return "__ERR__NO_SHEET__"`
          : `set _sheets to every sheet of _doc`;

        const rowLimiter = maxRows ? `set _rowMax to min(_rowCount, ${maxRows})` : `set _rowMax to _rowCount`;

        const script = `
          try
            set D_SHEET to "${D_SHEET}"
            set D_ROW to "${D_ROW}"
            set D_CELL to "${D_CELL}"
            tell application "Numbers"
              set _doc to open POSIX file "${escAS(documentPath)}"
              tell _doc
                ${sheetFilter}
                set _assembled to ""
                repeat with _s in _sheets
                  set _sname to name of _s
                  try
                    tell _s
                      set _t to table 1
                    end tell
                  on error
                    set _t to missing value
                  end try
                  if _t is not missing value then
                    tell _t
                      set _rowCount to row count
                      set _colCount to column count
                      ${rowLimiter}
                      set _rowsText to ""
                      repeat with _r from 1 to _rowMax
                        set _vals to {}
                        repeat with _c from 1 to _colCount
                          try
                            set _v to value of cell _c of row _r
                            if _v is missing value then set _v to ""
                          on error
                            set _v to ""
                          end try
                          set end of _vals to (_v as string)
                        end repeat
                        set AppleScript's text item delimiters to D_CELL
                        set _rowText to _vals as string
                        set AppleScript's text item delimiters to ""
                        if _rowsText is "" then
                          set _rowsText to _rowText
                        else
                          set _rowsText to _rowsText & D_ROW & _rowText
                        end if
                      end repeat
                      set _sheetText to _sname & D_CELL & (_colCount as string) & D_CELL & (_rowMax as string) & D_CELL & _rowsText
                    end tell
                    if _assembled is "" then
                      set _assembled to _sheetText
                    else
                      set _assembled to _assembled & D_SHEET & _sheetText
                    end if
                  end if
                end repeat
                return _assembled
              end tell
            end tell
          on error e
            return "__ERR__" & e as string
          end try`;

        const { stdout, stderr, exitCode } = await runOsascript(script, 60_000);
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || "Numbers read failed",
            { stderr }
          );
        }
        if (stdout.startsWith("__ERR__NO_SHEET__")) {
          return fail(`Sheet not found: ${sheetName}`, { documentPath, sheetName });
        }
        if (stdout.startsWith("__ERR__")) {
          return fail(stdout.replace("__ERR__", "Numbers error: "));
        }

        // Parse the assembled text into structured data
        const sheets: any[] = [];
        if (stdout.trim().length > 0) {
          const sheetBlocks = stdout.split(D_SHEET);
          for (const block of sheetBlocks) {
            const firstSplit = block.split(D_CELL);
            const sName = firstSplit[0] || "";
            const colCount = parseInt(firstSplit[1] || "0", 10);
            const rowCount = parseInt(firstSplit[2] || "0", 10);
            const rowsText = firstSplit.slice(3).join(D_CELL);
            const rowStrings = rowsText.length ? rowsText.split(D_ROW) : [];
            const rows: string[][] = rowStrings.map((r) => r.split(D_CELL));
            const headers = rows.length ? rows[0] : [];
            const dataRows = rows.length > 1 ? rows.slice(1) : [];
            sheets.push({ name: sName, columns: colCount, rows: rowCount, headers, data: dataRows });
          }
        }

        return ok({ documentPath, sheetName, maxRows: maxRows || null, sheets });
      },
    }),
    numbers_create_and_populate: tool({
      name: "numbers_create_and_populate",
      description:
        "Create Numbers doc with single or multiple sheets, each with headers and rows; optional save path.",
      schema: z.object({
        headers: z.array(z.string()).optional(),
        rows: z.array(z.array(z.string())).optional(),
        sheets: z
          .array(
            z.object({
              name: z.string(),
              headers: z.array(z.string()).min(1),
              rows: z.array(z.array(z.string())).default([]),
            })
          )
          .optional(),
        savePath: z.string().optional(),
      }),
      handler: async (params: any) => {
        const { headers, rows = [], sheets, savePath } = params;
        try {
          // Validate that either headers or sheets is provided
          if (!headers && !sheets) {
            return fail("Either headers (single sheet) or sheets (multi-sheet) must be provided");
          }

          // Properly resolve save path
          const resolvedSavePath = savePath 
            ? path.resolve(savePath.startsWith("~") 
                ? path.join(homedir(), savePath.slice(1)) 
                : savePath)
            : undefined;

          if (headers && !sheets) {
            try {
              const script = createNumbersScript(headers, rows, resolvedSavePath);
              const { stdout, stderr, exitCode } = await runOsascript(
                script,
                45_000
              );
              if (exitCode !== 0) {
                return fail(
                  mapOsascriptError(stderr, exitCode) || "Numbers error",
                  { stderr, headers: headers.length, rows: rows.length }
                );
              }
              return ok({
                result: stdout,
                mode: "single-sheet",
                savePath: resolvedSavePath,
              });
            } catch (error) {
              return fail("Script generation failed", { error: String(error) });
            }
          }

          if (sheets) {
            const sheetCommands = sheets
              .map((sheet: any, index: number) => {
                const localHeaders = [...sheet.headers];
                const localRows = sheet.rows.map((row: string[]) => [...row]);
                if (localHeaders.length === 1) {
                  localHeaders.push(" ");
                  localRows.forEach((row: string[]) => row.push(""));
                }
                const cols = localHeaders.length;
                const rs = localRows.length;

                return `
                    ${
                      index === 0
                        ? `set _sheet to active sheet\nset name of _sheet to "${escAS(
                            sheet.name
                          )}"`
                        : `set _sheet to make new sheet\nset name of _sheet to "${escAS(
                            sheet.name
                          )}"`
                    }
                    tell table 1 of _sheet
                      set column count to ${cols}
                      set row count to ${Math.max(1, rs + 1)}
                      repeat with c from 1 to ${cols}
                        set value of cell c of row 1 to item c of ${toASList(
                          localHeaders
                        )}
                      end repeat
                      ${
                        localRows.length > 0
                          ? `
                      set _rIdx to 0
                      repeat with _r in ${toAS2DList(localRows)}
                        set _rIdx to _rIdx + 1
                        set _cIdx to 0
                        repeat with _c in _r
                          set _cIdx to _cIdx + 1
                          set value of cell _cIdx of row (_rIdx + 1) to _c
                        end repeat
                      end repeat`
                          : ""
                      }
                    end tell`;
              })
              .join("\n");

            const script = `
                tell application "Numbers"
                  activate
                  delay 1
                  set _doc to make new document
                  tell _doc
                    ${sheetCommands}
                  end tell
                  ${
                    resolvedSavePath
                      ? `
                  save _doc in (POSIX file "${escAS(resolvedSavePath)}")
                  close _doc
                  delay 1
                  open (POSIX file "${escAS(resolvedSavePath)}")
                  activate`
                      : ""
                  }
                  return "Created workbook with ${
                    sheets.length
                  } sheet(s): ${sheets.map((s: any) => s.name).join(", ")}"
                end tell`;

            const { stdout, stderr, exitCode } = await runOsascript(
              script,
              60_000
            );
            if (exitCode !== 0) {
              return fail(
                mapOsascriptError(stderr, exitCode) || "Numbers error",
                { stderr }
              );
            }
            return ok({
              result: stdout,
              mode: "multi-sheet",
              sheetCount: sheets.length,
              savePath: resolvedSavePath,
            });
          }

          return fail("Invalid input: missing headers or sheets");
        } catch (error) {
          return fail("Numbers operation failed", { error: String(error) });
        }
      },
    }),

    numbers_add_sheet: tool({
      name: "numbers_add_sheet",
      description:
        "Add a new sheet to an existing open Numbers document with headers and optional rows.",
      schema: z.object({
        sheetName: z.string(),
        headers: z.array(z.string()).min(1),
        rows: z.array(z.array(z.string())).optional(),
        documentName: z.string().optional(),
      }),
      handler: async ({ sheetName, headers, rows = [], documentName }: any) => {
        const script = `
            try
              tell application "Numbers"
                activate
                ${
                  documentName
                    ? `set _doc to document "${escAS(documentName)}"`
                    : `set _doc to front document`
                }
                tell _doc
                  set _sheet to make new sheet with properties {name:"${escAS(
                    sheetName
                  )}"}
                  tell table 1 of _sheet
                    set column count to ${headers.length}
                    set row count to ${Math.max(1, rows.length + 1)}
                    repeat with c from 1 to ${headers.length}
                      set value of cell c of row 1 to item c of ${toASList(
                        headers
                      )}
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
                return "Added sheet: ${escAS(sheetName)}"
              end tell
            on error e
              return "Numbers error: " & e as string
            end try`;

        const { stdout, stderr, exitCode } = await runOsascript(script, 30_000);
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || "Numbers error",
            { stderr }
          );
        }
        return ok({ result: stdout, sheetName, hasRows: rows.length > 0 });
      },
    }),

    numbers_write_cell: tool({
      name: "numbers_write_cell",
      description: "Write value to specific cell in open Numbers document.",
      schema: z.object({
        value: z.string().describe("Value to write to cell"),
        row: z.number().int().positive().describe("Row number (1-based)"),
        column: z.number().int().positive().describe("Column number (1-based)"),
        sheetName: z.string().optional().describe("Sheet name (uses active sheet if not specified)"),
        documentName: z.string().optional().describe("Document name (uses front document if not specified)"),
      }),
      handler: async ({ value, row, column, sheetName, documentName }: any) => {
        const script = `
          tell application "Numbers"
            try
              ${documentName
                ? `set _doc to document "${escAS(documentName)}"`
                : `set _doc to front document`
              }
              tell _doc
                ${sheetName
                  ? `set _sheet to sheet "${escAS(sheetName)}"`
                  : `set _sheet to active sheet`
                }
                tell table 1 of _sheet
                  set value of cell ${column} of row ${row} to "${escAS(value)}"
                end tell
              end tell
              return "Wrote '${escAS(value)}' to cell (${row}, ${column})"
            on error e
              return "Numbers write error: " & e as string
            end try
          end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(script, 15_000);
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || "Numbers cell write failed",
            { stderr }
          );
        }
        return ok({ result: stdout, value, row, column, sheet: sheetName || "active" });
      },
    }),

    numbers_write_range: tool({
      name: "numbers_write_range",
      description: "Write 2D array of values to range in open Numbers document.",
      schema: z.object({
        values: z.array(z.array(z.string())).describe("2D array of values to write"),
        startRow: z.number().int().positive().describe("Starting row number (1-based)"),
        startColumn: z.number().int().positive().describe("Starting column number (1-based)"),
        sheetName: z.string().optional().describe("Sheet name (uses active sheet if not specified)"),
        documentName: z.string().optional().describe("Document name (uses front document if not specified)"),
      }),
      handler: async ({ values, startRow, startColumn, sheetName, documentName }: any) => {
        const script = `
          tell application "Numbers"
            try
              ${documentName
                ? `set _doc to document "${escAS(documentName)}"`
                : `set _doc to front document`
              }
              tell _doc
                ${sheetName
                  ? `set _sheet to sheet "${escAS(sheetName)}"`
                  : `set _sheet to active sheet`
                }
                tell table 1 of _sheet
                  set _rIdx to ${startRow - 1}
                  repeat with _r in ${toAS2DList(values)}
                    set _rIdx to _rIdx + 1
                    set _cIdx to ${startColumn - 1}
                    repeat with _c in _r
                      set _cIdx to _cIdx + 1
                      set value of cell _cIdx of row _rIdx to _c
                    end repeat
                  end repeat
                end tell
              end tell
              return "Wrote ${values.length} rows × ${values[0]?.length || 0} columns starting at (${startRow}, ${startColumn})"
            on error e
              return "Numbers range write error: " & e as string
            end try
          end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(script, 30_000);
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || "Numbers range write failed",
            { stderr }
          );
        }
        return ok({ 
          result: stdout, 
          rowsWritten: values.length, 
          columnsWritten: values[0]?.length || 0,
          startRow,
          startColumn
        });
      },
    }),

    numbers_add_row: tool({
      name: "numbers_add_row",
      description: "Add new row with values to open Numbers document.",
      schema: z.object({
        values: z.array(z.string()).describe("Array of values for the new row"),
        sheetName: z.string().optional().describe("Sheet name (uses active sheet if not specified)"),
        documentName: z.string().optional().describe("Document name (uses front document if not specified)"),
      }),
      handler: async ({ values, sheetName, documentName }: any) => {
        const script = `
          tell application "Numbers"
            try
              ${documentName
                ? `set _doc to document "${escAS(documentName)}"`
                : `set _doc to front document`
              }
              tell _doc
                ${sheetName
                  ? `set _sheet to sheet "${escAS(sheetName)}"`
                  : `set _sheet to active sheet`
                }
                tell table 1 of _sheet
                  set _newRow to (count of rows) + 1
                  set row count to _newRow
                  set _cIdx to 0
                  repeat with _val in ${toASList(values)}
                    set _cIdx to _cIdx + 1
                    set value of cell _cIdx of row _newRow to _val
                  end repeat
                end tell
              end tell
              return "Added row with ${values.length} values"
            on error e
              return "Numbers add row error: " & e as string
            end try
          end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(script, 15_000);
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || "Numbers add row failed",
            { stderr }
          );
        }
        return ok({ result: stdout, valuesAdded: values.length });
      },
    }),

  };
}

import { z } from "zod";
import {
  ok,
  fail,
  escAS,
  dateTimeToAS,
  parseFlexibleDateTime,
  buildASDateFromComponents,
} from "../helpers/utils";
import { runOsascript, mapOsascriptError } from "../helpers/osascript";
import { CALENDAR_CONFIG, REMINDERS_CONFIG } from "../helpers/constants";
import { createRemindersScript } from "../helpers/builders";
import { requestCalendarAccess } from "../helpers/permissions";

export function registerCalendarReminderTools(tool: any) {
  return {
    calendar_create_event_iso: tool({
      name: "calendar_create_event_iso",
      description:
        "Create calendar event with robust date handling. Accepts 'YYYY-MM-DD' (all-day), 'YYYY-MM-DD HH:MM', or ISO8601 with timezone. Optional end or durationMinutes, location, description, calendarName, and alertMinutesBefore.",
      schema: z.object({
        title: z.string().min(1),
        start: z.string().min(1),
        end: z.string().optional(),
        durationMinutes: z.number().int().positive().optional(),
        allDay: z.boolean().optional(),
        alertMinutesBefore: z.number().int().positive().optional(),
        location: z.string().optional(),
        description: z.string().optional(),
        calendarName: z.string().optional(),
      }).refine(
        (v) => !!v.end || !!v.durationMinutes || v.allDay === true || /^\d{4}-\d{2}-\d{2}$/.test(v.start),
        {
          message:
            "Provide either end, durationMinutes, or an all-day start date (YYYY-MM-DD).",
        }
      ),
      handler: async ({
        title,
        start,
        end,
        durationMinutes,
        allDay,
        alertMinutesBefore,
        location,
        description,
        calendarName,
      }: any) => {
        try {
          const access = await requestCalendarAccess();
          if (!access.hasAccess) {
            return fail("Calendar access denied", { message: access.message });
          }

          const startParsed = parseFlexibleDateTime(start);
          if (!startParsed) {
            return fail("Invalid start format", {
              expected:
                "YYYY-MM-DD, YYYY-MM-DD HH:MM, or ISO8601 with optional timezone",
              got: start,
            });
          }

          let endParsed = end ? parseFlexibleDateTime(end) : null;
          const isAllDay =
            allDay === true || (!end && startParsed.allDay === true);

          if (!isAllDay) {
            if (!endParsed && typeof durationMinutes === "number") {
              // Compute end by adding duration to start (in local time)
              const base = new Date(
                startParsed.y,
                startParsed.m - 1,
                startParsed.d,
                startParsed.hh,
                startParsed.mm,
                startParsed.ss
              );
              const endMs = base.getTime() + durationMinutes * 60_000;
              const d2 = new Date(endMs);
              endParsed = {
                y: d2.getFullYear(),
                m: d2.getMonth() + 1,
                d: d2.getDate(),
                hh: d2.getHours(),
                mm: d2.getMinutes(),
                ss: d2.getSeconds(),
                allDay: false,
              };
            }
            if (!endParsed) {
              return fail("End time required", {
                message: "Provide end or durationMinutes for timed events",
              });
            }
            // Validate chronological order
            const cmpStart = new Date(
              startParsed.y,
              startParsed.m - 1,
              startParsed.d,
              startParsed.hh,
              startParsed.mm,
              startParsed.ss
            ).getTime();
            const cmpEnd = new Date(
              endParsed.y,
              endParsed.m - 1,
              endParsed.d,
              endParsed.hh,
              endParsed.mm,
              endParsed.ss
            ).getTime();
            if (cmpEnd <= cmpStart) {
              return fail("End must be after start");
            }
          } else {
            // For all-day events, set end to next day 00:00 local
            const d0 = new Date(startParsed.y, startParsed.m - 1, startParsed.d);
            const d1 = new Date(d0.getTime() + 24 * 60 * 60 * 1000);
            endParsed = {
              y: d1.getFullYear(),
              m: d1.getMonth() + 1,
              d: d1.getDate(),
              hh: 0,
              mm: 0,
              ss: 0,
              allDay: true,
            };
          }

          const startAS = buildASDateFromComponents("_start", startParsed);
          const endAS = buildASDateFromComponents("_end", endParsed!);

          const alarmAS =
            typeof alertMinutesBefore === "number"
              ? `\ntry\nmake new display alarm at end of display alarms of _event with properties {trigger interval:-${Math.abs(
                  alertMinutesBefore
                )}}\nend try\n`
              : "";

          const setAllDayAS = isAllDay
            ? `\ntry\nset all day event of _event to true\non error\ntry\nset allday event of _event to true\nend try\nend try\n`
            : "";

          const script = `
            try
              tell application "Calendar"
                if "${calendarName || ""}" is not "" then
                  set _cal to first calendar whose name is "${escAS(calendarName || "")}"
                else
                  try
                    set _cal to calendar 1
                  on error
                    set _cal to first calendar whose writable is true
                  end try
                end if
                ${startAS}
                ${endAS}
                tell _cal
                  set _event to make new event with properties {summary: "${escAS(
                    title
                  )}"}
                  try
                    set start date of _event to _start
                    set end date of _event to _end
                  end try
                  ${setAllDayAS}
                  ${
                    location ? `try\nset location of _event to "${escAS(location)}"\nend try` : ""
                  }
                  ${
                    description
                      ? `try\nset description of _event to "${escAS(description)}"\nend try`
                      : ""
                  }
                  ${alarmAS}
                end tell
                set _uid to ""
                try
                  set _uid to uid of _event
                end try
                return "Created event: ${escAS(title)} | " & _uid as string
              end tell
            on error e
              return "Calendar error: " & e as string
            end try`;

          const { stdout, stderr, exitCode } = await runOsascript(script, 20_000);
          if (exitCode !== 0) {
            return fail("Calendar event creation failed", { stderr });
          }
          if (stdout.includes("Calendar error:")) {
            return fail("Calendar operation failed", { details: stdout });
          }
          return ok({
            result: stdout,
            title,
            start,
            end: end || null,
            durationMinutes: durationMinutes || null,
            allDay: isAllDay,
            alertMinutesBefore: alertMinutesBefore || null,
          });
        } catch (error) {
          return fail("Calendar operation failed", { error: String(error) });
        }
      },
    }),

    calendar_get_events: tool({
      name: "calendar_get_events",
      description:
        "Get calendar events between two date-times. Accepts 'YYYY-MM-DD', 'YYYY-MM-DD HH:MM', or ISO8601 with timezone.",
      schema: z.object({
        start: z.string().min(1),
        end: z.string().min(1),
        calendarName: z.string().optional(),
      }),
      handler: async ({ start, end, calendarName }: any) => {
        const sp = parseFlexibleDateTime(start);
        const ep = parseFlexibleDateTime(end);
        if (!sp || !ep) {
          return fail("Invalid date range", { start, end });
        }
        const startAS = buildASDateFromComponents("_start", sp);
        const endAS = buildASDateFromComponents("_end", ep);
        const script = `
            try
              tell application "Calendar"
                ${startAS}
                ${endAS}
                set _events to {}
                set _cals to {}
                if "${calendarName || ""}" is not "" then
                  set _cals to {first calendar whose name is "${escAS(calendarName || "")}"}
                else
                  set _cals to calendars
                end if
                set _out to ""
                repeat with _c in _cals
                  set _evs to (every event of _c whose start date ≥ _start and end date ≤ _end)
                  repeat with _e in _evs
                    set _title to summary of _e
                    set _sd to start date of _e
                    set _ed to end date of _e
                    set _loc to ""
                    try
                      set _loc to location of _e
                    end try
                    set _line to _title & " | " & (_sd as string) & " | " & (_ed as string) & " | " & _loc
                    set _out to _out & _line & "\n"
                  end repeat
                end repeat
                return _out
              end tell
            on error e
              return "Calendar get events failed: " & e as string
            end try`;

        const { stdout, stderr, exitCode } = await runOsascript(script, CALENDAR_CONFIG.TIMEOUT_MS);
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || "Calendar get events failed",
            { stderr }
          );
        }
        return ok({ result: stdout, start, end, calendarName });
      },
    }),

    reminders_create_batch: tool({
      name: "reminders_create_batch",
      description:
        "Create multiple reminders in an optional list. Items may include title, notes, due, priority.",
      schema: z.object({
        list: z.string().optional(),
        items: z
          .array(
            z.object({
              title: z.string().min(1),
              notes: z.string().optional(),
              due: z.string().optional(),
              priority: z.enum(["low", "medium", "high"]).optional(),
            })
          )
          .min(1),
      }),
      handler: async ({ list, items }: any) => {
        const script = createRemindersScript(list || "", items);
        const { stdout, stderr, exitCode } = await runOsascript(
          script,
          REMINDERS_CONFIG.TIMEOUT_MS
        );
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || "Reminders creation failed",
            { stderr }
          );
        }
        return ok({ result: stdout, list: list || null, count: items.length });
      },
    }),

    reminders_create_enhanced: tool({
      name: "reminders_create_enhanced",
      description: "Create a new reminder with enhanced options.",
      schema: z.object({
        name: z.string().min(1),
        listName: z.string().default("Reminders").optional(),
        notes: z.string().optional(),
        dueDate: z.string().optional(),
        priority: z.enum(["low", "medium", "high"]).default("high"),
      }),
      handler: async ({ name, listName = "Reminders", notes, dueDate, priority }: any) => {
        const script = `
            tell application "Reminders"
              try
                set _list to list "${escAS(listName)}"
                set _reminder to make new reminder at end of reminders of _list
                set name of _reminder to "${escAS(name)}"
                ${notes ? `set body of _reminder to "${escAS(notes)}"` : ""}
                ${
                  dueDate
                    ? `${dateTimeToAS(dueDate, "_dueDate")}\nset due date of _reminder to _dueDate`
                    : ""
                }
                
                if "${priority}" is "high" then set priority of _reminder to high
                if "${priority}" is "medium" then set priority of _reminder to medium
                if "${priority}" is "low" then set priority of _reminder to low
                
                return "Created reminder: ${escAS(name)} in list: ${escAS(listName)}"
              on error e
                return "Reminders error: " & e
              end try
            end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(
          script,
          REMINDERS_CONFIG.TIMEOUT_MS
        );
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || "Reminder creation failed",
            { stderr }
          );
        }
        return ok({ result: stdout, name, listName, priority });
      },
    }),
  };
}

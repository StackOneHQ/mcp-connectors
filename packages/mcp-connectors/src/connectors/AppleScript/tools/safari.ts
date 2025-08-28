import { z } from "zod";
import { ok, fail, toASList } from "../helpers/utils";
import { runOsascript, mapOsascriptError } from "../helpers/osascript";

export function registerSafariTools(tool: any) {
  return {
    safari_open_many: tool({
      name: "safari_open_many",
      description:
        "Open multiple URLs in Safari (ensures a window, adds tabs).",
      schema: z.object({
        urls: z.array(z.string().url()).min(1),
        inNewWindow: z.boolean().optional().default(false),
      }),
      handler: async ({ urls, inNewWindow }: { urls: string[]; inNewWindow?: boolean }) => {
        const asUrls = toASList(urls);
        const script = `
            tell application "Safari"
              activate
              if ${inNewWindow ? "true" : "(count of windows) = 0"} then
                make new document with properties {URL:(item 1 of ${asUrls})}
              else
                set URL of current tab of front window to (item 1 of ${asUrls})
              end if
              
              repeat with i from 2 to count of ${asUrls}
                tell front window to make new tab with properties {URL:(item i of ${asUrls})}
              end repeat
              
              return "Opened " & (count of ${asUrls}) & " URL(s)"
            end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(script, 30_000);
        if (exitCode !== 0)
          return fail(mapOsascriptError(stderr, exitCode) || "Safari error", {
            stderr,
          });
        return ok({ result: stdout });
      },
    }),

    safari_extract_content: tool({
      name: "safari_extract_content",
      description:
        "Extract URL, title, rendered text, selected text, HTML source, meta description, and links from Safari tabs. Perfect for web research - can extract from current tab, front window, or all windows. Note: Content extraction requires 'Allow JavaScript from Apple Events' in Safari Developer settings.",
      schema: z.object({
        scope: z
          .enum(["current", "frontWindow", "allWindows"])
          .default("current"),
        include: z
          .array(
            z.enum([
              "url",
              "title",
              "text",
              "selection",
              "html",
              "meta",
              "links",
            ])
          )
          .default(["url", "title", "text"]),
        maxCharsPerField: z.number().int().positive().default(200000),
        urlIncludes: z.string().optional(),
        dryRun: z.boolean().optional(),
      }),
      handler: async ({
        scope,
        include,
        maxCharsPerField,
        urlIncludes,
        dryRun,
      }: any) => {
        if (dryRun) return ok({ dryRun: true, scope, include });

        function jsExpr(key: string) {
          switch (key) {
            case "text":
              return "document.body && document.body.innerText || ''";
            case "selection":
              return "window.getSelection && window.getSelection().toString() || ''";
            case "meta":
              return "(document.querySelector('meta[name=description]') && document.querySelector('meta[name=description]').content) || ''";
            case "links":
              return "Array.from(document.querySelectorAll('a[href]')).slice(0, 1000).map(a => (a.textContent||'').trim() + ' | ' + a.href).join('\\n')";
            default:
              return "''";
          }
        }

        const need = new Set(include);
        const wantsText = need.has("text");
        const wantsSel = need.has("selection");
        const wantsHTML = need.has("html");
        const wantsMeta = need.has("meta");
        const wantsLinks = need.has("links");
        const wantsTitle = need.has("title");
        const wantsURL = need.has("url");

        const script = `
set _scope to "${scope}"
set _urlFilter to "${urlIncludes ? urlIncludes.replace(/"/g, '\\"') : ""}"
set _maxLen to ${Math.max(1000, maxCharsPerField)}

on _escJSON(s)
  set s to s as text
  set s to my _replaceAll(s, "\\\\", "\\\\\\\\")
  set s to my _replaceAll(s, "\\"", "\\\\\\"")
  set s to my _replaceAll(s, return, "\\\\n")
  set s to my _replaceAll(s, linefeed, "\\\\n")
  return s
end _escJSON

on _truncate(s, limitN)
  if (length of s) > limitN then
    return (text 1 thru limitN of s) & "…"
  else
    return s
  end if
end _truncate

on _replaceAll(s, find, repl)
  set {tid, AppleScript's text item delimiters} to {AppleScript's text item delimiters, find}
  set parts to every text item of s
  set AppleScript's text item delimiters to repl
  set s to parts as text
  set AppleScript's text item delimiters to tid
  return s
end _replaceAll

tell application "Safari"
  set _targets to {}
  if _scope is "current" then
    set end of _targets to current tab of front window
  else if _scope is "frontWindow" then
    repeat with t in tabs of front window
      set end of _targets to t
    end repeat
  else
    repeat with w in windows
      repeat with t in tabs of w
        set end of _targets to t
      end repeat
    end repeat
  end if

  set _out to ""
  repeat with t in _targets
    set _url to ""
    set _title to ""
    try
      set _url to URL of t
      set _title to name of t
    end try

    set _skip to false
    if _urlFilter is not "" then
      if _url does not contain _urlFilter then
        set _skip to true
      end if
    end if
    
    if not _skip then
      set _text to ""
      set _sel to ""
      set _meta to ""
      set _links to ""
      set _html to ""

      ${
        wantsText
          ? `try\n        set _text to do JavaScript "${jsExpr("text").replace(
              /"/g,
              '\\"'
            )}" in t\n      end try`
          : ""
      }
      ${
        wantsSel
          ? `try\n        set _sel to do JavaScript "${jsExpr(
              "selection"
            ).replace(/"/g, '\\"')}" in t\n      end try`
          : ""
      }
      ${
        wantsMeta
          ? `try\n        set _meta to do JavaScript "${jsExpr("meta").replace(
              /"/g,
              '\\"'
            )}" in t\n      end try`
          : ""
      }
      ${
        wantsLinks
          ? `try\n        set _links to do JavaScript "${jsExpr(
              "links"
            ).replace(/"/g, '\\"')}" in t\n      end try`
          : ""
      }
      ${
        wantsHTML
          ? `try\n        set _html to source of document 1\n      end try`
          : ""
      }

      set _obj to "{"
      ${
        wantsTitle
          ? `set _obj to _obj & "\\"title\\":\\"" & my _escJSON(_title) & ","`
          : ""
      }
      ${
        wantsURL
          ? `set _obj to _obj & "\\"url\\":\\"" & my _escJSON(_url) & ","`
          : ""
      }
      ${
        wantsMeta
          ? `set _obj to _obj & "\\"meta\\":\\"" & my _escJSON(my _truncate(_meta, _maxLen)) & ","`
          : ""
      }
      ${
        wantsSel
          ? `set _obj to _obj & "\\"selection\\":\\"" & my _escJSON(my _truncate(_sel, _maxLen)) & ","`
          : ""
      }
      ${
        wantsText
          ? `set _obj to _obj & "\\"text\\":\\"" & my _escJSON(my _truncate(_text, _maxLen)) & ","`
          : ""
      }
      ${
        wantsLinks
          ? `set _obj to _obj & "\\"links\\":\\"" & my _escJSON(my _truncate(_links, _maxLen)) & ","`
          : ""
      }
      ${
        wantsHTML
          ? `set _obj to _obj & "\\"html\\":\\"" & my _escJSON(my _truncate(_html, _maxLen)) & ","`
          : ""
      }

      if text -1 of _obj is "," then set _obj to text 1 thru -2 of _obj
      set _obj to _obj & "}"
      set _out to _out & _obj & linefeed
    end if
  end repeat
end tell

return _out`;

        const { stdout, stderr, exitCode } = await runOsascript(script, 60000);
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || "Safari extraction failed",
            { stderr }
          );
        }

        const lines = stdout.split(/\r?\n/).filter(Boolean);
        const items: any[] = [];
        for (const line of lines) {
          try {
            items.push(JSON.parse(line));
          } catch {
          }
        }

        return ok({
          count: items.length,
          items,
          scope,
          extractedFields: include,
        });
      },
    }),
  };
}


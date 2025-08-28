import { z } from "zod";
import { ok, fail, escAS, isPathAllowed } from "../helpers/utils";
import { runOsascript, mapOsascriptError } from "../helpers/osascript";

export function registerMiscTools(tool: any) {
  return {

    preview_open_file: tool({
      name: "preview_open_file",
      description: "Open a file in Preview app.",
      schema: z.object({ filePath: z.string().min(1) }),
      handler: async ({ filePath }: any, context: any) => {
        const { allowedPaths, blockedPaths } = await context.getCredentials();
        if (!isPathAllowed(filePath, allowedPaths, blockedPaths)) {
          return fail(`Denied: path not allowed by sandbox: ${filePath}`);
        }

        const script = `
            tell application "Preview"
              activate
              open POSIX file "${escAS(filePath)}"
              return "Opened file in Preview: ${escAS(filePath)}"
            end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(script, 15_000);
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || "Preview open failed",
            { stderr }
          );
        }
        return ok({ result: stdout, filePath });
      },
    }),

    photos_create_album: tool({
      name: "photos_create_album",
      description: "Create a new album in Photos app.",
      schema: z.object({ albumName: z.string().min(1) }),
      handler: async ({ albumName }: any) => {
        const script = `
            tell application "Photos"
              activate
              make new album named "${escAS(albumName)}"
              return "Created Photos album: ${escAS(albumName)}"
            end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(script, 15_000);
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) ||
              "Photos album creation failed",
            { stderr }
          );
        }
        return ok({ result: stdout, albumName });
      },
    }),

    things_create_todo: tool({
      name: "things_create_todo",
      description: "Create a new todo in Things 3 using URL scheme.",
      schema: z.object({
        title: z.string().min(1),
        notes: z.string().optional(),
        when: z.string().optional(),
        deadline: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }),
      handler: async ({ title, notes, when, deadline, tags }: any) => {
        let thingsUrl = `things:///add?title=${encodeURIComponent(title)}`;
        if (notes) thingsUrl += `&notes=${encodeURIComponent(notes)}`;
        if (when) thingsUrl += `&when=${encodeURIComponent(when)}`;
        if (deadline) thingsUrl += `&deadline=${encodeURIComponent(deadline)}`;
        if (tags?.length)
          thingsUrl += `&tags=${encodeURIComponent(tags.join(","))}`;

        const script = `open location "${thingsUrl}"`;
        const { stderr, exitCode } = await runOsascript(script, 10_000);
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) ||
              "Things todo creation failed",
            { stderr }
          );
        }
        return ok({ result: `Created todo: ${title}`, title, thingsUrl });
      },
    }),

    numbers_open: tool({
      name: "numbers_open",
      description: "Open Numbers app with optional document path. If no path provided, opens new blank spreadsheet.",
      schema: z.object({
        documentPath: z.string().optional().describe("Optional path to existing Numbers document to open"),
      }),
      handler: async ({ documentPath }: any, context: any) => {
        if (documentPath) {
          const { allowedPaths, blockedPaths } = await context.getCredentials();
          if (!isPathAllowed(documentPath, allowedPaths, blockedPaths)) {
            return fail(`Denied: path not allowed by sandbox: ${documentPath}`);
          }
        }

        const script = documentPath 
          ? `
            tell application "Numbers"
              activate
              try
                open POSIX file "${escAS(documentPath)}"
                return "Opened Numbers document: ${escAS(documentPath)}"
              on error e
                return "Numbers error: " & e
              end try
            end tell`
          : `
            tell application "Numbers"
              activate
              try
                make new document
                return "Opened new Numbers document"
              on error e
                return "Numbers error: " & e
              end try
            end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(script, 20_000);
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || "Numbers open failed",
            { stderr }
          );
        }

        return ok({ 
          result: stdout, 
          documentPath: documentPath || "new document",
          app: "Numbers" 
        });
      },
    }),

    keynote_open: tool({
      name: "keynote_open", 
      description: "Open Keynote app with optional presentation path. If no path provided, opens new blank presentation.",
      schema: z.object({
        presentationPath: z.string().optional().describe("Optional path to existing Keynote presentation to open"),
        theme: z.string().optional().describe("Theme name for new presentation (only used when no presentationPath provided)"),
      }),
      handler: async ({ presentationPath, theme }: any, context: any) => {
        if (presentationPath) {
          const { allowedPaths, blockedPaths } = await context.getCredentials();
          if (!isPathAllowed(presentationPath, allowedPaths, blockedPaths)) {
            return fail(`Denied: path not allowed by sandbox: ${presentationPath}`);
          }
        }

        const script = presentationPath 
          ? `
            tell application "Keynote"
              activate
              try
                open POSIX file "${escAS(presentationPath)}"
                return "Opened Keynote presentation: ${escAS(presentationPath)}"
              on error e
                return "Keynote error: " & e
              end try
            end tell`
          : `
            tell application "Keynote"
              activate
              try
                ${theme 
                  ? `make new document with properties {document theme:theme "${escAS(theme)}"}`
                  : `make new document`
                }
                return "Opened new Keynote presentation${theme ? ` with ${theme} theme` : ''}"
              on error e
                return "Keynote error: " & e
              end try
            end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(script, 20_000);
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || "Keynote open failed",
            { stderr }
          );
        }

        return ok({ 
          result: stdout, 
          presentationPath: presentationPath || "new presentation",
          theme: theme || "default",
          app: "Keynote" 
        });
      },
    }),

    pages_open: tool({
      name: "pages_open",
      description: "Open Pages app with optional document path. If no path provided, opens new blank document.",
      schema: z.object({
        documentPath: z.string().optional().describe("Optional path to existing Pages document to open"),
        template: z.string().optional().describe("Template name for new document (only used when no documentPath provided)"),
      }),
      handler: async ({ documentPath, template }: any, context: any) => {
        if (documentPath) {
          const { allowedPaths, blockedPaths } = await context.getCredentials();
          if (!isPathAllowed(documentPath, allowedPaths, blockedPaths)) {
            return fail(`Denied: path not allowed by sandbox: ${documentPath}`);
          }
        }

        const script = documentPath 
          ? `
            tell application "Pages"
              activate
              try
                open POSIX file "${escAS(documentPath)}"
                return "Opened Pages document: ${escAS(documentPath)}"
              on error e
                return "Pages error: " & e
              end try
            end tell`
          : `
            tell application "Pages"
              activate
              try
                ${template 
                  ? `make new document with properties {template name:"${escAS(template)}"}`
                  : `make new document`
                }
                return "Opened new Pages document${template ? ` with ${template} template` : ''}"
              on error e
                return "Pages error: " & e
              end try
            end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(script, 20_000);
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || "Pages open failed",
            { stderr }
          );
        }

        return ok({ 
          result: stdout, 
          documentPath: documentPath || "new document",
          template: template || "default",
          app: "Pages" 
        });
      },
    }),

    
  };
}


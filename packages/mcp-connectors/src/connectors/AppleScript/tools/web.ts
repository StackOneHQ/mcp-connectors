import { z } from "zod";
import { promisify } from "node:util";
import { exec } from "node:child_process";
import { ok, fail, sanitizeShellString } from "../helpers/utils";
import { runOsascript, mapOsascriptError } from "../helpers/osascript";
import { DEFAULT_MAX_BUFFER, WEBSEARCH_CONFIG } from "../helpers/constants";

const execAsync = promisify(exec);

export function registerWebTools(tool: any) {
  return {
    headless_chrome_fetch: tool({
      name: "headless_chrome_fetch",
      description:
        "Fetch a URL with headless Chrome/Chromium and return the fully-rendered DOM (no GUI, no Apple Events). Useful for pages requiring JavaScript.",
      schema: z.object({
        url: z.string().url(),
        chromePath: z.string().optional(),
        userAgent: z.string().optional(),
        extraArgs: z.array(z.string()).optional(),
        timeoutMs: z.number().int().positive().optional(),
        maxChars: z.number().int().positive().max(25000).default(20000).optional(),
      }),
      handler: async ({ url, chromePath, userAgent, extraArgs, timeoutMs, maxChars = 20000 }: any) => {
        // Normalize search engine URLs to more scraper-friendly endpoints
        const normalizeSearchUrl = (inputUrl: string): string => {
          try {
            const urlObj = new URL(inputUrl);
            
            // Convert DuckDuckGo to HTML endpoint for better scraping
            if (urlObj.hostname === 'duckduckgo.com' || urlObj.hostname === 'www.duckduckgo.com') {
              const query = urlObj.searchParams.get('q');
              if (query && urlObj.pathname === '/') {
                return `https://duckduckgo.com/lite?q=${encodeURIComponent(query)}`;
              }
            }
            
            // Convert Google search to a more basic endpoint
            if (urlObj.hostname === 'www.google.com' || urlObj.hostname === 'google.com') {
              const query = urlObj.searchParams.get('q');
              if (query) {
                return `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10&safe=off&lr=lang_en`;
              }
            }
            
            // Convert Bing search
            if (urlObj.hostname === 'www.bing.com' || urlObj.hostname === 'bing.com') {
              const query = urlObj.searchParams.get('q');
              if (query) {
                return `https://www.bing.com/search?q=${encodeURIComponent(query)}&form=QBLH`;
              }
            }
            
            return inputUrl;
          } catch {
            return inputUrl;
          }
        };

        const normalizedUrl = normalizeSearchUrl(url);

        const defaultCandidates = [
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary", 
          "/Applications/Chromium.app/Contents/MacOS/Chromium",
        ];

        const finalCandidates = chromePath ? [chromePath] : defaultCandidates;

        const buildCmd = (bin: string) => {
          // Rotate between several realistic user agents
          const userAgents = [
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
          ];
          
          const selectedUA = userAgent || userAgents[Math.floor(Math.random() * userAgents.length)];
          const uaArg = ` --user-agent="${sanitizeShellString(selectedUA)}"`;

          // Try minimal flags approach for maximum stealth
          const stealthFlags = [
            "--headless=new",
            "--disable-gpu", 
            "--dump-dom",
            "--window-size=1366,768",
            
            // Essential stealth only
            "--disable-blink-features=AutomationControlled",
            "--exclude-switches=enable-automation",
            "--no-default-browser-check",
            "--no-first-run",
            "--disable-default-apps",
            "--disable-sync",
            "--disable-extensions",
            
            // Try to appear more like a regular browser
            "--enable-features=NetworkService",
            "--disable-features=VizDisplayCompositor"
          ];

          const extra = extraArgs && extraArgs.length 
            ? extraArgs.map((a: string) => `"${sanitizeShellString(a)}"`) 
            : [];

          const allFlags = [...stealthFlags, ...extra].join(" ");
          return `"${bin}" ${allFlags}${uaArg} "${sanitizeShellString(normalizedUrl)}"`;
        };

        const execOpts = {
          timeout: Math.min(Math.max(5_000, timeoutMs ?? 45_000), 120_000),
          maxBuffer: Math.max(DEFAULT_MAX_BUFFER, 5_242_880),
          env: process.env,
        } as const;

        let lastErr: unknown = null;
        let workingBinary: string | null = null;
        const { execSync } = require("child_process");

        // First, find a working Chrome binary
        for (const bin of finalCandidates) {
          try {
            if (bin.startsWith("/Applications/")) {
              // Check if macOS app bundle exists
              execSync(`test -f "${bin}"`, { stdio: 'ignore' });
              workingBinary = bin;
              break;
            } else {
              // Check if CLI command exists
              execSync(`which "${bin}"`, { stdio: 'ignore' });
              workingBinary = bin;
              break;
            }
          } catch {
            // Binary doesn't exist, try next candidate
            continue;
          }
        }

        if (!workingBinary) {
          return fail("Chrome/Chromium not found", {
            tried: finalCandidates,
            hint: "Install Google Chrome or provide chromePath parameter. On macOS: /Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
          });
        }

        // Add random delay to appear more human-like (1-3 seconds)
        const humanDelay = Math.floor(Math.random() * 2000) + 1000;
        await new Promise(resolve => setTimeout(resolve, humanDelay));

        // Now try to use the working binary
        try {
          const { stdout } = await execAsync(buildCmd(workingBinary), execOpts as any);
          const stdoutStr = stdout.toString();

          // More specific bot detection - be less aggressive
          const botDetectionPatterns = [
            "unusual traffic",
            "enable javascript", 
            "CAPTCHA",
            "Access denied",
            "blocked by",
            "not a robot",
            "verify you are human",
            "cloudflare",
            "rate limit"
          ];

          const detectedPattern = botDetectionPatterns.find(pattern => 
            stdoutStr.toLowerCase().includes(pattern.toLowerCase())
          );

          if (detectedPattern) {
            const preview = stdoutStr.substring(0, 300).replace(/\s+/g, ' ').trim();
            throw new Error(`Bot detection triggered - site blocked automated access (detected: ${detectedPattern}) - Preview: ${preview}`);
          }

          // Check for completely empty or minimal responses that might indicate blocking
          if (stdoutStr.trim().length < 100 && !stdoutStr.includes("<html")) {
            const preview = stdoutStr.substring(0, 200).replace(/\s+/g, ' ').trim();
            throw new Error(`Minimal response received - possible bot detection or site issue - Content: ${preview}`);
          }

          let processedContent = stdoutStr;
          if (processedContent.length > maxChars) {
            const truncateAt = Math.min(maxChars, processedContent.length);
            let cutPoint = processedContent.lastIndexOf('</p>', truncateAt);
            if (cutPoint === -1) cutPoint = processedContent.lastIndexOf('</div>', truncateAt);
            if (cutPoint === -1) cutPoint = processedContent.lastIndexOf(' ', truncateAt);
            if (cutPoint === -1) cutPoint = truncateAt;

            processedContent = processedContent.substring(0, cutPoint) + "\n\n[Content truncated to avoid token limits]";
          }

          return ok({
            url: normalizedUrl,
            html: processedContent,
            chromePath: workingBinary,
            truncated: stdoutStr.length > maxChars,
            originalLength: stdoutStr.length,
            processedLength: processedContent.length,
            usedArgs: {
              headlessNew: true,
              dumpDom: true,
              userAgent: !!userAgent,
              extraArgs: extraArgs?.length || 0,
              antiDetection: true,
              normalizedUrl: normalizedUrl !== url
            },
          });
        } catch (error) {
          lastErr = error;
          // Add debug info to the error for troubleshooting
          if (error instanceof Error && error.message.includes("Bot detection")) {
            // Error already has details, keep it as is
          } else if (error instanceof Error) {
            // Add more context for other errors
            error.message += ` (Chrome binary: ${workingBinary})`;
          }
        }

        // If we get here, execution failed but Chrome was found
        let errMsg = "Unable to fetch URL with headless Chrome. ";
        let hint = "";
        let alternativeSuggestions: string[] = [];
        
        if (lastErr instanceof Error) {
          if (lastErr.message.includes("Bot detection")) {
            errMsg += "Site detected automated access and blocked the request.";
            hint = "Some sites block automated access. Try alternative approaches or different sites.";
            
            // Suggest alternative sites based on the original request
            try {
              const urlObj = new URL(url);
              if (urlObj.searchParams.get('q')) {
                const query = urlObj.searchParams.get('q');
                alternativeSuggestions = [
                  `https://en.wikipedia.org/wiki/${query?.replace(/\s+/g, '_')}`,
                  `https://www.britannica.com/search?query=${encodeURIComponent(query || '')}`,
                  `https://simple.wikipedia.org/wiki/${query?.replace(/\s+/g, '_')}`,
                ];
              }
            } catch {}
          } else {
            errMsg += `Chrome was found but request failed. Details: ${lastErr.message}`;
            hint = "The site may be blocking headless browsers, have network issues, or require specific headers.";
          }
        } else {
          errMsg += "Chrome was found but request failed for unknown reasons.";
          hint = "Try a different URL or check network connectivity.";
        }

        return fail(errMsg, {
          url: normalizedUrl,
          originalUrl: url,
          tried: finalCandidates,
          foundBinary: workingBinary,
          hint,
          alternatives: alternativeSuggestions,
          stealthFeatures: {
            randomUserAgent: true,
            humanDelay: true,
            urlNormalization: normalizedUrl !== url,
            antiDetectionFlags: 25
          }
        });
      },
    }),

    web_search: tool({
      name: "web_search",
      description: "Perform a web search using Safari (simplified version).",
      schema: z.object({
        query: z.string().min(1),
        numResults: z.number().default(3).optional(),
      }),
      handler: async ({ query, numResults: _numResults = 3 }: { query: string; numResults?: number }) => {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        const script = `
            tell application "Safari"
              activate
              if (count of windows) = 0 then
                make new document with properties {URL:"${searchUrl}"}
              else
                set URL of current tab of front window to "${searchUrl}"
              end if
              return "Search initiated for: ${query.replace(/"/g, '\\"')}"
            end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(
          script,
          WEBSEARCH_CONFIG.TIMEOUT
        );
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || "Web search failed",
            { stderr }
          );
        }
        return ok({ result: stdout, query, searchUrl });
      },
    }),
  };
}


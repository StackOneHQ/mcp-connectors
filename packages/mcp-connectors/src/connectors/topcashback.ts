import { mcpConnectorConfig } from "@stackone/mcp-config-types";
import { parse as parseHTML } from "node-html-parser";
import { z } from "zod";

/**
 * Minimal cookie jar helper – stores simple name=value pairs (ignores path, expiry, etc.)
 */
function extractCookies(setCookieHeaders: string[]): string {
  const pairs: string[] = [];
  for (const header of setCookieHeaders) {
    const firstPart = header.split(";")[0]?.trim();
    if (firstPart && !/^\s*$/.test(firstPart)) {
      pairs.push(firstPart);
    }
  }
  // Deduplicate by cookie name (last one wins)
  const map = new Map<string, string>();
  for (const p of pairs) {
    const [name, ...rest] = p.split("=");
    map.set(name, `${name}=${rest.join("=")}`);
  }
  return Array.from(map.values()).join("; ");
}

async function performLogin(
  email: string,
  password: string
): Promise<{ cookies: string }> {
  const LOGIN_URL =
    "https://www.topcashback.co.uk/logon/?PageRequested=%2Fhome%2F";

  // 1. Get login page to retrieve anti-forgery token + initial cookies
  const loginPageResp = await fetch(LOGIN_URL, { method: "GET" });
  if (!loginPageResp.ok) {
    throw new Error(`Failed to load login page: ${loginPageResp.status}`);
  }
  const initialCookies = extractCookies(
    loginPageResp.headers.getSetCookie
      ? loginPageResp.headers.getSetCookie()
      : []
  );
  const loginHtml = await loginPageResp.text();
  const tokenMatch = loginHtml.match(
    /name="__RequestVerificationToken"\s+type="hidden"\s+value="([^"]+)"/i
  );
  const antiForgery = tokenMatch ? tokenMatch[1] : "";
  if (!antiForgery) {
    // Tolerate missing token (site may change); continue with blank
    console.warn(
      "TopCashback login: anti-forgery token not found – proceeding without"
    );
  }

  // 2. Submit credentials
  const form = new URLSearchParams();
  form.append("email", email);
  form.append("password", password);
  if (antiForgery) form.append("__RequestVerificationToken", antiForgery);

  const loginResp = await fetch(LOGIN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 MCP TopCashback Connector",
      Cookie: initialCookies,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: form.toString(),
    redirect: "manual",
  });

  if (
    loginResp.status === 302 ||
    loginResp.status === 301 ||
    loginResp.status === 200
  ) {
    const newCookies = extractCookies(
      loginResp.headers.getSetCookie ? loginResp.headers.getSetCookie() : []
    );
    const allCookies = [initialCookies, newCookies].filter(Boolean).join("; ");
    if (!allCookies) {
      throw new Error("Login did not return any session cookies");
    }
    return { cookies: allCookies };
  }
  if (loginResp.status === 401) {
    throw new Error("Invalid credentials (401)");
  }
  throw new Error(`Login failed: ${loginResp.status}`);
}

async function searchMerchants(
  query: string,
  limit: number,
  cookies: string
): Promise<string[]> {
  const url =
    "https://www.topcashback.co.uk/Ajax.asmx/GetAutocompleteMerchants";
  const timestamp = Date.now().toString();
  const body = new URLSearchParams({
    q: query,
    limit: String(limit),
    timestamp,
  }).toString();
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "application/xml, text/xml, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      Cookie: cookies,
      Referer: "https://www.topcashback.co.uk/home/",
    },
    body,
  });
  if (!resp.ok) {
    if (resp.status === 401 || resp.status === 403) {
      throw new Error("Unauthorized – session expired, please login again");
    }
    throw new Error(`Search failed: ${resp.status}`);
  }
  const xml = await resp.text();
  const matches = Array.from(xml.matchAll(/<string>([\s\S]*?)<\/string>/g)).map(
    (m) => m[1]
  );
  const merchants: string[] = [];
  for (const fragment of matches) {
    if (fragment.includes("SUGGESTED SEARCHES")) continue; // skip header block
    // Decode minimal HTML entities and parse
    const decoded = fragment
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
    const root = parseHTML(decoded);
    const name = root.querySelector(".ac_name")?.text?.trim();
    if (name) merchants.push(name);
  }
  return merchants;
}

async function fetchCashbackRate(
  slug: string,
  cookies?: string
): Promise<{ rate: string | null; rawText: string | null }> {
  const url = `https://www.topcashback.co.uk/${slug.replace(
    /[^a-z0-9-]/gi,
    ""
  )}/`;
  const resp = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 MCP TopCashback Connector",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      ...(cookies ? { Cookie: cookies } : {}),
    },
  });
  if (!resp.ok) {
    throw new Error(`Failed to fetch merchant page (${resp.status})`);
  }
  const html = await resp.text();
  const root = parseHTML(html);
  const span = root.querySelector(".merch-cat__rate");
  const raw = span ? span.text.trim().replace(/\s+/g, " ") : null;
  return { rate: raw, rawText: raw };
}

export const TopCashbackConnectorConfig = mcpConnectorConfig({
  name: "TopCashback",
  key: "topcashback",
  version: "1.0.0",
  logo: "https://stackone-logos.com/api/topcashback/filled/svg",
  credentials: z.object({
    email: z.string().describe("Your TopCashback account email"),
    password: z.string().describe("Your TopCashback account password"),
  }),
  setup: z.object({}),
  examplePrompt:
    'Login to TopCashback, search for the merchant "eBay" and return the current publicly shown cashback rate.',
  tools: (tool) => ({
    LOGIN: tool({
      name: "topcashback_login",
      description:
        "Authenticate with TopCashback and cache a session. Provide email/password args or have stored credentials.",
      schema: z.object({
        email: z
          .string()
          .optional()
          .describe("TopCashback account email (optional if stored credentials configured)"),
        password: z
          .string()
          .optional()
          .describe("TopCashback account password (optional if stored credentials configured)"),
      }),
      handler: async (args, context) => {
        try {
          let stored: any = {};
          try {
            stored = (await context.getCredentials()) || {};
          } catch {
            // ignore if credentials store not available
          }
          const email = (args.email || stored.email) as string | undefined;
            const password = (args.password || stored.password) as
            | string
            | undefined;
          if (!email || !password) {
            return "Missing credentials: supply email/password arguments or configure stored credentials.";
          }
          const session = await performLogin(email, password);
          await context.writeCache("topcashback:session", session.cookies);
          return "Login successful";
        } catch (e) {
          return `Login failed: ${e instanceof Error ? e.message : String(e)}`;
        }
      },
    }),
    SEARCH_MERCHANTS: tool({
      name: "topcashback_search_merchants",
      description:
        "Search for merchants by name using TopCashback autocomplete (requires prior login)",
      schema: z.object({
        query: z.string().describe("Merchant search query fragment"),
        limit: z.number().default(10).describe("Maximum merchants to return"),
      }),
      handler: async (args, context) => {
        try {
          const cookies = (await context.readCache("topcashback:session")) as
            | string
            | null;
          if (!cookies) {
            return "No active session found. Please run the login tool first.";
          }
          const merchants = await searchMerchants(
            args.query,
            args.limit,
            cookies
          );
          if (merchants.length === 0) return "No merchants found for query";
          return merchants.join("\n");
        } catch (e) {
          return `Merchant search failed: ${
            e instanceof Error ? e.message : String(e)
          }`;
        }
      },
    }),
    GET_CASHBACK_RATE: tool({
      name: "topcashback_get_cashback_rate",
      description:
        "Fetch and return the displayed cashback rate for a merchant slug (requires login for member-only rates)",
      schema: z.object({
        merchantSlug: z
          .string()
          .describe(
            'Merchant slug as in URL, e.g. "ebay" for https://www.topcashback.co.uk/ebay/'
          ),
      }),
      handler: async (args, context) => {
        try {
          const cookies = (await context.readCache("topcashback:session")) as
            | string
            | null;
          const { rate } = await fetchCashbackRate(
            args.merchantSlug,
            cookies === null ? undefined : cookies
          );
          if (!rate) return "Cashback rate element not found";
          const normalized = normalizePercentage(rate);
          return `Merchant: ${
            args.merchantSlug
          }\nCashback Rate: ${rate}\nNormalized: ${JSON.stringify(normalized)}`;
        } catch (e) {
          return `Failed to get cashback rate: ${
            e instanceof Error ? e.message : String(e)
          }`;
        }
      },
    }),
    GET_CASHBACK_RATE_BEST_MATCH: tool({
      name: "topcashback_get_cashback_rate_best_match",
      description:
        "Search merchants, pick the best matching merchant for the given query, then fetch and normalize its cashback rate",
      schema: z.object({
        query: z.string().describe("Merchant name query"),
        limit: z
          .number()
          .default(10)
          .describe("How many autocomplete results to consider"),
      }),
      handler: async (args, context) => {
        try {
          const cookies = (await context.readCache("topcashback:session")) as
            | string
            | null;
          if (!cookies)
            return "No active session found. Please run the login tool first.";
          const merchants = await searchMerchants(
            args.query,
            args.limit,
            cookies
          );
          if (merchants.length === 0) return "No merchants found for query";
          const best = pickBestMatch(args.query, merchants);
          if (!best) return "Unable to determine best match";
          const slug = nameToSlug(best);
          const { rate } = await fetchCashbackRate(slug, cookies);
          if (!rate)
            return `Best match '${best}' found but cashback rate element not present`;
          const normalized = normalizePercentage(rate);
          return `Best Match: ${best}\nSlug: ${slug}\nCashback Rate: ${rate}\nNormalized: ${JSON.stringify(
            normalized
          )}`;
        } catch (e) {
          return `Failed to get best match cashback rate: ${
            e instanceof Error ? e.message : String(e)
          }`;
        }
      },
    }),
  }),
});

// --- Helpers for best-match and normalization ---
function scoreCandidate(query: string, candidate: string): number {
  const q = query.toLowerCase();
  const c = candidate.toLowerCase();
  if (q === c) return 100;
  if (c.startsWith(q)) return 80;
  if (c.includes(q)) return 60;
  // simple overlap score
  let overlap = 0;
  for (const ch of new Set(q.split(""))) if (c.includes(ch)) overlap++;
  return overlap;
}

function pickBestMatch(query: string, candidates: string[]): string | null {
  let best: string | null = null;
  let bestScore = -1;
  for (const c of candidates) {
    const s = scoreCandidate(query, c);
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  return best;
}

function nameToSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

interface NormalizedPercentageInfo {
  raw: string;
  percentages: number[];
  minPercentage: number | null;
  maxPercentage: number | null;
  range: boolean;
}

function normalizePercentage(rawInput: string): NormalizedPercentageInfo {
  const raw = String(rawInput);
  const percentMatches = Array.from(raw.matchAll(/(\d+(?:\.\d+)?)\s*%/g)).map(
    (m) => parseFloat(m[1] as string)
  );
  const percentages = percentMatches.sort((a, b) => a - b);
  const min: number | null = percentages.length ? percentages[0]! : null;
  const max: number | null = percentages.length
    ? percentages[percentages.length - 1]!
    : null;
  return {
    raw: raw,
    percentages,
    minPercentage: min,
    maxPercentage: max,
    range: !!(min !== null && max !== null && min !== max),
  };
}

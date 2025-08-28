import { mcpConnectorConfig } from "@stackone/mcp-config-types";
import { parse as parseHTML } from "node-html-parser";
import { z } from "zod";

// Simple cookie extraction helper
function extractCookies(setCookieHeaders: string[]): string {
  const pairs: string[] = [];
  for (const header of setCookieHeaders) {
    const first = header.split(";")[0];
    if (first) pairs.push(first.trim());
  }
  const map = new Map<string, string>();
  for (const p of pairs) {
    const [k, ...rest] = p.split("=");
    if (k) map.set(k, `${k}=${rest.join("=")}`);
  }
  return Array.from(map.values()).join("; ");
}

interface QuidcoUserHeaderData {
  user_id: number;
  first_name: string;
  user_type: number;
  total_earned: number;
  total_tracked: number;
  payable_cashback: number;
}

async function performLogin(
  email: string,
  password: string
): Promise<{ cookies: string }> {
  // Quidco seems to authenticate via an identity endpoint; we simulate a basic credential POST
  const LOGIN_URL = "https://identity-cognito.quidco.com/";
  const body = JSON.stringify({ email, password });
  const resp = await fetch(LOGIN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 MCP Quidco Connector",
      Accept: "application/json, text/plain, */*",
    },
    body,
  });
  if (resp.status === 401) throw new Error("Invalid credentials (401)");
  if (!resp.ok) throw new Error(`Login failed: ${resp.status}`);
  const cookies = extractCookies(
    resp.headers.getSetCookie ? resp.headers.getSetCookie() : []
  );
  if (!cookies) throw new Error("No session cookies returned");
  return { cookies };
}

async function fetchUserHeader(cookies: string): Promise<QuidcoUserHeaderData> {
  const url = "https://www.quidco.com/ajax/user/user_header_data";
  const resp = await fetch(url, {
    headers: {
      Accept: "application/json, text/plain, */*",
      Cookie: cookies,
      Referer: "https://www.quidco.com/home/",
      "User-Agent": "Mozilla/5.0 MCP Quidco Connector",
    },
  });
  if (resp.status === 401 || resp.status === 403) {
    throw new Error("Unauthorized – login required");
  }
  if (!resp.ok) throw new Error(`Failed to fetch user header: ${resp.status}`);
  return (await resp.json()) as QuidcoUserHeaderData;
}

async function searchMerchants(
  query: string,
  cookies: string
): Promise<{ id: string; name: string }[]> {
  const url = `https://www.quidco.com/ajax/search/suggestions?search_term=${encodeURIComponent(
    query
  )}`;
  const resp = await fetch(url, {
    headers: {
      Accept: "application/json, text/plain, */*",
      Cookie: cookies,
      Referer: "https://www.quidco.com/home/",
      "User-Agent": "Mozilla/5.0 MCP Quidco Connector",
    },
  });
  if (resp.status === 401 || resp.status === 403)
    throw new Error("Unauthorized – login required");
  if (!resp.ok) throw new Error(`Search failed: ${resp.status}`);
  const data = (await resp.json()) as {
    suggestions?: Array<{ id: string; name: string }>;
  };
  return data.suggestions ?? [];
}

async function fetchCashbackOffer(
  slug: string,
  cookies?: string
): Promise<string | null> {
  const url = `https://www.quidco.com/${slug.replace(/[^a-z0-9-]/gi, "")}/`;
  const resp = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 MCP Quidco Connector",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      ...(cookies ? { Cookie: cookies } : {}),
    },
  });
  if (!resp.ok)
    throw new Error(`Failed to fetch merchant page (${resp.status})`);
  const html = await resp.text();
  const root = parseHTML(html);
  const span = root.querySelector(".offer-value");
  if (!span) return null;
  return span.text.trim().replace(/\s+/g, " ");
}

export const QuidcoConnectorConfig = mcpConnectorConfig({
  name: "Quidco",
  key: "quidco",
  version: "1.0.0",
  logo: "https://stackone-logos.com/api/quidco/filled/svg",
  credentials: z.object({
    email: z.string().describe("Your Quidco account email"),
    password: z.string().describe("Your Quidco account password"),
  }),
  setup: z.object({}),
  examplePrompt:
    'Login to Quidco, show my total earned cashback, search for "eBay" and return the best current cashback offer.',
  tools: (tool) => ({
    LOGIN: tool({
      name: "quidco_login",
      description:
        "Authenticate with Quidco and cache a session. Provide email/password args or have stored credentials.",
      schema: z.object({
        email: z
          .string()
          .optional()
          .describe("Quidco account email (optional if stored credentials configured)"),
        password: z
          .string()
          .optional()
          .describe("Quidco account password (optional if stored credentials configured)"),
      }),
      handler: async (args, context) => {
        try {
          let stored: any = {};
          try {
            stored = (await context.getCredentials()) || {};
          } catch {
            // ignore
          }
          const email = (args.email || stored.email) as string | undefined;
          const password = (args.password || stored.password) as
            | string
            | undefined;
          if (!email || !password) {
            return "Missing credentials: supply email/password arguments or configure stored credentials.";
          }
          const session = await performLogin(email, password);
          await context.writeCache("quidco:session", session.cookies);
          return "Login successful";
        } catch (e) {
          return `Login failed: ${e instanceof Error ? e.message : String(e)}`;
        }
      },
    }),
    GET_USER: tool({
      name: "quidco_get_user",
      description:
        "Return basic Quidco user header data (earnings, tracked, payable) to verify login",
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const cookies = (await context.readCache("quidco:session")) as
            | string
            | null;
          if (!cookies) return "No active session found. Please login first.";
          const user = await fetchUserHeader(cookies);
          return JSON.stringify(
            {
              id: user.user_id,
              firstName: user.first_name,
              totalEarned: user.total_earned,
              totalTracked: user.total_tracked,
              payableCashback: user.payable_cashback,
            },
            null,
            2
          );
        } catch (e) {
          return `Failed to fetch user: ${
            e instanceof Error ? e.message : String(e)
          }`;
        }
      },
    }),
    SEARCH_MERCHANTS: tool({
      name: "quidco_search_merchants",
      description:
        "Search for merchants by name using Quidco suggestions (requires login)",
      schema: z.object({
        query: z.string().describe("Merchant search query fragment"),
      }),
      handler: async (args, context) => {
        try {
          const cookies = (await context.readCache("quidco:session")) as
            | string
            | null;
          if (!cookies) return "No active session found. Please login first.";
          const suggestions = await searchMerchants(args.query, cookies);
          if (suggestions.length === 0) return "No merchants found";
          return suggestions.map((s) => `${s.id}\t${s.name}`).join("\n");
        } catch (e) {
          return `Merchant search failed: ${
            e instanceof Error ? e.message : String(e)
          }`;
        }
      },
    }),
    GET_CASHBACK_OFFER: tool({
      name: "quidco_get_cashback_offer",
      description:
        "Fetch the displayed cashback offer value (span.offer-value) for a merchant slug",
      schema: z.object({
        merchantSlug: z
          .string()
          .describe(
            'Merchant slug as in URL, e.g. "ebay" for https://www.quidco.com/ebay/'
          ),
      }),
      handler: async (args, context) => {
        try {
          const cookies = (await context.readCache("quidco:session")) as
            | string
            | null;
          const offer = await fetchCashbackOffer(
            args.merchantSlug,
            cookies === null ? undefined : cookies
          );
          if (!offer) return "Offer value not found";
          const normalized = normalizePercentage(offer);
          return `Merchant: ${
            args.merchantSlug
          }\nOffer: ${offer}\nNormalized: ${JSON.stringify(normalized)}`;
        } catch (e) {
          return `Failed to get cashback offer: ${
            e instanceof Error ? e.message : String(e)
          }`;
        }
      },
    }),
    GET_CASHBACK_OFFER_BEST_MATCH: tool({
      name: "quidco_get_cashback_offer_best_match",
      description:
        "Search merchants, choose best match for query, then fetch and normalize its cashback offer",
      schema: z.object({
        query: z.string().describe("Merchant name query"),
      }),
      handler: async (args, context) => {
        try {
          const cookies = (await context.readCache("quidco:session")) as
            | string
            | null;
          if (!cookies) return "No active session found. Please login first.";
          const suggestions = await searchMerchants(args.query, cookies);
          if (suggestions.length === 0) return "No merchants found";
          const best = pickBestMatch(
            args.query,
            suggestions.map((s) => s.name)
          );
          if (!best) return "Unable to determine best match";
          const slug = best.toLowerCase();
          const offer = await fetchCashbackOffer(slug, cookies);
          if (!offer) return `Best match '${best}' found but offer not present`;
          const normalized = normalizePercentage(offer);
          return `Best Match: ${best}\nSlug: ${slug}\nOffer: ${offer}\nNormalized: ${JSON.stringify(
            normalized
          )}`;
        } catch (e) {
          return `Failed to get best match cashback offer: ${
            e instanceof Error ? e.message : String(e)
          }`;
        }
      },
    }),
  }),
});

// --- Helpers (kept local to this file) ---
function scoreCandidate(query: string, candidate: string): number {
  const q = query.toLowerCase();
  const c = candidate.toLowerCase();
  if (q === c) return 100;
  if (c.startsWith(q)) return 80;
  if (c.includes(q)) return 60;
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
    raw,
    percentages,
    minPercentage: min,
    maxPercentage: max,
    range: !!(min !== null && max !== null && min !== max),
  };
}

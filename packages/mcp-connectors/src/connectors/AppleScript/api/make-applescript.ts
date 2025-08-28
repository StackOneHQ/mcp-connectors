// packages/mcp-connectors/src/connectors/AppleScript/api/make-applescript.ts
type VercelRequest = {
  method?: string;
  body?: any;
  headers?: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  setHeader(name: string, value: string): void;
  status(code: number): VercelResponse;
  json(body: any): void;
  end(): void;
};
// import { createHmac, timingSafeEqual } from 'crypto';
import { callGemini } from "../lib/llm_gemini";
import { validateAppleScriptRequest, createSecurityGuard } from "../lib/guard";
import { verifySignature } from "../lib/signer";

interface AppleScriptRequest {
  prompt: string;
  context?: string;
  signature?: string;
  timestamp?: number;
}

interface AppleScriptResponse {
  success: boolean;
  script?: string;
  error?: string;
  warning?: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS headers for development
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  try {
    const body = req.body as AppleScriptRequest;

    // Validate required environment variables
    const signingSecret = process.env.APPLESCRIPT_SIGNING_SECRET;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!signingSecret || !geminiApiKey) {
      console.error("Missing environment variables:", {
        hasSigningSecret: !!signingSecret,
        hasGeminiApiKey: !!geminiApiKey,
      });
      res.status(500).json({
        success: false,
        error: "Server configuration error",
      });
      return;
    }

    // Verify request signature
    if (!body.signature || !body.timestamp) {
      res.status(400).json({
        success: false,
        error: "Missing signature or timestamp",
      });
      return;
    }

    const isValidSignature = verifySignature(
      JSON.stringify({ prompt: body.prompt, context: body.context }),
      body.signature,
      body.timestamp,
      signingSecret
    );

    if (!isValidSignature) {
      res.status(401).json({
        success: false,
        error: "Invalid signature",
      });
      return;
    }

    // Validate request format
    const validation = validateAppleScriptRequest(body);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: validation.error,
      });
      return;
    }

    // Security guard check
    const securityGuard = createSecurityGuard();
    const securityCheck = securityGuard.checkRequest(body.prompt, body.context);

    if (!securityCheck.allowed) {
      res.status(403).json({
        success: false,
        error: `Security violation: ${securityCheck.reason}`,
      });
      return;
    }

    // Generate AppleScript using Gemini
    const script = await callGemini(body.prompt, body.context, geminiApiKey);

    // Final security check on generated script
    const scriptCheck = securityGuard.checkScript(script);
    if (!scriptCheck.allowed) {
      res.status(403).json({
        success: false,
        error: `Generated script rejected: ${scriptCheck.reason}`,
      });
      return;
    }

    const response: AppleScriptResponse = {
      success: true,
      script: script,
      warning: scriptCheck.warning,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("AppleScript generation error:", error);

    // Don't expose internal errors to client
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

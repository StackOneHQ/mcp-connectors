import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { MCPToolDefinition } from "@stackone/mcp-config-types";
import { createMockConnectorContext } from "../../__mocks__/context";

// Hoisted shared state for our child_process mock
const mockState = vi.hoisted(() => ({
  behaviors: [] as Array<{ stdout?: string; stderr?: string; code?: number }>,
}));

// Mock child_process.spawn in ESM-safe way
vi.mock("node:child_process", async () => {
  const { EventEmitter } = await import("node:events");
  class MockChild extends EventEmitter {
    stdout: InstanceType<typeof EventEmitter>;
    stderr: InstanceType<typeof EventEmitter>;
    stdin: { write: (chunk: any) => void; end: () => void };
    constructor(stdoutData: string, stderrData: string, code: number) {
      super();
      this.stdout = new EventEmitter();
      this.stderr = new EventEmitter();
      this.stdin = { write: () => void 0, end: () => void 0 };
      setImmediate(() => {
        if (stdoutData) this.stdout.emit("data", Buffer.from(stdoutData));
        if (stderrData) this.stderr.emit("data", Buffer.from(stderrData));
        this.emit("close", code);
      });
    }
  }

  return {
    spawn: () => {
      const {
        stdout = "",
        stderr = "",
        code = 0,
      } = mockState.behaviors.shift() ?? {};
      return new MockChild(stdout, stderr, code);
    },
    exec: vi.fn(),
  };
});

// Import after mocks so they are applied
import { AppleScriptConnectorConfig } from "./applescript";

describe("AppleScriptConnectorConfig", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockState.behaviors.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("health_check", () => {
    it("returns ok with system info when osascript succeeds", async () => {
      mockState.behaviors.push({
        stdout: "osascript OK • macOS 14.0 • MyMac",
        code: 0,
      });
      const tool = AppleScriptConnectorConfig.tools
        .health_check as MCPToolDefinition;
      const ctx = createMockConnectorContext();
      (ctx.getCredentials as any).mockResolvedValue({ defaultTimeoutMs: 2000 });
      const result = await tool.handler({}, ctx);
      const parsed = JSON.parse(result as string);
      expect(parsed.ok).toBe(true);
      expect(parsed.data.result).toContain("osascript OK");
    });
  });

  describe("compile_applescript", () => {
    it("fails on non-macOS platforms", async () => {
      vi.spyOn(process, "platform", "get").mockReturnValue("win32");
      const tool = AppleScriptConnectorConfig.tools
        .compile_applescript as MCPToolDefinition;
      const result = await tool.handler(
        { script: 'return "ok"' },
        createMockConnectorContext()
      );
      const parsed = JSON.parse(result as string);
      expect(parsed.ok).toBe(false);
      expect(parsed.error).toContain("Non-macOS platform");
    });

    it("returns valid=true when osacompile exits cleanly", async () => {
      vi.spyOn(process, "platform", "get").mockReturnValue("darwin");
      mockState.behaviors.push({ stdout: "", code: 0 });
      const tool = AppleScriptConnectorConfig.tools
        .compile_applescript as MCPToolDefinition;
      const result = await tool.handler(
        { script: 'return "ok"' },
        createMockConnectorContext()
      );
      const parsed = JSON.parse(result as string);
      expect(parsed.ok).toBe(true);
      expect(parsed.data.valid).toBe(true);
    });
  });

  describe("diagnose_permissions", () => {
    it("returns checklist of common fixes", async () => {
      const tool = AppleScriptConnectorConfig.tools
        .diagnose_permissions as MCPToolDefinition;
      const result = await tool.handler({}, createMockConnectorContext());
      const parsed = JSON.parse(result as string);
      expect(parsed.ok).toBe(true);
      expect(Array.isArray(parsed.data.checks)).toBe(true);
      expect(parsed.data.checks.length).toBeGreaterThan(0);
    });
  });

  describe("run_applescript", () => {
    it("blocks scripts containing denylist tokens", async () => {
      const tool = AppleScriptConnectorConfig.tools
        .run_applescript as MCPToolDefinition;
      const ctx = createMockConnectorContext();
      (ctx.getCredentials as any).mockResolvedValue({
        denylist: ["do shell script"],
      });
      const result = await tool.handler(
        { script: 'do shell script "rm -rf /"' },
        ctx
      );
      const parsed = JSON.parse(result as string);
      expect(parsed.ok).toBe(false);
      expect(parsed.error).toMatch(/blocked token/i);
    });

    it("supports dryRun returning wouldExecute marker", async () => {
      const tool = AppleScriptConnectorConfig.tools
        .run_applescript as MCPToolDefinition;
      const ctx = createMockConnectorContext();
      const result = await tool.handler(
        { script: 'return "ok"', dryRun: true },
        ctx
      );
      const parsed = JSON.parse(result as string);
      expect(parsed.ok).toBe(true);
      expect(parsed.data.dryRun).toBe(true);
      expect(parsed.data.wouldExecute).toBe(true);
    });

    it("returns stdout on success", async () => {
      mockState.behaviors.push({ stdout: "Hello World", code: 0 });
      const tool = AppleScriptConnectorConfig.tools
        .run_applescript as MCPToolDefinition;
      const ctx = createMockConnectorContext();
      (ctx.getCredentials as any).mockResolvedValue({ defaultTimeoutMs: 1000 });
      const result = await tool.handler({ script: 'return "hello"' }, ctx);
      const parsed = JSON.parse(result as string);
      expect(parsed.ok).toBe(true);
      expect(parsed.data.stdout).toContain("Hello World");
    });

    it("maps common AppleScript errors", async () => {
      mockState.behaviors.push({ stderr: "syntax error", code: 1 });
      const tool = AppleScriptConnectorConfig.tools
        .run_applescript as MCPToolDefinition;
      const ctx = createMockConnectorContext();
      const result = await tool.handler({ script: "this is not valid" }, ctx);
      const parsed = JSON.parse(result as string);
      expect(parsed.ok).toBe(false);
      expect(parsed.error).toMatch(
        /syntax error|AppleScript execution failed/i
      );
    });
  });

  describe("safari_extract_content", () => {
    it("supports dryRun and returns requested fields and scope", async () => {
      const tool = AppleScriptConnectorConfig.tools
        .safari_extract_content as MCPToolDefinition;
      const result = await tool.handler(
        {
          scope: "current",
          include: ["url", "title", "text"],
          dryRun: true,
        },
        createMockConnectorContext()
      );
      const parsed = JSON.parse(result as string);
      expect(parsed.ok).toBe(true);
      expect(parsed.data.dryRun).toBe(true);
      expect(parsed.data.scope).toBe("current");
      expect(parsed.data.include).toEqual(["url", "title", "text"]);
    });
  });
});

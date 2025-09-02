import type { ConnectorContext } from '@stackone/mcp-config-types';
import { vi } from 'vitest';

export interface MockContextOptions {
  credentials?: Record<string, unknown>;
  setup?: Record<string, unknown>;
  data?: unknown;
  cache?: Record<string, unknown> | null;
}

export function createMockConnectorContext(
  options?: MockContextOptions
): ConnectorContext {
  return {
    getCredentials: vi.fn().mockResolvedValue(options?.credentials ?? {}),
    getSetup: vi.fn().mockResolvedValue(options?.setup ?? {}),
    getData: vi.fn().mockResolvedValue(options?.data ?? undefined),
    setData: vi.fn().mockResolvedValue(undefined),
    readCache: vi.fn().mockResolvedValue(options?.cache ?? null),
    writeCache: vi.fn().mockResolvedValue(undefined),
  } as ConnectorContext;
}

import type { ConnectorContext } from '@stackone/mcp-config-types';
import { vi } from 'vitest';

export function createMockConnectorContext(config?: {
  credentials?: Record<string, unknown>;
  setup?: Record<string, unknown>;
}): ConnectorContext {
  return {
    getCredentials: vi.fn().mockResolvedValue(config?.credentials || {}),
    getSetup: vi.fn().mockResolvedValue(config?.setup || {}),
    getData: vi.fn().mockResolvedValue(undefined),
    setData: vi.fn().mockResolvedValue(undefined),
    readCache: vi.fn().mockResolvedValue(null),
    writeCache: vi.fn().mockResolvedValue(undefined),
  } as ConnectorContext;
}

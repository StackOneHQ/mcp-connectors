import type { ConnectorContext } from '@stackone/mcp-config-types';
import { vi } from 'vitest';

export function createMockConnectorContext(): ConnectorContext {
  return {
    getCredentials: vi.fn().mockResolvedValue({}),
    getSetup: vi.fn().mockResolvedValue({}),
    getData: vi.fn().mockResolvedValue(undefined),
    setData: vi.fn().mockResolvedValue(undefined),
    readCache: vi.fn().mockResolvedValue(null),
    writeCache: vi.fn().mockResolvedValue(undefined),
  } as ConnectorContext;
}

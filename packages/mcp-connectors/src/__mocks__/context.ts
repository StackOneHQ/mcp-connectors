import { vi } from 'vitest';

// Context interface for connector testing
export interface ConnectorContext<C = any, S = any, O = any> {
  getCredentials(): Promise<C>;
  getSetup(): Promise<S>;
  getData<T = unknown>(key?: string): Promise<T | null>;
  setData(keyOrData: string | Record<string, unknown>, value?: unknown): Promise<void>;
  readCache(key: string): Promise<string | null>;
  writeCache(key: string, value: string): Promise<void>;
  getOauth2Credentials?(): Promise<O>;
  refreshOauth2Credentials?(): Promise<O>;
}

export interface MockContextOptions {
  credentials?: Record<string, unknown>;
  oauth2Credentials?: Record<string, unknown>;
  setup?: Record<string, unknown>;
  data?: unknown;
  cache?: Record<string, unknown> | null;
}

export function createMockConnectorContext(
  options?: MockContextOptions
): ConnectorContext {
  return {
    getCredentials: vi.fn().mockResolvedValue(options?.credentials ?? {}),
    getOauth2Credentials: vi
      .fn()
      .mockResolvedValue(options?.oauth2Credentials ?? undefined),
    getSetup: vi.fn().mockResolvedValue(options?.setup ?? {}),
    getData: vi.fn().mockResolvedValue(options?.data ?? undefined),
    setData: vi.fn().mockResolvedValue(undefined),
    readCache: vi.fn().mockResolvedValue(options?.cache ?? null),
    writeCache: vi.fn().mockResolvedValue(undefined),
  } as ConnectorContext;
}

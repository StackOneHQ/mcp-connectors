import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SecretResolver, type SecretProvider } from '../secret-resolver';

class MockProvider implements SecretProvider {
  readonly scheme = 'mock';
  private values: Map<string, string>;

  constructor(values: Record<string, string> = {}) {
    this.values = new Map(Object.entries(values));
  }

  async resolve(uri: any): Promise<string> {
    const key = uri.path;
    if (!this.values.has(key)) {
      throw new Error(`Mock secret not found: ${key}`);
    }
    return this.values.get(key)!;
  }
}

describe('SecretResolver', () => {
  let resolver: SecretResolver;
  let mockProvider: MockProvider;

  beforeEach(() => {
    resolver = new SecretResolver();
    mockProvider = new MockProvider({
      '/test/secret': 'secret-value',
      '/test/another': 'another-value',
    });
    resolver.registerProvider(mockProvider);
  });

  afterEach(() => {
    resolver.destroy();
  });

  describe('plain string handling', () => {
    it('should return plain strings unchanged', async () => {
      const result = await resolver.resolve('plain-api-token');
      expect(result).toBe('plain-api-token');
    });

    it('should handle empty strings', async () => {
      const result = await resolver.resolve('');
      expect(result).toBe('');
    });
  });

  describe('URI resolution', () => {
    it('should resolve valid secret URIs', async () => {
      const result = await resolver.resolve('mock:///test/secret');
      expect(result).toBe('secret-value');
    });

    it('should handle URI parameters', async () => {
      const result = await resolver.resolve('mock:///test/secret?ttl=300');
      expect(result).toBe('secret-value');
    });

    it('should throw error for unknown schemes', async () => {
      await expect(resolver.resolve('unknown:///test/secret'))
        .rejects.toThrow('No provider registered for scheme: unknown');
    });

    it('should throw error for invalid URI format', async () => {
      await expect(resolver.resolve('invalid://format::/bad'))
        .rejects.toThrow('Invalid secret URI format');
    });

    it('should throw error when provider fails', async () => {
      await expect(resolver.resolve('mock:///nonexistent'))
        .rejects.toThrow('Failed to resolve secret from mock');
    });
  });

  describe('caching', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should cache resolved values', async () => {
      const spy = vi.spyOn(mockProvider, 'resolve');
      
      const result1 = await resolver.resolve('mock:///test/secret');
      const result2 = await resolver.resolve('mock:///test/secret');
      
      expect(result1).toBe('secret-value');
      expect(result2).toBe('secret-value');
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should respect custom TTL from URI params', async () => {
      const spy = vi.spyOn(mockProvider, 'resolve');
      
      await resolver.resolve('mock:///test/secret?ttl=1');
      
      vi.advanceTimersByTime(500);
      await resolver.resolve('mock:///test/secret?ttl=1');
      expect(spy).toHaveBeenCalledTimes(1); // Still cached
      
      vi.advanceTimersByTime(600);
      await resolver.resolve('mock:///test/secret?ttl=1');
      expect(spy).toHaveBeenCalledTimes(2); // Cache expired
    });

    it('should allow cache clearing', async () => {
      const spy = vi.spyOn(mockProvider, 'resolve');
      
      await resolver.resolve('mock:///test/secret');
      resolver.clearCache();
      await resolver.resolve('mock:///test/secret');
      
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe('multiple providers', () => {
    beforeEach(() => {
      const anotherProvider = new MockProvider({
        '/other/secret': 'other-value',
      });
      // Change scheme to avoid conflict
      (anotherProvider as any).scheme = 'other';
      resolver.registerProvider(anotherProvider);
    });

    it('should route to correct provider based on scheme', async () => {
      const result1 = await resolver.resolve('mock:///test/secret');
      const result2 = await resolver.resolve('other:///other/secret');
      
      expect(result1).toBe('secret-value');
      expect(result2).toBe('other-value');
    });
  });
});
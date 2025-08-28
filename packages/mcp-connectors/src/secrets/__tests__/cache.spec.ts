import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SecretCache } from '../cache';

describe('SecretCache', () => {
  let cache: SecretCache;

  beforeEach(() => {
    cache = new SecretCache();
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('basic operations', () => {
    it('should store and retrieve values', () => {
      cache.set('test-key', 'test-value');
      expect(cache.get('test-key')).toBe('test-value');
    });

    it('should return null for non-existent keys', () => {
      expect(cache.get('non-existent')).toBeNull();
    });

    it('should delete values', () => {
      cache.set('test-key', 'test-value');
      cache.delete('test-key');
      expect(cache.get('test-key')).toBeNull();
    });

    it('should clear all values', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });

    it('should report correct size', () => {
      expect(cache.size()).toBe(0);
      cache.set('key1', 'value1');
      expect(cache.size()).toBe(1);
      cache.set('key2', 'value2');
      expect(cache.size()).toBe(2);
    });
  });

  describe('TTL functionality', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should expire values after TTL', () => {
      cache.set('test-key', 'test-value', 1); // 1 second TTL
      expect(cache.get('test-key')).toBe('test-value');
      
      vi.advanceTimersByTime(1100); // Advance by 1.1 seconds
      expect(cache.get('test-key')).toBeNull();
    });

    it('should use default TTL when not specified', () => {
      const cacheWithDefaultTtl = new SecretCache(2);
      cacheWithDefaultTtl.set('test-key', 'test-value');
      
      vi.advanceTimersByTime(1900); // Just under 2 seconds
      expect(cacheWithDefaultTtl.get('test-key')).toBe('test-value');
      
      vi.advanceTimersByTime(200); // Total 2.1 seconds
      expect(cacheWithDefaultTtl.get('test-key')).toBeNull();
      
      cacheWithDefaultTtl.destroy();
    });

    it('should clean up expired entries automatically', () => {
      cache.set('key1', 'value1', 1);
      cache.set('key2', 'value2', 2);
      
      expect(cache.size()).toBe(2);
      
      vi.advanceTimersByTime(1100);
      
      // Access key2 to verify it's still valid, which triggers cleanup of expired entries
      expect(cache.get('key2')).toBe('value2');
      
      // Now key1 should be automatically cleaned up when we try to access it
      expect(cache.get('key1')).toBeNull();
      
      // And the size should reflect the cleanup
      vi.advanceTimersByTime(60000); // Trigger cleanup interval
      expect(cache.size()).toBe(1);
    });
  });

  describe('destruction', () => {
    it('should clean up resources on destroy', () => {
      cache.set('test-key', 'test-value');
      expect(cache.size()).toBe(1);
      
      cache.destroy();
      expect(cache.size()).toBe(0);
    });
  });
});
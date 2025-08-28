interface CacheEntry {
  value: string;
  expiresAt: number;
}

export class SecretCache {
  private cache = new Map<string, CacheEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private defaultTtl: number = 300) {
    this.startCleanup();
  }

  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key: string, value: string, ttl?: number): void {
    const actualTtl = ttl ?? this.defaultTtl;
    const expiresAt = Date.now() + (actualTtl * 1000);
    
    this.cache.set(key, {
      value,
      expiresAt,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanExpired();
    }, 60000); // Run cleanup every minute
  }

  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}
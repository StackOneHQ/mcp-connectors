import { SecretCache } from './cache';

export interface SecretProvider {
  scheme: string;
  resolve(uri: ParsedSecretUri): Promise<string>;
}

export interface ParsedSecretUri {
  scheme: string;
  path: string;
  params: URLSearchParams;
}

export class SecretResolver {
  private providers = new Map<string, SecretProvider>();
  private cache: SecretCache;

  constructor(defaultCacheTtl?: number) {
    this.cache = new SecretCache(defaultCacheTtl);
  }

  registerProvider(provider: SecretProvider): void {
    this.providers.set(provider.scheme, provider);
  }

  async resolve(reference: string): Promise<string> {
    if (!this.isSecretUri(reference)) {
      return reference;
    }

    const cacheKey = reference;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const parsedUri = this.parseSecretUri(reference);
    const provider = this.providers.get(parsedUri.scheme);
    
    if (!provider) {
      throw new Error(`No provider registered for scheme: ${parsedUri.scheme}`);
    }

    try {
      const value = await provider.resolve(parsedUri);
      
      const ttl = parsedUri.params.get('ttl');
      const cacheTtl = ttl ? Number.parseInt(ttl, 10) : undefined;
      
      this.cache.set(cacheKey, value, cacheTtl);
      
      return value;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to resolve secret from ${parsedUri.scheme}: ${errorMessage}`);
    }
  }

  private isSecretUri(reference: string): boolean {
    return reference.includes('://');
  }

  private parseSecretUri(reference: string): ParsedSecretUri {
    try {
      const url = new URL(reference);
      return {
        scheme: url.protocol.slice(0, -1), // Remove trailing ':'
        path: url.pathname,
        params: url.searchParams,
      };
    } catch (error) {
      throw new Error(`Invalid secret URI format: ${reference}`);
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  destroy(): void {
    this.cache.destroy();
  }
}
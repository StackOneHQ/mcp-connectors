import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { SSMProvider } from '../../providers/ssm';
import type { ParsedSecretUri } from '../../secret-resolver';

// Mock the AWS SDK
vi.mock('@aws-sdk/client-ssm', () => ({
  SSMClient: vi.fn(),
  GetParameterCommand: vi.fn(),
}));

describe('SSMProvider', () => {
  let provider: SSMProvider;
  let mockSSMClient: any;

  beforeEach(() => {
    mockSSMClient = {
      send: vi.fn(),
    };
    vi.mocked(SSMClient).mockImplementation(() => mockSSMClient);
    provider = new SSMProvider();
  });

  describe('scheme', () => {
    it('should have correct scheme', () => {
      expect(provider.scheme).toBe('ssm');
    });
  });

  describe('resolve', () => {
    it('should resolve parameter successfully', async () => {
      const mockUri: ParsedSecretUri = {
        scheme: 'ssm',
        path: '/test/secret',
        params: new URLSearchParams(),
      };

      mockSSMClient.send.mockResolvedValueOnce({
        Parameter: { Value: 'secret-value' },
      });

      const result = await provider.resolve(mockUri);
      
      expect(result).toBe('secret-value');
      expect(vi.mocked(GetParameterCommand)).toHaveBeenCalledWith({
        Name: '/test/secret',
        WithDecryption: false,
      });
    });

    it('should handle paths without leading slash', async () => {
      const mockUri: ParsedSecretUri = {
        scheme: 'ssm',
        path: 'test/secret',
        params: new URLSearchParams(),
      };

      mockSSMClient.send.mockResolvedValueOnce({
        Parameter: { Value: 'secret-value' },
      });

      await provider.resolve(mockUri);
      
      expect(vi.mocked(GetParameterCommand)).toHaveBeenCalledWith({
        Name: '/test/secret',
        WithDecryption: false,
      });
    });

    it('should handle decryption parameter', async () => {
      const mockUri: ParsedSecretUri = {
        scheme: 'ssm',
        path: '/test/secret',
        params: new URLSearchParams('decrypt=true'),
      };

      mockSSMClient.send.mockResolvedValueOnce({
        Parameter: { Value: 'encrypted-secret-value' },
      });

      const result = await provider.resolve(mockUri);
      
      expect(result).toBe('encrypted-secret-value');
      expect(vi.mocked(GetParameterCommand)).toHaveBeenCalledWith({
        Name: '/test/secret',
        WithDecryption: true,
      });
    });

    it('should handle version parameter', async () => {
      const mockUri: ParsedSecretUri = {
        scheme: 'ssm',
        path: '/test/secret',
        params: new URLSearchParams('version=5'),
      };

      mockSSMClient.send.mockResolvedValueOnce({
        Parameter: { Value: 'versioned-secret' },
      });

      await provider.resolve(mockUri);
      
      expect(vi.mocked(GetParameterCommand)).toHaveBeenCalledWith({
        Name: '/test/secret',
        WithDecryption: false,
        VersionId: 5,
      });
    });

    it('should handle region parameter', async () => {
      const mockUri: ParsedSecretUri = {
        scheme: 'ssm',
        path: '/test/secret',
        params: new URLSearchParams('region=eu-west-1'),
      };

      mockSSMClient.send.mockResolvedValueOnce({
        Parameter: { Value: 'regional-secret' },
      });

      await provider.resolve(mockUri);
      
      // Should create client with specified region
      expect(vi.mocked(SSMClient)).toHaveBeenCalledWith({ region: 'eu-west-1' });
    });

    it('should throw error when parameter not found', async () => {
      const mockUri: ParsedSecretUri = {
        scheme: 'ssm',
        path: '/test/secret',
        params: new URLSearchParams(),
      };

      mockSSMClient.send.mockResolvedValueOnce({
        Parameter: {},
      });

      await expect(provider.resolve(mockUri)).rejects.toThrow(
        'Parameter /test/secret not found or has no value'
      );
    });

    it('should handle ParameterNotFound error', async () => {
      const mockUri: ParsedSecretUri = {
        scheme: 'ssm',
        path: '/test/secret',
        params: new URLSearchParams(),
      };

      const error = new Error('Parameter not found');
      error.name = 'ParameterNotFound';
      mockSSMClient.send.mockRejectedValueOnce(error);

      await expect(provider.resolve(mockUri)).rejects.toThrow(
        'SSM parameter not found: /test/secret'
      );
    });

    it('should handle AccessDeniedException error', async () => {
      const mockUri: ParsedSecretUri = {
        scheme: 'ssm',
        path: '/test/secret',
        params: new URLSearchParams(),
      };

      const error = new Error('Access denied');
      error.name = 'AccessDeniedException';
      mockSSMClient.send.mockRejectedValueOnce(error);

      await expect(provider.resolve(mockUri)).rejects.toThrow(
        'Access denied to SSM parameter: /test/secret'
      );
    });

    it('should handle InvalidKeyId error', async () => {
      const mockUri: ParsedSecretUri = {
        scheme: 'ssm',
        path: '/test/secret',
        params: new URLSearchParams(),
      };

      const error = new Error('Invalid key');
      error.name = 'InvalidKeyId';
      mockSSMClient.send.mockRejectedValueOnce(error);

      await expect(provider.resolve(mockUri)).rejects.toThrow(
        'Invalid KMS key for parameter: /test/secret'
      );
    });

    it('should re-throw unknown errors', async () => {
      const mockUri: ParsedSecretUri = {
        scheme: 'ssm',
        path: '/test/secret',
        params: new URLSearchParams(),
      };

      const error = new Error('Unknown error');
      mockSSMClient.send.mockRejectedValueOnce(error);

      await expect(provider.resolve(mockUri)).rejects.toThrow('Unknown error');
    });
  });

  describe('client caching', () => {
    beforeEach(() => {
      // Reset the provider and mocks for client caching tests
      provider = new SSMProvider();
      vi.mocked(SSMClient).mockClear();
    });

    it('should reuse clients for same region', async () => {
      const mockUri1: ParsedSecretUri = {
        scheme: 'ssm',
        path: '/test/secret1',
        params: new URLSearchParams('region=us-west-2'),
      };

      const mockUri2: ParsedSecretUri = {
        scheme: 'ssm',
        path: '/test/secret2',
        params: new URLSearchParams('region=us-west-2'),
      };

      mockSSMClient.send.mockResolvedValue({
        Parameter: { Value: 'test-value' },
      });

      await provider.resolve(mockUri1);
      await provider.resolve(mockUri2);

      // Should only create one client for the region
      expect(vi.mocked(SSMClient)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(SSMClient)).toHaveBeenCalledWith({ region: 'us-west-2' });
    });

    it('should create separate clients for different regions', async () => {
      const mockUri1: ParsedSecretUri = {
        scheme: 'ssm',
        path: '/test/secret1',
        params: new URLSearchParams('region=us-west-2'),
      };

      const mockUri2: ParsedSecretUri = {
        scheme: 'ssm',
        path: '/test/secret2',
        params: new URLSearchParams('region=eu-west-1'),
      };

      mockSSMClient.send.mockResolvedValue({
        Parameter: { Value: 'test-value' },
      });

      await provider.resolve(mockUri1);
      await provider.resolve(mockUri2);

      expect(vi.mocked(SSMClient)).toHaveBeenCalledTimes(2);
      expect(vi.mocked(SSMClient)).toHaveBeenCalledWith({ region: 'us-west-2' });
      expect(vi.mocked(SSMClient)).toHaveBeenCalledWith({ region: 'eu-west-1' });
    });
  });
});
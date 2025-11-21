import { describe, expect, test } from 'vitest';
import { Connectors } from './index';

describe('Connectors', () => {
  test('should export an array of connectors', () => {
    expect(Array.isArray(Connectors)).toBe(true);
    expect(Connectors.length).toBeGreaterThan(0);
  });

  test('each connector should have required properties', () => {
    for (const connector of Connectors) {
      expect(connector).toHaveProperty('name');
      expect(connector).toHaveProperty('key');
      expect(connector).toHaveProperty('version');
      expect(connector).toHaveProperty('credentials');
      expect(connector).toHaveProperty('setup');
      expect(connector).toHaveProperty('tools');
    }
  });
});

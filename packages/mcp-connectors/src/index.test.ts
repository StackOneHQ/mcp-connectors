import { describe, expect, test } from 'vitest';
import { allConnectors } from './index';

describe('allConnectors', () => {
  test('should export an array of connectors', () => {
    expect(Array.isArray(allConnectors)).toBe(true);
    expect(allConnectors.length).toBeGreaterThan(0);
  });

  test('each connector should have required properties', () => {
    for (const connector of allConnectors) {
      expect(connector).toHaveProperty('name');
      expect(connector).toHaveProperty('key');
      expect(connector).toHaveProperty('version');
      expect(connector).toHaveProperty('credentials');
      expect(connector).toHaveProperty('setup');
      expect(connector).toHaveProperty('tools');
    }
  });
});

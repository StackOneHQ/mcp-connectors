import { describe, expect, it } from 'vitest';
import { NotionConnectorConfig } from './notion';

describe('NotionConnectorConfig', () => {
  it('should be properly configured', () => {
    expect(NotionConnectorConfig).toBeDefined();
    expect(NotionConnectorConfig.name).toBe('Notion');
    expect(NotionConnectorConfig.key).toBe('notion');
    expect(NotionConnectorConfig.version).toBe('1.0.0');
  });

  it('should have valid credentials schema', () => {
    const credentialsSchema = NotionConnectorConfig.credentials;

    // Valid token should pass
    expect(() =>
      credentialsSchema.parse({
        token: 'secret_1234567890abcdefghijklmnopqrstuv',
      })
    ).not.toThrow();

    // Missing token should fail
    expect(() => credentialsSchema.parse({})).toThrow();

    // Note: Empty string is valid for zod string type by default
    // To require non-empty, would need .min(1) or .nonempty()
  });

  it('should have empty setup schema', () => {
    const setupSchema = NotionConnectorConfig.setup;
    expect(() => setupSchema.parse({})).not.toThrow();
  });

  it('should have an example prompt', () => {
    expect(NotionConnectorConfig.examplePrompt).toBeDefined();
    expect(typeof NotionConnectorConfig.examplePrompt).toBe('string');
    expect(NotionConnectorConfig.examplePrompt.length).toBeGreaterThan(0);
  });

  it('should have tools object with expected tools', () => {
    expect(typeof NotionConnectorConfig.tools).toBe('object');
    expect(NotionConnectorConfig.tools).toBeDefined();

    // Check for a few key tools to ensure they exist
    const expectedTools = [
      'GET_ME',
      'LIST_USERS',
      'GET_PAGE',
      'CREATE_PAGE',
      'CREATE_DATABASE',
      'SEARCH',
    ];

    for (const toolName of expectedTools) {
      expect(NotionConnectorConfig.tools[toolName]).toBeDefined();
    }
  });
});

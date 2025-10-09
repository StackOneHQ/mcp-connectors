import { describe, expect, it } from 'vitest';
import { iNaturalistConnectorConfig } from './inaturalist';

describe('iNaturalistConnectorConfig', () => {
  it('should have the correct basic properties', () => {
    expect(iNaturalistConnectorConfig.name).toBe('iNaturalist');
    expect(iNaturalistConnectorConfig.key).toBe('inaturalist');
    expect(iNaturalistConnectorConfig.version).toBe('1.0.0');
    expect(iNaturalistConnectorConfig.description).toContain('biodiversity research');
  });

  it('should have tools object with expected tools', () => {
    expect(typeof iNaturalistConnectorConfig.tools).toBe('object');
    expect(iNaturalistConnectorConfig.tools).toBeDefined();

    const expectedTools = [
      'GET_OBSERVATIONS',
      'GET_OBSERVATION',
      'GET_SPECIES_COUNTS',
      'SEARCH_TAXA',
      'GET_TAXON',
      'GET_PROJECTS',
      'GET_PROJECT',
      'SEARCH_PLACES',
      'GET_PLACE',
      'GET_USER',
      'GET_CURRENT_USER',
      'CREATE_OBSERVATION',
    ];

    for (const toolName of expectedTools) {
      expect(iNaturalistConnectorConfig.tools[toolName]).toBeDefined();
    }
  });

  it('should have correct credential schema', () => {
    const credentialsSchema = iNaturalistConnectorConfig.credentials;
    const parsedCredentials = credentialsSchema.safeParse({
      apiToken: 'test-jwt-token',
    });

    expect(parsedCredentials.success).toBe(true);
  });

  it('should work without API token for read operations', () => {
    const credentialsSchema = iNaturalistConnectorConfig.credentials;
    const parsedCredentials = credentialsSchema.safeParse({});

    expect(parsedCredentials.success).toBe(true);
  });

  it('should have empty setup schema', () => {
    const setupSchema = iNaturalistConnectorConfig.setup;
    const parsedSetup = setupSchema.safeParse({});

    expect(parsedSetup.success).toBe(true);
  });

  it('should have a meaningful example prompt for scientists', () => {
    expect(iNaturalistConnectorConfig.examplePrompt).toContain('research-grade');
    expect(iNaturalistConnectorConfig.examplePrompt).toContain('species counts');
    expect(iNaturalistConnectorConfig.examplePrompt).toContain('conservation');
  });

  it('should have proper logo URL', () => {
    expect(iNaturalistConnectorConfig.logo).toBe(
      'https://static.inaturalist.org/sites/1-logo.png'
    );
  });
});

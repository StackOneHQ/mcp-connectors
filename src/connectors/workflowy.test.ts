import { describe, expect, test } from 'bun:test';
import { WorkFlowyConnectorConfig } from './workflowy';

describe('WorkFlowy Connector', () => {
  test('should have correct connector metadata', () => {
    expect(WorkFlowyConnectorConfig.name).toBe('WorkFlowy');
    expect(WorkFlowyConnectorConfig.key).toBe('workflowy');
    expect(WorkFlowyConnectorConfig.version).toBe('1.0.0');
    expect(WorkFlowyConnectorConfig.description).toBe('Create and manage bullet points in your WorkFlowy workspace');
  });

  test('should have all required tools', () => {
    const tools = WorkFlowyConnectorConfig.tools;
    expect(tools).toHaveProperty('CREATE_BULLET');
    expect(tools).toHaveProperty('READ_TASKS');
    expect(tools).toHaveProperty('SEARCH_TASKS');
    expect(tools).toHaveProperty('GET_DOCUMENT_STRUCTURE');
  });

  test('should validate credentials schema', () => {
    const credentialsSchema = WorkFlowyConnectorConfig.credentials;
    
    // Valid credentials should not throw
    expect(() => credentialsSchema.parse({
      username: 'test@example.com',
      password: 'password123'
    })).not.toThrow();

    // Invalid email should throw
    expect(() => credentialsSchema.parse({
      username: 'invalid-email',
      password: 'password123'
    })).toThrow();

    // Missing password should throw
    expect(() => credentialsSchema.parse({
      username: 'test@example.com'
    })).toThrow();
  });

  test('should validate setup schema', () => {
    const setupSchema = WorkFlowyConnectorConfig.setup;
    
    // Empty setup should be valid
    expect(() => setupSchema.parse({})).not.toThrow();
    
    // Setup with defaultLocation should be valid
    expect(() => setupSchema.parse({ 
      defaultLocation: '/Work Projects' 
    })).not.toThrow();
  });

  test('CREATE_BULLET tool should have correct schema', () => {
    const tool = WorkFlowyConnectorConfig.tools.CREATE_BULLET;
    expect(tool.name).toBe('workflowy_create_bullet');
    expect(tool.description).toBe('Create a new bullet point under a specified location');
    
    // Test schema validation
    expect(() => tool.schema.parse({
      content: 'Test task'
    })).not.toThrow();

    expect(() => tool.schema.parse({
      content: 'Test task',
      location: '/Work',
      note: 'Important note'
    })).not.toThrow();

    // Missing content should throw
    expect(() => tool.schema.parse({
      location: '/Work'
    })).toThrow();
  });

  test('READ_TASKS tool should have correct schema', () => {
    const tool = WorkFlowyConnectorConfig.tools.READ_TASKS;
    expect(tool.name).toBe('workflowy_read_tasks');
    expect(tool.description).toBe('Read tasks/bullet points from WorkFlowy');
    
    // Test schema validation
    expect(() => tool.schema.parse({})).not.toThrow();

    expect(() => tool.schema.parse({
      location: '/Work',
      includeCompleted: true,
      maxDepth: 5
    })).not.toThrow();
  });

  test('SEARCH_TASKS tool should have correct schema', () => {
    const tool = WorkFlowyConnectorConfig.tools.SEARCH_TASKS;
    expect(tool.name).toBe('workflowy_search_tasks');
    expect(tool.description).toBe('Search for specific tasks/bullet points by content');
    
    // Test schema validation
    expect(() => tool.schema.parse({
      query: 'test search'
    })).not.toThrow();

    expect(() => tool.schema.parse({
      query: 'test search',
      includeCompleted: true
    })).not.toThrow();

    // Missing query should throw
    expect(() => tool.schema.parse({})).toThrow();
  });

  test('GET_DOCUMENT_STRUCTURE tool should have correct schema', () => {
    const tool = WorkFlowyConnectorConfig.tools.GET_DOCUMENT_STRUCTURE;
    expect(tool.name).toBe('workflowy_get_structure');
    expect(tool.description).toBe('Get the hierarchical structure of your WorkFlowy document');
    
    // Test schema validation
    expect(() => tool.schema.parse({})).not.toThrow();

    expect(() => tool.schema.parse({
      maxDepth: 3,
      showOnlyNames: false
    })).not.toThrow();
  });
});
import { describe, expect, it } from 'vitest';
import { WorkflowyConnectorConfig } from './workflowy';

describe('WorkflowyConnectorConfig', () => {
  it('should have the correct basic properties', () => {
    expect(WorkflowyConnectorConfig.name).toBe('WorkFlowy');
    expect(WorkflowyConnectorConfig.key).toBe('workflowy');
    expect(WorkflowyConnectorConfig.version).toBe('1.0.0');
    expect(WorkflowyConnectorConfig.logo).toBe('https://workflowy.com/favicon.ico');
  });

  it('should validate credentials schema correctly', () => {
    const validCredentials = {
      username: 'test@example.com',
      password: 'secretpassword',
    };

    const result = WorkflowyConnectorConfig.credentials.safeParse(validCredentials);
    expect(result.success).toBe(true);
  });

  it('should validate setup schema correctly', () => {
    const validSetup = {
      defaultLocation: 'Work/Tasks',
    };

    const result = WorkflowyConnectorConfig.setup.safeParse(validSetup);
    expect(result.success).toBe(true);
  });

  it('should validate empty setup schema', () => {
    const result = WorkflowyConnectorConfig.setup.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should validate invalid credentials schema', () => {
    const invalidCredentials = {
      username: 'test@example.com',
      // missing password
    };

    const result = WorkflowyConnectorConfig.credentials.safeParse(invalidCredentials);
    expect(result.success).toBe(false);
  });

  it('should have a meaningful example prompt', () => {
    expect(WorkflowyConnectorConfig.examplePrompt).toContain('Create a new bullet point');
    expect(WorkflowyConnectorConfig.examplePrompt).toContain('read');
    expect(WorkflowyConnectorConfig.examplePrompt).toContain('tasks');
  });
});

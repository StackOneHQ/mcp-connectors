import { describe, expect, it } from 'vitest';
import { GitLabConnectorConfig } from './gitlab';

describe('GitLabConnectorConfig', () => {
  it('should have the correct basic properties', () => {
    expect(GitLabConnectorConfig.name).toBe('GitLab');
    expect(GitLabConnectorConfig.key).toBe('gitlab');
    expect(GitLabConnectorConfig.version).toBe('1.0.0');
  });

  it('should have tools object with expected tools', () => {
    expect(typeof GitLabConnectorConfig.tools).toBe('object');
    expect(GitLabConnectorConfig.tools).toBeDefined();

    const expectedTools = [
      'GET_PROJECT',
      'LIST_PROJECTS',
      'LIST_ISSUES',
      'GET_ISSUE',
      'CREATE_ISSUE',
      'LIST_MERGE_REQUESTS',
      'GET_MERGE_REQUEST',
      'GET_CURRENT_USER',
      'GET_USER',
      'LIST_FILES',
      'GET_FILE_CONTENT',
    ];

    for (const toolName of expectedTools) {
      expect(GitLabConnectorConfig.tools[toolName]).toBeDefined();
    }
  });

  it('should have correct credential schema', () => {
    const credentialsSchema = GitLabConnectorConfig.credentials;
    const parsedCredentials = credentialsSchema.safeParse({
      token: 'test-token',
      baseUrl: 'https://gitlab.example.com/api/v4',
    });

    expect(parsedCredentials.success).toBe(true);
  });

  it('should use default baseUrl when not provided', () => {
    const credentialsSchema = GitLabConnectorConfig.credentials;
    const parsedCredentials = credentialsSchema.safeParse({
      token: 'test-token',
    });

    expect(parsedCredentials.success).toBe(true);
    if (parsedCredentials.success) {
      expect(parsedCredentials.data.baseUrl).toBe('https://gitlab.com/api/v4');
    }
  });

  it('should have a meaningful example prompt', () => {
    expect(GitLabConnectorConfig.examplePrompt).toContain('issues');
    expect(GitLabConnectorConfig.examplePrompt).toContain('merge requests');
  });
});

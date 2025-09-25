import { describe, it, expect } from 'vitest';
import { GitLabConnectorConfig } from './gitlab';

describe('GitLabConnectorConfig', () => {
  it('should have the correct basic properties', () => {
    expect(GitLabConnectorConfig.name).toBe('GitLab');
    expect(GitLabConnectorConfig.key).toBe('gitlab');
    expect(GitLabConnectorConfig.version).toBe('1.0.0');
  });

  it('should have the expected tools', () => {
    const toolNames = Object.keys(GitLabConnectorConfig.tools({} as any));
    
    expect(toolNames).toContain('GET_PROJECT');
    expect(toolNames).toContain('LIST_PROJECTS');
    expect(toolNames).toContain('LIST_ISSUES');
    expect(toolNames).toContain('GET_ISSUE');
    expect(toolNames).toContain('CREATE_ISSUE');
    expect(toolNames).toContain('LIST_MERGE_REQUESTS');
    expect(toolNames).toContain('GET_MERGE_REQUEST');
    expect(toolNames).toContain('GET_CURRENT_USER');
    expect(toolNames).toContain('GET_USER');
    expect(toolNames).toContain('LIST_FILES');
    expect(toolNames).toContain('GET_FILE_CONTENT');
  });

  it('should have correct credential schema', () => {
    const credentialsSchema = GitLabConnectorConfig.credentials;
    const parsedCredentials = credentialsSchema.safeParse({
      token: 'test-token',
      baseUrl: 'https://gitlab.example.com/api/v4'
    });
    
    expect(parsedCredentials.success).toBe(true);
  });

  it('should use default baseUrl when not provided', () => {
    const credentialsSchema = GitLabConnectorConfig.credentials;
    const parsedCredentials = credentialsSchema.safeParse({
      token: 'test-token'
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
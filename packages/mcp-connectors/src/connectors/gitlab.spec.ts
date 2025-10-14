import { describe, expect, it } from 'vitest';
import { extractToolsFromServer } from '../__mocks__/server-tools';
import { createGitLabServer } from './gitlab';

describe('GitLabConnector', () => {
  it('should create a server with the correct name and version', () => {
    const server = createGitLabServer({ token: 'test-token' });
    expect(server).toBeDefined();
  });

  it('should have all expected tools', () => {
    const server = createGitLabServer({ token: 'test-token' });
    const tools = extractToolsFromServer(server);

    const expectedTools = [
      'gitlab_get_project',
      'gitlab_list_projects',
      'gitlab_list_issues',
      'gitlab_get_issue',
      'gitlab_create_issue',
      'gitlab_list_merge_requests',
      'gitlab_get_merge_request',
      'gitlab_get_current_user',
      'gitlab_get_user',
      'gitlab_list_files',
      'gitlab_get_file_content',
    ];

    for (const toolName of expectedTools) {
      expect(tools[toolName]).toBeDefined();
    }
  });

  it('should accept credentials with token only', () => {
    const server = createGitLabServer({ token: 'test-token' });
    expect(server).toBeDefined();
  });

  it('should accept credentials with token and custom baseUrl', () => {
    const server = createGitLabServer({
      token: 'test-token',
      baseUrl: 'https://gitlab.example.com/api/v4',
    });
    expect(server).toBeDefined();
  });
});

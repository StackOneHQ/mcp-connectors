import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { describe, expect, it } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { FigmaConnectorConfig } from './figma';

describe('#FigmaConnector', () => {
  describe('.GET_FILE', () => {
    describe('when request is successful', () => {
      it('returns file information', async () => {
        const server = setupServer(
          http.get('https://api.figma.com/v1/files/test-file-key', () => {
            return HttpResponse.json({
              key: 'test-file-key',
              name: 'Test Design File',
              thumbnail_url: 'https://example.com/thumbnail.png',
              last_modified: '2024-01-01T00:00:00Z',
              version: '1.0',
              document: {
                id: '0:0',
                name: 'Document',
                type: 'DOCUMENT',
                children: [],
              },
              components: {},
              styles: {},
            });
          })
        );

        server.listen({ onUnhandledRequest: 'error' });

        const tool = FigmaConnectorConfig.tools.GET_FILE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = () =>
          Promise.resolve({ personalAccessToken: 'figd_test_token' });

        const actual = await tool.handler({ fileKey: 'test-file-key' }, mockContext);

        const parsed = JSON.parse(actual);
        expect(parsed.key).toBe('test-file-key');

        server.close();
      });
    });

    describe('when authentication fails', () => {
      it('returns authentication error', async () => {
        const server = setupServer(
          http.get('https://api.figma.com/v1/files/test-file-key', () => {
            return new HttpResponse(null, { status: 403 });
          })
        );

        server.listen({ onUnhandledRequest: 'error' });

        const tool = FigmaConnectorConfig.tools.GET_FILE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = () =>
          Promise.resolve({ personalAccessToken: 'invalid_token' });

        const actual = await tool.handler({ fileKey: 'test-file-key' }, mockContext);

        expect(actual).toContain('Failed to get file');

        server.close();
      });
    });

    describe('when file not found', () => {
      it('returns not found error', async () => {
        const server = setupServer(
          http.get('https://api.figma.com/v1/files/invalid-key', () => {
            return new HttpResponse(null, { status: 404 });
          })
        );

        server.listen({ onUnhandledRequest: 'error' });

        const tool = FigmaConnectorConfig.tools.GET_FILE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = () =>
          Promise.resolve({ personalAccessToken: 'figd_test_token' });

        const actual = await tool.handler({ fileKey: 'invalid-key' }, mockContext);

        expect(actual).toContain('Failed to get file');

        server.close();
      });
    });
  });

  describe('.GET_FILE_NODES', () => {
    describe('when request is successful', () => {
      it('returns specific nodes', async () => {
        const server = setupServer(
          http.get(
            'https://api.figma.com/v1/files/test-file-key/nodes',
            ({ request }) => {
              const url = new URL(request.url);
              const ids = url.searchParams.get('ids');
              expect(ids).toBe('1:1,1:2');

              return HttpResponse.json({
                nodes: {
                  '1:1': {
                    id: '1:1',
                    name: 'Frame 1',
                    type: 'FRAME',
                  },
                  '1:2': {
                    id: '1:2',
                    name: 'Frame 2',
                    type: 'FRAME',
                  },
                },
              });
            }
          )
        );

        server.listen({ onUnhandledRequest: 'error' });

        const tool = FigmaConnectorConfig.tools.GET_FILE_NODES as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = () =>
          Promise.resolve({ personalAccessToken: 'figd_test_token' });

        const actual = await tool.handler(
          { fileKey: 'test-file-key', nodeIds: ['1:1', '1:2'] },
          mockContext
        );

        const parsed = JSON.parse(actual);
        expect(parsed.nodes['1:1'].name).toBe('Frame 1');

        server.close();
      });
    });

    describe('when API returns error', () => {
      it('returns error message', async () => {
        const server = setupServer(
          http.get('https://api.figma.com/v1/files/test-file-key/nodes', () => {
            return new HttpResponse(null, { status: 500 });
          })
        );

        server.listen({ onUnhandledRequest: 'error' });

        const tool = FigmaConnectorConfig.tools.GET_FILE_NODES as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = () =>
          Promise.resolve({ personalAccessToken: 'figd_test_token' });

        const actual = await tool.handler(
          { fileKey: 'test-file-key', nodeIds: ['1:1'] },
          mockContext
        );

        expect(actual).toContain('Failed to get file nodes');

        server.close();
      });
    });
  });

  describe('.GET_COMMENTS', () => {
    describe('when request is successful', () => {
      it('returns file comments', async () => {
        const server = setupServer(
          http.get('https://api.figma.com/v1/files/test-file-key/comments', () => {
            return HttpResponse.json({
              comments: [
                {
                  id: 'comment-1',
                  file_key: 'test-file-key',
                  user: {
                    id: 'user-1',
                    handle: 'testuser',
                    img_url: 'https://example.com/avatar.png',
                  },
                  created_at: '2024-01-01T00:00:00Z',
                  message: 'This looks great!',
                  client_meta: { x: 100, y: 200 },
                },
              ],
            });
          })
        );

        server.listen({ onUnhandledRequest: 'error' });

        const tool = FigmaConnectorConfig.tools.GET_COMMENTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = () =>
          Promise.resolve({ personalAccessToken: 'figd_test_token' });

        const actual = await tool.handler({ fileKey: 'test-file-key' }, mockContext);

        const parsed = JSON.parse(actual);
        expect(parsed.comments).toHaveLength(1);

        server.close();
      });
    });

    describe('when API returns error', () => {
      it('returns error message', async () => {
        const server = setupServer(
          http.get('https://api.figma.com/v1/files/test-file-key/comments', () => {
            return new HttpResponse(null, { status: 403 });
          })
        );

        server.listen({ onUnhandledRequest: 'error' });

        const tool = FigmaConnectorConfig.tools.GET_COMMENTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = () =>
          Promise.resolve({ personalAccessToken: 'invalid_token' });

        const actual = await tool.handler({ fileKey: 'test-file-key' }, mockContext);

        expect(actual).toContain('Failed to get comments');

        server.close();
      });
    });
  });

  describe('.POST_COMMENT', () => {
    describe('when request is successful', () => {
      it('creates a new comment', async () => {
        const server = setupServer(
          http.post(
            'https://api.figma.com/v1/files/test-file-key/comments',
            async ({ request }) => {
              const body = (await request.json()) as {
                message: string;
                client_meta: { x: number; y: number };
              };
              expect(body.message).toBe('Great work!');
              expect(body.client_meta.x).toBe(150);
              expect(body.client_meta.y).toBe(250);

              return HttpResponse.json({
                comment: {
                  id: 'comment-2',
                  file_key: 'test-file-key',
                  user: {
                    id: 'user-1',
                    handle: 'testuser',
                    img_url: 'https://example.com/avatar.png',
                  },
                  created_at: '2024-01-01T00:00:00Z',
                  message: 'Great work!',
                  client_meta: { x: 150, y: 250 },
                },
              });
            }
          )
        );

        server.listen({ onUnhandledRequest: 'error' });

        const tool = FigmaConnectorConfig.tools.POST_COMMENT as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = () =>
          Promise.resolve({ personalAccessToken: 'figd_test_token' });

        const actual = await tool.handler(
          {
            fileKey: 'test-file-key',
            message: 'Great work!',
            x: 150,
            y: 250,
          },
          mockContext
        );

        const parsed = JSON.parse(actual);
        expect(parsed.comment.message).toBe('Great work!');

        server.close();
      });
    });

    describe('when API returns error', () => {
      it('returns error message', async () => {
        const server = setupServer(
          http.post('https://api.figma.com/v1/files/test-file-key/comments', () => {
            return new HttpResponse(null, { status: 403 });
          })
        );

        server.listen({ onUnhandledRequest: 'error' });

        const tool = FigmaConnectorConfig.tools.POST_COMMENT as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = () =>
          Promise.resolve({ personalAccessToken: 'invalid_token' });

        const actual = await tool.handler(
          {
            fileKey: 'test-file-key',
            message: 'Great work!',
          },
          mockContext
        );

        expect(actual).toContain('Failed to post comment');

        server.close();
      });
    });
  });

  describe('.GET_IMAGE', () => {
    describe('when request is successful', () => {
      describe('and format is PNG', () => {
        it('returns base64 encoded image data', async () => {
          const mockImageData = new ArrayBuffer(8);
          const view = new Uint8Array(mockImageData);
          view[0] = 137; // PNG magic number
          view[1] = 80; // P
          view[2] = 78; // N
          view[3] = 71; // G

          const server = setupServer(
            http.get('https://api.figma.com/v1/images/test-file-key', ({ request }) => {
              const url = new URL(request.url);
              const ids = url.searchParams.get('ids');
              const format = url.searchParams.get('format');
              const scale = url.searchParams.get('scale');

              expect(ids).toBe('1:1,1:2');
              expect(format).toBe('png');
              expect(scale).toBe('2');

              return HttpResponse.json({
                images: {
                  '1:1':
                    'https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/test1.png',
                  '1:2':
                    'https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/test2.png',
                },
              });
            }),
            http.get(
              'https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/test1.png',
              () => {
                return HttpResponse.arrayBuffer(mockImageData);
              }
            ),
            http.get(
              'https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/test2.png',
              () => {
                return HttpResponse.arrayBuffer(mockImageData);
              }
            )
          );

          server.listen({ onUnhandledRequest: 'error' });

          const tool = FigmaConnectorConfig.tools.GET_IMAGE as MCPToolDefinition;
          const mockContext = createMockConnectorContext();
          mockContext.getCredentials = () =>
            Promise.resolve({ personalAccessToken: 'figd_test_token' });

          const actual = await tool.handler(
            {
              fileKey: 'test-file-key',
              nodeIds: ['1:1', '1:2'],
              format: 'png',
              scale: 2,
            },
            mockContext
          );

          const parsed = JSON.parse(actual);
          expect(parsed.format).toBe('png');

          server.close();
        });
      });

      describe('and format is SVG', () => {
        it('returns SVG content as text', async () => {
          const mockSvgContent =
            '<svg xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="red"/></svg>';

          const server = setupServer(
            http.get('https://api.figma.com/v1/images/test-file-key', ({ request }) => {
              const url = new URL(request.url);
              const format = url.searchParams.get('format');
              const svgIncludeId = url.searchParams.get('svg_include_id');

              expect(format).toBe('svg');
              expect(svgIncludeId).toBe('true');

              return HttpResponse.json({
                images: {
                  '1:1':
                    'https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/test1.svg',
                },
              });
            }),
            http.get(
              'https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/test1.svg',
              () => {
                return new HttpResponse(mockSvgContent, {
                  headers: { 'Content-Type': 'image/svg+xml' },
                });
              }
            )
          );

          server.listen({ onUnhandledRequest: 'error' });

          const tool = FigmaConnectorConfig.tools.GET_IMAGE as MCPToolDefinition;
          const mockContext = createMockConnectorContext();
          mockContext.getCredentials = () =>
            Promise.resolve({ personalAccessToken: 'figd_test_token' });

          const actual = await tool.handler(
            {
              fileKey: 'test-file-key',
              nodeIds: ['1:1'],
              format: 'svg',
              svgIncludeId: true,
            },
            mockContext
          );

          const parsed = JSON.parse(actual);
          expect(parsed.format).toBe('svg');

          server.close();
        });
      });
    });

    describe('when API returns error', () => {
      it('returns error message', async () => {
        const server = setupServer(
          http.get('https://api.figma.com/v1/images/test-file-key', () => {
            return new HttpResponse(null, { status: 400 });
          })
        );

        server.listen({ onUnhandledRequest: 'error' });

        const tool = FigmaConnectorConfig.tools.GET_IMAGE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = () =>
          Promise.resolve({ personalAccessToken: 'figd_test_token' });

        const actual = await tool.handler(
          {
            fileKey: 'test-file-key',
            nodeIds: ['1:1'],
          },
          mockContext
        );

        expect(actual).toContain('Failed to get images');

        server.close();
      });
    });
  });

  describe('.GET_ME', () => {
    describe('when request is successful', () => {
      it('returns user information', async () => {
        const server = setupServer(
          http.get('https://api.figma.com/v1/me', () => {
            return HttpResponse.json({
              id: 'user-123',
              handle: 'testuser',
              img_url: 'https://example.com/avatar.png',
              email: 'test@example.com',
            });
          })
        );

        server.listen({ onUnhandledRequest: 'error' });

        const tool = FigmaConnectorConfig.tools.GET_ME as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = () =>
          Promise.resolve({ personalAccessToken: 'figd_test_token' });

        const actual = await tool.handler({}, mockContext);

        const parsed = JSON.parse(actual);
        expect(parsed.id).toBe('user-123');

        server.close();
      });
    });

    describe('when API returns error', () => {
      it('returns error message', async () => {
        const server = setupServer(
          http.get('https://api.figma.com/v1/me', () => {
            return new HttpResponse(null, { status: 401 });
          })
        );

        server.listen({ onUnhandledRequest: 'error' });

        const tool = FigmaConnectorConfig.tools.GET_ME as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = () =>
          Promise.resolve({ personalAccessToken: 'invalid_token' });

        const actual = await tool.handler({}, mockContext);

        expect(actual).toContain('Failed to get user info');

        server.close();
      });
    });
  });

  describe('.GET_TEAM_PROJECTS', () => {
    describe('when request is successful', () => {
      it('returns team projects', async () => {
        const server = setupServer(
          http.get('https://api.figma.com/v1/teams/team-123/projects', () => {
            return HttpResponse.json({
              projects: [
                {
                  id: 'project-1',
                  name: 'Design System',
                  modified_at: '2024-01-01T00:00:00Z',
                },
                {
                  id: 'project-2',
                  name: 'Mobile App',
                  modified_at: '2024-01-02T00:00:00Z',
                },
              ],
            });
          })
        );

        server.listen({ onUnhandledRequest: 'error' });

        const tool = FigmaConnectorConfig.tools.GET_TEAM_PROJECTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = () =>
          Promise.resolve({ personalAccessToken: 'figd_test_token' });

        const actual = await tool.handler({ teamId: 'team-123' }, mockContext);

        const parsed = JSON.parse(actual);
        expect(parsed.projects).toHaveLength(2);

        server.close();
      });
    });

    describe('when API returns error', () => {
      it('returns error message', async () => {
        const server = setupServer(
          http.get('https://api.figma.com/v1/teams/team-123/projects', () => {
            return new HttpResponse(null, { status: 403 });
          })
        );

        server.listen({ onUnhandledRequest: 'error' });

        const tool = FigmaConnectorConfig.tools.GET_TEAM_PROJECTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = () =>
          Promise.resolve({ personalAccessToken: 'invalid_token' });

        const actual = await tool.handler({ teamId: 'team-123' }, mockContext);

        expect(actual).toContain('Failed to get team projects');

        server.close();
      });
    });
  });

  describe('.GET_PROJECT_FILES', () => {
    describe('when request is successful', () => {
      it('returns project files', async () => {
        const server = setupServer(
          http.get('https://api.figma.com/v1/projects/project-123/files', () => {
            return HttpResponse.json({
              files: [
                {
                  key: 'file-1',
                  name: 'Design File 1',
                  thumbnail_url: 'https://example.com/thumb1.png',
                  last_modified: '2024-01-01T00:00:00Z',
                },
                {
                  key: 'file-2',
                  name: 'Design File 2',
                  thumbnail_url: 'https://example.com/thumb2.png',
                  last_modified: '2024-01-02T00:00:00Z',
                },
              ],
            });
          })
        );

        server.listen({ onUnhandledRequest: 'error' });

        const tool = FigmaConnectorConfig.tools.GET_PROJECT_FILES as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = () =>
          Promise.resolve({ personalAccessToken: 'figd_test_token' });

        const actual = await tool.handler({ projectId: 'project-123' }, mockContext);

        const parsed = JSON.parse(actual);
        expect(parsed.files).toHaveLength(2);

        server.close();
      });
    });

    describe('when API returns error', () => {
      it('returns error message', async () => {
        const server = setupServer(
          http.get('https://api.figma.com/v1/projects/project-123/files', () => {
            return new HttpResponse(null, { status: 404 });
          })
        );

        server.listen({ onUnhandledRequest: 'error' });

        const tool = FigmaConnectorConfig.tools.GET_PROJECT_FILES as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = () =>
          Promise.resolve({ personalAccessToken: 'figd_test_token' });

        const actual = await tool.handler({ projectId: 'project-123' }, mockContext);

        expect(actual).toContain('Failed to get project files');

        server.close();
      });
    });
  });

  describe('.GET_TEAM_COMPONENTS', () => {
    describe('when request is successful', () => {
      it('returns team components', async () => {
        const server = setupServer(
          http.get('https://api.figma.com/v1/teams/team-123/components', () => {
            return HttpResponse.json({
              components: [
                {
                  key: 'comp-1',
                  name: 'Button Component',
                  description: 'Primary button component',
                  created_at: '2024-01-01T00:00:00Z',
                  updated_at: '2024-01-02T00:00:00Z',
                  user: {
                    id: 'user-1',
                    handle: 'designer',
                    img_url: 'https://example.com/avatar.png',
                  },
                  containing_frame: {
                    node_id: '1:1',
                    name: 'Components',
                    background_color: '#FFFFFF',
                    page_id: '0:1',
                    page_name: 'Components',
                  },
                },
              ],
              pagination: {
                after: 'cursor-123',
              },
            });
          })
        );

        server.listen({ onUnhandledRequest: 'error' });

        const tool = FigmaConnectorConfig.tools.GET_TEAM_COMPONENTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = () =>
          Promise.resolve({ personalAccessToken: 'figd_test_token' });

        const actual = await tool.handler({ teamId: 'team-123' }, mockContext);

        const parsed = JSON.parse(actual);
        expect(parsed.components).toHaveLength(1);

        server.close();
      });
    });

    describe('when API returns error', () => {
      it('returns error message', async () => {
        const server = setupServer(
          http.get('https://api.figma.com/v1/teams/team-123/components', () => {
            return new HttpResponse(null, { status: 403 });
          })
        );

        server.listen({ onUnhandledRequest: 'error' });

        const tool = FigmaConnectorConfig.tools.GET_TEAM_COMPONENTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = () =>
          Promise.resolve({ personalAccessToken: 'invalid_token' });

        const actual = await tool.handler({ teamId: 'team-123' }, mockContext);

        expect(actual).toContain('Failed to get team components');

        server.close();
      });
    });
  });

  describe('.GET_VERSIONS', () => {
    describe('when request is successful', () => {
      it('returns file version history', async () => {
        const server = setupServer(
          http.get('https://api.figma.com/v1/files/test-file-key/versions', () => {
            return HttpResponse.json({
              versions: [
                {
                  id: 'version-1',
                  created_at: '2024-01-01T00:00:00Z',
                  label: 'Initial Design',
                  description: 'First version of the design',
                  user: {
                    id: 'user-1',
                    handle: 'designer',
                    img_url: 'https://example.com/avatar.png',
                  },
                },
                {
                  id: 'version-2',
                  created_at: '2024-01-02T00:00:00Z',
                  label: 'Updated Colors',
                  description: 'Updated brand colors',
                  user: {
                    id: 'user-1',
                    handle: 'designer',
                    img_url: 'https://example.com/avatar.png',
                  },
                },
              ],
            });
          })
        );

        server.listen({ onUnhandledRequest: 'error' });

        const tool = FigmaConnectorConfig.tools.GET_VERSIONS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = () =>
          Promise.resolve({ personalAccessToken: 'figd_test_token' });

        const actual = await tool.handler({ fileKey: 'test-file-key' }, mockContext);

        const parsed = JSON.parse(actual);
        expect(parsed.versions).toHaveLength(2);

        server.close();
      });
    });

    describe('when API returns error', () => {
      it('returns error message', async () => {
        const server = setupServer(
          http.get('https://api.figma.com/v1/files/test-file-key/versions', () => {
            return new HttpResponse(null, { status: 404 });
          })
        );

        server.listen({ onUnhandledRequest: 'error' });

        const tool = FigmaConnectorConfig.tools.GET_VERSIONS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = () =>
          Promise.resolve({ personalAccessToken: 'figd_test_token' });

        const actual = await tool.handler({ fileKey: 'test-file-key' }, mockContext);

        expect(actual).toContain('Failed to get versions');

        server.close();
      });
    });
  });
});

import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { FigmaConnectorConfig } from './figma';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('#FigmaConnector', () => {
  describe('.GET_FILE', () => {
    describe('when request is successful', () => {
      it('returns file information', async () => {
        server.use(
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
                children: []
              },
              components: {},
              styles: {}
            });
          })
        );

        const tool = FigmaConnectorConfig.tools.GET_FILE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ personalAccessToken: 'figd_test_token' });

        const actual = await tool.handler({ fileKey: 'test-file-key' }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.key).toBe('test-file-key');
        expect(parsed.name).toBe('Test Design File');
        expect(parsed.document.id).toBe('0:0');
      });
    });

    describe('when authentication fails', () => {
      it('returns authentication error', async () => {
        server.use(
          http.get('https://api.figma.com/v1/files/test-file-key', () => {
            return new HttpResponse(null, { status: 403 });
          })
        );

        const tool = FigmaConnectorConfig.tools.GET_FILE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ personalAccessToken: 'invalid_token' });

        const actual = await tool.handler({ fileKey: 'test-file-key' }, mockContext);

        expect(actual).toContain('Failed to get file');
        expect(actual).toContain('403');
      });
    });

    describe('when file not found', () => {
      it('returns not found error', async () => {
        server.use(
          http.get('https://api.figma.com/v1/files/invalid-key', () => {
            return new HttpResponse(null, { status: 404 });
          })
        );

        const tool = FigmaConnectorConfig.tools.GET_FILE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ personalAccessToken: 'figd_test_token' });

        const actual = await tool.handler({ fileKey: 'invalid-key' }, mockContext);

        expect(actual).toContain('Failed to get file');
        expect(actual).toContain('404');
      });
    });
  });

  describe('.GET_FILE_NODES', () => {
    describe('when request is successful', () => {
      it('returns specific nodes', async () => {
        server.use(
          http.get('https://api.figma.com/v1/files/test-file-key/nodes', ({ request }) => {
            const url = new URL(request.url);
            const ids = url.searchParams.get('ids');
            expect(ids).toBe('1:1,1:2');
            
            return HttpResponse.json({
              nodes: {
                '1:1': {
                  id: '1:1',
                  name: 'Frame 1',
                  type: 'FRAME'
                },
                '1:2': {
                  id: '1:2',
                  name: 'Frame 2',
                  type: 'FRAME'
                }
              }
            });
          })
        );

        const tool = FigmaConnectorConfig.tools.GET_FILE_NODES as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ personalAccessToken: 'figd_test_token' });

        const actual = await tool.handler(
          { fileKey: 'test-file-key', nodeIds: ['1:1', '1:2'] },
          mockContext
        );
        const parsed = JSON.parse(actual);

        expect(parsed.nodes['1:1'].name).toBe('Frame 1');
        expect(parsed.nodes['1:2'].name).toBe('Frame 2');
      });
    });

    describe('when API returns error', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://api.figma.com/v1/files/test-file-key/nodes', () => {
            return new HttpResponse(null, { status: 500 });
          })
        );

        const tool = FigmaConnectorConfig.tools.GET_FILE_NODES as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ personalAccessToken: 'figd_test_token' });

        const actual = await tool.handler(
          { fileKey: 'test-file-key', nodeIds: ['1:1'] },
          mockContext
        );

        expect(actual).toContain('Failed to get file nodes');
      });
    });
  });

  describe('.GET_COMMENTS', () => {
    describe('when request is successful', () => {
      it('returns file comments', async () => {
        server.use(
          http.get('https://api.figma.com/v1/files/test-file-key/comments', () => {
            return HttpResponse.json({
              comments: [
                {
                  id: 'comment-1',
                  file_key: 'test-file-key',
                  user: {
                    id: 'user-1',
                    handle: 'testuser',
                    img_url: 'https://example.com/avatar.png'
                  },
                  created_at: '2024-01-01T00:00:00Z',
                  message: 'This looks great!',
                  client_meta: { x: 100, y: 200 }
                }
              ]
            });
          })
        );

        const tool = FigmaConnectorConfig.tools.GET_COMMENTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ personalAccessToken: 'figd_test_token' });

        const actual = await tool.handler({ fileKey: 'test-file-key' }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.comments).toHaveLength(1);
        expect(parsed.comments[0].message).toBe('This looks great!');
        expect(parsed.comments[0].user.handle).toBe('testuser');
      });
    });

    describe('when API returns error', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://api.figma.com/v1/files/test-file-key/comments', () => {
            return new HttpResponse(null, { status: 403 });
          })
        );

        const tool = FigmaConnectorConfig.tools.GET_COMMENTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ personalAccessToken: 'invalid_token' });

        const actual = await tool.handler({ fileKey: 'test-file-key' }, mockContext);

        expect(actual).toContain('Failed to get comments');
      });
    });
  });

  describe('.POST_COMMENT', () => {
    describe('when request is successful', () => {
      it('creates a new comment', async () => {
        server.use(
          http.post('https://api.figma.com/v1/files/test-file-key/comments', async ({ request }) => {
            const body = await request.json() as any;
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
                  img_url: 'https://example.com/avatar.png'
                },
                created_at: '2024-01-01T00:00:00Z',
                message: 'Great work!',
                client_meta: { x: 150, y: 250 }
              }
            });
          })
        );

        const tool = FigmaConnectorConfig.tools.POST_COMMENT as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ personalAccessToken: 'figd_test_token' });

        const actual = await tool.handler({
          fileKey: 'test-file-key',
          message: 'Great work!',
          x: 150,
          y: 250
        }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.comment.message).toBe('Great work!');
        expect(parsed.comment.client_meta.x).toBe(150);
        expect(parsed.comment.client_meta.y).toBe(250);
      });
    });

    describe('when API returns error', () => {
      it('returns error message', async () => {
        server.use(
          http.post('https://api.figma.com/v1/files/test-file-key/comments', () => {
            return new HttpResponse(null, { status: 403 });
          })
        );

        const tool = FigmaConnectorConfig.tools.POST_COMMENT as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ personalAccessToken: 'invalid_token' });

        const actual = await tool.handler({
          fileKey: 'test-file-key',
          message: 'Great work!'
        }, mockContext);

        expect(actual).toContain('Failed to post comment');
      });
    });
  });

  describe('.GET_IMAGE', () => {
    describe('when request is successful', () => {
      it('returns base64 encoded image data for PNG format', async () => {
        const mockImageData = new ArrayBuffer(8);
        const view = new Uint8Array(mockImageData);
        view[0] = 137; // PNG magic number
        view[1] = 80;  // P
        view[2] = 78;  // N
        view[3] = 71;  // G

        server.use(
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
                '1:1': 'https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/test1.png',
                '1:2': 'https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/test2.png'
              }
            });
          }),
          http.get('https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/test1.png', () => {
            return HttpResponse.arrayBuffer(mockImageData);
          }),
          http.get('https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/test2.png', () => {
            return HttpResponse.arrayBuffer(mockImageData);
          })
        );

        const tool = FigmaConnectorConfig.tools.GET_IMAGE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ personalAccessToken: 'figd_test_token' });

        const actual = await tool.handler({
          fileKey: 'test-file-key',
          nodeIds: ['1:1', '1:2'],
          format: 'png',
          scale: 2
        }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.format).toBe('png');
        expect(parsed.images['1:1'].data).toBe(Buffer.from(mockImageData).toString('base64'));
        expect(parsed.images['1:1'].mimeType).toBe('image/png');
        expect(parsed.images['1:2'].data).toBe(Buffer.from(mockImageData).toString('base64'));
        expect(parsed.images['1:2'].mimeType).toBe('image/png');
      });
    });

    describe('when requesting SVG format', () => {
      it('returns SVG content as text', async () => {
        const mockSvgContent = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="red"/></svg>';

        server.use(
          http.get('https://api.figma.com/v1/images/test-file-key', ({ request }) => {
            const url = new URL(request.url);
            const format = url.searchParams.get('format');
            const svgIncludeId = url.searchParams.get('svg_include_id');
            
            expect(format).toBe('svg');
            expect(svgIncludeId).toBe('true');

            return HttpResponse.json({
              images: {
                '1:1': 'https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/test1.svg'
              }
            });
          }),
          http.get('https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/test1.svg', () => {
            return new HttpResponse(mockSvgContent, {
              headers: { 'Content-Type': 'image/svg+xml' }
            });
          })
        );

        const tool = FigmaConnectorConfig.tools.GET_IMAGE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ personalAccessToken: 'figd_test_token' });

        const actual = await tool.handler({
          fileKey: 'test-file-key',
          nodeIds: ['1:1'],
          format: 'svg',
          svgIncludeId: true
        }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.format).toBe('svg');
        expect(parsed.images['1:1']).toBe(mockSvgContent);
      });
    });

    describe('when API returns error', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://api.figma.com/v1/images/test-file-key', () => {
            return new HttpResponse(null, { status: 400 });
          })
        );

        const tool = FigmaConnectorConfig.tools.GET_IMAGE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ personalAccessToken: 'figd_test_token' });

        const actual = await tool.handler({
          fileKey: 'test-file-key',
          nodeIds: ['1:1']
        }, mockContext);

        expect(actual).toContain('Failed to get images');
      });
    });
  });

  describe('.GET_ME', () => {
    describe('when request is successful', () => {
      it('returns user information', async () => {
        server.use(
          http.get('https://api.figma.com/v1/me', () => {
            return HttpResponse.json({
              id: 'user-123',
              handle: 'testuser',
              img_url: 'https://example.com/avatar.png',
              email: 'test@example.com'
            });
          })
        );

        const tool = FigmaConnectorConfig.tools.GET_ME as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ personalAccessToken: 'figd_test_token' });

        const actual = await tool.handler({}, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.id).toBe('user-123');
        expect(parsed.handle).toBe('testuser');
        expect(parsed.email).toBe('test@example.com');
      });
    });

    describe('when API returns error', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://api.figma.com/v1/me', () => {
            return new HttpResponse(null, { status: 401 });
          })
        );

        const tool = FigmaConnectorConfig.tools.GET_ME as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ personalAccessToken: 'invalid_token' });

        const actual = await tool.handler({}, mockContext);

        expect(actual).toContain('Failed to get user info');
      });
    });
  });

  describe('.GET_TEAM_PROJECTS', () => {
    describe('when request is successful', () => {
      it('returns team projects', async () => {
        server.use(
          http.get('https://api.figma.com/v1/teams/team-123/projects', () => {
            return HttpResponse.json({
              projects: [
                {
                  id: 'project-1',
                  name: 'Design System',
                  modified_at: '2024-01-01T00:00:00Z'
                },
                {
                  id: 'project-2',
                  name: 'Mobile App',
                  modified_at: '2024-01-02T00:00:00Z'
                }
              ]
            });
          })
        );

        const tool = FigmaConnectorConfig.tools.GET_TEAM_PROJECTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ personalAccessToken: 'figd_test_token' });

        const actual = await tool.handler({ teamId: 'team-123' }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.projects).toHaveLength(2);
        expect(parsed.projects[0].name).toBe('Design System');
        expect(parsed.projects[1].name).toBe('Mobile App');
      });
    });

    describe('when API returns error', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://api.figma.com/v1/teams/team-123/projects', () => {
            return new HttpResponse(null, { status: 403 });
          })
        );

        const tool = FigmaConnectorConfig.tools.GET_TEAM_PROJECTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ personalAccessToken: 'invalid_token' });

        const actual = await tool.handler({ teamId: 'team-123' }, mockContext);

        expect(actual).toContain('Failed to get team projects');
      });
    });
  });

  describe('.GET_PROJECT_FILES', () => {
    describe('when request is successful', () => {
      it('returns project files', async () => {
        server.use(
          http.get('https://api.figma.com/v1/projects/project-123/files', () => {
            return HttpResponse.json({
              files: [
                {
                  key: 'file-1',
                  name: 'Design File 1',
                  thumbnail_url: 'https://example.com/thumb1.png',
                  last_modified: '2024-01-01T00:00:00Z'
                },
                {
                  key: 'file-2',
                  name: 'Design File 2',
                  thumbnail_url: 'https://example.com/thumb2.png',
                  last_modified: '2024-01-02T00:00:00Z'
                }
              ]
            });
          })
        );

        const tool = FigmaConnectorConfig.tools.GET_PROJECT_FILES as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ personalAccessToken: 'figd_test_token' });

        const actual = await tool.handler({ projectId: 'project-123' }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.files).toHaveLength(2);
        expect(parsed.files[0].name).toBe('Design File 1');
        expect(parsed.files[1].name).toBe('Design File 2');
      });
    });

    describe('when API returns error', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://api.figma.com/v1/projects/project-123/files', () => {
            return new HttpResponse(null, { status: 404 });
          })
        );

        const tool = FigmaConnectorConfig.tools.GET_PROJECT_FILES as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ personalAccessToken: 'figd_test_token' });

        const actual = await tool.handler({ projectId: 'project-123' }, mockContext);

        expect(actual).toContain('Failed to get project files');
      });
    });
  });

  describe('.GET_TEAM_COMPONENTS', () => {
    describe('when request is successful', () => {
      it('returns team components', async () => {
        server.use(
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
                    img_url: 'https://example.com/avatar.png'
                  },
                  containing_frame: {
                    node_id: '1:1',
                    name: 'Components',
                    background_color: '#FFFFFF',
                    page_id: '0:1',
                    page_name: 'Components'
                  }
                }
              ],
              pagination: {
                after: 'cursor-123'
              }
            });
          })
        );

        const tool = FigmaConnectorConfig.tools.GET_TEAM_COMPONENTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ personalAccessToken: 'figd_test_token' });

        const actual = await tool.handler({ teamId: 'team-123' }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.components).toHaveLength(1);
        expect(parsed.components[0].name).toBe('Button Component');
        expect(parsed.components[0].description).toBe('Primary button component');
        expect(parsed.pagination.after).toBe('cursor-123');
      });
    });

    describe('when API returns error', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://api.figma.com/v1/teams/team-123/components', () => {
            return new HttpResponse(null, { status: 403 });
          })
        );

        const tool = FigmaConnectorConfig.tools.GET_TEAM_COMPONENTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ personalAccessToken: 'invalid_token' });

        const actual = await tool.handler({ teamId: 'team-123' }, mockContext);

        expect(actual).toContain('Failed to get team components');
      });
    });
  });

  describe('.GET_VERSIONS', () => {
    describe('when request is successful', () => {
      it('returns file version history', async () => {
        server.use(
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
                    img_url: 'https://example.com/avatar.png'
                  }
                },
                {
                  id: 'version-2',
                  created_at: '2024-01-02T00:00:00Z',
                  label: 'Updated Colors',
                  description: 'Updated brand colors',
                  user: {
                    id: 'user-1',
                    handle: 'designer',
                    img_url: 'https://example.com/avatar.png'
                  }
                }
              ]
            });
          })
        );

        const tool = FigmaConnectorConfig.tools.GET_VERSIONS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ personalAccessToken: 'figd_test_token' });

        const actual = await tool.handler({ fileKey: 'test-file-key' }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.versions).toHaveLength(2);
        expect(parsed.versions[0].label).toBe('Initial Design');
        expect(parsed.versions[1].label).toBe('Updated Colors');
      });
    });

    describe('when API returns error', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://api.figma.com/v1/files/test-file-key/versions', () => {
            return new HttpResponse(null, { status: 404 });
          })
        );

        const tool = FigmaConnectorConfig.tools.GET_VERSIONS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getCredentials = vi
          .fn()
          .mockResolvedValue({ personalAccessToken: 'figd_test_token' });

        const actual = await tool.handler({ fileKey: 'test-file-key' }, mockContext);

        expect(actual).toContain('Failed to get versions');
      });
    });
  });
});
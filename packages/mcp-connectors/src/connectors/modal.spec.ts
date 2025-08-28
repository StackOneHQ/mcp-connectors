import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { describe, expect, it, vi } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { ModalConnectorConfig } from './modal';

describe('#ModalConnector', () => {
  describe('.CREATE_SANDBOX', () => {
    describe('when creating a sandbox with default options', () => {
      it('returns sandbox information', async () => {
        const server = setupServer(
          http.post('https://api.modal.com/v1/sandboxes', () => {
            return HttpResponse.json({
              object_id: 'sandbox-123',
              state: 'RUNNING',
              created_at: '2024-01-01T00:00:00Z',
              image_uri: 'python:3.12-slim',
              timeout_seconds: 3600,
            });
          })
        );
        server.listen();

        const tool = ModalConnectorConfig.tools.CREATE_SANDBOX as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        vi.mocked(mockContext.getCredentials).mockResolvedValue({
          token: 'ak-test-token',
        });

        const actual = await tool.handler({}, mockContext);

        expect(actual).toContain('sandbox-123');
        expect(actual).toContain('RUNNING');

        server.close();
      });
    });

    describe('when creating a sandbox with custom options', () => {
      it('returns sandbox information with custom configuration', async () => {
        const server = setupServer(
          http.post('https://api.modal.com/v1/sandboxes', () => {
            return HttpResponse.json({
              object_id: 'sandbox-456',
              state: 'RUNNING',
              created_at: '2024-01-01T00:00:00Z',
              image_uri: 'python:3.11-slim',
              timeout_seconds: 7200,
              encrypted_ports: [8080],
              environment: { NODE_ENV: 'production' },
            });
          })
        );
        server.listen();

        const tool = ModalConnectorConfig.tools.CREATE_SANDBOX as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        vi.mocked(mockContext.getCredentials).mockResolvedValue({
          token: 'ak-test-token',
        });

        const actual = await tool.handler(
          {
            image: 'python:3.11-slim',
            timeout: 7200,
            encrypted_ports: [8080],
            secrets: { NODE_ENV: 'production' },
          },
          mockContext
        );

        expect(actual).toContain('sandbox-456');
        expect(actual).toContain('python:3.11-slim');
        expect(actual).toContain('7200');

        server.close();
      });
    });

    describe('when API returns an error', () => {
      it('returns error message', async () => {
        const server = setupServer(
          http.post('https://api.modal.com/v1/sandboxes', () => {
            return HttpResponse.text('Invalid token', { status: 401 });
          })
        );
        server.listen();

        const tool = ModalConnectorConfig.tools.CREATE_SANDBOX as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        vi.mocked(mockContext.getCredentials).mockResolvedValue({
          token: 'ak-test-token',
        });

        const actual = await tool.handler({}, mockContext);

        expect(actual).toContain('Failed to create sandbox');
        expect(actual).toContain('401');

        server.close();
      });
    });
  });

  describe('.GET_SANDBOX', () => {
    describe('when sandbox exists', () => {
      it('returns sandbox information', async () => {
        const server = setupServer(
          http.get('https://api.modal.com/v1/sandboxes/:sandboxId', () => {
            return HttpResponse.json({
              object_id: 'sandbox-123',
              state: 'RUNNING',
              created_at: '2024-01-01T00:00:00Z',
              image_uri: 'python:3.12-slim',
              timeout_seconds: 3600,
            });
          })
        );
        server.listen();

        const tool = ModalConnectorConfig.tools.GET_SANDBOX as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        vi.mocked(mockContext.getCredentials).mockResolvedValue({
          token: 'ak-test-token',
        });

        const actual = await tool.handler({ sandboxId: 'sandbox-123' }, mockContext);

        expect(actual).toContain('sandbox-123');
        expect(actual).toContain('RUNNING');

        server.close();
      });
    });

    describe('when sandbox does not exist', () => {
      it('returns error message', async () => {
        const server = setupServer(
          http.get('https://api.modal.com/v1/sandboxes/:sandboxId', () => {
            return new HttpResponse(null, { status: 404 });
          })
        );
        server.listen();

        const tool = ModalConnectorConfig.tools.GET_SANDBOX as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        vi.mocked(mockContext.getCredentials).mockResolvedValue({
          token: 'ak-test-token',
        });

        const actual = await tool.handler({ sandboxId: 'nonexistent' }, mockContext);

        expect(actual).toContain('Failed to get sandbox');
        expect(actual).toContain('404');

        server.close();
      });
    });
  });

  describe('.LIST_SANDBOXES', () => {
    describe('when user has sandboxes', () => {
      it('returns list of sandboxes', async () => {
        const server = setupServer(
          http.get('https://api.modal.com/v1/sandboxes', () => {
            return HttpResponse.json({
              sandboxes: [
                {
                  object_id: 'sandbox-123',
                  state: 'RUNNING',
                  created_at: '2024-01-01T00:00:00Z',
                },
                {
                  object_id: 'sandbox-456',
                  state: 'STOPPED',
                  created_at: '2024-01-01T01:00:00Z',
                },
              ],
            });
          })
        );
        server.listen();

        const tool = ModalConnectorConfig.tools.LIST_SANDBOXES as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        vi.mocked(mockContext.getCredentials).mockResolvedValue({
          token: 'ak-test-token',
        });

        const actual = await tool.handler({}, mockContext);

        expect(actual).toContain('sandbox-123');
        expect(actual).toContain('sandbox-456');
        expect(actual).toContain('RUNNING');
        expect(actual).toContain('STOPPED');

        server.close();
      });
    });

    describe('when user has no sandboxes', () => {
      it('returns empty list', async () => {
        const server = setupServer(
          http.get('https://api.modal.com/v1/sandboxes', () => {
            return HttpResponse.json({ sandboxes: [] });
          })
        );
        server.listen();

        const tool = ModalConnectorConfig.tools.LIST_SANDBOXES as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        vi.mocked(mockContext.getCredentials).mockResolvedValue({
          token: 'ak-test-token',
        });

        const actual = await tool.handler({}, mockContext);

        expect(actual).toContain('[]');

        server.close();
      });
    });
  });

  describe('.TERMINATE_SANDBOX', () => {
    describe('when sandbox is running', () => {
      it('returns success message', async () => {
        const server = setupServer(
          http.post('https://api.modal.com/v1/sandboxes/:sandboxId/terminate', () => {
            return new HttpResponse(null, { status: 200 });
          })
        );
        server.listen();

        const tool = ModalConnectorConfig.tools.TERMINATE_SANDBOX as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        vi.mocked(mockContext.getCredentials).mockResolvedValue({
          token: 'ak-test-token',
        });

        const actual = await tool.handler({ sandboxId: 'sandbox-123' }, mockContext);

        expect(actual).toBe('Sandbox sandbox-123 terminated successfully');

        server.close();
      });
    });

    describe('when sandbox is already terminated', () => {
      it('returns error message', async () => {
        const server = setupServer(
          http.post('https://api.modal.com/v1/sandboxes/:sandboxId/terminate', () => {
            return new HttpResponse(null, { status: 409 });
          })
        );
        server.listen();

        const tool = ModalConnectorConfig.tools.TERMINATE_SANDBOX as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        vi.mocked(mockContext.getCredentials).mockResolvedValue({
          token: 'ak-test-token',
        });

        const actual = await tool.handler({ sandboxId: 'sandbox-123' }, mockContext);

        expect(actual).toContain('Failed to terminate sandbox');
        expect(actual).toContain('409');

        server.close();
      });
    });
  });

  describe('.EXEC_IN_SANDBOX', () => {
    describe('when executing a simple command', () => {
      it('returns process information with output', async () => {
        const server = setupServer(
          http.post('https://api.modal.com/v1/sandboxes/:sandboxId/exec', () => {
            return HttpResponse.json({
              object_id: 'process-123',
              sandbox_id: 'sandbox-123',
              returncode: 0,
              stdout: 'Hello, World!\n',
              stderr: '',
              is_running: false,
            });
          })
        );
        server.listen();

        const tool = ModalConnectorConfig.tools.EXEC_IN_SANDBOX as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        vi.mocked(mockContext.getCredentials).mockResolvedValue({
          token: 'ak-test-token',
        });

        const actual = await tool.handler(
          {
            sandboxId: 'sandbox-123',
            command: ['python', '-c', 'print("Hello, World!")'],
          },
          mockContext
        );

        expect(actual).toContain('process-123');
        expect(actual).toContain('Hello, World!');
        expect(actual).toContain('"returncode": 0');

        server.close();
      });
    });

    describe('when executing a command in background', () => {
      it('returns process information without immediate output', async () => {
        const server = setupServer(
          http.post('https://api.modal.com/v1/sandboxes/:sandboxId/exec', () => {
            return HttpResponse.json({
              object_id: 'process-456',
              sandbox_id: 'sandbox-123',
              returncode: null,
              stdout: '',
              stderr: '',
              is_running: true,
            });
          })
        );
        server.listen();

        const tool = ModalConnectorConfig.tools.EXEC_IN_SANDBOX as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        vi.mocked(mockContext.getCredentials).mockResolvedValue({
          token: 'ak-test-token',
        });

        const actual = await tool.handler(
          {
            sandboxId: 'sandbox-123',
            command: ['sleep', '30'],
            background: true,
          },
          mockContext
        );

        expect(actual).toContain('process-456');
        expect(actual).toContain('"is_running": true');

        server.close();
      });
    });

    describe('when command execution fails', () => {
      it('returns error message', async () => {
        const server = setupServer(
          http.post('https://api.modal.com/v1/sandboxes/:sandboxId/exec', () => {
            return HttpResponse.text('Invalid command', { status: 400 });
          })
        );
        server.listen();

        const tool = ModalConnectorConfig.tools.EXEC_IN_SANDBOX as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        vi.mocked(mockContext.getCredentials).mockResolvedValue({
          token: 'ak-test-token',
        });

        const actual = await tool.handler(
          {
            sandboxId: 'sandbox-123',
            command: ['invalid-command'],
          },
          mockContext
        );

        expect(actual).toContain('Failed to execute command');
        expect(actual).toContain('400');

        server.close();
      });
    });
  });

  describe('.GET_PROCESS_STATUS', () => {
    describe('when process exists', () => {
      it('returns process information', async () => {
        const server = setupServer(
          http.get(
            'https://api.modal.com/v1/sandboxes/:sandboxId/processes/:processId',
            () => {
              return HttpResponse.json({
                object_id: 'process-123',
                sandbox_id: 'sandbox-123',
                returncode: 0,
                stdout: 'Process output',
                stderr: '',
                is_running: false,
              });
            }
          )
        );
        server.listen();

        const tool = ModalConnectorConfig.tools.GET_PROCESS_STATUS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        vi.mocked(mockContext.getCredentials).mockResolvedValue({
          token: 'ak-test-token',
        });

        const actual = await tool.handler(
          { sandboxId: 'sandbox-123', processId: 'process-123' },
          mockContext
        );

        expect(actual).toContain('process-123');
        expect(actual).toContain('Process output');
        expect(actual).toContain('"is_running": false');

        server.close();
      });
    });

    describe('when process does not exist', () => {
      it('returns error message', async () => {
        const server = setupServer(
          http.get(
            'https://api.modal.com/v1/sandboxes/:sandboxId/processes/:processId',
            () => {
              return new HttpResponse(null, { status: 404 });
            }
          )
        );
        server.listen();

        const tool = ModalConnectorConfig.tools.GET_PROCESS_STATUS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        vi.mocked(mockContext.getCredentials).mockResolvedValue({
          token: 'ak-test-token',
        });

        const actual = await tool.handler(
          { sandboxId: 'sandbox-123', processId: 'nonexistent' },
          mockContext
        );

        expect(actual).toContain('Failed to get process status');
        expect(actual).toContain('404');

        server.close();
      });
    });
  });

  describe('.WAIT_FOR_PROCESS', () => {
    describe('when process completes successfully', () => {
      it('returns completed process information', async () => {
        const server = setupServer(
          http.post(
            'https://api.modal.com/v1/sandboxes/:sandboxId/processes/:processId/wait',
            () => {
              return HttpResponse.json({
                object_id: 'process-123',
                sandbox_id: 'sandbox-123',
                returncode: 0,
                stdout: 'Processing complete\n',
                stderr: '',
                is_running: false,
              });
            }
          )
        );
        server.listen();

        const tool = ModalConnectorConfig.tools.WAIT_FOR_PROCESS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        vi.mocked(mockContext.getCredentials).mockResolvedValue({
          token: 'ak-test-token',
        });

        const actual = await tool.handler(
          {
            sandboxId: 'sandbox-123',
            processId: 'process-123',
          },
          mockContext
        );

        expect(actual).toContain('process-123');
        expect(actual).toContain('Processing complete');
        expect(actual).toContain('"returncode": 0');
        expect(actual).toContain('"is_running": false');

        server.close();
      });
    });

    describe('when process fails', () => {
      it('returns failed process information', async () => {
        const server = setupServer(
          http.post(
            'https://api.modal.com/v1/sandboxes/:sandboxId/processes/:processId/wait',
            () => {
              return HttpResponse.json({
                object_id: 'process-456',
                sandbox_id: 'sandbox-123',
                returncode: 1,
                stdout: '',
                stderr: 'Error: Something went wrong\n',
                is_running: false,
              });
            }
          )
        );
        server.listen();

        const tool = ModalConnectorConfig.tools.WAIT_FOR_PROCESS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        vi.mocked(mockContext.getCredentials).mockResolvedValue({
          token: 'ak-test-token',
        });

        const actual = await tool.handler(
          {
            sandboxId: 'sandbox-123',
            processId: 'process-456',
          },
          mockContext
        );

        expect(actual).toContain('process-456');
        expect(actual).toContain('Something went wrong');
        expect(actual).toContain('"returncode": 1');

        server.close();
      });
    });
  });

  describe('.GET_SANDBOX_LOGS', () => {
    describe('when sandbox has logs', () => {
      it('returns logs array', async () => {
        const server = setupServer(
          http.get('https://api.modal.com/v1/sandboxes/:sandboxId/logs', () => {
            return HttpResponse.json({
              logs: [
                '2024-01-01T00:00:00Z [INFO] Sandbox started',
                '2024-01-01T00:00:01Z [INFO] Running command: python -c print("hello")',
                '2024-01-01T00:00:02Z [INFO] Command completed with exit code 0',
              ],
            });
          })
        );
        server.listen();

        const tool = ModalConnectorConfig.tools.GET_SANDBOX_LOGS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        vi.mocked(mockContext.getCredentials).mockResolvedValue({
          token: 'ak-test-token',
        });

        const actual = await tool.handler({ sandboxId: 'sandbox-123' }, mockContext);

        expect(actual).toContain('Sandbox started');
        expect(actual).toContain('Running command');
        expect(actual).toContain('Command completed');

        server.close();
      });
    });

    describe('when sandbox has no logs', () => {
      it('returns empty logs array', async () => {
        const server = setupServer(
          http.get('https://api.modal.com/v1/sandboxes/:sandboxId/logs', () => {
            return HttpResponse.json({ logs: [] });
          })
        );
        server.listen();

        const tool = ModalConnectorConfig.tools.GET_SANDBOX_LOGS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        vi.mocked(mockContext.getCredentials).mockResolvedValue({
          token: 'ak-test-token',
        });

        const actual = await tool.handler({ sandboxId: 'sandbox-123' }, mockContext);

        expect(actual).toContain('"logs": []');

        server.close();
      });
    });
  });

  describe('.CREATE_SNAPSHOT', () => {
    describe('when sandbox can be snapshotted', () => {
      it('returns snapshot information', async () => {
        const server = setupServer(
          http.post('https://api.modal.com/v1/sandboxes/:sandboxId/snapshot', () => {
            return HttpResponse.json({
              object_id: 'snapshot-123',
              created_at: '2024-01-01T00:00:00Z',
              sandbox_id: 'sandbox-123',
            });
          })
        );
        server.listen();

        const tool = ModalConnectorConfig.tools.CREATE_SNAPSHOT as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        vi.mocked(mockContext.getCredentials).mockResolvedValue({
          token: 'ak-test-token',
        });

        const actual = await tool.handler({ sandboxId: 'sandbox-123' }, mockContext);

        expect(actual).toContain('snapshot-123');
        expect(actual).toContain('sandbox-123');

        server.close();
      });
    });

    describe('when sandbox cannot be snapshotted', () => {
      it('returns error message', async () => {
        const server = setupServer(
          http.post('https://api.modal.com/v1/sandboxes/:sandboxId/snapshot', () => {
            return HttpResponse.text('Sandbox not in valid state for snapshotting', {
              status: 400,
            });
          })
        );
        server.listen();

        const tool = ModalConnectorConfig.tools.CREATE_SNAPSHOT as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        vi.mocked(mockContext.getCredentials).mockResolvedValue({
          token: 'ak-test-token',
        });

        const actual = await tool.handler({ sandboxId: 'sandbox-123' }, mockContext);

        expect(actual).toContain('Failed to create snapshot');
        expect(actual).toContain('400');

        server.close();
      });
    });
  });

  describe('.RESTORE_FROM_SNAPSHOT', () => {
    describe('when snapshot exists', () => {
      it('returns new sandbox information', async () => {
        const server = setupServer(
          http.post('https://api.modal.com/v1/sandboxes/restore', () => {
            return HttpResponse.json({
              object_id: 'sandbox-789',
              state: 'RUNNING',
              created_at: '2024-01-01T00:00:00Z',
              image_uri: 'python:3.12-slim',
              timeout_seconds: 3600,
            });
          })
        );
        server.listen();

        const tool = ModalConnectorConfig.tools
          .RESTORE_FROM_SNAPSHOT as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        vi.mocked(mockContext.getCredentials).mockResolvedValue({
          token: 'ak-test-token',
        });

        const actual = await tool.handler({ snapshotId: 'snapshot-123' }, mockContext);

        expect(actual).toContain('sandbox-789');
        expect(actual).toContain('RUNNING');

        server.close();
      });
    });

    describe('when snapshot does not exist', () => {
      it('returns error message', async () => {
        const server = setupServer(
          http.post('https://api.modal.com/v1/sandboxes/restore', () => {
            return HttpResponse.text('Snapshot not found', { status: 404 });
          })
        );
        server.listen();

        const tool = ModalConnectorConfig.tools
          .RESTORE_FROM_SNAPSHOT as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        vi.mocked(mockContext.getCredentials).mockResolvedValue({
          token: 'ak-test-token',
        });

        const actual = await tool.handler({ snapshotId: 'nonexistent' }, mockContext);

        expect(actual).toContain('Failed to restore from snapshot');
        expect(actual).toContain('404');

        server.close();
      });
    });
  });
});

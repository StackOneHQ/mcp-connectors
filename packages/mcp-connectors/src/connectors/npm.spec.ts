import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { NpmConnectorConfig } from './npm';

const mockSearchResponse = {
  objects: [
    {
      package: {
        name: 'test-package',
        version: '1.2.3',
        description: 'A test package for testing purposes',
        keywords: ['test', 'npm', 'package'],
        author: {
          name: 'Test Author',
          email: 'test@example.com',
        },
        publisher: {
          username: 'testuser',
          email: 'test@example.com',
        },
        maintainers: [
          {
            username: 'testuser',
            email: 'test@example.com',
          },
        ],
      },
      score: {
        final: 0.95,
        detail: {
          quality: 0.9,
          popularity: 0.8,
          maintenance: 0.7,
        },
      },
      searchScore: 0.95,
    },
    {
      package: {
        name: 'another-package',
        version: '2.1.0',
        description: 'Another test package',
        keywords: ['test'],
        author: {
          name: 'Another Author',
        },
        publisher: {
          username: 'anotheruser',
          email: 'another@example.com',
        },
        maintainers: [
          {
            username: 'anotheruser',
            email: 'another@example.com',
          },
        ],
      },
      score: {
        final: 0.87,
        detail: {
          quality: 0.8,
          popularity: 0.9,
          maintenance: 0.6,
        },
      },
      searchScore: 0.87,
    },
  ],
  total: 2,
  time: '2024-01-01T00:00:00.000Z',
};

const mockPackageResponse = {
  _id: 'test-package',
  name: 'test-package',
  description: 'A comprehensive test package',
  'dist-tags': {
    latest: '1.2.3',
    beta: '1.3.0-beta.1',
  },
  versions: {
    '1.2.3': {
      name: 'test-package',
      version: '1.2.3',
      description: 'A comprehensive test package',
      main: 'index.js',
      scripts: {
        test: 'jest',
        build: 'tsc',
      },
      dependencies: {
        lodash: '^4.17.21',
        axios: '^0.27.2',
      },
      devDependencies: {
        jest: '^28.0.0',
        typescript: '^4.7.0',
      },
      keywords: ['test', 'npm'],
      author: {
        name: 'Test Author',
        email: 'test@example.com',
      },
      license: 'MIT',
      repository: {
        type: 'git',
        url: 'https://github.com/test/test-package.git',
      },
      homepage: 'https://test-package.com',
      readme:
        "# Test Package\n\nThis is a test package for testing purposes.\n\n## Installation\n\n```bash\nnpm install test-package\n```\n\n## Usage\n\n```javascript\nconst testPackage = require('test-package');\n```",
    },
    '1.2.2': {
      name: 'test-package',
      version: '1.2.2',
      description: 'A comprehensive test package',
    },
  },
  time: {
    created: '2024-01-01T00:00:00.000Z',
    modified: '2024-01-02T00:00:00.000Z',
    '1.2.3': '2024-01-02T00:00:00.000Z',
    '1.2.2': '2024-01-01T12:00:00.000Z',
  },
  maintainers: [
    {
      name: 'testuser',
      email: 'test@example.com',
    },
  ],
  author: {
    name: 'Test Author',
    email: 'test@example.com',
  },
  repository: {
    type: 'git',
    url: 'https://github.com/test/test-package.git',
  },
  homepage: 'https://test-package.com',
  license: 'MIT',
  keywords: ['test', 'npm'],
  readme:
    "# Test Package\n\nThis is a test package for testing purposes.\n\n## Installation\n\n```bash\nnpm install test-package\n```\n\n## Usage\n\n```javascript\nconst testPackage = require('test-package');\n```",
};

const mockVersionResponse = {
  name: 'test-package',
  version: '1.2.3',
  description: 'A comprehensive test package',
  main: 'index.js',
  scripts: {
    test: 'jest',
    build: 'tsc',
  },
  dependencies: {
    lodash: '^4.17.21',
    axios: '^0.27.2',
  },
  devDependencies: {
    jest: '^28.0.0',
    typescript: '^4.7.0',
  },
  peerDependencies: {
    react: '>=16.0.0',
  },
  keywords: ['test', 'npm'],
  author: {
    name: 'Test Author',
    email: 'test@example.com',
  },
  license: 'MIT',
  repository: {
    type: 'git',
    url: 'https://github.com/test/test-package.git',
  },
  homepage: 'https://test-package.com',
  bugs: {
    url: 'https://github.com/test/test-package/issues',
  },
  readme: '# Test Package v1.2.3\n\nThis is the specific version readme.',
};

const server = setupServer();

describe('#NpmConnectorConfig', () => {
  beforeEach(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterEach(() => {
    server.resetHandlers();
    server.close();
  });
  describe('.SEARCH_PACKAGES', () => {
    describe('when search is successful', () => {
      describe('and packages are found', () => {
        it('returns formatted search results', async () => {
          server.use(
            http.get('https://registry.npmjs.org/-/v1/search', ({ request }) => {
              const url = new URL(request.url);
              const query = url.searchParams.get('text');
              const size = url.searchParams.get('size');

              expect(query).toBe('test');
              expect(size).toBe('20');

              return HttpResponse.json(mockSearchResponse);
            })
          );

          const tool = NpmConnectorConfig.tools.SEARCH_PACKAGES as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = await tool.handler({ query: 'test' }, mockContext);

          expect(actual).toContain('Found 2 npm packages:');
          expect(actual).toContain('1. test-package@1.2.3');
          expect(actual).toContain('Description: A test package for testing purposes');
          expect(actual).toContain('Keywords: test, npm, package');
          expect(actual).toContain('Author: Test Author <test@example.com>');
          expect(actual).toContain('Score: 0.95');
          expect(actual).toContain('https://npmjs.com/package/test-package');
          expect(actual).toContain('2. another-package@2.1.0');
        });
      });

      describe('and custom size is specified', () => {
        it('uses the specified size parameter', async () => {
          server.use(
            http.get('https://registry.npmjs.org/-/v1/search', ({ request }) => {
              const url = new URL(request.url);
              const size = url.searchParams.get('size');

              expect(size).toBe('5');

              return HttpResponse.json({ ...mockSearchResponse, objects: [] });
            })
          );

          const tool = NpmConnectorConfig.tools.SEARCH_PACKAGES as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          await tool.handler({ query: 'test', size: 5 }, mockContext);
        });
      });

      describe('and no packages are found', () => {
        it('returns no results message', async () => {
          server.use(
            http.get('https://registry.npmjs.org/-/v1/search', () => {
              return HttpResponse.json({
                objects: [],
                total: 0,
                time: '2024-01-01T00:00:00.000Z',
              });
            })
          );

          const tool = NpmConnectorConfig.tools.SEARCH_PACKAGES as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = await tool.handler({ query: 'nonexistent' }, mockContext);

          expect(actual).toBe('No packages found for your search query.');
        });
      });
    });

    describe('when search fails', () => {
      describe('and API returns error', () => {
        it('returns error message', async () => {
          server.use(
            http.get('https://registry.npmjs.org/-/v1/search', () => {
              return HttpResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
              );
            })
          );

          const tool = NpmConnectorConfig.tools.SEARCH_PACKAGES as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = await tool.handler({ query: 'test' }, mockContext);

          expect(actual).toContain('An error occurred while searching packages');
          expect(actual).toContain('HTTP error! Status: 500');
        });
      });
    });
  });

  describe('.GET_PACKAGE_INFO', () => {
    describe('when package exists', () => {
      describe('and request is successful', () => {
        it('returns formatted package information', async () => {
          server.use(
            http.get('https://registry.npmjs.org/test-package', () => {
              return HttpResponse.json(mockPackageResponse);
            })
          );

          const tool = NpmConnectorConfig.tools.GET_PACKAGE_INFO as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = await tool.handler({ packageName: 'test-package' }, mockContext);

          expect(actual).toContain('Package Information for test-package:');
          expect(actual).toContain('Latest Version: 1.2.3');
          expect(actual).toContain('Description: A comprehensive test package');
          expect(actual).toContain('Keywords: test, npm');
          expect(actual).toContain('Author: Test Author <test@example.com>');
          expect(actual).toContain('License: MIT');
          expect(actual).toContain('Homepage: https://test-package.com');
          expect(actual).toContain(
            'Repository: https://github.com/test/test-package.git'
          );
          expect(actual).toContain('Maintainers: testuser');
          expect(actual).toContain('https://npmjs.com/package/test-package');
        });
      });

      describe('and package name contains special characters', () => {
        it('properly encodes the package name', async () => {
          server.use(
            http.get('https://registry.npmjs.org/%40types%2Fnode', () => {
              return HttpResponse.json({
                ...mockPackageResponse,
                name: '@types/node',
                _id: '@types/node',
              });
            })
          );

          const tool = NpmConnectorConfig.tools.GET_PACKAGE_INFO as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = await tool.handler({ packageName: '@types/node' }, mockContext);

          expect(actual).toContain('Package Information for @types/node:');
        });
      });
    });

    describe('when package does not exist', () => {
      describe('and API returns 404', () => {
        it('returns package not found error', async () => {
          server.use(
            http.get('https://registry.npmjs.org/nonexistent-package', () => {
              return HttpResponse.json({ error: 'Not found' }, { status: 404 });
            })
          );

          const tool = NpmConnectorConfig.tools.GET_PACKAGE_INFO as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = await tool.handler(
            { packageName: 'nonexistent-package' },
            mockContext
          );

          expect(actual).toContain('An error occurred while getting package info');
          expect(actual).toContain('Package "nonexistent-package" not found');
        });
      });
    });
  });

  describe('.GET_VERSION_INFO', () => {
    describe('when version exists', () => {
      describe('and specific version is requested', () => {
        it('returns formatted version information', async () => {
          server.use(
            http.get('https://registry.npmjs.org/test-package/1.2.3', () => {
              return HttpResponse.json(mockVersionResponse);
            })
          );

          const tool = NpmConnectorConfig.tools.GET_VERSION_INFO as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = await tool.handler(
            { packageName: 'test-package', version: '1.2.3' },
            mockContext
          );

          expect(actual).toContain('Version Information for test-package@1.2.3:');
          expect(actual).toContain('Description: A comprehensive test package');
          expect(actual).toContain('Main: index.js');
          expect(actual).toContain('Scripts:');
          expect(actual).toContain('test: jest');
          expect(actual).toContain('build: tsc');
          expect(actual).toContain('Dependencies: 2 packages');
          expect(actual).toContain('lodash: ^4.17.21');
          expect(actual).toContain('axios: ^0.27.2');
          expect(actual).toContain('Dev Dependencies: 2 packages');
          expect(actual).toContain('Peer Dependencies: 1 package');
          expect(actual).toContain('https://npmjs.com/package/test-package/v/1.2.3');
        });
      });

      describe('and latest version is requested', () => {
        it('uses latest as default version', async () => {
          server.use(
            http.get('https://registry.npmjs.org/test-package/latest', () => {
              return HttpResponse.json(mockVersionResponse);
            })
          );

          const tool = NpmConnectorConfig.tools.GET_VERSION_INFO as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = await tool.handler({ packageName: 'test-package' }, mockContext);

          expect(actual).toContain('Version Information for test-package@1.2.3:');
        });
      });
    });

    describe('when version does not exist', () => {
      describe('and API returns 404', () => {
        it('returns version not found error', async () => {
          server.use(
            http.get('https://registry.npmjs.org/test-package/99.99.99', () => {
              return HttpResponse.json({ error: 'Not found' }, { status: 404 });
            })
          );

          const tool = NpmConnectorConfig.tools.GET_VERSION_INFO as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = await tool.handler(
            { packageName: 'test-package', version: '99.99.99' },
            mockContext
          );

          expect(actual).toContain('An error occurred while getting version info');
          expect(actual).toContain('Package "test-package" version "99.99.99" not found');
        });
      });
    });
  });

  describe('.GET_README', () => {
    describe('when package has README', () => {
      describe('and no version is specified', () => {
        it('returns README from package info', async () => {
          server.use(
            http.get('https://registry.npmjs.org/test-package', () => {
              return HttpResponse.json(mockPackageResponse);
            })
          );

          const tool = NpmConnectorConfig.tools.GET_README as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = await tool.handler({ packageName: 'test-package' }, mockContext);

          expect(actual).toContain('README for test-package:');
          expect(actual).toContain('# Test Package');
          expect(actual).toContain('This is a test package for testing purposes.');
          expect(actual).toContain('npm install test-package');
        });
      });

      describe('and specific version is specified', () => {
        it('returns README from version info', async () => {
          server.use(
            http.get('https://registry.npmjs.org/test-package/1.2.3', () => {
              return HttpResponse.json(mockVersionResponse);
            })
          );

          const tool = NpmConnectorConfig.tools.GET_README as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = await tool.handler(
            { packageName: 'test-package', version: '1.2.3' },
            mockContext
          );

          expect(actual).toContain('README for test-package@1.2.3:');
          expect(actual).toContain('# Test Package v1.2.3');
          expect(actual).toContain('This is the specific version readme.');
        });
      });

      describe('and README is very long', () => {
        it('truncates the README content', async () => {
          const longReadme = 'A'.repeat(15000);
          server.use(
            http.get('https://registry.npmjs.org/test-package', () => {
              return HttpResponse.json({
                ...mockPackageResponse,
                readme: longReadme,
              });
            })
          );

          const tool = NpmConnectorConfig.tools.GET_README as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = await tool.handler({ packageName: 'test-package' }, mockContext);

          expect(actual).toContain('[README truncated - content was too long]');
          expect(actual.length).toBeLessThan(15000);
        });
      });
    });

    describe('when package has no README', () => {
      describe('and package exists', () => {
        it('returns no README found message', async () => {
          server.use(
            http.get('https://registry.npmjs.org/test-package', () => {
              return HttpResponse.json({
                ...mockPackageResponse,
                readme: undefined,
              });
            })
          );

          const tool = NpmConnectorConfig.tools.GET_README as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = await tool.handler({ packageName: 'test-package' }, mockContext);

          expect(actual).toBe('No README found for package "test-package"');
        });
      });
    });

    describe('when package does not exist', () => {
      describe('and API returns 404', () => {
        it('returns error message', async () => {
          server.use(
            http.get('https://registry.npmjs.org/nonexistent-package', () => {
              return HttpResponse.json({ error: 'Not found' }, { status: 404 });
            })
          );

          const tool = NpmConnectorConfig.tools.GET_README as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = await tool.handler(
            { packageName: 'nonexistent-package' },
            mockContext
          );

          expect(actual).toContain('An error occurred while getting README');
          expect(actual).toContain('Package "nonexistent-package" not found');
        });
      });
    });
  });
});

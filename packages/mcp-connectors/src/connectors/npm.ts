import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface NpmSearchResult {
  package: {
    name: string;
    version: string;
    description?: string;
    keywords?: string[];
    author?: {
      name: string;
      email?: string;
    };
    publisher: {
      username: string;
      email: string;
    };
    maintainers: Array<{
      username: string;
      email: string;
    }>;
  };
  score: {
    final: number;
    detail: {
      quality: number;
      popularity: number;
      maintenance: number;
    };
  };
  searchScore: number;
}

interface NpmSearchResponse {
  objects: NpmSearchResult[];
  total: number;
  time: string;
}

interface NpmVersionData {
  name: string;
  version: string;
  description?: string;
  main?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  keywords?: string[];
  author?:
    | {
        name: string;
        email?: string;
      }
    | string;
  license?: string;
  repository?: {
    type: string;
    url: string;
  };
  homepage?: string;
  bugs?: {
    url?: string;
    email?: string;
  };
  readme?: string;
  maintainers?: Array<{
    name: string;
    email?: string;
  }>;
}

interface NpmPackageResponse {
  _id: string;
  name: string;
  description?: string;
  'dist-tags': {
    latest: string;
    [tag: string]: string;
  };
  versions: Record<string, NpmVersionData>;
  time: Record<string, string>;
  maintainers: Array<{
    name: string;
    email?: string;
  }>;
  author?:
    | {
        name: string;
        email?: string;
      }
    | string;
  repository?: {
    type: string;
    url: string;
  };
  homepage?: string;
  bugs?: {
    url?: string;
    email?: string;
  };
  license?: string;
  keywords?: string[];
  readme?: string;
}

const REGISTRY_BASE_URL = 'https://registry.npmjs.org';
const SEARCH_BASE_URL = 'https://registry.npmjs.org/-/v1/search';
const MAX_README_LENGTH = 10000;

const searchPackages = async (query: string, size = 20): Promise<NpmSearchResponse> => {
  console.info(`Searching npm packages for: ${query}`);

  const searchUrl = new URL(SEARCH_BASE_URL);
  searchUrl.searchParams.set('text', query);
  searchUrl.searchParams.set('size', size.toString());

  try {
    const response = await fetch(searchUrl.toString());

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = (await response.json()) as NpmSearchResponse;
    console.info(`Successfully found ${data.objects.length} packages`);
    return data;
  } catch (error) {
    console.error('Search request failed:', error);
    throw error;
  }
};

const getPackageInfo = async (packageName: string): Promise<NpmPackageResponse> => {
  console.info(`Getting package info for: ${packageName}`);

  const encodedPackageName = encodeURIComponent(packageName);
  const url = `${REGISTRY_BASE_URL}/${encodedPackageName}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Package "${packageName}" not found`);
      }
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = (await response.json()) as NpmPackageResponse;
    console.info(`Successfully retrieved info for package: ${packageName}`);
    return data;
  } catch (error) {
    console.error('Get package info request failed:', error);
    throw error;
  }
};

const getPackageVersion = async (
  packageName: string,
  version = 'latest'
): Promise<NpmVersionData> => {
  console.info(`Getting package version info for: ${packageName}@${version}`);

  const encodedPackageName = encodeURIComponent(packageName);
  const url = `${REGISTRY_BASE_URL}/${encodedPackageName}/${version}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Package "${packageName}" version "${version}" not found`);
      }
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = (await response.json()) as NpmVersionData;
    console.info(`Successfully retrieved version info for: ${packageName}@${version}`);
    return data;
  } catch (error) {
    console.error('Get package version request failed:', error);
    throw error;
  }
};

const formatSearchResults = (searchResponse: NpmSearchResponse): string => {
  if (searchResponse.objects.length === 0) {
    return 'No packages found for your search query.';
  }

  const output = [`Found ${searchResponse.objects.length} npm packages:\n`];

  for (let i = 0; i < searchResponse.objects.length; i++) {
    const result = searchResponse.objects[i];
    const pkg = result.package;

    output.push(`${i + 1}. ${pkg.name}@${pkg.version}`);
    if (pkg.description) {
      output.push(`   Description: ${pkg.description}`);
    }
    if (pkg.keywords && pkg.keywords.length > 0) {
      output.push(`   Keywords: ${pkg.keywords.join(', ')}`);
    }
    if (pkg.author && typeof pkg.author === 'object') {
      output.push(
        `   Author: ${pkg.author.name}${pkg.author.email ? ` <${pkg.author.email}>` : ''}`
      );
    }
    output.push(
      `   Score: ${result.score.final.toFixed(2)} (Quality: ${result.score.detail.quality.toFixed(2)}, Popularity: ${result.score.detail.popularity.toFixed(2)}, Maintenance: ${result.score.detail.maintenance.toFixed(2)})`
    );
    output.push(`   NPM: https://npmjs.com/package/${pkg.name}`);
    output.push(''); // Empty line between results
  }

  return output.join('\n');
};

const formatPackageInfo = (packageData: NpmPackageResponse): string => {
  const output = [`Package Information for ${packageData.name}:\n`];

  output.push(`Latest Version: ${packageData['dist-tags'].latest}`);

  if (packageData.description) {
    output.push(`Description: ${packageData.description}`);
  }

  if (packageData.keywords && packageData.keywords.length > 0) {
    output.push(`Keywords: ${packageData.keywords.join(', ')}`);
  }

  if (packageData.author) {
    if (typeof packageData.author === 'string') {
      output.push(`Author: ${packageData.author}`);
    } else {
      output.push(
        `Author: ${packageData.author.name}${packageData.author.email ? ` <${packageData.author.email}>` : ''}`
      );
    }
  }

  if (packageData.license) {
    output.push(`License: ${packageData.license}`);
  }

  if (packageData.homepage) {
    output.push(`Homepage: ${packageData.homepage}`);
  }

  if (packageData.repository) {
    output.push(`Repository: ${packageData.repository.url}`);
  }

  if (packageData.maintainers && packageData.maintainers.length > 0) {
    output.push(`Maintainers: ${packageData.maintainers.map((m) => m.name).join(', ')}`);
  }

  // Available versions (show latest 10)
  const versions = Object.keys(packageData.versions).reverse().slice(0, 10);
  if (versions.length > 0) {
    output.push(`Recent Versions: ${versions.join(', ')}`);
  }

  output.push(`NPM: https://npmjs.com/package/${packageData.name}`);

  return output.join('\n');
};

const formatVersionInfo = (versionData: NpmVersionData): string => {
  const output = [
    `Version Information for ${versionData.name}@${versionData.version}:\n`,
  ];

  if (versionData.description) {
    output.push(`Description: ${versionData.description}`);
  }

  if (versionData.main) {
    output.push(`Main: ${versionData.main}`);
  }

  if (versionData.scripts && Object.keys(versionData.scripts).length > 0) {
    output.push('Scripts:');
    for (const [script, command] of Object.entries(versionData.scripts)) {
      output.push(`  ${script}: ${command}`);
    }
  }

  if (versionData.dependencies && Object.keys(versionData.dependencies).length > 0) {
    output.push(`Dependencies: ${Object.keys(versionData.dependencies).length} packages`);
    const depList = Object.entries(versionData.dependencies).slice(0, 5);
    for (const [dep, version] of depList) {
      output.push(`  ${dep}: ${version}`);
    }
    if (Object.keys(versionData.dependencies).length > 5) {
      output.push(`  ... and ${Object.keys(versionData.dependencies).length - 5} more`);
    }
  }

  if (
    versionData.devDependencies &&
    Object.keys(versionData.devDependencies).length > 0
  ) {
    output.push(
      `Dev Dependencies: ${Object.keys(versionData.devDependencies).length} packages`
    );
  }

  if (
    versionData.peerDependencies &&
    Object.keys(versionData.peerDependencies).length > 0
  ) {
    output.push(
      `Peer Dependencies: ${Object.keys(versionData.peerDependencies).length} packages`
    );
  }

  if (versionData.keywords && versionData.keywords.length > 0) {
    output.push(`Keywords: ${versionData.keywords.join(', ')}`);
  }

  if (versionData.license) {
    output.push(`License: ${versionData.license}`);
  }

  if (versionData.homepage) {
    output.push(`Homepage: ${versionData.homepage}`);
  }

  if (versionData.repository) {
    output.push(`Repository: ${versionData.repository.url}`);
  }

  output.push(
    `NPM: https://npmjs.com/package/${versionData.name}/v/${versionData.version}`
  );

  return output.join('\n');
};

export const NpmConnectorConfig = mcpConnectorConfig({
  name: 'npm',
  key: 'npm',
  logo: 'https://stackone-logos.com/api/npm/filled/svg',
  version: '1.0.0',
  credentials: z.object({}),
  setup: z.object({}),
  examplePrompt:
    'Search for "typescript" packages, then get detailed information about the most popular TypeScript package and its latest version.',
  tools: (tool) => ({
    SEARCH_PACKAGES: tool({
      name: 'search_packages',
      description: 'Search npm packages by name, description, keywords, or author',
      schema: z.object({
        query: z
          .string()
          .describe('The search query string (package name, keywords, author, etc.)'),
        size: z
          .number()
          .min(1)
          .max(250)
          .default(20)
          .describe('Maximum number of results to return (1-250, default 20)'),
      }),
      handler: async (args, _context) => {
        try {
          const results = await searchPackages(args.query, args.size);
          return formatSearchResults(results);
        } catch (error) {
          console.error('Error during package search:', error);
          return `An error occurred while searching packages: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_PACKAGE_INFO: tool({
      name: 'get_package_info',
      description:
        'Get detailed information about a specific npm package including all versions and metadata',
      schema: z.object({
        packageName: z
          .string()
          .describe('The exact package name (e.g., "react", "@types/node")'),
      }),
      handler: async (args, _context) => {
        try {
          const packageData = await getPackageInfo(args.packageName);
          return formatPackageInfo(packageData);
        } catch (error) {
          console.error('Error getting package info:', error);
          return `An error occurred while getting package info: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_VERSION_INFO: tool({
      name: 'get_version_info',
      description: 'Get detailed information about a specific version of an npm package',
      schema: z.object({
        packageName: z
          .string()
          .describe('The exact package name (e.g., "react", "@types/node")'),
        version: z
          .string()
          .default('latest')
          .describe(
            'The version to get info for (default: "latest", can be specific version like "1.2.3")'
          ),
      }),
      handler: async (args, _context) => {
        try {
          const versionData = await getPackageVersion(args.packageName, args.version);
          return formatVersionInfo(versionData);
        } catch (error) {
          console.error('Error getting version info:', error);
          return `An error occurred while getting version info: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_README: tool({
      name: 'get_readme',
      description: 'Get the README content for a specific npm package',
      schema: z.object({
        packageName: z
          .string()
          .describe('The exact package name (e.g., "react", "@types/node")'),
        version: z
          .string()
          .optional()
          .describe('Optional specific version (if not provided, uses latest version)'),
      }),
      handler: async (args, _context) => {
        try {
          let readmeContent: string | undefined;

          if (args.version) {
            const versionData = await getPackageVersion(args.packageName, args.version);
            readmeContent = versionData.readme;
          } else {
            const packageData = await getPackageInfo(args.packageName);
            readmeContent = packageData.readme;
          }

          if (!readmeContent) {
            return `No README found for package "${args.packageName}"${args.version ? `@${args.version}` : ''}`;
          }

          // Truncate if too long for better readability
          if (readmeContent.length > MAX_README_LENGTH) {
            readmeContent = `${readmeContent.substring(0, MAX_README_LENGTH)}\n\n[README truncated - content was too long]`;
          }

          return `README for ${args.packageName}${args.version ? `@${args.version}` : ''}:\n\n${readmeContent}`;
        } catch (error) {
          console.error('Error getting README:', error);
          return `An error occurred while getting README: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});

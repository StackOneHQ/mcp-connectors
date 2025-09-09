import { Command } from 'commander';

export interface CliOptions {
  transport: 'http';
  url: string;
  headers?: Record<string, string>;
}

export function parseCli(): CliOptions {
  const program = new Command();

  program
    .name('mcp-testing-agent')
    .description('Automated testing agent for MCP servers')
    .requiredOption('--transport <type>', 'Transport type (only http supported)', 'http')
    .requiredOption('--url <url>', 'MCP server URL')
    .option('--headers <json>', 'HTTP headers as JSON string', '{}');

  program.parse();

  const options = program.opts();

  let headers: Record<string, string> = {};
  if (options.headers) {
    try {
      headers = JSON.parse(options.headers);
    } catch (error) {
      console.error('Invalid JSON for headers:', error);
      process.exit(1);
    }
  }

  return {
    transport: options.transport,
    url: options.url,
    headers,
  };
}

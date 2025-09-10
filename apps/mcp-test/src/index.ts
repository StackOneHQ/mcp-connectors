#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { type McpServerConfig, query } from '@anthropic-ai/claude-code';
import { parseCli } from './cli';
import { discoverTools } from './discover-tools';
import { createTestingPrompt } from './prompt';
import { which } from './utils/which';
import { ui } from './utils/ui';

async function main() {
  const options = parseCli();

  ui.header('MCP Test Runner');
  ui.detail('Server URL', options.url);
  ui.detail('Transport', options.transport);

  if (options.headers && Object.keys(options.headers).length > 0) {
    ui.info('Using custom headers');
  }

  ui.section('Spinning up an MCP Client');
  const spinner = ui.spinner('Connecting to MCP server...');
  const discoveredTools = await discoverTools(options.url, options.headers);
  spinner.stop();

  if (discoveredTools.length === 0) {
    ui.error('No tools discovered from the MCP server');
    process.exit(1);
  }

  ui.success(`Discovered ${discoveredTools.length} tools`);
  ui.list(discoveredTools);

  // Create temp dir to run claude in (isolated from current project)
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-testing-'));

  try {
    // Get the path to the test-data MCP server
    const testDataServerPath = path.join(import.meta.dirname, 'internal-server.ts');

    const mcpConfig: Record<string, McpServerConfig> = {
      'internal-helper': {
        type: 'stdio',
        command: 'bun',
        args: [testDataServerPath],
      },
      'server-to-test': {
        type: 'http',
        url: options.url,
        headers: options.headers,
      },
    };

    ui.section('Initializing Claude Code SDK');
    const claudeSpinner = ui.spinner('Setting up Claude Code configuration...');

    const pathToClaudeCodeExecutable = process.env.CLAUDE_CODE_PATH ?? which('claude');
    if (!pathToClaudeCodeExecutable) {
      ui.error('Claude Code executable not found');
      process.exit(1);
    }
    // Create allowed tools list for the agent
    const allowedTools = discoveredTools.map((tool) => `mcp__server-to-test__${tool}`);

    claudeSpinner.stop();
    ui.success('Claude Code ready');

    for await (const turn of query({
      prompt: createTestingPrompt(discoveredTools),
      options: {
        maxTurns: 50,
        mcpServers: mcpConfig,
        strictMcpConfig: true,
        model: 'claude-sonnet-4-20250514',
        pathToClaudeCodeExecutable,
        disallowedTools: [
          'Bash',
          'BashOutput',
          'KillBash',
          'WebSearch',
          'WebFetch',
          'Edit',
          'MultiEdit',
          'Read',
        ],
        allowedTools: [
          ...allowedTools,
          'mcp__internal-helper__generate_test_data',
          'Write',
        ],
        cwd: tempDir,
      },
    })) {
      if (turn.type === 'assistant') {
        ui.formatTurn(turn);
      }
      if (turn.type === 'user') {
        // User turns contain tool results - show them but truncated
        ui.formatTurn(turn);
      }
      if (turn.type === 'result') {
        ui.newline();
        if (turn.subtype === 'success') {
          ui.success('Testing completed successfully!');
        } else if (turn.subtype === 'error_max_turns') {
          ui.warning('Testing stopped: Maximum turns reached');
        } else if (turn.subtype === 'error_during_execution') {
          ui.error(`Testing failed: ${'error' in turn ? turn.error : 'Unknown error'}`);
        }
      }
    }
  } catch (error) {
    ui.error(`Fatal error: ${error}`);
    process.exit(1);
  } finally {
    // Copy results.json to our working directory before cleanup
    try {
      const resultsPath = path.join(tempDir, 'results.json');
      if (fs.existsSync(resultsPath)) {
        // Create .agent directory if it doesn't exist
        const outputDir = path.join(process.cwd(), '.agent');
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        if (!fs.existsSync(path.join(outputDir, '.gitignore'))) {
          fs.writeFileSync(path.join(outputDir, '.gitignore'), '*\n');
        }

        // Read the results file created by the agent
        const agentResults = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

        // Add our metadata to the results
        const enrichedResults = {
          timestamp: new Date().toISOString(),
          server_url: options.url,
          tool_count: discoveredTools.length,
          ...agentResults,
        };

        // Generate filename with server URL and timestamp
        const urlSlug = options.url.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputFile = path.join(outputDir, `results_${urlSlug}_${timestamp}.json`);

        // Write the enriched results
        fs.writeFileSync(outputFile, JSON.stringify(enrichedResults, null, 2));
        ui.newline();
        ui.success(`Results saved to: ${ui.path(outputFile)}`);
      } else {
        ui.warning('No results.json file was created');
      }
    } catch (copyError) {
      ui.error(`Failed to save results: ${copyError}`);
    }

    // Clean up: remove temp dir
    try {
      ui.section('Cleaning up test environment');
      const cleanupSpinner = ui.spinner('Cleaning up test environment...');

      fs.rmSync(tempDir, { recursive: true, force: true });
      cleanupSpinner.stop();

      ui.success('Removed temporary directory. Testing complete :)');
    } catch (cleanupError) {
      ui.warning(`Could not clean up temp directory: ${cleanupError}`);
    }
  }
}

if (import.meta.main) {
  main().catch((error) => {
    ui.error(`Unhandled error: ${error}`);
    process.exit(1);
  });
}

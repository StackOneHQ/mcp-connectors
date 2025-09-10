#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { type McpServerConfig, query } from '@anthropic-ai/claude-code';
import { parseCli } from './cli';
import { discoverTools } from './discover-tools';
import { createTestingPrompt } from './prompt';
import { which } from './utils';

async function main() {
  const options = parseCli();

  console.log('Starting MCP Test...');
  console.log(`Testing MCP server at: ${options.url}`);
  console.log(`Transport: ${options.transport}`);

  if (options.headers && Object.keys(options.headers).length > 0) {
    console.log('Using custom headers');
  }

  // Discover available tools from the MCP server
  console.log('\nDiscovering available tools from MCP server...');
  const discoveredTools = await discoverTools(options.url, options.headers);

  if (discoveredTools.length === 0) {
    console.error('No tools discovered from the MCP server');
    process.exit(1);
  }

  console.log(
    `Discovered ${discoveredTools.length} tools: ${discoveredTools.join(', ')}`
  );

  // Create temp dir to run claude in (isolated from current project)
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-testing-'));
  console.log(`Created temp directory for Claude Code: ${tempDir}`);

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

    console.log('\nInitializing Claude Code SDK with MCP configuration...');

    // Create allowed tools list for the agent
    const allowedTools = discoveredTools.map((tool) => `mcp__server-to-test__${tool}`);
    console.log(`\nAllowing tools: ${allowedTools.join(', ')}`);

    for await (const turn of query({
      prompt: createTestingPrompt(discoveredTools),
      options: {
        maxTurns: 50,
        mcpServers: mcpConfig,
        strictMcpConfig: true,
        model: 'claude-sonnet-4-20250514',
        pathToClaudeCodeExecutable: process.env.CLAUDE_CODE_PATH ?? which('claude'),
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
      if (turn.type === 'user') {
        console.log('\n[User]:', JSON.stringify(turn.message.content, null, 2));
      }
      if (turn.type === 'assistant') {
        console.log('\n[Agent]:', JSON.stringify(turn.message.content, null, 2));
      }
      if (turn.type === 'result') {
        if (turn.subtype === 'success') {
          console.log('\n✅ Testing completed successfully!');
        } else if (turn.subtype === 'error_max_turns') {
          console.error('\n⚠️ Testing stopped: Maximum turns reached');
        } else if (turn.subtype === 'error_during_execution') {
          console.error(
            '\n❌ Testing failed:',
            'error' in turn ? turn.error : 'Unknown error'
          );
        }
      }
    }
  } catch (error) {
    console.error('Fatal error:', error);
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
        console.log(`\n📋 Results saved to: ${outputFile}`);
      } else {
        console.warn('\n⚠️ No results.json file was created');
      }
    } catch (copyError) {
      console.error(`Failed to save results: ${copyError}`);
    }

    // Clean up: remove temp dir
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log(`Cleaned up temp directory: ${tempDir}`);
    } catch (cleanupError) {
      console.warn(`Warning: Could not clean up temp directory: ${cleanupError}`);
    }
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

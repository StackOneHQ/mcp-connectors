import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const printUsage = () => {
  console.log('🚀 MCP Connector Server Spawner');
  console.log('');
  console.log('Usage: bun run spawn --connector <connector-key> [options]');
  console.log('');
  console.log('Options:');
  console.log('  --connector    Connector key (required)');
  console.log('  --credentials  JSON string with connector credentials');
  console.log('  --setup        JSON string with connector setup configuration');
  console.log('  --port         Port to run server on (default: 3000)');
  console.log('  --watch        Enable watch mode for development (default: true)');
  console.log('  --help         Show this help message');
};

const main = async () => {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      connector: {
        type: 'string',
        short: 'c',
      },
      credentials: {
        type: 'string',
      },
      setup: {
        type: 'string',
      },
      port: {
        type: 'string',
        default: '3000',
      },
      watch: {
        type: 'boolean',
        default: true,
      },
      help: {
        type: 'boolean',
        short: 'h',
      },
    },
    strict: true,
    allowPositionals: true,
  });

  if (values.help) {
    printUsage();
    process.exit(0);
  }

  if (!values.connector) {
    console.error('❌ Connector key is required');
    console.log('');
    printUsage();
    process.exit(1);
  }

  // Ensure logs directory exists
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Build command arguments
  const serverScript = path.join(__dirname, 'index.ts');
  const args = [
    'run',
    values.watch ? '--watch' : '',
    serverScript,
    '--connector',
    values.connector,
  ].filter(Boolean); // Remove empty strings

  if (values.credentials) {
    args.push('--credentials', values.credentials);
  }

  if (values.setup) {
    args.push('--setup', values.setup);
  }

  if (values.port) {
    args.push('--port', values.port);
  }

  // Clear the log file before starting
  const logFile = path.join(logsDir, 'server.log');
  fs.writeFileSync(logFile, '');

  console.log('🚀 Starting MCP Connector Server in background...');
  console.log(`📝 Logs: ${logFile}`);
  console.log(`🔧 Watch mode: ${values.watch ? 'enabled' : 'disabled'}`);

  // Spawn the server process using bun
  const serverProcess = spawn('bun', args, {
    detached: true,
    stdio: 'ignore',
    cwd: process.cwd(),
  });

  // Allow the parent process to exit independently
  serverProcess.unref();

  const port = values.port || '3000';
  const serverUrl = `http://localhost:${port}/mcp`;

  console.log(`✅ Server spawned with PID: ${serverProcess.pid}`);
  console.log(`🔗 Server URL: ${serverUrl}`);
  console.log('');
  console.log('To view logs:');
  console.log(`  tail -f ${logFile}`);
  console.log('');
  console.log('To stop the server:');
  console.log(`  kill ${serverProcess.pid}`);
  console.log('');
  console.log(serverUrl);

  // Write PID to file for later reference
  const pidFile = path.join(logsDir, 'server.pid');
  fs.writeFileSync(pidFile, serverProcess.pid?.toString() || '');

  // Exit the spawner
  process.exit(0);
};

main().catch((error) => {
  console.error('Failed to spawn server:', error);
  process.exit(1);
});

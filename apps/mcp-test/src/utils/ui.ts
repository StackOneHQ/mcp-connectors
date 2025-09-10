import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import treeify, { type TreeObject } from 'treeify';
import type { SDKAssistantMessage, SDKUserMessage } from '@anthropic-ai/claude-code';

export const ui = {
  // Headers
  header: (title: string) => {
    console.log();
    console.log(chalk.cyan.bold(`--- ${title} ${'-'.repeat(50 - title.length)}`));
    console.log();
  },

  section: (title: string) => {
    console.log();
    console.log(chalk.magenta.bold(`> ${title}`));
  },

  // Status messages
  info: (message: string) => console.log(`${chalk.blue('i')}  ${message}`),
  success: (message: string) =>
    console.log(`${chalk.green('✓')}  ${chalk.green(message)}`),
  warning: (message: string) =>
    console.log(`${chalk.yellow('!')}  ${chalk.yellow(message)}`),
  error: (message: string) => console.error(`${chalk.red('✗')}  ${chalk.red(message)}`),

  // Details
  detail: (label: string, value: string | number) => {
    console.log(
      `${chalk.gray('  *')} ${chalk.bold(`${label}:`)} ${chalk.cyan(String(value))}`
    );
  },

  lastDetail: (label: string, value: string | number) => {
    console.log(
      `${chalk.gray('  *')} ${chalk.bold(`${label}:`)} ${chalk.cyan(String(value))}`
    );
  },

  // Lists
  list: (items: string[], title?: string) => {
    if (title) {
      console.log(chalk.blue(`  ${title}:`));
    }
    for (const item of items) {
      console.log(`${chalk.gray('    -')} ${item}`);
    }
  },

  // Tree display using Treeify - handles nested JSON strings
  tree: (
    obj: unknown,
    title?: string,
    options?: { maxStringLength?: number; truncate?: boolean }
  ) => {
    if (title) {
      console.log(chalk.blue(`  ${title}:`));
    }

    const maxLength = options?.maxStringLength ?? (options?.truncate ? 200 : 1000);
    const shouldTruncate = options?.truncate ?? false;

    // Process the object to parse any JSON strings
    const processValue = (value: unknown): unknown => {
      if (typeof value === 'string') {
        // Check if it's a JSON string
        if (value.startsWith('{') || value.startsWith('[')) {
          try {
            return JSON.parse(value);
          } catch {
            // Not valid JSON, truncate if needed
            if (shouldTruncate && value.length > maxLength) {
              return `${value.substring(0, maxLength)}... [${value.length - maxLength} chars]`;
            }
            return value;
          }
        }
        // Truncate long strings if needed
        if (shouldTruncate && value.length > maxLength) {
          return `${value.substring(0, maxLength)}... [${value.length - maxLength} chars]`;
        }
        return value;
      }
      if (Array.isArray(value)) {
        // Limit array display if truncating
        if (shouldTruncate && value.length > 10) {
          return [
            ...value.slice(0, 5).map(processValue),
            `... ${value.length - 5} more items`,
          ];
        }
        return value.map(processValue);
      }
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const processed: Record<string, unknown> = {};
        const obj = value as Record<string, unknown>;
        const keys = Object.keys(obj);
        // Limit object keys if truncating
        if (shouldTruncate && keys.length > 10) {
          for (const key of keys.slice(0, 10)) {
            processed[key] = processValue(obj[key]);
          }
          processed['...'] = `${keys.length - 10} more properties`;
        } else {
          for (const key in obj) {
            processed[key] = processValue(obj[key]);
          }
        }
        return processed;
      }
      return value;
    };

    const processedObj = processValue(obj);
    const tree = treeify.asTree(processedObj as TreeObject, true, false);
    for (const line of tree.split('\n')) {
      if (line) console.log(`  ${chalk.gray(line)}`);
    }
  },

  // Format message content (handle JSON arrays of content blocks)
  formatTurn: (turn: SDKAssistantMessage | SDKUserMessage) => {
    if (Array.isArray(turn.message.content)) {
      for (const item of turn.message.content) {
        if (item.type === 'text' && item.text) {
          // Text message
          console.log();
          console.log(chalk.white(item.text));
        }

        if (item.type === 'tool_use' && item.name) {
          // Tool use
          console.log();
          console.log(chalk.cyan('Tool: ') + chalk.bold(item.name));
          if (item.input) {
            // Use tree display for tool inputs
            ui.tree(item.input);
          }
        }

        if (item.type === 'tool_result') {
          // Tool result - use tree display with truncation
          console.log();
          console.log(chalk.dim('Tool Result: '));
          if (item.content) {
            // Use tree display with truncation for tool results
            ui.tree({ content: item.content }, undefined, {
              truncate: true,
              maxStringLength: 300,
            });
          }
        }
      }
    } else {
      // Not an array, display as is
      console.log(chalk.gray(turn.message.content));
    }
  },

  // Utilities
  path: (path: string) => chalk.yellow(path),
  newline: () => console.log(),
  divider: () => console.log(chalk.gray(`  ${'─'.repeat(50)}`)),

  // Spinner
  spinner: (text: string): Ora =>
    ora({
      text,
      spinner: 'dots',
      color: 'cyan',
    }).start(),
};

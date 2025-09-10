import childProcess from 'node:child_process';

/**
 * Synchronously finds the full path of a command in the system's PATH.
 * not for windows
 */
export function which(command: string): string | undefined {
  try {
    const result = childProcess
      .execSync(`which ${command}`, { encoding: 'utf-8' })
      .trim();
    return result ?? undefined;
  } catch {
    return undefined;
  }
}

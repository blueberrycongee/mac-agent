import { spawn } from 'node:child_process';

import { CommandExecutionError } from '../core/errors.js';

export interface CommandStep {
  command: string;
  args: string[];
}

export interface CommandOutput {
  stdout: string;
  stderr: string;
}

export async function runCommand(step: CommandStep): Promise<CommandOutput> {
  return await new Promise<CommandOutput>((resolve, reject) => {
    const child = spawn(step.command, step.args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on('error', (error: NodeJS.ErrnoException) => {
      reject(
        new CommandExecutionError({
          command: `${step.command} ${step.args.join(' ')}`.trim(),
          exitCode: null,
          stderr: error.message,
        }),
      );
    });

    child.on('close', (exitCode) => {
      if (exitCode === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new CommandExecutionError({
          command: `${step.command} ${step.args.join(' ')}`.trim(),
          exitCode,
          stderr,
        }),
      );
    });
  });
}

export async function runSteps(steps: CommandStep[]): Promise<void> {
  for (const step of steps) {
    await runCommand(step);
  }
}

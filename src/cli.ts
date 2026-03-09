#!/usr/bin/env node

import { access } from 'node:fs/promises';
import process from 'node:process';

import { Command } from 'commander';

import { CommandExecutionError } from './core/errors.js';
import { focusApplication } from './macos/apps.js';
import { formatPermissionGuidance } from './macos/permissions.js';
import { assertMacOS } from './macos/platform.js';

interface DoctorCheck {
  name: string;
  ok: boolean;
  detail: string;
}

async function toolExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function collectDoctorChecks(): Promise<DoctorCheck[]> {
  const isMac = process.platform === 'darwin';

  return [
    {
      name: 'Platform',
      ok: isMac,
      detail: isMac
        ? 'Running on macOS.'
        : `Unsupported platform: ${process.platform}`,
    },
    {
      name: 'open',
      ok: isMac && (await toolExists('/usr/bin/open')),
      detail: 'Required to launch apps by bundle name.',
    },
    {
      name: 'osascript',
      ok: isMac && (await toolExists('/usr/bin/osascript')),
      detail: 'Required to activate apps and later drive Automation workflows.',
    },
    {
      name: 'screencapture',
      ok: isMac && (await toolExists('/usr/sbin/screencapture')),
      detail: 'Useful for future screenshot-based computer-use workflows.',
    },
  ];
}

function printDoctorChecks(checks: DoctorCheck[]): void {
  for (const check of checks) {
    const prefix = check.ok ? '✓' : '✗';
    console.log(`${prefix} ${check.name}: ${check.detail}`);
  }
}

async function main(): Promise<void> {
  const program = new Command();

  program
    .name('mac-agent')
    .description(
      'A local macOS desktop agent scaffold for OpenAI computer-use workflows.',
    )
    .version('0.1.0');

  program
    .command('doctor')
    .description(
      'Inspect the local machine for the baseline macOS agent prerequisites.',
    )
    .action(async () => {
      const checks = await collectDoctorChecks();
      printDoctorChecks(checks);

      if (checks.some((check) => !check.ok)) {
        process.exitCode = 1;
      }
    });

  program
    .command('permissions')
    .description('Print the macOS permissions required for desktop control.')
    .action(() => {
      assertMacOS();
      console.log(formatPermissionGuidance());
    });

  program
    .command('app')
    .description('Application-focused helpers.')
    .command('focus')
    .description('Launch or focus the named macOS app.')
    .argument('<name>', 'Application name, such as Calendar or WeCom')
    .action(async (name: string) => {
      assertMacOS();
      await focusApplication(name);
      console.log(`Focused ${name}.`);
    });

  await program.parseAsync(process.argv);
}

main().catch((error: unknown) => {
  if (error instanceof CommandExecutionError) {
    console.error(error.message);
    process.exit(1);
  }

  if (error instanceof Error) {
    console.error(error.message);
    process.exit(1);
  }

  console.error('Unknown error');
  process.exit(1);
});

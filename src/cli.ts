#!/usr/bin/env node

import { access } from 'node:fs/promises';
import process from 'node:process';

import { Command } from 'commander';

import { createApprovalGate } from './computer/approval.js';
import { executeComputerActions } from './computer/executor.js';
import { runComputerLoop } from './computer/loop.js';
import { createOpenAIComputerClient } from './computer/openai-client.js';
import {
  appendSessionEvent,
  createComputerSession,
  getSessionScreenshotPath,
} from './computer/session.js';
import { CommandExecutionError } from './core/errors.js';
import { focusApplication } from './macos/apps.js';
import { pressKeys, typeText } from './macos/keyboard.js';
import {
  buildNativeDriver,
  captureFullScreen,
  createNativePointerDriver,
  getNativeDriverBinaryPath,
  getNativeDriverSourcePath,
} from './macos/native-driver.js';
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
      detail: 'Useful for screenshot-based computer-use workflows.',
    },
  ];
}

async function collectComputerDoctorChecks(): Promise<DoctorCheck[]> {
  assertMacOS();

  const hasApiKey =
    typeof process.env.OPENAI_API_KEY === 'string' &&
    process.env.OPENAI_API_KEY.trim().length > 0;

  return [
    {
      name: 'OPENAI_API_KEY',
      ok: hasApiKey,
      detail: hasApiKey
        ? 'Configured for Responses API requests.'
        : 'Missing. Required to call gpt-5.4.',
    },
    {
      name: 'xcrun',
      ok: await toolExists('/usr/bin/xcrun'),
      detail: 'Required to build the native Swift driver.',
    },
    {
      name: 'native driver source',
      ok: await toolExists(getNativeDriverSourcePath()),
      detail: 'The checked-in Swift source for pointer actions.',
    },
    {
      name: 'native driver binary',
      ok: await toolExists(getNativeDriverBinaryPath()),
      detail: 'Build with `mac-agent computer install-driver` if missing.',
    },
  ];
}

function printDoctorChecks(checks: DoctorCheck[]): void {
  for (const check of checks) {
    const prefix = check.ok ? '✓' : '✗';
    console.log(`${prefix} ${check.name}: ${check.detail}`);
  }
}

function parsePositiveInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer, received: ${value}`);
  }

  return parsed;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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

  const appCommand = program
    .command('app')
    .description('Application-focused helpers.');

  appCommand
    .command('focus')
    .description('Launch or focus the named macOS app.')
    .argument('<name>', 'Application name, such as Calendar or WeCom')
    .action(async (name: string) => {
      assertMacOS();
      await focusApplication(name);
      console.log(`Focused ${name}.`);
    });

  const computerCommand = program
    .command('computer')
    .description('OpenAI computer-use harness commands.');

  computerCommand
    .command('doctor')
    .description('Inspect the local computer-use harness prerequisites.')
    .action(async () => {
      const checks = await collectComputerDoctorChecks();
      printDoctorChecks(checks);

      if (checks.some((check) => !check.ok)) {
        process.exitCode = 1;
      }
    });

  computerCommand
    .command('install-driver')
    .description('Build the local native driver for pointer control.')
    .action(async () => {
      assertMacOS();
      const path = await buildNativeDriver();
      console.log(`Native driver ready at ${path}`);
    });

  computerCommand
    .command('run')
    .description('Run a task through the OpenAI built-in computer loop.')
    .argument('<task...>', 'Task prompt to send to the model')
    .option('--model <model>', 'Model name to use', 'gpt-5.4')
    .option(
      '--max-steps <count>',
      'Maximum number of computer-call turns to execute',
      parsePositiveInteger,
      25,
    )
    .option(
      '--session-root <path>',
      'Directory where session logs and screenshots will be stored',
      '.mac-agent/sessions',
    )
    .option('--auto-approve', 'Skip per-batch approval prompts', false)
    .action(
      async (
        taskParts: string[],
        commandOptions: {
          autoApprove: boolean;
          maxSteps: number;
          model: string;
          sessionRoot: string;
        },
      ) => {
        assertMacOS();

        const task = taskParts.join(' ');
        const session = await createComputerSession(commandOptions.sessionRoot);
        await appendSessionEvent(session, {
          type: 'task',
          model: commandOptions.model,
          prompt: task,
          maxSteps: commandOptions.maxSteps,
          autoApprove: commandOptions.autoApprove,
        });

        const approvalGate = createApprovalGate({
          autoApprove: commandOptions.autoApprove,
        });
        const pointer = createNativePointerDriver();
        const client = createOpenAIComputerClient();

        const result = await runComputerLoop({
          model: commandOptions.model,
          prompt: task,
          maxSteps: commandOptions.maxSteps,
          client,
          captureScreen: {
            capture(stepIndex) {
              return captureFullScreen(
                getSessionScreenshotPath(session, stepIndex),
              );
            },
          },
          executeActions(actions, screenshot) {
            return executeComputerActions(actions, {
              screenshotWidth: screenshot.screenshotWidth,
              screenshotHeight: screenshot.screenshotHeight,
              displayWidth: screenshot.displayWidth,
              displayHeight: screenshot.displayHeight,
              pointer,
              keyboard: {
                typeText,
                pressKeys,
              },
              sleep,
            });
          },
          confirmActions(actions, context) {
            return approvalGate.confirm(actions, context);
          },
          hooks: {
            onResponse({ response, stepIndex }) {
              return appendSessionEvent(session, {
                type: 'response',
                stepIndex,
                responseId: response.id ?? null,
              });
            },
            onComputerCall({ actions, callId, stepIndex }) {
              return appendSessionEvent(session, {
                type: 'computer_call',
                stepIndex,
                callId,
                actions,
              });
            },
            onScreenshot({ screenshot, stepIndex }) {
              return appendSessionEvent(session, {
                type: 'screenshot',
                stepIndex,
                filePath: screenshot.filePath,
                screenshotWidth: screenshot.screenshotWidth,
                screenshotHeight: screenshot.screenshotHeight,
                displayWidth: screenshot.displayWidth,
                displayHeight: screenshot.displayHeight,
              });
            },
            onFinal({ finalOutput, stepIndex }) {
              return appendSessionEvent(session, {
                type: 'final',
                stepIndex,
                finalOutput,
              });
            },
          },
        });

        if (result.finalOutput.length > 0) {
          console.log(result.finalOutput);
        }
        console.log(`Session log: ${session.rootDir}`);
      },
    );

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

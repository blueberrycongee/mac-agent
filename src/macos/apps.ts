import type { CommandStep } from './commands.js';

import { runSteps } from './commands.js';
import { assertMacOS } from './platform.js';

function escapeAppleScriptString(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

export function buildActivateAppleScript(appName: string): string {
  return `tell application "${escapeAppleScriptString(appName)}" to activate`;
}

export function createFocusAppExecutionPlan(appName: string): CommandStep[] {
  return [
    {
      command: 'open',
      args: ['-a', appName],
    },
    {
      command: 'osascript',
      args: ['-e', buildActivateAppleScript(appName)],
    },
  ];
}

export async function focusApplication(appName: string): Promise<void> {
  assertMacOS();
  await runSteps(createFocusAppExecutionPlan(appName));
}

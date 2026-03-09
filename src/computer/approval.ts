import readline from 'node:readline/promises';
import process from 'node:process';

import { MacAgentError } from '../core/errors.js';
import type { ComputerCallAction } from './types.js';

export interface ApprovalContext {
  callId: string;
  stepIndex: number;
}

export interface ApprovalGate {
  confirm(
    actions: ComputerCallAction[],
    context: ApprovalContext,
  ): Promise<void>;
}

export function requiresApproval(actions: ComputerCallAction[]): boolean {
  return actions.some(
    (action) => action.type !== 'screenshot' && action.type !== 'wait',
  );
}

function summarizeAction(action: ComputerCallAction): string {
  switch (action.type) {
    case 'click':
    case 'double_click':
    case 'doubleClick':
    case 'drag':
    case 'move':
      return `${action.type}(${String(action.x)}, ${String(action.y)})`;
    case 'scroll': {
      const scrollX = typeof action.scrollX === 'number' ? action.scrollX : 0;
      const scrollY = typeof action.scrollY === 'number' ? action.scrollY : 0;
      return `scroll(${scrollX}, ${scrollY}) at (${String(action.x)}, ${String(action.y)})`;
    }
    case 'type':
      return `type(${JSON.stringify(action.text)})`;
    case 'keypress':
      return `keypress(${Array.isArray(action.keys) ? action.keys.join(', ') : 'unknown'})`;
    case 'wait':
      return 'wait';
    case 'screenshot':
      return 'screenshot';
    default:
      return action.type;
  }
}

export function createApprovalGate(options: {
  autoApprove: boolean;
  input?: NodeJS.ReadableStream;
  output?: NodeJS.WritableStream;
}): ApprovalGate {
  return {
    async confirm(actions, context) {
      if (options.autoApprove || !requiresApproval(actions)) {
        return;
      }

      const input = options.input ?? process.stdin;
      const output = options.output ?? process.stdout;
      const rl = readline.createInterface({ input, output });

      try {
        output.write(
          `\nComputer step ${context.stepIndex + 1} (${context.callId}) proposes:\n`,
        );
        for (const action of actions) {
          output.write(`- ${summarizeAction(action)}\n`);
        }

        const answer = await rl.question('Approve this action batch? [y/N] ');
        const normalized = answer.trim().toLowerCase();
        if (normalized !== 'y' && normalized !== 'yes') {
          throw new MacAgentError('User declined computer action batch.');
        }
      } finally {
        rl.close();
      }
    },
  };
}

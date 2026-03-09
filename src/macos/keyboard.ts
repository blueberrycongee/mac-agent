import { MacAgentError } from '../core/errors.js';
import { runCommand } from './commands.js';

const modifierMap = new Map<string, string>([
  ['ALT', 'option down'],
  ['CMD', 'command down'],
  ['COMMAND', 'command down'],
  ['CONTROL', 'control down'],
  ['CTRL', 'control down'],
  ['META', 'command down'],
  ['OPTION', 'option down'],
  ['SHIFT', 'shift down'],
]);

const specialKeyCodeMap = new Map<string, number>([
  ['BACKSPACE', 51],
  ['DELETE', 51],
  ['DOWN', 125],
  ['END', 119],
  ['ENTER', 36],
  ['ESC', 53],
  ['ESCAPE', 53],
  ['FORWARDDELETE', 117],
  ['FORWARD_DELETE', 117],
  ['HOME', 115],
  ['LEFT', 123],
  ['PAGEDOWN', 121],
  ['PAGEUP', 116],
  ['PAGE_DOWN', 121],
  ['PAGE_UP', 116],
  ['RETURN', 36],
  ['RIGHT', 124],
  ['TAB', 48],
  ['UP', 126],
]);

interface ParsedKeypress {
  modifiers: string[];
  render(): string;
}

function escapeAppleScriptString(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

function normalizeToken(value: string): string {
  return value.trim().toUpperCase().replaceAll('-', '_');
}

function parseSingleKeypress(combo: string): ParsedKeypress {
  const parts = combo
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    throw new MacAgentError('Received an empty keypress action.');
  }

  const basePart = parts.at(-1);
  if (basePart === undefined) {
    throw new MacAgentError('Received an invalid keypress action.');
  }

  const modifiers = parts.slice(0, -1).map((part) => {
    const modifier = modifierMap.get(normalizeToken(part));
    if (modifier === undefined) {
      throw new MacAgentError(`Unsupported key modifier: ${part}`);
    }

    return modifier;
  });

  const normalizedBase = normalizeToken(basePart);

  if (normalizedBase === 'SPACE') {
    return {
      modifiers,
      render() {
        const usingClause =
          modifiers.length > 0 ? ` using {${modifiers.join(', ')}}` : '';
        return `keystroke space${usingClause}`;
      },
    };
  }

  const keyCode = specialKeyCodeMap.get(normalizedBase);
  if (keyCode !== undefined) {
    return {
      modifiers,
      render() {
        const usingClause =
          modifiers.length > 0 ? ` using {${modifiers.join(', ')}}` : '';
        return `key code ${keyCode}${usingClause}`;
      },
    };
  }

  if (basePart.length === 1) {
    const character = escapeAppleScriptString(basePart.toLowerCase());
    return {
      modifiers,
      render() {
        const usingClause =
          modifiers.length > 0 ? ` using {${modifiers.join(', ')}}` : '';
        return `keystroke "${character}"${usingClause}`;
      },
    };
  }

  throw new MacAgentError(`Unsupported keypress target: ${basePart}`);
}

export function buildAppleScriptForType(text: string): string {
  return [
    'tell application "System Events"',
    `  keystroke "${escapeAppleScriptString(text)}"`,
    'end tell',
  ].join('\n');
}

export function buildAppleScriptForKeypress(keys: string[]): string {
  const lines = keys.map((key) => `  ${parseSingleKeypress(key).render()}`);

  return ['tell application "System Events"', ...lines, 'end tell'].join('\n');
}

async function runAppleScript(script: string): Promise<void> {
  await runCommand({
    command: 'osascript',
    args: ['-e', script],
  });
}

export async function typeText(text: string): Promise<void> {
  await runAppleScript(buildAppleScriptForType(text));
}

export async function pressKeys(keys: string[]): Promise<void> {
  await runAppleScript(buildAppleScriptForKeypress(keys));
}

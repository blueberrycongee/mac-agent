import { describe, expect, test } from 'vitest';

import {
  buildAppleScriptForKeypress,
  buildAppleScriptForType,
} from '../../src/macos/keyboard.js';

describe('buildAppleScriptForType', () => {
  test('escapes text safely for AppleScript keystroke input', () => {
    expect(buildAppleScriptForType('hello "world"')).toContain(
      String.raw`keystroke "hello \"world\""`,
    );
  });
});

describe('buildAppleScriptForKeypress', () => {
  test('supports modifier chords with printable keys', () => {
    expect(buildAppleScriptForKeypress(['CMD+A'])).toContain(
      'keystroke "a" using {command down}',
    );
  });

  test('supports special keys with modifiers', () => {
    expect(buildAppleScriptForKeypress(['SHIFT+TAB'])).toContain(
      'key code 48 using {shift down}',
    );
  });
});

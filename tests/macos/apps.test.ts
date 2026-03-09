import { describe, expect, test } from 'vitest';

import {
  buildActivateAppleScript,
  createFocusAppExecutionPlan,
} from '../../src/macos/apps.js';

describe('buildActivateAppleScript', () => {
  test('quotes app names safely for AppleScript', () => {
    expect(buildActivateAppleScript('Calendar')).toContain(
      'application "Calendar"',
    );
    expect(buildActivateAppleScript('Foo "Bar"')).toContain(
      String.raw`application "Foo \"Bar\""`,
    );
  });
});

describe('createFocusAppExecutionPlan', () => {
  test('creates open and activate steps in order', () => {
    expect(createFocusAppExecutionPlan('Calendar')).toEqual([
      {
        command: 'open',
        args: ['-a', 'Calendar'],
      },
      {
        command: 'osascript',
        args: ['-e', 'tell application "Calendar" to activate'],
      },
    ]);
  });
});

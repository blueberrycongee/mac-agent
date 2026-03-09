import { describe, expect, test } from 'vitest';

import { getPermissionGuidance } from '../../src/macos/permissions.js';

describe('getPermissionGuidance', () => {
  test('returns the core permissions for local desktop control', () => {
    expect(getPermissionGuidance()).toEqual([
      {
        name: 'Accessibility',
        why: 'Allows mac-agent to inspect and control UI elements in desktop apps.',
      },
      {
        name: 'Screen Recording',
        why: 'Allows mac-agent to capture screenshots for visual grounding and fallback control.',
      },
      {
        name: 'Automation',
        why: 'Allows mac-agent to drive scriptable apps such as Finder, Calendar, or System Events.',
      },
    ]);
  });
});

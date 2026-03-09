import { describe, expect, test } from 'vitest';

import {
  createRunProfile,
  defaultRunProfile,
} from '../../src/computer/run-profile.js';

describe('defaultRunProfile', () => {
  test('uses efficient default model viewport and settle delay values', () => {
    expect(defaultRunProfile).toEqual({
      uiSettleMs: 150,
      visionHeight: 900,
      visionWidth: 1440,
    });
  });
});

describe('createRunProfile', () => {
  test('merges explicit values over the defaults', () => {
    expect(createRunProfile({ uiSettleMs: 250, visionWidth: 1600 })).toEqual({
      uiSettleMs: 250,
      visionHeight: 900,
      visionWidth: 1600,
    });
  });
});

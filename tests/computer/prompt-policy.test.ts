import { describe, expect, test } from 'vitest';

import { buildComputerRunPrompt } from '../../src/computer/prompt-policy.js';

describe('buildComputerRunPrompt', () => {
  test('adds screenshot-first and batching guidance around the user task', () => {
    const prompt = buildComputerRunPrompt(
      'Open Calendar and search for penguin.',
    );

    expect(prompt).toContain('request a screenshot first');
    expect(prompt).toContain('batch obvious consecutive actions');
    expect(prompt).toContain('stop as soon as the task is complete');
    expect(prompt).toContain('Open Calendar and search for penguin.');
  });
});

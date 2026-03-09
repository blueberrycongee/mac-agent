import { describe, expect, test } from 'vitest';

import { createStepMetricsEvent } from '../../src/computer/metrics.js';

describe('createStepMetricsEvent', () => {
  test('creates a normalized metrics event payload for session logging', () => {
    expect(
      createStepMetricsEvent({
        actionCount: 2,
        approvalRequired: true,
        captureMs: 90,
        executeMs: 45,
        responseMs: 350,
        screenshotHeight: 900,
        screenshotWidth: 1440,
        settleMs: 150,
        sourceHeight: 1800,
        sourceWidth: 2880,
        stepIndex: 3,
      }),
    ).toEqual({
      type: 'step_metrics',
      stepIndex: 3,
      responseMs: 350,
      executeMs: 45,
      captureMs: 90,
      settleMs: 150,
      actionCount: 2,
      approvalRequired: true,
      screenshotWidth: 1440,
      screenshotHeight: 900,
      sourceWidth: 2880,
      sourceHeight: 1800,
    });
  });
});

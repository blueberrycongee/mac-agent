import { describe, expect, test } from 'vitest';

import { mapPointFromScreenshotToDisplay } from '../../src/computer/coordinates.js';

describe('mapPointFromScreenshotToDisplay', () => {
  test('scales screenshot pixels into display points', () => {
    expect(
      mapPointFromScreenshotToDisplay({
        x: 1440,
        y: 900,
        screenshotWidth: 2880,
        screenshotHeight: 1800,
        displayWidth: 1440,
        displayHeight: 900,
      }),
    ).toEqual({ x: 720, y: 450 });
  });

  test('clamps coordinates to the visible display bounds', () => {
    expect(
      mapPointFromScreenshotToDisplay({
        x: 5000,
        y: -100,
        screenshotWidth: 2000,
        screenshotHeight: 1000,
        displayWidth: 1000,
        displayHeight: 500,
      }),
    ).toEqual({ x: 999, y: 0 });
  });
});

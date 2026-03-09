import type { ScreenshotPoint } from './types.js';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function mapPointFromScreenshotToDisplay(point: ScreenshotPoint): {
  x: number;
  y: number;
} {
  const scaledX = point.x * (point.displayWidth / point.screenshotWidth);
  const scaledY = point.y * (point.displayHeight / point.screenshotHeight);

  return {
    x: clamp(Math.round(scaledX), 0, Math.max(point.displayWidth - 1, 0)),
    y: clamp(Math.round(scaledY), 0, Math.max(point.displayHeight - 1, 0)),
  };
}

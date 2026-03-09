import { describe, expect, test, vi } from 'vitest';

import {
  createNativePointerDriver,
  fitSizeWithinBounds,
  prepareNativeDriverRuntime,
} from '../../src/macos/native-driver.js';

describe('fitSizeWithinBounds', () => {
  test('rescales large screenshots into the configured vision bounds', () => {
    expect(
      fitSizeWithinBounds({
        height: 1964,
        maxHeight: 900,
        maxWidth: 1440,
        width: 3024,
      }),
    ).toEqual({ height: 900, width: 1386 });
  });

  test('does not upscale images that are already within bounds', () => {
    expect(
      fitSizeWithinBounds({
        height: 800,
        maxHeight: 900,
        maxWidth: 1440,
        width: 1200,
      }),
    ).toEqual({ height: 800, width: 1200 });
  });
});

describe('prepareNativeDriverRuntime', () => {
  test('builds the binary and reads display info once per prepared runtime', async () => {
    const buildBinary = vi.fn(() => Promise.resolve('/tmp/mac-agent-driver'));
    const runBinary = vi.fn((binaryPath: string, args: string[]) => {
      expect(binaryPath).toBe('/tmp/mac-agent-driver');
      if (args[0] === 'display-info') {
        return Promise.resolve('{"displayWidth":1440,"displayHeight":900}');
      }

      return Promise.resolve('');
    });

    const runtime = await prepareNativeDriverRuntime(
      { forceRebuild: false },
      { buildBinary, runBinary },
    );

    expect(runtime).toEqual({
      binaryPath: '/tmp/mac-agent-driver',
      displayHeight: 900,
      displayWidth: 1440,
    });
    expect(buildBinary).toHaveBeenCalledTimes(1);
    expect(runBinary).toHaveBeenCalledTimes(1);
  });
});

describe('createNativePointerDriver', () => {
  test('uses the prepared binary path without rebuilding the runtime', async () => {
    const runBinary = vi.fn(() => Promise.resolve(''));
    const pointer = createNativePointerDriver(
      {
        binaryPath: '/tmp/mac-agent-driver',
        displayHeight: 900,
        displayWidth: 1440,
      },
      { runBinary },
    );

    await pointer.click({ x: 10, y: 20 }, 'left');
    await pointer.move({ x: 30, y: 40 });

    expect(runBinary).toHaveBeenNthCalledWith(1, '/tmp/mac-agent-driver', [
      'click',
      '--x',
      '10',
      '--y',
      '20',
      '--button',
      'left',
    ]);
    expect(runBinary).toHaveBeenNthCalledWith(2, '/tmp/mac-agent-driver', [
      'move',
      '--x',
      '30',
      '--y',
      '40',
    ]);
  });
});

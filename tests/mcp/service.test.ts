import { describe, expect, test, vi } from 'vitest';

import { createDesktopControlService } from '../../src/mcp/service.js';
import type { PointerDriver } from '../../src/macos/native-driver.js';

describe('createDesktopControlService', () => {
  test('captures screenshots with a prepared runtime and configured bounds', async () => {
    const prepareNativeDriverRuntime = vi.fn(() =>
      Promise.resolve({
        binaryPath: '/tmp/mac-agent-driver',
        displayHeight: 900,
        displayWidth: 1440,
      }),
    );
    const captureFullScreen = vi.fn(() =>
      Promise.resolve({
        displayHeight: 900,
        displayWidth: 1440,
        filePath: '/tmp/screenshot.png',
        imageBase64: 'abc',
        screenshotHeight: 800,
        screenshotWidth: 1200,
      }),
    );

    const service = createDesktopControlService(
      { stateRoot: '/tmp/mac-agent-mcp' },
      {
        captureFullScreen,
        createNativePointerDriver: vi.fn(),
        focusApplication: vi.fn(() => Promise.resolve()),
        getPermissionGuidance: vi.fn(() => []),
        keyboard: {
          pressKeys: vi.fn(() => Promise.resolve()),
          typeText: vi.fn(() => Promise.resolve()),
        },
        mkdir: vi.fn(() => Promise.resolve()),
        now: () => new Date('2026-03-10T00:00:00.000Z'),
        prepareNativeDriverRuntime,
      },
    );

    const result = await service.captureScreen({
      visionBounds: { maxHeight: 900, maxWidth: 1440 },
    });

    expect(result.filePath).toBe('/tmp/screenshot.png');
    expect(prepareNativeDriverRuntime).toHaveBeenCalledTimes(1);
    expect(captureFullScreen).toHaveBeenCalledWith(
      expect.stringContaining('/tmp/mac-agent-mcp/screenshots/'),
      {
        runtime: {
          binaryPath: '/tmp/mac-agent-driver',
          displayHeight: 900,
          displayWidth: 1440,
        },
        visionBounds: {
          maxHeight: 900,
          maxWidth: 1440,
        },
      },
    );
  });

  test('reuses the prepared pointer runtime when executing actions', async () => {
    const click = vi.fn(() => Promise.resolve());
    const doubleClick = vi.fn(() => Promise.resolve());
    const drag = vi.fn(() => Promise.resolve());
    const move = vi.fn(() => Promise.resolve());
    const scroll = vi.fn(() => Promise.resolve());
    const pointer: PointerDriver = {
      click,
      doubleClick,
      drag,
      move,
      scroll,
    };
    const createNativePointerDriver = vi.fn(() => pointer);
    const prepareNativeDriverRuntime = vi.fn(() =>
      Promise.resolve({
        binaryPath: '/tmp/mac-agent-driver',
        displayHeight: 900,
        displayWidth: 1440,
      }),
    );

    const service = createDesktopControlService(
      {},
      {
        captureFullScreen: vi.fn(),
        createNativePointerDriver,
        focusApplication: vi.fn(() => Promise.resolve()),
        getPermissionGuidance: vi.fn(() => []),
        keyboard: {
          pressKeys: vi.fn(() => Promise.resolve()),
          typeText: vi.fn(() => Promise.resolve()),
        },
        mkdir: vi.fn(() => Promise.resolve()),
        now: () => new Date('2026-03-10T00:00:00.000Z'),
        prepareNativeDriverRuntime,
      },
    );

    await service.executeActions({
      actions: [{ type: 'click', x: 100, y: 50 }],
      geometry: {
        displayHeight: 200,
        displayWidth: 400,
        screenshotHeight: 100,
        screenshotWidth: 200,
      },
    });
    await service.executeActions({
      actions: [{ type: 'move', x: 50, y: 25 }],
      geometry: {
        displayHeight: 200,
        displayWidth: 400,
        screenshotHeight: 100,
        screenshotWidth: 200,
      },
    });

    expect(prepareNativeDriverRuntime).toHaveBeenCalledTimes(1);
    expect(createNativePointerDriver).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledWith({ x: 200, y: 100 }, 'left');
    expect(move).toHaveBeenCalledWith({ x: 100, y: 50 });
  });
});

import { describe, expect, test, vi } from 'vitest';

import { createDesktopControlService } from '../../src/mcp/service.js';

describe('createDesktopControlService', () => {
  test('refreshes runtime metadata for each screenshot capture', async () => {
    const prepareNativeDriverRuntime = vi
      .fn()
      .mockResolvedValueOnce({
        binaryPath: '/tmp/mac-agent-driver',
        displayHeight: 900,
        displayWidth: 1440,
      })
      .mockResolvedValueOnce({
        binaryPath: '/tmp/mac-agent-driver',
        displayHeight: 1080,
        displayWidth: 1728,
      });
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

    const firstResult = await service.captureScreen({
      visionBounds: { maxHeight: 900, maxWidth: 1440 },
    });
    const secondResult = await service.captureScreen({
      visionBounds: { maxHeight: 900, maxWidth: 1440 },
    });

    expect(firstResult.filePath).toBe('/tmp/screenshot.png');
    expect(secondResult.filePath).toBe('/tmp/screenshot.png');
    expect(prepareNativeDriverRuntime).toHaveBeenCalledTimes(2);
    expect(captureFullScreen).toHaveBeenNthCalledWith(
      1,
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
    expect(captureFullScreen).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/tmp/mac-agent-mcp/screenshots/'),
      {
        runtime: {
          binaryPath: '/tmp/mac-agent-driver',
          displayHeight: 1080,
          displayWidth: 1728,
        },
        visionBounds: {
          maxHeight: 900,
          maxWidth: 1440,
        },
      },
    );
  });

  test('refreshes runtime metadata for each action execution', async () => {
    const click = vi.fn(() => Promise.resolve());
    const doubleClick = vi.fn(() => Promise.resolve());
    const drag = vi.fn(() => Promise.resolve());
    const move = vi.fn(() => Promise.resolve());
    const scroll = vi.fn(() => Promise.resolve());
    const createNativePointerDriver = vi
      .fn()
      .mockReturnValueOnce({
        click,
        doubleClick,
        drag,
        move,
        scroll,
      })
      .mockReturnValueOnce({
        click,
        doubleClick,
        drag,
        move,
        scroll,
      });
    const prepareNativeDriverRuntime = vi
      .fn()
      .mockResolvedValueOnce({
        binaryPath: '/tmp/mac-agent-driver',
        displayHeight: 900,
        displayWidth: 1440,
      })
      .mockResolvedValueOnce({
        binaryPath: '/tmp/mac-agent-driver',
        displayHeight: 1080,
        displayWidth: 1728,
      });

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

    expect(prepareNativeDriverRuntime).toHaveBeenCalledTimes(2);
    expect(createNativePointerDriver).toHaveBeenNthCalledWith(1, {
      binaryPath: '/tmp/mac-agent-driver',
      displayHeight: 900,
      displayWidth: 1440,
    });
    expect(createNativePointerDriver).toHaveBeenNthCalledWith(2, {
      binaryPath: '/tmp/mac-agent-driver',
      displayHeight: 1080,
      displayWidth: 1728,
    });
    expect(click).toHaveBeenCalledWith({ x: 200, y: 100 }, 'left');
    expect(move).toHaveBeenCalledWith({ x: 100, y: 50 });
  });
});

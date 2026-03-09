import { describe, expect, test, vi } from 'vitest';

import { executeComputerActions } from '../../src/computer/executor.js';

describe('executeComputerActions', () => {
  test('routes pointer actions through display-scaled coordinates', async () => {
    const pointer = {
      click: vi.fn(async () => {}),
      doubleClick: vi.fn(async () => {}),
      move: vi.fn(async () => {}),
      drag: vi.fn(async () => {}),
      scroll: vi.fn(async () => {}),
    };
    const keyboard = {
      typeText: vi.fn(async () => {}),
      pressKeys: vi.fn(async () => {}),
    };

    await executeComputerActions(
      [{ type: 'click', x: 1440, y: 900, button: 'left' }],
      {
        screenshotWidth: 2880,
        screenshotHeight: 1800,
        displayWidth: 1440,
        displayHeight: 900,
        pointer,
        keyboard,
        sleep: vi.fn(async () => {}),
      },
    );

    expect(pointer.click).toHaveBeenCalledWith({ x: 720, y: 450 }, 'left');
  });

  test('routes keypress actions to the keyboard driver', async () => {
    const pointer = {
      click: vi.fn(async () => {}),
      doubleClick: vi.fn(async () => {}),
      move: vi.fn(async () => {}),
      drag: vi.fn(async () => {}),
      scroll: vi.fn(async () => {}),
    };
    const keyboard = {
      typeText: vi.fn(async () => {}),
      pressKeys: vi.fn(async () => {}),
    };

    await executeComputerActions([{ type: 'keypress', keys: ['CMD+A'] }], {
      screenshotWidth: 100,
      screenshotHeight: 100,
      displayWidth: 100,
      displayHeight: 100,
      pointer,
      keyboard,
      sleep: vi.fn(async () => {}),
    });

    expect(keyboard.pressKeys).toHaveBeenCalledWith(['CMD+A']);
  });

  test('treats screenshot actions as no-ops for local execution', async () => {
    const pointer = {
      click: vi.fn(async () => {}),
      doubleClick: vi.fn(async () => {}),
      move: vi.fn(async () => {}),
      drag: vi.fn(async () => {}),
      scroll: vi.fn(async () => {}),
    };
    const keyboard = {
      typeText: vi.fn(async () => {}),
      pressKeys: vi.fn(async () => {}),
    };

    await executeComputerActions([{ type: 'screenshot' }], {
      screenshotWidth: 100,
      screenshotHeight: 100,
      displayWidth: 100,
      displayHeight: 100,
      pointer,
      keyboard,
      sleep: vi.fn(async () => {}),
    });

    expect(pointer.click).not.toHaveBeenCalled();
    expect(keyboard.typeText).not.toHaveBeenCalled();
  });
});

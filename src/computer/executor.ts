import type { MouseButton, PointerDriver } from '../macos/native-driver.js';
import { MacAgentError } from '../core/errors.js';
import { mapPointFromScreenshotToDisplay } from './coordinates.js';
import type { ComputerCallAction, ScreenshotGeometry } from './types.js';

export interface KeyboardDriver {
  typeText(text: string): Promise<void>;
  pressKeys(keys: string[]): Promise<void>;
}

export interface ComputerActionExecutorOptions extends ScreenshotGeometry {
  pointer: PointerDriver;
  keyboard: KeyboardDriver;
  sleep(ms: number): Promise<void>;
}

function readNumberField(action: ComputerCallAction, key: string): number {
  const value = action[key];
  if (typeof value !== 'number') {
    throw new MacAgentError(
      `Computer action ${action.type} is missing numeric field ${key}.`,
    );
  }

  return value;
}

function readStringField(action: ComputerCallAction, key: string): string {
  const value = action[key];
  if (typeof value !== 'string') {
    throw new MacAgentError(
      `Computer action ${action.type} is missing string field ${key}.`,
    );
  }

  return value;
}

function readStringArrayField(
  action: ComputerCallAction,
  key: string,
): string[] {
  const value = action[key];
  if (!Array.isArray(value)) {
    throw new MacAgentError(
      `Computer action ${action.type} is missing string[] field ${key}.`,
    );
  }

  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') {
      throw new MacAgentError(
        `Computer action ${action.type} is missing string[] field ${key}.`,
      );
    }

    result.push(item);
  }

  return result;
}

function normalizeMouseButton(rawValue: unknown): MouseButton {
  if (rawValue === 'right' || rawValue === 'center') {
    return rawValue;
  }

  return 'left';
}

function getDisplayPoint(
  action: ComputerCallAction,
  geometry: ScreenshotGeometry,
): { x: number; y: number } {
  return mapPointFromScreenshotToDisplay({
    x: readNumberField(action, 'x'),
    y: readNumberField(action, 'y'),
    ...geometry,
  });
}

function getWaitDurationMs(action: ComputerCallAction): number {
  const durationMs = action.durationMs;
  if (typeof durationMs === 'number') {
    return Math.max(durationMs, 0);
  }

  const seconds = action.seconds;
  if (typeof seconds === 'number') {
    return Math.max(seconds * 1000, 0);
  }

  return 2000;
}

export async function executeComputerActions(
  actions: ComputerCallAction[],
  options: ComputerActionExecutorOptions,
): Promise<void> {
  for (const action of actions) {
    switch (action.type) {
      case 'click': {
        await options.pointer.click(
          getDisplayPoint(action, options),
          normalizeMouseButton(action.button),
        );
        break;
      }
      case 'double_click':
      case 'doubleClick': {
        await options.pointer.doubleClick(
          getDisplayPoint(action, options),
          normalizeMouseButton(action.button),
        );
        break;
      }
      case 'move': {
        await options.pointer.move(getDisplayPoint(action, options));
        break;
      }
      case 'drag': {
        await options.pointer.drag(getDisplayPoint(action, options));
        break;
      }
      case 'scroll': {
        await options.pointer.scroll(getDisplayPoint(action, options), {
          x: typeof action.scrollX === 'number' ? action.scrollX : 0,
          y: typeof action.scrollY === 'number' ? action.scrollY : 0,
        });
        break;
      }
      case 'type': {
        await options.keyboard.typeText(readStringField(action, 'text'));
        break;
      }
      case 'keypress': {
        await options.keyboard.pressKeys(readStringArrayField(action, 'keys'));
        break;
      }
      case 'wait': {
        await options.sleep(getWaitDurationMs(action));
        break;
      }
      case 'screenshot': {
        break;
      }
      default:
        throw new MacAgentError(
          `Unsupported computer action type: ${action.type}`,
        );
    }
  }
}

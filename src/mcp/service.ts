import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  executeComputerActions,
  type KeyboardDriver,
} from '../computer/executor.js';
import type {
  ComputerCallAction,
  ScreenshotGeometry,
} from '../computer/types.js';
import { focusApplication } from '../macos/apps.js';
import { pressKeys, typeText } from '../macos/keyboard.js';
import {
  captureFullScreen,
  createNativePointerDriver,
  prepareNativeDriverRuntime,
  type PreparedNativeDriverRuntime,
  type ScreenCaptureResult,
  type VisionBounds,
} from '../macos/native-driver.js';
import {
  getPermissionGuidance,
  type PermissionGuidanceItem,
} from '../macos/permissions.js';

export interface DesktopControlService {
  captureScreen(options?: {
    visionBounds?: VisionBounds;
  }): Promise<ScreenCaptureResult>;
  executeActions(options: {
    actions: ComputerCallAction[];
    geometry: ScreenshotGeometry;
  }): Promise<void>;
  focusApp(appName: string): Promise<void>;
  getPermissions(): PermissionGuidanceItem[];
  pressKeys(keys: string[]): Promise<void>;
  typeText(text: string): Promise<void>;
}

interface DesktopControlServiceDeps {
  captureFullScreen: typeof captureFullScreen;
  createNativePointerDriver: typeof createNativePointerDriver;
  focusApplication: typeof focusApplication;
  getPermissionGuidance: typeof getPermissionGuidance;
  keyboard: KeyboardDriver;
  mkdir(path: string): Promise<void>;
  now(): Date;
  prepareNativeDriverRuntime: typeof prepareNativeDriverRuntime;
}

function createDefaultDeps(): DesktopControlServiceDeps {
  return {
    captureFullScreen,
    createNativePointerDriver,
    focusApplication,
    getPermissionGuidance,
    keyboard: {
      pressKeys,
      typeText,
    },
    async mkdir(path: string) {
      await mkdir(path, { recursive: true });
    },
    now() {
      return new Date();
    },
    prepareNativeDriverRuntime,
  };
}

function createScreenshotPath(rootDir: string, now: Date): string {
  const timestamp = now.toISOString().replaceAll(':', '-').replaceAll('.', '-');
  return resolve(rootDir, `${timestamp}-${randomUUID().slice(0, 8)}.png`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

export function createDesktopControlService(
  options: { stateRoot?: string } = {},
  deps: DesktopControlServiceDeps = createDefaultDeps(),
): DesktopControlService {
  const stateRoot = resolve(options.stateRoot ?? '.mac-agent/mcp');
  const screenshotsDir = resolve(stateRoot, 'screenshots');

  async function prepareCurrentRuntime(): Promise<PreparedNativeDriverRuntime> {
    return await deps.prepareNativeDriverRuntime();
  }

  return {
    async captureScreen(captureOptions = {}) {
      await deps.mkdir(screenshotsDir);
      const runtime = await prepareCurrentRuntime();
      const captureRequest: {
        runtime: PreparedNativeDriverRuntime;
        visionBounds?: VisionBounds;
      } = {
        runtime,
      };

      if (captureOptions.visionBounds !== undefined) {
        captureRequest.visionBounds = captureOptions.visionBounds;
      }

      return await deps.captureFullScreen(
        createScreenshotPath(screenshotsDir, deps.now()),
        captureRequest,
      );
    },
    async executeActions(executeOptions) {
      const pointer = deps.createNativePointerDriver(
        await prepareCurrentRuntime(),
      );
      await executeComputerActions(executeOptions.actions, {
        ...executeOptions.geometry,
        keyboard: deps.keyboard,
        pointer,
        sleep,
      });
    },
    async focusApp(appName) {
      await deps.focusApplication(appName);
    },
    getPermissions() {
      return deps.getPermissionGuidance();
    },
    async pressKeys(keys) {
      await deps.keyboard.pressKeys(keys);
    },
    async typeText(text) {
      await deps.keyboard.typeText(text);
    },
  };
}

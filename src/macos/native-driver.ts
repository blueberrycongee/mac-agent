import { mkdir, readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MacAgentError } from '../core/errors.js';
import type { ScreenshotGeometry } from '../computer/types.js';
import { runCommand } from './commands.js';
import { assertMacOS } from './platform.js';

export type MouseButton = 'left' | 'right' | 'center';

export interface DisplayPoint {
  x: number;
  y: number;
}

export interface ScreenCaptureResult extends ScreenshotGeometry {
  imageBase64: string;
  filePath: string;
}

export interface PointerDriver {
  click(point: DisplayPoint, button: MouseButton): Promise<void>;
  doubleClick(point: DisplayPoint, button: MouseButton): Promise<void>;
  move(point: DisplayPoint): Promise<void>;
  drag(point: DisplayPoint): Promise<void>;
  scroll(point: DisplayPoint, delta: { x: number; y: number }): Promise<void>;
}

type ScreenshotMetadata = ScreenshotGeometry;

function getPackageRoot(): string {
  return fileURLToPath(new URL('../../', import.meta.url));
}

export function getNativeDriverSourcePath(): string {
  return resolve(getPackageRoot(), 'native', 'mac_agent_driver.swift');
}

export function getNativeDriverBinaryPath(): string {
  return resolve(getPackageRoot(), '.mac-agent', 'bin', 'mac-agent-driver');
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function shouldRebuildNativeDriver(): Promise<boolean> {
  if (!(await pathExists(getNativeDriverBinaryPath()))) {
    return true;
  }

  const [sourceStat, binaryStat] = await Promise.all([
    stat(getNativeDriverSourcePath()),
    stat(getNativeDriverBinaryPath()),
  ]);

  return sourceStat.mtimeMs > binaryStat.mtimeMs;
}

export async function buildNativeDriver(force = false): Promise<string> {
  assertMacOS();

  const binaryPath = getNativeDriverBinaryPath();
  if (!force && !(await shouldRebuildNativeDriver())) {
    return binaryPath;
  }

  await mkdir(dirname(binaryPath), { recursive: true });
  await runCommand({
    command: 'xcrun',
    args: ['swiftc', getNativeDriverSourcePath(), '-o', binaryPath],
  });

  return binaryPath;
}

async function runNativeDriver(args: string[]): Promise<string> {
  const binaryPath = await buildNativeDriver();
  const result = await runCommand({
    command: binaryPath,
    args,
  });

  return result.stdout.trim();
}

function parseJsonRecord(
  raw: string,
  errorMessage: string,
): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // fall through
  }

  throw new MacAgentError(errorMessage);
}

function parseDisplayInfo(raw: string): {
  displayWidth: number;
  displayHeight: number;
} {
  const parsed = parseJsonRecord(
    raw,
    'Native driver returned invalid display metadata.',
  );
  const displayWidth = parsed.displayWidth;
  const displayHeight = parsed.displayHeight;

  if (typeof displayWidth !== 'number' || typeof displayHeight !== 'number') {
    throw new MacAgentError('Native driver returned invalid display metadata.');
  }

  return { displayWidth, displayHeight };
}

async function readScreenshotSize(
  path: string,
): Promise<{ width: number; height: number }> {
  const result = await runCommand({
    command: 'sips',
    args: ['-g', 'pixelWidth', '-g', 'pixelHeight', path],
  });

  const widthMatch = result.stdout.match(/pixelWidth:\s*(\d+)/);
  const heightMatch = result.stdout.match(/pixelHeight:\s*(\d+)/);

  if (widthMatch === null || heightMatch === null) {
    throw new MacAgentError('Unable to determine screenshot pixel dimensions.');
  }

  return {
    width: Number(widthMatch[1]),
    height: Number(heightMatch[1]),
  };
}

async function readScreenshotMetadata(
  path: string,
): Promise<ScreenshotMetadata> {
  const [{ width: screenshotWidth, height: screenshotHeight }, displayInfo] =
    await Promise.all([
      readScreenshotSize(path),
      runNativeDriver(['display-info']).then(parseDisplayInfo),
    ]);

  return {
    screenshotWidth,
    screenshotHeight,
    displayWidth: displayInfo.displayWidth,
    displayHeight: displayInfo.displayHeight,
  };
}

export async function captureFullScreen(
  outputPath: string,
): Promise<ScreenCaptureResult> {
  assertMacOS();

  await runCommand({
    command: 'screencapture',
    args: ['-x', outputPath],
  });

  const [metadata, imageBase64] = await Promise.all([
    readScreenshotMetadata(outputPath),
    readFile(outputPath).then((buffer) => buffer.toString('base64')),
  ]);

  return {
    ...metadata,
    imageBase64,
    filePath: outputPath,
  };
}

export function createNativePointerDriver(): PointerDriver {
  return {
    async click(point, button) {
      await runNativeDriver([
        'click',
        '--x',
        String(point.x),
        '--y',
        String(point.y),
        '--button',
        button,
      ]);
    },
    async doubleClick(point, button) {
      await runNativeDriver([
        'double-click',
        '--x',
        String(point.x),
        '--y',
        String(point.y),
        '--button',
        button,
      ]);
    },
    async move(point) {
      await runNativeDriver([
        'move',
        '--x',
        String(point.x),
        '--y',
        String(point.y),
      ]);
    },
    async drag(point) {
      await runNativeDriver([
        'drag',
        '--x',
        String(point.x),
        '--y',
        String(point.y),
      ]);
    },
    async scroll(point, delta) {
      await runNativeDriver([
        'scroll',
        '--x',
        String(point.x),
        '--y',
        String(point.y),
        '--delta-x',
        String(Math.round(delta.x)),
        '--delta-y',
        String(Math.round(delta.y)),
      ]);
    },
  };
}

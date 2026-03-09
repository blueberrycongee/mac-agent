import {
  mkdir,
  readFile as readFileNode,
  rename,
  stat,
  unlink,
} from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
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
  filePath: string;
  imageBase64: string;
  sourceHeight?: number;
  sourceWidth?: number;
}

export interface PointerDriver {
  click(point: DisplayPoint, button: MouseButton): Promise<void>;
  doubleClick(point: DisplayPoint, button: MouseButton): Promise<void>;
  move(point: DisplayPoint): Promise<void>;
  drag(point: DisplayPoint): Promise<void>;
  scroll(point: DisplayPoint, delta: { x: number; y: number }): Promise<void>;
}

export interface PreparedNativeDriverRuntime {
  binaryPath: string;
  displayHeight: number;
  displayWidth: number;
}

export interface VisionBounds {
  maxHeight: number;
  maxWidth: number;
}

interface Size {
  height: number;
  width: number;
}

interface NativeDriverDeps {
  buildBinary(force?: boolean): Promise<string>;
  readFile(path: string): Promise<Buffer>;
  runBinary(binaryPath: string, args: string[]): Promise<string>;
  runProcess(command: string, args: string[]): Promise<string>;
}

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

async function defaultRunBinary(
  binaryPath: string,
  args: string[],
): Promise<string> {
  const result = await runCommand({
    command: binaryPath,
    args,
  });

  return result.stdout.trim();
}

async function defaultRunProcess(
  command: string,
  args: string[],
): Promise<string> {
  const result = await runCommand({ command, args });
  return result.stdout;
}

const defaultDeps: NativeDriverDeps = {
  async buildBinary(force = false) {
    return await buildNativeDriver(force);
  },
  async readFile(path: string) {
    return await readFileNode(path);
  },
  async runBinary(binaryPath: string, args: string[]) {
    return await defaultRunBinary(binaryPath, args);
  },
  async runProcess(command: string, args: string[]) {
    return await defaultRunProcess(command, args);
  },
};

export function fitSizeWithinBounds(options: {
  height: number;
  maxHeight: number;
  maxWidth: number;
  width: number;
}): Size {
  if (
    options.width <= options.maxWidth &&
    options.height <= options.maxHeight
  ) {
    return { width: options.width, height: options.height };
  }

  const scale = Math.min(
    options.maxWidth / options.width,
    options.maxHeight / options.height,
  );

  return {
    width: Math.max(1, Math.round(options.width * scale)),
    height: Math.max(1, Math.round(options.height * scale)),
  };
}

export async function prepareNativeDriverRuntime(
  options: { forceRebuild?: boolean } = {},
  deps: Pick<NativeDriverDeps, 'buildBinary' | 'runBinary'> = defaultDeps,
): Promise<PreparedNativeDriverRuntime> {
  assertMacOS();

  const binaryPath = await deps.buildBinary(options.forceRebuild ?? false);
  const displayInfo = parseDisplayInfo(
    await deps.runBinary(binaryPath, ['display-info']),
  );

  return {
    binaryPath,
    displayWidth: displayInfo.displayWidth,
    displayHeight: displayInfo.displayHeight,
  };
}

async function readScreenshotSize(
  path: string,
  deps: Pick<NativeDriverDeps, 'runProcess'>,
): Promise<Size> {
  const stdout = await deps.runProcess('sips', [
    '-g',
    'pixelWidth',
    '-g',
    'pixelHeight',
    path,
  ]);

  const widthMatch = stdout.match(/pixelWidth:\s*(\d+)/);
  const heightMatch = stdout.match(/pixelHeight:\s*(\d+)/);

  if (widthMatch === null || heightMatch === null) {
    throw new MacAgentError('Unable to determine screenshot pixel dimensions.');
  }

  return {
    width: Number(widthMatch[1]),
    height: Number(heightMatch[1]),
  };
}

async function resizeScreenshotIfNeeded(options: {
  deps: Pick<NativeDriverDeps, 'runProcess'>;
  outputPath: string;
  size: Size;
  sourcePath: string;
  visionBounds?: VisionBounds;
}): Promise<Size> {
  const { deps, outputPath, size, sourcePath, visionBounds } = options;

  if (visionBounds === undefined) {
    await rename(sourcePath, outputPath);
    return size;
  }

  const targetSize = fitSizeWithinBounds({
    width: size.width,
    height: size.height,
    maxWidth: visionBounds.maxWidth,
    maxHeight: visionBounds.maxHeight,
  });

  if (targetSize.width === size.width && targetSize.height === size.height) {
    await rename(sourcePath, outputPath);
    return size;
  }

  await deps.runProcess('sips', [
    '-z',
    String(targetSize.height),
    String(targetSize.width),
    sourcePath,
    '--out',
    outputPath,
  ]);
  await unlink(sourcePath);
  return targetSize;
}

export async function captureFullScreen(
  outputPath: string,
  options: {
    runtime?: PreparedNativeDriverRuntime;
    visionBounds?: VisionBounds;
  } = {},
  deps: Pick<
    NativeDriverDeps,
    'buildBinary' | 'readFile' | 'runBinary' | 'runProcess'
  > = defaultDeps,
): Promise<ScreenCaptureResult> {
  assertMacOS();

  const preparedDeps = {
    buildBinary: (force = false) => deps.buildBinary(force),
    runBinary: (binaryPath: string, args: string[]) =>
      deps.runBinary(binaryPath, args),
  };

  const runtime =
    options.runtime ?? (await prepareNativeDriverRuntime({}, preparedDeps));
  const sourcePath = resolve(
    dirname(outputPath),
    `.raw-${basename(outputPath)}`,
  );

  await deps.runProcess('screencapture', ['-x', sourcePath]);

  const sourceSize = await readScreenshotSize(sourcePath, deps);
  const resizeOptions: {
    deps: Pick<NativeDriverDeps, 'runProcess'>;
    outputPath: string;
    size: Size;
    sourcePath: string;
    visionBounds?: VisionBounds;
  } = {
    deps,
    outputPath,
    size: sourceSize,
    sourcePath,
  };

  if (options.visionBounds !== undefined) {
    resizeOptions.visionBounds = options.visionBounds;
  }

  const finalSize = await resizeScreenshotIfNeeded(resizeOptions);
  const imageBase64 = (await deps.readFile(outputPath)).toString('base64');

  return {
    displayWidth: runtime.displayWidth,
    displayHeight: runtime.displayHeight,
    screenshotWidth: finalSize.width,
    screenshotHeight: finalSize.height,
    sourceWidth: sourceSize.width,
    sourceHeight: sourceSize.height,
    imageBase64,
    filePath: outputPath,
  };
}

export function createNativePointerDriver(
  runtime?: PreparedNativeDriverRuntime,
  deps: Partial<Pick<NativeDriverDeps, 'buildBinary' | 'runBinary'>> = {},
): PointerDriver {
  const resolvedDeps = {
    buildBinary: (force = false) =>
      (deps.buildBinary ?? defaultDeps.buildBinary)(force),
    runBinary: (binaryPath: string, args: string[]) =>
      (deps.runBinary ?? defaultDeps.runBinary)(binaryPath, args),
  };
  let runtimePromise: Promise<PreparedNativeDriverRuntime> | null =
    runtime === undefined ? null : Promise.resolve(runtime);

  async function getRuntime(): Promise<PreparedNativeDriverRuntime> {
    if (runtimePromise === null) {
      runtimePromise = prepareNativeDriverRuntime({}, resolvedDeps);
    }

    return await runtimePromise;
  }

  async function runPrepared(args: string[]): Promise<void> {
    const preparedRuntime = await getRuntime();
    await resolvedDeps.runBinary(preparedRuntime.binaryPath, args);
  }

  return {
    async click(point, button) {
      await runPrepared([
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
      await runPrepared([
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
      await runPrepared([
        'move',
        '--x',
        String(point.x),
        '--y',
        String(point.y),
      ]);
    },
    async drag(point) {
      await runPrepared([
        'drag',
        '--x',
        String(point.x),
        '--y',
        String(point.y),
      ]);
    },
    async scroll(point, delta) {
      await runPrepared([
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

import type { ScreenCaptureResult } from '../macos/native-driver.js';
import { MacAgentError } from '../core/errors.js';
import { requiresApproval } from './approval.js';
import type { StepMetrics } from './metrics.js';
import {
  buildComputerCallOutput,
  extractComputerCall,
  extractFinalOutputText,
} from './protocol.js';
import type { ComputerLoopClient } from './openai-client.js';
import type { ComputerCallAction, ComputerResponseLike } from './types.js';

export interface ComputerLoopHooks {
  onComputerCall?(options: {
    actions: ComputerCallAction[];
    callId: string;
    stepIndex: number;
  }): Promise<void>;
  onFinal?(options: { finalOutput: string; stepIndex: number }): Promise<void>;
  onResponse?(options: {
    response: ComputerResponseLike;
    stepIndex: number;
  }): Promise<void>;
  onScreenshot?(options: {
    screenshot: ScreenCaptureResult;
    stepIndex: number;
  }): Promise<void>;
  onStepMetrics?(options: { metrics: StepMetrics }): Promise<void>;
}

export interface ComputerLoopOptions {
  captureScreen: {
    capture(stepIndex: number): Promise<ScreenCaptureResult>;
  };
  client: ComputerLoopClient;
  confirmActions?: (
    actions: ComputerCallAction[],
    context: { callId: string; stepIndex: number },
  ) => Promise<void>;
  executeActions: (
    actions: ComputerCallAction[],
    screenshot: ScreenCaptureResult,
  ) => Promise<void>;
  hooks?: ComputerLoopHooks;
  maxSteps: number;
  model: string;
  now?: () => number;
  prompt: string;
  sleep?: (ms: number) => Promise<void>;
  uiSettleMs?: number;
}

function hasExecutableAction(actions: ComputerCallAction[]): boolean {
  return actions.some(
    (action) => action.type !== 'screenshot' && action.type !== 'wait',
  );
}

function hasNonScreenshotAction(actions: ComputerCallAction[]): boolean {
  return actions.some((action) => action.type !== 'screenshot');
}

function fallbackScreenshotContext(): ScreenCaptureResult {
  return {
    imageBase64: '',
    filePath: '',
    screenshotWidth: 1,
    screenshotHeight: 1,
    displayWidth: 1,
    displayHeight: 1,
  };
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function timed<T>(
  now: () => number,
  operation: () => Promise<T>,
): Promise<{ durationMs: number; value: T }> {
  const startedAt = now();
  const value = await operation();
  return {
    durationMs: now() - startedAt,
    value,
  };
}

export async function runComputerLoop(
  options: ComputerLoopOptions,
): Promise<{ finalOutput: string; steps: number }> {
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;
  const uiSettleMs = options.uiSettleMs ?? 0;

  const firstResponseResult = await timed(now, async () => {
    return await options.client.startTask({
      model: options.model,
      prompt: options.prompt,
    });
  });

  let response = firstResponseResult.value;
  let responseMs = firstResponseResult.durationMs;
  let latestScreenshot: ScreenCaptureResult | null = null;

  for (let stepIndex = 0; stepIndex < options.maxSteps; stepIndex += 1) {
    await options.hooks?.onResponse?.({ response, stepIndex });

    const computerCall = extractComputerCall(response);
    if (computerCall === null) {
      const finalOutput = extractFinalOutputText(response);
      await options.hooks?.onFinal?.({ finalOutput, stepIndex });
      return { finalOutput, steps: stepIndex };
    }

    await options.hooks?.onComputerCall?.({
      actions: computerCall.actions,
      callId: computerCall.callId,
      stepIndex,
    });

    const approvalRequired = requiresApproval(computerCall.actions);

    if (
      latestScreenshot === null &&
      hasExecutableAction(computerCall.actions)
    ) {
      throw new MacAgentError(
        'Model returned executable UI actions before the harness had screenshot context.',
      );
    }

    if (approvalRequired) {
      await options.confirmActions?.(computerCall.actions, {
        callId: computerCall.callId,
        stepIndex,
      });
    }

    let executeMs = 0;
    if (hasNonScreenshotAction(computerCall.actions)) {
      const executeResult = await timed(now, async () => {
        await options.executeActions(
          computerCall.actions,
          latestScreenshot ?? fallbackScreenshotContext(),
        );
      });
      executeMs = executeResult.durationMs;
    }

    let settleMs = 0;
    if (hasExecutableAction(computerCall.actions) && uiSettleMs > 0) {
      const settleResult = await timed(now, async () => {
        await sleep(uiSettleMs);
      });
      settleMs = settleResult.durationMs;
    }

    const captureResult = await timed(now, async () => {
      return await options.captureScreen.capture(stepIndex);
    });
    const screenshot = captureResult.value;
    latestScreenshot = screenshot;
    await options.hooks?.onScreenshot?.({ screenshot, stepIndex });
    const metrics: StepMetrics = {
      actionCount: computerCall.actions.length,
      approvalRequired,
      captureMs: captureResult.durationMs,
      executeMs,
      responseMs,
      screenshotHeight: screenshot.screenshotHeight,
      screenshotWidth: screenshot.screenshotWidth,
      settleMs,
      stepIndex,
    };

    if (typeof screenshot.sourceHeight === 'number') {
      metrics.sourceHeight = screenshot.sourceHeight;
    }
    if (typeof screenshot.sourceWidth === 'number') {
      metrics.sourceWidth = screenshot.sourceWidth;
    }

    await options.hooks?.onStepMetrics?.({ metrics });

    if (typeof response.id !== 'string' || response.id.length === 0) {
      throw new MacAgentError(
        'Computer loop response is missing a response id for follow-up turns.',
      );
    }
    const previousResponseId = response.id;

    const continueResult = await timed(now, async () => {
      return await options.client.continueTask({
        model: options.model,
        previousResponseId,
        input: buildComputerCallOutput({
          callId: computerCall.callId,
          imageBase64: screenshot.imageBase64,
        }),
      });
    });

    response = continueResult.value;
    responseMs = continueResult.durationMs;
  }

  throw new MacAgentError(
    `Computer loop exceeded max steps (${options.maxSteps}).`,
  );
}

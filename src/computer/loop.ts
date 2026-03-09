import { MacAgentError } from '../core/errors.js';
import { requiresApproval } from './approval.js';
import {
  buildComputerCallOutput,
  extractComputerCall,
  extractFinalOutputText,
} from './protocol.js';
import type { ScreenCaptureResult } from '../macos/native-driver.js';
import type { ComputerCallAction, ComputerResponseLike } from './types.js';
import type { ComputerLoopClient } from './openai-client.js';

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
  prompt: string;
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

export async function runComputerLoop(
  options: ComputerLoopOptions,
): Promise<{ finalOutput: string; steps: number }> {
  let response = await options.client.startTask({
    model: options.model,
    prompt: options.prompt,
  });
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

    if (
      latestScreenshot === null &&
      hasExecutableAction(computerCall.actions)
    ) {
      throw new MacAgentError(
        'Model returned executable UI actions before the harness had screenshot context.',
      );
    }

    if (requiresApproval(computerCall.actions)) {
      await options.confirmActions?.(computerCall.actions, {
        callId: computerCall.callId,
        stepIndex,
      });
    }

    if (hasNonScreenshotAction(computerCall.actions)) {
      await options.executeActions(
        computerCall.actions,
        latestScreenshot ?? fallbackScreenshotContext(),
      );
    }

    const screenshot = await options.captureScreen.capture(stepIndex);
    latestScreenshot = screenshot;
    await options.hooks?.onScreenshot?.({ screenshot, stepIndex });

    if (typeof response.id !== 'string' || response.id.length === 0) {
      throw new MacAgentError(
        'Computer loop response is missing a response id for follow-up turns.',
      );
    }

    response = await options.client.continueTask({
      model: options.model,
      previousResponseId: response.id,
      input: buildComputerCallOutput({
        callId: computerCall.callId,
        imageBase64: screenshot.imageBase64,
      }),
    });
  }

  throw new MacAgentError(
    `Computer loop exceeded max steps (${options.maxSteps}).`,
  );
}

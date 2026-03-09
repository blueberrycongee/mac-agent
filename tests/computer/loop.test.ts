import { describe, expect, test, vi } from 'vitest';

import { runComputerLoop } from '../../src/computer/loop.js';
import type { ComputerResponseLike } from '../../src/computer/types.js';

function createCapture(stepIndex: number) {
  return {
    imageBase64: `image-${stepIndex}`,
    filePath: `/tmp/step-${stepIndex}.png`,
    screenshotWidth: 200,
    screenshotHeight: 100,
    displayWidth: 100,
    displayHeight: 50,
  };
}

describe('runComputerLoop', () => {
  test('handles screenshot-first responses and returns final output', async () => {
    const startTask = vi.fn(
      (): Promise<ComputerResponseLike> =>
        Promise.resolve({
          id: 'resp_1',
          output: [
            {
              type: 'computer_call',
              call_id: 'call_1',
              status: 'completed',
              actions: [{ type: 'screenshot' }],
            },
          ],
        }),
    );
    const continueTask = vi.fn(
      (): Promise<ComputerResponseLike> =>
        Promise.resolve({
          id: 'resp_2',
          output_text: 'Finished safely.',
          output: [],
        }),
    );
    const capture = vi.fn((stepIndex: number) =>
      Promise.resolve(createCapture(stepIndex)),
    );
    const execute = vi.fn(() => Promise.resolve());
    const confirm = vi.fn(() => Promise.resolve());

    const result = await runComputerLoop({
      model: 'gpt-5.4',
      prompt: 'Inspect the current screen.',
      maxSteps: 5,
      client: { startTask, continueTask },
      captureScreen: { capture },
      executeActions: execute,
      confirmActions: confirm,
    });

    expect(result.finalOutput).toBe('Finished safely.');
    expect(capture).toHaveBeenCalledTimes(1);
    expect(execute).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
    expect(continueTask).toHaveBeenCalledWith({
      model: 'gpt-5.4',
      previousResponseId: 'resp_1',
      input: {
        type: 'computer_call_output',
        call_id: 'call_1',
        output: {
          type: 'computer_screenshot',
          image_url: 'data:image/png;base64,image-0',
          detail: 'original',
        },
      },
    });
  });

  test('executes a later action batch using the last screenshot geometry', async () => {
    const responses: ComputerResponseLike[] = [
      {
        id: 'resp_1',
        output: [
          {
            type: 'computer_call',
            call_id: 'call_1',
            status: 'completed',
            actions: [{ type: 'screenshot' }],
          },
        ],
      },
      {
        id: 'resp_2',
        output: [
          {
            type: 'computer_call',
            call_id: 'call_2',
            status: 'completed',
            actions: [{ type: 'click', x: 100, y: 50, button: 'left' }],
          },
        ],
      },
      {
        id: 'resp_3',
        output_text: 'Done',
        output: [],
      },
    ];

    const startTask = vi.fn(() => Promise.resolve(responses[0]!));
    const continueTask = vi
      .fn<
        (options: {
          model: string;
          previousResponseId: string;
          input: unknown;
        }) => Promise<ComputerResponseLike>
      >()
      .mockImplementationOnce(() => Promise.resolve(responses[1]!))
      .mockImplementationOnce(() => Promise.resolve(responses[2]!));
    const capture = vi.fn((stepIndex: number) =>
      Promise.resolve(createCapture(stepIndex)),
    );
    const execute = vi.fn(() => Promise.resolve());
    const confirm = vi.fn(() => Promise.resolve());

    await runComputerLoop({
      model: 'gpt-5.4',
      prompt: 'Click the center of the screen.',
      maxSteps: 5,
      client: { startTask, continueTask },
      captureScreen: { capture },
      executeActions: execute,
      confirmActions: confirm,
    });

    expect(confirm).toHaveBeenCalledWith(
      [{ type: 'click', x: 100, y: 50, button: 'left' }],
      { callId: 'call_2', stepIndex: 1 },
    );
    expect(execute).toHaveBeenCalledWith(
      [{ type: 'click', x: 100, y: 50, button: 'left' }],
      createCapture(0),
    );
    expect(capture).toHaveBeenCalledTimes(2);
  });

  test('throws when the loop exceeds the configured max step count', async () => {
    const startTask = vi.fn(
      (): Promise<ComputerResponseLike> =>
        Promise.resolve({
          id: 'resp_1',
          output: [
            {
              type: 'computer_call',
              call_id: 'call_1',
              status: 'completed',
              actions: [{ type: 'screenshot' }],
            },
          ],
        }),
    );
    const continueTask = vi.fn(
      (): Promise<ComputerResponseLike> =>
        Promise.resolve({
          id: 'resp_2',
          output: [
            {
              type: 'computer_call',
              call_id: 'call_2',
              status: 'completed',
              actions: [{ type: 'screenshot' }],
            },
          ],
        }),
    );

    await expect(
      runComputerLoop({
        model: 'gpt-5.4',
        prompt: 'Keep looking.',
        maxSteps: 1,
        client: { startTask, continueTask },
        captureScreen: {
          capture: vi.fn(() => Promise.resolve(createCapture(0))),
        },
        executeActions: vi.fn(() => Promise.resolve()),
        confirmActions: vi.fn(() => Promise.resolve()),
      }),
    ).rejects.toThrow('Computer loop exceeded max steps (1).');
  });
});

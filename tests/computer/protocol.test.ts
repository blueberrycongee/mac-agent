import { describe, expect, test } from 'vitest';

import {
  buildComputerCallOutput,
  extractComputerCall,
  extractFinalOutputText,
} from '../../src/computer/protocol.js';

describe('extractComputerCall', () => {
  test('returns the first computer_call from output items', () => {
    const response = {
      id: 'resp_123',
      output: [
        {
          type: 'message',
          content: [{ type: 'output_text', text: 'thinking' }],
        },
        {
          type: 'computer_call',
          call_id: 'call_123',
          status: 'completed',
          actions: [{ type: 'screenshot' }],
        },
      ],
    };

    expect(extractComputerCall(response)).toEqual({
      callId: 'call_123',
      status: 'completed',
      actions: [{ type: 'screenshot' }],
    });
  });

  test('returns null when there is no computer_call', () => {
    expect(
      extractComputerCall({
        id: 'resp_456',
        output: [
          { type: 'message', content: [{ type: 'output_text', text: 'done' }] },
        ],
      }),
    ).toBeNull();
  });
});

describe('extractFinalOutputText', () => {
  test('prefers output_text when present', () => {
    expect(
      extractFinalOutputText({
        id: 'resp_789',
        output_text: 'Final answer',
        output: [],
      }),
    ).toBe('Final answer');
  });

  test('falls back to message content text', () => {
    expect(
      extractFinalOutputText({
        id: 'resp_999',
        output: [
          {
            type: 'message',
            content: [
              { type: 'output_text', text: 'First line' },
              { type: 'output_text', text: 'Second line' },
            ],
          },
        ],
      }),
    ).toBe('First line\nSecond line');
  });
});

describe('buildComputerCallOutput', () => {
  test('builds the screenshot payload expected by the OpenAI computer loop', () => {
    expect(
      buildComputerCallOutput({
        callId: 'call_abc',
        imageBase64: 'ZmFrZQ==',
      }),
    ).toEqual({
      type: 'computer_call_output',
      call_id: 'call_abc',
      output: {
        type: 'computer_screenshot',
        image_url: 'data:image/png;base64,ZmFrZQ==',
        detail: 'original',
      },
    });
  });
});

import type {
  ComputerCall,
  ComputerCallAction,
  ComputerResponseLike,
  ComputerScreenshotOutput,
} from './types.js';

interface OutputTextContentItem {
  type: 'output_text';
  text: string;
}

interface MessageOutputItem {
  type: 'message';
  content?: unknown[];
}

interface ComputerCallOutputItem {
  type: 'computer_call';
  call_id: string;
  status?: string;
  actions?: unknown[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isComputerCallAction(value: unknown): value is ComputerCallAction {
  return isRecord(value) && typeof value.type === 'string';
}

function isComputerCallOutputItem(
  value: unknown,
): value is ComputerCallOutputItem {
  return (
    isRecord(value) &&
    value.type === 'computer_call' &&
    typeof value.call_id === 'string' &&
    (value.actions === undefined || Array.isArray(value.actions))
  );
}

function isMessageOutputItem(value: unknown): value is MessageOutputItem {
  return isRecord(value) && value.type === 'message';
}

function isOutputTextContentItem(
  value: unknown,
): value is OutputTextContentItem {
  return (
    isRecord(value) &&
    value.type === 'output_text' &&
    typeof value.text === 'string'
  );
}

export function extractComputerCall(
  response: ComputerResponseLike,
): ComputerCall | null {
  for (const item of response.output ?? []) {
    if (!isComputerCallOutputItem(item)) {
      continue;
    }

    const call: ComputerCall = {
      callId: item.call_id,
      actions: (item.actions ?? []).filter(isComputerCallAction),
    };

    if (typeof item.status === 'string') {
      call.status = item.status;
    }

    return call;
  }

  return null;
}

export function extractFinalOutputText(response: ComputerResponseLike): string {
  if (
    typeof response.output_text === 'string' &&
    response.output_text.length > 0
  ) {
    return response.output_text;
  }

  const lines: string[] = [];

  for (const item of response.output ?? []) {
    if (!isMessageOutputItem(item)) {
      continue;
    }

    for (const contentItem of item.content ?? []) {
      if (isOutputTextContentItem(contentItem)) {
        lines.push(contentItem.text);
      }
    }
  }

  return lines.join('\n');
}

export function buildComputerCallOutput(options: {
  callId: string;
  imageBase64: string;
}): ComputerScreenshotOutput {
  return {
    type: 'computer_call_output',
    call_id: options.callId,
    output: {
      type: 'computer_screenshot',
      image_url: `data:image/png;base64,${options.imageBase64}`,
      detail: 'original',
    },
  };
}

import OpenAI from 'openai';

import { MacAgentError } from '../core/errors.js';
import type {
  ComputerResponseLike,
  ComputerScreenshotOutput,
} from './types.js';

export interface ComputerLoopClient {
  continueTask(options: {
    input: ComputerScreenshotOutput;
    model: string;
    previousResponseId: string;
  }): Promise<ComputerResponseLike>;
  startTask(options: {
    model: string;
    prompt: string;
  }): Promise<ComputerResponseLike>;
}

class OpenAIComputerClient implements ComputerLoopClient {
  constructor(private readonly client: OpenAI) {}

  async startTask(options: {
    model: string;
    prompt: string;
  }): Promise<ComputerResponseLike> {
    return await this.client.responses.create({
      model: options.model,
      tools: [{ type: 'computer' }],
      input: options.prompt,
    });
  }

  async continueTask(options: {
    input: ComputerScreenshotOutput;
    model: string;
    previousResponseId: string;
  }): Promise<ComputerResponseLike> {
    return await this.client.responses.create({
      model: options.model,
      tools: [{ type: 'computer' }],
      previous_response_id: options.previousResponseId,
      input: [options.input],
    });
  }
}

export function createOpenAIComputerClient(
  apiKey: string | undefined = process.env.OPENAI_API_KEY,
): ComputerLoopClient {
  if (apiKey === undefined || apiKey.trim().length === 0) {
    throw new MacAgentError(
      'OPENAI_API_KEY is required to run the computer loop.',
    );
  }

  return new OpenAIComputerClient(
    new OpenAI({
      apiKey,
    }),
  );
}

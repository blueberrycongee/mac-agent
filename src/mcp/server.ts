import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import type { ComputerCallAction } from '../computer/types.js';
import type { VisionBounds } from '../macos/native-driver.js';
import {
  createDesktopControlService,
  type DesktopControlService,
} from './service.js';

const screenshotInputSchema = z
  .object({
    maxHeight: z.number().int().positive().optional(),
    maxWidth: z.number().int().positive().optional(),
  })
  .strict();

const focusAppInputSchema = z
  .object({
    name: z.string().min(1),
  })
  .strict();

const typeTextInputSchema = z
  .object({
    text: z.string(),
  })
  .strict();

const pressKeysInputSchema = z
  .object({
    keys: z.array(z.string().min(1)).min(1),
  })
  .strict();

const executeActionsInputSchema = z
  .object({
    actions: z.array(z.object({ type: z.string() }).passthrough()).min(1),
    displayHeight: z.number().int().positive(),
    displayWidth: z.number().int().positive(),
    screenshotHeight: z.number().int().positive(),
    screenshotWidth: z.number().int().positive(),
  })
  .strict();

function textResult(
  text: string,
  structuredContent?: Record<string, unknown>,
): {
  content: Array<{ text: string; type: 'text' }>;
  structuredContent?: Record<string, unknown>;
} {
  const result: {
    content: Array<{ text: string; type: 'text' }>;
    structuredContent?: Record<string, unknown>;
  } = {
    content: [{ type: 'text', text }],
  };

  if (structuredContent !== undefined) {
    result.structuredContent = structuredContent;
  }

  return result;
}

function errorResult(error: unknown): {
  content: Array<{ text: string; type: 'text' }>;
  isError: true;
} {
  const message = error instanceof Error ? error.message : String(error);

  return {
    content: [{ type: 'text', text: `Error: ${message}` }],
    isError: true,
  };
}

function buildVisionBounds(input: {
  maxHeight: number | undefined;
  maxWidth: number | undefined;
}): VisionBounds | undefined {
  if (
    typeof input.maxWidth !== 'number' &&
    typeof input.maxHeight !== 'number'
  ) {
    return undefined;
  }

  return {
    maxHeight: input.maxHeight ?? 900,
    maxWidth: input.maxWidth ?? 1440,
  };
}

function buildScreenshotSummary(options: {
  displayHeight: number;
  displayWidth: number;
  filePath: string;
  screenshotHeight: number;
  screenshotWidth: number;
  sourceHeight?: number;
  sourceWidth?: number;
}): string {
  return [
    `Screenshot captured at ${options.filePath}.`,
    `Visible image: ${options.screenshotWidth}x${options.screenshotHeight}.`,
    `Display: ${options.displayWidth}x${options.displayHeight}.`,
    typeof options.sourceWidth === 'number' &&
    typeof options.sourceHeight === 'number'
      ? `Source image: ${options.sourceWidth}x${options.sourceHeight}.`
      : null,
  ]
    .filter((line): line is string => line !== null)
    .join(' ');
}

export function createMacAgentMcpServer(
  options: {
    service?: DesktopControlService;
    stateRoot?: string;
  } = {},
): McpServer {
  const service = options.service ?? createDesktopControlService(
    options.stateRoot === undefined ? {} : { stateRoot: options.stateRoot },
  );
  const server = new McpServer(
    {
      name: 'mac-agent',
      version: '0.1.0',
    },
    {
      instructions: [
        'Use these tools for local macOS desktop control.',
        'Capture a screenshot before pointer actions when the UI state may have changed.',
        'When clicking or dragging, always use geometry from the latest screenshot.',
        'Prefer focused, bounded actions over speculative interaction.',
      ].join(' '),
    },
  );

  server.registerTool(
    'get_permissions',
    {
      title: 'Get Permissions',
      description:
        'Describe the macOS permissions required for desktop control.',
    },
    () => {
      try {
        const permissions = service.getPermissions();

        return textResult(
          permissions.map((item) => `- ${item.name}: ${item.why}`).join('\n'),
          { permissions },
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    'focus_app',
    {
      title: 'Focus App',
      description: 'Launch or focus a macOS application by name.',
      inputSchema: focusAppInputSchema,
    },
    async ({ name }) => {
      try {
        await service.focusApp(name);
        return textResult(`Focused ${name}.`, { appName: name });
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    'capture_screen',
    {
      title: 'Capture Screen',
      description:
        'Capture the current macOS desktop screenshot and return image data plus geometry.',
      inputSchema: screenshotInputSchema,
    },
    async (input) => {
      try {
        const visionBounds = buildVisionBounds({
          maxHeight: input.maxHeight,
          maxWidth: input.maxWidth,
        });
        const screenshot = await service.captureScreen({
          ...(visionBounds === undefined ? {} : { visionBounds }),
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: buildScreenshotSummary(screenshot),
            },
            {
              type: 'image' as const,
              data: screenshot.imageBase64,
              mimeType: 'image/png',
            },
          ],
          structuredContent: {
            displayHeight: screenshot.displayHeight,
            displayWidth: screenshot.displayWidth,
            filePath: screenshot.filePath,
            screenshotHeight: screenshot.screenshotHeight,
            screenshotWidth: screenshot.screenshotWidth,
            sourceHeight: screenshot.sourceHeight,
            sourceWidth: screenshot.sourceWidth,
          },
        };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    'type_text',
    {
      title: 'Type Text',
      description: 'Type literal text into the currently focused macOS UI.',
      inputSchema: typeTextInputSchema,
    },
    async ({ text }) => {
      try {
        await service.typeText(text);
        return textResult(`Typed ${JSON.stringify(text)}.`, { text });
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    'press_keys',
    {
      title: 'Press Keys',
      description:
        'Press one or more macOS key combinations such as CMD+A or SHIFT+TAB.',
      inputSchema: pressKeysInputSchema,
    },
    async ({ keys }) => {
      try {
        await service.pressKeys(keys);
        return textResult(`Pressed keys: ${keys.join(', ')}.`, { keys });
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    'execute_computer_actions',
    {
      title: 'Execute Computer Actions',
      description:
        'Execute low-level computer-use actions against the local macOS desktop using the latest screenshot geometry.',
      inputSchema: executeActionsInputSchema,
    },
    async (input) => {
      try {
        await service.executeActions({
          actions: input.actions as ComputerCallAction[],
          geometry: {
            displayHeight: input.displayHeight,
            displayWidth: input.displayWidth,
            screenshotHeight: input.screenshotHeight,
            screenshotWidth: input.screenshotWidth,
          },
        });

        return textResult(
          `Executed ${input.actions.length} action${input.actions.length === 1 ? '' : 's'}.`,
          { actionCount: input.actions.length },
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  return server;
}

export async function startMacAgentMcpServer(
  options: { stateRoot?: string } = {},
): Promise<void> {
  const server = createMacAgentMcpServer(options);
  const transport = new StdioServerTransport();

  const closeServer = async () => {
    await server.close();
    process.exit(0);
  };

  process.once('SIGINT', () => {
    void closeServer();
  });
  process.once('SIGTERM', () => {
    void closeServer();
  });

  await server.connect(transport);
}

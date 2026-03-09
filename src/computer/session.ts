import { appendFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

export interface ComputerSession {
  eventsPath: string;
  id: string;
  rootDir: string;
  screenshotsDir: string;
}

function createSessionId(now: Date = new Date()): string {
  const datePart = now.toISOString().replaceAll(':', '-').replaceAll('.', '-');
  return `${datePart}-${randomUUID().slice(0, 8)}`;
}

export async function createComputerSession(
  sessionRoot: string,
): Promise<ComputerSession> {
  const id = createSessionId();
  const rootDir = resolve(sessionRoot, id);
  const screenshotsDir = resolve(rootDir, 'screenshots');
  const eventsPath = resolve(rootDir, 'events.jsonl');

  await mkdir(screenshotsDir, { recursive: true });

  return {
    eventsPath,
    id,
    rootDir,
    screenshotsDir,
  };
}

export function getSessionScreenshotPath(
  session: ComputerSession,
  stepIndex: number,
): string {
  return resolve(
    session.screenshotsDir,
    `step-${String(stepIndex).padStart(4, '0')}.png`,
  );
}

export async function appendSessionEvent(
  session: ComputerSession,
  event: Record<string, unknown>,
): Promise<void> {
  await appendFile(
    session.eventsPath,
    `${JSON.stringify({ ...event, timestamp: new Date().toISOString() })}\n`,
    'utf8',
  );
}

export class MacAgentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MacAgentError';
  }
}

export class UnsupportedPlatformError extends MacAgentError {
  constructor(platform: NodeJS.Platform) {
    super(
      `mac-agent currently supports macOS only. Received platform: ${platform}`,
    );
    this.name = 'UnsupportedPlatformError';
  }
}

export class CommandExecutionError extends MacAgentError {
  readonly command: string;

  readonly exitCode: number | null;

  readonly stderr: string;

  constructor(options: {
    command: string;
    exitCode: number | null;
    stderr: string;
  }) {
    const detail = options.stderr.trim();
    const suffix = detail.length > 0 ? ` ${detail}` : '';
    super(`Command failed: ${options.command}.${suffix}`);
    this.name = 'CommandExecutionError';
    this.command = options.command;
    this.exitCode = options.exitCode;
    this.stderr = options.stderr;
  }
}

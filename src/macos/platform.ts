import { UnsupportedPlatformError } from '../core/errors.js';

export function assertMacOS(platform: NodeJS.Platform = process.platform): void {
  if (platform !== 'darwin') {
    throw new UnsupportedPlatformError(platform);
  }
}

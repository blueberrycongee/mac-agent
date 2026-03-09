export {
  CommandExecutionError,
  MacAgentError,
  UnsupportedPlatformError,
} from './core/errors.js';
export { err, ok, type Result } from './core/result.js';
export {
  buildActivateAppleScript,
  createFocusAppExecutionPlan,
  focusApplication,
} from './macos/apps.js';
export {
  formatPermissionGuidance,
  getPermissionGuidance,
} from './macos/permissions.js';
export { assertMacOS } from './macos/platform.js';

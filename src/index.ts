export { createApprovalGate, requiresApproval } from './computer/approval.js';
export {
  executeComputerActions,
  type KeyboardDriver,
} from './computer/executor.js';
export {
  runComputerLoop,
  type ComputerLoopHooks,
  type ComputerLoopOptions,
} from './computer/loop.js';
export {
  createStepMetricsEvent,
  type StepMetrics,
} from './computer/metrics.js';
export {
  createOpenAIComputerClient,
  type ComputerLoopClient,
} from './computer/openai-client.js';
export { buildComputerRunPrompt } from './computer/prompt-policy.js';
export {
  buildComputerCallOutput,
  extractComputerCall,
  extractFinalOutputText,
} from './computer/protocol.js';
export {
  createRunProfile,
  defaultRunProfile,
  type RunProfile,
} from './computer/run-profile.js';
export {
  appendSessionEvent,
  createComputerSession,
  getSessionScreenshotPath,
  type ComputerSession,
} from './computer/session.js';
export {
  type ComputerCall,
  type ComputerCallAction,
  type ComputerResponseLike,
  type ComputerScreenshotOutput,
  type ScreenshotGeometry,
} from './computer/types.js';
export {
  CommandExecutionError,
  MacAgentError,
  UnsupportedPlatformError,
} from './core/errors.js';
export { err, ok, type Result } from './core/result.js';
export {
  createMacAgentMcpServer,
  startMacAgentMcpServer,
} from './mcp/server.js';
export {
  createDesktopControlService,
  type DesktopControlService,
} from './mcp/service.js';
export {
  buildActivateAppleScript,
  createFocusAppExecutionPlan,
  focusApplication,
} from './macos/apps.js';
export {
  buildAppleScriptForKeypress,
  buildAppleScriptForType,
  pressKeys,
  typeText,
} from './macos/keyboard.js';
export {
  buildNativeDriver,
  captureFullScreen,
  createNativePointerDriver,
  fitSizeWithinBounds,
  getNativeDriverBinaryPath,
  getNativeDriverSourcePath,
  prepareNativeDriverRuntime,
  type DisplayPoint,
  type MouseButton,
  type PointerDriver,
  type PreparedNativeDriverRuntime,
  type ScreenCaptureResult,
  type VisionBounds,
} from './macos/native-driver.js';
export {
  formatPermissionGuidance,
  getPermissionGuidance,
} from './macos/permissions.js';
export { assertMacOS } from './macos/platform.js';

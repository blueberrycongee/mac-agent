export interface StepMetrics {
  actionCount: number;
  approvalRequired: boolean;
  captureMs: number;
  executeMs: number;
  responseMs: number;
  screenshotHeight?: number;
  screenshotWidth?: number;
  settleMs: number;
  sourceHeight?: number;
  sourceWidth?: number;
  stepIndex: number;
}

export function createStepMetricsEvent(
  metrics: StepMetrics,
): Record<string, unknown> {
  return {
    type: 'step_metrics',
    stepIndex: metrics.stepIndex,
    responseMs: metrics.responseMs,
    executeMs: metrics.executeMs,
    captureMs: metrics.captureMs,
    settleMs: metrics.settleMs,
    actionCount: metrics.actionCount,
    approvalRequired: metrics.approvalRequired,
    screenshotWidth: metrics.screenshotWidth,
    screenshotHeight: metrics.screenshotHeight,
    sourceWidth: metrics.sourceWidth,
    sourceHeight: metrics.sourceHeight,
  };
}

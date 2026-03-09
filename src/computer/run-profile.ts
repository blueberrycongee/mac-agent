export interface RunProfile {
  uiSettleMs: number;
  visionHeight: number;
  visionWidth: number;
}

export const defaultRunProfile: RunProfile = {
  uiSettleMs: 150,
  visionHeight: 900,
  visionWidth: 1440,
};

export function createRunProfile(
  overrides: Partial<RunProfile> = {},
): RunProfile {
  return {
    ...defaultRunProfile,
    ...overrides,
  };
}

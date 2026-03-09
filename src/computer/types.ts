export interface ComputerResponseLike {
  id?: string;
  output_text?: string;
  output?: unknown[];
}

export interface ComputerCallAction {
  type: string;
  [key: string]: unknown;
}

export interface ComputerCall {
  callId: string;
  status?: string;
  actions: ComputerCallAction[];
}

export interface ComputerScreenshotOutput {
  type: 'computer_call_output';
  call_id: string;
  output: {
    type: 'computer_screenshot';
    image_url: string;
    detail: 'original';
  };
}

export interface ScreenshotGeometry {
  screenshotWidth: number;
  screenshotHeight: number;
  displayWidth: number;
  displayHeight: number;
}

export interface ScreenshotPoint extends ScreenshotGeometry {
  x: number;
  y: number;
}

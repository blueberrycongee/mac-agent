export function buildComputerRunPrompt(task: string): string {
  return [
    'Use the computer tool for UI interaction.',
    'If the current UI state is uncertain, request a screenshot first before taking executable actions.',
    'When the next steps are clear, batch obvious consecutive actions into a single turn.',
    'Avoid unnecessary wait actions and exploratory clicks.',
    'stop as soon as the task is complete.',
    '',
    'Task:',
    task,
  ].join('\n');
}

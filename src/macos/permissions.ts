export interface PermissionGuidanceItem {
  name: string;
  why: string;
}

export function getPermissionGuidance(): PermissionGuidanceItem[] {
  return [
    {
      name: 'Accessibility',
      why: 'Allows mac-agent to inspect and control UI elements in desktop apps.',
    },
    {
      name: 'Screen Recording',
      why: 'Allows mac-agent to capture screenshots for visual grounding and fallback control.',
    },
    {
      name: 'Automation',
      why: 'Allows mac-agent to drive scriptable apps such as Finder, Calendar, or System Events.',
    },
  ];
}

export function formatPermissionGuidance(): string {
  return getPermissionGuidance()
    .map((item) => `- ${item.name}: ${item.why}`)
    .join('\n');
}

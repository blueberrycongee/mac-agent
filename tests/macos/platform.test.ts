import { describe, expect, test } from 'vitest';

import { assertMacOS } from '../../src/macos/platform.js';

describe('assertMacOS', () => {
  test('does not throw on darwin', () => {
    expect(() => assertMacOS('darwin')).not.toThrow();
  });

  test('throws on unsupported platforms', () => {
    expect(() => assertMacOS('linux')).toThrow(
      'mac-agent currently supports macOS only',
    );
  });
});

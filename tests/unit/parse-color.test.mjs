import { describe, it, expect } from 'vitest';
import { parseColor } from '../helpers/extract-script.mjs';

describe('parseColor', () => {
  it('prepends # to 6-char hex', () => {
    expect(parseColor('ff0000')).toBe('#ff0000');
  });

  it('prepends # to 3-char hex', () => {
    expect(parseColor('f00')).toBe('#f00');
  });

  it('resolves theme name "dark" with type "bg"', () => {
    expect(parseColor('dark', 'bg')).toBe('#1a1a2e');
  });

  it('resolves theme name "dark" with type "fg"', () => {
    expect(parseColor('dark', 'fg')).toBe('#ffffff');
  });

  it('resolves theme name "neon" with default type as bg', () => {
    expect(parseColor('neon')).toBe('#0a0a0a');
  });

  it('returns null for null', () => {
    expect(parseColor(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseColor('')).toBeNull();
  });
});

import { describe, it, expect } from 'vitest';
import { truncate } from '../helpers/extract-script.mjs';

describe('truncate', () => {
  it('returns string unchanged when shorter than max', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('returns string unchanged when exactly max length', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  it('slices string when longer than max', () => {
    expect(truncate('hello world', 5)).toBe('hello');
  });

  it('returns empty string for null', () => {
    expect(truncate(null, 10)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(truncate(undefined, 10)).toBe('');
  });

  it('returns empty string for empty string input', () => {
    expect(truncate('', 10)).toBe('');
  });
});

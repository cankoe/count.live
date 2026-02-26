import { describe, it, expect } from 'vitest';
import { formatTitleCountdown, padValue } from '../helpers/extract-script.mjs';

describe('formatTitleCountdown', () => {
  it('formats typical values correctly', () => {
    const values = { days: 5, hours: 3, minutes: 2, seconds: 1 };
    const units = ['days', 'hours', 'minutes', 'seconds'];

    expect(formatTitleCountdown(values, units)).toBe('5d 3h 2m 1s');
  });

  it('filters out milliseconds', () => {
    const values = { seconds: 10, milliseconds: 500 };
    const units = ['seconds', 'milliseconds'];

    expect(formatTitleCountdown(values, units)).toBe('10s');
  });

  it('handles single unit', () => {
    const values = { days: 42 };
    const units = ['days'];

    expect(formatTitleCountdown(values, units)).toBe('42d');
  });
});

describe('padValue', () => {
  it('pads milliseconds to 3 digits', () => {
    expect(padValue(5, 'milliseconds')).toBe('005');
    expect(padValue(50, 'milliseconds')).toBe('050');
    expect(padValue(500, 'milliseconds')).toBe('500');
  });

  it('pads hours to 2 digits', () => {
    expect(padValue(5, 'hours')).toBe('05');
    expect(padValue(12, 'hours')).toBe('12');
  });

  it('pads minutes to 2 digits', () => {
    expect(padValue(5, 'minutes')).toBe('05');
    expect(padValue(59, 'minutes')).toBe('59');
  });

  it('pads seconds to 2 digits', () => {
    expect(padValue(5, 'seconds')).toBe('05');
    expect(padValue(30, 'seconds')).toBe('30');
  });

  it('does not pad years', () => {
    expect(padValue(5, 'years')).toBe('5');
  });

  it('does not pad months', () => {
    expect(padValue(5, 'months')).toBe('5');
  });

  it('does not pad weeks', () => {
    expect(padValue(5, 'weeks')).toBe('5');
  });

  it('does not pad days', () => {
    expect(padValue(5, 'days')).toBe('5');
  });
});

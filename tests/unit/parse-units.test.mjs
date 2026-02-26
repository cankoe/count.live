import { describe, it, expect } from 'vitest';
import { parseUnits } from '../helpers/extract-script.mjs';

const DEFAULTS = ['days', 'hours', 'minutes', 'seconds'];

describe('parseUnits', () => {
  it('returns defaults for null', () => {
    expect(parseUnits(null)).toEqual(DEFAULTS);
  });

  it('returns defaults for empty string', () => {
    expect(parseUnits('')).toEqual(DEFAULTS);
  });

  it('parses full unit names', () => {
    expect(parseUnits('days,hours,minutes,seconds')).toEqual([
      'days', 'hours', 'minutes', 'seconds',
    ]);
  });

  it('maps abbreviations correctly', () => {
    expect(parseUnits('d,h,m,s')).toEqual([
      'days', 'hours', 'minutes', 'seconds',
    ]);
  });

  it('handles mixed abbreviations and full names', () => {
    expect(parseUnits('d,hours,min,s')).toEqual([
      'days', 'hours', 'minutes', 'seconds',
    ]);
  });

  it('deduplicates units', () => {
    expect(parseUnits('d,d,h,h')).toEqual(['days', 'hours']);
  });

  it('sorts by granularity (largest to smallest)', () => {
    expect(parseUnits('seconds,days')).toEqual(['days', 'seconds']);
  });

  it('filters out invalid units', () => {
    expect(parseUnits('d,invalid,h')).toEqual(['days', 'hours']);
  });

  it('returns defaults when all units are invalid', () => {
    expect(parseUnits('foo,bar,baz')).toEqual(DEFAULTS);
  });
});

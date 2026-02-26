import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateTimeUnits } from '../helpers/extract-script.mjs';

describe('calculateTimeUnits', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns correct breakdown for future date with d,h,m,s', () => {
    // Target: 2025-06-20T15:30:45Z → 5d 3h 30m 45s from now
    const target = new Date('2025-06-20T15:30:45Z');
    const result = calculateTimeUnits(target, ['days', 'hours', 'minutes', 'seconds']);

    expect(result.days).toBe(5);
    expect(result.hours).toBe(3);
    expect(result.minutes).toBe(30);
    expect(result.seconds).toBe(45);
  });

  it('returns all zeros for past date', () => {
    const target = new Date('2025-01-01T00:00:00Z');
    const result = calculateTimeUnits(target, ['days', 'hours', 'minutes', 'seconds']);

    expect(result.days).toBe(0);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
    expect(result.seconds).toBe(0);
  });

  it('handles years/months calendar-based units', () => {
    // Now: 2025-06-15T12:00:00Z, Target: 2027-06-15T12:00:00Z → exactly 2 years
    const target = new Date('2027-06-15T12:00:00Z');
    const result = calculateTimeUnits(target, ['years', 'months', 'days', 'hours', 'minutes', 'seconds']);

    expect(result.years).toBe(2);
    expect(result.months).toBe(0);
    expect(result.days).toBe(0);
  });

  it('calculates weeks correctly for far future date', () => {
    // Now: 2025-06-15T12:00:00Z, Target: 2025-08-17T12:00:00Z → 63 days = 9 weeks
    const target = new Date('2025-08-17T12:00:00Z');
    const result = calculateTimeUnits(target, ['weeks']);

    expect(result.weeks).toBe(9);
  });

  it('handles exactly 1 second remaining', () => {
    const target = new Date('2025-06-15T12:00:01Z');
    const result = calculateTimeUnits(target, ['days', 'hours', 'minutes', 'seconds']);

    expect(result.days).toBe(0);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
    expect(result.seconds).toBe(1);
  });

  it('includes milliseconds unit', () => {
    // 1.5 seconds ahead
    const target = new Date('2025-06-15T12:00:01.500Z');
    const result = calculateTimeUnits(target, ['seconds', 'milliseconds']);

    expect(result.seconds).toBe(1);
    expect(result.milliseconds).toBe(500);
  });
});

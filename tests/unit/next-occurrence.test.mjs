import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getNextOccurrence } from '../helpers/extract-script.mjs';

describe('getNextOccurrence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('daily: past date advances to next day after now', () => {
    // Base date is in the past; should advance day-by-day until future
    const base = new Date('2025-06-14T08:00:00Z');
    const result = getNextOccurrence(base, 'daily');

    expect(result.getTime()).toBeGreaterThan(Date.now());
    // 2025-06-14 08:00 → +1 day = 2025-06-15 08:00 (still past 12:00) → +1 = 2025-06-16 08:00
    expect(result.getUTCDate()).toBe(16);
    expect(result.getUTCHours()).toBe(8);
  });

  it('weekly: advances by 7 days', () => {
    // Base date is in the past
    const base = new Date('2025-06-08T10:00:00Z');
    const result = getNextOccurrence(base, 'weekly');

    expect(result.getTime()).toBeGreaterThan(Date.now());
    // 2025-06-08 + 7 = 2025-06-15 10:00 (still past 12:00) → +7 = 2025-06-22 10:00
    expect(result.getUTCDate()).toBe(22);
    expect(result.getUTCHours()).toBe(10);
  });

  it('monthly: advances by months using addMonths', () => {
    const base = new Date('2025-05-15T10:00:00Z');
    const result = getNextOccurrence(base, 'monthly');

    expect(result.getTime()).toBeGreaterThan(Date.now());
    // May 15 10:00 → June 15 10:00 (past, since now is 12:00) → July 15 10:00
    expect(result.getUTCMonth()).toBe(6); // July
    expect(result.getUTCDate()).toBe(15);
  });

  it('yearly: advances by years using addYears', () => {
    const base = new Date('2024-06-15T10:00:00Z');
    const result = getNextOccurrence(base, 'yearly');

    expect(result.getTime()).toBeGreaterThan(Date.now());
    // 2024-06-15 10:00 → 2025-06-15 10:00 (still past 12:00) → 2026-06-15 10:00
    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(5); // June
  });

  it('already-future date returns as-is', () => {
    const base = new Date('2025-12-25T00:00:00Z');
    const result = getNextOccurrence(base, 'daily');

    expect(result.getTime()).toBe(base.getTime());
  });

  it('unknown recurrence type returns the base date unchanged', () => {
    const base = new Date('2025-06-14T08:00:00Z');
    const result = getNextOccurrence(base, 'biweekly');

    // Unknown recurrence hits the else/break; loop stops, returns base as-is
    expect(result.getTime()).toBe(base.getTime());
  });
});

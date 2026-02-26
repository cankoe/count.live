import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateProgress } from '../helpers/extract-script.mjs';

describe('calculateProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns roughly 45% for Jan 1 to Dec 31 when now is mid-June', () => {
    const start = new Date('2025-01-01T00:00:00Z');
    const end = new Date('2025-12-31T23:59:59Z');
    const progress = calculateProgress(start, end);

    // June 15 12:00 is about day 166 of 365 ≈ 45.4%
    expect(progress).toBeGreaterThan(44);
    expect(progress).toBeLessThan(47);
  });

  it('returns 0 when start is in the future', () => {
    const start = new Date('2025-09-01T00:00:00Z');
    const end = new Date('2025-12-31T23:59:59Z');
    const progress = calculateProgress(start, end);

    expect(progress).toBe(0);
  });

  it('returns 100 when end is in the past', () => {
    const start = new Date('2024-01-01T00:00:00Z');
    const end = new Date('2025-01-01T00:00:00Z');
    const progress = calculateProgress(start, end);

    expect(progress).toBe(100);
  });

  it('returns roughly 50% at the midpoint', () => {
    // Start June 1, end July 1, now is June 15 12:00 → ~48.3% (15.5/30 days)
    const start = new Date('2025-06-01T00:00:00Z');
    const end = new Date('2025-07-01T00:00:00Z');
    const progress = calculateProgress(start, end);

    expect(progress).toBeGreaterThan(48);
    expect(progress).toBeLessThan(52);
  });
});

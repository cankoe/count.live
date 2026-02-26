import { describe, it, expect } from 'vitest';
import { addYears, addMonths } from '../helpers/extract-script.mjs';

describe('addYears', () => {
  it('adds 1 year to a normal date', () => {
    const d = new Date(2024, 5, 15); // June 15 2024
    const result = addYears(d, 1);
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(5);
    expect(result.getDate()).toBe(15);
  });

  it('clamps Feb 29 leap year + 1 year to Feb 28', () => {
    const d = new Date(2024, 1, 29); // Feb 29 2024 (leap)
    const result = addYears(d, 1);
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(28);
  });

  it('keeps Feb 29 when adding 4 years to another leap year', () => {
    const d = new Date(2024, 1, 29); // Feb 29 2024
    const result = addYears(d, 4);
    expect(result.getFullYear()).toBe(2028);
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(29);
  });
});

describe('addMonths', () => {
  it('adds 1 month to a normal date', () => {
    const d = new Date(2025, 0, 15); // Jan 15
    const result = addMonths(d, 1);
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(15);
  });

  it('clamps Jan 31 + 1 month to Feb 28 (non-leap)', () => {
    const d = new Date(2025, 0, 31); // Jan 31 2025
    const result = addMonths(d, 1);
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(28);
  });

  it('clamps Jan 31 + 1 month to Feb 29 in leap year', () => {
    const d = new Date(2024, 0, 31); // Jan 31 2024 (leap)
    const result = addMonths(d, 1);
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(29);
  });

  it('wraps Dec + 1 month to next year Jan', () => {
    const d = new Date(2025, 11, 15); // Dec 15 2025
    const result = addMonths(d, 1);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(15);
  });
});

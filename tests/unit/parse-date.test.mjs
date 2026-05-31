import { describe, it, expect } from 'vitest';
import { parseDate } from '../helpers/extract-script.mjs';

describe('parseDate', () => {
  it('parses ISO with time as UTC', () => {
    const d = parseDate('2025-12-31T23:59:59');
    expect(d).toBeInstanceOf(Date);
    expect(d.getUTCFullYear()).toBe(2025);
    expect(d.getUTCMonth()).toBe(11);
    expect(d.getUTCDate()).toBe(31);
    expect(d.getUTCHours()).toBe(23);
    expect(d.getUTCMinutes()).toBe(59);
    expect(d.getUTCSeconds()).toBe(59);
  });

  it('parses date-only as midnight UTC', () => {
    const d = parseDate('2025-12-31');
    expect(d.getUTCHours()).toBe(0);
    expect(d.getUTCMinutes()).toBe(0);
    expect(d.getUTCSeconds()).toBe(0);
  });

  it('parses without seconds by appending :00', () => {
    const d = parseDate('2025-12-31T23:59');
    expect(d.getUTCHours()).toBe(23);
    expect(d.getUTCMinutes()).toBe(59);
    expect(d.getUTCSeconds()).toBe(0);
  });

  it('does not double-add Z suffix', () => {
    const d = parseDate('2025-12-31T23:59:59Z');
    expect(d).toBeInstanceOf(Date);
    expect(d.getUTCHours()).toBe(23);
    expect(d.getUTCMinutes()).toBe(59);
    expect(d.getUTCSeconds()).toBe(59);
  });

  it('handles timezone offset correctly', () => {
    const d = parseDate('2025-12-31T23:59:59+05:00');
    // 23:59:59 +05:00 → 18:59:59 UTC
    expect(d.getUTCHours()).toBe(18);
    expect(d.getUTCMinutes()).toBe(59);
    expect(d.getUTCSeconds()).toBe(59);
  });

  it('recovers a "+" offset that decoded to a space (un-encoded URL +)', () => {
    // "...T22:00:00+03:00" in a query string decodes to "...T22:00:00 03:00".
    const d = parseDate('2026-05-16T22:00:00 03:00');
    expect(d).toBeInstanceOf(Date);
    // 22:00:00 +03:00 → 19:00:00 UTC
    expect(d.getUTCHours()).toBe(19);
    expect(d.getUTCMinutes()).toBe(0);
    expect(d.getUTCSeconds()).toBe(0);
  });

  it('recovers a space-offset without seconds', () => {
    const d = parseDate('2026-05-16T22:00 03:00');
    // 22:00 +03:00 → 19:00 UTC
    expect(d.getUTCHours()).toBe(19);
    expect(d.getUTCMinutes()).toBe(0);
  });

  it('returns null for invalid date string', () => {
    expect(parseDate('not-a-date')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseDate('')).toBeNull();
  });

  it('returns null for null', () => {
    expect(parseDate(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(parseDate(undefined)).toBeNull();
  });

  it('trims whitespace', () => {
    const d = parseDate('  2025-12-31T12:00:00  ');
    expect(d).toBeInstanceOf(Date);
    expect(d.getUTCHours()).toBe(12);
  });
});

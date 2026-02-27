import { describe, it, expect } from 'vitest';
import { localToISO, formatDateForDisplay, utcToLocal } from '../helpers/extract-script.mjs';

describe('localToISO', () => {
  it('returns ISO 8601 with offset for America/New_York', () => {
    const result = localToISO('2027-01-01T00:00', 'America/New_York');
    expect(result).toBe('2027-01-01T00:00:00-05:00');
  });

  it('returns ISO 8601 with offset for UTC', () => {
    const result = localToISO('2027-01-01T00:00', 'UTC');
    expect(result).toBe('2027-01-01T00:00:00+00:00');
  });

  it('returns ISO 8601 with positive offset', () => {
    const result = localToISO('2027-01-01T12:00', 'Asia/Tokyo');
    expect(result).toBe('2027-01-01T12:00:00+09:00');
  });

  it('returns empty string for empty input', () => {
    expect(localToISO('', 'UTC')).toBe('');
  });

  it('preserves the local time as-is (does not convert)', () => {
    const result = localToISO('2027-06-15T14:30', 'America/Los_Angeles');
    // Should keep 14:30 and append the PDT offset (-07:00 in summer)
    expect(result).toMatch(/^2027-06-15T14:30:00[+-]\d{2}:\d{2}$/);
    expect(result).toContain('14:30:00');
  });
});

describe('formatDateForDisplay', () => {
  it('with tz param: shows timezone name', () => {
    const result = formatDateForDisplay('2027-01-01T05:00:00', 'America/New_York');
    expect(result).toContain('January');
    expect(result).toContain('2027');
    expect(result).toContain('EST');
  });

  it('with offset: shows time without timezone name', () => {
    const result = formatDateForDisplay('2027-01-01T00:00:00-05:00', '');
    expect(result).toContain('January');
    expect(result).toContain('2027');
    expect(result).not.toMatch(/EST|UTC|GMT/);
  });

  it('bare ISO (no offset): shows UTC', () => {
    const result = formatDateForDisplay('2027-01-01T00:00:00', '');
    expect(result).toContain('January');
    expect(result).toContain('UTC');
  });

  it('with Z: shows UTC', () => {
    const result = formatDateForDisplay('2027-01-01T00:00:00Z', '');
    expect(result).toContain('UTC');
  });

  it('returns empty for empty input', () => {
    expect(formatDateForDisplay('', '')).toBe('');
  });

  it('tz param takes priority over offset in the date', () => {
    const result = formatDateForDisplay('2027-01-01T00:00:00-05:00', 'America/Chicago');
    expect(result).toContain('CST');
  });
});

describe('utcToLocal with offset dates', () => {
  it('extracts local time from offset date', () => {
    const result = utcToLocal('2027-01-01T00:00:00-05:00', 'America/New_York');
    expect(result).toBe('2027-01-01T00:00');
  });

  it('still works for bare UTC dates', () => {
    const result = utcToLocal('2027-01-01T05:00:00', 'America/New_York');
    expect(result).toBe('2027-01-01T00:00');
  });

  it('returns empty for empty input', () => {
    expect(utcToLocal('', 'UTC')).toBe('');
  });
});

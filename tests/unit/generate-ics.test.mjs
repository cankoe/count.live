import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateICS } from '../helpers/extract-script.mjs';

describe('generateICS', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with BEGIN:VCALENDAR', () => {
    const ics = generateICS('Test', new Date('2025-12-31T23:59:59Z'), 'https://count.live');

    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
  });

  it('ends with END:VCALENDAR', () => {
    const ics = generateICS('Test', new Date('2025-12-31T23:59:59Z'), 'https://count.live');

    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
  });

  it('contains DTSTART with correctly formatted date', () => {
    const date = new Date('2025-12-31T23:59:59Z');
    const ics = generateICS('Test', date, 'https://count.live');

    // ICS format: YYYYMMDDTHHMMSSZ
    expect(ics).toContain('DTSTART:20251231T235959Z');
  });

  it('escapes special characters in title (commas, semicolons, backslashes)', () => {
    const ics = generateICS('Hello, World; Test\\More', new Date('2025-12-31T00:00:00Z'), 'https://count.live');

    expect(ics).toContain('SUMMARY:Hello\\, World\\; Test\\\\More');
  });

  it('contains URL field', () => {
    const url = 'https://count.live/?date=2025-12-31';
    const ics = generateICS('Test', new Date('2025-12-31T00:00:00Z'), url);

    expect(ics).toContain('URL:' + url);
  });

  it('uses default title when none provided', () => {
    const ics = generateICS('', new Date('2025-12-31T00:00:00Z'), 'https://count.live');

    expect(ics).toContain('SUMMARY:Countdown Event');
  });

  it('contains required VCALENDAR structure', () => {
    const ics = generateICS('Test', new Date('2025-12-31T00:00:00Z'), 'https://count.live');

    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('PRODID:');
  });
});

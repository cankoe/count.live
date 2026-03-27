import { describe, it, expect } from 'vitest';
import { buildUrl, _mockWindow } from '../helpers/extract-script.mjs';

describe('buildUrl', () => {
  it('includes date and title params', () => {
    const url = buildUrl({ date: '2025-12-31T23:59:59', title: 'New Year' });

    expect(url).toContain('date=' + encodeURIComponent('2025-12-31T23:59:59'));
    expect(url).toContain('title=' + encodeURIComponent('New Year'));
  });

  it('omits default bg (1a1a2e) and fg (ffffff)', () => {
    const url = buildUrl({ date: '2025-12-31', bg: '1a1a2e', fg: 'ffffff' });

    expect(url).not.toContain('bg=');
    expect(url).not.toContain('fg=');
  });

  it('includes non-default colors', () => {
    const url = buildUrl({ date: '2025-12-31', bg: 'ff0000', fg: '00ff00' });

    expect(url).toContain('bg=ff0000');
    expect(url).toContain('fg=00ff00');
  });

  it('URI-encodes title with special characters', () => {
    const url = buildUrl({ date: '2025-12-31', title: 'Hello World & "More"' });

    expect(url).toContain('title=' + encodeURIComponent('Hello World & "More"'));
    expect(url).not.toContain('Hello World & "More"');
  });

  it('omits default font (sans)', () => {
    const url = buildUrl({ date: '2025-12-31', font: 'sans' });

    expect(url).not.toContain('font=');
  });

  it('includes non-default font', () => {
    const url = buildUrl({ date: '2025-12-31', font: 'mono' });

    expect(url).toContain('font=mono');
  });

  it('includes start param when progress is enabled', () => {
    const url = buildUrl({
      date: '2025-12-31',
      progress: true,
      start: '2025-01-01T00:00:00',
    });

    expect(url).toContain('progress=1');
    expect(url).toContain('start=' + encodeURIComponent('2025-01-01T00:00:00'));
  });

  it('produces base URL with ? for empty config', () => {
    const url = buildUrl({});

    expect(url).toBe(_mockWindow.location.origin + _mockWindow.location.pathname + '?');
  });

  it('includes redirect param when set', () => {
    const url = buildUrl({ date: '2025-12-31', redirect: 'https://example.com/launch' });
    expect(url).toContain('redirect=' + encodeURIComponent('https://example.com/launch'));
  });

  it('includes redirectDelay param when non-zero', () => {
    const url = buildUrl({ date: '2025-12-31', redirect: 'https://example.com', redirectDelay: '5' });
    expect(url).toContain('redirectDelay=5');
  });

  it('omits redirectDelay when zero', () => {
    const url = buildUrl({ date: '2025-12-31', redirect: 'https://example.com', redirectDelay: '0' });
    expect(url).not.toContain('redirectDelay');
  });

  it('omits redirect params when redirect is empty', () => {
    const url = buildUrl({ date: '2025-12-31', redirect: '', redirectDelay: '5' });
    expect(url).not.toContain('redirect');
    expect(url).not.toContain('redirectDelay');
  });
});

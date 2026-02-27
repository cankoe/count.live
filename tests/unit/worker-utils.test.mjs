import { describe, it, expect } from 'vitest';
import { isValidHexColor, isValidImageUrl, escapeHtml, generateOgImage } from '../helpers/extract-worker.mjs';

describe('isValidHexColor', () => {
  it('accepts valid 6-char hex: ff0000', () => {
    expect(isValidHexColor('ff0000')).toBe(true);
  });

  it('accepts uppercase hex: FF00AA', () => {
    expect(isValidHexColor('FF00AA')).toBe(true);
  });

  it('rejects 3-char hex: f00', () => {
    expect(isValidHexColor('f00')).toBe(false);
  });

  it('rejects hex with hash: #ff0000', () => {
    expect(isValidHexColor('#ff0000')).toBe(false);
  });

  it('rejects non-hex chars: gggggg', () => {
    expect(isValidHexColor('gggggg')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidHexColor('')).toBe(false);
  });
});

describe('isValidImageUrl', () => {
  it('accepts https URL', () => {
    expect(isValidImageUrl('https://example.com/image.png')).toBe(true);
  });

  it('rejects http URL', () => {
    expect(isValidImageUrl('http://example.com/image.png')).toBe(false);
  });

  it('rejects data: URL', () => {
    expect(isValidImageUrl('data:image/png;base64,abc')).toBe(false);
  });

  it('rejects javascript: URL', () => {
    expect(isValidImageUrl('javascript:alert(1)')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidImageUrl('')).toBe(false);
  });

  it('rejects null', () => {
    expect(isValidImageUrl(null)).toBe(false);
  });

  it('rejects invalid URL', () => {
    expect(isValidImageUrl('not a url')).toBe(false);
  });
});

describe('worker escapeHtml', () => {
  it('escapes < and >', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
  });

  it('escapes &', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#039;s');
  });

  it('escapes all special characters together', () => {
    expect(escapeHtml('<a href="x">&\'</a>')).toBe(
      '&lt;a href=&quot;x&quot;&gt;&amp;&#039;&lt;/a&gt;'
    );
  });

  it('leaves normal string unchanged', () => {
    expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
  });
});

describe('generateOgImage', () => {
  function makeUrl(params = '') {
    return new URL('https://count.live/og-image?' + params);
  }

  function getSvg(params) {
    return generateOgImage(makeUrl(params)).body;
  }

  it('includes title in SVG', () => {
    const svg = getSvg('title=Hello+World');
    expect(svg).toContain('Hello World');
  });

  it('includes subtitle when provided', () => {
    const svg = getSvg('title=Test&subtitle=My+Subtitle');
    expect(svg).toContain('My Subtitle');
  });

  it('includes formatted target date when date param is provided', () => {
    const svg = getSvg('title=Test&date=2027-01-01T00:00:00');
    expect(svg).toContain('January');
    expect(svg).toContain('2027');
  });

  it('does not include date text when no date param', () => {
    const svg = getSvg('title=Test');
    expect(svg).not.toContain('opacity="0.5"');
  });

  it('includes count.live branding', () => {
    const svg = getSvg('title=Test');
    expect(svg).toContain('count.live');
  });

  it('uses custom colors when valid', () => {
    const svg = getSvg('title=Test&bg=ff0000&fg=00ff00');
    expect(svg).toContain('fill="#ff0000"');
    expect(svg).toContain('fill="#00ff00"');
  });

  it('falls back to defaults for invalid colors', () => {
    const svg = getSvg('title=Test&bg=xyz&fg=abc');
    expect(svg).toContain('fill="#1a1a2e"');
    expect(svg).toContain('fill="#ffffff"');
  });

  it('escapes HTML in title', () => {
    const svg = getSvg('title=<script>alert(1)</script>');
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
  });

  it('returns correct content type', () => {
    const response = generateOgImage(makeUrl('title=Test'));
    expect(response.headers.get('content-type')).toBe('image/svg+xml');
  });
});

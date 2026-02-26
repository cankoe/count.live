import { describe, it, expect } from 'vitest';
import { isValidHexColor, isValidImageUrl, escapeHtml } from '../helpers/extract-worker.mjs';

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

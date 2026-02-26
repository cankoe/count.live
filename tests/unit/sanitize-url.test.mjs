import { describe, it, expect } from 'vitest';
import { sanitizeUrlForCss } from '../helpers/extract-script.mjs';

describe('sanitizeUrlForCss', () => {
  it('returns sanitized href for valid https URL', () => {
    const result = sanitizeUrlForCss('https://example.com/image.png');
    expect(result).toBe('https://example.com/image.png');
  });

  it('returns null for http URL', () => {
    expect(sanitizeUrlForCss('http://example.com/image.png')).toBeNull();
  });

  it('returns null for javascript: URL', () => {
    expect(sanitizeUrlForCss('javascript:alert(1)')).toBeNull();
  });

  it('returns null for data: URL', () => {
    expect(sanitizeUrlForCss('data:text/html,<script>alert(1)</script>')).toBeNull();
  });

  it('returns null for null', () => {
    expect(sanitizeUrlForCss(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(sanitizeUrlForCss('')).toBeNull();
  });

  it('returns null for invalid URL string', () => {
    expect(sanitizeUrlForCss('not a url')).toBeNull();
  });

  it('encodes double quotes and backslashes in URL', () => {
    // URL constructor encodes " to %22; backslash to %5C
    const result = sanitizeUrlForCss('https://example.com/path%22with%5Cchars');
    expect(result).not.toContain('"');
    expect(result).not.toContain('\\');
    expect(result).toContain('%22');
    expect(result).toContain('%5C');
  });
});

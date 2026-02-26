import { describe, it, expect } from 'vitest';
import { linkifyText } from '../helpers/extract-script.mjs';

describe('linkifyText', () => {
  it('converts URL to anchor tag with target=_blank', () => {
    const result = linkifyText('Visit https://example.com today');
    expect(result).toContain('<a href="https://example.com"');
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener noreferrer"');
  });

  it('escapes HTML before linkifying (XSS safe)', () => {
    const result = linkifyText('<script>alert("xss")</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('converts newlines to <br>', () => {
    const result = linkifyText('line1\nline2');
    expect(result).toBe('line1<br>line2');
  });

  it('returns escaped text when no URLs are present', () => {
    expect(linkifyText('hello world')).toBe('hello world');
  });

  it('returns empty string for null', () => {
    expect(linkifyText(null)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(linkifyText('')).toBe('');
  });
});

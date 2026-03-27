import { describe, it, expect } from 'vitest';
import { validateRedirectUrl } from '../helpers/extract-script.mjs';

describe('validateRedirectUrl', () => {
  it('returns the URL for valid https URL', () => {
    expect(validateRedirectUrl('https://example.com/launch')).toBe('https://example.com/launch');
  });

  it('returns the URL for valid http URL', () => {
    expect(validateRedirectUrl('http://example.com/launch')).toBe('http://example.com/launch');
  });

  it('returns null for javascript: URL', () => {
    expect(validateRedirectUrl('javascript:alert(1)')).toBeNull();
  });

  it('returns null for data: URL', () => {
    expect(validateRedirectUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
  });

  it('returns null for relative URL', () => {
    expect(validateRedirectUrl('/page')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(validateRedirectUrl('')).toBeNull();
  });

  it('returns null for null', () => {
    expect(validateRedirectUrl(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(validateRedirectUrl(undefined)).toBeNull();
  });

  it('returns null for non-URL string', () => {
    expect(validateRedirectUrl('not a url')).toBeNull();
  });

  it('returns normalized URL from URL constructor', () => {
    expect(validateRedirectUrl('HTTPS://EXAMPLE.COM/PATH')).toBe('https://example.com/PATH');
  });
});

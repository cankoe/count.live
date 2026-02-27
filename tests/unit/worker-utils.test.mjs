import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../helpers/extract-worker.mjs';

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

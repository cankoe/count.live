/**
 * Extracts pure functions from script.js using Node's vm module.
 * This avoids modifying script.js while making functions testable.
 *
 * Since const/let/function declarations in vm.Script don't become properties
 * of the context, we wrap the script in code that captures them via eval.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import vm from 'vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptPath = resolve(__dirname, '../../script.js');
const scriptContent = readFileSync(scriptPath, 'utf-8');

// Minimal DOM mocks sufficient for script.js to load
function createMockElement() {
  const el = {
    style: {},
    className: '',
    innerHTML: '',
    value: '',
    checked: false,
    display: '',
    _classList: new Set(),
    classList: {
      add(...names) { names.forEach(n => el._classList.add(n)); },
      remove(...names) { names.forEach(n => el._classList.delete(n)); },
      contains(n) { return el._classList.has(n); },
      toggle(n) { el._classList.has(n) ? el._classList.delete(n) : el._classList.add(n); },
    },
    appendChild() {},
    setAttribute() {},
    getAttribute() { return null; },
    addEventListener() {},
    removeEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getBoundingClientRect() { return { width: 0, height: 0, top: 0, left: 0 }; },
    offsetWidth: 100,
  };

  // Override textContent setter so escapeHtml works (sets textContent, reads innerHTML)
  Object.defineProperty(el, 'textContent', {
    get() { return el._rawText || ''; },
    set(val) {
      el._rawText = val;
      el.innerHTML = String(val)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },
  });

  return el;
}

const mockDocument = {
  createElement() { return createMockElement(); },
  getElementById() { return createMockElement(); },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  addEventListener() {},
  body: createMockElement(),
  title: '',
  hidden: false,
  fullscreenElement: null,
  webkitFullscreenElement: null,
};

const mockWindow = {
  location: {
    hash: '',
    search: '',
    origin: 'https://count.live',
    pathname: '/',
    href: 'https://count.live/',
  },
  addEventListener() {},
  innerWidth: 1200,
  innerHeight: 800,
  matchMedia() { return { matches: false, addEventListener() {} }; },
  _builderPrefill: null,
};

// Collector object — the wrapped script assigns identifiers here
const __exports = {};

// DateProxy forwards to globalThis.Date so vi.useFakeTimers() is respected
const DateProxy = new Proxy(Date, {
  construct(_target, args) { return new globalThis.Date(...args); },
  apply(_target, _thisArg, args) { return globalThis.Date(...args); },
  get(_target, prop) {
    if (prop === 'now') return () => globalThis.Date.now();
    if (prop === 'prototype') return globalThis.Date.prototype;
    return globalThis.Date[prop];
  },
});

const context = vm.createContext({
  __exports,
  window: mockWindow,
  document: mockDocument,
  navigator: {
    clipboard: { writeText: () => Promise.resolve() },
    serviceWorker: { register() {} },
    share: undefined,
  },
  localStorage: {
    _data: {},
    getItem(key) { return this._data[key] || null; },
    setItem(key, val) { this._data[key] = val; },
    removeItem(key) { delete this._data[key]; },
  },
  setTimeout: globalThis.setTimeout,
  setInterval: globalThis.setInterval,
  clearInterval: globalThis.clearInterval,
  clearTimeout: globalThis.clearTimeout,
  requestAnimationFrame: (cb) => setTimeout(cb, 16),
  Date: DateProxy,
  Math: globalThis.Math,
  console: globalThis.console,
  Intl: globalThis.Intl,
  URL: globalThis.URL,
  URLSearchParams: globalThis.URLSearchParams,
  encodeURIComponent: globalThis.encodeURIComponent,
  decodeURIComponent: globalThis.decodeURIComponent,
  isNaN: globalThis.isNaN,
  parseInt: globalThis.parseInt,
  parseFloat: globalThis.parseFloat,
  DataView: globalThis.DataView,
  ArrayBuffer: globalThis.ArrayBuffer,
  Uint8Array: globalThis.Uint8Array,
  Float32Array: globalThis.Float32Array,
  Int16Array: globalThis.Int16Array,
  Blob: globalThis.Blob,
  Audio: class Audio { play() { return Promise.resolve(); } },
  Notification: { permission: 'default', requestPermission: () => Promise.resolve('default') },
  Object: globalThis.Object,
  Array: globalThis.Array,
  String: globalThis.String,
  Number: globalThis.Number,
  RegExp: globalThis.RegExp,
  Error: globalThis.Error,
  Set: globalThis.Set,
  Map: globalThis.Map,
  Promise: globalThis.Promise,
  Symbol: globalThis.Symbol,
  JSON: globalThis.JSON,
  history: { replaceState() {} },
  btoa: globalThis.btoa,
  atob: globalThis.atob,
  HTMLCanvasElement: class HTMLCanvasElement {},
  void: undefined,
});

// Names we want to extract from script.js
const exportNames = [
  'DEFAULTS', 'MAX_LENGTHS', 'THEME_PRESETS', 'FONT_STACKS',
  'UNIT_CONFIG', 'UNIT_ALIASES', 'UNIT_SHORT', 'SOUNDS',
  'parseHash', 'parseParams', 'parseDate', 'parseUnits', 'parseColor',
  'truncate', 'sanitizeUrlForCss', 'escapeHtml', 'linkifyText',
  'addYears', 'addMonths', 'calculateTimeUnits', 'getNextOccurrence',
  'calculateProgress', 'buildUrl', 'formatTitleCountdown', 'padValue',
  'generateICS', 'utcToLocal', 'localToUTC',
];

// Wrap script: run it, then assign desired names to __exports
const wrappedScript = `
${scriptContent}

// Capture declarations into __exports
${exportNames.map(name => `try { __exports.${name} = ${name}; } catch(e) {}`).join('\n')}
`;

const script = new vm.Script(wrappedScript, { filename: 'script.js' });
script.runInContext(context);

// Re-export from the collector
export const DEFAULTS = __exports.DEFAULTS;
export const MAX_LENGTHS = __exports.MAX_LENGTHS;
export const THEME_PRESETS = __exports.THEME_PRESETS;
export const FONT_STACKS = __exports.FONT_STACKS;
export const UNIT_CONFIG = __exports.UNIT_CONFIG;
export const UNIT_ALIASES = __exports.UNIT_ALIASES;
export const UNIT_SHORT = __exports.UNIT_SHORT;

export const parseHash = __exports.parseHash;
export const parseParams = __exports.parseParams;
export const parseDate = __exports.parseDate;
export const parseUnits = __exports.parseUnits;
export const parseColor = __exports.parseColor;
export const truncate = __exports.truncate;
export const sanitizeUrlForCss = __exports.sanitizeUrlForCss;
export const escapeHtml = __exports.escapeHtml;
export const linkifyText = __exports.linkifyText;
export const addYears = __exports.addYears;
export const addMonths = __exports.addMonths;
export const calculateTimeUnits = __exports.calculateTimeUnits;
export const getNextOccurrence = __exports.getNextOccurrence;
export const calculateProgress = __exports.calculateProgress;
export const buildUrl = __exports.buildUrl;
export const formatTitleCountdown = __exports.formatTitleCountdown;
export const padValue = __exports.padValue;
export const generateICS = __exports.generateICS;
export const utcToLocal = __exports.utcToLocal;
export const localToUTC = __exports.localToUTC;

// Expose mocks for tests that need to set location etc.
export const _mockWindow = mockWindow;
export const _mockDocument = mockDocument;

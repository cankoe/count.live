/**
 * Extracts pure utility functions from worker.js using Node's vm module.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import vm from 'vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const workerPath = resolve(__dirname, '../../worker.js');
let workerContent = readFileSync(workerPath, 'utf-8');

// Remove ESM imports and export syntax (not valid in vm.Script)
workerContent = workerContent.replace(/^import\s+.*$/gm, '');
workerContent = workerContent.replace(/^export default/m, 'const __workerHandler__ =');

const __exports = {};

class MockHeaders extends Map {
  constructor(init) {
    super();
    if (init && typeof init[Symbol.iterator] === 'function') {
      for (const [k, v] of init) this.set(k, v);
    } else if (init && typeof init === 'object') {
      for (const [k, v] of Object.entries(init)) this.set(k, v);
    }
  }
  get(key) { return super.get(key.toLowerCase()) || null; }
  set(key, val) { return super.set(key.toLowerCase(), val); }
}

const context = vm.createContext({
  __exports,
  URL: globalThis.URL,
  URLSearchParams: globalThis.URLSearchParams,
  Headers: MockHeaders,
  Response: class Response {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.headers = new MockHeaders(init.headers);
    }
  },
  HTMLRewriter: class HTMLRewriter {
    on() { return this; }
    transform(response) { return response; }
  },
  console: globalThis.console,
  Object: globalThis.Object,
  Array: globalThis.Array,
  String: globalThis.String,
  Number: globalThis.Number,
  RegExp: globalThis.RegExp,
  Math: globalThis.Math,
  Date: globalThis.Date,
  encodeURIComponent: globalThis.encodeURIComponent,
  Map: globalThis.Map,
  Set: globalThis.Set,
  Error: globalThis.Error,
  Symbol: globalThis.Symbol,
});

const exportNames = ['escapeHtml', 'SECURITY_HEADERS', 'workerFormatDate'];

const wrappedScript = `
${workerContent}

${exportNames.map(name => `try { __exports.${name} = ${name}; } catch(e) {}`).join('\n')}
`;

const script = new vm.Script(wrappedScript, { filename: 'worker.js' });
script.runInContext(context);

export const escapeHtml = __exports.escapeHtml;

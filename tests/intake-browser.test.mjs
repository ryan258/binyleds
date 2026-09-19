import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const script = readFileSync(new URL('../assets/js/intake.js', import.meta.url), 'utf8');
// Small DOM harness exercises the actual shipped script's retry behavior.
// This does not simulate Cloudflare widgets or prove real browser rendering.
function browser({ storage = new Map(), fetcher = async () => Response.json({ ok: true, id: 'receipt' }), blockedStorage = false } = {}) {
  const handlers = {}; const state = { requests: [], redirects: [] };
  const status = { textContent: '', focus() {} };
  const button = { disabled: true };
  const separate = { hidden: true, addEventListener(name, handler) { handlers.newRequest = handler; } };
  const retry = { hidden: true, addEventListener(name, handler) { handlers.retry = handler; } };
  const id = { value: '' };
  const values = { name: 'Test', email: 'test@example.com', vision: 'Original notes', 'cf-turnstile-response': 'token' };
  const form = {
    action: 'https://site.test/api/consultation', dataset: { sitekey: 'test', successUrl: '/thank-you/' },
    elements: { namedItem() { return id; } },
    querySelector(selector) { return ({ '[data-intake-status]': status, '[type=submit]': button, '[data-new-request]': separate, '[data-retry-verification]': retry })[selector] || {}; },
    addEventListener(name, handler) { handlers[name] = handler; }, reportValidity() { return true; },
    setAttribute() {}, removeAttribute() {},
  };
  const window = {
    confirm() { return true; }, location: { assign(url) { state.redirects.push(url); } },
    turnstile: { render(element, options) { state.widget = options; return 1; }, reset() { state.resets = (state.resets || 0) + 1; } },
  };
  vm.runInNewContext(script, {
    document: { querySelector() { return form; }, createElement() { return {}; }, head: { append(element) { element.onload(); } } },
    sessionStorage: {
      getItem(key) { if (blockedStorage) throw new Error('blocked'); return storage.get(key) || null; },
      setItem(key, value) { if (blockedStorage) throw new Error('blocked'); storage.set(key, value); },
      removeItem(key) { storage.delete(key); },
    },
    crypto, TextEncoder, AbortSignal, window,
    setTimeout(callback) { state.timer = callback; return 1; }, clearTimeout() {},
    FormData: class { constructor() { this.entries = Object.entries({ ...values, 'submission-id': id.value }); } [Symbol.iterator]() { return this.entries[Symbol.iterator](); } },
    fetch: async (url, options) => { state.requests.push(Object.fromEntries(options.body)); return fetcher(url, options); },
  });
  return { state, values, status, button, separate, retry, id, storage,
    verify() { state.widget.callback(); },
    submit() { return handlers.submit({ preventDefault() {} }); },
    startSeparate() { handlers.newRequest(); },
    retryVerification() { handlers.retry(); },
  };
}
test('network uncertainty preserves entries and request ID across retry and reload', async () => {
  const storage = new Map();
  const page = browser({ storage, fetcher: async () => { throw new TypeError('offline'); } });
  page.verify(); await page.submit();
  assert.equal(page.values.vision, 'Original notes');
  assert.match(page.status.textContent, /Receipt could not be confirmed/);
  assert.equal(page.button.disabled, true);
  page.verify(); await page.submit();
  assert.equal(page.state.requests[0]['submission-id'], page.state.requests[1]['submission-id']);
  const reload = browser({ storage }); assert.equal(reload.id.value, page.id.value);
  reload.verify(); await reload.submit(); assert.equal(reload.state.redirects[0], '/thank-you/');
  assert.equal(storage.size, 0);
});
test('changed payload after uncertain send requires an intentional separate request', async () => {
  const page = browser({ fetcher: async () => { throw new TypeError('offline'); } });
  page.verify(); await page.submit(); const old = page.id.value;
  page.values.vision = 'Changed notes'; page.verify(); await page.submit();
  assert.equal(page.state.requests.length, 1); assert.equal(page.separate.hidden, false);
  page.startSeparate(); assert.notEqual(page.id.value, old); assert.equal(page.values.vision, 'Changed notes');
});
test('validation failure allows edits; refreshes verification; successful receipt blocks resubmission', async () => {
  let count = 0;
  const page = browser({ fetcher: async () => ++count === 1 ? Response.json({ error: 'Fix your field.' }, { status: 400 }) : Response.json({ ok: true }) });
  page.verify(); await page.submit(); const id = page.id.value;
  assert.equal(page.status.textContent, 'Fix your field.');
  page.values.vision = 'Corrected notes'; page.verify(); await page.submit();
  assert.equal(page.id.value, id); assert.equal(page.state.requests.length, 2);
  page.verify(); await page.submit(); assert.equal(page.state.requests.length, 2);
});
test('double click sends once and keeps sensitive content out of browser storage', async () => {
  let release;
  const page = browser({ fetcher: () => new Promise(resolve => { release = resolve; }) });
  page.verify(); const first = page.submit(); await page.submit();
  while (!release) await new Promise(resolve => setImmediate(resolve));
  assert.equal(page.state.requests.length, 1);
  const stored = [...page.storage.values()][0];
  assert(!stored.includes('Original notes')); assert(!stored.includes('test@example.com'));
  release(Response.json({ ok: true })); await first;
});
test('blocked session storage gives a usable same-page fallback', async () => {
  const page = browser({ blockedStorage: true }); page.verify();
  assert.match(page.status.textContent, /cannot remember your request ID/);
  await page.submit(); assert.equal(page.state.redirects[0], '/thank-you/');
});
test('stalled verification exposes an in-place retry without losing entries', () => {
  const page = browser(); page.state.timer();
  assert.equal(page.retry.hidden, false); assert.equal(page.button.disabled, true);
  assert.match(page.status.textContent, /taking longer/);
  page.retryVerification(); assert.equal(page.state.resets, 1);
  assert.equal(page.values.vision, 'Original notes');
  page.verify(); assert.equal(page.retry.hidden, true); assert.equal(page.button.disabled, false);
});

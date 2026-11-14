import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const script = readFileSync(new URL('../assets/js/intake.js', import.meta.url), 'utf8');
// Small DOM harness exercises the actual shipped script's retry behavior.
// This does not simulate Cloudflare widgets or prove real browser rendering.
function browser({ storage = new Map(), fetcher = async (url, options) => Response.json({ ok: true, id: Object.fromEntries(options.body)['submission-id'] }), blockedStorage = false } = {}) {
  const handlers = {}; const state = { requests: [], redirects: [] };
  const status = { textContent: '', focus() {} };
  const button = { disabled: true };
  const separate = { hidden: true, addEventListener(name, handler) { handlers.newRequest = handler; } };
  const retry = { hidden: true, addEventListener(name, handler) { handlers.retry = handler; } };
  const id = { value: '' };
  const values = { name: 'Test', email: 'test@example.com', phone: '', city: '', 'preferred-date': '', 'guest-count': '',
    'experience-level': '', occasion: '', 'desired-feeling': '', vision: 'Original notes', boundaries: '',
    'consent-version': 'v1', 'cf-turnstile-response': 'token' };
  const consent = { checked: true };
  const download = { addEventListener(name, handler) { handlers.download = handler; } };
  const restore = { addEventListener(name, handler) { handlers.restore = handler; } };
  const fieldset = { disabled: false };
  const controls = Object.fromEntries(Object.keys(values).map(key => [key, {
    get value() { return values[key]; }, set value(value) { values[key] = value; },
  }]));
  const form = {
    action: 'https://site.test/api/consultation', dataset: { sitekey: 'test', successUrl: '/thank-you/' },
    elements: { namedItem(key) { return key === 'submission-id' ? id : key === 'privacy-consent' ? consent : controls[key]; } },
    querySelector(selector) { return ({ '[data-intake-status]': status, '[type=submit]': button, '[data-new-request]': separate, '[data-retry-verification]': retry, '[data-download-draft]': download, '[data-restore-draft]': restore, '[data-intake-fields]': fieldset })[selector] || null; },
    querySelectorAll() { return []; },
    addEventListener(name, handler) { handlers[name] = handler; }, reportValidity() { return true; },
    setAttribute() {}, removeAttribute() {},
  };
  const window = {
    confirm() { return true; }, location: { assign(url) { state.redirects.push(url); } },
    turnstile: { render(element, options) { state.widget = options; return 1; }, reset() { state.resets = (state.resets || 0) + 1; } },
  };
  vm.runInNewContext(script, {
    document: { querySelector() { return form; }, createElement() { return { click() { state.downloaded = true; } }; }, head: { append(element) { element.onload(); } } },
    sessionStorage: {
      getItem(key) { if (blockedStorage) throw new Error('blocked'); return storage.get(key) || null; },
      setItem(key, value) { if (blockedStorage) throw new Error('blocked'); storage.set(key, value); },
      removeItem(key) { storage.delete(key); },
    },
    crypto, TextEncoder, AbortSignal, window, Blob,
    URL: { createObjectURL(blob) { state.draftBlob = blob; return 'blob:draft'; }, revokeObjectURL() {} },
    setTimeout(callback) { state.timer = callback; return 1; }, clearTimeout() {},
    FormData: class { constructor() { this.entries = Object.entries({ ...values, ...(consent.checked ? { 'privacy-consent': 'on' } : {}), 'submission-id': id.value }); } [Symbol.iterator]() { return this.entries[Symbol.iterator](); } },
    fetch: async (url, options) => { state.requests.push(Object.fromEntries(options.body)); return fetcher(url, options); },
  });
  return { state, values, status, button, separate, retry, id, storage, consent, fieldset,
    download() { handlers.download(); },
    restore(draft, pendingRead) { const text = JSON.stringify(draft); return handlers.restore({ target: { value: 'draft.json', files: [{ size: text.length, async text() { if (pendingRead) await pendingRead; return text; } }] } }); },
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
  reload.verify(); await reload.submit(); assert.equal(reload.state.redirects[0], '/thank-you/#receipt=' + reload.id.value);
  assert.equal(storage.size, 0);
});
test('successful re-verification replaces a stale watchdog warning after an uncertain receipt', async () => {
  let attempts = 0;
  const page = browser({ fetcher: async (_url, options) => ++attempts === 1
    ? new Response('synthetic unconfirmed receipt', { headers: { 'Content-Type': 'application/json' } })
    : Response.json({ ok: true, id: Object.fromEntries(options.body)['submission-id'] }) });
  page.verify();
  assert.equal(page.status.textContent, 'Ready to send. A receipt means your request has been saved.');
  await page.submit();
  const originalID = page.id.value;
  const retainedAttempt = [...page.storage.values()][0];
  assert.match(page.status.textContent, /Receipt could not be confirmed/);
  page.state.timer();
  assert.match(page.status.textContent, /taking longer than expected/);
  assert.equal(page.retry.hidden, false);
  assert.equal(page.button.disabled, true);
  page.verify();
  assert.equal(page.status.textContent, 'Verified again. Retry this same request with its original details, or email us.');
  assert.equal(page.retry.hidden, true);
  assert.equal(page.button.disabled, false);
  assert.equal(page.id.value, originalID);
  assert.equal(page.values.vision, 'Original notes');
  assert.equal([...page.storage.values()][0], retainedAttempt);
  assert.equal(page.state.requests.length, 1, 'Verification alone never sends another request.');
  await page.submit();
  assert.equal(page.state.requests.length, 2);
  assert.equal(page.state.requests[0]['submission-id'], page.state.requests[1]['submission-id']);
  assert.deepEqual(page.state.redirects, ['/thank-you/#receipt=' + originalID]);
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
  const page = browser({ fetcher: async (url, options) => ++count === 1 ? Response.json({ error: 'Fix your field.' }, { status: 400 }) : Response.json({ ok: true, id: Object.fromEntries(options.body)['submission-id'] }) });
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
  release(Response.json({ ok: true, id: page.id.value })); await first;
});
test('blocked session storage gives a usable same-page fallback', async () => {
  const page = browser({ blockedStorage: true }); page.verify();
  assert.match(page.status.textContent, /cannot remember your request ID/);
  await page.submit(); assert.equal(page.state.redirects[0], '/thank-you/#receipt=' + page.id.value);
});
test('stalled verification exposes an in-place retry without losing entries', () => {
  const page = browser(); page.state.timer();
  assert.equal(page.retry.hidden, false); assert.equal(page.button.disabled, true);
  assert.match(page.status.textContent, /taking longer/);
  page.retryVerification(); assert.equal(page.state.resets, 1);
  assert.equal(page.values.vision, 'Original notes');
  page.verify(); assert.equal(page.retry.hidden, true); assert.equal(page.button.disabled, false);
});

for (const receipt of [undefined, 'receipt', crypto.randomUUID()]) {
  test(`unconfirmed receipt ${receipt} never redirects or clears recovery state`, async () => {
    const page = browser({ fetcher: async () => Response.json({ ok: true, id: receipt }) });
    page.verify(); await page.submit();
    assert.equal(page.state.redirects.length, 0);
    assert.match(page.status.textContent, /Receipt could not be confirmed/);
    assert.equal(page.storage.size, 1);
  });
}
test('a request conflict exposes intentional separation but preserves the prior identity', async () => {
  const page = browser({ fetcher: async () => Response.json({ code: 'request_conflict', error: 'Different details.' }, { status: 409 }) });
  const id = page.id.value; page.verify(); await page.submit();
  assert.equal(page.separate.hidden, false); assert.equal(page.id.value, id);
});

test('explicit draft download and restore preserve notes and the uncertain request identity', async () => {
  const page = browser({ fetcher: async () => { throw new TypeError('offline'); } });
  page.verify(); await page.submit(); page.download();
  assert.equal(page.state.downloaded, true);
  const draft = JSON.parse(await page.state.draftBlob.text());
  assert.equal(draft.values.vision, 'Original notes');
  const restored = browser(); await restored.restore(draft);
  assert.equal(restored.id.value, page.id.value);
  assert.equal(restored.values.vision, 'Original notes');
  assert.equal(restored.consent.checked, false);
  restored.consent.checked = true; restored.verify(); await restored.submit();
  assert.equal(restored.state.redirects[0], '/thank-you/#receipt=' + page.id.value);
});
test('an old-consent draft is rejected without replacing the current form', async () => {
  const page = browser(); page.download();
  const draft = JSON.parse(await page.state.draftBlob.text());
  draft.consentVersion = 'old'; draft.values.vision = 'Old notes';
  const id = page.id.value; await page.restore(draft);
  assert.equal(page.id.value, id); assert.equal(page.values.vision, 'Original notes');
  assert.match(page.status.textContent, /older privacy note/);
});

for (const finishBeforeRead of [false, true]) {
  test(`a draft read cannot replace a ${finishBeforeRead ? 'completed' : 'sending'} request`, async () => {
    const source = browser(); source.values.vision = 'Recovered draft notes'; source.download();
    const draft = JSON.parse(await source.state.draftBlob.text());
    let finishRead; let finishSend;
    const pendingRead = new Promise(resolve => { finishRead = resolve; });
    const page = browser({ fetcher: () => new Promise(resolve => { finishSend = resolve; }) });
    const originalID = page.id.value;
    const restoring = page.restore(draft, pendingRead);
    page.verify(); const sending = page.submit();
    while (!finishSend) await new Promise(resolve => setImmediate(resolve));
    if (finishBeforeRead) {
      finishSend(Response.json({ ok: true, id: originalID })); await sending;
    }
    finishRead(); await restoring;
    if (!finishBeforeRead) {
      finishSend(Response.json({ ok: true, id: originalID })); await sending;
    }
    assert.equal(page.id.value, originalID);
    assert.equal(page.values.vision, 'Original notes');
    assert.equal(page.consent.checked, true);
    assert.equal(page.storage.size, 0);
    assert.deepEqual(page.state.redirects, ['/thank-you/#receipt=' + originalID]);
  });
}


test('a delayed draft read cannot replace the identity retained after an uncertain send', async () => {
  const source = browser(); source.values.vision = 'Recovered draft notes'; source.download();
  const draft = JSON.parse(await source.state.draftBlob.text());
  let finishRead;
  const pendingRead = new Promise(resolve => { finishRead = resolve; });
  const page = browser({ fetcher: async () => { throw new TypeError('synthetic uncertain receipt'); } });
  const originalID = page.id.value;
  const restoring = page.restore(draft, pendingRead);
  page.verify(); await page.submit();
  const savedAttempt = [...page.storage.values()][0];
  assert.equal(JSON.parse(savedAttempt).id, originalID);
  assert.match(page.status.textContent, /Receipt could not be confirmed/);
  finishRead(); await restoring;
  assert.equal(page.id.value, originalID);
  assert.equal(page.values.vision, 'Original notes');
  assert.equal(page.consent.checked, true);
  assert.equal([...page.storage.values()][0], savedAttempt);
  assert.match(page.status.textContent, /Receipt could not be confirmed/);
  page.verify(); await page.submit();
  assert.equal(page.state.requests.length, 2);
  assert.equal(page.state.requests[0]['submission-id'], page.state.requests[1]['submission-id']);
});

test('starting a separate request invalidates an earlier delayed draft read', async () => {
  const source = browser(); source.values.vision = 'Recovered draft notes'; source.download();
  const draft = JSON.parse(await source.state.draftBlob.text());
  let finishRead;
  const pendingRead = new Promise(resolve => { finishRead = resolve; });
  const page = browser();
  const restoring = page.restore(draft, pendingRead);
  page.startSeparate(); const separateID = page.id.value;
  finishRead(); await restoring;
  assert.equal(page.id.value, separateID);
  assert.equal(page.values.vision, 'Original notes');
  assert.equal(page.consent.checked, true);
  assert.match(page.status.textContent, /separate request is ready/);
});

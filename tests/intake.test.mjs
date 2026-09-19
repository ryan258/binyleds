import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { onRequest } from '../functions/api/consultation.js';
import { onRequest as recover } from '../functions/api/notifications.js';
import { deliver } from '../lib/notifications.mjs';

const schema = readFileSync(new URL('../migrations/0001_consultations.sql', import.meta.url), 'utf8');
const originalFetch = globalThis.fetch;
test.after(() => { globalThis.fetch = originalFetch; });
let fixture;
test.beforeEach(() => {
  const sql = new DatabaseSync(':memory:'); sql.exec(schema);
  const db = { prepare(query) { return { bind(...values) { return {
    async first() { return sql.prepare(query).get(...values) || null; },
    async run() { sql.prepare(query).run(...values); return { success: true }; },
  }; } }; } };
  fixture = { sql, db, jobs: [], sends: [], env: {
    DB: db, INTAKE_ENV: 'production', TURNSTILE_SECRET_KEY: 'real-test-fixture-secret',
    TURNSTILE_HOSTNAMES: 'site.test', CONSENT_VERSION: 'v1',
    CF_ACCOUNT_ID: 'a'.repeat(32), EMAIL_API_TOKEN: 'test-only',
    NOTIFICATION_FROM: 'inquiries@site.test', NOTIFICATION_TO: 'host@example.com',
    OPERATOR_TOKEN: 'test-only-operator-secret-32-characters',
  } };
  globalThis.fetch = async (url, options) => {
    if (String(url).includes('/siteverify')) return Response.json({ success: true, hostname: 'site.test', action: 'consultation' });
    fixture.sends.push(JSON.parse(options.body));
    return Response.json({ success: true, result: { queued: ['host@example.com'] } });
  };
});
test.afterEach(async () => { await Promise.allSettled(fixture.jobs); fixture.sql.close(); });

function fields(changes = {}) {
  return { name: 'Test Host', email: 'client@example.com', city: 'Bentonville',
    'guest-count': '4', 'experience-level': 'Not sure yet', vision: 'A warm gathering',
    boundaries: 'Private accommodation note', 'privacy-consent': 'on', 'consent-version': 'v1',
    'submission-id': crypto.randomUUID(), 'cf-turnstile-response': 'test-token', ...changes };
}
function request(values = fields(), headers = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) if (value !== undefined) data.append(key, value);
  return new Request('https://site.test/api/consultation', { method: 'POST', body: data,
    headers: { Accept: 'application/json', Origin: 'https://site.test', ...headers } });
}
function context(req, env = fixture.env) {
  return { request: req, env, waitUntil(job) { fixture.jobs.push(job); } };
}
function row() { return fixture.sql.prepare('SELECT * FROM consultations').get(); }

test('receipt follows durable storage; notifications omit private notes and set Reply-To', async () => {
  const response = await onRequest(context(request()));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).id, row().id);
  await Promise.all(fixture.jobs);
  assert.equal(row().notification_status, 'accepted');
  assert.equal(fixture.sends[0].replyTo, 'client@example.com');
  assert(!fixture.sends[0].text.includes('Private accommodation note'));
  assert(!fixture.sends[0].text.includes('A warm gathering'));
});
test('concurrent and delayed retries return the same receipt without another accepted send', async () => {
  const data = fields();
  const responses = await Promise.all([onRequest(context(request(data))), onRequest(context(request(data)))]);
  assert.deepEqual(await responses[0].json(), await responses[1].json());
  await Promise.all(fixture.jobs);
  assert.equal((await onRequest(context(request(data)))).status, 200);
  await Promise.all(fixture.jobs);
  assert.equal(fixture.sql.prepare('SELECT count(*) AS n FROM consultations').get().n, 1);
  assert.equal(fixture.sends.length, 1);
});
test('changed payload with the same ID conflicts; a new ID preserves the distinct inquiry', async () => {
  const data = fields(); await onRequest(context(request(data)));
  const second = await onRequest(context(request({ ...data, vision: 'Different plans' })));
  assert.equal(second.status, 409); assert.equal(row().vision, data.vision);
  await onRequest(context(request({ ...data, 'submission-id': crypto.randomUUID(), vision: 'Different plans' })));
  assert.equal(fixture.sql.prepare('SELECT count(*) AS n FROM consultations').get().n, 2);
});
test('uncertain DB acknowledgment retries the committed row', async () => {
  const data = fields(); const realDB = fixture.db;
  const uncertain = { prepare(query) { const stmt = realDB.prepare(query); return { bind(...values) {
    const bound = stmt.bind(...values); return { async first() { await bound.first(); throw new Error('lost acknowledgment'); } };
  } }; } };
  assert.equal((await onRequest(context(request(data), { ...fixture.env, DB: uncertain }))).status, 503);
  assert.equal((await onRequest(context(request(data)))).status, 200);
  assert.equal(fixture.sql.prepare('SELECT count(*) AS n FROM consultations').get().n, 1);
});
test('slow mail never delays the durable receipt', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  globalThis.fetch = async url => String(url).includes('/siteverify')
    ? Response.json({ success: true, hostname: 'site.test', action: 'consultation' })
    : gate;
  const response = await onRequest(context(request()));
  assert.equal(response.status, 200); assert.equal(row().notification_status, 'sending');
  release(Response.json({ success: true, result: { queued: ['host@example.com'] } }));
  await Promise.all(fixture.jobs);
});
test('mail rejection remains an accepted inquiry and can be manually recovered', async () => {
  const goodFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => String(url).includes('/siteverify') ? goodFetch(url, options)
    : Response.json({ success: false }, { status: 500 });
  assert.equal((await onRequest(context(request()))).status, 200);
  await Promise.all(fixture.jobs); assert.equal(row().notification_status, 'failed');
  globalThis.fetch = goodFetch;
  const response = await recover({ env: fixture.env, request: new Request('https://site.test/api/notifications', {
    method: 'POST', headers: { Authorization: `Bearer ${fixture.env.OPERATOR_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: row().id }),
  }) });
  assert.equal((await response.json()).status, 'accepted');
});
test('operator recovery rejects unauthenticated requests', async () => {
  const response = await recover({ env: fixture.env, request: new Request('https://site.test/api/notifications', { method: 'POST', body: '{}' }) });
  assert.equal(response.status, 401); assert.equal(fixture.sends.length, 0);
});
test('missing notification settings are recorded as actionable failure', async () => {
  delete fixture.env.EMAIL_API_TOKEN;
  assert.equal((await onRequest(context(request()))).status, 200);
  await Promise.all(fixture.jobs);
  assert.equal(row().notification_error, 'mail_configuration');
});
test('interrupted sending lease can be reclaimed, active lease cannot', async () => {
  await onRequest(context(request())); await Promise.all(fixture.jobs);
  const id = row().id;
  fixture.sql.prepare("UPDATE consultations SET notification_status='sending', notification_lease_until=?").run(Date.now() + 60000);
  assert.equal((await deliver(fixture.env, id)).status, 'not_claimed');
  fixture.sql.exec('UPDATE consultations SET notification_lease_until=0');
  assert.equal((await deliver(fixture.env, id)).status, 'accepted');
});
test('send-success/status-write-failure leaves a reclaimable lease rather than false failed receipt', async () => {
  const real = fixture.db;
  const db = { prepare(query) {
    if (query.includes('notification_accepted_at =')) return { bind() { return { async run() { throw new Error('write failed'); } }; } };
    return real.prepare(query);
  } };
  assert.equal((await onRequest(context(request(), { ...fixture.env, DB: db }))).status, 200);
  await Promise.all(fixture.jobs); assert.equal(row().notification_status, 'sending');
  assert.equal(fixture.sends.length, 1);
});
for (const setting of ['DB', 'INTAKE_ENV', 'TURNSTILE_SECRET_KEY', 'TURNSTILE_HOSTNAMES', 'CONSENT_VERSION']) {
  test(`missing ${setting} fails closed`, async () => {
    delete fixture.env[setting];
    assert.equal((await onRequest(context(request()))).status, 503);
    assert.equal(row(), undefined);
  });
}
for (const [label, changes] of [
  ['missing token', { 'cf-turnstile-response': undefined }],
  ['invalid date', { 'preferred-date': '2026-02-30' }],
  ['malformed integer', { 'guest-count': '2garbage' }],
  ['small guest count', { 'guest-count': '1' }],
  ['bad choice', { 'experience-level': 'invented' }],
  ['missing consent', { 'privacy-consent': undefined }],
  ['file field', { name: new Blob(['invalid']) }],
  ['header newline', { name: 'Name\r\nBcc: other@example.com' }],
]) {
  test(`rejects ${label} before saving`, async () => {
    assert.equal((await onRequest(context(request(fields(changes))))).status, label === 'missing token' ? 403 : 400);
    assert.equal(row(), undefined);
  });
}
test('large guest counts are not limited by an invented business maximum', async () => {
  assert.equal((await onRequest(context(request(fields({ 'guest-count': '21' }))))).status, 200);
});
test('actual body limit applies without Content-Length', async () => {
  const req = request(fields({ unknown: 'x'.repeat(70000) }));
  assert.equal(req.headers.get('Content-Length'), null);
  assert.equal((await onRequest(context(req))).status, 413); assert.equal(row(), undefined);
});
test('duplicate fields rejected', async () => {
  const data = new FormData(); data.append('name', 'one'); data.append('name', 'two');
  const req = new Request('https://site.test/api/consultation', { method: 'POST', body: data });
  assert.equal((await onRequest(context(req))).status, 400);
});
test('verification outage and invalid hostname/action never save', async () => {
  for (const outcome of [null, { success: false }, { success: true, hostname: 'other.test', action: 'consultation' }, { success: true, hostname: 'site.test', action: 'other' }]) {
    globalThis.fetch = async () => { if (!outcome) throw new Error('outage'); return Response.json(outcome); };
    assert.equal((await onRequest(context(request()))).status, outcome ? 403 : 503);
  }
  assert.equal(row(), undefined);
});
test('honeypot and HTML success have no-store redirects; methods and types are explicit', async () => {
  const bot = await onRequest(context(request(fields({ 'company-website': 'bot' }), { Accept: 'text/html' })));
  assert.equal(bot.status, 303); assert.equal(bot.headers.get('Cache-Control'), 'no-store'); assert.equal(row(), undefined);
  const html = await onRequest(context(request(fields(), { Accept: 'text/html' })));
  assert.equal(html.status, 303); assert.equal(html.headers.get('Location'), 'https://site.test/thank-you/');
  assert.equal((await onRequest(context(new Request('https://site.test/api/consultation')))).status, 405);
  assert.equal((await onRequest(context(new Request('https://site.test/api/consultation', { method: 'POST', body: '{}' })))).status, 415);
});
test('no returned database record cannot count as a receipt', async () => {
  fixture.env.DB = { prepare() { return { bind() { return { async first() { return null; } }; } }; } };
  assert.equal((await onRequest(context(request()))).status, 503);
});
test('schema separates lead closure from notification success', async () => {
  await onRequest(context(request())); await Promise.all(fixture.jobs);
  assert.equal(row().lead_status, 'new');
  assert.throws(() => fixture.sql.exec("UPDATE consultations SET lead_status='closed'"));
  fixture.sql.exec("UPDATE consultations SET lead_status='closed', closed_at=CURRENT_TIMESTAMP");
  assert.equal(row().lead_status, 'closed');
});
test('dummy secret cannot enable deployed intake, while ordinary 0x-prefixed secrets remain valid', async () => {
  fixture.env.TURNSTILE_SECRET_KEY = '1x0000000000000000000000000000000AA';
  assert.equal((await onRequest(context(request()))).status, 503);
  fixture.env.TURNSTILE_SECRET_KEY = '0x4-fake-real-format-fixture';
  assert.equal((await onRequest(context(request()))).status, 200);
});
test('cross-origin requests and unknown runtime modes fail closed', async () => {
  assert.equal((await onRequest(context(request(fields(), { Origin: 'https://other.test' })))).status, 403);
  fixture.env.INTAKE_ENV = 'unknown';
  assert.equal((await onRequest(context(request()))).status, 503);
  assert.equal(row(), undefined);
});
test('provider suppression does not become accepted delivery', async () => {
  const real = globalThis.fetch;
  globalThis.fetch = async (url, options) => String(url).includes('/siteverify') ? real(url, options)
    : Response.json({ success: true, result: { queued: [], suppressed_recipients: ['host@example.com'] } });
  assert.equal((await onRequest(context(request()))).status, 200);
  await Promise.all(fixture.jobs); assert.equal(row().notification_status, 'failed');
});
test('closed-age retention eligibility excludes open, recent, and creation-age-only records', async () => {
  const ids = [];
  for (let i = 0; i < 3; i++) {
    const data = fields(); ids.push(data['submission-id']); await onRequest(context(request(data)));
  }
  await Promise.all(fixture.jobs);
  fixture.sql.exec("UPDATE consultations SET created_at=datetime('now','-120 days')");
  fixture.sql.prepare("UPDATE consultations SET lead_status='closed', closed_at=datetime('now','-100 days') WHERE id=?").run(ids[1]);
  fixture.sql.prepare("UPDATE consultations SET lead_status='closed', closed_at=CURRENT_TIMESTAMP WHERE id=?").run(ids[2]);
  const eligible = fixture.sql.prepare("SELECT id FROM consultations WHERE lead_status='closed' AND closed_at < datetime('now','-90 days')").all();
  assert.deepEqual(eligible.map(record => record.id), [ids[1]]);
});

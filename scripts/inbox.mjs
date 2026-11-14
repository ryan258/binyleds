#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { UUID } from '../lib/intake.mjs';

// Aliases: i (list), r 1 (read), c 1 (contacted), x 1 (closed), n 1 (retry notice).
const aliases = { i: 'list', r: 'read', c: 'contacted', x: 'closed', n: 'retry' };
const [raw = 'list', selection, page = '0'] = process.argv.slice(2);
const action = aliases[raw] || raw;
const clean = value => String(value ?? '').replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, '');
try {
  if (!['list', 'read', 'contacted', 'closed', 'retry'].includes(action)) throw new Error('Use: inbox [i [open|closed|all] [offset] | r number | c number | x number | n number]');
  const origin = new URL(process.env.INTAKE_ORIGIN || '');
  const token = process.env.OPERATOR_TOKEN;
  if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) throw new Error('INTAKE_ORIGIN must be an HTTPS origin.');
  if (!token || token.length < 32) throw new Error('Set OPERATOR_TOKEN in your shell or secret manager.');
  const key = createHash('sha256').update(origin.origin).digest('hex').slice(0, 16);
  const folder = resolve('.local'); const cachePath = join(folder, `inbox-${key}.json`);
  const call = async (path, body) => {
    const response = await fetch(new URL(path, origin), { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
    return result;
  };
  if (action === 'list') {
    const scope = selection || 'open'; const offset = Number(page);
    if (!['open', 'closed', 'all'].includes(scope) || !Number.isSafeInteger(offset) || offset < 0) throw new Error('Use i open, i closed, or i all, optionally followed by an offset.');
    const result = await call('/api/inbox', { action: 'list', scope, offset });
    if (!Array.isArray(result.records)) throw new Error('Unrecognized inbox response.');
    mkdirSync(folder, { recursive: true, mode: 0o700 });
    // Only ID/revision selectors are cached; never names, emails, or private notes.
    writeFileSync(cachePath, JSON.stringify({ origin: origin.origin, at: Date.now(), records: result.records.map(r => ({ id: r.id, revision: r.operator_revision })) }), { mode: 0o600 });
    chmodSync(cachePath, 0o600);
    result.records.forEach((r, i) => console.log(`${i + 1}. ${clean(r.name)} — ${clean(r.city)} — ${r.lead_status} — notification: ${r.notification_status}${r.notification_error ? ` (${r.notification_error})` : ''}`));
    if (!result.records.length) console.log('No inquiries in this view.');
    if (result.records.length === 50) console.log(`Next page: npm run inbox -- i ${scope} ${offset + 50}`);
    console.log('Use r 1 to read, c 1 to mark contacted, x 1 to close, n 1 to retry a notification. Selectors expire after 15 minutes.');
  } else {
    const index = Number(selection);
    if (!Number.isSafeInteger(index) || index < 1) throw new Error('Use the number from your latest list.');
    let cache;
    try { cache = JSON.parse(readFileSync(cachePath, 'utf8')); } catch { throw new Error('List the inbox first: npm run inbox -- i'); }
    if (cache.origin !== origin.origin || !Number.isFinite(cache.at) || Date.now() - cache.at > 900000 || cache.at > Date.now()) throw new Error('List again to refresh the selectors.');
    const record = cache.records?.[index - 1];
    if (!UUID.test(record?.id || '') || !Number.isSafeInteger(record.revision)) throw new Error('This number is not in your latest list.');
    if (action === 'retry') {
      const result = await call('/api/notifications', { id: record.id });
      console.log(`Notification: ${clean(result.status)}. This is separate from inquiry status.`);
      if (result.status !== 'accepted') process.exitCode = 1;
    } else {
      const result = await call('/api/inbox', action === 'read' ? { action, id: record.id }
        : { action: 'status', id: record.id, status: action, revision: record.revision });
      console.log(clean(JSON.stringify(result.record, null, 2)));
      if (action !== 'read') console.log('List again before making another status change.');
    }
  }
} catch (error) { console.error(clean(error.message)); process.exitCode = 1; }

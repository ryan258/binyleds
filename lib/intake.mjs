export const HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class IntakeError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function reply(status, body, extra = {}) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...HEADERS, 'Content-Type': 'application/json; charset=utf-8', ...extra },
  });
}
export async function digest(value) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))]
    .map(b => b.toString(16).padStart(2, '0')).join('');
}
export function runtime(env, request) {
  if (!['production', 'preview', 'local'].includes(env.INTAKE_ENV) || !env.DB ||
      !env.TURNSTILE_SECRET_KEY || !env.TURNSTILE_HOSTNAMES || !env.CONSENT_VERSION) {
    throw new IntakeError(503, 'The form is temporarily unavailable. Please use the contact address shown beside the form.');
  }
  const hosts = env.TURNSTILE_HOSTNAMES.split(',').map(s => s.trim()).filter(Boolean);
  const url = new URL(request.url);
  if (!hosts.includes(url.hostname)) throw new IntakeError(403, 'This form address is not enabled.');
  if (request.headers.get('Origin') && request.headers.get('Origin') !== url.origin) {
    throw new IntakeError(403, 'Please submit from this site.');
  }
  // Cloudflare's documented dummy keys may only be used on loopback development.
  if (/^[123]x0+AA$/.test(env.TURNSTILE_SECRET_KEY) && env.INTAKE_ENV !== 'local') {
    throw new IntakeError(503, 'Live verification is not configured.');
  }
  if (env.INTAKE_ENV === 'local' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new IntakeError(503, 'Local configuration cannot serve this address.');
  }
  return hosts;
}
export async function boundedBody(request, limit = 65536) {
  const reader = request.body?.getReader();
  if (!reader) throw new IntakeError(400, 'A form submission is required.');
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new IntakeError(413, 'The submission is too large. Please shorten it.');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
  return body;
}
const LIMITS = {
  name: 100, email: 254, phone: 30, city: 100, 'preferred-date': 10,
  'guest-count': 16, 'experience-level': 80, occasion: 200, 'desired-feeling': 80,
  vision: 4000, boundaries: 2000, 'privacy-consent': 2, 'consent-version': 100,
  'submission-id': 36, 'cf-turnstile-response': 2048, 'company-website': 200,
};
export async function parseForm(request) {
  const type = request.headers.get('Content-Type') || '';
  if (!/^(application\/x-www-form-urlencoded|multipart\/form-data)(;|$)/i.test(type)) {
    throw new IntakeError(415, 'Use the consultation form to submit your request.');
  }
  const body = await boundedBody(request);
  let data;
  try { data = await new Response(body, { headers: { 'Content-Type': type } }).formData(); }
  catch { throw new IntakeError(400, 'The form could not be read.'); }
  const result = {};
  for (const [key, value] of data) {
    if (!Object.hasOwn(LIMITS, key) || Object.hasOwn(result, key) || typeof value !== 'string') {
      throw new IntakeError(400, 'The form contains an unsupported or repeated field.');
    }
    if (value.length > LIMITS[key] || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) {
      throw new IntakeError(400, `Please check the ${key} field.`);
    }
    result[key] = value.trim();
  }
  return result;
}
export function validate(data, consentVersion) {
  const fail = message => { throw new IntakeError(400, message); };
  for (const key of ['name', 'email', 'city', 'vision']) if (!data[key]) fail(`Please complete ${key}.`);
  for (const key of ['name', 'email', 'city', 'phone', 'occasion']) {
    if (/[\r\n]/.test(data[key] || '')) fail(`Please check ${key}.`);
  }
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(data.email)) fail('Please enter a valid email address.');
  if (!/^\d+$/.test(data['guest-count'] || '')) fail('Expected guests must be a whole number.');
  const count = Number(data['guest-count']);
  if (!Number.isSafeInteger(count) || count < 2) fail('Expected guests must be at least two.');
  if (!['Mostly new players', 'A mix of new and experienced players', 'Mostly experienced players', 'Not sure yet'].includes(data['experience-level'])) fail('Please choose a tabletop experience.');
  if (data['desired-feeling'] && !['Triumph', 'Mystery and intrigue', 'Laughter and warmth', 'Quiet connection', 'Not sure yet'].includes(data['desired-feeling'])) fail('Please choose a listed feeling.');
  if (data['privacy-consent'] !== 'on') fail('Please agree to the privacy note.');
  if (data['consent-version'] !== consentVersion) throw new IntakeError(409, 'The privacy note changed. Copy your notes before reloading and reviewing it.');
  const date = data['preferred-date'];
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number(date.slice(0, 4)) < 1 ||
      !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) fail('Please enter a real calendar date.');
  if (!UUID.test(data['submission-id'] || '')) fail('Please enable JavaScript or use the contact address beside the form.');
  // Fixed order is the canonical representation used for retry comparisons.
  return {
    name: data.name, email: data.email, phone: data.phone || null, city: data.city,
    preferred_date: date || null, guest_count: count, experience_level: data['experience-level'],
    occasion: data.occasion || null, desired_feeling: data['desired-feeling'] || null,
    vision: data.vision, boundaries: data.boundaries || null, consent_version: consentVersion,
  };
}
export async function verifyToken(data, env, hosts, fetcher = fetch) {
  if (!data['cf-turnstile-response']) throw new IntakeError(403, 'Please complete verification before sending.');
  let result;
  try {
    const response = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', signal: AbortSignal.timeout(8000),
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: data['cf-turnstile-response'] }),
    });
    if (!response.ok) throw new Error('verification_unavailable');
    result = await response.json();
  } catch { throw new IntakeError(503, 'Verification is temporarily unavailable. Your entries are still here; please try again.'); }
  if (!result.success || (env.INTAKE_ENV !== 'local' &&
      (!hosts.includes(result.hostname) || result.action !== 'consultation'))) {
    throw new IntakeError(403, 'Verification expired or failed. Please verify again.');
  }
}
export async function saveInquiry(db, id, payload) {
  const hash = await digest(JSON.stringify(payload));
  const row = await db.prepare(`
    INSERT INTO consultations (id, payload_hash, name, email, phone, city, preferred_date,
      guest_count, experience_level, occasion, desired_feeling, vision, boundaries, consent_version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET id = excluded.id
    RETURNING id, payload_hash
  `).bind(id, hash, ...Object.values(payload)).first();
  if (!row?.id) throw new Error('missing_receipt');
  if (row.payload_hash !== hash) throw new IntakeError(409, 'This request ID already belongs to different details. Resolve the earlier request before starting another.');
  return row.id;
}

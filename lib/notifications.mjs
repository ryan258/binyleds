import { assertEnvironment } from './environment.mjs';
// A lease serializes delivery attempts. It does not promise exactly-once mail:
// a provider can accept a send immediately before the status write fails.
export async function deliver(env, id, fetcher = fetch, now = Date.now()) {
  await assertEnvironment(env);
  const claim = crypto.randomUUID();
  const row = await env.DB.prepare(`UPDATE consultations SET
    notification_status = 'sending', notification_claim = ?, notification_lease_until = ?,
    notification_attempts = notification_attempts + 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND purged_at IS NULL AND (
      notification_status IN ('pending', 'failed') OR
      (notification_status = 'sending' AND notification_lease_until < ?))
    RETURNING id, name, email, city, guest_count
  `).bind(claim, now + 60000, id, now).first();
  if (!row) return { status: 'not_claimed' };
  let status = 'failed'; let error = 'mail_unavailable';
  try {
    if (!['production', 'preview'].includes(env.INTAKE_ENV) ||
        !/^[a-f0-9]{32}$/i.test(env.CF_ACCOUNT_ID || '') || !env.EMAIL_API_TOKEN ||
        !validEmail(env.NOTIFICATION_FROM) || !validEmail(env.NOTIFICATION_TO)) {
      error = 'mail_configuration';
      throw new Error(error);
    }
    const response = await fetcher(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/email/sending/send`, {
      method: 'POST', signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${env.EMAIL_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.NOTIFICATION_FROM, to: env.NOTIFICATION_TO, reply_to: row.email,
        subject: `${env.INTAKE_ENV === 'preview' ? '[PREVIEW] ' : ''}Consultation ${row.id}`,
        text: [
          `Saved inquiry: ${row.id}`, `Name: ${row.name}`, `Email: ${row.email}`,
          `City: ${row.city}`, `Expected guests: ${row.guest_count}`,
          'Reply directly to contact this person. Read the full inquiry through your private inquiry inbox.',
          'Vision and accommodation notes are intentionally excluded from email.',
        ].join('\n'),
      }),
    });
    const body = await response.json();
    const accepted = [...(body.result?.delivered || []), ...(body.result?.queued || [])];
    if (!response.ok || body.success !== true || !accepted.includes(env.NOTIFICATION_TO) ||
        body.result?.permanent_bounces?.includes(env.NOTIFICATION_TO) ||
        body.result?.suppressed_recipients?.includes(env.NOTIFICATION_TO)) {
      error = 'provider_rejected';
      throw new Error(error);
    }
    status = 'accepted'; error = null;
  } catch { /* Store only stable error codes, never provider payloads or secrets. */ }
  await env.DB.prepare(`UPDATE consultations SET notification_status = ?, notification_error = ?,
    notification_claim = NULL, notification_lease_until = NULL,
    notification_accepted_at = CASE WHEN ? = 'accepted' THEN CURRENT_TIMESTAMP ELSE notification_accepted_at END,
    updated_at = CURRENT_TIMESTAMP WHERE id = ? AND notification_claim = ?
  `).bind(status, error, status, id, claim).run();
  return { status };
}
function validEmail(value) {
  return typeof value === 'string' && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
}

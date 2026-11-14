import { boundedBody, IntakeError, reply, UUID } from '../../lib/intake.mjs';
import { authorizeOperator } from '../../lib/operator.mjs';

// No cookies, public reads, or client-side credential storage. Every action is authenticated.
export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return reply(405, { error: 'Use POST.' }, { Allow: 'POST' });
  try {
    await authorizeOperator(request, env);
    if (request.headers.get('Content-Type') !== 'application/json') return reply(415, { error: 'Use JSON.' });
    const body = JSON.parse(new TextDecoder().decode(await boundedBody(request, 512)));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new IntakeError(400, 'Supply an action.');
    const contracts = { list: ['action', 'scope', 'offset'], read: ['action', 'id'], status: ['action', 'id', 'status', 'revision'] };
    const allowed = Object.hasOwn(contracts, body.action) ? contracts[body.action] : null;
    if (!allowed || Object.keys(body).some(key => !allowed.includes(key))) throw new IntakeError(400, 'Unsupported action or field.');
    if (body.action === 'list') {
      if (!['open', 'closed', 'all'].includes(body.scope) || !Number.isSafeInteger(body.offset) || body.offset < 0) throw new IntakeError(400, 'Supply a scope and nonnegative offset.');
      const result = await env.DB.prepare(`SELECT id, name, city, guest_count, lead_status, notification_status,
        notification_error, operator_revision, created_at FROM consultations WHERE purged_at IS NULL
        AND (? = 'all' OR (? = 'closed' AND lead_status = 'closed') OR (? = 'open' AND lead_status != 'closed'))
        ORDER BY created_at DESC, id DESC LIMIT 50 OFFSET ?`).bind(body.scope, body.scope, body.scope, body.offset).all();
      return reply(200, { records: result.results, offset: body.offset, pageSize: 50 });
    }
    if (!UUID.test(body.id || '')) throw new IntakeError(400, 'Supply one inquiry ID.');
    if (body.action === 'read') {
      const record = await env.DB.prepare(`SELECT id, name, email, phone, city, preferred_date, guest_count,
        experience_level, occasion, desired_feeling, vision, boundaries, consent_version, consent_at,
        lead_status, contacted_at, closed_at, notification_status, notification_error, operator_revision,
        created_at FROM consultations WHERE id = ? AND purged_at IS NULL`).bind(body.id).first();
      return record ? reply(200, { record }) : reply(404, { error: 'Inquiry not found.' });
    }
    if (!['contacted', 'closed'].includes(body.status) || !Number.isSafeInteger(body.revision) || body.revision < 1) throw new IntakeError(400, 'Supply a status and current revision.');
    const record = await env.DB.prepare(`UPDATE consultations SET lead_status = ?,
      contacted_at = CASE WHEN ? = 'contacted' THEN COALESCE(contacted_at, CURRENT_TIMESTAMP) ELSE contacted_at END,
      closed_at = CASE WHEN ? = 'closed' THEN CURRENT_TIMESTAMP ELSE NULL END,
      operator_revision = operator_revision + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND operator_revision = ? AND purged_at IS NULL AND lead_status != 'closed'
      RETURNING id, lead_status, operator_revision`).bind(body.status, body.status, body.status, body.id, body.revision).first();
    return record ? reply(200, { record }) : reply(409, { error: 'Inquiry changed or is closed. List again before continuing.' });
  } catch (error) {
    if (error instanceof IntakeError) return reply(error.status, { error: error.message, code: error.code });
    if (error instanceof SyntaxError) return reply(400, { error: 'Use valid JSON.' });
    return reply(503, { error: 'Inbox is temporarily unavailable.' });
  }
}

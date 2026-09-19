import { HEADERS, IntakeError, parseForm, reply, runtime, saveInquiry, validate, verifyToken } from '../../lib/intake.mjs';
import { deliver } from '../../lib/notifications.mjs';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return reply(405, { error: 'Use POST.' }, { Allow: 'POST' });
  try {
    const hosts = runtime(env, request);
    const data = await parseForm(request);
    if (data['company-website']) return success(request);
    const payload = validate(data, env.CONSENT_VERSION);
    await verifyToken(data, env, hosts);
    const id = await saveInquiry(env.DB, data['submission-id'], payload);
    // Persistence is complete. Best-effort background delivery has a separate
    // authenticated recovery route; it can never change this visitor's receipt.
    try {
      context.waitUntil(deliver(env, id).catch(() => console.error('notification_recovery_required')));
    } catch { console.error('notification_not_scheduled'); }
    return success(request, id);
  } catch (error) {
    if (error instanceof IntakeError) return reply(error.status, { error: error.message });
    console.error('intake_unavailable');
    return reply(503, { error: 'Receipt could not be confirmed. Keep these details and retry with the same request, or use the contact address beside the form.' });
  }
}
function success(request, id) {
  if (request.headers.get('Accept')?.includes('application/json')) return reply(200, { ok: true, ...(id ? { id } : {}) });
  return new Response(null, { status: 303, headers: { ...HEADERS, Location: new URL('/thank-you/', request.url).href } });
}

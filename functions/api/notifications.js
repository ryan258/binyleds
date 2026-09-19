import { boundedBody, digest, IntakeError, reply, UUID } from '../../lib/intake.mjs';
import { deliver } from '../../lib/notifications.mjs';

// Manual operator recovery only. No public list or query of private inquiries.
export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return reply(405, { error: 'Use POST.' }, { Allow: 'POST' });
  if (!env.DB || typeof env.OPERATOR_TOKEN !== 'string' || env.OPERATOR_TOKEN.length < 32) {
    return reply(503, { error: 'Operator recovery is not configured.' });
  }
  const supplied = request.headers.get('Authorization') || '';
  if (supplied.length > 512) return reply(401, { error: 'Unauthorized.' });
  const a = await digest(supplied); const b = await digest(`Bearer ${env.OPERATOR_TOKEN}`);
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  if (mismatch) return reply(401, { error: 'Unauthorized.' });
  try {
    if (request.headers.get('Content-Type') !== 'application/json') return reply(415, { error: 'Use JSON.' });
    const body = JSON.parse(new TextDecoder().decode(await boundedBody(request, 128)));
    if (!UUID.test(body.id || '') || Object.keys(body).length !== 1) return reply(400, { error: 'Supply one inquiry ID.' });
    return reply(200, await deliver(env, body.id));
  } catch (error) {
    if (error instanceof IntakeError) return reply(error.status, { error: error.message });
    if (error instanceof SyntaxError || error instanceof TypeError) return reply(400, { error: 'Supply one inquiry ID as JSON.' });
    return reply(503, { error: 'Recovery could not be confirmed. Check delivery state before retrying.' });
  }
}

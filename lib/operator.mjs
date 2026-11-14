import { digest, IntakeError } from './intake.mjs';
import { assertEnvironment } from './environment.mjs';

export async function authorizeOperator(request, env) {
  if (typeof env.OPERATOR_TOKEN !== 'string' || env.OPERATOR_TOKEN.length < 32) {
    throw new IntakeError(503, 'Operator access is not configured.', 'operator_unavailable');
  }
  const supplied = request.headers.get('Authorization') || '';
  if (supplied.length > 512) throw new IntakeError(401, 'Unauthorized.', 'unauthorized');
  const a = await digest(supplied); const b = await digest(`Bearer ${env.OPERATOR_TOKEN}`);
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  if (mismatch) throw new IntakeError(401, 'Unauthorized.', 'unauthorized');
  await assertEnvironment(env);
}

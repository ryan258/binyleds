import { UUID } from '../lib/intake.mjs';
try {
  const id = process.argv[2];
  const origin = new URL(process.env.INTAKE_ORIGIN || '');
  const token = process.env.OPERATOR_TOKEN;
  if (!UUID.test(id || '') || !token || token.length < 32 || origin.protocol !== 'https:' ||
      origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) {
    throw new Error('Set INTAKE_ORIGIN (HTTPS origin) and OPERATOR_TOKEN, then pass one inquiry UUID. For short selectors use npm run inbox -- i.');
  }
  const response = await fetch(new URL('/api/notifications', origin), {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20000),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  const body = await response.json();
  console.log(response.ok ? `Notification: ${body.status}` : `Recovery failed (${response.status}).`);
  if (!response.ok || body.status !== 'accepted') process.exitCode = 1;
} catch { console.error('Recovery could not be confirmed. Check configuration and delivery state before retrying.'); process.exitCode = 1; }

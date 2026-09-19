import { UUID } from '../lib/intake.mjs';

const id = process.argv[2];
const origin = process.env.INTAKE_ORIGIN;
const token = process.env.OPERATOR_TOKEN;
if (!UUID.test(id || '') || !origin || !token || new URL(origin).protocol !== 'https:') {
  console.error('Set INTAKE_ORIGIN (https) and OPERATOR_TOKEN in your environment, then pass one inquiry UUID.');
  process.exit(1);
}
const response = await fetch(new URL('/api/notifications', origin), {
  method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20000),
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ id }),
});
const body = await response.json();
console.log(body);
if (!response.ok || body.status !== 'accepted') process.exitCode = 1;

import { IntakeError } from './intake.mjs';

// A binding name alone cannot prove that preview and production are isolated.
// Provision this marker once in each database; application code never changes it.
export async function assertEnvironment(env) {
  if (!env.DB || !['production', 'preview', 'local'].includes(env.INTAKE_ENV)) {
    throw new IntakeError(503, 'Intake is not configured.', 'environment_unavailable');
  }
  const marker = await env.DB.prepare('SELECT environment FROM intake_environment WHERE singleton = ?').bind(1).first();
  if (marker?.environment !== env.INTAKE_ENV) {
    throw new IntakeError(503, 'Intake is temporarily unavailable. Please try again later.', 'environment_mismatch');
  }
}

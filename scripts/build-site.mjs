import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const profile = process.env.SITE_PROFILE || 'exemplar';
const backend = process.env.INTAKE_BACKEND || 'disabled';
const production = process.env.SITE_ENV === 'production';
const readableOutput = process.env.SITE_MINIFY === 'false';
const base = process.env.SITE_URL || 'http://localhost:1313/';
const contact = process.env.INTAKE_CONTACT_EMAIL || '';
if (!['exemplar', 'client', 'remote'].includes(profile)) throw new Error('Unknown SITE_PROFILE.');
if (!['disabled', 'netlify'].includes(backend)) throw new Error('Use build:cloudflare for Cloudflare intake.');
const url = new URL(base);
if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('Use a site URL without credentials, query, or fragment.');
if (production && (url.protocol !== 'https:' || /(^|\.)example\.(org|com|net)$/.test(url.hostname))) throw new Error('Production requires an explicit HTTPS site URL.');
if (backend === 'netlify' && (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(contact))) throw new Error('Active Netlify intake requires INTAKE_CONTACT_EMAIL.');
const temp = mkdtempSync(join(tmpdir(), 'storyscape-profile-'));
try {
  const override = join(temp, 'site.json');
  writeFileSync(override, JSON.stringify({
    params: { intakeBackend: backend, intakeContactEmail: contact, readableOutput },
    ...(readableOutput ? { minify: { minifyOutput: false } } : {}),
  }));
  const configs = ['hugo.yaml'];
  if (profile !== 'exemplar') configs.push(`config/${profile}.json`);
  configs.push(override);
  const destination = resolve(process.env.BUILD_DESTINATION || 'public');
  const args = ['--config', configs.join(','), '--gc', '--panicOnWarning', '--cleanDestinationDir',
    '--baseURL', url.href, '--environment', production ? 'production' : 'staging', '--destination', destination];
  if (!readableOutput) args.push('--minify');
  if (!production) args.push('--disableKinds', 'sitemap');
  for (const [command, commandArgs] of [
    ['node', ['scripts/check-source.mjs']], ['hugo', args],
    ['python3', ['scripts/audit_site.py', destination, '--base-url', url.href, '--profile', profile, ...(!production ? ['--expect-noindex'] : [])]],
  ]) {
    const result = spawnSync(command, commandArgs, { stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) { process.exitCode = result.status ?? 1; break; }
  }
} finally { rmSync(temp, { recursive: true, force: true }); }

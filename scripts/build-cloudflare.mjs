import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const mode = process.env.INTAKE_ENV;
if (!['production', 'preview', 'local'].includes(mode)) throw new Error('Set INTAKE_ENV to production, preview, or local.');
const base = mode === 'production' ? process.env.PRODUCTION_URL : process.env.CF_PAGES_URL;
const contact = process.env.INTAKE_CONTACT_EMAIL;
const key = process.env.TURNSTILE_SITE_KEY;
const consent = process.env.CONSENT_VERSION;
// INTAKE_CONTACT_EMAIL is optional: leave it unset to keep the address off the public site.
if (!base || !key || !consent) throw new Error('Set the canonical/deployment URL, TURNSTILE_SITE_KEY, and CONSENT_VERSION.');
const url = new URL(base);
if (contact && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(contact)) throw new Error('Invalid fallback contact email.');
if (url.pathname !== '/' || url.search || url.hash || url.username || url.password) throw new Error('Cloudflare intake requires an origin URL, without a subpath or credentials.');
if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Use an HTTP or HTTPS origin.');
if (mode === 'local' ? !['localhost', '127.0.0.1'].includes(url.hostname) : url.protocol !== 'https:') throw new Error('Use HTTPS for deployed sites and loopback for local development.');
if (mode === 'production' && (url.hostname.endsWith('.pages.dev') || /(^|\.)example\.(org|com|net)$/.test(url.hostname))) throw new Error('Production requires the actual custom domain.');
if (mode !== 'local' && /^[123]x0+(AA|AB|BB|FF)$/.test(key)) throw new Error('Dummy Turnstile sitekeys cannot protect a deployed form.');
const temp = mkdtempSync(join(tmpdir(), 'storyscape-build-'));
try {
  const override = join(temp, 'intake.json');
  writeFileSync(override, JSON.stringify({ params: {
    intakeBackend: 'cloudflare', turnstileSiteKey: key,
    intakeContactEmail: contact || '', intakeConsentVersion: consent,
  } }));
  const args = ['--config', `hugo.yaml,config/client.json,${override}`, '--gc', '--minify', '--panicOnWarning',
    '--cleanDestinationDir', '--baseURL', url.href, '--environment', mode === 'production' ? 'production' : 'staging'];
  if (mode !== 'production') args.push('--disableKinds', 'sitemap');
  if (process.env.BUILD_DESTINATION) args.push('--destination', process.env.BUILD_DESTINATION);
  const destination = resolve(process.env.BUILD_DESTINATION || 'public');
  for (const [command, commandArgs] of [
    ['node', ['scripts/check-source.mjs']], ['hugo', args],
    ['python3', ['scripts/audit_site.py', destination, '--base-url', url.href, '--profile', 'client', ...(mode !== 'production' ? ['--expect-noindex'] : [])]],
  ]) {
    const result = spawnSync(command, commandArgs, { stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) { process.exitCode = result.status ?? 1; break; }
  }
} finally { rmSync(temp, { recursive: true, force: true }); }

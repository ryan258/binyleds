import './check-runtime.mjs';
import { readFileSync, existsSync } from 'node:fs';
const read = path => readFileSync(path, 'utf8');
const failures = [];
const versions = ['netlify.toml', '.github/workflows/build.yml'].map(path => [path, read(path).match(/HUGO_VERSION[\s=:]+["']?([\d.]+)/)?.[1]]);
if (!versions[0][1] || versions.some(([, version]) => version !== versions[0][1])) failures.push('Hosted Hugo version pins disagree.');
const manifest = JSON.parse(read('data/release.json'));
for (const file of manifest.staticAssets) if (!existsSync(`static/${file}`)) failures.push(`Missing declared static asset: ${file}`);
if (new Set(manifest.staticAssets).size !== manifest.staticAssets.length) failures.push('Repeated static asset in release manifest.');
const pkg = JSON.parse(read('package.json'));
if (pkg.engines.node !== '>=22.13.0') failures.push('Node floor must include unflagged node:sqlite.');
const schema = JSON.parse(read('data/module_schema.json'));
for (const template of [...read('data/modules.yaml').matchAll(/^  template: (\S+)/gm)].map(match => match[1])) {
  if (!schema[template] || !existsSync(`layouts/_partials/sections/${template}.html`)) failures.push(`Module has no template/schema: ${template}`);
}
const edgeHeaders = read('static/_headers');
const netlify = read('netlify.toml');
for (const [name, value] of Object.entries({
  'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
})) {
  if (!edgeHeaders.includes(`${name}: ${value}`) || !netlify.includes(`${name} = "${value}"`)) {
    failures.push(`Shared security header drift: ${name}`);
  }
}
for (const directive of ["default-src 'self'", "form-action 'self'", "base-uri 'self'", "frame-ancestors 'none'"]) {
  if (!edgeHeaders.includes(directive) || !netlify.includes(directive)) failures.push(`Shared CSP directive missing: ${directive}`);
}
if (failures.length) { failures.forEach(message => console.error(message)); process.exitCode = 1; }
else console.log('Source contracts passed.');

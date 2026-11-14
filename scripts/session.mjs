import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

const pack = process.argv[2] || 'lantern-bay';
if (pack !== 'lantern-bay') throw new Error('Available session pack: lantern-bay');
const source = resolve('examples', pack);
const folder = resolve('.local/sessions');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const destination = join(folder, `${pack}-${stamp}`);
mkdirSync(folder, { recursive: true, mode: 0o700 });
mkdirSync(destination, { mode: 0o700 }); // Refuses to overwrite an existing session.
const manifest = { format: 'storyscape-session-source-v1', pack, createdAt: new Date().toISOString(), evidence: 'starting files only; no session or approval inferred', files: [] };
for (const entry of readdirSync(source, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const content = readFileSync(join(source, entry.name));
  writeFileSync(join(destination, entry.name), content, { flag: 'wx', mode: 0o600 });
  manifest.files.push({ path: entry.name, sha256: createHash('sha256').update(content).digest('hex') });
}
writeFileSync(join(destination, 'source-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(`Private working copy created: ${destination}`);
console.log('Start with README.md. Nothing was sent or published.');

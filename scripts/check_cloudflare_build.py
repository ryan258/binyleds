"""Focused generated-output checks for the opt-in hosting migration."""
import os
from pathlib import Path
import subprocess
import tempfile
from html.parser import HTMLParser
ROOT = Path(__file__).resolve().parents[1]
BUILD_KEYS = {'SITE_PROFILE', 'SITE_ENV', 'SITE_URL', 'INTAKE_BACKEND', 'INTAKE_ENV', 'INTAKE_CONTACT_EMAIL', 'TURNSTILE_SITE_KEY', 'CONSENT_VERSION', 'PRODUCTION_URL', 'CF_PAGES_URL', 'BUILD_DESTINATION'}
BASE_ENV = {key: value for key, value in os.environ.items() if key not in BUILD_KEYS}

class Page(HTMLParser):

    def __init__(self, path):
        super().__init__()
        self.tags = []
        self.feed(path.read_text())

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))

    def find(self, tag, key, value):
        return next((attrs for name, attrs in self.tags if name == tag and attrs.get(key) == value))

def run(command, env=None, ok=True):
    result = subprocess.run(command, cwd=ROOT, env=env, capture_output=True, text=True)
    if (result.returncode == 0) != ok:
        raise AssertionError(result.stdout + result.stderr)
with tempfile.TemporaryDirectory(prefix='storyscape-hosting-') as temp:
    for mode in ('production', 'preview'):
        output = Path(temp) / mode
        env = dict(BASE_ENV, INTAKE_ENV=mode, PRODUCTION_URL='https://storyscape.test/', CF_PAGES_URL='https://preview.storyscape.test/', INTAKE_CONTACT_EMAIL='host@storyscape.test', TURNSTILE_SITE_KEY='fixture-not-a-real-key', CONSENT_VERSION='test-v1', BUILD_DESTINATION=str(output))
        run(['node', 'scripts/build-cloudflare.mjs'], env)
        page = Page(output / 'consultation/index.html')
        form = page.find('form', 'name', 'private-consultation')
        if not (form['action'] == '/api/consultation' and 'data-cloudflare-intake' in form):
            raise AssertionError('form["action"] == "/api/consultation" and "data-cloudflare-intake" in form')
        if not 'data-netlify' not in form:
            raise AssertionError('"data-netlify" not in form')
        robots = page.find('meta', 'name', 'robots')['content']
        if not robots == ('index, follow' if mode == 'production' else 'noindex, nofollow'):
            raise AssertionError('robots == ("index, follow" if mode == "production" else "noindex, nofollow")')
        canonical = page.find('link', 'rel', 'canonical')['href']
        if not canonical == (env['PRODUCTION_URL'] if mode == 'production' else env['CF_PAGES_URL']) + 'consultation/':
            raise AssertionError('canonical == (env["PRODUCTION_URL"] if mode == "production" else env["CF_PAGES_URL"]) + "consultation/"')
        if not (output / 'sitemap.xml').exists() == (mode == 'production'):
            raise AssertionError('(output / "sitemap.xml").exists() == (mode == "production")')
        if not not (output / 'module-showcase/index.html').exists():
            raise AssertionError('not (output / "module-showcase/index.html").exists()')
        if not 'Cloudflare D1' in (output / 'privacy/index.html').read_text():
            raise AssertionError('"Cloudflare D1" in (output / "privacy/index.html").read_text()')
        if not ((output / '_headers').is_file() and (output / '_routes.json').is_file()):
            raise AssertionError('(output / "_headers").is_file() and (output / "_routes.json").is_file()')
        run(['python3', 'scripts/audit_site.py', str(output), '--profile', 'client'] + (['--expect-noindex'] if mode == 'preview' else []))
        run(['node', 'scripts/build-cloudflare.mjs'], dict(env, TURNSTILE_SITE_KEY='1x00000000000000000000AA'), ok=False)
    output = Path(temp) / 'mirror'
    run(['hugo', '--gc', '--minify', '--panicOnWarning', '--cleanDestinationDir', '--environment', 'staging', '--disableKinds', 'sitemap', '--baseURL', 'https://example.test/binyleds/', '--destination', str(output)])
    page = Page(output / 'consultation/index.html')
    form = page.find('form', 'name', 'private-consultation')
    if not ('data-cloudflare-intake' not in form and 'data-intake-disabled' in form):
        raise AssertionError('"data-cloudflare-intake" not in form and "data-netlify" in form')
    if not form['action'] == '/binyleds/thank-you/':
        raise AssertionError('form["action"] == "/binyleds/thank-you/"')
    if not 'disabled' in page.find('button', 'type', 'submit'):
        raise AssertionError('"disabled" in page.find("button", "type", "submit")')
    if not 'submissions are not received' in (output / 'consultation/index.html').read_text():
        raise AssertionError('"submissions are not received" in (output / "consultation/index.html").read_text()')
    output = Path(temp) / 'netlify'
    run(['node', 'scripts/build-site.mjs'], dict(BASE_ENV, SITE_PROFILE='client', SITE_ENV='production', SITE_URL='https://netlify.test/', INTAKE_BACKEND='netlify', INTAKE_CONTACT_EMAIL='host@netlify.test', BUILD_DESTINATION=str(output)))
    page = Page(output / 'consultation/index.html')
    if not 'data-netlify' in page.find('form', 'name', 'private-consultation'):
        raise AssertionError('"data-netlify" in page.find("form", "name", "private-consultation")')
    if not 'disabled' not in page.find('button', 'type', 'submit'):
        raise AssertionError('"disabled" not in page.find("button", "type", "submit")')
    output = Path(temp) / 'remote'
    run(['node', 'scripts/build-site.mjs'], dict(BASE_ENV, SITE_PROFILE='remote', SITE_ENV='preview', SITE_URL='http://localhost:1313/', INTAKE_BACKEND='disabled', BUILD_DESTINATION=str(output)))
    if 'Wayfarer Table' not in (output / 'index.html').read_text():
        raise AssertionError('Remote example identity missing')
print('Hosting mode checks passed: Cloudflare production/preview, static mirror, Netlify fallback, and dummy-key rejection.')

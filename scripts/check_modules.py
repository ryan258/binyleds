"""Targeted build checks for composition, variants, and workshop boundaries."""
from __future__ import annotations
import re
import shutil
import sys
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urlsplit, unquote
sys.dont_write_bytecode = True
from audit_site import PageParser
ROOT = Path(__file__).resolve().parents[1]

class ModuleParser(PageParser):

    def __init__(self):
        super().__init__()
        self.modules = []
        self.aria_refs = []

    def handle_starttag(self, tag, attrs):
        super().handle_starttag(tag, attrs)
        values = dict(attrs)
        if 'data-section-module' in values:
            self.modules.append((values['data-section-module'], values['id']))
        for attribute in ('aria-labelledby', 'aria-describedby', 'aria-controls'):
            self.aria_refs.extend((values.get(attribute) or '').split())

def inspect(page):
    parser = ModuleParser()
    parser.feed(page.read_text())
    if not len(parser.ids) == len(set(parser.ids)):
        raise AssertionError(f'{page}: duplicate IDs')
    if not parser.headings.count(1) == 1:
        raise AssertionError(f'{page}: expected one h1')
    if not all((b <= a + 1 for a, b in zip(parser.headings, parser.headings[1:]))):
        raise AssertionError(f'{page}: heading jump')
    if not not parser.images_without_alt:
        raise AssertionError(f'{page}: missing image descriptions')
    if not set(parser.aria_refs) <= set(parser.ids):
        raise AssertionError(f'{page}: missing ARIA targets')
    return parser

def main():
    with tempfile.TemporaryDirectory(prefix='storyscape-modules-') as temporary:
        work = Path(temporary) / 'source'
        output = Path(temporary) / 'output'
        shutil.copytree(ROOT, work, ignore=shutil.ignore_patterns('.git', 'node_modules', 'public', 'resources', '.hugo_build.lock', '__pycache__', '.gitnexus', '.claude', '.local', '.env', '.env.*', '.dev.vars*', 'inquiries-exports', '.wrangler', '.netlify', 'wrangler.production.jsonc', 'wrangler.preview.jsonc', '*.log'))
        home = work / 'content/_index.md'
        original = home.read_text()

        def build(*options, error=None, reuse=False):
            if output.exists() and (not reuse):
                shutil.rmtree(output)
            result = subprocess.run(['hugo', '--source', str(work), '--destination', str(output), '--minify', '--panicOnWarning', '--cleanDestinationDir', '--baseURL', 'https://binyleds.test/', *options], capture_output=True, text=True)
            log = result.stdout + result.stderr
            if error:
                if not (result.returncode != 0 and error in log):
                    raise AssertionError(f'Expected {error!r}:\n{log}')
            elif not result.returncode == 0:
                raise AssertionError(log)
        fixtures = ['temp/audit-hidden.txt', 'images/temp/audit-hidden.txt', '.DS_Store', 'images/.DS_Store', 'audit-kept.txt']
        for relative in fixtures:
            target = work / 'static' / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text('synthetic mount sentinel')
        build()
        for relative in fixtures[:-1]:
            if (output / relative).exists():
                raise AssertionError(f'Excluded static fixture leaked: {relative}')
        if not (output / fixtures[-1]).is_file():
            raise AssertionError('Static mount excluded the positive control')
        for relative in fixtures:
            (work / 'static' / relative).unlink()
        homepage = inspect(output / 'index.html')
        if len(homepage.modules) != len(re.findall(r'^  - module:', original, re.M)):
            raise AssertionError('len(homepage.modules) == 16')
        if not not (output / 'module-showcase/index.html').exists():
            raise AssertionError("not (output / 'module-showcase/index.html').exists()")
        if not '/module-showcase/' not in (output / 'sitemap.xml').read_text():
            raise AssertionError("'/module-showcase/' not in (output / 'sitemap.xml').read_text()")
        for relative in ('index.html', 'services/index.html', 'adventures/index.html', 'gatherings/index.html', 'host-guide/index.html'):
            parser = inspect(output / relative)
            expected = {'services/index.html': 4, 'adventures/index.html': 3, 'gatherings/index.html': 5}
            if relative in expected:
                if not len(parser.modules) == expected[relative]:
                    raise AssertionError(f'{relative}: modular layout did not render')
            if not not any((module in ('trust', 'booking') for module, _ in parser.modules)):
                raise AssertionError("not any(module in ('trust', 'booking') for module, _ in parser.modules)")
            for _, ref in parser.refs:
                url = urlsplit(ref)
                if url.scheme or url.netloc or (not url.path):
                    continue
                path = output / unquote(url.path).lstrip('/') if url.path.startswith('/') else (output / relative).parent / unquote(url.path)
                target = path / 'index.html' if url.path.endswith('/') else path
                if not target.is_file():
                    raise AssertionError(f'{relative}: broken reference {ref}')
        build('--environment', 'development', '--buildDrafts', '--disableKinds', 'sitemap')
        workshop = inspect(output / 'module-showcase/index.html')
        registry = (work / 'data/modules.yaml').read_text()
        expected_samples = len(re.findall(r'^\w+:', registry, re.M)) + sum(len(line.split(',')) for line in re.findall(r'variants: \[(.*?)\]', registry))
        if len(workshop.modules) != expected_samples:
            raise AssertionError('len(workshop.modules) == 21')
        if not any((meta.get('name') == 'robots' and 'noindex' in meta.get('content', '') for meta in workshop.meta)):
            raise AssertionError("any(meta.get('name') == 'robots' and 'noindex' in meta.get('content', '') for meta in workshop.meta)")
        if not len([m for m, _ in workshop.modules if m == 'hero']) == 3:
            raise AssertionError("len([m for m, _ in workshop.modules if m == 'hero']) == 3")
        build(reuse=True)
        if not not (output / 'module-showcase/index.html').exists():
            raise AssertionError('Development workshop leaked into a reused production destination')
        build('--buildDrafts', error='The module showcase is local development content')

        def composition(entries):
            home.write_text('---\ntitle: Composition fixture\nsections:\n' + entries + '---\n')
        hero = '  - module: hero\n    id: hero\n    variant: gm\n'
        composition(hero + '  - module: faq\n    id: questions\n  - module: services\n    id: services\n    variant: extended\n  - module: proof\n    id: proof\n    enabled: false\n  - module: services\n    id: more-services\n  - module: closing\n    id: closing\n')
        build()
        parser = inspect(output / 'index.html')
        if not parser.modules == [('hero', 'hero'), ('faq', 'questions'), ('services', 'services'), ('services', 'more-services'), ('closing', 'closing')]:
            raise AssertionError("parser.modules == [('hero', 'hero'), ('faq', 'questions'), ('services', 'services'),\n                                  ('services', 'more-services'), ('closing', 'closing')]")
        if not 'Your friends.' in (output / 'index.html').read_text():
            raise AssertionError("'Your friends.' in (output / 'index.html').read_text()")
        if not 'A remote table' in (output / 'index.html').read_text():
            raise AssertionError("'A remote table' in (output / 'index.html').read_text()")
        cases = [(hero + '  - module: mystery\n', 'Unknown section module'), (hero + '  - module: services\n    id: hero\n', 'Invalid or duplicate section id'), (hero + '  - module: services\n    id: main-content\n', 'Invalid or duplicate section id'), (hero + '  - module: services\n    id: hero-title\n', 'Invalid or duplicate section id'), (hero + '  - module: services\n    variant: missing\n', 'Unknown variant'), (hero + '  - module: trust\n', 'showcase-only'), (hero + '  - module: booking\n', 'showcase-only'), ('  - module: hero\n    enabled: false\n', 'exactly one enabled hero'), ('  - module: services\n' + hero, 'exactly one enabled hero')]
        for entries, message in cases:
            composition(entries)
            build(error=message)
        home.write_text(original)
        variants = work / 'data/variants.yaml'
        original_variants = variants.read_text()
        composition(hero)
        variants.write_text('hero:\n  gm:\n    title: Incomplete hero\n')
        build(error='Module content hero')
        variants.write_text(original_variants)
        home.write_text(original)
        build('--config', 'hugo.yaml,config/client.json')
        if (output / 'brand-guide/index.html').exists():
            raise AssertionError('Client profile published the internal guide')
    print('Module checks passed: static exclusions, public pages, workshop isolation, variants, removal/reordering, repeatable sections, and invalid compositions.')
if __name__ == '__main__':
    main()

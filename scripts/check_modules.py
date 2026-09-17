#!/usr/bin/env python3
"""Targeted build checks for composition, variants, and workshop boundaries."""
from __future__ import annotations

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
    assert len(parser.ids) == len(set(parser.ids)), f'{page}: duplicate IDs'
    assert parser.headings.count(1) == 1, f'{page}: expected one h1'
    assert all(b <= a + 1 for a, b in zip(parser.headings, parser.headings[1:])), f'{page}: heading jump'
    assert not parser.images_without_alt, f'{page}: missing image descriptions'
    assert set(parser.aria_refs) <= set(parser.ids), f'{page}: missing ARIA targets'
    return parser


def main():
    with tempfile.TemporaryDirectory(prefix='storyscape-modules-') as temporary:
        work = Path(temporary) / 'source'
        output = Path(temporary) / 'output'
        shutil.copytree(ROOT, work, ignore=shutil.ignore_patterns(
            '.git', 'node_modules', 'public', 'resources', '.hugo_build.lock', '__pycache__'))
        home = work / 'content/_index.md'
        original = home.read_text()

        def build(*options, error=None, reuse=False):
            if output.exists() and not reuse:
                shutil.rmtree(output)
            result = subprocess.run(
                ['hugo', '--source', str(work), '--destination', str(output),
                 '--minify', '--panicOnWarning', '--cleanDestinationDir', '--baseURL', 'https://binyleds.test/', *options],
                capture_output=True, text=True)
            log = result.stdout + result.stderr
            if error:
                assert result.returncode != 0 and error in log, f'Expected {error!r}:\n{log}'
            else:
                assert result.returncode == 0, log

        build()
        homepage = inspect(output / 'index.html')
        assert len(homepage.modules) == 16
        assert not (output / 'module-showcase/index.html').exists()
        assert '/module-showcase/' not in (output / 'sitemap.xml').read_text()
        for relative in ('index.html', 'services/index.html', 'adventures/index.html',
                         'gatherings/index.html', 'host-guide/index.html'):
            parser = inspect(output / relative)
            expected = {'services/index.html': 4, 'adventures/index.html': 3, 'gatherings/index.html': 5}
            if relative in expected:
                assert len(parser.modules) == expected[relative], f'{relative}: modular layout did not render'
            assert not any(module in ('trust', 'booking') for module, _ in parser.modules)
            for _, ref in parser.refs:
                url = urlsplit(ref)
                if url.scheme or url.netloc or not url.path:
                    continue
                path = (output / unquote(url.path).lstrip('/')) if url.path.startswith('/') else (output / relative).parent / unquote(url.path)
                target = path / 'index.html' if url.path.endswith('/') else path
                assert target.is_file(), f'{relative}: broken reference {ref}'

        build('--environment', 'development', '--buildDrafts', '--disableKinds', 'sitemap')
        workshop = inspect(output / 'module-showcase/index.html')
        assert len(workshop.modules) == 21  # 18 modules plus three alternate versions
        assert any(meta.get('name') == 'robots' and 'noindex' in meta.get('content', '') for meta in workshop.meta)
        assert len([m for m, _ in workshop.modules if m == 'hero']) == 3

        # Reuse the development destination to catch a stale workshop surviving release.
        build(reuse=True)
        assert not (output / 'module-showcase/index.html').exists(), 'Development workshop leaked into a reused production destination'

        build('--buildDrafts', error='The module showcase is local development content')

        def composition(entries):
            home.write_text('---\ntitle: Composition fixture\nsections:\n' + entries + '---\n')

        hero = '  - module: hero\n    id: hero\n    variant: gm\n'
        composition(hero + '  - module: faq\n    id: questions\n'
                    '  - module: services\n    id: services\n    variant: extended\n'
                    '  - module: proof\n    id: proof\n    enabled: false\n'
                    '  - module: services\n    id: more-services\n'
                    '  - module: closing\n    id: closing\n')
        build()
        parser = inspect(output / 'index.html')
        assert parser.modules == [('hero', 'hero'), ('faq', 'questions'), ('services', 'services'),
                                  ('services', 'more-services'), ('closing', 'closing')]
        assert 'Your friends.' in (output / 'index.html').read_text()
        assert 'A remote table' in (output / 'index.html').read_text()

        cases = [
            (hero + '  - module: mystery\n', 'Unknown section module'),
            (hero + '  - module: services\n    id: hero\n', 'Invalid or duplicate section id'),
            (hero + '  - module: services\n    id: main-content\n', 'Invalid or duplicate section id'),
            (hero + '  - module: services\n    id: hero-title\n', 'Invalid or duplicate section id'),
            (hero + '  - module: services\n    variant: missing\n', 'Unknown variant'),
            (hero + '  - module: trust\n', 'showcase-only'),
            (hero + '  - module: booking\n', 'showcase-only'),
            ('  - module: hero\n    enabled: false\n', 'exactly one enabled hero'),
            ('  - module: services\n' + hero, 'exactly one enabled hero'),
        ]
        for entries, message in cases:
            composition(entries)
            build(error=message)
        home.write_text(original)
    print('Module checks passed: public pages, workshop isolation, variants, removal/reordering, repeatable sections, and invalid compositions.')


if __name__ == '__main__':
    main()

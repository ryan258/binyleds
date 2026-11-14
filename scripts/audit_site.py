#!/usr/bin/env python3
"""Deterministic integrity and accessibility checks for generated HTML."""

from __future__ import annotations

import argparse
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse


ROOT = Path(__file__).resolve().parents[1]
OPTIONS = argparse.ArgumentParser(description=__doc__)
OPTIONS.add_argument('directory', nargs='?', default=str(ROOT / 'public'))
OPTIONS.add_argument('--expect-noindex', action='store_true')
OPTIONS.add_argument('--base-url', default='')
OPTIONS.add_argument('--profile', choices=['exemplar', 'client', 'remote'], default='exemplar')
# Imported by the composition checker without consuming its arguments.
ARGS = OPTIONS.parse_args() if __name__ == '__main__' else OPTIONS.parse_args([])
PUBLIC = Path(ARGS.directory).resolve()
EXPECT_NOINDEX = ARGS.expect_noindex
BASE_URL = ARGS.base_url
MANIFEST = json.loads((ROOT / 'data/release.json').read_text())
REQUIRED_ROUTES = MANIFEST['requiredRoutes']
REQUIRED_ASSETS = MANIFEST['staticAssets']


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.canonical = ""
        self.ids: list[str] = []
        self.refs: list[tuple[str, str]] = []
        self.headings: list[int] = []
        self.images_without_alt = 0
        self.aria_refs = []
        self.empty_elements = []
        self._named = []
        self._labels = 0
        self.controls: list[dict[str, str]] = []
        self.label_fors: set[str] = set()
        self.forms: list[dict[str, str]] = []
        self.meta: list[dict[str, str]] = []
        self.json_ld: list[str] = []
        self._json_ld_buffer: list[str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {name: value or "" for name, value in attrs}
        if tag == 'link' and values.get('rel') == 'canonical':
            self.canonical = values.get('href', '')
        if tag == 'label':
            self._labels += 1
        if re.fullmatch(r'h[1-6]', tag) or tag in {'a', 'button'}:
            self._named.append({'tag': tag, 'text': values.get('aria-label', '') or values.get('aria-labelledby', ''), 'id': values.get('id', '')})
        if tag == 'img':
            for item in self._named:
                item['text'] += values.get('alt', '')
        for attribute in ('aria-labelledby', 'aria-describedby', 'aria-controls'):
            self.aria_refs.extend(values.get(attribute, '').split())
        if element_id := values.get("id"):
            self.ids.append(element_id)

        for name in ("href", "src"):
            if value := values.get(name):
                self.refs.append((name, value))

        if re.fullmatch(r"h[1-6]", tag):
            self.headings.append(int(tag[1]))

        if tag == "img" and "alt" not in values:
            self.images_without_alt += 1

        if tag in {"input", "select", "textarea", "button"}:
            self.controls.append(dict(values, implicit_label=bool(self._labels)))

        if tag == "label" and values.get("for"):
            self.label_fors.add(values["for"])

        if tag == "form":
            self.forms.append(values)

        if tag == "meta":
            self.meta.append(values)

        if tag == "script" and values.get("type") == "application/ld+json":
            self._json_ld_buffer = []

    def handle_data(self, data: str) -> None:
        for item in self._named:
            item['text'] += data
        if self._json_ld_buffer is not None:
            self._json_ld_buffer.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == 'label':
            self._labels = max(0, self._labels - 1)
        if self._named and self._named[-1]['tag'] == tag:
            item = self._named.pop()
            if not item['text'].strip():
                self.empty_elements.append(tag + ('#' + item['id'] if item['id'] else ''))
        if tag == "script" and self._json_ld_buffer is not None:
            self.json_ld.append("".join(self._json_ld_buffer).strip())
            self._json_ld_buffer = None


def resolve_internal_target(page: Path, raw_ref: str) -> tuple[Path | None, str]:
    parsed = urlparse(raw_ref)
    base = urlparse(BASE_URL)
    if parsed.scheme in {'mailto', 'tel', 'data'}:
        return None, ''
    if parsed.netloc and (parsed.netloc != base.netloc or parsed.scheme not in {'', 'http', 'https'}):
        return None, ''
    fragment = unquote(parsed.fragment)
    path_text = unquote(parsed.path)
    prefix = base.path.rstrip('/')
    if path_text.startswith('/') and prefix:
        if path_text == prefix:
            path_text = '/'
        elif path_text.startswith(prefix + '/'):
            path_text = path_text[len(prefix):]
        else:
            return PUBLIC / '__invalid_subpath__', fragment
    if not path_text:
        return page, fragment

    if path_text.startswith("/"):
        target = PUBLIC / path_text.lstrip("/")
    else:
        target = page.parent / path_text

    if path_text.endswith("/") or target.is_dir():
        target = target / "index.html"
    elif not target.suffix:
        html_candidate = target / "index.html"
        file_candidate = target.with_suffix(".html")
        target = html_candidate if html_candidate.exists() else file_candidate

    target = target.resolve()
    try:
        target.relative_to(PUBLIC)
    except ValueError:
        return PUBLIC / '__invalid_output_path__', fragment
    return target, fragment


def audit() -> list[str]:
    global BASE_URL
    failures: list[str] = []
    if not BASE_URL and (PUBLIC / 'index.html').is_file():
        home = PageParser(); home.feed((PUBLIC / 'index.html').read_text())
        # Home's canonical URL is the base, including an optional project subpath.
        BASE_URL = home.canonical
    for path in PUBLIC.rglob('*'):
        if path.is_file() and path.suffix != '.html' and path.relative_to(PUBLIC).as_posix() not in REQUIRED_ASSETS:
            relative = path.relative_to(PUBLIC).as_posix()
            if not relative.startswith('assets/') and relative not in {'sitemap.xml', 'robots.txt'}:
                failures.append(f'unexpected release asset: {relative}')
    if ARGS.profile != 'exemplar' and (PUBLIC / 'brand-guide/index.html').exists():
        failures.append('internal brand guide must not appear in this profile')
    if ARGS.profile == 'exemplar' and not (PUBLIC / 'brand-guide/index.html').is_file():
        failures.append('exemplar profile is missing its brand guide')

    if (PUBLIC / "module-showcase/index.html").exists():
        failures.append("local module workshop must not appear in release output")

    for relative in REQUIRED_ROUTES + REQUIRED_ASSETS:
        if not (PUBLIC / relative).is_file():
            failures.append(f"missing required output: {relative}")

    parsed_pages: dict[Path, PageParser] = {}
    for page in sorted(PUBLIC.rglob("*.html")):
        parser = PageParser()
        parser.feed(page.read_text(encoding="utf-8"))
        parsed_pages[page.resolve()] = parser

        relative = page.relative_to(PUBLIC).as_posix()
        route = relative[:-len('index.html')] if relative.endswith('index.html') else relative
        expected_canonical = BASE_URL.rstrip('/') + '/' + route
        if parser.canonical != expected_canonical:
            failures.append(f'{relative} canonical differs from configured site URL')

        duplicate_ids = sorted({item for item in parser.ids if parser.ids.count(item) > 1})
        if duplicate_ids:
            failures.append(f"{page.relative_to(PUBLIC)} duplicate IDs: {', '.join(duplicate_ids)}")

        if parser.headings.count(1) != 1:
            failures.append(
                f"{page.relative_to(PUBLIC)} expected exactly one h1, found {parser.headings.count(1)}"
            )

        for previous, current in zip(parser.headings, parser.headings[1:]):
            if current > previous + 1:
                failures.append(
                    f"{page.relative_to(PUBLIC)} heading jumps from h{previous} to h{current}"
                )

        for empty in parser.empty_elements:
            failures.append(f'{page.relative_to(PUBLIC)} empty accessible name: {empty}')
        for target in set(parser.aria_refs) - set(parser.ids):
            failures.append(f'{page.relative_to(PUBLIC)} missing ARIA target: {target}')
        if parser.images_without_alt:
            failures.append(
                f"{page.relative_to(PUBLIC)} has {parser.images_without_alt} image(s) without alt"
            )

        for control in parser.controls:
            control_type = control.get("type", "text")
            control_id = control.get("id", "")
            control_name = control.get("name", "")
            if control_type in {"hidden", "submit", "button"}:
                continue
            if not (control.get("implicit_label") or control.get("aria-label") or control.get("aria-labelledby") or (control_id and control_id in parser.label_fors)):
                failures.append(
                    f"{page.relative_to(PUBLIC)} control {control_name or control_id!r} lacks a label"
                )

        has_description = any(item.get("name") == "description" and item.get("content") for item in parser.meta)
        if not has_description:
            failures.append(f"{page.relative_to(PUBLIC)} lacks a non-empty meta description")

        if EXPECT_NOINDEX:
            robots = next((item for item in parser.meta if item.get("name") == "robots"), {})
            if "noindex" not in robots.get("content", ""):
                failures.append(f"{page.relative_to(PUBLIC)} should be noindex in a preview build")

        for index, payload in enumerate(parser.json_ld, start=1):
            try:
                data = json.loads(payload)
                if not isinstance(data, dict) or data.get('@context') != 'https://schema.org' or not data.get('@type') or not data.get('name') or not data.get('url'):
                    failures.append(f'{page.relative_to(PUBLIC)} incomplete JSON-LD block {index}')
            except json.JSONDecodeError as error:
                failures.append(
                    f"{page.relative_to(PUBLIC)} has invalid JSON-LD block {index}: {error.msg}"
                )

    for stylesheet in PUBLIC.rglob('*.css'):
        for raw_ref in re.findall(r'url\([\'"]?([^\)\'"]+)', stylesheet.read_text()):
            target, _ = resolve_internal_target(stylesheet, raw_ref)
            if target is not None and not target.is_file():
                failures.append(f'{stylesheet.relative_to(PUBLIC)} broken stylesheet reference {raw_ref!r}')

    for page, parser in parsed_pages.items():
        for _, raw_ref in parser.refs:
            if urlparse(raw_ref).scheme.lower() not in {'', 'http', 'https', 'mailto', 'tel', 'data'}:
                failures.append(f'{page.relative_to(PUBLIC)} unsupported URL: {raw_ref!r}')
                continue
            target, fragment = resolve_internal_target(page, raw_ref)
            if target is None:
                continue
            if not target.exists():
                failures.append(
                    f"{page.relative_to(PUBLIC)} broken internal reference {raw_ref!r}"
                )
                continue
            if fragment and target.suffix == ".html":
                target_parser = parsed_pages.get(target)
                if target_parser and fragment not in target_parser.ids:
                    failures.append(
                        f"{page.relative_to(PUBLIC)} missing fragment target {raw_ref!r}"
                    )

    consultation = PUBLIC / "consultation/index.html"
    consultation_parser = parsed_pages.get(consultation.resolve())
    if consultation_parser:
        expected_form = next(
            (form for form in consultation_parser.forms if form.get("name") == "private-consultation"),
            None,
        )
        if not expected_form:
            failures.append("consultation page lacks the private-consultation form")
        else:
            if expected_form.get("method", "").lower() != "post":
                failures.append("consultation form must use POST")
            if "data-cloudflare-intake" in expected_form:
                if expected_form.get("action") != "/api/consultation":
                    failures.append("Cloudflare consultation form has the wrong endpoint")
                if not expected_form.get("data-sitekey"):
                    failures.append("Cloudflare consultation form lacks a Turnstile sitekey")
                if "data-netlify" in expected_form:
                    failures.append("Cloudflare intake must not also enable Netlify capture")
            elif 'data-intake-disabled' in expected_form:
                if any(c.get('type') == 'submit' and 'disabled' not in c for c in consultation_parser.controls):
                    failures.append('disabled intake must not have an active submit control')
            elif "data-netlify" not in expected_form:
                failures.append("consultation form lacks a configured intake backend")
            elif expected_form.get("netlify-honeypot") != "company-website":
                failures.append("Netlify form lacks its configured spam honeypot")
            if not any(control.get("name") == "company-website" for control in consultation_parser.controls):
                failures.append("consultation form lacks a spam honeypot")

        rules = json.loads((ROOT / 'data/intake.json').read_text())
        for name in ('name', 'email', 'phone', 'city', 'occasion', 'vision', 'boundaries'):
            control = next((c for c in consultation_parser.controls if c.get('name') == name), {})
            if control.get('maxlength') != str(rules['limits'][name]):
                failures.append(f'consultation {name} limit differs from shared rules')
            if name in rules['required'] and 'required' not in control:
                failures.append(f'consultation {name} must be required')
        guest_count = next(
            (control for control in consultation_parser.controls if control.get("name") == "guest-count"),
            None,
        )
        if not guest_count:
            failures.append("consultation form lacks the guest-count control")
        elif guest_count.get('min') != str(rules['guestMinimum']):
            failures.append('guest-count minimum differs from shared rules')
        elif guest_count.get("max"):
            failures.append("guest-count must not enforce an unapproved maximum")

    brand_guide = PUBLIC / "brand-guide/index.html"
    brand_parser = parsed_pages.get(brand_guide.resolve())
    if brand_parser:
        robots = next((item for item in brand_parser.meta if item.get("name") == "robots"), {})
        if "noindex" not in robots.get("content", ""):
            failures.append("brand guide should remain noindex by default")

    sitemap = PUBLIC / "sitemap.xml"
    if EXPECT_NOINDEX and sitemap.is_file():
        failures.append("preview build should not publish sitemap.xml")
    if sitemap.is_file():
        sitemap_text = sitemap.read_text(encoding="utf-8")
        for private_route in ("/brand-guide/", "/thank-you/"):
            if private_route in sitemap_text:
                failures.append(f"private route should not appear in sitemap: {private_route}")

    source_patterns = re.compile(r"\b(?:TODO|TBD|LOREM IPSUM)\b|\[INSERT[^\]]*\]", re.IGNORECASE)
    source_roots = (ROOT / "content", ROOT / "data", ROOT / "layouts")
    for source_root in source_roots:
        for source in source_root.rglob("*"):
            if source.is_file() and source.suffix in {".md", ".yaml", ".html"}:
                if source_patterns.search(source.read_text(encoding="utf-8")):
                    failures.append(f"unresolved placeholder in {source.relative_to(ROOT)}")

    return sorted(set(failures))


def main() -> int:
    failures = audit()
    if failures:
        print("Site audit failed:", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1

    print("Site audit passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

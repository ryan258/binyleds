#!/usr/bin/env python3
"""Deterministic integrity and accessibility checks for generated HTML."""

from __future__ import annotations

import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"

REQUIRED_ROUTES = (
    "index.html",
    "experience/index.html",
    "how-it-works/index.html",
    "for-your-table/index.html",
    "about/index.html",
    "questions/index.html",
    "consultation/index.html",
    "thank-you/index.html",
    "brand-guide/index.html",
    "privacy/index.html",
    "404.html",
)

REQUIRED_ASSETS = (
    "images/storyscape-social-card.png",
    "images/utility-seal.png",
    "fonts/cormorant-garamond-latin.woff2",
    "fonts/cormorant-garamond-latin-italic.woff2",
    "fonts/manrope-latin.woff2",
    "favicon.ico",
)


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: list[str] = []
        self.refs: list[tuple[str, str]] = []
        self.headings: list[int] = []
        self.images_without_alt = 0
        self.controls: list[tuple[str, str, str]] = []
        self.label_fors: set[str] = set()
        self.forms: list[dict[str, str]] = []
        self.meta: list[dict[str, str]] = []
        self.json_ld: list[str] = []
        self._json_ld_buffer: list[str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {name: value or "" for name, value in attrs}
        if element_id := values.get("id"):
            self.ids.append(element_id)

        for name in ("href", "src"):
            if value := values.get(name):
                self.refs.append((name, value))

        if re.fullmatch(r"h[1-6]", tag):
            self.headings.append(int(tag[1]))

        if tag == "img" and "alt" not in values:
            self.images_without_alt += 1

        if tag in {"input", "select", "textarea"}:
            control_type = values.get("type", "text")
            control_id = values.get("id", "")
            control_name = values.get("name", "")
            self.controls.append((control_type, control_id, control_name))

        if tag == "label" and values.get("for"):
            self.label_fors.add(values["for"])

        if tag == "form":
            self.forms.append(values)

        if tag == "meta":
            self.meta.append(values)

        if tag == "script" and values.get("type") == "application/ld+json":
            self._json_ld_buffer = []

    def handle_data(self, data: str) -> None:
        if self._json_ld_buffer is not None:
            self._json_ld_buffer.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "script" and self._json_ld_buffer is not None:
            self.json_ld.append("".join(self._json_ld_buffer).strip())
            self._json_ld_buffer = None


def resolve_internal_target(page: Path, raw_ref: str) -> tuple[Path | None, str]:
    parsed = urlparse(raw_ref)
    if parsed.scheme in {"http", "https", "mailto", "tel", "data"} or raw_ref.startswith("//"):
        return None, ""

    fragment = unquote(parsed.fragment)
    path_text = unquote(parsed.path)
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

    return target.resolve(), fragment


def audit() -> list[str]:
    failures: list[str] = []

    for relative in REQUIRED_ROUTES + REQUIRED_ASSETS:
        if not (PUBLIC / relative).is_file():
            failures.append(f"missing required output: {relative}")

    parsed_pages: dict[Path, PageParser] = {}
    for page in sorted(PUBLIC.rglob("*.html")):
        parser = PageParser()
        parser.feed(page.read_text(encoding="utf-8"))
        parsed_pages[page.resolve()] = parser

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

        if parser.images_without_alt:
            failures.append(
                f"{page.relative_to(PUBLIC)} has {parser.images_without_alt} image(s) without alt"
            )

        for control_type, control_id, control_name in parser.controls:
            if control_type in {"hidden", "submit", "button"}:
                continue
            if control_id and control_id not in parser.label_fors:
                failures.append(
                    f"{page.relative_to(PUBLIC)} control {control_name or control_id!r} lacks an explicit label"
                )

        has_description = any(item.get("name") == "description" and item.get("content") for item in parser.meta)
        if not has_description:
            failures.append(f"{page.relative_to(PUBLIC)} lacks a non-empty meta description")

        for index, payload in enumerate(parser.json_ld, start=1):
            try:
                json.loads(payload)
            except json.JSONDecodeError as error:
                failures.append(
                    f"{page.relative_to(PUBLIC)} has invalid JSON-LD block {index}: {error.msg}"
                )

    for page, parser in parsed_pages.items():
        for _, raw_ref in parser.refs:
            if raw_ref.startswith(("javascript:", "#top")):
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
            if "data-netlify" not in expected_form:
                failures.append("consultation form lacks Netlify form capture")
            if not expected_form.get("netlify-honeypot"):
                failures.append("consultation form lacks a spam honeypot")

    brand_guide = PUBLIC / "brand-guide/index.html"
    brand_parser = parsed_pages.get(brand_guide.resolve())
    if brand_parser:
        robots = next((item for item in brand_parser.meta if item.get("name") == "robots"), {})
        if "noindex" not in robots.get("content", ""):
            failures.append("brand guide should remain noindex by default")

    sitemap = PUBLIC / "sitemap.xml"
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

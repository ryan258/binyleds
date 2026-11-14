#!/usr/bin/env python3
"""Build the Storyscape client site and package it for Pages Direct Upload."""

import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
SITE_URL = "https://thestoryscape.com/"
CONTACT_EMAIL = "tj@thestoryscape.com"
ARCHIVE = ROOT / ".local/handoff/thestoryscape-pages.zip"
OMIT_FROM_UPLOAD = {
    "_routes.json",  # The static deployment has no Functions.
    "images/about-hero.webp",
    "images/experience-callout.webp",
    "images/experience-hero.webp",
    "images/for-your-table-hero.webp",
    "images/home-hero.webp",
    "images/how-it-works-hero.webp",
    "images/remote-social.svg",
    "images/storyscape-social-card.png",
    "images/utility-seal.png",
}
NOTICES = (
    "LICENSES/Cormorant-Garamond-OFL.txt",
    "LICENSES/Manrope-OFL.txt",
    "LICENSES/PaperMod-MIT.txt",
)


def upload_files(site: Path) -> dict[str, Path]:
    manifest = json.loads((ROOT / "data/release.json").read_text())
    expected = set(manifest["requiredRoutes"] + manifest["staticAssets"])
    expected.update({"robots.txt", "sitemap.xml"})
    if undeclared := OMIT_FROM_UPLOAD - expected:
        raise ValueError(f"Upload omissions missing from the release manifest: {', '.join(sorted(undeclared))}")

    files = {}
    for path in site.rglob("*"):
        if path.is_symlink():
            raise ValueError(f"Symlink in generated site: {path.relative_to(site)}")
        if path.is_file():
            files[path.relative_to(site).as_posix()] = path

    for extension in ("css", "js"):
        pattern = rf"assets/{extension}/storyscape\.[0-9a-f]{{64}}\.{extension}"
        matches = [name for name in files if re.fullmatch(pattern, name)]
        if len(matches) != 1:
            raise ValueError(f"Expected one fingerprinted Storyscape {extension.upper()} file")
        name = matches[0]
        digest = hashlib.sha256(files[name].read_bytes()).hexdigest()
        if name != f"assets/{extension}/storyscape.{digest}.{extension}":
            raise ValueError(f"Asset fingerprint does not match: {name}")
        expected.add(name)

    if files.keys() != expected:
        extra = ", ".join(sorted(files.keys() - expected)) or "none"
        missing = ", ".join(sorted(expected - files.keys())) or "none"
        raise ValueError(f"Unexpected files: {extra}. Missing files: {missing}.")

    consultation = files["consultation/index.html"].read_text(encoding="utf-8")
    if f'href="mailto:{CONTACT_EMAIL}"' not in consultation or "data-intake-disabled" not in consultation:
        raise ValueError("Expected TJ's email link and disabled form on the consultation page")

    upload = {name: path for name, path in files.items() if name not in OMIT_FROM_UPLOAD}
    for name, path in upload.items():
        if path.suffix in {".html", ".css", ".js", ".svg", ".xml"} or name in {"_headers", "_redirects"}:
            content = path.read_text(encoding="utf-8")
            if referenced := next((omitted for omitted in sorted(OMIT_FROM_UPLOAD) if omitted in content), None):
                raise ValueError(f"{name} references a file omitted from the ZIP: {referenced}")
    upload.update({name: ROOT / name for name in NOTICES})
    return upload


def main() -> int:
    try:
        ARCHIVE.parent.mkdir(parents=True, exist_ok=True)
        # Build and validate beside the final ZIP so replacing it is atomic.
        with TemporaryDirectory(prefix="tj-export-", dir=ARCHIVE.parent) as temporary:
            scratch = Path(temporary)
            site = scratch / "site"
            env = dict(
                os.environ,
                SITE_PROFILE="client",
                SITE_ENV="production",
                SITE_URL=SITE_URL,
                SITE_MINIFY="false",
                INTAKE_BACKEND="disabled",
                INTAKE_CONTACT_EMAIL=CONTACT_EMAIL,
                BUILD_DESTINATION=str(site),
                HUGO_CACHEDIR=str(scratch / "cache"),
            )
            subprocess.run(["node", "scripts/build-site.mjs"], cwd=ROOT, env=env, check=True)
            files = upload_files(site)
            # Dashboard drag and drop has a 1,000-file limit and 25 MiB per file.
            if len(files) > 1_000 or any(path.stat().st_size > 25 * 1024**2 for path in files.values()):
                raise ValueError("The site exceeds Cloudflare Pages dashboard upload limits")

            pending = scratch / ARCHIVE.name
            with ZipFile(pending, "w", compression=ZIP_DEFLATED) as archive:
                for name, path in sorted(files.items()):
                    archive.write(path, name)
            with ZipFile(pending) as archive:
                if set(archive.namelist()) != files.keys() or archive.testzip() is not None:
                    raise ValueError("ZIP verification failed")
            pending.replace(ARCHIVE)
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        print(f"Export failed: {error}. Any previous ZIP remains in place.", file=sys.stderr)
        return 1

    print(f"Pages upload ZIP: {ARCHIVE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

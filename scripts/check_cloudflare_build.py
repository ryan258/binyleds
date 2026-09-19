"""Focused generated-output checks for the opt-in hosting migration."""
import os
from pathlib import Path
import subprocess
import tempfile
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.tags = []
        self.feed(path.read_text())

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))

    def find(self, tag, key, value):
        return next(attrs for name, attrs in self.tags if name == tag and attrs.get(key) == value)


def run(command, env=None, ok=True):
    result = subprocess.run(command, cwd=ROOT, env=env, capture_output=True, text=True)
    if (result.returncode == 0) != ok:
        raise AssertionError(result.stdout + result.stderr)


with tempfile.TemporaryDirectory(prefix="storyscape-hosting-") as temp:
    for mode in ("production", "preview"):
        output = Path(temp) / mode
        env = dict(os.environ, INTAKE_ENV=mode, PRODUCTION_URL="https://storyscape.test/",
                   CF_PAGES_URL="https://preview.storyscape.test/", INTAKE_CONTACT_EMAIL="host@storyscape.test",
                   TURNSTILE_SITE_KEY="fixture-not-a-real-key", CONSENT_VERSION="test-v1",
                   BUILD_DESTINATION=str(output))
        run(["node", "scripts/build-cloudflare.mjs"], env)
        page = Page(output / "consultation/index.html")
        form = page.find("form", "name", "private-consultation")
        assert form["action"] == "/api/consultation" and "data-cloudflare-intake" in form
        assert "data-netlify" not in form
        robots = page.find("meta", "name", "robots")["content"]
        assert robots == ("index, follow" if mode == "production" else "noindex, nofollow")
        canonical = page.find("link", "rel", "canonical")["href"]
        assert canonical == (env["PRODUCTION_URL"] if mode == "production" else env["CF_PAGES_URL"]) + "consultation/"
        assert (output / "sitemap.xml").exists() == (mode == "production")
        assert not (output / "module-showcase/index.html").exists()
        assert "Cloudflare D1" in (output / "privacy/index.html").read_text()
        assert (output / "_headers").is_file() and (output / "_routes.json").is_file()
        run(["python3", "scripts/audit_site.py", str(output)] + (["--expect-noindex"] if mode == "preview" else []))
        run(["node", "scripts/build-cloudflare.mjs"], dict(env, TURNSTILE_SITE_KEY="1x00000000000000000000AA"), ok=False)
    output = Path(temp) / "mirror"
    run(["hugo", "--gc", "--minify", "--panicOnWarning", "--cleanDestinationDir", "--environment", "staging",
         "--disableKinds", "sitemap", "--baseURL", "https://example.test/binyleds/", "--destination", str(output)])
    page = Page(output / "consultation/index.html")
    form = page.find("form", "name", "private-consultation")
    assert "data-cloudflare-intake" not in form and "data-netlify" in form
    assert form["action"] == "/binyleds/thank-you/"
    assert "disabled" in page.find("button", "type", "submit")
    assert "submissions are not received" in (output / "consultation/index.html").read_text()
    assert "Netlify’s form service" in (output / "privacy/index.html").read_text()
    output = Path(temp) / "netlify"
    run(["hugo", "--gc", "--minify", "--panicOnWarning", "--cleanDestinationDir",
         "--baseURL", "https://example.test/", "--destination", str(output)])
    page = Page(output / "consultation/index.html")
    assert "data-netlify" in page.find("form", "name", "private-consultation")
    assert "disabled" not in page.find("button", "type", "submit")
print("Hosting mode checks passed: Cloudflare production/preview, static mirror, Netlify fallback, and dummy-key rejection.")

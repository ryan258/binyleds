# Hosting and CI configuration

This document describes the repository's build and hosting configuration as of
2026-11-14. The active host, deployment revision, and provider settings still
need owner confirmation. See [site operations](site-operations.md) for intake
setup, cutover, and recovery.

## Capability matrix

| Build | Backend | Base URL | Indexing | Internal brand guide |
| --- | --- | --- | --- | --- |
| Default `npm run build` | Disabled | `http://localhost:1313/` | Noindex, no sitemap | Included |
| GitHub Pages staging | Disabled | `https://ryan258.github.io/binyleds/` | Noindex, no sitemap | Included |
| Netlify production | Netlify Forms | `$URL` | Production rules | Excluded |
| Netlify deploy preview or branch deploy | Disabled | `$DEPLOY_PRIME_URL` | Noindex, no sitemap | Excluded |
| Cloudflare production | Cloudflare Pages Functions and production D1 | `PRODUCTION_URL` | Production rules | Excluded |
| Cloudflare preview or local | Cloudflare Pages Functions and matching test D1 | `CF_PAGES_URL` | Noindex, no sitemap | Excluded |
| Default `npm run build:remote` | Disabled | `http://localhost:1313/` | Noindex, no sitemap | Excluded |

Hugo's environment controls site-wide indexing, with page-level opt-outs in
production. The `intakeBackend` parameter selects the consultation form mode.
Keep it disabled on static hosts. The remote example renders the fictional
Wayfarer Table identity and content.

## Versions and build gates

The Netlify and Actions configurations pin Hugo Extended 0.164.0. Node 22.13+
supports the project's runtime checks and SQLite tests. Python 3 runs output
checks. The source gate compares the Netlify and Actions Hugo pins.

Hugo builds the stylesheet with native Dart Sass. GitHub Actions and Netlify call
`scripts/with-dart-sass.sh` to use native Dart Sass 1.106.1. If it is unavailable,
the script downloads and verifies the upstream archive on Linux x64 or ARM64.
For local builds, keep native Dart Sass on `PATH`.

`build-site.mjs` and `build-cloudflare.mjs` run source checks, Hugo, and the
output audit. The audit checks links against the configured root or subpath,
including absolute links to the same site.

The [Actions workflow](../.github/workflows/build.yml) runs site and module
checks, intake tests, and hosting fixture builds for pull requests and pushes
to `main`. On `main`, the dependent `deploy-staging` job builds the exemplar at
`/binyleds/`, audits the output with that base URL and `--expect-noindex`, then
uploads and deploys a Pages artifact. This configuration can publish the mirror
after an owner push to `main` when GitHub Pages is enabled.

Netlify production requires `INTAKE_CONTACT_EMAIL` in its build environment.
Verify native Forms capture and notifications on Netlify before relying on that
path. Preview and branch deployments serve the disabled consultation demo.

Cloudflare requires separate production and preview D1 bindings. Each database
needs an immutable marker that matches its runtime `INTAKE_ENV`. Missing or
mismatched markers block intake, notifications, and operator access.

## Local verification and release

Use `npm run test:hosting` for local generated-output checks after a hosting
change. The owner can run `npm run test:all` for the full local gate on the
pinned toolchain. For release, record the deployed revision and the known-good
rollback deployment. Verify browser navigation, form recovery, live response
headers, preview indexing, and capture or delivery on the chosen host. See
[readiness](readiness.md) for outstanding acceptance work.

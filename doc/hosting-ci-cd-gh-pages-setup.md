# Hosting, CI, and the GitHub Pages staging mirror

How this site is built, validated, and published. Two hosts serve two different
purposes, and the difference matters — one of them cannot run the business.

## The two hosts

| | Netlify — **production** | GitHub Pages — **staging mirror** |
|---|---|---|
| URL | the live domain | `https://ryan258.github.io/binyleds/` |
| Consultation form | captured by Netlify Forms | **not connected**, shows a notice |
| Security headers | from `netlify.toml` | none — Pages sends its own |
| `/consult`, `/book` redirects | yes | no |
| Search engines | `index, follow` | `noindex, nofollow` |
| CSS/JS | minified + fingerprinted + SRI | identical |
| Trigger | Netlify build on push | `deploy-staging` job on push to `main` |

**Netlify is the site.** Pages is a preview of what production will look like,
published from the same commit. Never send a client the Pages URL.

### Why Pages cannot be production

GitHub Pages serves static files and nothing else. Three things the business
depends on are impossible there:

1. **The consultation form.** It is `data-netlify="true"` and relies on Netlify
   intercepting the POST at build time. Pages cannot accept a POST at all, so a
   submission would be silently discarded — the site's only conversion path.
2. **Security headers.** The CSP, `X-Frame-Options`, `Referrer-Policy`,
   `Permissions-Policy`, and cache-control rules all live in `netlify.toml`.
   Pages sends a fixed header set and ignores that file entirely.
3. **Redirects.** `/consult` and `/book` are Netlify redirect rules.

Because the mirror renders a form that cannot work,
`layouts/consultation/single.html` prints a staging notice above it. That is
guarded on `hugo.Environment` so production never renders it.

## The pipeline

`.github/workflows/build.yml` holds both jobs. Deployment is gated behind
validation — the mirror cannot publish unless the audit passed.

```
push / PR ──▶ build ──────────────▶ scripts/check.sh
                 │                  (build at root baseURL + audit_site.py)
                 │
                 └─▶ deploy-staging  (main only)
                        ├─ hugo -e staging --baseURL .../binyleds/
                        ├─ verify the staging build   ← subpath + noindex guard
                        ├─ upload-pages-artifact
                        └─ deploy-pages
```

Pages is configured with **source: GitHub Actions** (`build_type: workflow`),
not a `gh-pages` branch, so no build output is ever committed. Set once via:

```sh
gh api repos/ryan258/binyleds/pages -X POST -f build_type=workflow
```

`concurrency: {group: pages, cancel-in-progress: false}` serialises deploys.
Cancelling a half-finished Pages deploy can leave the published site broken, so
runs queue rather than interrupt.

## Where baseURL comes from

Four places set it, for four different reasons. This is the most common source
of confusion.

| Context | baseURL | Set in |
|---|---|---|
| Local dev (`npm run dev`) | `https://example.org/` placeholder | `hugo.yaml` |
| Validation (`npm run check`) | `https://binyleds.test/` | `scripts/check.sh` |
| Netlify production | `$URL` (injected per build) | `netlify.toml` |
| Netlify deploy preview | `$DEPLOY_PRIME_URL` | `netlify.toml` |
| Pages staging | `https://ryan258.github.io/binyleds/` | `build.yml` |

The `hugo.yaml` value is a safe local placeholder. Every real build overrides
it, which is why the checked-in `example.org` never reaches a visitor.

## Environment gating

Two different signals, deliberately not the same one:

```go-html-template
{{ if hugo.IsProduction }}   {{/* robots: index vs noindex */}}
{{ if not hugo.IsServer }}   {{/* minify + fingerprint + SRI */}}
```

- **`hugo.IsProduction`** is false under `-e staging`, which is what gives the
  mirror `noindex, nofollow` on every page for free.
- **`hugo.IsServer`** is false for *any* real build, staging included. Assets
  are therefore byte-identical between staging and production — a mirror that
  ships different CSS is not worth trusting.

Gating assets on `IsProduction` instead would have made staging serve
unminified, unfingerprinted CSS. Gating robots on `IsServer` would have let a
byte-identical copy of the site into Google as duplicate content.

## The subpath trap

The mirror is served from `/binyleds/`, not the root. Hugo's `relURL` prefixes
the baseURL path **only when the input has no leading slash**:

```go-html-template
{{ "consultation/"  | relURL }}   →  /binyleds/consultation/   ✅
{{ "/consultation/" | relURL }}   →  /consultation/            ❌ 404
```

This is invisible in production, where both forms render identically. It cost
nine broken links the first time the site was built at a subpath.

Consequences, all already applied:

- URLs in `data/home.yaml` and `params.consultationPath` are written **without**
  a leading slash.
- `layouts/_shortcodes/action.html` calls `strings.TrimPrefix "/"` before
  `relURL`, so content authors can write either form safely.
- `@font-face` `src` values in `assets/scss/_tokens.scss` are relative
  (`../../fonts/…`), resolved against the stylesheet at `/assets/css/`. Absolute
  `/fonts/…` would 404 under any subpath and silently fall back to system fonts.

## The staging guard

`scripts/check.sh` builds at a **root** baseURL, so it structurally cannot catch
subpath bugs. The `Verify the staging build` step is the only thing that can,
and it fails the deploy on either:

- any page missing `noindex` — prevents duplicate-content indexing
- any `href`/`src` starting with `/` but not `/binyleds/` — prevents 404s

If you move the mirror to a different path or a custom domain, **update the
prefix in that step as well as the `--baseURL` flag.** They are coupled.

## Verifying a deploy

After the workflow goes green, check the mirror for the things only a subpath
build can get wrong:

1. Headings render in Cormorant Garamond, not a fallback serif → fonts resolved.
2. Nav and CTA links point at `/binyleds/…` → no unprefixed refs.
3. The consultation page shows the staging notice.
4. View source: `<meta name="robots" content="noindex, nofollow">`.

Locally, reproduce the exact staging build with:

```sh
hugo --gc --minify --panicOnWarning \
  -e staging --baseURL "https://ryan258.github.io/binyleds/"
```

## Troubleshooting

**First deploy fails in `deploy-pages`.** Pages may still be provisioning on the
very first run. Re-run the job; it will not recur.

**Deploy rejected with "unprefixed ref".** A root-relative URL crept into
content, data, or a template. Find it in the step output and drop the leading
slash, or route it through `relURL` on a slash-free value.

**Local dev server shows stale CSS.** `hugo server` does not always pick up a
newly created Sass partial. Restart it. This has burned real debugging time.

**`npm run check` passes but the mirror breaks.** Expected — `check.sh` builds
at a root baseURL. Reproduce with the staging command above.

## Changing the setup

**Custom domain for the mirror:** add `static/CNAME`, point DNS at GitHub,
update `--baseURL` in `build.yml`, and relax the guard's prefix to `/`.

**Promoting Pages to production:** the form must move first. It needs a
third-party endpoint (Formspree, Getform, Basin) since Pages cannot capture a
POST. Accept also that the `netlify.toml` security headers have no equivalent on
Pages — that is a real reduction in posture, not a formality.

**Retiring the mirror:** delete the `deploy-staging` job and disable Pages in
repository settings. Nothing else depends on it.

## Note on repository visibility

Pages requires a public repository on the free plan. This repo is public, which
means `brand/PRODUCTION_BIBLE.md`, `brand/SKILL.md`, `brand/ASSET_REGISTER.md`,
and `PROJECT.md` are publicly readable. They contain no credentials, but they
are internal strategy material. Worth remembering before adding anything
genuinely private — pricing floors, client names, unpublished positioning.

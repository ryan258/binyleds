# Binyled’s Storyscape

A modular Hugo exemplar for thoughtful tabletop game-master sites and working
materials. Storyscape is the in-home hospitality example; Wayfarer Table is a
fictional remote-play example. This repository is a personal toolkit. The
professional-service workflows are optional examples, not a requirement to launch
a business or accept bookings.

The local implementation includes reusable sections, configurable identity,
keyboard controls and native reduced-motion support, optional inquiry storage, a short-command
operator inbox, and a worked session pack. The [readiness ledger](docs/readiness.md)
records the checks that passed, open source issues, and what would need real
browser or provider acceptance.

## Start here

Use Hugo Extended **0.164.0** to match the checked-in GitHub Actions and Netlify
pin, native Dart Sass on `PATH`, Node **22.13+**, and Python 3. On macOS, install
Dart Sass with `brew install sass/sass/sass`. `hugo env` should list the Dart Sass compiler.
There are no npm package dependencies to install.

```sh
npm run dev
```

Open the address Hugo prints. The draft-only `/module-showcase/` shows every
registered module and variant. Its filters do not change saved compositions.
Intake is disabled unless a build explicitly selects a supported backend.

```sh
npm run build          # Audited, noindex exemplar at the local base URL
npm run build:remote   # Audited, fictional Wayfarer Table profile
npm run session        # New private working copy of the Lantern Bay session pack
```

Builds clean `public/` or the directory you set as `BUILD_DESTINATION`.
The session command creates a new ignored folder under `.local/sessions/` and
prints its path. See [readiness](docs/readiness.md#local-checks) for verification
commands and results.

## Choose a profile and host

| Profile | Purpose | Internal brand guide | Inquiry default |
| --- | --- | --- | --- |
| `exemplar` | Full Storyscape reference site | Included, noindex; publicly readable if hosted | Disabled |
| `client` | Public Storyscape website | Excluded from output | Disabled unless explicitly selected |
| `remote` | Fictional Wayfarer Table reuse example | Excluded | Disabled; keep it that way |

For a client build, set `SITE_PROFILE=client` and the actual `SITE_URL`. Set
`SITE_ENV=production` only for the intended indexable release. The checked-in
Netlify production command selects Netlify Forms and requires a real
`INTAKE_CONTACT_EMAIL`; its previews disable capture. Cloudflare uses
`npm run build:cloudflare`, its own settings, and the client profile.
GitHub Pages is configured as a static staging mirror with intake disabled.
These are repository settings; the active host and intake status are unverified.
See [site operations](docs/site-operations.md) for configuration and recovery.
The [November 21 handoff plan](docs/site-operations.md#november-21-handoff-plan)
records the tentative Cloudflare move and client-owned domain, billing, and
Zoho mailbox.

Keep `INTAKE_BACKEND=disabled` for Wayfarer Table. The general build wrapper
currently allows a Netlify override for the remote profile, but the demo's
privacy page says it collects nothing.

No command in this README authorizes publishing, changing DNS, sending mail,
applying remote migrations, or modifying a live database. Those remain owner actions.

## Editing map

| Concern | Owning source |
| --- | --- |
| Identity, metadata, navigation | `hugo.yaml`, `config/*.json` |
| Storyscape web artwork and alt text | `data/storyscape_artwork.yaml`, `static/images/storyscape/`, [asset register](brand/ASSET_REGISTER.md) |
| Page composition | `content/`, `examples/remote/content/` |
| Module copy and variants | `data/home.yaml`, `data/variants.yaml`, `data/remote.json` |
| Registry and content contracts | `data/modules.yaml`, `data/module_schema.json` |
| Templates and schema enforcement | `layouts/`, especially `sections/render.html` and `sections/validate.html` |
| Shared form limits and choices | `data/intake.json` |
| Theme, focus, material textures, responsive layout | `assets/scss/`, `assets/js/site.js` |
| Inquiry validation and storage | `lib/intake.mjs`, `functions/api/consultation.js` |
| Environment isolation and operator access | `lib/environment.mjs`, `lib/operator.mjs`, `functions/api/inbox.js` |
| Notification contract and retry | `lib/notifications.mjs`, `functions/api/notifications.js` |
| SQLite/D1 schema | `migrations/0001_consultations.sql` through `0003_guest_count_policy.sql` |
| Short operator and session commands | `scripts/inbox.mjs`, `scripts/session.mjs` |
| Build and output checks | `scripts/build-site.mjs`, `scripts/build-cloudflare.mjs`, `scripts/audit_site.py` |
| Expected output routes and declared static assets | `data/release.json`; Hugo excludes `static/images/temp/` |

There is no theme dependency. The retained PaperMod-derived material and fonts
have notices in `LICENSES/`. See the [reuse policy](REUSE.md) and
[asset register](brand/ASSET_REGISTER.md) for pending redistribution rights.

## Learn the whole workflow

Start with the [Storyscape brand and marketing kit](brand/README.md) for the
illustrated standards, artwork, collateral, and market analysis.

1. [Architecture and contracts](docs/architecture.md): request flow, trust boundaries, editing ownership.
2. [Sculpting guide](docs/sculpting-guide.md): choose modules and switch profiles.
3. [Lantern Bay worked example](examples/lantern-bay/README.md): synthetic inquiry → scope → prep → player handout → runnable adventure → follow-up draft.
4. [Operations](docs/site-operations.md): configure, review, contact, close, recover.
5. [Readiness](docs/readiness.md): what is implemented, unverified, or still an owner decision.
6. [Roadmap](roadmap.md): the next useful steps and optional extensions.

The [October 3 review](docs/project-review-2026-10-03.md),
[October 3 remediation](docs/remediation-2026-10-03.md), and
[October 5 follow-up](docs/project-review-2026-10-05.md) preserve their original
findings. The [Cloudflare cost guide](docs/how-to-get-all-this-you-can-from-cloudflare-for-free-or-on-the-cheap.md)
is dated planning research; use the runbook for current repository instructions.

Optional service-planning guides cover [pricing](docs/pricing.md),
[communications](docs/marketing-campaign.md), [sustainable preparation](docs/how-to-dm-dnd-for-fun-and-profit.md),
and [relationships](docs/how-to-dm-network-and-find-more-dm-clients.md).
Rates, credentials, testimonials, live availability, and provider acceptance are
never inferred from these examples.

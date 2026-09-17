# Binyled’s Storyscape

A comprehensive Hugo master site to sculpt into specialist service websites,
expressed first as a professional DM and tabletop-party brand in Bentonville
and Northwest Arkansas. The project uses Hugo
Extended with no theme, a custom Sass design system, and a native Netlify
inquiry form. Every template in `layouts/` belongs to this project.

## What is included

- Configurable homepage with independently selectable, reorderable sections
- Sixteen reusable modules plus two local editorial scaffolds, three hero
  directions, and two service collections
- Draft-only local module workshop at `/module-showcase/`
- Service, adventure, occasion, and host-guide pages, alongside the original routes
- The Experience, How It Works, For Your Table, About, Questions, and
  Consultation routes
- A searchable, print-friendly HTML brand guide at `/brand-guide/`
- Honest copy that avoids unverified credentials, fabricated testimonials, and
  invented pricing
- Dark and light themes, reduced-motion support, keyboard navigation, visible
  focus states, and responsive layouts
- Open Graph and Twitter card artwork, favicon set, sitemap, robots rules, and
  JSON-LD structured metadata
- Netlify form capture, spam honeypot, security headers, redirects, and deploy
  configuration
- Deterministic build and HTML integrity checks

## Run locally

Requirements: Hugo Extended 0.156 or newer (the templates use `hugo.Data`). The
project is verified with Hugo 0.164.0, which is the version pinned in
`netlify.toml` and CI.

```sh
npm run dev
```

Open the local address printed by Hugo. To create the production site:

```sh
npm run build
```

The generated site is written to `public/`.

## Sculpt a specialist site

With `npm run dev` running, open `/module-showcase/` to compare the available
sections. Edit the `sections` list in `content/_index.md` to reorder, remove,
or disable pieces. Copy and adapt the modular service and occasion pages when
you need another landing page. See [the sculpting guide](docs/sculpting-guide.md)
for examples, variants, removal steps, and the targeted module check.

The workshop is excluded from normal builds. The trust and booking layouts are
local editorial scaffolds; they do not contain testimonials, live availability,
payments, or a connected booking provider. Adventure concepts and gallery artwork
are labeled as illustrative. Additional service formats are consultation topics,
not promises of availability.

## Verify everything

```sh
npm run check
```

The check builds both production and non-indexable preview variants with
warnings treated as failures, validates internal links, checks duplicate IDs
and heading order, confirms form labels and inquiry constraints, verifies
the required brand assets and routes via `scripts/audit_site.py`, and runs
the composition and variant test suite via `scripts/check_modules.py`.

For quick, targeted verification of composition changes and renderer logic:

```sh
python3 scripts/check_modules.py
```

## Publish on Netlify

1. Put this directory in a Git repository and push it to the Git provider you
   want Netlify to use.
2. In Netlify, choose **Add new project** and import the repository.
3. Keep the build settings detected from `netlify.toml` and deploy.
4. In **Forms**, enable notifications for the `private-consultation` form.
5. Connect the final domain. Netlify supplies the production URL to Hugo during
   each build, so canonical and social URLs update automatically.

No public contact address is required for the inquiry form. Submissions are
captured by Netlify and can trigger email notifications configured by the site
owner.

If you choose another static host, set `baseURL` in `hugo.yaml` to the final
domain (or pass `--baseURL` during the production build) and connect the form to
that host's form service. The checked-in `https://example.org/` value is a safe
local placeholder; Netlify replaces it automatically with `$URL`.

## Before accepting commissions

The site deliberately does not invent business facts. Confirm these operational
items before public launch:

- Final travel radius and any travel fee
- Typical guest-count range and accessibility accommodations
- Lead time, availability, cancellation, and rescheduling policy
- Final service inclusions, rate calculation, and any commercial minimums
- Who receives Netlify form notifications
- Approved dragon-and-shield crest, if one exists
- Trademark or game-system affiliation wording, if specific systems are named

These items are also tracked in the HTML brand guide. The public copy remains
usable without fabricated answers.

## Strategy & documentation map

- Project evolution & phases: `roadmap.md`
- Master site premise & direction: `PROJECT.md`
- Specialist sculpting workflow: `docs/sculpting-guide.md`
- Pricing methodology & comparables: `docs/pricing.md`
- Marketing & referral campaign: `docs/marketing-campaign.md`
- Unit economics & margin defense: `docs/how-to-dm-dnd-for-fun-and-profit.md`
- Relational networking & client outreach: `docs/how-to-dm-network-and-find-more-dm-clients.md`
- Photography strategy & prompt system: `docs/image-plan.md`
- Hosting, CI, and the staging mirror: `docs/hosting-ci-cd-gh-pages-setup.md`
- Internal production bible: `brand/PRODUCTION_BIBLE.md`
- Brand-writing skill: `brand/SKILL.md`
- Asset provenance: `brand/ASSET_REGISTER.md`

## Architecture & editing map

- Site settings and navigation: `hugo.yaml`
- Homepage copy: `data/home.yaml`
- Homepage composition: `content/_index.md`
- Module registry and variants: `data/modules.yaml`, `data/variants.yaml`
- Reusable module templates: `layouts/_partials/sections/`
- Shared brand system: `data/brand.yaml`
- Standard page copy: `content/`
- Page templates: `layouts/`
- Modular layout: `layouts/modular.html`
- Local workshop layout: `layouts/module-showcase/single.html`
- Sass source: `assets/scss/`
- Interactions: `assets/js/site.js`, `assets/js/showcase.js`
- Verification suite: `scripts/check.sh`, `scripts/audit_site.py`, `scripts/check_modules.py`

There is no theme dependency. `layouts/_partials/head.html` was originally
derived from PaperMod's head partial; its MIT notice is kept in
`LICENSES/PaperMod-MIT.txt`.

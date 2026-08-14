# Binyled’s Storyscape

A production-ready Hugo site for a consultation-first, in-home tabletop
experience brand in Bentonville and Northwest Arkansas. The project uses Hugo
Extended with no theme, a custom Sass design system, and a native Netlify
inquiry form. Every template in `layouts/` belongs to this project.

## What is included

- Conversion-focused homepage
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

## Verify everything

```sh
npm run check
```

The check builds both production and non-indexable preview variants with
warnings treated as failures, validates internal links, checks duplicate IDs
and heading order, confirms form labels and inquiry constraints, and verifies
the required brand assets and routes.

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

## Editing map

- Site settings and navigation: `hugo.yaml`
- Homepage copy: `data/home.yaml`
- Shared brand system: `data/brand.yaml`
- Standard page copy: `content/`
- Page templates: `layouts/`
- Sass source: `assets/scss/`
- Interactions: `assets/js/site.js`
- Hosting, CI, and the staging mirror: `doc/hosting-ci-cd-gh-pages-setup.md`
- Internal production bible: `brand/PRODUCTION_BIBLE.md`
- Brand-writing skill: `brand/SKILL.md`
- Asset provenance and social-card prompt: `brand/ASSET_REGISTER.md`

There is no theme dependency. `layouts/_partials/head.html` was originally
derived from PaperMod's head partial; its MIT notice is kept in
`LICENSES/PaperMod-MIT.txt`.

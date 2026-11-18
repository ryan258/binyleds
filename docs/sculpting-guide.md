# Sculpting a specialist site

The Storyscape homepage assembles 16 sections from a registry of 18 modules.
To build a smaller site, select the sections that serve its offer and adapt
the copy and identity. Wayfarer Table is a fictional example with four
homepage sections and a separate identity.

## Open the visual menu

```sh
npm run dev
```

Open `/module-showcase/` on the address Hugo prints. The workshop shows all 18
modules, three hero directions, and two service collections. Search filters the
displayed previews. Native anchor links and all previews remain usable without
JavaScript.

The workshop is a draft, marked noindex, and excluded from the sitemap.
A production build that explicitly includes drafts fails. Use `npm run build`
to generate and audit a clean local staging build. The wrapper clears stale
files from its generated destination. If invoking Hugo directly, use
`--cleanDestinationDir` with a dedicated output folder. Keep development
output local.

## Choose a profile

| Profile | What it builds |
| --- | --- |
| Exemplar, the default | Storyscape's full site with the noindex brand guide |
| Client, `config/client.json` | Storyscape's public pages and artwork with the brand guide excluded |
| Remote, `config/remote.json` | The fictional Wayfarer Table identity, `examples/remote/content/`, and `data/remote.json` |

Build the fictional example with its form disabled.

```sh
INTAKE_BACKEND=disabled npm run build:remote
```

Keep the remote example's intake disabled. The wrapper accepts Netlify for
this profile, but the Wayfarer privacy notice says the example collects no
inquiries. Use the [site operations runbook](site-operations.md) to select and
verify an intake backend for a real service.

## Choose and reorder sections

The Storyscape homepage composition lives in `content/_index.md`. Each enabled
entry renders in list order. Delete an entry, or keep it for later with
`enabled: false`. Manage standalone pages in the selected content directory.

A small professional DM homepage could be:

```yaml
sections:
  - module: hero
    id: hero
    variant: gm
  - module: services
    id: services
  - module: process
    id: process
  - module: faq
    id: questions
  - module: closing
    id: closing
```

Keep exactly one enabled hero first on the homepage, so it supplies the page
heading. Use unique lowercase IDs beginning with a letter and containing only
letters, numbers, and hyphens. IDs become anchors. The renderer reserves shell
IDs such as `main-content` and related IDs such as `hero-title` when `hero`
is already in the composition. Unknown modules and variants, duplicate or
invalid IDs, and publicly selected showcase-only modules fail the build.

The default hero emphasizes the host. `variant: gm` emphasizes the practitioner,
and `variant: adventure` leads with the story. The `services` module offers
`variant: extended` for six potential formats, explicitly subject to consultation.

## Edit once, reuse across pages

- `data/modules.yaml`: the module registry, template names, workshop descriptions,
  variants, and showcase-only restrictions.
- `data/home.yaml` and `data/remote.json`: the Storyscape and Wayfarer module
  content sets. The profile chooses one with `params.moduleData`.
- `data/variants.yaml`: complete alternate content sets, keyed by module and variant.
- `data/module_schema.json`: the required and optional fields for each template.
- `layouts/_partials/sections/`: rendering templates and the composition renderer.
- `assets/scss/`: shared styling, with module rules in `_modules.scss` and
  Storyscape artwork and layout rules in `_storyscape.scss`.

A variant replaces the full module content. To add one, copy the default
content structure into `data/variants.yaml` and list its key under that
module's `variants` in the registry so it appears in the workshop. Variants
are shared across profiles, so review their copy before using one with a
different identity.

Every template has a contract. The validator rejects blank or unknown
fields, empty lists, invalid links, and missing local images. Package rows
must match the column count. The workshop iterates the registry, so a
registered template with valid content appears automatically.

New service or campaign pages use `layout: modular`, the normal title/eyebrow/lede
front matter, and a `sections` list. Their page hero supplies the h1. If a hero
module is also selected, it renders as h2. See `content/services/index.md`,
`content/adventures/index.md`, and `content/gatherings/index.md` for working examples.

## What is real and what is illustrative

Intake is disabled by default. Active intake requires explicit backend
configuration and a public fallback contact address. Form capture,
notification delivery, and business operations require separate verification.

Adventure concepts and gallery artwork illustrate what a
conversation could lead to. Package comparisons leave rates, capacities,
schedules, and inclusions for consultation. The broader formats are examples
to discuss.

The trust and booking modules are local editorial scaffolds. Their registry
entries are `showcaseOnly: true`, and selecting them on a public page fails the
build. Replace the scaffold with approved client material or an integrated
provider before removing that restriction.

## Reduce a finished specialist site

1. Choose its audience, offer, and primary next step.
2. Keep only the homepage sections that help explain that offer.
3. Tailor the selected module data, page copy, and page-specific variants.
4. Prune unused pages and update links in menus, the footer, module data,
   and Markdown. Edit `requiredRoutes` in `data/release.json` to match the
   intended pages. It is shared across profiles, so recheck any profiles you
   still intend to build. Keep the consultation, privacy, and thank-you pages
   aligned with the chosen intake backend if you keep that flow.
5. Start identity changes with the title and profile params used for the
   text lockup, author, favicon, social card, service area, and structured
   data. Use `storyscapeArtwork: false` for the generic lockup and CSS hero
   motif. Review the remaining shared styles and hardcoded copy, including
   the closing CTA's eyebrow and signature and the consultation form text.
   Review the [reuse policy](../REUSE.md) before copying Storyscape assets.
6. Add intentional static exports to `staticAssets` in `data/release.json`.
   Keep originals outside the public mount or in its excluded
   `static/images/temp/` folder. Keep private session work under `.local/`.
   The audit requires all declared files and rejects unexpected non-HTML
   files outside `assets/`, subject to its generated-file exceptions. Check
   the output inventory before publishing.
7. Build the selected profile and review the generated site. Desktop and
   mobile checks in both themes complement the HTML audit.

The production bible, brand skill, and HTML brand guide describe the Storyscape
identity. Choose modules for the new site's audience and offer.

## Targeted verification

After changing compositions or the renderer:

```sh
python3 scripts/check_modules.py
```

This uses temporary copies to verify the actual build, public exclusion of the
workshop, development workshop markup, section removal/reordering, valid variants,
and rejection of invalid compositions. It never edits your working composition.

For the broader static integrity check, `npm run check` runs source checks,
audits production and staging exemplar builds, and runs composition and
audit regression checks. See the [architecture](architecture.md) for the
other targeted commands.

# Sculpting a specialist site

This repository is the comprehensive master, expressed first as a professional
DM and tabletop-party service brand. The homepage intentionally demonstrates a
broad selection. A specialist site is made by selecting and reducing those
pieces, then replacing the relevant content and brand details.

## Open the visual menu

```sh
npm run dev
```

Open `/module-showcase/` on the address Hugo prints. The workshop shows all 18
modules, three hero directions, and two service collections. Search narrows the
preview; it does not save edits. Native anchor links and all previews remain
usable without JavaScript.

The workshop is a draft and is excluded from ordinary production and staging
builds. It is also marked noindex and excluded from the sitemap. A production
build that explicitly includes drafts fails rather than publishing the workshop.
The configured build commands clean their generated destination so a previous
development workshop cannot remain there as a stale file. Use `npm run build`
for a local release build; if invoking Hugo directly, include
`--cleanDestinationDir`. These are build controls, not authentication; do not
publish development output.

## Choose and reorder sections

The homepage composition lives in `content/_index.md`. Each enabled entry is
rendered in list order. Delete an entry, or keep it for later with
`enabled: false`. Removing a homepage section does not remove its standalone page.

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

Keep exactly one hero first on the homepage, so it supplies the page heading.
Use unique lowercase IDs beginning with a letter and containing only letters,
numbers, and hyphens. IDs become anchors. Unknown modules and variants, duplicate
or invalid IDs, and publicly selected showcase-only modules fail the build.
Disabled entries are ignored.

The default hero emphasizes the host. `variant: gm` emphasizes the practitioner;
`variant: adventure` leads with the story. The `services` module offers
`variant: extended` for six potential formats, explicitly subject to consultation.

## Edit once, reuse across pages

- `data/modules.yaml`: the module registry, template names, workshop descriptions,
  variants, and showcase-only restrictions.
- `data/home.yaml`: default copy for all reusable sections.
- `data/variants.yaml`: complete alternate content sets, keyed by module and variant.
- `layouts/_partials/sections/`: rendering templates and the composition renderer.
- `assets/scss/_modules.scss`: new collection, comparison, gallery, and workshop styles.

A variant is a complete replacement for its module's content, not a partial
merge. To add one, copy the default content structure into `data/variants.yaml`
and list its key under that module's `variants` in the registry so it appears in
the workshop. Avoid changing shared copy when only one campaign needs a different
version; select a variant on that page instead.

New service or campaign pages use `layout: modular`, the normal title/eyebrow/lede
front matter, and a `sections` list. Their page hero supplies the h1. If a hero
module is also selected, it renders as h2. See `content/services/index.md`,
`content/adventures/index.md`, and `content/gatherings/index.md` for working examples.

## What is real and what is illustrative

The inquiry route retains the existing Netlify form. Hosting-side form capture,
notification delivery, and business operations require separate verification.
This change does not add payments, a scheduler, or live availability.

Adventure concepts are illustrative conversation starters. Gallery images are
concept artwork, not client-event evidence. Package comparisons deliberately
omit unapproved rates, capacities, schedules, and inclusions. The broader formats
are requests to discuss, not confirmed service inventory.

The trust and booking modules are local editorial scaffolds. Their registry
entries are `showcaseOnly: true`, and selecting them on a public page fails the
build. Replace the scaffold with approved client material or an actually
integrated provider before removing that restriction. The registry restriction
is deliberate, not a missing implementation of a connected booking system.

## Reduce a finished specialist site

1. Choose its audience, offer, and primary next step.
2. Keep only the homepage sections that help explain that offer.
3. Tailor the shared copy and page-specific variants.
4. Prune unused pages, then remove their links from `hugo.yaml`, the footer,
   section data, and Markdown. Update the required-route list in
   `scripts/audit_site.py` to match that specialist's intended pages. Keep the
   consultation flow intact if still used.
5. For a different brand, update `hugo.yaml`, `data/brand.yaml`, brand documents,
   imagery, the brand-mark/footer/CTA partials, and the Service structured data in
   `layouts/_partials/head.html`. Those still express Storyscape; this is not a
   one-setting white-label theme.
6. Preview the selected pages on desktop and mobile in both themes, then build
   and check links before handing the site over.

The production bible, brand skill, and HTML brand guide describe the Storyscape
expression. They do not limit which reusable modules a different specialist
may select.

## Targeted verification

After changing compositions or the renderer:

```sh
python3 scripts/check_modules.py
```

This uses temporary copies to verify the actual build, public exclusion of the
workshop, development workshop markup, section removal/reordering, valid variants,
and rejection of invalid compositions. It never edits your working composition.

For the existing full production/staging integrity gate, run `npm run check`
(which executes both `scripts/audit_site.py` and `scripts/check_modules.py` across
production and preview builds) when you are ready for a broader release check.

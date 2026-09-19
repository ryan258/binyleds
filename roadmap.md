# Binyled’s Storyscape Roadmap

This roadmap tracks the evolution of Binyled’s Storyscape from a single-focus
tabletop service into a comprehensive, modular Hugo master site capable of being
sculpted into specialist service sites.

---

## Current State: Modular Master Foundation

The repository serves as a modular master site with a complete visual workshop,
targeted composition checks, and practical operational guides.

- [x] **Zero-Theme Hugo Architecture**: Static Hugo Extended build with custom Sass
  design system, responsive layouts, dual light/dark themes, WCAG AA accessibility,
  and no third-party runtime frameworks.
- [x] **Production Brand Guide**: In-repo live brand guide at `/brand-guide/` backed by
  `data/brand.yaml`, `brand/PRODUCTION_BIBLE.md`, and `brand/SKILL.md`.
- [x] **Restrained Photography System**: Curated, warm-tungsten WebP still-life assets
  in `static/images/` adhering to the tactile, hands-in-motion restraint principles in
  [`docs/image-plan.md`](docs/image-plan.md).
- [x] **Modular Section Engine**: 18 cataloged modules with schema validation, ID collision
  prevention, heading hierarchy enforcement, and full variant support via `data/modules.yaml`,
  `data/variants.yaml`, and `layouts/_partials/sections/render.html`.
- [x] **Draft Module Workshop**: Local visual explorer at `/module-showcase/` with live search
  filtering (`assets/js/showcase.js`). Automatically excluded from production builds and sitemaps.
- [x] **Specialist Example Pages**: Pre-composed modular routes demonstrating diverse compositions:
  - [`/services/`](content/services/index.md): Broad service catalog with extended format requests.
  - [`/adventures/`](content/adventures/index.md): Illustrative adventure library and tone cues.
  - [`/gatherings/`](content/gatherings/index.md): Milestone celebrations and reunions.
  - [`/host-guide/`](content/host-guide/index.md): Practical gathering checklist for prospective hosts.
- [x] **Targeted Verification & Security**: Dual-tier testing with `scripts/audit_site.py` and
  `scripts/check_modules.py`, wired into `scripts/check.sh`. Build commands enforced with
  `--cleanDestinationDir` across CI, Netlify, and npm scripts to prevent draft leakage.
- [x] **Verified Cloudflare Intake Architecture**: Implemented and tested opt-in Cloudflare
  Pages target with durable D1 SQL storage, idempotent edge endpoint (`/api/consultation`),
  server-side Turnstile verification, client-side session retry preservation (`assets/js/intake.js`),
  operator mail notification with manual CLI recovery (`scripts/retry-notification.mjs`),
  and comprehensive test suites (`npm run test:intake`, `npm run test:hosting`). Fully documented
  in [`docs/site-operations.md`](docs/site-operations.md).
- [x] **Business & Operational Playbooks**:
  - [`docs/sculpting-guide.md`](docs/sculpting-guide.md): Step-by-step reduction and re-composition workflow.
  - [`docs/pricing.md`](docs/pricing.md): Triangulated pricing methodology (cost-plus floor, comparables, ceiling test).
  - [`docs/marketing-campaign.md`](docs/marketing-campaign.md): 90-day solo referral and awareness sequence.
  - [`docs/how-to-dm-dnd-for-fun-and-profit.md`](docs/how-to-dm-dnd-for-fun-and-profit.md): Commission unit economics and prep-hour management.
  - [`docs/how-to-dm-network-and-find-more-dm-clients.md`](docs/how-to-dm-network-and-find-more-dm-clients.md): Human-layer networking, connector outreach, and referral mechanics.
  - [`docs/site-operations.md`](docs/site-operations.md): Cloudflare intake setup, day-2 operations, recovery, and cutover.
  - [`docs/site-peripheral-plan.md`](docs/site-peripheral-plan.md): Comprehensive peripheral architecture and cost boundaries.

---

## Phase 1: Operational Decisions & Launch Readiness

Before opening the calendar to external clients, finalize the real-world operational parameters
flagged in `README.md` and `PROJECT.md`:

- [ ] **Operational Policies & Intake Cutover**:
  - Define confirmed travel radius in Bentonville/Northwest Arkansas and travel surcharge formula.
  - Set required lead times, booking deposit percentage, and cancellation/rescheduling terms.
  - Choose and configure intake infrastructure: proceed with baseline Netlify Forms or complete the validated Cloudflare D1/Pages cutover per [`docs/site-operations.md`](docs/site-operations.md).
  - Configure production notification recipients, verified sender addresses, and Turnstile widgets.
- [ ] **Trademark & Affiliation Wording**: Confirm exact legal disclosures regarding D&D,
  Wizards of the Coast, and third-party game systems.
- [ ] **Pre-Launch Audit**: Run the full verification suite (`npm run check`, `npm run test:intake`, `npm run test:hosting`) and test live form delivery on the target deployment.

---

## Phase 2: Warm Network Soft Launch & Early Commissions

Focus on high-touch, low-volume validation through existing relationships:

- [ ] **Warm Network Outreach**: Execute Weeks 1–4 of [`docs/marketing-campaign.md`](docs/marketing-campaign.md)
  using the conversational techniques in [`docs/how-to-dm-network-and-find-more-dm-clients.md`](docs/how-to-dm-network-and-find-more-dm-clients.md).
- [ ] **Time-Tracked Unit Economics**: Log prep hours, travel hours, and table hours for the first
  three commissions to establish baseline profitability per [`docs/how-to-dm-dnd-for-fun-and-profit.md`](docs/how-to-dm-dnd-for-fun-and-profit.md).
- [ ] **Activate the Trust Module**:
  - Request approved quotes and event summaries from the initial host clients.
  - Replace the placeholder in `layouts/_partials/sections/trust.html`.
  - Remove `showcaseOnly: true` from the `trust` entry in `data/modules.yaml` to display real social proof publicly.

---

## Phase 3: Specialist Site Sculpting & Expansion

Leverage the modular master foundation to deploy focused specialist sites:

- [ ] **Sculpt Specialist Sites**: Follow [`docs/sculpting-guide.md`](docs/sculpting-guide.md)
  to generate dedicated, pruned sites for distinct service models (e.g., Corporate Team Experiences,
  Luxury Milestones, Virtual Tabletop).
- [ ] **Design Token Variations**: Define alternate brand token sets (color palettes, typography
  pairings) in `assets/scss/` for future brand expressions.
- [ ] **Content Variant Expansion**: Add new scenario hooks and package formats to `data/variants.yaml`
  as new commission patterns emerge.

---

## Phase 4: Automation & Systems Integration (Scale Triggered)

When inquiry volume outgrows manual email coordination:

- [ ] **Booking Provider Integration**:
  - Evaluate scheduling systems (e.g., Calendly, Acuity, or Cal.com) that respect capacity caps.
  - Replace the local `booking` module scaffold (`layouts/_partials/sections/booking.html`) with
    verified embed/handoff code and remove its `showcaseOnly: true` restriction.
- [ ] **Automated Intake Workflows**: Connect form webhooks to intake notification pipelines and
  calendar holds.
- [ ] **Digital Artifact Delivery**: Explore private, password-protected post-game landing pages
  for character records, session recaps, and photos.

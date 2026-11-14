# Review remediation and next actions

**Historical remediation record.** See [readiness](readiness.md) for current
evidence and checks; the statements below describe this earlier pass.

This record follows the [comprehensive review](project-review-2026-10-03.md).
Changes are local and uncommitted. The owner requested that test execution and
GitNexus analysis be left to them. No test, build, reindex, remote migration,
provider call, outbound message, commit, push, or deployment was performed in
this remediation. Source inspection is not a passing test result.

The fresh GitNexus index matched commit
`b834acbdd82df9f85b32b2a84f8be8d847679264` when work began. Read-only impact queries
reported low file-level impact for shared intake/notification libraries and the
audit parser. Several framework, template-loaded, and command entry points had
unknown caller coverage; their actual template, package-script, test, and route
references were then inspected. No zero-caller result was treated as proof of
non-use. The index predates these changes and will need an owner-run refresh.

## Disposition of all 24 corrections

“Implemented; unverified” means the correction exists in source and awaits the
relevant handoff. It does not mean its acceptance criterion has been proven.

| ID | Source change | Remaining acceptance / decision |
| --- | --- | --- |
| C01 | Mail uses REST `reply_to`; regression checks field spelling, absence of `replyTo`, and allowed request keys. | Local tests, then explicitly authorized real provider/Reply-To acceptance. |
| C02 | Obsolete peripheral instructions replaced by a superseded pointer; current operations is canonical. | Review the chosen environment before any actual migration/cutover. |
| C03 | Inquiry-to-marketing enrollment removed; privacy and communications guides require separate permission. | No newsletter exists; any future subscription needs its own opt-in/withdrawal workflow. |
| C04 | Dark button hover darkened; fixed parchment/forest surfaces have explicit focus/gold tokens. | Rendered contrast, hover/focus, and both-theme browser checks. No conformance claim. |
| C05 | Recursive module contracts validate shape, text, links, local images, unknown keys, and table width. Incomplete-hero negative fixture added. | Owner-run valid/invalid composition builds. |
| C06 | Hugo excludes `static/images/temp/`; declared static asset manifest rejects unexpected output files. | Normal local and clean-checkout builds must agree. |
| C07 | Node floor is 22.13+, `.nvmrc` selects 22, and early runtime diagnostic is wired into checks. | Run on supported Node; hosted Hugo baseline is 0.164.0 Extended. |
| C08 | Both build wrappers run source checks, Hugo, and HTML/output audit. Docs distinguish static build from Functions/runtime acceptance. | Execute the wrappers through hosting tests; real Pages runtime remains separate. |
| C09 | Roadmap/project card now use scoped implementation status; readiness ledger replaces broad accessibility/provider claims. | Record actual results when supplied, tied to the source revision. |
| C10 | Documentation paths corrected, configured hosts distinguished from observed deployment, explicit release URL/profile workflow added, shared subpath audit used in CI. | Current domain/deployment remains an owner fact. |
| C11 | Unsourced rate ranges, mismatched package assumptions, and consultation-deposit wording removed. Planning worksheet uses explicit assumptions. | Any real offer, quote, and terms need owner approval. |
| C12 | Exemplar includes the noindex guide; client and remote profiles omit it; footer follows the profile. | Output tests must confirm the guide is absent, not merely unlinked. |
| C13 | Storage reads/writes tolerate failure; checklist shape is checked; copy failure is reported honestly. | New browser-harness fixtures and a blocked-storage browser exercise. |
| C14 | Guide links clear search; hash navigation reveals and focuses its destination, including direct fragments. | Harness plus keyboard navigation in an actual browser. |
| C15 | System/light/dark selection and persistent motion pause added; OS motion preference remains respected. | Browser check for all decorative/scroll animations and viewport sizes. |
| C16 | Field help has IDs/descriptions; server returns field/error codes; browser marks invalid controls and focuses a linked summary. Form precedes aside in DOM. | Keyboard/screen-reader error correction without lost answers. |
| C17 | Success requires a valid matching UUID; conflicts have distinct codes; honeypot produces a rejection instead of a false receipt; thank-you page is conditional. | Missing/wrong/malformed receipt and conflict fixtures; actual retry flow. |
| C18 | Every active backend requires and displays fallback contact; privacy offers contact before a reply. Disabled examples say so. | Configure the owner’s actual address before active intake. |
| C19 | Authenticated numbered inbox list/read/contact/close/retry; revision protection; explicit private draft download/restore. | Local contracts and browser round trip, then intended runtime. Reopen and unattended retry are future extensions. |
| C20 | Root reuse boundary separates original code/prose/brand/art; register now inventories all six WebPs and marks missing provenance. | **Owner decision remains:** original-work license and actual asset-source/permission confirmation. Rights have not been fabricated. |
| C21 | Public About/Questions drafting commentary removed; provider/retention text describes configured behavior and current limits. | Owner review against actual operating practice if live intake is enabled. |
| C22 | Audit now checks blank names/headings, implicit/explicit labels, ARIA targets, same-origin absolute/subpath links, CSS refs, canonical URLs, JSON-LD essentials, and static assets. Python gates use explicit failures. Registry/source drives counts. | Negative audit fixtures and optimized-Python checks; browser semantics remain a separate evidence type. |
| C23 | Explicit host capability, disabled Netlify previews, immutable D1 environment marker checked by intake/mail/operator routes; CI reuses the output audit. | Apply all migrations to the correct isolated databases and verify real headers/Functions/bindings before cutover. |
| C24 | Shared limits/options/required fields; aligned calendar-date policy; technical positive guest count replaces unapproved two-guest floor via data-preserving migration 0003. | Migration preservation fixture; actual service fit/range remains individually confirmed. |

## Concrete next actions already implemented

- **Reuse profiles:** full exemplar, client-facing Storyscape, and fictional remote
  Wayfarer Table. Identity, service metadata, footer, content directory, and module
  data can differ without changing templates. This is a demonstrated source
  arrangement awaiting build verification, not a finished upgradeable starter package.
- **Lantern Bay:** synthetic inquiry, reviewable scope, bounded prep, readable/printable
  player introduction, complete system-neutral adventure, follow-up draft, and blank
  playtest record. It explicitly states its unplaytested status.
- **Private working-copy command:** `npm run session` copies the sample pack into a
  new ignored private folder, with starting-file checksums and no overwrites.
- **Operator shortcut:** after real configuration, `npm run inbox -- i` lists records;
  `r 1`, `c 1`, `x 1`, and `n 1` read, mark contacted, close, and retry a notification.
  The retry command sends mail when run; the implementation did not run it.
- **Maintenance map:** README, architecture, readiness, current operations, and this
  record identify the source of truth and the appropriate owner-run check.

## Enhancement register: what advanced and what remains

The 36 enhancements are proposals for a broad exemplar, not 36 preexisting bugs.
The original register keeps detailed solution/acceptance criteria. This pass
implements the first coherent slice and records the rest without implying that
provider integrations or owner facts were supplied.

| IDs | Status after this pass | Next useful increment |
| --- | --- | --- |
| E01–E02 | Three profiles and configurable identity implemented; builds pending. | Add more profiles only for an actual use case; parameterize any remaining shared editorial language. |
| E03 | Module models and a complete worked pack exist; normalized offer/person/resource catalogs not implemented. | Introduce stable resource IDs when more than one pack needs shared facts. |
| E04 | Shared intake rules and module schemas implemented. | Add negative fixtures whenever the schema grows. |
| E05 | Short inbox/session commands implemented; composition selector/export is not. | Keyboard-friendly preset selection and YAML export with undo. |
| E06 | Workshop now derives from the registry; exhaustive state gallery remains open. | Add long/empty/error/narrow examples for selected high-use modules. |
| E07–E08 | Separate profile copy exists; visual presets and a distributable upgrade contract remain open. | Define the core/example boundary and chosen licensing before packaging. |
| E09 | Runtime diagnostic, architecture map, module recipe, check map implemented. | Validate onboarding with a clean supported environment. |
| E10–E11 | Honest scope worksheet and fictional profile; no invented practitioner facts or offered-service limits. | Fill only with owner-supplied facts if a public service is wanted. |
| E12 | Complete Lantern Bay adventure written. | Facilitator read-through, playtest, and recorded revision. |
| E13 | Pack metadata documented; catalog filtering not implemented. | Add structured catalog/search when multiple runnable packs exist. |
| E14–E15 | Participation guidance, pause/skip/change, debrief, and printable player introduction in pack. | Try the handout with the intended participants and formats. |
| E16 | Remote profile plus platform/venue fallback notes. | Actual event, timezone, and multi-table adapters remain optional. |
| E17–E18 | Trust still restricted; reuse/provenance record added. | Actual client permission records and a searchable rights library require real inputs. |
| E19 | Authenticated short-command inbox implemented. | Evaluate whether reopening/history or a browser inbox solves observed friction. |
| E20–E22 | Worked inquiry/scope sequence and capacity/pricing worksheets. | Structured proposal/session lifecycle and calculators are not yet implemented. |
| E23 | No calendar/payment integration. | Select only if wanted; define independent reservation/payment states before connecting. |
| E24 | Complete packet and private-copy command implemented. | Add approved personalization inputs without duplicating private data. |
| E25 | No interactive session companion. | Consider a small offline scene/notes view after pack use identifies a need. |
| E26 | Follow-up draft and distinct consent guidance. | Add reviewable recap/permission templates; sending remains deliberate. |
| E27 | Manual, lease-protected notification recovery and visible status. | No scheduler/backoff worker has been added. |
| E28 | Form comes first with a direct jump link and shorter hero. | Progressive minimal inquiry remains a separate model/UX change. |
| E29 | Theme, motion, focus, larger fields, and private draft recovery implemented. | Real assistive-technology and reflow evidence remains open. |
| E30 | Markdown/JSON source pack, private copy, printable HTML handout. | More resource exports can be added as needed; no public private-record export. |
| E31 | Browser-script harness expanded. | Real-browser automation and device/AT acceptance remain open. |
| E32 | REST key regression and consumed-token retry fixture. | Real Pages/D1/Turnstile/mail acceptance not performed. |
| E33 | Output inventory and local image dimensions/lazy decoding added. | Measured asset budgets, responsive sources, and social-card optimization remain open. |
| E34 | Environment binding check, authenticated scoped operator actions, private selector cache. | Rate controls, approved retention automation, and restore rehearsal remain open. |
| E35 | Public copy cleaned and metadata configurable. | Normalized FAQ/resource discovery is future work. |
| E36 | Readiness and remediation ledgers created. | Attach owner results to this working tree/revision when available. |

## One local verification handoff

```sh
npm run test:all
```

Use Node 22.13+, Hugo Extended 0.164.0 to match the hosted pin, and Python 3.
The command uses synthetic data and provider mocks; it neither publishes nor
sends mail. It builds temporary outputs and stops at the first failed stage.
If desired after those results, run the optimized-Python regressions and index
refresh separately:

```sh
python3 -O scripts/check_audit.py
python3 -O scripts/check_modules.py
python3 -O scripts/check_cloudflare_build.py
node .gitnexus/run.cjs analyze --index-only
```

Do not apply remote migrations just to run this handoff. An existing live D1
instance needs a separately reviewed backup/migration/marker step before this
new runtime is deployed. Original-work licensing and missing image provenance
remain owner decisions, not test failures that code can honestly resolve.

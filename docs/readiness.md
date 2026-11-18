# Readiness ledger

Updated November 18, 2026 against the local working tree. Implementation below
describes the source in this checkout. The active host, live intake, and
provider configuration have not been verified.

| Area | What exists | What still needs acceptance |
| --- | --- | --- |
| Profiles | Storyscape exemplar, client profile, and fictional Wayfarer Table | Exact hosted toolchain and client/host outputs; remote profile caveats below |
| Modules and artwork | Recursive module contracts; illustrated brand kit and responsive Storyscape photos | Full variant/negative fixtures when needed; rendered review across viewports and themes |
| Release output | Required routes and declared static assets; temporary image mount exclusions | Close the inventory gaps below before relying on it as a publish boundary |
| Inquiry storage | Shared validation, UUID receipts, duplicate and conflict handling | Chosen Pages runtime, real Turnstile, and isolated D1 bindings; all three migrations and matching marker |
| Notifications | Separate delivery state, REST `reply_to`, manual retry | Provider acceptance, receipt at the verified operator mailbox, and working Reply-To |
| Operator inbox | Authenticated list/read/status, numbered selectors, revision checks | End-to-end private operation, status conflicts, notification recovery, and a scratch restore |
| Visitor recovery | Download/restore draft, receipt reference, field and conflict errors | File round trip in a real browser; privacy notice version gap below |
| Accessibility | Theme control, native reduced-motion support, focus and help/error affordances | Keyboard, zoom, screen reader, mobile, and visual contrast checks; no conformance claim |
| Lantern Bay | Synthetic pack and ignored private copy command | Facilitator read-through and playtest; no saved playtest results |
| Reuse | Notices, reuse policy, and asset provenance register | Owner license decision and confirmation of missing rights before redistribution |

## Local checks

On November 18, 2026, the complete verification suite (`npm run test:all`,
including `check`, `test:intake`, and `test:hosting`) passed cleanly against
the local working tree with Hugo Extended 0.168.0, Dart Sass 1.106.1, and Node 22.22.3.
Output checks confirmed both profiles had disabled intake, noindex, and no sitemap;
the internal guide appeared only in the exemplar. The Storyscape homepage used the
current artwork and the remote homepage showed the Wayfarer Table identity. This
verifies the default preview paths, with a temporary cache for the sandbox.

The focused guest-count migration test passed in local SQLite. It preserved a
synthetic legacy row and accepted one guest while rejecting zero. Together,
these checks address the two reproduced October 5 failures (R01 and R02) for
the paths exercised. The exact hosted Hugo pin (0.164.0), full suite, browser,
live D1, providers, and deployments were not checked in this refresh.

Use `npm run check` for the site and module gates, `npm run test:intake` for
local SQLite, provider mocks, and JavaScript DOM harnesses, or
`npm run test:hosting` for generated host/profile output. With Hugo Extended
0.164.0, native Dart Sass, Node 22.13+, and Python 3, the combined owner check is:

```sh
npm run test:all
```

## Open source issues

The [October 5 review](project-review-2026-10-05.md) has the original evidence
and proposed acceptance criteria. These findings still apply:

- **R03 — remote privacy:** The general wrapper still allows Netlify intake on
  Wayfarer Table, whose privacy page says it collects nothing. Keep that profile
  disabled.
- **R04 — release inventory:** The output audit exempts files under
  `assets/` from the static manifest check and does not enforce a complete HTML
  route allow-list.
- **R05 — draft recovery:** A draft saved before the privacy notice version
  changes is rejected on restore. The advertised download/reload path cannot
  restore those answers automatically.
- **R06–R07 — remote reuse:** Shared CTA text still includes Storyscape wording.
  The remote adventure page describes Lantern Bay but does not link to the full
  [pack](../examples/lantern-bay/README.md) or player handout.

The [sculpting guide](sculpting-guide.md) now points to the profile and
release-policy source files (R08); adapting a fresh derivative has not been
tested.

## Owner facts and external acceptance

The [November 21 handoff plan](site-operations.md#november-21-handoff-plan)
targets Cloudflare Pages in TJ's account, with TJ owning the domain, billing,
and proposed Zoho mailbox. Confirm the domain/address and whether the initial
release takes inquiries through email only or also through the form.

If Cloudflare intake is wanted, confirm the actual domain and contact address,
isolated production and preview databases, real Turnstile keys, verified
notification sender and recipient, and the actual retention practice. Follow
the [operations runbook](site-operations.md) for the chosen host.

Decide whether the site is for private use, a public reference, or real
inquiries. The client profile omits the internal guide. DNS, remote schema
changes, outbound messages, publishing, and Git actions remain owner-controlled.
